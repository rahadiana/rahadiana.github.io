import * as ViewOrderSim from './viewOrderSim.js';
import OkxClient from '../okx_client.js';

export function render(container) {
  // Wrapper header and note specific to Derivatives
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'panel';
  // Ensure the wrapper allows content to grow and doesn't clip
  root.style.height = 'auto';
  root.style.overflow = 'visible';
  root.style.marginBottom = '20px'; // Add breathing room at bottom

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
    localStorage.setItem('os_mode', 'SIM');
  }

  // Immediately trigger data loading after UI is built
  // This ensures positions/orders/account display even if init() hasn't run yet
  if (OkxClient.isConfigured()) {
    console.log('[OkxTrade] render: API configured, triggering initial data load...');
    ViewOrderSim.init().catch(e => console.warn('[OkxTrade] post-render init error', e));
  }
}

export async function init() {
  // Delegate to ViewOrderSim so positions, orders, fills & WS subscriptions load
  console.log('[OkxTrade] init() called, delegating to ViewOrderSim.init()');
  await ViewOrderSim.init();
}

export function update(snapshot, profile, timeframe) {
  // Delegate periodic heartbeat updates so positions/orders stay in sync
  ViewOrderSim.update(snapshot, profile, timeframe);
}

export function stop() {
  if (typeof ViewOrderSim.stop === 'function') ViewOrderSim.stop();
}

export default { render, init, update, stop };