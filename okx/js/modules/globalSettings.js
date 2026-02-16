import OkxClient from '../okx_client.js';
import { showToast } from './toast.js';
import PositionSettings from './positionSettings.js';

const BACKDROP_ID = 'bb-global-settings-backdrop';

function maskKey(k) {
  if (!k) return '';
  if (k.length < 12) return k.replace(/.(?=.{4})/g, '*');
  return k.slice(0, 6) + '...' + k.slice(-4);
}

function buildModal() {
  let existing = OkxClient.getConfig() || {};
  const backdrop = document.createElement('div');
  backdrop.id = BACKDROP_ID;
  backdrop.className = 'bb-modal-backdrop';
  backdrop.innerHTML = `
    <div class="bb-modal" role="dialog" aria-modal="true" style="display:flex;flex-direction:column;max-width:720px;width:90%;">
      <h3>Global Settings</h3>
      <div class="bb-modal-body" style="overflow:auto;max-height:70vh;padding-right:8px;">
        <div class="row"><label>Default Mode</label>
          <select id="gs-default-mode"><option value="SIM">SIM</option><option value="REAL">REAL</option></select>
        </div>
        <div class="row"><label>API Key</label><input id="gs-api-key" type="text" value="${existing.key || ''}" placeholder="OKX API Key"></div>
        <div class="row"><label>API Secret</label><input id="gs-api-secret" type="password" value="${existing.secret || ''}" placeholder="OKX API Secret"></div>
        <div class="row"><label>Passphrase</label><input id="gs-api-pass" type="text" value="${existing.passphrase || ''}" placeholder="Passphrase"></div>
        <div class="row"><label>Poll Interval (ms)</label><input id="gs-poll-interval" type="text" value="${localStorage.getItem('okx_poll_interval') || 5000}"></div>
        <div class="row"><label>Margin Mode</label>
          <select id="gs-margin-mode"><option value="cross">Cross</option><option value="isolated">Isolated</option></select>
        </div>
        <div class="row"><label>Default Leverage</label><input id="gs-default-leverage" type="text" value="${localStorage.getItem('okx_default_leverage') || ''}" placeholder="e.g. 20"></div>
        <div class="row"><label>Trailing Stop</label>
          <label style="display:inline-flex;align-items:center;gap:8px;margin-left:6px"><input id="gs-enable-trailing" type="checkbox"> Enable</label>
        </div>
        <div class="row"><label>Trailing Activation %</label><input id="gs-trail-activation" type="text" value="${localStorage.getItem('os_trailing_activation_pct') || 0.012}"></div>
        <div class="row"><label>Trailing Callback %</label><input id="gs-trail-callback" type="text" value="${localStorage.getItem('os_trailing_callback_pct') || 0.001}"></div>
        <div class="row"><label></label><button id="gs-bulk-apply-ts" class="trade-pill" style="font-size:8px;padding:2px 6px;">Apply TS to all Open Positions</button></div>
        <div class="row"><label>Smart DCA</label>
          <label style="display:inline-flex;align-items:center;gap:8px;margin-left:6px"><input id="gs-enable-dca" type="checkbox" ${localStorage.getItem('os_enable_smart_dca') === '1' ? 'checked' : ''}> Enable</label>
        </div>
        <div class="row"><label>DCA Mode</label>
          <select id="gs-dca-mode"><option value="pct">Trigger %</option><option value="pnl">Trigger USD</option></select>
        </div>
        <div class="row"><label>DCA Trigger</label><input id="gs-dca-trigger" type="text" value="${localStorage.getItem('os_dca_trigger_pct') || localStorage.getItem('os_dca_trigger_pnl') || 2}"></div>
        <div class="row"><label>DCA Wait (min)</label><input id="gs-dca-wait" type="text" value="${localStorage.getItem('os_dca_wait_min') || 3}"></div>
        <div class="row"><label>Max DCA Counts</label><input id="gs-max-dca" type="text" value="${localStorage.getItem('os_dca_max_steps') || localStorage.getItem('os_max_dca_counts') || 2}"></div>
        <div class="row"><label></label><button id="gs-bulk-apply-dca" class="trade-pill" style="font-size:8px;padding:2px 6px;">Apply DCA to all Open Positions</button></div>
        
        <div class="row" style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px"><label>Strategy Allocator</label></div>
        <div class="row"><label>Total Budget (USD)</label><input id="gs-alloc-budget" type="text" value="${localStorage.getItem('os_alloc_budget') || ''}" placeholder="Empty = unlimited"></div>
        <div class="row"><label>Base USD Size</label><input id="gs-alloc-base" type="text" value="${localStorage.getItem('os_alloc_base') || 5}" placeholder="Default position size"></div>
        <div class="row"><label>Min USD</label><input id="gs-alloc-min" type="text" value="${localStorage.getItem('os_alloc_min') || 3}" placeholder="Minimum size"></div>
        <div class="row"><label>Max USD</label><input id="gs-alloc-max" type="text" value="${localStorage.getItem('os_alloc_max') || 7}" placeholder="Maximum size cap"></div>
        <div class="row"><label>Max Open Positions</label><input id="gs-max-positions" type="text" value="${localStorage.getItem('os_max_positions') || 5}" placeholder="Concurrent positions limit"></div>

        <div class="row"><label></label><div class="muted">Derivatives enforced: SWAP/PERP only. Margin mode applies to real orders; leverage must be applied per-instrument via OKX API.</div></div>
      </div>
      <div class="actions" style="display:flex;gap:8px;justify-content:flex-end;padding:12px;border-top:1px solid rgba(255,255,255,0.06);background:linear-gradient(rgba(0,0,0,0.02),transparent);">
        <button id="gs-toggle-mode" class="trade-pill">Toggle Real/Demo</button>
        <button id="gs-clear" class="trade-pill">Clear API</button>
        <button id="gs-cancel" class="trade-pill">Cancel</button>
        <button id="gs-apply" class="trade-pill">Apply</button>
        <button id="gs-save" class="trade-pill">Save</button>
      </div>
    </div>
  `;

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);

  document.getElementById('gs-clear').addEventListener('click', () => {
    localStorage.removeItem('okx_api_config_v1');
    showToast('API credentials cleared', 'info');
    window.dispatchEvent(new Event('okx-config-changed'));
    fillFields();
  });
  document.getElementById('gs-toggle-mode').addEventListener('click', async () => {
    // Toggle between SIM and REAL by swapping stored config. Behavior:
    // - If switching to SIM and demo config exists (okx_api_config_v1_demo), backup current real config
    //   to okx_api_config_v1_real then copy demo into okx_api_config_v1 and set os_mode=SIM.
    // - If switching to REAL and backup exists, restore okx_api_config_v1_real to okx_api_config_v1 and set os_mode=REAL.
    try {
      const cur = OkxClient.getConfig() || {};
      const curMode = (typeof cur.simulated !== 'undefined') ? (cur.simulated ? 'SIM' : 'REAL') : (localStorage.getItem('os_mode') || 'SIM');
      if (curMode === 'REAL') {
        const demoRaw = localStorage.getItem('okx_api_config_v1_demo');
        if (!demoRaw) { showToast('No demo config found (okx_api_config_v1_demo).', 'error'); return; }
        try { localStorage.setItem('okx_api_config_v1_real', JSON.stringify(cur || {})); } catch (e) { /* ignore */ }
        localStorage.setItem('okx_api_config_v1', demoRaw);
        localStorage.setItem('os_mode', 'SIM');
        showToast('Switched to Demo config', 'success');
      } else {
        const realRaw = localStorage.getItem('okx_api_config_v1_real');
        if (realRaw) {
          localStorage.setItem('okx_api_config_v1', realRaw);
          localStorage.setItem('os_mode', 'REAL');
          try { localStorage.removeItem('okx_api_config_v1_real'); } catch (e) { }
          showToast('Switched to Real config (restored backup)', 'success');
        } else {
          // no backup — attempt to mark current config as REAL
          try {
            const curRaw = localStorage.getItem('okx_api_config_v1') || '{}';
            const parsed = JSON.parse(curRaw);
            parsed.simulated = false;
            localStorage.setItem('okx_api_config_v1', JSON.stringify(parsed));
            localStorage.setItem('os_mode', 'REAL');
            showToast('Marked current config as REAL', 'success');
          } catch (e) {
            showToast('Failed to switch to REAL: ' + e.message, 'error');
            return;
          }
        }
      }
      // Reset OkxClient instance so _ensureApi picks up the new config immediately
      try { if (window.OkxClient) { window.OkxClient._apiInstance = null; } } catch (e) { }
      window.dispatchEvent(new Event('okx-config-changed'));
      fillFields();
    } catch (e) { showToast('Toggle failed: ' + (e && e.message ? e.message : JSON.stringify(e)), 'error'); }
  });

  const handleBulkApply = (type) => {
    // type: 'ts' or 'dca'
    OkxClient.fetchPositions().then(res => {
      const positions = (res && res.data) ? res.data : [];
      if (!positions.length) { showToast('No open positions found to apply settings', 'info'); return; }
      const instIds = positions.map(p => p.instId);
      if (confirm(`Apply current Global ${type.toUpperCase()} settings to ${instIds.length} open positions?`)) {
        PositionSettings.bulkApplyGlobal(instIds);
        showToast(`Global ${type.toUpperCase()} applied to all open positions`, 'success');
        window.dispatchEvent(new CustomEvent('okx-config-changed')); // Trigger UI refresh
      }
    }).catch(err => showToast('Bulk apply failed: ' + err.message, 'error'));
  };

  document.getElementById('gs-bulk-apply-ts').addEventListener('click', () => handleBulkApply('ts'));
  document.getElementById('gs-bulk-apply-dca').addEventListener('click', () => handleBulkApply('dca'));

  document.getElementById('gs-cancel').addEventListener('click', () => closeModal());
  document.getElementById('gs-apply').addEventListener('click', async () => {
    // Save settings and attempt to apply default leverage if configured
    const key = document.getElementById('gs-api-key').value.trim();
    const secret = document.getElementById('gs-api-secret').value.trim();
    const pass = document.getElementById('gs-api-pass').value.trim();
    const mode = document.getElementById('gs-default-mode').value;
    const marginMode = document.getElementById('gs-margin-mode').value || 'cross';
    const defLev = document.getElementById('gs-default-leverage').value.trim();
    const poll = parseInt(document.getElementById('gs-poll-interval').value) || 5000;

    if (key && secret && pass) {
      const simFlag = (mode === 'SIM');
      OkxClient.configure({ key, secret, passphrase: pass, simulated: simFlag });
      try { localStorage.setItem('okx_user_set_mode', '1'); } catch (e) { }
      showToast('API credentials saved', 'success');
    }
    // trailing / DCA
    const enableTrail = document.getElementById('gs-enable-trailing').checked;
    const trailAct = parseFloat(document.getElementById('gs-trail-activation').value) || 0.012;
    const trailCb = parseFloat(document.getElementById('gs-trail-callback').value) || 0.001;
    const enableDca = document.getElementById('gs-enable-dca').checked;
    const dcaMode = document.getElementById('gs-dca-mode') ? document.getElementById('gs-dca-mode').value : 'pct';
    const dcaTriggerVal = document.getElementById('gs-dca-trigger') ? document.getElementById('gs-dca-trigger').value : '';
    const maxDca = parseInt(document.getElementById('gs-max-dca').value) || 2;
    const dcaWaitVal = document.getElementById('gs-dca-wait') ? document.getElementById('gs-dca-wait').value : '';

    // Allocator
    const allocBudget = document.getElementById('gs-alloc-budget').value.trim();
    const allocBase = parseFloat(document.getElementById('gs-alloc-base').value) || 10;
    const allocMin = parseFloat(document.getElementById('gs-alloc-min').value) || 2;
    const allocMax = parseFloat(document.getElementById('gs-alloc-max').value) || 200;
    const maxPositions = parseInt(document.getElementById('gs-max-positions').value) || 5;

    localStorage.setItem('os_enable_trailing_stop', enableTrail ? '1' : '0');
    localStorage.setItem('os_trailing_activation_pct', String(trailAct));
    localStorage.setItem('os_trailing_callback_pct', String(trailCb));
    localStorage.setItem('os_enable_smart_dca', enableDca ? '1' : '0');
    localStorage.setItem('os_max_dca_counts', String(maxDca));
    localStorage.setItem('os_dca_mode', dcaMode || 'pct');
    if (dcaMode === 'pnl') localStorage.setItem('os_dca_trigger_pnl', String(parseFloat(dcaTriggerVal) || 0));
    else localStorage.setItem('os_dca_trigger_pct', String(parseFloat(dcaTriggerVal) || 2.0));
    localStorage.setItem('os_dca_wait_min', String(parseInt(dcaWaitVal) || 0));

    if (allocBudget) localStorage.setItem('os_alloc_budget', String(parseFloat(allocBudget) || 0));
    else localStorage.removeItem('os_alloc_budget');
    localStorage.setItem('os_alloc_base', String(allocBase));
    localStorage.setItem('os_alloc_min', String(allocMin));
    localStorage.setItem('os_alloc_max', String(allocMax));
    localStorage.setItem('os_max_positions', String(maxPositions));

    localStorage.setItem('os_mode', mode);
    // mark that user explicitly acknowledged REAL mode to avoid auto-revert
    try {
      if (mode === 'REAL') localStorage.setItem('okx_real_ack', '1'); else localStorage.removeItem('okx_real_ack');
    } catch (e) { }
    localStorage.setItem('okx_margin_mode', marginMode);
    if (defLev) localStorage.setItem('okx_default_leverage', defLev);
    localStorage.setItem('okx_poll_interval', String(poll));
    window.dispatchEvent(new Event('okx-config-changed'));

    // If API configured and defLev present, attempt to apply to selected instrument
    if (OkxClient.isConfigured() && defLev) {
      let instId = window.selectedCoin || null;
      if (!instId || instId === '__none') {
        instId = prompt('Enter instrument instId to apply leverage (e.g. BTC-USD-SWAP):');
      }
      if (instId) {
        showToast(`Applying leverage ${defLev} to ${instId}...`, 'info');
        try {
          const res = await OkxClient.setLeverageFor({ instId, tdMode: marginMode, lever: defLev });
          showToast(`Leverage applied to ${instId}`, 'success');
        } catch (e) {
          showToast('Failed to apply leverage: ' + (e && e.message ? e.message : JSON.stringify(e)), 'error');
        }
      }
    }
  });
  document.getElementById('gs-save').addEventListener('click', () => {
    const key = document.getElementById('gs-api-key').value.trim();
    const secret = document.getElementById('gs-api-secret').value.trim();
    const pass = document.getElementById('gs-api-pass').value.trim();
    const mode = document.getElementById('gs-default-mode').value;
    const marginMode = document.getElementById('gs-margin-mode').value || 'isolated';
    const defLev = document.getElementById('gs-default-leverage').value.trim();
    const poll = parseInt(document.getElementById('gs-poll-interval').value) || 5000;
    if (key && secret && pass) {
      const simFlag = (mode === 'SIM');
      OkxClient.configure({ key, secret, passphrase: pass, simulated: simFlag });
      try { localStorage.setItem('okx_user_set_mode', '1'); } catch (e) { }
      showToast('API credentials saved', 'success');
    }
    localStorage.setItem('os_mode', mode);
    try {
      if (mode === 'REAL') localStorage.setItem('okx_real_ack', '1'); else localStorage.removeItem('okx_real_ack');
    } catch (e) { }
    localStorage.setItem('okx_margin_mode', marginMode);
    if (defLev) localStorage.setItem('okx_default_leverage', defLev);
    localStorage.setItem('okx_poll_interval', String(poll));
    // trailing / DCA
    const enableTrail2 = document.getElementById('gs-enable-trailing').checked;
    const trailAct2 = parseFloat(document.getElementById('gs-trail-activation').value) || 0.012;
    const trailCb2 = parseFloat(document.getElementById('gs-trail-callback').value) || 0.001;
    const enableDca2 = document.getElementById('gs-enable-dca').checked;
    const maxDca2 = parseInt(document.getElementById('gs-max-dca').value) || 2;

    // Allocator
    const allocBudget2 = document.getElementById('gs-alloc-budget').value.trim();
    const allocBase2 = parseFloat(document.getElementById('gs-alloc-base').value) || 10;
    const allocMin2 = parseFloat(document.getElementById('gs-alloc-min').value) || 2;
    const allocMax2 = parseFloat(document.getElementById('gs-alloc-max').value) || 200;
    const maxPositions2 = parseInt(document.getElementById('gs-max-positions').value) || 5;

    localStorage.setItem('os_enable_trailing_stop', enableTrail2 ? '1' : '0');
    localStorage.setItem('os_trailing_activation_pct', String(trailAct2));
    localStorage.setItem('os_trailing_callback_pct', String(trailCb2));
    localStorage.setItem('os_enable_smart_dca', enableDca2 ? '1' : '0');
    localStorage.setItem('os_max_dca_counts', String(maxDca2));

    if (allocBudget2) localStorage.setItem('os_alloc_budget', String(parseFloat(allocBudget2) || 0));
    else localStorage.removeItem('os_alloc_budget');
    localStorage.setItem('os_alloc_base', String(allocBase2));
    localStorage.setItem('os_alloc_min', String(allocMin2));
    localStorage.setItem('os_alloc_max', String(allocMax2));
    localStorage.setItem('os_max_positions', String(maxPositions2));

    window.dispatchEvent(new Event('okx-config-changed'));
    closeModal();
  });

  return backdrop;
}

function fillFields() {
  const existing = OkxClient.getConfig() || {};
  const elDefaultMode = document.getElementById('gs-default-mode');
  if (elDefaultMode) {
    if (typeof existing.simulated !== 'undefined') {
      elDefaultMode.value = existing.simulated ? 'SIM' : 'REAL';
    } else {
      elDefaultMode.value = localStorage.getItem('os_mode') || 'SIM';
    }
  }
  const elKey = document.getElementById('gs-api-key');
  const elSecret = document.getElementById('gs-api-secret');
  const elPass = document.getElementById('gs-api-pass');
  const elMode = document.getElementById('gs-margin-mode');
  const elLev = document.getElementById('gs-default-leverage');
  if (elKey) elKey.value = existing.key || '';
  if (elSecret) elSecret.value = existing.secret || '';
  if (elPass) elPass.value = existing.passphrase || '';
  if (elMode) elMode.value = localStorage.getItem('okx_margin_mode') || 'cross';
  if (elLev) elLev.value = localStorage.getItem('okx_default_leverage') || '';
  // trailing / DCA fields
  const et = document.getElementById('gs-enable-trailing'); if (et) et.checked = (localStorage.getItem('os_enable_trailing_stop') === '1');
  const ta = document.getElementById('gs-trail-activation'); if (ta) ta.value = localStorage.getItem('os_trailing_activation_pct') || 0.012;
  const tc = document.getElementById('gs-trail-callback'); if (tc) tc.value = localStorage.getItem('os_trailing_callback_pct') || 0.001;
  const ed = document.getElementById('gs-enable-dca'); if (ed) ed.checked = (localStorage.getItem('os_enable_smart_dca') === '1');
  const md = document.getElementById('gs-max-dca'); if (md) md.value = localStorage.getItem('os_max_dca_counts') || 2;
  const dmode = document.getElementById('gs-dca-mode'); if (dmode) dmode.value = localStorage.getItem('os_dca_mode') || 'pct';
  const dtr = document.getElementById('gs-dca-trigger'); if (dtr) dtr.value = localStorage.getItem('os_dca_trigger_pct') || localStorage.getItem('os_dca_trigger_pnl') || 2;
  const dw = document.getElementById('gs-dca-wait'); if (dw) dw.value = localStorage.getItem('os_dca_wait_min') || 3;

  // Allocator fields
  const abud = document.getElementById('gs-alloc-budget'); if (abud) abud.value = localStorage.getItem('os_alloc_budget') || '';
  const ab = document.getElementById('gs-alloc-base'); if (ab) ab.value = localStorage.getItem('os_alloc_base') || 5;
  const amin = document.getElementById('gs-alloc-min'); if (amin) amin.value = localStorage.getItem('os_alloc_min') || 3;
  const amax = document.getElementById('gs-alloc-max'); if (amax) amax.value = localStorage.getItem('os_alloc_max') || 7;
}

export function open() {
  let b = document.getElementById(BACKDROP_ID);
  if (!b) b = buildModal();
  fillFields();
  b.classList.add('show');
  b.style.display = 'flex';
}

export function closeModal() {
  const b = document.getElementById(BACKDROP_ID);
  if (!b) return;
  b.classList.remove('show');
  b.style.display = 'none';
}

export default { open, close: closeModal };
