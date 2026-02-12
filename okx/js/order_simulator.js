// Simple Order Simulator supporting MARKET, LIMIT, TWAP, ICEBERG, BRACKET (basic)
import BacktestEngine from './backtest_engine.js';

class OrderSimulator {
  constructor() {
    this.engine = null;
    this.orders = new Map();
    this.onFillCb = null;
  }
  attachEngine(engine) {
    this.engine = engine;
    // subscribe to ticks
    engine.onTick(({ts, coin, price, raw}) => this.processTick({ts, coin, price, raw}));
    // compute schedules for pending VWAP orders if any
    for (const [id, o] of this.orders.entries()) {
      if (o.type === 'VWAP' && !o.slices) this._prepareVWAP(o);
      if (o.type === 'TWAP' && !o.nextSliceAt) {
        o.startTs = o.startTs || Date.now();
        o.nextSliceAt = o.startTs;
      }
    }
  }
  onFill(cb) { this.onFillCb = cb; }
  placeOrder(order) {
    const id = order.id || 'o_' + Math.random().toString(36).slice(2,9);
    const o = Object.assign({ id, created: Date.now(), remaining: order.size, status: 'active' }, order);
    if (o.type === 'TWAP') {
      o.startTs = o.startTs || Date.now();
      o.sliceCount = o.sliceCount || 10;
      o.sliceSize = o.size / o.sliceCount;
      o.nextSliceAt = o.startTs;
      o.slicesLeft = o.sliceCount;
    }
    if (o.type === 'ICEBERG') {
      o.visible = o.visible || Math.min(o.size, (o.visibleSize||Math.ceil(o.size/10)));
      o.hidden = o.size - o.visible;
    }
    if (o.type === 'VWAP') {
      // schedule will be prepared when engine is attached; set placeholders
      o.sliceCount = o.sliceCount || 10;
      o.slices = o.slices || null; // array of {ts?, qty}
      o.nextSliceIndex = 0;
    }
    this.orders.set(o.id, o);
    return o.id;
  }
  cancelOrder(id) {
    const o = this.orders.get(id);
    if (o) { o.status = 'cancelled'; this.orders.set(id,o); }
  }
  processTick(tick) {
    const now = tick.ts || Date.now();
    for (const [id, o] of Array.from(this.orders.entries())) {
      if (o.status !== 'active') continue;
      if (o.coin !== tick.coin) continue;
      if (o.type === 'MARKET') {
        this.fillOrder(o, tick.price, o.remaining);
      } else if (o.type === 'LIMIT') {
        if ((o.side === 'buy' && tick.price <= o.limitPrice) || (o.side === 'sell' && tick.price >= o.limitPrice)) {
          this.fillOrder(o, o.limitPrice || tick.price, o.remaining);
        }
      } else if (o.type === 'TWAP') {
        if (now >= o.nextSliceAt && o.slicesLeft > 0) {
          const qty = o.sliceSize;
          this.fillOrder(o, tick.price, qty);
          o.slicesLeft -= 1;
          o.nextSliceAt += Math.max(1, (o.durationMs || 60000) / o.sliceCount);
          if (o.slicesLeft <= 0) o.status = 'done';
          this.orders.set(o.id, o);
        }
      } else if (o.type === 'VWAP') {
        // if slices prepared, check if this tick corresponds to a slice index
        if (!o.slices) {
          // attempt to prepare now
          this._prepareVWAP(o);
        }
        if (o.slices && o.nextSliceIndex < o.slices.length) {
          const slice = o.slices[o.nextSliceIndex];
          // match by tick index if available
          const series = this.engine && this.engine.data && this.engine.data[tick.coin];
          const idx = this.engine && this.engine.idx ? this.engine.idx[tick.coin] : null;
          // if slice.index matches current idx or slice.ts roughly equals tick.ts, execute
          if (slice.index != null && idx != null && slice.index <= idx) {
            this.fillOrder(o, tick.price, slice.qty);
            o.nextSliceIndex += 1;
            if (o.nextSliceIndex >= o.slices.length) o.status = 'done';
            this.orders.set(o.id, o);
          }
        }
      } else if (o.type === 'ICEBERG') {
        // try to fill visible portion only
        if (o.visible > 0) {
          const qty = Math.min(o.visible, Math.max(0.0000001, o.remaining));
          // market-like execution of visible
          this.fillOrder(o, tick.price, qty);
          o.visible = Math.max(0, o.visible - qty);
          if (o.visible === 0 && o.hidden > 0) {
            // reveal next slice
            const next = Math.min(o.hidden, o.visibleSize || Math.ceil(o.size/10));
            o.visible = next; o.hidden -= next;
          }
          if (o.remaining <= 0) o.status = 'done';
          this.orders.set(o.id,o);
        }
      } else if (o.type === 'BRACKET') {
        // BRACKET has entryLimit (or market), tp and sl
        if (!o.entered) {
          if (o.entryType === 'MARKET') { this.fillOrder(o, tick.price, o.size); o.entered = true; }
          else if (o.entryType === 'LIMIT') {
            if ((o.side==='buy' && tick.price <= o.entryPrice) || (o.side==='sell' && tick.price >= o.entryPrice)) { this.fillOrder(o, o.entryPrice, o.size); o.entered=true; }
          }
        } else {
          // manage exit via TP/SL
          if (o.side === 'buy') {
            if (o.takeProfit && tick.price >= o.takeProfit) { this.fillOrder(o, o.takeProfit, o.remaining); o.status='done'; }
            else if (o.stopLoss && tick.price <= o.stopLoss) { this.fillOrder(o, o.stopLoss, o.remaining); o.status='done'; }
          } else {
            if (o.takeProfit && tick.price <= o.takeProfit) { this.fillOrder(o, o.takeProfit, o.remaining); o.status='done'; }
            else if (o.stopLoss && tick.price >= o.stopLoss) { this.fillOrder(o, o.stopLoss, o.remaining); o.status='done'; }
          }
        }
      }
    }
  }
  _prepareVWAP(o) {
    if (!this.engine || !o || !o.coin) return;
    const series = this.engine.data && this.engine.data[o.coin];
    if (!series || series.length === 0) {
      // fallback to equal slices
      const slices = [];
      const sc = o.sliceCount || 10;
      for (let i=0;i<sc;i++) slices.push({ index: null, qty: o.size / sc });
      o.slices = slices; o.nextSliceIndex = 0; return;
    }
    // build volume-weighted slices over remaining series starting at current index
    const startIdx = this.engine.idx && this.engine.idx[o.coin] ? this.engine.idx[o.coin] : 0;
    const remaining = series.slice(startIdx);
    const sc = o.sliceCount || Math.min(10, Math.max(1, Math.floor(remaining.length/3)));
    // compute per-tick proxy volume from raw.total_vol_fiat or raw.volume or 1
    const vols = remaining.map(r => { return (r.raw && (r.raw.total_vol_fiat || r.raw.volume)) ? (r.raw.total_vol_fiat || r.raw.volume) : 1; });
    const bucketSize = Math.max(1, Math.floor(remaining.length / sc));
    const slices = [];
    let allocated = 0;
    for (let i=0;i<sc;i++) {
      const start = i * bucketSize;
      const end = Math.min(remaining.length, (i+1)*bucketSize);
      const bucketVol = vols.slice(start,end).reduce((a,b)=>a+b,0) || 0;
      slices.push({ index: startIdx + start, qty: bucketVol === 0 ? (o.size / sc) : Math.max(0.0000001, (bucketVol / vols.reduce((a,b)=>a+b,0)) * o.size) });
      allocated += slices[slices.length-1].qty;
    }
    // normalize to total size
    const factor = o.size / Math.max(allocated, 1e-9);
    for (const s of slices) s.qty = s.qty * factor;
    o.slices = slices; o.nextSliceIndex = 0;
  }
  fillOrder(o, price, qty) {
    const fillQty = Math.min(qty, o.remaining);
    if (fillQty <= 0) return;
    // update remaining
    o.remaining = Math.max(0, o.remaining - fillQty);
    // simple interaction with BacktestEngine: buy opens, sell closes
    if (this.engine) {
      if (o.side === 'buy') {
        if (!this.engine.pos[o.coin]) this.engine.openPosition(o.coin, fillQty, price);
        else {
          // increase size by reopening (naive)
          const p = this.engine.pos[o.coin];
          const newSize = p.size + fillQty;
          const newEntry = ((p.entryPrice * p.size) + (price * fillQty)) / newSize;
          this.engine.pos[o.coin] = { size: newSize, entryPrice: newEntry };
        }
      } else if (o.side === 'sell') {
        if (this.engine.pos[o.coin]) {
          // close proportional
          const p = this.engine.pos[o.coin];
          const closeQty = Math.min(fillQty, p.size);
          this.engine.closePosition(o.coin, price);
        } else {
          // sell without position -> record as short-close? just record trade
          this.engine.performance.recordTrade({ coin: o.coin, size: -fillQty, entryPrice: null, exitPrice: price, pl: 0, ts: Date.now() });
        }
      }
    }
    // notify fill
    if (this.onFillCb) this.onFillCb({ orderId: o.id, coin: o.coin, price, qty: fillQty, ts: Date.now() });
  }
  listOrders() { return Array.from(this.orders.values()); }
}

const sim = new OrderSimulator();
export default sim;
