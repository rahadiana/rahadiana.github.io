import BacktestEngine from '../backtest_engine.js';
import { downloadFile } from '../utils.js';

function safeGet(o, path) {
  let cur = o;
  for (const p of path) {
    if (!cur) return undefined;
    cur = cur[p];
  }
  return cur;
}

// Simple Backtest UI scaffold
export function render(container) {
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'panel';
  root.innerHTML = `
    <h3>Backtest</h3>
    <div style="display:flex;gap:12px;align-items:center;">
      <input id="bt-file" type="file" accept="application/json">
      <select id="bt-coin"></select>
      <button id="bt-load">Load</button>
      <button id="bt-start">Start</button>
      <button id="bt-pause">Pause</button>
      <button id="bt-step">Step</button>
      <label>Speed: <input id="bt-speed" type="number" value="10" style="width:70px"></label>
      <button id="bt-load-rules">Load Rules</button>
      <button id="bt-run-rules">Run Rules</button>
      <button id="bt-export">Export CSV</button>
      <button id="bt-export-json">Export JSON</button>
    </div>
    <div style="margin-top:10px;display:flex;gap:12px;">
      <div style="flex:1">
        <h4>Metrics</h4>
        <div id="bt-metrics"></div>
        <h4>Trades</h4>
        <div id="bt-trades" style="max-height:240px;overflow:auto;background:#071022;padding:8px;border-radius:6px"></div>
      </div>
      <div style="width:360px">
        <h4>Events</h4>
        <div id="bt-events" style="max-height:420px;overflow:auto;background:#071022;padding:8px;border-radius:6px"></div>
      </div>
    </div>
  `;
  container.appendChild(root);

  document.getElementById('bt-load').addEventListener('click', () => {
    const fi = document.getElementById('bt-file');
    if (fi.files && fi.files[0]) {
      const r = new FileReader();
      r.onload = (ev) => {
        try {
          const obj = JSON.parse(ev.target.result);
          BacktestEngine.loadFromObject(obj);
          populateCoins();
          appendEvent('Loaded sample with coins: ' + Object.keys(obj).join(', '));
        } catch (e) { appendEvent('Invalid JSON file'); }
      };
      r.readAsText(fi.files[0]);
    } else appendEvent('No file selected');
  });

  document.getElementById('bt-load-rules').addEventListener('click', ()=>{
    try {
      const raw = localStorage.getItem('bb_automation_rules');
      if (!raw) { appendEvent('No automation rules found in localStorage (bb_automation_rules)'); return; }
      const parsed = JSON.parse(raw);
      appendEvent('Loaded ' + (parsed.length||0) + ' automation rules');
      window.__bt_loaded_rules = parsed;
    } catch (e) { appendEvent('Failed to load rules: ' + e.message); }
  });

  document.getElementById('bt-run-rules').addEventListener('click', ()=>{
    const rules = window.__bt_loaded_rules || [];
    if (!rules || rules.length === 0) { appendEvent('No rules loaded'); return; }
    BacktestEngine.clearStrategies();
    // create simple runner
    BacktestEngine.attachStrategy(({ ts, coin, price, raw, engine }) => {
      for (const r of rules) {
        try {
          const conds = r.conditions || (r.condition ? [r.condition] : []);
          if (!conds || conds.length === 0) continue;
          const results = conds.map(c => {
            let v = null;
            if (c.metric === 'price') v = price;
            else if (c.metric === 'volume') v = safeGet(raw, ['total_vol_fiat']) || safeGet(raw, ['volume']);
            else if (c.metric === 'masterSignal') v = safeGet(raw, ['signals','masterSignal','score']);
            const thr = parseFloat(c.threshold) || 0;
            switch (c.operator) { case '>': return v > thr; case '<': return v < thr; case '>=': return v >= thr; case '<=': return v <= thr; case '==': return v == thr; default: return false; }
          });
          const logical = (r.logical || 'AND').toUpperCase();
          const triggered = logical === 'AND' ? results.every(Boolean) : results.some(Boolean);
          const key = r.id + '::' + coin;
          // simple open/close logic: open when triggered and no pos, close when not triggered and pos exists
          const pos = engine.pos[coin];
          if (triggered && !pos) {
            engine.openPosition(coin, 1, price);
            appendEvent(`${new Date(ts).toLocaleTimeString()} OPEN ${coin} @ ${price} by rule ${r.name}`);
          } else if (!triggered && pos) {
            engine.closePosition(coin, price);
            appendEvent(`${new Date(ts).toLocaleTimeString()} CLOSE ${coin} @ ${price} by rule ${r.name}`);
          }
        } catch (e) { console.error('rule runner err', e); }
      }
    });
    appendEvent('Strategy runner attached with ' + rules.length + ' rules');
  });

  document.getElementById('bt-export').addEventListener('click', ()=>{
    try {
      import('../backtest_engine.js').then(mod => {
        const csv = mod.exportResultsCSV(BacktestEngine);
        downloadFile(csv, 'backtest_results.csv', 'text/csv');
        appendEvent('Exported CSV');
      });
    } catch (e) { appendEvent('Export failed: '+ e.message); }
  });

  document.getElementById('bt-export-json').addEventListener('click', ()=>{
    try {
      import('../backtest_engine.js').then(mod => {
        const json = mod.exportResultsJSON(BacktestEngine);
        downloadFile(json, 'backtest_results.json', 'application/json');
        appendEvent('Exported JSON');
      });
    } catch (e) { appendEvent('Export failed: '+ e.message); }
  });

  document.getElementById('bt-start').addEventListener('click', ()=>{
    const speed = parseFloat(document.getElementById('bt-speed').value) || 10;
    BacktestEngine.start(speed);
    appendEvent('Backtest started @' + speed + ' tps');
  });
  document.getElementById('bt-pause').addEventListener('click', ()=>{ BacktestEngine.pause(); appendEvent('Paused'); });
  document.getElementById('bt-step').addEventListener('click', ()=>{ BacktestEngine.step(); appendEvent('Step'); renderMetrics(); });

  function populateCoins() {
    const sel = document.getElementById('bt-coin'); sel.innerHTML='';
    const coins = Object.keys(BacktestEngine.data || {});
    for (const c of coins) { const o = document.createElement('option'); o.value=c; o.innerText=c; sel.appendChild(o); }
  }

  BacktestEngine.onTick(({ts, coin, price}) => {
    appendEvent(`${new Date(ts).toLocaleTimeString()} ${coin} ${price}`);
    renderMetrics();
  });

  function appendEvent(text) { const el = document.getElementById('bt-events'); const d = document.createElement('div'); d.style.padding='6px 8px'; d.style.borderBottom='1px solid rgba(255,255,255,0.03)'; d.innerText = text; el.appendChild(d); el.scrollTop = el.scrollHeight; }

  function renderMetrics() {
    const m = document.getElementById('bt-metrics');
    const p = BacktestEngine.performance;
    m.innerHTML = `<div>PnL: ${p.getPnL().toFixed(2)}</div><div>MaxDrawdown: ${(p.getMaxDrawdown()*100).toFixed(2)}%</div><div>Sharpe: ${p.getSharpe().toFixed(2)}</div><div>Trades: ${p.trades.length}</div>`;
    const tr = document.getElementById('bt-trades'); tr.innerHTML = '';
    for (const t of p.trades.slice().reverse()) { const r = document.createElement('div'); r.style.padding='6px'; r.innerText = JSON.stringify(t); tr.appendChild(r); }
  }

}

export function init() { }
export function stop() { BacktestEngine.pause(); }

export default { render, init, stop };
