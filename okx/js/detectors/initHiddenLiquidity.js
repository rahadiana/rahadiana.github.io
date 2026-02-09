import createHiddenLiquidityDetector from './hiddenLiquidity.js';
import * as OkxWs from '../okx_ws.js';

// Auto-init helper: attach detector to top-N coins found in window.marketState
export function initAutoAttach(opts = {}) {
  const topN = opts.topN || 8;
  const channelPref = opts.channels || ['optimized-books', 'tickers', 'trades'];
  const detector = createHiddenLiquidityDetector(opts.cfg || {});

  if (!window.marketState) {
    console.warn('[HL] window.marketState not found; initAutoAttach aborted');
    return { detector };
  }

  const coins = Object.keys(window.marketState).slice(0, topN);
  const subs = [];

  coins.forEach(coin => {
    // create a callback that normalizes messages then feeds detector
    const cb = (res) => {
      try {
        const ch = res.arg?.channel || '';
        const dataArr = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
        dataArr.forEach(d => {
          // detect book-like
          if (d.asks || d.bids || d.action) {
            const book = { bids: d.bids || [], asks: d.asks || [], ts: d.ts || Date.now() };
            detector.feedBook(coin, book);
          } else if (d.price || d.px || d.last || d.side) {
            // trade-like entry
            const price = d.price || d.px || d.last || (d.instId && d.last);
            const size = d.size || d.sz || d.qty || d.qty || d.qtyOrder || 0;
            const side = d.side || d.side_tx || (d.side === 1 ? 'buy' : d.side === -1 ? 'sell' : undefined);
            detector.feedTrade(coin, { price: Number(price), size: Number(size), side, ts: d.ts || Date.now() });
          }
        });
      } catch (e) {
        console.error('[HL] parse err', e);
      }
    };

    // subscribe to preferred channels but be conservative
    channelPref.forEach(ch => {
      try {
        OkxWs.subscribe(coin, cb, ch);
        subs.push({ coin, ch, cb });
      } catch (e) {
        // ignore
      }
    });
  });

  // expose to window for debugging
  window.hiddenLiquidityDetector = detector;
  window.hiddenLiquiditySubscriptions = subs;

  console.log(`[HL] Attached detector for ${coins.length} coins (top ${topN})`);
  return { detector, subs };
}

export function detachAutoAttach() {
  const subs = window.hiddenLiquiditySubscriptions || [];
  subs.forEach(s => {
    try { OkxWs.unsubscribe(s.coin, s.cb, s.ch); } catch (e) {}
  });
  window.hiddenLiquiditySubscriptions = [];
  if (window.hiddenLiquidityDetector && window.hiddenLiquidityDetector.reset) window.hiddenLiquidityDetector.reset();
}

export default { initAutoAttach, detachAutoAttach };
