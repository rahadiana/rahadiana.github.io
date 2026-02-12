import BacktestEngine from '../backtest_engine.js';
import * as ViewAlerts from './viewAlerts.js';

// Risk Management Dashboard
export function render(container) {
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'panel';
  root.innerHTML = `
    <h3>Risk Dashboard</h3>
    <div style="display:flex;gap:12px;align-items:flex-start;">
      <div style="flex:1">
        <h4>Portfolio Risk</h4>
        <div id="risk-summary"></div>
        <h4 style="margin-top:8px">VaR (Historical)</h4>
        <div>
          Confidence: <select id="var-conf"><option value="0.95">95%</option><option value="0.99">99%</option></select>
          <button id="var-calc">Compute VaR</button>
        </div>
        <div id="var-output" style="margin-top:8px"></div>
        <h4 style="margin-top:8px">Drawdown Alerts</h4>
        <div>
          Threshold %: <input id="dd-th" type="number" value="10" style="width:80px"> 
          <button id="dd-set-alert">Set Alert</button>
        </div>
      </div>
      <div style="width:360px">
        <h4>Position Sizing</h4>
        <div>Account size: <input id="ps-account" type="number" value="10000" style="width:120px"></div>
        <div>Risk % per trade: <input id="ps-risk" type="number" value="1" style="width:80px">%</div>
        <div>Stop distance (pts): <input id="ps-stop" type="number" value="50" style="width:80px"></div>
        <button id="ps-calc">Calc Size</button>
        <div id="ps-output" style="margin-top:8px"></div>
      </div>
    </div>
  `;
  container.appendChild(root);

  document.getElementById('var-calc').addEventListener('click', computeVaR);
  document.getElementById('ps-calc').addEventListener('click', calcPositionSize);
  document.getElementById('dd-set-alert').addEventListener('click', setDrawdownAlert);

  renderSummary();
}

function getReturnsSeries() {
  const p = BacktestEngine.performance;
  return p.returns || [];
}

function computeVaR() {
  const conf = parseFloat(document.getElementById('var-conf').value) || 0.95;
  const rets = getReturnsSeries();
  if (!rets || rets.length === 0) {
    document.getElementById('var-output').innerText = 'No return series available (run backtest first).';
    return;
  }
  const sorted = rets.slice().sort((a,b)=>a-b);
  const idx = Math.max(0, Math.floor((1 - conf) * sorted.length));
  const varVal = -sorted[idx];
  document.getElementById('var-output').innerText = `VaR @ ${Math.round(conf*100)}% = ${Utils.safeFixed(varVal * 100, 2)}%`;
}

function renderSummary() {
  const el = document.getElementById('risk-summary');
  const p = BacktestEngine.performance;
  if (!el) return;
  const pnl = p.getPnL();
  const mdd = p.getMaxDrawdown();
  el.innerHTML = `<div>Total PnL: ${Utils.safeFixed(pnl, 2)}</div><div>Max Drawdown: ${Utils.safeFixed(mdd * 100, 2)}%</div><div>Trades: ${p.trades.length}</div>`;
}

function setDrawdownAlert() {
  const threshold = parseFloat(document.getElementById('dd-th').value) || 10;
  // create alert rule to monitor portfolio drawdown (uses ViewAlerts webhook/storage)
  const rule = {
    id: 'dd_alert_' + Math.random().toString(36).slice(2,8),
    name: `Drawdown ${threshold}%`,
    conditions: [{ metric: 'masterSignal', operator: '<', threshold: -999 }],
    logical: 'AND',
    channels: ['browser'],
    webhook: ''
  };
  // store a helper key in localStorage so viewAlerts or other logic can inspect drawdown alerts
  localStorage.setItem('bb_drawdown_alert', JSON.stringify({ id: rule.id, threshold }));
  alert(`Drawdown alert set at ${threshold}% (client-side check)`);
}

function calcPositionSize() {
  const account = parseFloat(document.getElementById('ps-account').value) || 0;
  const riskPct = parseFloat(document.getElementById('ps-risk').value) || 1;
  const stop = parseFloat(document.getElementById('ps-stop').value) || 1;
  // size = (account * riskPct%) / stop (price units)
  const riskAmount = account * (riskPct/100);
  const size = riskAmount / Math.max(1e-8, stop);
  document.getElementById('ps-output').innerText = `Position size (units): ${Utils.safeFixed(size, 4)} (risk ${Utils.safeFixed(riskAmount, 2)})`;
}

export function init() { }
export function stop() { }

export default { render, init, stop };
