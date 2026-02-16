import OkxClient from '../okx_client.js';
import { showToast } from './toast.js';

const BACKDROP_ID = 'bb-pos-settings-backdrop';
const STORAGE_PREFIX = 'os_pos_override_';

function getOverrides(instId) {
    const raw = localStorage.getItem(STORAGE_PREFIX + instId);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}

function saveOverrides(instId, data) {
    localStorage.setItem(STORAGE_PREFIX + instId, JSON.stringify(data));
}

function buildModal(instId) {
    const overrides = getOverrides(instId) || {};

    // Default values from global settings
    const globalDcaEnabled = localStorage.getItem('os_enable_smart_dca') === '1';
    const globalDcaMax = parseInt(localStorage.getItem('os_max_dca_counts') || '2');
    const globalDcaTrigger = parseFloat(localStorage.getItem('os_dca_trigger_pct') || '2.0');

    const globalTsEnabled = localStorage.getItem('os_enable_trailing_stop') === '1';
    const globalTsAct = parseFloat(localStorage.getItem('os_trailing_activation_pct') || '0.012');
    const globalTsCb = parseFloat(localStorage.getItem('os_trailing_callback_pct') || '0.001');

    const backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className = 'bb-modal-backdrop';
    backdrop.innerHTML = `
        <div class="bb-modal" style="width:480px;max-width:95%;">
            <h3>Settings for ${instId}</h3>
            
            <div class="bb-modal-body" style="display:flex;flex-direction:column;gap:12px;">
                <!-- DCA SECTION -->
                <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                    <div style="font-size:10px; color:var(--bb-gold); font-weight:800; text-transform:uppercase; margin-bottom:8px;">Smart DCA</div>
                    <div class="row">
                        <label style="min-width:100px;">Enable Override</label>
                        <input id="ps-dca-override" type="checkbox" ${overrides.dca?.enabled !== undefined ? (overrides.dca.enabled ? 'checked' : '') : ''}>
                        <span class="muted" style="font-size:9px;">(Global: ${globalDcaEnabled ? 'ON' : 'OFF'})</span>
                    </div>
                    <div class="row">
                        <label style="min-width:100px;">Max Steps</label>
                        <input id="ps-dca-max" type="number" value="${overrides.dca?.maxSteps ?? globalDcaMax}" class="bb-input" style="flex:0.3;">
                    </div>
                    <div class="row">
                        <label style="min-width:100px;">Trigger %</label>
                        <input id="ps-dca-trigger" type="number" step="0.1" value="${overrides.dca?.triggerPct ?? globalDcaTrigger}" class="bb-input" style="flex:0.3;">
                    </div>
                </div>

                <!-- TRAILING STOP SECTION -->
                <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                    <div style="font-size:10px; color:var(--bb-blue); font-weight:800; text-transform:uppercase; margin-bottom:8px;">Trailing Stop</div>
                    <div class="row">
                        <label style="min-width:100px;">Enable Override</label>
                        <input id="ps-ts-override" type="checkbox" ${overrides.ts?.enabled !== undefined ? (overrides.ts.enabled ? 'checked' : '') : ''}>
                        <span class="muted" style="font-size:9px;">(Global: ${globalTsEnabled ? 'ON' : 'OFF'})</span>
                    </div>
                    <div class="row">
                        <label style="min-width:100px;">Activation %</label>
                        <input id="ps-ts-act" type="number" step="0.1" value="${overrides.ts?.activationPct ?? globalTsAct}" class="bb-input" style="flex:0.3;">
                    </div>
                    <div class="row">
                        <label style="min-width:100px;">Callback %</label>
                        <input id="ps-ts-cb" type="number" step="0.05" value="${overrides.ts?.callbackPct ?? globalTsCb}" class="bb-input" style="flex:0.3;">
                    </div>
                </div>

                <!-- TP/SL SECTION (Algo) -->
                <div>
                    <div style="font-size:10px; color:var(--bb-green); font-weight:800; text-transform:uppercase; margin-bottom:8px;">Native TP/SL (Exchange-side)</div>
                    <div class="row"><label style="min-width:100px;">Profit (%)</label><input id="ps-tp" type="number" step="0.1" value="${overrides.tpPct || ''}" placeholder="%" class="bb-input" style="flex:0.3;"></div>
                    <div class="row"><label style="min-width:100px;">Loss (%)</label><input id="ps-sl" type="number" step="0.1" value="${overrides.slPct || ''}" placeholder="%" class="bb-input" style="flex:0.3;"></div>
                </div>
            </div>

            <div class="actions">
                <button id="ps-clear" class="trade-pill" style="margin-right:auto;">Reset to Global</button>
                <button id="ps-cancel" class="trade-pill">Cancel</button>
                <button id="ps-save" class="trade-pill primary">Save & Update</button>
            </div>
        </div>
    `;

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
    document.body.appendChild(backdrop);

    document.getElementById('ps-cancel').addEventListener('click', closeModal);

    document.getElementById('ps-clear').addEventListener('click', () => {
        localStorage.removeItem(STORAGE_PREFIX + instId);
        showToast(`Settings for ${instId} reset to global definitions`, 'info');
        closeModal();
        window.dispatchEvent(new CustomEvent('pos-settings-updated', { detail: { instId } }));
    });

    document.getElementById('ps-save').addEventListener('click', async () => {
        const dcaEnabled = document.getElementById('ps-dca-override').checked;
        const dcaMax = parseInt(document.getElementById('ps-dca-max').value);
        const dcaTrigger = parseFloat(document.getElementById('ps-dca-trigger').value);

        const tsEnabled = document.getElementById('ps-ts-override').checked;
        const tsAct = parseFloat(document.getElementById('ps-ts-act').value);
        const tsCb = parseFloat(document.getElementById('ps-ts-cb').value);

        const tp = parseFloat(document.getElementById('ps-tp').value) || 0;
        const sl = parseFloat(document.getElementById('ps-sl').value) || 0;

        const newOverrides = {
            dca: { enabled: dcaEnabled, maxSteps: dcaMax, triggerPct: dcaTrigger },
            ts: { enabled: tsEnabled, activationPct: tsAct, callbackPct: tsCb },
            tpPct: tp,
            slPct: sl
        };

        saveOverrides(instId, newOverrides);
        showToast(`Saved individual settings for ${instId}`, 'success');

        // Sync Native TP/SL if values provided
        if (tp > 0 || sl > 0) {
            showToast('Updating Native TP/SL orders...', 'info');
            try {
                await OkxClient.syncTpSl(instId, tp, sl);
                showToast('Native TP/SL updated with new levels', 'success');
            } catch (err) {
                showToast('Failed to sync Native TP/SL: ' + err.message, 'error');
            }
        }

        closeModal();
        window.dispatchEvent(new CustomEvent('pos-settings-updated', { detail: { instId } }));
    });

    return backdrop;
}

export function open(instId) {
    if (!instId) return;
    let b = document.getElementById(BACKDROP_ID);
    if (b) b.remove();
    b = buildModal(instId);
    b.classList.add('show');
    b.style.display = 'flex';
}

export function closeModal() {
    const b = document.getElementById(BACKDROP_ID);
    if (b) b.remove();
}

export function getPosOverride(instId) {
    return getOverrides(instId);
}

export function bulkApplyGlobal(instIds) {
    if (!instIds || !instIds.length) return;

    const dcaEnabled = localStorage.getItem('os_enable_smart_dca') === '1';
    const dcaMax = parseInt(localStorage.getItem('os_max_dca_counts') || '2');
    const dcaTrigger = parseFloat(localStorage.getItem('os_dca_trigger_pct') || '2.0');

    const tsEnabled = localStorage.getItem('os_enable_trailing_stop') === '1';
    const tsAct = parseFloat(localStorage.getItem('os_trailing_activation_pct') || '0.012');
    const tsCb = parseFloat(localStorage.getItem('os_trailing_callback_pct') || '0.001');

    const globalSettings = {
        dca: { enabled: dcaEnabled, maxSteps: dcaMax, triggerPct: dcaTrigger },
        ts: { enabled: tsEnabled, activationPct: tsAct, callbackPct: tsCb }
    };

    instIds.forEach(id => {
        const existing = getOverrides(id) || {};
        const updated = Object.assign({}, existing, globalSettings);
        saveOverrides(id, updated);
    });
}

export default { open, closeModal, getPosOverride, bulkApplyGlobal };
