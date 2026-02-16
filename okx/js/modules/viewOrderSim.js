import OrderSim from '../order_simulator.js';
import BacktestEngine from '../backtest_engine.js';
import OkxClient from '../okx_client.js';
import { showToast } from './toast.js';
import GlobalSettings from './globalSettings.js';
import PositionSettings from './positionSettings.js';
import FillDetails from './fillDetails.js';
import * as ViewSignalComposer from './viewSignalComposer.js';
import { connectPrivate, subscribePrivate, unsubscribePrivate, disconnectPrivate } from '../okx_ws.js';
import TradeSafety from './tradeSafety.js';

let _realPollTimer = null;
const _realCancelPending = new Set();
let _posPollTimer = null;
let _lastOkxPositions = [];
let _lastAccountBalance = 0;
// Throttling to prevent 429s on rapid event firing
let _lastAccountFetch = 0;
let _lastPosFetch = 0;
const FETCH_THROTTLE_MS = 2000;

const _processedFills = new Set();
// Track real orders from WS
let _realOpenOrdersMap = new Map();
let _wsOrdersActive = false;
let _privatePosCb = null;
let _privateAccountCb = null;
let _privateOrderCb = null;
let _privateAlgoOrderCb = null;

/**
 * ⚡ Initialization Sequence (Non-UI)
 * Called by main.js to ensure real positions/account are loaded on refresh
 * priority: 1
 */
export async function init() {
  console.log('[OKX-TRADE] Initializing...');
  if (OkxClient.isConfigured()) {
    try {
      await ensurePrivateSubscription();
      await Promise.all([
        loadAccountInfo(),
        loadRealFills(),
        loadRealPositions()
      ]);
      console.log('[OKX-TRADE] Initialized (Configured)');
    } catch (e) {
      console.error('[OKX-TRADE] Initialization error', e);
    }
  } else {
    console.log('[OKX-TRADE] Initialization skipped (Not Configured)');
  }
}

export function render(container) {
  container.innerHTML = '';
  // Modern Glassmorphic Layout
  const root = document.createElement('div');
  root.className = 'okx-dashboard';
  root.innerHTML = `
    <!-- HEADER BAR -->
    <div class="okx-header-bar">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-weight:800;font-size:14px;color:#fff;text-shadow:0 0 10px rgba(255,255,255,0.2)">OKX TRADE</div>
        <div class="trade-pill primary" style="padding:4px 8px;font-size:10px">DERIVATIVES</div>
      </div>
      <div>
        <button id="os-open-settings" class="trade-pill futuristic-link" title="Open Trading Settings">
          <span class="icon">⚙️</span> Settings
        </button>
      </div>
    </div>

    <!-- LEFT COLUMN: TRADE EXECUTION -->
    <div class="area-trade trade-panel">
       <div class="trade-section-title">Execution</div>
       
       <!-- Connection Status -->
       <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div id="os-api-led" class="text-[10px] font-bold text-bb-muted">API: Disconnected</div>
          <div id="os-mode-display" class="trade-pill sim" style="transform:scale(0.9)">SIM</div>
       </div>

       <!-- Mode Selection -->
       <div class="input-group" style="flex-direction:row;gap:12px;margin-bottom:8px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="os-mode" id="os-mode-sim" value="SIM" checked> <span style="font-size:11px;color:#fff">Simulate</span></label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="os-mode" id="os-mode-real" value="REAL"> <span style="font-size:11px;color:#fff">Real</span></label>
       </div>

      <!-- Smart DCA controlled from Global Settings -->

       <!-- Coin Selection -->
       <div class="input-group">
          <label>ASSET</label>
          <select id="os-coin" class="bb-select" style="width:100%"></select>
       </div>

       <!-- Order Type & Mode -->
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="input-group">
             <label>TYPE</label>
             <select id="os-type" class="bb-select">
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
                <option value="TWAP">TWAP</option>
                <option value="ICEBERG">ICEBERG</option>
             </select>
          </div>
          <div class="input-group">
             <label>MARGIN</label>
             <select id="os-tdmode" class="bb-select">
                <option value="cross">Cross</option>
                <option value="isolated">Isolated</option>
             </select>
          </div>
       </div>

       <!-- Leverage (Hidden by default) -->
        <div class="input-group" id="grp-leverage" style="display:none">
            <label>LEVERAGE</label>
            <input id="os-leverage" class="bb-input" placeholder="e.g. 10">
        </div>

       <!-- Size & Price -->
       <div class="input-group">
          <label>SIZE (Contracts/Coins)</label>
          <input id="os-size" class="bb-input" placeholder="0.0">
       </div>
       <div class="input-group">
          <label>PRICE (Optional)</label>
          <input id="os-price" class="bb-input" placeholder="Market">
       </div>

       <!-- Buttons -->
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
          <button id="btn-buy" class="action-btn buy">Buy / Long</button>
          <button id="btn-sell" class="action-btn sell">Sell / Short</button>
       </div>

       <!-- API Controls (Compact) -->
       <div style="margin-top:auto;border-top:1px solid rgba(255,255,255,0.05);padding-top:12px;display:flex;gap:8px">
           <button id="os-api-connect" class="trade-pill primary" style="flex:1;justify-content:center">Connect API</button>
           <button id="os-api-disconnect" class="trade-pill" style="flex:1;justify-content:center;display:none">Disconnect</button>
           <button id="os-api-test" class="trade-pill" style="width:30px;justify-content:center" title="Test Connection">?</button>
       </div>
    </div>

    <!-- MIDDLE COLUMN: STATS & POSITIONS -->
    <div class="area-middle">
       <!-- Stats Row -->
       <div class="okx-stat-group">
          <div class="stat-card">
             <div class="label">EQUITY (EST)</div>
             <div id="os-equity" class="value highlight">$0.00</div>
          </div>
          <div class="stat-card">
             <div class="label">UNREALIZED PNL</div>
             <div id="os-unrealized" class="value">$0.00</div>
          </div>
          <div class="stat-card">
             <div class="label">ACCOUNT BAL</div>
             <div id="os-balance" class="value">$0.00</div>
          </div>
       </div>

       <!-- Positions List -->
       <div class="glass-list" style="flex:1;min-height:200px">
          <div class="list-header">
             <span>Open Positions</span>
             <div style="display:flex;gap:8px">
                <span id="os-pos-count">0 OPEN</span>
                <button id="os-pos-refresh" style="color:var(--bb-gold);cursor:pointer">↻</button>
             </div>
          </div>
          <div id="os-positions" class="list-content scrollbar-thin">
             <!-- Injected Rows -->
          </div>
          <div class="p-2 border-t border-bb-border flex justify-between bg-black/20">
             <div style="font-size:9px;color:#777;display:flex;align-items:center;gap:6px">
                <input type="checkbox" id="os-show-composer"> Show Composer
             </div>
             <button id="os-pos-clear" class="text-[9px] text-bb-red hover:text-white">CLOSE ALL</button>
          </div>
       </div>

       <!-- Recent Fills (Compact) -->
       <div class="glass-list" style="height:160px">
          <div class="list-header">
             <span>Recent Fills</span>
             <button id="os-export" class="text-[9px] text-bb-blue">CSV</button>
          </div>
          <div id="os-real-fills" class="list-content scrollbar-thin"></div>
       </div>
    </div>

    <!-- RIGHT COLUMN: ACTIVE ORDERS -->
    <div class="area-right glass-list">
       <div class="list-header">
          <span>Active Orders</span>
          <button id="os-refresh" style="color:var(--bb-gold);cursor:pointer">↻</button>
       </div>
       <div id="os-orders" class="list-content scrollbar-thin"></div>
       <div class="p-2 border-t border-bb-border text-[9px] text-bb-muted text-center">
          Orders are cached locally + fetched from API
       </div>
    </div>

    <!-- Hidden Elements for Logic Compatibility -->
    <div style="display:none">
        <select id="os-side"><option value="buy">Buy</option><option value="sell">Sell</option></select>
        <button id="os-place">Place</button>
        <select id="os-force-mode"></select>
        <span id="os-detected-mode"></span>
        <div id="os-closed-pnl"></div>
        <div id="os-account"></div>
        <div id="os-fills"></div>
    </div>

    <!-- SAFETY CONTROLS PANEL -->
    <div id="os-safety-container" class="col-span-full"></div>
  `;
  container.appendChild(root);

  // Render Safety Panel
  const safetyContainer = document.getElementById('os-safety-container');
  if (safetyContainer) {
    safetyContainer.innerHTML = TradeSafety.renderSafetyPanel();
    TradeSafety.attachSafetyEvents(safetyContainer);
    // Re-render on safety state change
    window.addEventListener('trade-safety-update', () => {
      if (safetyContainer) {
        safetyContainer.innerHTML = TradeSafety.renderSafetyPanel();
        TradeSafety.attachSafetyEvents(safetyContainer);
      }
    });
  }

  // add futuristic class to header API buttons for consistent look
  try {
    const apiBtns = ['os-api-connect', 'os-api-disconnect', 'os-api-test'];
    for (const id of apiBtns) {
      const b = document.getElementById(id);
      if (b) b.classList.add('futuristic-link');
    }
  } catch (e) { }

  // settings button inside OKX Trade tab
  const settingsBtn = document.getElementById('os-open-settings');
  if (settingsBtn) settingsBtn.addEventListener('click', () => GlobalSettings.open());

  populateCoins();
  // Sync margin select with saved global setting so UI reflects saved 'isolated'/'cross'
  try {
    const savedMode = localStorage.getItem('okx_margin_mode') || 'cross';
    const osTd = document.getElementById('os-tdmode');
    if (osTd) osTd.value = savedMode;
  } catch (e) { }
  // Load DCA settings into UI
  try {
    const dcaEnabled = localStorage.getItem('os_dca_enabled') === '1';
    const dcaMode = localStorage.getItem('os_dca_mode') || 'pct';
    const dcaTrigger = localStorage.getItem(dcaMode === 'pnl' ? 'os_dca_trigger_pnl' : 'os_dca_trigger_pct') || (dcaMode === 'pnl' ? '5' : '2.0');
    const dcaWait = localStorage.getItem('os_dca_wait_min') || '3';
    const dcaSteps = localStorage.getItem('os_dca_max_steps') || '3';
    const btn = document.getElementById('os-dca-toggle');
    if (btn) { btn.classList.toggle('active', dcaEnabled); btn.innerText = dcaEnabled ? 'DCA ON' : 'DCA'; }
    const modeSel = document.getElementById('os-dca-mode'); if (modeSel) modeSel.value = dcaMode;
    const inTrigger = document.getElementById('os-dca-trigger'); if (inTrigger) inTrigger.value = dcaTrigger;
    const inWait = document.getElementById('os-dca-wait'); if (inWait) inWait.value = dcaWait;
    const inSteps = document.getElementById('os-dca-steps'); if (inSteps) inSteps.value = dcaSteps;
  } catch (e) { }
  document.getElementById('os-place').addEventListener('click', placeOrder);
  document.getElementById('os-refresh').addEventListener('click', renderOrders);
  document.getElementById('os-export').addEventListener('click', exportFills);
  document.getElementById('os-pos-refresh').addEventListener('click', loadRealPositions);
  document.getElementById('os-pos-clear').addEventListener('click', async () => {
    const choice = prompt('CLOSE ALL POSITIONS:\n1. Composer Only\n2. OKX Only\n3. ALL\n(Type the number or name)', '1');
    if (!choice) return;
    try {
      if (choice === '1' || choice.toLowerCase().includes('composer')) {
        if (ViewSignalComposer?.clearOpenPositions) ViewSignalComposer.clearOpenPositions();
        showToast('Composer positions cleared', 'info');
      } else if (choice === '2' || choice.toLowerCase().includes('okx')) {
        if (!confirm('REALLY CLOSE ALL OKX POSITIONS?')) return;
        showToast('Closing all OKX positions...', 'info');
        for (const p of _lastOkxPositions) {
          const coin = p.instId || p.symbol;
          const side = (p.posSide || p.side || (p.pos && Number(p.pos) < 0 ? 'SHORT' : 'LONG')).toUpperCase();
          const tdModeCur = localStorage.getItem('okx_margin_mode') || 'cross';
          try { await OkxClient.closePositionBy({ instId: coin, tdMode: tdModeCur, posSide: side, sz: String(Math.abs(p.pos || 1)) }); } catch (e) { console.error('Batch close failed', coin, e); }
        }
      } else if (choice === '3' || choice.toLowerCase() === 'all') {
        if (!confirm('REALLY CLOSE EVERYTHING?')) return;
        if (ViewSignalComposer?.clearOpenPositions) ViewSignalComposer.clearOpenPositions();
        for (const p of _lastOkxPositions) {
          const coin = p.instId || p.symbol;
          const side = (p.posSide || p.side || (p.pos && Number(p.pos) < 0 ? 'SHORT' : 'LONG')).toUpperCase();
          const tdModeCur = localStorage.getItem('okx_margin_mode') || 'cross';
          try { await OkxClient.closePositionBy({ instId: coin, tdMode: tdModeCur, posSide: side, sz: String(Math.abs(p.pos || 1)) }); } catch (e) { console.error('Batch close failed', coin, e); }
        }
        showToast('Full clear sequence sent', 'info');
      }
      renderOrders(); loadRealPositions();
    } catch (e) { console.error('Clear All error', e); }
  });
  document.getElementById('os-api-connect').addEventListener('click', async () => { await connectApi(); });
  document.getElementById('os-api-disconnect').addEventListener('click', () => { disconnectApi(); });
  document.getElementById('os-api-test').addEventListener('click', async () => { await testCredentials(); });

  // add Show Composer toggle (default off)
  // Wire up New Buy/Sell Buttons to Hidden Proxy
  const btnBuy = document.getElementById('btn-buy');
  const btnSell = document.getElementById('btn-sell');
  const hiddenPlace = document.getElementById('os-place');
  const hiddenSide = document.getElementById('os-side');

  if (btnBuy) btnBuy.addEventListener('click', () => { hiddenSide.value = 'buy'; hiddenPlace.click(); });
  if (btnSell) btnSell.addEventListener('click', () => { hiddenSide.value = 'sell'; hiddenPlace.click(); });

  // Load state for show composer toggle
  try {
    const chk = document.getElementById('os-show-composer');
    if (chk) {
      const stored = localStorage.getItem('os_show_composer_positions') === '1';
      chk.checked = stored;
      chk.addEventListener('change', () => { localStorage.setItem('os_show_composer_positions', chk.checked ? '1' : '0'); updatePositionsUI(); });
    }
  } catch (e) { }

  // show/hide leverage input when isolated selected
  const tdSel = document.getElementById('os-tdmode');
  const levEl = document.getElementById('os-leverage');
  if (tdSel && levEl) {
    tdSel.addEventListener('change', () => {
      if (tdSel.value === 'isolated') levEl.style.display = 'inline-block'; else levEl.style.display = 'none';
    });
  }

  // DCA settings are now controlled from Global Settings modal

  // mode detection UI
  const forceSel = document.getElementById('os-force-mode');
  if (forceSel) forceSel.addEventListener('change', () => { applyForceMode(forceSel.value); });

  // Add listener for coin selection to update everything
  const coinSel = document.getElementById('os-coin');
  if (coinSel) {
    coinSel.addEventListener('change', () => {
      renderOrders();
      loadAccountInfo();
      loadRealPositions();
    });
  }

  // (render continues)

  function startRealPolling() {
    if (_realPollTimer) return;
    _realPollTimer = setInterval(() => {
      const mode = localStorage.getItem('os_mode') || 'SIM';
      const cfg = OkxClient.getConfig() || {};
      const allowRealFetch = (mode === 'REAL') || (mode === 'SIM' && cfg.simulated);
      if (allowRealFetch && OkxClient.isConfigured()) renderOrders();
      else stopRealPolling();
    }, 5000);
  }

  function stopRealPolling() {
    if (_realPollTimer) { clearInterval(_realPollTimer); _realPollTimer = null; }
  }

  OrderSim.attachEngine(BacktestEngine);
  OrderSim.onFill(f => { appendFill(f); renderOrders(); });
  renderOrders();

  // reflect API connection state
  updateApiButtons();
  window.addEventListener('okx-config-changed', updateApiButtons);
  // Notify user when OkxClient falls back to a transient demo instance
  window.addEventListener('okx-demo-fallback', () => {
    try { showToast('Using demo fallback (transient) — showing demo data for this session', 'info'); updateModeIndicator(); } catch (e) { }
  });
  // when connected, fetch account info periodically
  window.addEventListener('okx-config-changed', () => { if (OkxClient.isConfigured()) { loadAccountInfo(); loadRealFills(); loadRealPositions(); } });
  window.addEventListener('okx-config-changed', () => { loadRealPositions(); });
  // Keep margin mode UI in sync when settings change
  window.addEventListener('okx-config-changed', () => {
    try {
      const savedMode = localStorage.getItem('okx_margin_mode') || 'cross';
      const osTd = document.getElementById('os-tdmode');
      if (osTd) osTd.value = savedMode;
    } catch (e) { }
  });



  // call it immediately on render so WS subscribes even if no config-changed event fired
  // No longer call immediately on render, handled by init() or okx-config-changed
  // ensurePrivateSubscription();

  // update detected mode display on load
  updateModeIndicator();
  _startPosPolling();
}

async function ensurePrivateSubscription() {
  try {
    if (OkxClient.isConfigured()) {
      await connectPrivate();

      // 1. POSITIONS
      if (!_privatePosCb) {
        _privatePosCb = (msg) => {
          try {
            const data = msg && msg.data ? (Array.isArray(msg.data) ? msg.data : [msg.data]) : [];
            const positions = [];
            for (const d of data) {
              if (Array.isArray(d)) positions.push(...d);
              else if (d) positions.push(d);
            }
            if (positions.length > 0) {
              _lastOkxPositions = positions;
              try { window._okx_ws_last_pos_update = Date.now(); } catch (e) { }
              updatePositionsUI();
            }
          } catch (e) { console.error('positions ws cb error', e); }
        };
        try { subscribePrivate({ channel: 'positions', instType: 'SWAP' }, _privatePosCb); } catch (e) { console.warn('subscribePrivate failed', e); }
      }

      // 2. ACCOUNT (Balance/Equity)
      if (!_privateAccountCb) {
        _privateAccountCb = (msg) => {
          try {
            const data = msg && msg.data ? (Array.isArray(msg.data) ? msg.data : [msg.data]) : [];
            if (data.length > 0) {
              const bal = data[0];
              if (bal && bal.details) {
                const d = bal.details.find(x => x.ccy === 'USDT') || bal.details[0];
                if (d) {
                  const val = parseFloat(d.eq || d.totalEq || d.cashBal || 0);
                  if (val > 0) {
                    _lastAccountBalance = val;
                    const balEl = document.getElementById('os-balance');
                    if (balEl) balEl.innerText = `$${val.toFixed(2)}`;
                    const el = document.getElementById('os-account');
                    if (el) el.innerHTML = `<div style="font-size:12px;color:#4ade80">WS: ${d.ccy} Eq=$${val.toFixed(2)} Avail=$${d.availBal || d.avail}</div>`;
                    try { if (val > 0) TradeSafety.updateEquity(val); } catch (e) { }
                  }
                }
              }
            }
          } catch (e) { console.error('account ws cb error', e); }
        };
        try { subscribePrivate({ channel: 'account' }, _privateAccountCb); } catch (e) { console.warn('subscribePrivate account failed', e); }
      }

      // 3. ORDERS (Standard)
      if (!_privateOrderCb) {
        _privateOrderCb = (msg) => {
          try {
            const data = msg && msg.data ? (Array.isArray(msg.data) ? msg.data : [msg.data]) : [];
            let hasUpdates = false;
            for (const o of data) {
              if (!o || !o.ordId) continue;
              const state = o.state || o.status || '';
              const id = o.ordId;
              if (state === 'filled' || state === 'canceled') {
                if (_realOpenOrdersMap.has(id)) { _realOpenOrdersMap.delete(id); hasUpdates = true; }
                if (state === 'filled') {
                  const price = o.fillPx || o.avgPx || o.px || 0;
                  const size = o.fillSz || o.accFillSz || o.sz || 0;
                  if (o.pnl && !isNaN(Number(o.pnl))) { try { TradeSafety.addRealizedPnL(Number(o.pnl)); } catch (e) { } }
                  appendFill({
                    ts: parseInt(o.uTime || o.cTime || Date.now()),
                    orderId: id, coin: o.instId, qty: size, price: price, note: 'WS'
                  });
                }
              } else {
                _realOpenOrdersMap.set(id, o);
                hasUpdates = true;
              }
            }
            if (hasUpdates) { _wsOrdersActive = true; renderOrders(); }
          } catch (e) { console.error('orders ws cb error', e); }
        };
        try { subscribePrivate({ channel: 'orders', instType: 'ANY' }, _privateOrderCb); } catch (e) { console.warn('subscribePrivate orders failed', e); }
      }

      // 4. ALGO ORDERS (TP/SL)
      if (!_privateAlgoOrderCb) {
        _privateAlgoOrderCb = (msg) => {
          try {
            const data = msg && msg.data ? (Array.isArray(msg.data) ? msg.data : [msg.data]) : [];
            let hasUpdates = false;
            for (const o of data) {
              if (!o || !o.algoId) continue;
              const state = o.state || o.status || '';
              const id = o.algoId;
              if (state === 'filled' || state === 'canceled' || state === 'order_failed') {
                if (_realOpenOrdersMap.has(id)) { _realOpenOrdersMap.delete(id); hasUpdates = true; }
              } else {
                _realOpenOrdersMap.set(id, o);
                hasUpdates = true;
              }
            }
            if (hasUpdates) { _wsOrdersActive = true; renderOrders(); }
          } catch (e) { console.error('algo-orders ws cb error', e); }
        };
        try { subscribePrivate({ channel: 'algo-orders', instType: 'ANY' }, _privateAlgoOrderCb); } catch (e) { console.warn('subscribePrivate algo-orders failed', e); }
      }

    } else {
      // Unsubscribe if config removed
      if (_privatePosCb) { try { unsubscribePrivate({ channel: 'positions', instType: 'SWAP' }, _privatePosCb); } catch (e) { } _privatePosCb = null; }
      if (_privateAccountCb) { try { unsubscribePrivate({ channel: 'account' }, _privateAccountCb); } catch (e) { } _privateAccountCb = null; }
      if (_privateOrderCb) { try { unsubscribePrivate({ channel: 'orders', instType: 'ANY' }, _privateOrderCb); } catch (e) { } _privateOrderCb = null; _wsOrdersActive = false; }
      if (_privateAlgoOrderCb) { try { unsubscribePrivate({ channel: 'algo-orders', instType: 'ANY' }, _privateAlgoOrderCb); } catch (e) { } _privateAlgoOrderCb = null; }
    }
  } catch (e) { console.error('ensurePrivateSubscription error', e); }
}

function updateModeIndicator() {
  const display = document.getElementById('os-mode-display');
  // const sel = document.getElementById('os-force-mode'); // Hidden now

  try {
    const cfg = OkxClient.getConfig() || {};
    // Logic to detect mode
    const isSimulated = (cfg && typeof cfg.simulated !== 'undefined') ? cfg.simulated : (localStorage.getItem('okx_demo_detected') === '1');
    const detected = isSimulated ? 'Demo' : 'Live';

    // Update simple display badge
    if (display) {
      if (detected === 'Live') { display.innerText = 'LIVE'; display.className = 'trade-pill real ok'; }
      else { display.innerText = 'SIM'; display.className = 'trade-pill sim'; }
    }
  } catch (e) {
    if (display) { display.innerText = '?'; display.className = 'trade-pill sim'; }
  }
}

async function testCredentials() {
  const btn = document.getElementById('os-api-test');
  if (btn) { btn.disabled = true; btn.innerText = 'Testing...'; }
  try {
    const res = await OkxClient.testCredentials();
    if (res && res.ok) {
      const mode = res.simulated ? 'Demo' : 'Live';
      showToast('Credentials valid — Detected: ' + mode, 'success');
      updateModeIndicator();
      showTestResultModal(res.res || res);
      window.dispatchEvent(new Event('okx-config-changed'));
    } else {
      showToast('Credentials test failed: ' + JSON.stringify(res && res.error ? res.error : res), 'error');
      showTestResultModal(res);
    }
  } catch (e) {
    showToast('Credentials test error: ' + (e && e.message ? e.message : JSON.stringify(e)), 'error');
    showTestResultModal(e);
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = 'Test Creds'; }
  }
}

function showTestResultModal(obj) {
  try {
    let m = document.getElementById('os-test-modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'os-test-modal'; m.className = 'bb-modal-backdrop';
      m.innerHTML = `<div class="bb-modal" style="width:640px;max-width:95%;max-height:70%;overflow:auto"><h3>Test Result</h3><pre id="os-test-pre" style="white-space:pre-wrap;font-size:12px"></pre><div style="text-align:right;margin-top:8px"><button id="os-test-close" class="trade-pill">Close</button></div></div>`;
      m.addEventListener('click', (e) => { if (e.target === m) m.remove(); });
      document.body.appendChild(m);
      document.getElementById('os-test-close').addEventListener('click', () => { m.remove(); });
    }
    const pre = document.getElementById('os-test-pre');
    if (pre) pre.innerText = JSON.stringify(obj, null, 2);
    m.style.display = 'flex'; m.classList.add('show');
  } catch (e) { console.log('showTestResultModal error', e); }
}

function applyForceMode(val) {
  try {
    // val: auto | force_live | force_demo
    const cfgRaw = localStorage.getItem('okx_api_config_v1');
    let cfg = cfgRaw ? JSON.parse(cfgRaw) : (OkxClient.getConfig() || {});
    if (val === 'auto') {
      if (cfg && typeof cfg.simulated !== 'undefined') delete cfg.simulated;
      localStorage.removeItem('okx_force_mode');
      showToast('Using auto-detected mode', 'info');
    } else if (val === 'force_live') {
      cfg = cfg || {};
      cfg.simulated = false;
      localStorage.setItem('okx_force_mode', 'force_live');
      showToast('Forcing Live mode for OKX requests', 'success');
    } else if (val === 'force_demo') {
      cfg = cfg || {};
      cfg.simulated = true;
      localStorage.setItem('okx_force_mode', 'force_demo');
      showToast('Forcing Demo mode for OKX requests', 'success');
    }
    try { localStorage.setItem('okx_api_config_v1', JSON.stringify(cfg)); } catch (e) { }
    window.dispatchEvent(new Event('okx-config-changed'));
    updateModeIndicator();
  } catch (e) { showToast('Failed to apply mode: ' + (e && e.message ? e.message : JSON.stringify(e)), 'error'); }
}

function populateCoins() {
  const sel = document.getElementById('os-coin'); sel.innerHTML = '';
  const coins = Object.keys(BacktestEngine.data || {});
  if (coins.length === 0) { const o = document.createElement('option'); o.value = '__none'; o.innerText = '(no data)'; sel.appendChild(o); }
  else {
    const allOpt = document.createElement('option');
    allOpt.value = 'ALL';
    allOpt.innerText = '--- ALL ASSETS ---';
    sel.appendChild(allOpt);
  }
  for (const c of coins) { const o = document.createElement('option'); o.value = c; o.innerText = c; sel.appendChild(o); }
}

async function placeOrder() {
  const coin = document.getElementById('os-coin').value;
  const side = document.getElementById('os-side').value;
  const type = document.getElementById('os-type').value;
  const size = parseFloat(document.getElementById('os-size').value) || 0;
  const price = parseFloat(document.getElementById('os-price').value) || null;
  if (!coin || coin === '__none') return alert('Select coin');
  const order = { coin, side, type, size };
  if (type === 'LIMIT' || type === 'BRACKET') order.limitPrice = price || undefined;
  if (type === 'TWAP') { order.durationMs = 60000; order.sliceCount = 6; }
  if (type === 'ICEBERG') { order.visibleSize = Math.max(1, Math.floor(size / 10)); }
  if (type === 'BRACKET') { order.entryType = price ? 'LIMIT' : 'MARKET'; order.entryPrice = price; order.takeProfit = price ? price * 1.02 : null; order.stopLoss = price ? price * 0.98 : null; }
  const mode = localStorage.getItem('os_mode') || 'SIM';
  if (mode === 'REAL') {
    // 🛡️ SAFETY GATE: Check if trading is allowed
    const safetyCheck = TradeSafety.canTrade();
    if (!safetyCheck.allowed) {
      showToast(`🛡️ Safety: ${safetyCheck.reason}`, 'warning');
      return;
    }
    if (!OkxClient.isConfigured()) return openApiConfig();
    // Enforce max real open positions if configured
    try {
      const maxReal = parseInt(localStorage.getItem('os_max_real_positions') || localStorage.getItem('os_alloc_max') || '5', 10) || 5;
      const posRes = await OkxClient.fetchPositions();
      const okxList = (posRes && posRes.data) ? posRes.data : [];
      const openCount = okxList.reduce((cnt, p) => {
        const size = Math.abs(Number(p.pos || p.posSize || p.posQty || p.qty || 0));
        return cnt + (size > 0 ? 1 : 0);
      }, 0);
      if (openCount >= maxReal) {
        showToast(`Max open positions reached (${openCount}/${maxReal}) — blocking new real order`, 'warning');
        return;
      }
    } catch (e) { console.warn('Max real positions check failed', e); }
    // Map internal order to OKX order shape
    // Prefer saved global margin mode; fall back to DOM select then 'cross'
    const tdMode = (localStorage.getItem('okx_margin_mode') || (document.getElementById('os-tdmode') ? document.getElementById('os-tdmode').value : 'cross'));
    const lev = document.getElementById('os-leverage') ? document.getElementById('os-leverage').value.trim() : '';

    const okxOrder = {
      instId: coin,
      tdMode: tdMode,
      side: side.toUpperCase(),
      ordType: (type === 'MARKET') ? 'market' : (type === 'LIMIT' ? 'limit' : 'market'),
      sz: String(size),
      px: price ? String(price) : undefined
    };

    // Auto-adjust size to instrument lot step and reflect in UI
    try {
      const adj = await OkxClient.adjustSize(coin, String(okxOrder.sz));
      if (parseFloat(adj) === 0) {
        showToast('Adjusted size is 0 — requested size too small for instrument lot step', 'error');
        return;
      }
      okxOrder.sz = String(adj);
      try { document.getElementById('os-size').value = String(adj); } catch (e) { }
    } catch (e) {
      console.warn('[viewOrderSim] adjustSize failed', e && e.message ? e.message : e);
    }

    // If isolated & leverage provided, attempt to set leverage first
    const doPlace = async () => {
      if (tdMode === 'isolated' && lev) {
        try {
          // use setLeverageFor which maps tdMode -> mgnMode expected by OKX
          await OkxClient.setLeverageFor({ instId: coin, tdMode: tdMode, lever: lev });
        } catch (e) { /* ignore but log */ console.warn('setLeverage failed', e); }
      }
      return OkxClient.placeOrder(okxOrder);
    };

    // Smart DCA gating for OKX TRADE: if existing same-side position present,
    // only allow auto DCA if configured and ROE threshold + cooldown satisfied.
    try {
      const dcaEnabled = localStorage.getItem('os_dca_enabled') === '1';
      if (dcaEnabled) {
        try {
          const dcaWait = parseInt(localStorage.getItem('os_dca_wait_min') || '3', 10) || 0;
          const dcaMax = parseInt(localStorage.getItem('os_dca_max_steps') || '3', 10) || 3;
          // fetch positions for this instId
          const posRes = await OkxClient.getPositions(coin);
          const pos = (posRes && posRes.data && Array.isArray(posRes.data) && posRes.data[0]) ? posRes.data[0] : null;
          if (pos && pos.pos && Math.abs(Number(pos.pos)) > 0) {
            // Determine side and roe
            const posSide = (pos.posSide || pos.side || (Number(pos.pos) < 0 ? 'SHORT' : 'LONG')) || '';
            const existingSide = String(posSide).toUpperCase();
            const intendedSide = String(okxOrder.side || '').toUpperCase();
            if (existingSide === intendedSide) {
              // compute ROE approx using markPx/avgPx and leverage if available
              const avg = parseFloat(pos.avgPx || pos.posAvgPx || pos.entryPrice || 0);
              const mark = parseFloat(pos.markPx || pos.markPrice || pos.last || 0);
              const lever = parseFloat(pos.lever || pos.lever || 1) || 1;
              let roe = 0;
              if (avg > 0 && mark > 0) roe = ((mark - avg) / avg) * (existingSide === 'LONG' ? 1 : -1) * lever * 100;

              // support USD PnL trigger mode
              const dcaModeNow = localStorage.getItem('os_dca_mode') || 'pct';
              let pnlUsd = null;
              if (dcaModeNow === 'pnl') {
                try {
                  // Prefer OKX-provided unrealized PnL fields when present
                  const uplFields = ['uplUsd', 'upl', 'unrealizedPnl', 'uPnL', 'unrealisedPnl'];
                  for (const f of uplFields) {
                    if (pos[f] !== undefined && pos[f] !== null && !isNaN(Number(pos[f]))) {
                      pnlUsd = Number(pos[f]);
                      console.debug('[OkxClient] using pos field for pnlUsd', f, pnlUsd);
                      break;
                    }
                  }

                  // If no direct field available, try contract-value based calc
                  if (pnlUsd === null) {
                    const contracts = Math.abs(Number(pos.pos || pos.qty || pos.amt || pos.vol || 0)) || 0;
                    let ctVal = null;
                    let info = null;
                    try {
                      const itype = coin.includes('-SWAP') ? 'SWAP' : 'SPOT';
                      const infoRes = await OkxClient.get('/api/v5/public/instruments', { instType: itype, instId: coin });
                      info = infoRes && infoRes.data && infoRes.data[0] ? infoRes.data[0] : null;
                      ctVal = info && (info.ctVal || info.contractVal) ? parseFloat(info.ctVal || info.contractVal) : null;
                    } catch (e) { /* ignore instrument lookup errors */ }
                    if (!ctVal && pos.ctVal) ctVal = parseFloat(pos.ctVal || pos.contractVal || 0);

                    // If ctVal exists, contracts are usually contracts count; use standard formula
                    if (isFinite(contracts) && contracts > 0 && avg > 0 && mark > 0 && ctVal && ctVal > 0) {
                      pnlUsd = (existingSide === 'LONG') ? (mark - avg) * contracts * ctVal : (avg - mark) * contracts * ctVal;
                      console.debug('[OkxClient] computed pnlUsd via ctVal', { contracts, ctVal, pnlUsd });
                    } else if (isFinite(contracts) && contracts > 0 && avg > 0 && mark > 0) {
                      // Fallback: assume `contracts` represents base-asset amount and price is quote per base
                      pnlUsd = (existingSide === 'LONG') ? (mark - avg) * contracts : (avg - mark) * contracts;
                      console.debug('[OkxClient] computed pnlUsd via price*contracts fallback', { contracts, pnlUsd, info });
                    }
                  }
                } catch (e) { console.warn('compute pnlUsd failed', e); }
              }

              const stateRaw = localStorage.getItem('os_dca_state');
              const stateMap = stateRaw ? JSON.parse(stateRaw) : {};
              const instState = stateMap[coin] || { lastDcaTime: 0, dcaStep: 0 };

              // Check for Position Override
              let dcaMaxOverride = dcaMax;
              let dcaTriggerOverride = null;
              try {
                const ovr = PositionSettings.getPosOverride(coin);
                if (ovr && ovr.dca) {
                  if (ovr.dca.enabled === false) { showToast(`DCA disabled via override for ${coin}`, 'info'); return; }
                  if (ovr.dca.maxSteps !== undefined) dcaMaxOverride = ovr.dca.maxSteps;
                  if (ovr.dca.triggerPct !== undefined) dcaTriggerOverride = ovr.dca.triggerPct;
                }
              } catch (e) { }

              // enforce max steps
              if (instState.dcaStep >= dcaMaxOverride) {
                showToast(`DCA max steps reached for ${coin} (${instState.dcaStep}/${dcaMaxOverride})`, 'warning');
                return;
              }

              // gating depending on mode: percent ROE or USD PnL
              const currentMode = localStorage.getItem('os_dca_mode') || 'pct';
              if (currentMode === 'pct') {
                const dcaTrigger = dcaTriggerOverride ?? (parseFloat(localStorage.getItem('os_dca_trigger_pct') || '2.0') || 2.0);
                if (roe > -dcaTrigger) {
                  showToast(`DCA blocked: ${coin} ROE ${roe.toFixed(2)}% above trigger -${dcaTrigger}%`, 'info');
                  return;
                }
              } else {
                const dcaTriggerUsd = parseFloat(localStorage.getItem('os_dca_trigger_pnl') || '0') || 0;
                if (pnlUsd === null) {
                  showToast(`DCA blocked: ${coin} PnL unavailable for USD trigger`, 'info');
                  return;
                }
                if (pnlUsd > -Math.abs(dcaTriggerUsd)) {
                  showToast(`DCA blocked: ${coin} unrealized PnL $${pnlUsd.toFixed(2)} above trigger -$${Math.abs(dcaTriggerUsd).toFixed(2)}`, 'info');
                  return;
                }
              }

              // Budget cap check
              const dcaBudget = Number(localStorage.getItem('os_alloc_budget') || 0);
              if (dcaBudget > 0) {
                try {
                  const allPosRes = await OkxClient.fetchPositions();
                  const allPos = (allPosRes && allPosRes.data) ? allPosRes.data : [];
                  const totalExposure = allPos.reduce((sum, p) => {
                    return sum + (Math.abs(Number(p.notionalUsd || 0)) || (Math.abs(Number(p.pos || 0)) * Number(p.markPx || p.last || 0)));
                  }, 0);
                  const orderUsd = parseFloat(okxOrder.sz || 0) * (parseFloat(pos.markPx || pos.last || 0) || 0);
                  if (totalExposure + orderUsd > dcaBudget) {
                    showToast(`DCA blocked: budget $${dcaBudget} exceeded (exposure $${totalExposure.toFixed(2)} + order $${orderUsd.toFixed(2)})`, 'warning');
                    return;
                  }
                } catch (e) { console.warn('DCA budget check failed', e); }
              }

              // cooldown check
              const now = Date.now();
              const waitMs = dcaWait * 60 * 1000;
              if (waitMs > 0 && (now - (instState.lastDcaTime || 0) < waitMs)) {
                showToast(`DCA cooldown active for ${coin}`, 'info');
                return;
              }

              // update state to mark pending dca step
              instState.lastDcaTime = now;
              instState.dcaStep = (instState.dcaStep || 0) + 1;
              stateMap[coin] = instState;
              try { localStorage.setItem('os_dca_state', JSON.stringify(stateMap)); } catch (e) { }
            }
          }
        } catch (e) { console.warn('DCA gating check failed', e); }
      }
    } catch (e) { }

    doPlace().then(res => {
      const oid = res && res.data && res.data[0] && res.data[0].ordId ? res.data[0].ordId : ('okx_' + Math.random().toString(36).slice(2, 9));
      appendFill({ orderId: oid, coin, price: price || 'market', qty: size, ts: Date.now(), note: 'real:placed' });
      renderOrders();
    }).catch(err => {
      showToast('OKX order failed: ' + (err && err.message ? err.message : JSON.stringify(err)), 'error');
    });
  } else {
    const id = OrderSim.placeOrder(order);
    appendFill({ orderId: id, coin, price: price || 'market', qty: 0, ts: Date.now(), note: 'placed' });
    renderOrders();
  }
}

function openApiConfig() {
  // kept for backwards-compat; open inline modal instead
  GlobalSettings.open();
}

async function connectApi() {
  // If browser has saved API credentials, validate & connect; otherwise open Global Settings
  try {
    if (OkxClient.isConfigured()) {
      const btn = document.getElementById('os-api-connect');
      if (btn) { btn.disabled = true; btn.innerText = 'Connecting...'; }
      const res = await OkxClient.testCredentials();
      if (res && res.ok) {
        showToast('Credentials valid — connected', 'success');
        // trigger config-changed so WS and UI subscribe
        window.dispatchEvent(new Event('okx-config-changed'));
        updateApiButtons();
      } else {
        showToast('Credentials invalid — please enter keys in Settings', 'error');
        GlobalSettings.open();
      }
      if (btn) { btn.disabled = false; btn.innerText = 'Connect'; }
    } else {
      GlobalSettings.open();
    }
  } catch (e) {
    showToast('Connect error: ' + (e && e.message ? e.message : JSON.stringify(e)), 'error');
    GlobalSettings.open();
  }
}

function disconnectApi() {
  OkxClient.clearConfig();
  disconnectPrivate(); // Ensure WS is closed
  showToast('OKX API disconnected (credentials cleared)', 'info');
  updateApiButtons();
  window.dispatchEvent(new Event('okx-config-changed'));
}

function updateApiButtons() {
  const connected = OkxClient.isConfigured();
  const connectBtn = document.getElementById('os-api-connect');
  const disconnectBtn = document.getElementById('os-api-disconnect');
  const led = document.getElementById('os-api-led');
  if (connected) {
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';
    if (led) led.innerText = 'API: Connected';
    // refresh account/trades immediately when connected
    loadAccountInfo();
    loadRealFills();
  } else {
    if (connectBtn) connectBtn.style.display = 'inline-flex';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (led) led.innerText = 'API: Not Connected';
  }
}

async function loadAccountInfo() {
  const el = document.getElementById('os-account'); if (!el) return;
  el.innerHTML = '<div class="muted">Loading account...</div>';
  const now = Date.now();
  if (now - _lastAccountFetch < FETCH_THROTTLE_MS) return;
  _lastAccountFetch = now;
  try {
    const res = await OkxClient.getBalance();
    if (!res || !res.data) { el.innerText = 'No account data'; return; }
    // Feed equity to TradeSafety for drawdown tracking
    try {
      const totalEq = Number(res.data[0]?.totalEq || res.data[0]?.eq || 0);
      if (totalEq > 0) TradeSafety.updateEquity(totalEq);
    } catch (e) { }
    // build a compact summary
    const rows = [];
    // OKX returns an array of balances; show details if present
    for (const entry of res.data) {
      if (entry && entry.details && Array.isArray(entry.details)) {
        for (const d of entry.details) {
          rows.push(`${d.ccy}: avail=${d.avail || d.availBal || d.sav || '0'} bal=${d.eq || d.balance || d.total || '0'}`);
        }
      }
    }
    if (rows.length === 0) {
      el.innerText = JSON.stringify(res.data[0] || res.data);
      return;
    }
    el.innerHTML = rows.slice(0, 8).map(r => `<div style="font-size:12px">${r}</div>`).join('');
  } catch (e) {
    el.innerHTML = '<div class="muted">Account load failed</div>';
  }
}

async function loadRealPositions() {
  const el = document.getElementById('os-positions'); if (!el) return;
  el.innerHTML = '<div class="muted">Loading positions...</div>';
  const now = Date.now();
  if (now - _lastPosFetch < FETCH_THROTTLE_MS) return;
  _lastPosFetch = now;
  try {
    const posRes = OkxClient.fetchPositions ? await OkxClient.fetchPositions() : null;
    const okxList = (posRes && posRes.data) ? posRes.data : [];
    _lastOkxPositions = okxList;
    // try to include Composer in-memory positions if available
    let composerPositions = [];
    try { if (ViewSignalComposer && typeof ViewSignalComposer.getOpenPositions === 'function') composerPositions = ViewSignalComposer.getOpenPositions(); } catch (e) { composerPositions = []; }

    el.innerHTML = '';
    if (composerPositions.length === 0 && okxList.length === 0) { el.innerHTML = '<div class="muted">No positions</div>'; return; }

    // refresh account balance display (best-effort)
    try {
      const balRes = await OkxClient.getBalance();
      if (balRes && balRes.data && Array.isArray(balRes.data) && balRes.data.length > 0) {
        // find USDT or first currency detail
        let found = null;
        for (const a of balRes.data) {
          if (!a || !a.details) continue;
          const d = a.details.find(x => x.ccy === 'USDT') || a.details[0];
          if (d) { found = d; break; }
        }
        if (found) {
          const bal = parseFloat(found.eq || found.balance || found.total || found.avail || 0) || 0;
          _lastAccountBalance = bal;
          const balEl = document.getElementById('os-balance'); if (balEl) balEl.innerText = `$${_lastAccountBalance.toFixed(2)}`;
        }
      }
    } catch (e) { /* ignore balance fetch errors */ }

    // show composer positions first (only if user enabled)
    const showComposer = (localStorage.getItem('os_show_composer_positions') === '1');
    if (showComposer) {
      for (const p of composerPositions) {
        const row = document.createElement('div'); row.style.padding = '6px'; row.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        row.innerHTML = `<div><b>COMPOSER</b> ${p.coin} ${p.side} size=${p.size} src=${p.source}</div>`;
        el.appendChild(row);
      }
    }

    // Update positions UI (handles OKX positions with PnL, leverage, etc.)
    updatePositionsUI();
  } catch (e) {
    el.innerHTML = '<div class="muted">Failed to load positions</div>';
  }
}

function _startPosPolling() {
  if (_posPollTimer) return;
  _posPollTimer = setInterval(() => updatePositionsUI(), 1000);
}
function _stopPosPolling() { if (_posPollTimer) { clearInterval(_posPollTimer); _posPollTimer = null; } }

function updatePositionsUI() {
  const el = document.getElementById('os-positions'); if (!el) return;
  // composer positions
  let composerPositions = [];
  try { if (ViewSignalComposer && typeof ViewSignalComposer.getOpenPositions === 'function') composerPositions = ViewSignalComposer.getOpenPositions(); } catch (e) { composerPositions = []; }

  // okx positions cached from last fetch
  const okxList = _lastOkxPositions || [];

  // build rows with PnL using marketState
  const rows = [];
  let totalPnl = 0;
  const showComposer = (localStorage.getItem('os_show_composer_positions') === '1');
  if (showComposer) {
    for (const p of composerPositions) {
      const coin = p.coin;
      const curPrice = (window.marketState && window.marketState[coin] && window.marketState[coin].raw && window.marketState[coin].raw.PRICE && window.marketState[coin].raw.PRICE.last) ? window.marketState[coin].raw.PRICE.last : null;
      const entry = p.entryPrice || null;
      let pnl = 0; let pnlPct = 0;
      if (curPrice && entry) {
        pnl = (p.side === 'LONG' ? (curPrice - entry) : (entry - curPrice)) * (Number(p.size) || 1);
        pnlPct = (entry ? (pnl / (entry * (Number(p.size) || 1))) * 100 : 0);
      }
      totalPnl += pnl || 0;
      rows.push({ tag: 'COMPOSER', coin, side: p.side, size: p.size, entry, price: curPrice, pnl, pnlPct });
    }
  }

  for (const p of okxList) {
    const coin = (p.instId || p.instrumentId || p.symbol || '').toUpperCase();
    const entry = p.avgPx || p.avgCost || p.posAvgPx || p.entryPrice || null;
    const mark = p.markPx || p.markPrice || p.last || ((window.marketState && window.marketState[coin] && window.marketState[coin].raw && window.marketState[coin].raw.PRICE && window.marketState[coin].raw.PRICE.last) ? window.marketState[coin].raw.PRICE.last : null);
    const side = (p.posSide || p.side || (p.pos && Number(p.pos) < 0 ? 'SHORT' : 'LONG')).toUpperCase();
    const size = Number(p.pos || p.posSize || p.posQty || p.qty || p.size || 0);
    const lever = p.lever || '';
    let pnl = 0, pnlPct = 0;
    // Prefer OKX-provided unrealized pnl when available
    if (typeof p.upl !== 'undefined' && p.upl !== null && p.upl !== '') {
      pnl = Number(p.upl) || 0;
      if (typeof p.uplRatio !== 'undefined' && p.uplRatio !== null && p.uplRatio !== '') pnlPct = Number(p.uplRatio) * 100;
      else pnlPct = (entry ? (pnl / (Number(entry) * (Math.abs(size) || 1))) * 100 : 0);
    } else if (mark != null && entry != null && !isNaN(size)) {
      // If OKX provides a contract value/multiplier, use it
      const ct = (typeof p.ctVal !== 'undefined' && p.ctVal) || (typeof p.contractVal !== 'undefined' && p.contractVal) || (typeof p.contractValUSD !== 'undefined' && p.contractValUSD) || null;
      const multiplier = ct ? Number(ct) : 1;
      if (side === 'LONG') pnl = (Number(mark) - Number(entry)) * size * multiplier;
      else pnl = (Number(entry) - Number(mark)) * size * multiplier;
      pnlPct = (entry ? (pnl / (Number(entry) * (Math.abs(size) || 1) * multiplier)) * 100 : 0);
    }
    totalPnl += pnl || 0;
    rows.push({ tag: 'OKX', coin, side, size, lever, entry, price: mark, pnl, pnlPct });
  }

  // render
  el.innerHTML = '';
  try {
    const cntEl = document.getElementById('os-pos-count'); if (cntEl) {
      cntEl.innerText = `${rows.length} OPEN`;
    }
  } catch (e) { }

  // CHECK TRAILING STOP
  rows.forEach(r => {
    try {
      if (TradeSafety && typeof TradeSafety.updateTrailingStop === 'function') {
        // Ensure pnlPct is a number
        const pp = Number(r.pnlPct) || 0;
        const tsRes = TradeSafety.updateTrailingStop(r.coin, pp);
        if (tsRes && tsRes.triggered) {
          console.log(`[TS] Triggered for ${r.coin}: ${tsRes.reason}`);
          showToast(`📉 Trailing Stop: Closing ${r.coin}...`, 'info');

          // ⚡ Simplified Close (Let OkxClient handle posMode detection)
          const tdModeCur = localStorage.getItem('okx_margin_mode') || 'cross';
          OkxClient.closePositionBy({
            instId: r.coin,
            tdMode: tdModeCur,
            posSide: r.side,
            sz: String(Math.abs(r.size || 1))
          })
            .then(() => {
              showToast(`📉 Trailing Stop: ${r.coin} Closed`, 'success');
            })
            .catch(err => showToast(`❌ TS Close Failed: ${err.message || 'Unknown Error'}`, 'error'));
        }
      }
    } catch (e) { console.error('TS check error', e); }
  });

  // Calculate totals
  try {
    const unrealEl = document.getElementById('os-unrealized');
    if (unrealEl) {
      unrealEl.innerText = `$${totalPnl.toFixed(2)}`;
      unrealEl.className = 'value ' + (totalPnl >= 0 ? 'green' : 'red');
    }
    const eqEl = document.getElementById('os-equity');
    if (eqEl) {
      eqEl.innerText = `$${(_lastAccountBalance + totalPnl).toFixed(2)}`;
    }
  } catch (e) { }

  if (rows.length === 0) {
    el.innerHTML = '<div class="list-row" style="justify-content:center;color:#555;font-style:italic">No active positions</div>';
    return;
  }

  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'list-row';

    const pnlClass = (r.pnl || 0) >= 0 ? 'text-bb-green' : 'text-bb-red';
    // derive explicit direction: prefer provided side, then numeric size sign
    const derivedSide = (r.side && String(r.side).toUpperCase() !== 'NET') ? String(r.side).toUpperCase() : (Number(r.size || 0) < 0 ? 'SHORT' : 'LONG');
    // derived side for display logic
    let displaySide = derivedSide;
    let sideClass = (displaySide === 'LONG') ? 'text-bb-green' : (displaySide === 'SHORT' ? 'text-bb-red' : 'text-bb-muted');

    row.innerHTML = `
        <div>
            <div class="symbol">${r.coin} <span class="${sideClass}" style="font-size:10px;margin-left:4px">${displaySide}</span> ${r.lever ? `<span class="px-1 rounded bg-white/10 text-[9px] text-bb-muted ml-1">${r.lever}x</span>` : ''}</div>
            <div class="sub-info">${r.tag} • Sz: ${r.size} • Ent: ${r.entry ? (Number(r.entry) > 100 ? Number(r.entry).toFixed(2) : Number(r.entry) > 1 ? Number(r.entry).toFixed(4) : Number(r.entry).toFixed(6)) : '-'}</div>
        </div>
        <div style="text-align:right;display:flex;align-items:center;gap:8px;">
            <div style="text-align:right">
                <div style="font-weight:800" class="${pnlClass}">$${(r.pnl || 0).toFixed(2)}</div>
                <div style="font-size:10px" class="${pnlClass}">${(r.pnlPct || 0).toFixed(2)}%</div>
            </div>
            ${r.tag === 'OKX' ? `<button class="ps-edit-btn opacity-40 hover:opacity-100 transition-opacity" data-coin="${r.coin}" title="Position Settings">⚙️</button>` : ''}
        </div>
    `;

    // Click to close (append distinct close button)
    const btn = document.createElement('button');
    btn.innerText = '×';
    btn.title = 'Close Position';
    btn.style.marginLeft = '12px';
    btn.style.background = 'none';
    btn.style.border = 'none';
    btn.style.color = '#777';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '16px';
    btn.className = 'hover:text-white transition-colors duration-200';
    btn.style.padding = '8px';
    btn.style.marginTop = '-8px';
    btn.style.marginBottom = '-8px';

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Close position ' + r.coin + ' ?')) return;
      try {
        if (r.tag === 'COMPOSER') {
          if (ViewSignalComposer && typeof ViewSignalComposer.closePosition === 'function') ViewSignalComposer.closePosition(r.coin);
          showToast('Composer position cleared', 'info');
          renderOrders(); loadRealPositions();
        } else {
          // ⚡ Simplified Close (Let OkxClient handle posMode detection)
          const tdModeCur = localStorage.getItem('okx_margin_mode') || 'cross';
          await OkxClient.closePositionBy({
            instId: r.coin,
            tdMode: tdModeCur,
            posSide: r.side,
            sz: String(Math.abs(r.size || 1))
          });

          if (ViewSignalComposer && typeof ViewSignalComposer.upsertPositionFromOkxFill === 'function') {
            if (ViewSignalComposer.getPosition && ViewSignalComposer.getPosition(r.coin)) ViewSignalComposer.closePosition(r.coin);
          }
          showToast('Close order sent to OKX', 'success');
          // ⚡ Immediate UI refresh for better snappiness
          _lastOkxPositions = _lastOkxPositions.filter(x => (x.instId || x.symbol || '').toUpperCase() !== r.coin.toUpperCase());
          updatePositionsUI();
          renderOrders();
          setTimeout(loadRealPositions, 1500); // Verify with API after 1.5s
        }
      } catch (err) {
        console.error('[CLOSE-BTN] Failed', err);
        showToast(`Close failed: ${err.message || 'Unknown error'}`, 'error');
      }
    });
    row.appendChild(btn);
    el.appendChild(row);

    // Attach Position Settings Edit Event
    row.querySelector('.ps-edit-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const coin = e.target.dataset.coin;
      PositionSettings.open(coin);
    });
  }
}

async function loadRealFills() {
  const el = document.getElementById('os-real-fills'); if (!el) return;
  el.innerHTML = '<div class="muted">Loading trades...</div>';
  const coin = document.getElementById('os-coin')?.value;
  try {
    // fetch recent fills (recent endpoint)
    const res = await OkxClient.fetchRecentFills({ instId: coin && coin !== '__none' ? coin : undefined, limit: 100 });
    const list = res && res.data ? res.data : [];
    // sync fills into Composer's position tracker
    try {
      if (typeof ViewSignalComposer.upsertPositionFromOkxFill === 'function') {
        list.forEach(f => {
          const fillId = f.billId || f.tradeId || `${f.instId || ''}-${f.fillTime || f.ts || f.fillTimeMs || ''}`;
          if (!_processedFills.has(fillId)) {
            try { ViewSignalComposer.upsertPositionFromOkxFill(f); } catch (e) { console.error('upsertPositionFromOkxFill error', e); }
            // Track PnL for Circuit Breaker
            if (f.pnl && !isNaN(Number(f.pnl))) {
              try { TradeSafety.addRealizedPnL(Number(f.pnl)); } catch (e) { }
            }
            _processedFills.add(fillId);
          }
        });
      }
    } catch (e) { console.error('sync fills error', e); }
    if (list.length === 0) { el.innerHTML = '<div class="muted">No recent trades</div>'; return; }
    el.innerHTML = '';
    for (const f of list.slice(0, 50)) {
      const ts = f && f.fillTime ? new Date(parseInt(f.fillTime)).toLocaleTimeString() : '';
      const row = document.createElement('div');
      row.className = 'list-row';
      row.style.cursor = 'pointer';
      row.title = 'Click for details';
      row.addEventListener('click', () => FillDetails.open(f));
      row.innerHTML = `
        <div>
            <div class="symbol">${f.instId || ''} <span style="font-size:10px;color:${(f.side || '').toUpperCase() === 'BUY' ? '#4ade80' : '#f87171'}">${f.side || ''}</span></div>
            <div class="sub-info">${ts}</div>
        </div>
        <div style="text-align:right">
            <div style="font-weight:700;color:#e5e5e5">${f.fillPx || f.px || ''}</div>
            <div class="sub-info">sz: ${f.fillSz || f.sz || ''}</div>
        </div>
      `;
      el.appendChild(row);
    }
  } catch (e) {
    // Quiet error handling: avoid noisy console retries/logs (401s can be noisy)
    const msg = (e && e.message) ? e.message : (e && JSON.stringify(e)) || 'Unknown error';
    el.innerHTML = '';
    const errDiv = document.createElement('div');
    errDiv.className = 'muted';
    errDiv.style.display = 'flex';
    errDiv.style.flexDirection = 'column';
    errDiv.style.gap = '8px';
    errDiv.innerHTML = `<div>Failed to load trades: ${msg}</div>`;
    const retry = document.createElement('button');
    retry.className = 'trade-pill';
    retry.style.width = '80px';
    retry.innerText = 'Retry';
    retry.addEventListener('click', async () => {
      try {
        retry.disabled = true; retry.innerText = 'Retrying...';
        // If API not configured, open settings; otherwise validate creds first
        if (!OkxClient.isConfigured()) {
          GlobalSettings.open();
        } else {
          const t = await OkxClient.testCredentials();
          if (t && t.ok) {
            // refresh tokens/state and load fills
            window.dispatchEvent(new Event('okx-config-changed'));
            await loadRealFills();
          } else {
            showToast('Credentials invalid — open Settings to fix', 'error');
            GlobalSettings.open();
          }
        }
      } catch (err) {
        console.error('Retry loadRealFills failed', err);
        showToast('Retry failed: ' + (err && err.message ? err.message : JSON.stringify(err)), 'error');
      } finally {
        retry.disabled = false; retry.innerText = 'Retry';
      }
    });
    errDiv.appendChild(retry);
    el.appendChild(errDiv);
  }
}


function renderOrders() {
  const el = document.getElementById('os-orders'); if (!el) return;
  el.innerHTML = '';
  const mode = localStorage.getItem('os_mode') || 'SIM';
  const cfg = OkxClient.getConfig() || {};
  const shouldFetch = OkxClient.isConfigured() && (mode === 'REAL' || (mode === 'SIM' && cfg.simulated));

  // Helper to render a list item
  const renderItem = (o, isSim) => {
    const d = document.createElement('div');
    d.className = 'list-row';
    const sideColor = (o.side || '').toUpperCase() === 'BUY' ? 'text-bb-green' : 'text-bb-red';
    const id = o.algoId || o.ordId || o.clOrdId || ('inst:' + (o.instId || '') || o.id);

    d.innerHTML = `
            <div>
                <div class="symbol">${o.instId || o.coin || ''} <span class="${sideColor}" style="font-size:10px">${o.side || ''}</span></div>
                <div class="sub-info">${o.ordType || o.type || ''} • ${o.sz || o.size || ''} @ ${o.px || o.price || 'MKT'}</div>
                <div class="sub-info" style="color:#fbbf24">${o.state || o.status || ''}</div>
            </div>
            <div>
               ${!isSim ? `<button class="action-btn" style="padding:4px 8px;width:auto;font-size:10px;background:#333;color:#ccc" id="cancel-${id}">X</button>` : ''}
            </div>
        `;

    if (!isSim) {
      const btn = d.querySelector(`#cancel-${id}`);
      if (btn) btn.addEventListener('click', () => {
        if (!confirm('Cancel order ' + id + '?')) return;
        btn.disabled = true; btn.innerText = '...';
        _realCancelPending.add(id);
        const p = o.algoId ? OkxClient.cancelAlgoOrders([{ instId: o.instId, algoId: o.algoId }]) : OkxClient.cancelOrder({ instId: o.instId, ordId: o.ordId || o.clOrdId });
        p.then(r => {
          _realCancelPending.delete(id); renderOrders();
        }).catch(e => {
          _realCancelPending.delete(id); alert('Failed'); renderOrders();
        });
      });
    }
    el.appendChild(d);
  };

  if (shouldFetch) {
    const coin = document.getElementById('os-coin').value;
    const instId = (coin === 'ALL' || coin === '__none') ? undefined : coin;

    // We still call REST fetch even if WS is active to ensure we have the bootstrap list
    OkxClient.fetchOpenOrders(instId).then(res => {
      const restList = (res && res.data) ? res.data : [];
      // Merge REST results into our map for persistence/WS sync
      restList.forEach(o => {
        const id = o.algoId || o.ordId || o.clOrdId;
        if (id) _realOpenOrdersMap.set(id, o);
      });

      // Now render from the map (which has been merged with REST data)
      let list = Array.from(_realOpenOrdersMap.values());
      if (instId) list = list.filter(o => o.instId === instId);

      // Sort: newest first
      list.sort((a, b) => (parseInt(b.cTime || b.uTime || 0) - parseInt(a.cTime || a.uTime || 0)));
      for (const o of list) { renderItem(o, false); }

      renderSimOrders(el, renderItem);
    }).catch(err => {
      // Fallback to just map if REST fails
      let list = Array.from(_realOpenOrdersMap.values());
      if (instId) list = list.filter(o => o.instId === instId);
      for (const o of list) { renderItem(o, false); }
      renderSimOrders(el, renderItem);
    });
  } else {
    renderSimOrders(el, renderItem);
  }
}

function renderSimOrders(el, renderItemFn) {
  const simOrders = OrderSim.listOrders();
  if (simOrders.length > 0) {
    const sep = document.createElement('div');
    sep.innerText = 'SIMULATOR ORDERS';
    sep.style.padding = '8px'; sep.style.fontSize = '10px'; sep.style.opacity = '0.5'; sep.style.textAlign = 'center';
    el.appendChild(sep);
    for (const o of simOrders) { renderItemFn(o, true); }
  }
  if (el.children.length === 0) {
    el.innerHTML = '<div class="list-row" style="justify-content:center;color:#555">No active orders</div>';
  }
}

function ensureRealEnabled() {
  try {
    const accepted = localStorage.getItem('okx_real_ack') === 'accepted';
    if (accepted) return true;
    const info = 'REAL TRADING ENABLE — WARNING:\nLive funds may be affected.\nRead AI_RULE/BUILD_AND_TEST.md and ensure you understand deterministic feature rules.';
    const v = prompt(info + '\n\nType EXACT: I AGREE');
    if (v === 'I AGREE') { localStorage.setItem('okx_real_ack', 'accepted'); return true; }
    showToast('Real trading not enabled. You must type the exact phrase to enable.', 'info');
    return false;
  } catch (e) { return false; }
}

function appendFill(f) {
  const el = document.getElementById('os-fills'); if (!el) return;
  const d = document.createElement('div'); d.style.padding = '6px'; d.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
  d.innerText = `${new Date(f.ts).toLocaleTimeString()} ${f.orderId} ${f.coin} ${f.qty}@${f.price} ${f.note || ''}`;
  el.appendChild(d); el.scrollTop = el.scrollHeight;
}

function exportFills() {
  const rows = ['orderId,coin,price,qty,ts,note'];
  const el = document.getElementById('os-fills'); if (!el) return;
  for (const child of el.children) {
    const txt = child.innerText.replace(/,/g, '');
    rows.push('"' + txt + '"');
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'order_fills.csv'; a.click(); URL.revokeObjectURL(url);
}

