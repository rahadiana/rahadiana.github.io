const DEFAULTS = {
  refillWindowMs: 30_000,
  tradeWindowMs: 30_000,
  refillThreshold: 4,
  tradeVolumeFactor: 2.5,
  priceEpsPct: 0.004, // 0.4%
  deltaThreshFactor: 3
};


export function createHiddenLiquidityDetector(opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };

  // Alerting defaults
  cfg.alertThreshold = cfg.alertThreshold || 0.35;
  cfg.alertMuteMs = cfg.alertMuteMs || 60_000;

  // state per coin
  const coins = new Map();
  const lastEmitted = new Map();

  function ensureCoin(id) {
    if (!coins.has(id)) coins.set(id, {
      lastBook: null,
      levelState: new Map(), // price -> { lastSize, lastChangeType, refillCount, tradeVolume, tradesCount, avgTradeSize, lastUpdate }
      recentTrades: [], // {price,size,side,ts}
      recentBooks: [],
      lastPriceWindow: [] // [{ts, price}]
    });
    return coins.get(id);
  }

  function feedTrade(instId, trade) {
    // trade: { price, size, side, ts }
    const c = ensureCoin(instId);
    const ts = trade.ts || Date.now();

    c.recentTrades.push({ price: trade.price, size: trade.size, side: trade.side, ts });
    c.lastPriceWindow.push({ ts, price: trade.price });

    // prune
    const since = ts - cfg.tradeWindowMs;
    while (c.recentTrades.length && c.recentTrades[0].ts < since) c.recentTrades.shift();
    while (c.lastPriceWindow.length && c.lastPriceWindow[0].ts < since) c.lastPriceWindow.shift();

    // bucket to level (use price as key string)
    const lvl = String(trade.price);
    const s = c.levelState.get(lvl) || { lastSize: 0, lastChangeType: null, refillCount: 0, tradeVolume: 0, tradesCount: 0, avgTradeSize: 0, lastUpdate: ts };
    s.tradeVolume += trade.size;
    s.tradesCount += 1;
    s.avgTradeSize = ((s.avgTradeSize * (s.tradesCount - 1)) + trade.size) / s.tradesCount;
    s.lastUpdate = ts;
    c.levelState.set(lvl, s);
    maybeEmit(instId);
  }

  function feedBook(instId, bookSnapshot) {
    // bookSnapshot expected: { bids: [[price,size],...], asks: [[price,size],...], ts }
    const c = ensureCoin(instId);
    const ts = bookSnapshot.ts || Date.now();
    c.recentBooks.push({ ts, book: bookSnapshot });
    // prune
    const since = ts - cfg.refillWindowMs * 2;
    while (c.recentBooks.length && c.recentBooks[0].ts < since) c.recentBooks.shift();

    // compare levels to detect refill (size increase after decrease)
    const processSide = (entries) => {
      if (!entries) return;
      entries.forEach(([p, size]) => {
        const lvl = String(p);
        const prev = c.levelState.get(lvl) || { lastSize: null, lastChangeType: null, refillCount: 0, tradeVolume: 0, tradesCount: 0, avgTradeSize: 0, lastUpdate: ts };
        if (prev.lastSize !== null) {
          if (size > prev.lastSize && prev.lastChangeType === 'decrease' && (ts - (prev.lastUpdate || 0)) < cfg.refillWindowMs) {
            prev.refillCount = (prev.refillCount || 0) + 1;
          }
          prev.lastChangeType = size < prev.lastSize ? 'decrease' : size > prev.lastSize ? 'increase' : prev.lastChangeType;
        } else {
          prev.lastChangeType = 'init';
        }
        prev.lastSize = size;
        prev.lastUpdate = ts;
        c.levelState.set(lvl, prev);
      });
    };

    processSide(bookSnapshot.bids || []);
    processSide(bookSnapshot.asks || []);

    c.lastBook = bookSnapshot;
    maybeEmit(instId);
  }

  function computeForCoin(instId) {
    const c = coins.get(instId);
    if (!c) return null;

    const now = Date.now();
    // aggregate visibleDepth approximation: sum top N sizes around mid
    let visibleDepth = 0;
    if (c.lastBook) {
      const topBids = (c.lastBook.bids || []).slice(0, 10);
      const topAsks = (c.lastBook.asks || []).slice(0, 10);
      visibleDepth = topBids.reduce((s, b) => s + (b[1] || 0), 0) + topAsks.reduce((s, a) => s + (a[1] || 0), 0);
    }
    visibleDepth = Math.max(1, visibleDepth);

    // iceberg scoring by levels
    let icebergScore = 0;
    let icebergReasons = [];
    for (const [lvl, st] of c.levelState.entries()) {
      // only consider recent
      if ((now - (st.lastUpdate || 0)) > cfg.tradeWindowMs * 2) continue;
      const refillFactor = Math.min(1, (st.refillCount || 0) / cfg.refillThreshold);
      const volFactor = Math.min(1, (st.tradeVolume || 0) / (visibleDepth * cfg.tradeVolumeFactor));
      const smallTradeBias = st.avgTradeSize && st.avgTradeSize < Math.max(1e-6, visibleDepth * 0.01) ? 1 : 0; // many small trades
      const lvlScore = Math.max(refillFactor * 0.6 + volFactor * 0.3 + smallTradeBias * 0.1, 0);
      if (lvlScore > 0.12) {
        icebergScore = Math.max(icebergScore, lvlScore);
        icebergReasons.push({ price: Number(lvl), refillCount: st.refillCount || 0, tradeVolume: st.tradeVolume, avgTradeSize: st.avgTradeSize, score: lvlScore });
      }
    }

    // absorption scoring (taker imbalance vs price move)
    // compute taker buy/sell in window
    const since = now - cfg.tradeWindowMs;
    let takerBuy = 0, takerSell = 0;
    let firstPrice = null, lastPrice = null;
    c.recentTrades.forEach((t, idx) => {
      if (t.ts < since) return;
      if (firstPrice === null) firstPrice = t.price;
      lastPrice = t.price;
      if (t.side && t.side.toLowerCase().includes('buy')) takerBuy += t.size;
      else if (t.side && t.side.toLowerCase().includes('sell')) takerSell += t.size;
      else {
        // if side unknown, guess from price move relative to best
      }
    });

    const delta = takerBuy - takerSell;
    const totalTaker = Math.max(1, takerBuy + takerSell);
    const deltaRatio = delta / totalTaker;

    const priceMove = firstPrice && lastPrice ? Math.abs((lastPrice - firstPrice) / firstPrice) : 0;
    const absorptionScore = (Math.abs(delta) > (cfg.deltaThreshFactor * Math.sqrt(totalTaker || 1))) && (priceMove < cfg.priceEpsPct) ? Math.min(1, Math.abs(delta) / (totalTaker + 1)) : 0;

    // footprint anomaly: concentration at single bins
    let footprintScore = 0;
    for (const r of c.recentTrades) {
      // simple: if many trades have same price
      const countSame = c.recentTrades.filter(x => x.price === r.price).length;
      if (countSame > 4) footprintScore = Math.max(footprintScore, Math.min(1, countSame / 20));
    }

    // quick onchain/oi placeholders (external signals should be fed via feedExternal)
    const onchainScore = c._onchainScore || 0;
    const oiScore = c._oiScore || 0;

    // aggregate
    const w1 = 0.25, w2 = 0.30, w3 = 0.20, w4 = 0.15, w5 = 0.10;
    const score = Math.min(1, icebergScore * w1 + absorptionScore * w2 + footprintScore * w3 + onchainScore * w4 + oiScore * w5);

    return {
      coin: instId,
      score,
      breakdown: { iceberg: icebergScore, absorption: absorptionScore, footprint: footprintScore, onchain: onchainScore, oi: oiScore },
      icebergReasons,
      lastUpdated: now
    };
  }

  function feedExternal(instId, { onchain = 0, oi = 0 } = {}) {
    const c = ensureCoin(instId);
    c._onchainScore = Math.max(0, Math.min(1, onchain));
    c._oiScore = Math.max(0, Math.min(1, oi));
    maybeEmit(instId);
  }

  function maybeEmit(instId) {
    try {
      const sig = computeForCoin(instId);
      if (!sig) return;
      const now = Date.now();
      const lastTs = lastEmitted.get(instId) || 0;
      if (sig.score >= cfg.alertThreshold && (now - lastTs) > cfg.alertMuteMs) {
        lastEmitted.set(instId, now);
        // Emit a browser event for listeners
        if (typeof window !== 'undefined' && window && window.dispatchEvent) {
          try {
            window.dispatchEvent(new CustomEvent('hiddenLiquidity:alert', { detail: sig }));
          } catch (e) {
            // fallback: simple event
            const ev = document.createEvent('CustomEvent');
            ev.initCustomEvent('hiddenLiquidity:alert', true, true, sig);
            window.dispatchEvent(ev);
          }
        }
        // Also console log
        console.log('[HL] alert', instId, sig.score, sig.breakdown);
      }
    } catch (e) {
      // ignore
    }
  }

  function getSignal(instId) {
    return computeForCoin(instId);
  }

  function exportState() {
    const out = {};
    for (const k of coins.keys()) out[k] = computeForCoin(k);
    return out;
  }

  function reset(instId) {
    if (instId) coins.delete(instId);
    else coins.clear();
  }

  // simple test helper that simulates trades and books
  function runSampleSimulation(instId = 'BTC-USDT-SWAP') {
    reset(instId);
    const now = Date.now();
    // simulate book snapshot
    feedBook(instId, { bids: [[42000, 5], [41990, 10]], asks: [[42010, 4], [42020, 8]], ts: now });
    // many small sells hitting the bids
    for (let i = 0; i < 8; i++) {
      feedTrade(instId, { price: 42000, size: 0.6, side: 'sell', ts: now + i * 200 });
      // simulate refill
      feedBook(instId, { bids: [[42000, 5 + i], [41990, 10]], asks: [[42010, 4], [42020, 8]], ts: now + i * 300 });
    }
    // add onchain
    feedExternal(instId, { onchain: 0.6, oi: 0.4 });
    return getSignal(instId);
  }

  return {
    feedTrade,
    feedBook,
    feedExternal,
    getSignal,
    exportState,
    reset,
    runSampleSimulation
  };
}

export default createHiddenLiquidityDetector;
