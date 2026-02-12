import BacktestEngine from '../backtest_engine.js';
import { downloadFile } from '../utils.js';
import * as Utils from '../utils.js';

let _pfExportCsvHandler = null;
let _pfExportJsonHandler = null;
let _rootEl = null;

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
  _rootEl = root;
  renderSummary();

  // Named handlers so we can remove them in stop()
  _pfExportCsvHandler = async () => {
    try {
      const mod = await import('../backtest_engine.js');
      const csv = mod.exportResultsCSV(BacktestEngine);
      downloadFile(csv, 'portfolio_trades.csv', 'text/csv');
    } catch (e) { console.error('export csv failed', e); }
  };

  _pfExportJsonHandler = async () => {
    try {
      const mod = await import('../backtest_engine.js');
      const json = mod.exportResultsJSON(BacktestEngine);
      downloadFile(json, 'portfolio_state.json', 'application/json');
    } catch (e) { console.error('export json failed', e); }
  };

  const csvBtn = document.getElementById('pf-export-csv');
  const jsonBtn = document.getElementById('pf-export-json');
  if (csvBtn) csvBtn.addEventListener('click', _pfExportCsvHandler);
  if (jsonBtn) jsonBtn.addEventListener('click', _pfExportJsonHandler);
}

function renderSummary() {
  const s = document.getElementById('pf-summary');
  const p = document.getElementById('pf-performance');
  const pos = document.getElementById('pf-positions');
  if (!s || !p || !pos) return;
  // aggregate from BacktestEngine if available
  const eng = BacktestEngine;
  const pnl = (eng && eng.performance && typeof eng.performance.getPnL === 'function') ? Number(eng.performance.getPnL()) || 0 : 0;
  const mdd = (eng && eng.performance && typeof eng.performance.getMaxDrawdown === 'function') ? Number(eng.performance.getMaxDrawdown()) || 0 : 0;
  const sharpe = (eng && eng.performance && typeof eng.performance.getSharpe === 'function') ? Number(eng.performance.getSharpe()) || 0 : 0;
  const openPositions = eng && eng.pos ? Object.keys(eng.pos).filter(k => eng.pos[k]).length : 0;
  s.textContent = '';
  const pnlDiv = document.createElement('div'); pnlDiv.textContent = `Total PnL: ${Utils.formatNumber(pnl, 2)}`;
  const posDiv = document.createElement('div'); posDiv.textContent = `Open Positions: ${openPositions}`;
  s.appendChild(pnlDiv); s.appendChild(posDiv);

  p.textContent = '';
  const mddDiv = document.createElement('div'); mddDiv.textContent = `Max Drawdown: ${Utils.formatNumber(mdd * 100, 2)}%`;
  const sharpeDiv = document.createElement('div'); sharpeDiv.textContent = `Sharpe: ${Utils.formatNumber(sharpe, 2)}`;
  const tradesCount = eng && eng.performance && Array.isArray(eng.performance.trades) ? eng.performance.trades.length : 0;
  const tradesDiv = document.createElement('div'); tradesDiv.textContent = `Trades: ${tradesCount}`;
  p.appendChild(mddDiv); p.appendChild(sharpeDiv); p.appendChild(tradesDiv);
  pos.innerHTML = '';
  if (eng && eng.pos) {
    for (const coin of Object.keys(eng.pos)) {
      const pr = eng.pos[coin];
      if (pr) {
        const d = document.createElement('div'); d.style.padding = '6px';
        d.textContent = `${coin}: size=${Utils.formatNumber(Number(pr.size) || 0, 2)} entry=${Utils.formatPrice(Number(pr.entryPrice) || 0)}`;
        pos.appendChild(d);
      }
    }
  }
}

export function update(marketState, profile, timeframe) {
  // update summary periodically
  renderSummary();
}

export function init() { }
export function stop() {
  // cleanup event listeners
  try {
    const csvBtn = document.getElementById('pf-export-csv');
    const jsonBtn = document.getElementById('pf-export-json');
    if (csvBtn && _pfExportCsvHandler) csvBtn.removeEventListener('click', _pfExportCsvHandler);
    if (jsonBtn && _pfExportJsonHandler) jsonBtn.removeEventListener('click', _pfExportJsonHandler);
    if (_rootEl) {
      // clear any references
      _rootEl = null;
    }
  } catch (e) { console.error('stop cleanup error', e); }
}

export default { render, update, init, stop };
