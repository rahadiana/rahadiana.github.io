import * as ViewOrderSim from './viewOrderSim.js';
import OkxClient from '../okx_client.js';

export function render(container) {
  // Wrapper header and note specific to Derivatives
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'panel';
  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h2>OKX Trade (Derivatives)</h2>
      <div style="font-size:11px;color:#e5e5e5;opacity:0.9">Derivatives only: SWAP/PERP (tdMode: cross)</div>
    </div>
    <div id="okx-trade-inner"></div>
  `;
  container.appendChild(root);

  const inner = document.getElementById('okx-trade-inner');
  // Render existing OrderSim UI inside this dedicated tab
  ViewOrderSim.render(inner);

  // Ensure default safety: do not enable REAL mode automatically
  if (localStorage.getItem('os_mode') === 'REAL' && !localStorage.getItem('okx_real_ack')) {
    localStorage.setItem('os_mode','SIM');
  }
}

export function init() {}
export function stop() {}

export default { render, init, stop };