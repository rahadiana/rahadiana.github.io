// Minimal Backtest Engine
// - loadFromObject(data): accepts marketState-like object (exsample.json fragment)
// - start(), pause(), step(), reset()
// - onTick(cb) => called with { ts, coin, price, raw }
// - simple performance tracking (PnL, trades, drawdown)

class Performance {
  constructor() {
    this.trades = [];
    this.equity = [0];
    this.returns = [];
    this.initialBalance = 100000;
  }
  recordTrade(t) { this.trades.push(t); }
  updatePriceEquity(pricePnL) { // pricePnL is current unrealized PnL
    const eq = this.initialBalance + pricePnL;
    const last = this.equity[this.equity.length-1] || this.initialBalance;
    const r = (eq - last) / last;
    this.returns.push(r);
    this.equity.push(eq);
  }
  getPnL() { return (this.equity[this.equity.length-1] || this.initialBalance) - this.initialBalance; }
  getMaxDrawdown() {
    let peak = -Infinity, mdd = 0;
    for (const e of this.equity) { if (e > peak) peak = e; const dd = (peak - e) / peak; if (dd > mdd) mdd = dd; }
    return mdd;
  }
  getSharpe() {
    if (this.returns.length === 0) return 0;
    const mean = this.returns.reduce((a,b)=>a+b,0)/this.returns.length;
    const std = Math.sqrt(this.returns.map(r=>Math.pow(r-mean,2)).reduce((a,b)=>a+b,0)/this.returns.length);
    if (std === 0) return 0;
    return (mean / std) * Math.sqrt(252);
  }
}

export class BacktestEngine {
  constructor() {
    this.data = {}; // coin -> array of ticks {ts, price, raw}
    this.coins = [];
    this.pos = {}; // coin -> position {size, entryPrice}
    this.idx = {}; // coin -> index
    this.timer = null;
    this.speed = 1; // ticks per second
    this.onTickCb = null;
    this.performance = new Performance();
    this.strategies = []; // strategy functions called on each tick
  }
  loadFromObject(marketState) {
    this.data = {};
    this.coins = Object.keys(marketState || {});
    for (const c of this.coins) {
      const raw = marketState[c];
      // Try to build tick series from raw.history or snapshots if present
      if (raw && raw.history && Array.isArray(raw.history)) {
        this.data[c] = raw.history.map(h => ({ ts: h.ts || Date.now(), price: h.last || h.price || 0, raw: h }));
      } else {
        // fallback: single current snapshot
        const price = (raw && raw.PRICE && raw.PRICE.last) ? raw.PRICE.last : 0;
        this.data[c] = [{ ts: Date.now(), price, raw }];
      }
      this.idx[c] = 0;
      this.pos[c] = null;
    }
  }
  onTick(cb) { this.onTickCb = cb; }
  attachStrategy(fn) { if (typeof fn === 'function') this.strategies.push(fn); }
  clearStrategies() { this.strategies = []; }
  start(speed=10) {
    this.speed = speed;
    if (this.timer) return;
    this.timer = setInterval(()=>this._tick(), 1000/this.speed);
  }
  pause() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  reset() { this.pause(); for (const c of this.coins) this.idx[c]=0; this.performance = new Performance(); }
  step() { this._tick(); }
  _tick() {
    for (const c of this.coins) {
      const series = this.data[c];
      const i = this.idx[c] || 0;
      if (i >= series.length) continue;
      const tick = series[i];
      if (this.onTickCb) this.onTickCb({ ts: tick.ts, coin: c, price: tick.price, raw: tick.raw });
      // run attached strategies
      for (const s of this.strategies) {
        try { s({ ts: tick.ts, coin: c, price: tick.price, raw: tick.raw, engine: this }); } catch (e) { console.error('strategy err', e); }
      }
      this.idx[c] = i+1;
      // update perf: simple unrealized PnL sum across positions
      let unreal = 0;
      for (const cc of this.coins) {
        const p = this.pos[cc];
        if (p) {
          const last = this.data[cc][Math.max(0, (this.idx[cc]-1))];
          if (last) unreal += (last.price - p.entryPrice) * p.size;
        }
      }
      this.performance.updatePriceEquity(unreal);
    }
  }
  // simple strategy helpers to be called by UI or external strategy
  openPosition(coin, size, price) { this.pos[coin] = { size, entryPrice: price }; this.performance.recordTrade({ coin, size, entryPrice: price, ts: Date.now() }); }
  closePosition(coin, price) { const p = this.pos[coin]; if (!p) return; const pl = (price - p.entryPrice) * p.size; this.performance.recordTrade({ coin, size: p.size, entryPrice: p.entryPrice, exitPrice: price, pl, ts: Date.now() }); this.pos[coin]=null; }
}

// Expose a singleton for easy use from UI
const engine = new BacktestEngine();
export default engine;

// Utility: export results as CSV string
export function exportResultsCSV(instEngine = engine) {
  const rows = [];
  rows.push(['type','coin','entryPrice','exitPrice','size','pl','ts'].join(','));
  for (const t of instEngine.performance.trades) {
    rows.push([ 'trade', t.coin || '', t.entryPrice || '', t.exitPrice || '', t.size || '', t.pl || '', t.ts || '' ].join(','));
  }
  // equity series
  rows.push(['type','equity'].join(','));
  for (let i=0;i<instEngine.performance.equity.length;i++) {
    rows.push([ 'equity', instEngine.performance.equity[i] ].join(','));
  }
  return rows.join('\n');
}

// Export results as JSON string (structured)
export function exportResultsJSON(instEngine = engine) {
  const obj = {
    meta: {
      generatedAt: new Date().toISOString(),
      initialBalance: instEngine.performance.initialBalance || 0,
      trades: instEngine.performance.trades.length || 0
    },
    trades: instEngine.performance.trades,
    equity: instEngine.performance.equity,
    metrics: {
      pnl: instEngine.performance.getPnL(),
      maxDrawdown: instEngine.performance.getMaxDrawdown(),
      sharpe: instEngine.performance.getSharpe()
    }
  };
  return JSON.stringify(obj, null, 2);
}
