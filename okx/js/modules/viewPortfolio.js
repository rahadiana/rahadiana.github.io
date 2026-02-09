import BacktestEngine from '../backtest_engine.js';
import { downloadFile } from '../utils.js';

// Portfolio management scaffold
export function render(container) {
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'panel';
  root.innerHTML = `
    <h3>Portfolio</h3>
    <div style="display:flex;gap:12px;">
      <div style="margin-left:auto">
        <button id="pf-export-csv">Export CSV</button>
        <button id="pf-export-json">Export JSON</button>
      </div>
      <div style="flex:1">
        <h4>Summary</h4>
        <div id="pf-summary"></div>
        <h4>Positions</h4>
        <div id="pf-positions" style="max-height:300px;overflow:auto;background:#071022;padding:8px;border-radius:6px"></div>
      </div>
      <div style="width:360px">
        <h4>Performance</h4>
        <div id="pf-performance"></div>
        <h4>Correlation (sample)</h4>
        <div id="pf-corr" style="height:200px; background:#071022; border-radius:6px; padding:8px">(placeholder)</div>
      </div>
    </div>
  `;
  container.appendChild(root);
  renderSummary();

  document.getElementById('pf-export-csv').addEventListener('click', ()=>{
    try {
      import('../backtest_engine.js').then(mod => {
        const csv = mod.exportResultsCSV(BacktestEngine);
        downloadFile(csv, 'portfolio_trades.csv', 'text/csv');
      });
    } catch (e) { console.error('export csv failed', e); }
  });

  document.getElementById('pf-export-json').addEventListener('click', ()=>{
    try {
      import('../backtest_engine.js').then(mod => {
        const json = mod.exportResultsJSON(BacktestEngine);
        downloadFile(json, 'portfolio_state.json', 'application/json');
      });
    } catch (e) { console.error('export json failed', e); }
  });
}

function renderSummary() {
  const s = document.getElementById('pf-summary');
  const p = document.getElementById('pf-performance');
  const pos = document.getElementById('pf-positions');
  if (!s || !p || !pos) return;
  // aggregate from BacktestEngine if available
  const eng = BacktestEngine;
  const pnl = eng.performance.getPnL();
  const mdd = eng.performance.getMaxDrawdown();
  const sharpe = eng.performance.getSharpe();
  s.innerHTML = `<div>Total PnL: ${pnl.toFixed(2)}</div><div>Open Positions: ${Object.keys(eng.pos).filter(k=>eng.pos[k]).length}</div>`;
  p.innerHTML = `<div>Max Drawdown: ${(mdd*100).toFixed(2)}%</div><div>Sharpe: ${sharpe.toFixed(2)}</div><div>Trades: ${eng.performance.trades.length}</div>`;
  pos.innerHTML = '';
  for (const coin of Object.keys(eng.pos)) {
    const pr = eng.pos[coin];
    if (pr) {
      const d = document.createElement('div'); d.style.padding='6px'; d.innerText=`${coin}: size=${pr.size} entry=${pr.entryPrice}`; pos.appendChild(d);
    }
  }
}

export function update(marketState, profile, timeframe) {
  // update summary periodically
  renderSummary();
}

export function init() { }
export function stop() { }

export default { render, update, init, stop };
