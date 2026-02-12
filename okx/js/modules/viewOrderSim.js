import OrderSim from '../order_simulator.js';
import BacktestEngine from '../backtest_engine.js';

export function render(container) {
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'panel';
  root.innerHTML = `
    <h3>Order Simulator</h3>
    <div style="display:flex;gap:12px;align-items:center;">
      <select id="os-coin"></select>
      <select id="os-side"><option value="buy">Buy</option><option value="sell">Sell</option></select>
      <select id="os-type"><option value="MARKET">MARKET</option><option value="LIMIT">LIMIT</option><option value="TWAP">TWAP</option><option value="ICEBERG">ICEBERG</option><option value="BRACKET">BRACKET</option></select>
      <input id="os-size" placeholder="size" style="width:80px">
      <input id="os-price" placeholder="price (limit/entry)" style="width:120px">
      <button id="os-place">Place</button>
      <button id="os-refresh">Refresh</button>
    </div>
    <div style="margin-top:8px;display:flex;gap:12px;">
      <div style="flex:1">
        <h4>Active Orders</h4>
        <div id="os-orders" style="max-height:320px;overflow:auto;background:#071022;padding:8px;border-radius:6px"></div>
      </div>
      <div style="width:360px">
        <h4>Fills</h4>
        <div id="os-fills" style="max-height:420px;overflow:auto;background:#071022;padding:8px;border-radius:6px"></div>
        <button id="os-export">Export Fills CSV</button>
      </div>
    </div>
  `;
  container.appendChild(root);

  populateCoins();
  document.getElementById('os-place').addEventListener('click', placeOrder);
  document.getElementById('os-refresh').addEventListener('click', renderOrders);
  document.getElementById('os-export').addEventListener('click', exportFills);

  OrderSim.attachEngine(BacktestEngine);
  OrderSim.onFill(f => { appendFill(f); renderOrders(); });
  renderOrders();
}

function populateCoins() {
  const sel = document.getElementById('os-coin'); sel.innerHTML='';
  const coins = Object.keys(BacktestEngine.data || {});
  if (coins.length === 0) { const o = document.createElement('option'); o.value='__none'; o.innerText='(no data)'; sel.appendChild(o); }
  for (const c of coins) { const o = document.createElement('option'); o.value=c; o.innerText=c; sel.appendChild(o); }
}

function placeOrder() {
  const coin = document.getElementById('os-coin').value;
  const side = document.getElementById('os-side').value;
  const type = document.getElementById('os-type').value;
  const size = parseFloat(document.getElementById('os-size').value) || 0;
  const price = parseFloat(document.getElementById('os-price').value) || null;
  if (!coin || coin === '__none') return alert('Select coin');
  const order = { coin, side, type, size };
  if (type === 'LIMIT' || type === 'BRACKET') order.limitPrice = price || undefined;
  if (type === 'TWAP') { order.durationMs = 60000; order.sliceCount = 6; }
  if (type === 'ICEBERG') { order.visibleSize = Math.max(1, Math.floor(size/10)); }
  if (type === 'BRACKET') { order.entryType = price ? 'LIMIT' : 'MARKET'; order.entryPrice = price; order.takeProfit = price ? price * 1.02 : null; order.stopLoss = price ? price * 0.98 : null; }
  const id = OrderSim.placeOrder(order);
  appendFill({ orderId: id, coin, price: price || 'market', qty: 0, ts: Date.now(), note: 'placed' });
  renderOrders();
}

function renderOrders() {
  const el = document.getElementById('os-orders'); if (!el) return;
  el.innerHTML = '';
  for (const o of OrderSim.listOrders()) {
    const d = document.createElement('div'); d.style.padding='6px'; d.style.borderBottom='1px solid rgba(255,255,255,0.03)';
    d.innerHTML = `<div><b>${o.id}</b> ${o.coin} ${o.side} ${o.type} size=${o.size} rem=${o.remaining} status=${o.status}</div>`;
    el.appendChild(d);
  }
}

function appendFill(f) {
  const el = document.getElementById('os-fills'); if (!el) return;
  const d = document.createElement('div'); d.style.padding='6px'; d.style.borderBottom='1px solid rgba(255,255,255,0.03)';
  d.innerText = `${new Date(f.ts).toLocaleTimeString()} ${f.orderId} ${f.coin} ${f.qty}@${f.price} ${f.note||''}`;
  el.appendChild(d); el.scrollTop = el.scrollHeight;
}

function exportFills() {
  const rows = ['orderId,coin,price,qty,ts,note'];
  const el = document.getElementById('os-fills'); if (!el) return;
  for (const child of el.children) {
    const txt = child.innerText.replace(/,/g,'');
    rows.push('"' + txt + '"');
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'order_fills.csv'; a.click(); URL.revokeObjectURL(url);
}

export function init() {}
export function stop() {}

export default { render, init, stop };
