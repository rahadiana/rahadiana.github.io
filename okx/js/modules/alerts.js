// Alerts, webhook, and persistence utilities split from websocket-example.js
// This file initializes alert UI controls, banner rendering, alert rules, and history persistence helpers.

// Alert UI references and hidden buffer
const compactAlertsToggle = document.getElementById('compactAlertsToggle');
const maxAlertBannersInput = document.getElementById('maxAlertBanners');
const showHiddenAlertsBtn = document.getElementById('showHiddenAlertsBtn');
var hiddenAlertBuffer = (window.__okxShim && typeof window.__okxShim.getHiddenAlertBuffer === 'function') ? window.__okxShim.getHiddenAlertBuffer() : (window._hiddenAlertBuffer || (window._hiddenAlertBuffer = []));

// load persisted compact preferences
try {
    const savedCompact = (typeof window.safeLocalStorageGet === 'function') ? window.safeLocalStorageGet('okx_compact_alerts', null) : localStorage.getItem('okx_compact_alerts');
    if (savedCompact !== null && compactAlertsToggle) compactAlertsToggle.checked = (String(savedCompact) === 'true');
    const savedMax = (typeof window.safeLocalStorageGet === 'function') ? window.safeLocalStorageGet('okx_max_alert_banners', null) : localStorage.getItem('okx_max_alert_banners');
    if (savedMax !== null && maxAlertBannersInput) maxAlertBannersInput.value = Number(savedMax) || 3;
} catch (e) { /* ignore */ }

// Wire compact alert controls
    try {
        if (compactAlertsToggle) compactAlertsToggle.addEventListener('change', (ev) => {
            try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_compact_alerts', ev.target.checked ? 'true' : 'false'); else localStorage.setItem('okx_compact_alerts', ev.target.checked ? 'true' : 'false'); } catch (e) { }
        });
        if (maxAlertBannersInput) maxAlertBannersInput.addEventListener('input', (ev) => {
            try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_max_alert_banners', String(parseInt(ev.target.value, 10) || 0)); else localStorage.setItem('okx_max_alert_banners', String(parseInt(ev.target.value, 10) || 0)); } catch (e) { }
        });
    if (showHiddenAlertsBtn) showHiddenAlertsBtn.addEventListener('click', () => {
        try {
            const modalBody = document.getElementById('hiddenAlertsModalBody');
            if (!modalBody) return;
            modalBody.innerHTML = '';
            if (!hiddenAlertBuffer || hiddenAlertBuffer.length === 0) {
                modalBody.innerHTML = '<div class="small text-muted">No hidden alerts</div>';
            } else {
                for (const a of hiddenAlertBuffer) {
                    const div = document.createElement('div');
                    div.className = 'mb-2 p-2 bg-dark text-light';
                    div.innerHTML = `<strong>${a.title}</strong><div style="font-size:0.9em;">${a.message}</div><div class="text-muted small">${new Date(a.ts).toLocaleString()}</div>`;
                    modalBody.appendChild(div);
                }
            }
            const bs = new bootstrap.Modal(document.getElementById('hiddenAlertsModal'));
            bs.show();
        } catch (e) { console.warn('showHiddenAlerts failed', e); }
    });
} catch (e) { console.warn('wiring compact alert controls failed', e); }

// --- Alerts: banner, sound, webhook ---
const ALERT_ENABLED_KEY = 'okx_calc_alerts_enabled';
let storedAlertEnabled = false;
try {
    storedAlertEnabled = (typeof window.safeLocalStorageGet === 'function' ? window.safeLocalStorageGet(ALERT_ENABLED_KEY, 'false') : localStorage.getItem(ALERT_ENABLED_KEY)) === 'true';
} catch (e) { storedAlertEnabled = false; }
const alertState = {
    enabled: storedAlertEnabled,
    sound: false,
    webhook: ''
};

function syncAlertNotesVisibility() {
    try {
        const col = document.getElementById('alertRulesNotesColumn');
        if (col) col.style.display = alertState.enabled ? '' : 'none';
    } catch (e) { console.warn('alert notes visibility sync failed', e); }
}
const lastAlertAt = {}; // per-coin throttle
// Whether to persist per-coin history to localStorage (default: DISABLED)
// Default to false unless explicitly set to 'true' in storage
var persistHistoryEnabled = ((typeof window.safeLocalStorageGet === 'function') ? window.safeLocalStorageGet('okx_calc_persist', null) : localStorage.getItem('okx_calc_persist')) === 'true';
function setPersistHistoryEnabled(val) {
    persistHistoryEnabled = !!val;
    window.persistHistoryEnabled = persistHistoryEnabled;
    try { if (window.__okxShim && typeof window.__okxShim.setPersistHistoryEnabled === 'function') window.__okxShim.setPersistHistoryEnabled(persistHistoryEnabled); } catch (e) { }
}

function clearPersistedHistories() {
    try {
        const keys = ['okx_calc_history', 'okx_calc_history_v1', 'okx_calc_persist_history', 'okx_calc_persist'];
        for (const k of keys) {
            try { localStorage.removeItem(k); } catch (e) { }
            try { sessionStorage.removeItem(k); } catch (e) { }
        }
        // If an IndexedDB-based history helper is present, ask it to clear as well
        try { if (window.idbHistory && typeof window.idbHistory.clearAllHistories === 'function') window.idbHistory.clearAllHistories(); } catch (e) { }
        // Also clear any in-memory fallback cache
        try { if (window._localStorageFallback) { for (const k of Object.keys(window._localStorageFallback)) { if (k && k.indexOf('okx_calc') === 0) delete window._localStorageFallback[k]; } } } catch (e) { }
    } catch (e) { /* ignore */ }
}

// create banner container
(function () {
    const b = document.createElement('div');
    b.id = 'alertBanner';
    b.style.position = 'fixed';
    b.style.left = '12px';
    b.style.top = '12px';
    b.style.zIndex = '3000';
    b.style.maxWidth = 'min(600px, 90vw)';
    b.style.pointerEvents = 'none'; // Don't block clicks on elements below
    document.body.appendChild(b);
})();

// simple sound element
const _alertAudio = document.createElement('audio');
_alertAudio.src = 'data:audio/ogg;base64,T2dnUwACAAAAAAAAAABVDwAAAAAA...'; // tiny placeholder (silent) - replace if needed
_alertAudio.preload = 'auto';
document.body.appendChild(_alertAudio);

function showAlertBanner(title, message, type = 'info', timeout = 1500) {
    if (!alertState.enabled) return;
    const container = document.getElementById('alertBanner');
    if (!container) return;
    // Respect compact alerts setting: if compact enabled and visible banners >= max, skip showing banner
    try {
        const compactEl = document.getElementById('compactAlertsToggle');
        const maxEl = document.getElementById('maxAlertBanners');
        const compactEnabled = compactEl ? !!compactEl.checked : false;
        const maxVisible = maxEl ? (parseInt(maxEl.value, 10) || 0) : 3;
        if (compactEnabled && (maxVisible <= 0 || container.children.length >= maxVisible)) {
            // store suppressed alert in buffer, still record in Alerts tab and optionally play sound/webhook
            try { 
                hiddenAlertBuffer.push({ title, message, type, ts: Date.now() }); 
                // Limit buffer size to prevent memory leak
                if (hiddenAlertBuffer.length > 200) {
                    hiddenAlertBuffer.shift();
                }
            } catch (e) { }
            try { if (alertState.sound) { _alertAudio.currentTime = 0; _alertAudio.play().catch(() => { }); } } catch (e) { }
            try { let coin = null; if (typeof title === 'string' && title.indexOf('—') !== -1) coin = title.split('—')[0].trim(); addAlertToTab(coin, message, type, Date.now()); } catch (e) { }
            return;
        }
    } catch (e) { /* ignore compact check errors and continue to show banner */ }
    const el = document.createElement('div');
    el.className = 'alert';
    el.style.marginBottom = '8px';
    el.style.cursor = 'pointer';
    el.style.opacity = '0.98';
    el.style.backdropFilter = 'blur(6px)';
    el.style.pointerEvents = 'auto'; // Make individual alerts clickable
    if (type === 'danger') el.classList.add('alert-danger');
    else if (type === 'warning') el.classList.add('alert-warning');
    else el.classList.add('alert-info');
    // include explicit close button to ensure users can dismiss banners
    el.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div style="flex:1;">
                        <strong>${title}</strong>
                        <div style="font-size:0.9em;margin-top:4px;">${message}</div>
                    </div>
                    <button type="button" aria-label="Close" title="Close" class="btn-close btn-close-white" style="margin-left:12px;" />
                </div>
            `;
    try {
        const closeBtn = el.querySelector('.btn-close');
        if (closeBtn) closeBtn.addEventListener('click', (ev) => { try { ev.stopPropagation(); el.remove(); } catch (e) { } });
    } catch (e) { }
    // also allow clicking the banner body to remove it (defensive)
    el.addEventListener('click', (ev) => { try { if (ev && ev.target && ev.target.classList && ev.target.classList.contains('btn-close')) return; el.remove(); } catch (e) { } });
    container.appendChild(el);
    if (alertState.sound) try { _alertAudio.currentTime = 0; _alertAudio.play().catch(() => { }); } catch (e) { }
    setTimeout(() => { try { if (el && el.parentElement) el.remove(); } catch (e) { } }, timeout);
    // Also append this alert into the Alerts tab list for persistence/visibility
    try {
        // derive coin if present in title (format: 'COIN — Alert')
        let coin = null;
        if (typeof title === 'string' && title.indexOf('—') !== -1) coin = title.split('—')[0].trim();
        addAlertToTab(coin, message, type, Date.now());
    } catch (e) { console.warn('addAlertToTab failed', e); }
}

async function sendAlertWebhook(coin, insights) {
    try {
        const url = (document.getElementById('alertWebhookUrl') && document.getElementById('alertWebhookUrl').value) || alertState.webhook || '';
        if (!url) return;
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coin, insights, ts: Date.now() }) });
    } catch (e) { console.warn('Webhook send failed', e); }
}

// wire UI controls (if present)
try {
    const eToggle = document.getElementById('enableAlertsToggle');
    const sToggle = document.getElementById('enableSoundToggle');
    const wInput = document.getElementById('alertWebhookUrl');
    const wTest = document.getElementById('alertWebhookTest');
    if (eToggle) {
        eToggle.checked = !!alertState.enabled;
        alertState.enabled = !!eToggle.checked;
        eToggle.addEventListener('change', (ev) => {
            alertState.enabled = !!ev.target.checked;
            try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet(ALERT_ENABLED_KEY, alertState.enabled ? 'true' : 'false'); else localStorage.setItem(ALERT_ENABLED_KEY, alertState.enabled ? 'true' : 'false'); } catch (e) { }
            syncAlertNotesVisibility();
        });
    }
    if (sToggle) { alertState.sound = !!sToggle.checked; sToggle.addEventListener('change', (ev) => alertState.sound = !!ev.target.checked); }
    if (wInput) { wInput.addEventListener('input', (ev) => alertState.webhook = ev.target.value); try { const saved = (typeof window.safeLocalStorageGet === 'function') ? window.safeLocalStorageGet('okx_calc_webhook', '') : localStorage.getItem('okx_calc_webhook'); if (saved) { wInput.value = saved; alertState.webhook = wInput.value; } } catch (e) { } }
    if (wTest) wTest.addEventListener('click', () => { showAlertBanner('Webhook test', 'Sending test payload...', 'info', 3000); sendAlertWebhook('TEST', { test: true }); try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_calc_webhook', (wInput && wInput.value) || ''); else localStorage.setItem('okx_calc_webhook', (wInput && wInput.value) || ''); } catch (e) { } });
    // Defensive: ensure toggles and labels accept pointer events (fixes cases where overlays/CSS block clicks)
    try {
        if (eToggle) {
            try { eToggle.style.pointerEvents = 'auto'; if (eToggle.parentElement) eToggle.parentElement.style.pointerEvents = 'auto'; } catch (e) { }
            const lbl = document.querySelector('label[for="enableAlertsToggle"]');
            if (lbl) {
                lbl.style.cursor = 'pointer';
                // ensure clicking the label toggles the checkbox in case implicit label->input isn't working
                lbl.addEventListener('click', (ev) => {
                    try {
                        ev.preventDefault();
                        ev.stopPropagation();
                        eToggle.checked = !eToggle.checked;
                        eToggle.dispatchEvent(new Event('change'));
                    } catch (e) { }
                });
            }
        }
        if (sToggle) { try { sToggle.style.pointerEvents = 'auto'; if (sToggle.parentElement) sToggle.parentElement.style.pointerEvents = 'auto'; } catch (e) { } }
    } catch (e) { console.warn('defensive toggle wiring failed', e); }
    // Alt persist toggle in alerts tab (mirror header control)
    try {
        const alt = document.getElementById('persistHistoryToggleAlt');
        const main = document.getElementById('persistHistoryToggle');
        if (alt) {
            // initialize state from saved preference
            alt.checked = persistHistoryEnabled;
            alt.addEventListener('change', (ev) => {
                try {
                    const enable = !!ev.target.checked;
                    if (!enable) {
                        const doClear = confirm('Disable Persist History? Press OK to also CLEAR stored histories, Cancel to keep stored histories.');
                        setPersistHistoryEnabled(false);
                        if (main) main.checked = false;
                        try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_calc_persist', 'false'); else localStorage.setItem('okx_calc_persist', 'false'); } catch (e) { }
                        if (doClear) clearPersistedHistories();
                    } else {
                        setPersistHistoryEnabled(true);
                        if (main) main.checked = true;
                        try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_calc_persist', 'true'); else localStorage.setItem('okx_calc_persist', 'true'); } catch (e) { }
                    }
                } catch (e) { /* ignore */ }
            });
        }
        if (main && alt) {
            // also sync main -> alt when main changes (with optional clear on disable)
            main.addEventListener('change', (ev) => {
                try {
                    const enable = !!ev.target.checked;
                    if (!enable) {
                        const doClear = confirm('Disable Persist History? Press OK to also CLEAR stored histories, Cancel to keep stored histories.');
                        setPersistHistoryEnabled(false);
                        alt.checked = false;
                        try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_calc_persist', 'false'); else localStorage.setItem('okx_calc_persist', 'false'); } catch (e) { }
                        if (doClear) clearPersistedHistories();
                    } else {
                        setPersistHistoryEnabled(true);
                        alt.checked = true;
                        try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_calc_persist', 'true'); else localStorage.setItem('okx_calc_persist', 'true'); } catch (e) { }
                    }
                } catch (e) { }
            });
        }
    } catch (e) { console.warn('alt persist wiring failed', e); }
} catch (e) { console.warn('alert UI wiring error', e); }
syncAlertNotesVisibility();

// Alerts storage and rendering in Alerts tab
const ALERTS_KEY = 'okx_calc_alerts_v1';
const ALERT_RULES_KEY = 'okx_calc_alert_rules_v1';

// Default alert rules seed (applied if no rules found in localStorage)
const DEFAULT_ALERT_RULES = [
    { id: 'vol_ratio_buy_high', name: 'Vol Ratio 2h > 200%', metric: 'vol_ratio_2h', op: '>', threshold: 200, severity: 'warning', enabled: true, message: 'Vol Ratio % (2h) > 200% (strong buy pressure)' },
    { id: 'vol_ratio_sell_low', name: 'Vol Ratio 2h < 30%', metric: 'vol_ratio_2h', op: '<', threshold: 30, severity: 'danger', enabled: true, message: 'Vol Ratio % (2h) < 30% (strong sell pressure)' },
    { id: 'freq_vs_avg_buy', name: 'Freq Buy vs Avg > 200%', metric: 'freq_vs_avg_buy_percent', op: '>', threshold: 200, severity: 'warning', enabled: true, message: 'Frequency buy >> historical average (>=200%)' }
];

// --- Price move alerts (drop/up) for multiple timeframes ---
// thresholds are percent-change thresholds (current vs past timeframe price). Adjust defaults as needed.
const PRICE_MOVE_TFS = [
    { key: 'price_move_1MENIT', drop: -0.5, up: 0.5 },
    { key: 'price_move_5MENIT', drop: -1.0, up: 1.0 },
    { key: 'price_move_10MENIT', drop: -1.5, up: 1.5 },
    { key: 'price_move_15MENIT', drop: -2.0, up: 2.0 },
    { key: 'price_move_20MENIT', drop: -2.0, up: 2.0 },
    { key: 'price_move_30MENIT', drop: -3.0, up: 3.0 },
    { key: 'price_move_1JAM', drop: -3.0, up: 3.0 },
    { key: 'price_move_2JAM', drop: -4.0, up: 4.0 },
    { key: 'price_move_24JAM', drop: -5.0, up: 5.0 }
];

for (const tf of PRICE_MOVE_TFS) {
    DEFAULT_ALERT_RULES.push({ id: `price_drop_${tf.key}`, name: `Price Drop ${tf.key}`, metric: tf.key, op: '<', threshold: tf.drop, severity: 'danger', enabled: true, message: `Price dropped more than ${Math.abs(tf.drop)}% vs ${tf.key}` });
    DEFAULT_ALERT_RULES.push({ id: `price_up_${tf.key}`, name: `Price Up ${tf.key}`, metric: tf.key, op: '>', threshold: tf.up, severity: 'warning', enabled: true, message: `Price raise more than ${tf.up}% vs ${tf.key}` });
}

function loadAlertRules() {
    try {
        const arr = (typeof window.safeLocalStorageGet === 'function') ? window.safeLocalStorageGet(ALERT_RULES_KEY, null) : JSON.parse(localStorage.getItem(ALERT_RULES_KEY) || 'null');
        if (!arr || !Array.isArray(arr) || arr.length === 0) {
            // seed defaults
            try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet(ALERT_RULES_KEY, JSON.stringify(DEFAULT_ALERT_RULES)); else localStorage.setItem(ALERT_RULES_KEY, JSON.stringify(DEFAULT_ALERT_RULES)); } catch (e) { }
            return DEFAULT_ALERT_RULES.slice();
        }
        return arr;
    } catch (e) { return DEFAULT_ALERT_RULES.slice(); }
}

function saveAlertRules(arr) {
    try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet(ALERT_RULES_KEY, JSON.stringify(arr || [])); else localStorage.setItem(ALERT_RULES_KEY, JSON.stringify(arr || [])); } catch (e) { console.warn('saveAlertRules failed', e); }
}

function renderAlertRules() {
    try {
        // Render rules into editor list if present, otherwise fallback to alertsListContainer
        const editor = document.getElementById('alertRulesEditorList');
        const container = editor || document.getElementById('alertsListContainer');
        if (!container) return;
        const rules = loadAlertRules();
        let html = '<h6 class="small text-muted mb-1">Alert Rules</h6>';
        if (!rules || rules.length === 0) html += '<div class="small text-muted">No alert rules configured</div>';
        else {
            html += '<div class="list-group list-group-flush small">';
            for (const r of rules) {
                const badge = r.severity === 'danger' ? '<span class="badge bg-danger me-1">!</span>' : '<span class="badge bg-warning text-dark me-1">!</span>';
                const enabled = r.enabled ? '' : ' <span class="text-muted">(disabled)</span>';
                const coin = r.coin ? `<div class="text-muted small">Coin: ${r.coin}</div>` : '';
                html += `<div class="list-group-item bg-dark text-light d-flex justify-content-between align-items-start" data-rule-id="${r.id}">`;
                html += `<div><div>${badge}<strong>${r.name}</strong>${enabled}</div><div class="text-muted small">${r.message || ''} — <em>${r.metric} ${r.op} ${r.threshold}</em></div>${coin}</div>`;
                html += `<div class="btn-group btn-group-sm" role="group"><button class="btn btn-outline-secondary btn-edit-rule" data-id="${r.id}">Edit</button><button class="btn btn-outline-danger btn-delete-rule" data-id="${r.id}">Delete</button></div>`;
                html += `</div>`;
            }
            html += '</div>';
        }
        if (editor) editor.innerHTML = html; else {
            // fallback panel in left column
            let panel = document.getElementById('alertRulesPanel');
            if (!panel) { panel = document.createElement('div'); panel.id = 'alertRulesPanel'; panel.className = 'mt-3'; container.appendChild(panel); }
            panel.innerHTML = html;
        }
        // Wire edit/delete buttons when rendered into editor
        if (editor) {
            try {
                const edits = editor.querySelectorAll('.btn-edit-rule');
                edits.forEach(b => b.addEventListener('click', (ev) => { const id = ev.target.dataset.id; openRuleInForm(id); }));
                const dels = editor.querySelectorAll('.btn-delete-rule');
                dels.forEach(b => b.addEventListener('click', (ev) => { const id = ev.target.dataset.id; if (confirm('Delete rule?')) deleteRule(id); }));
            } catch (e) { console.warn('wiring rule buttons failed', e); }
        }
    } catch (e) { console.warn('renderAlertRules failed', e); }
}

// in-memory cooldown per coin+rule to prevent spam (ms)
const ALERT_RULE_COOLDOWN_MS = 60 * 1000; // 60s per rule
const lastAlertRuleAt = {};

// Funding squeeze specific cooldown (15 minutes)
const FUNDING_SQUEEZE_COOLDOWN_MS = 15 * 60 * 1000;
const lastFundingSqueezeAt = {};

function evaluateAlertRulesForData(data) {
    try {
        if (!data || !data.coin) return;
        const rules = loadAlertRules();
        if (!rules || rules.length === 0) return;
        const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
        const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : metrics;
        for (const r of rules) {
            try {
                if (!r.enabled) continue;
                // fetch metric value: prefer analytics fields
                let val = null;
                switch (r.metric) {
                    case 'vol_ratio_2h':
                        val = (metrics && typeof metrics.volRatioBuySell_percent !== 'undefined' && metrics.volRatioBuySell_percent !== null)
                            ? metrics.volRatioBuySell_percent
                            : (a.volRatioBuySell_percent !== undefined ? a.volRatioBuySell_percent : ((getNumeric(data, 'count_VOL_minute_120_buy') || 0) / Math.max((getNumeric(data, 'count_VOL_minute_120_sell') || 0), 1) * 100));
                        break;
                    case 'freq_vs_avg_buy_percent':
                        val = (metrics && typeof metrics.freqBuy_vs_avg_percent !== 'undefined' && metrics.freqBuy_vs_avg_percent !== null)
                            ? metrics.freqBuy_vs_avg_percent
                            : (a.freqBuy_vs_avg_percent !== undefined ? a.freqBuy_vs_avg_percent : ((getNumeric(data, 'count_FREQ_minute_120_buy') || a.freqBuy2h || 0) / Math.max((getNumeric(data, 'avg_FREQCOIN_buy_2JAM') || a.avgFreqBuy2h || 1), 1) * 100));
                        break;
                    case 'freq_ratio_2h':
                        const fbuy = (metrics && typeof metrics.freqBuy2h !== 'undefined') ? Number(metrics.freqBuy2h) : (a.freqBuy2h !== undefined ? Number(a.freqBuy2h) : null);
                        const fsell = (metrics && typeof metrics.freqSell2h !== 'undefined') ? Number(metrics.freqSell2h) : (a.freqSell2h !== undefined ? Number(a.freqSell2h) : null);
                        val = (fbuy !== null && fsell !== null) ? ((fbuy / Math.max(fsell, 1)) * 100) : null;
                        break;
                    default:
                        // try direct analytics field or unified metrics
                            if (metrics && typeof metrics[r.metric] !== 'undefined') val = metrics[r.metric];
                            else if (a && typeof a[r.metric] !== 'undefined') val = a[r.metric];
                            else if (data && typeof data[r.metric] !== 'undefined') val = data[r.metric];
                            // Special handling: if rule targets price_move_* then compute percent change vs current price
                            try {
                                if (typeof r.metric === 'string' && /^price_move_/i.test(r.metric)) {
                                    const pastRaw = (data && (data[r.metric] !== undefined)) ? data[r.metric] : null;
                                    let past = (pastRaw !== null && pastRaw !== undefined) ? Number(pastRaw) : NaN;
                                    // for 24h timeframe prefer `open` if available
                                    if (/24\s*JAM/i.test(r.metric) || /24JAM/i.test(r.metric) || /24jam/i.test(r.metric)) {
                                        const openVal = (data && data.open !== undefined && data.open !== null) ? Number(data.open) : NaN;
                                        if (Number.isFinite(openVal) && openVal !== 0) past = openVal;
                                    }
                                    const cur = (data && data.last !== undefined && data.last !== null) ? Number(data.last) : NaN;
                                    if (Number.isFinite(past) && past !== 0 && Number.isFinite(cur)) {
                                        val = ((cur - past) / past) * 100; // percent change
                                    } else {
                                        // couldn't compute percent, leave val as raw past (so rule likely won't trigger)
                                        val = val;
                                    }
                                }
                            } catch (e) { /* ignore special handling errors */ }
                }
                if (val === null || val === undefined) continue;
                let triggered = false;
                if (r.op === '>' && Number(val) > Number(r.threshold)) triggered = true;
                if (r.op === '<' && Number(val) < Number(r.threshold)) triggered = true;
                if (!triggered) continue;
                const key = `${data.coin}::${r.id}`;
                const now = Date.now();
                if (lastAlertRuleAt[key] && (now - lastAlertRuleAt[key] < ALERT_RULE_COOLDOWN_MS)) continue; // cooldown
                lastAlertRuleAt[key] = now;
                // trigger alert
                const title = `${data.coin} — Alert: ${r.name}`;
                // Use centralized vol-ratio formatter when available for clearer messages
                let displayVal;
                try {
                    if (typeof window.formatVolRatio === 'function' && /vol_ratio/i.test(String(r.metric))) {
                        displayVal = window.formatVolRatio(val);
                    } else {
                        displayVal = (Number.isFinite(Number(val))) ? (Math.round(Number(val) * 100) / 100) : String(val);
                    }
                } catch (e) { displayVal = (Number.isFinite(Number(val))) ? (Math.round(Number(val) * 100) / 100) : String(val); }
                const msg = `${r.message || ''} (value: ${displayVal})`;
                showAlertBanner(title, msg, r.severity === 'danger' ? 'danger' : 'warning', 8000);
                addAlertToTab(data.coin, msg, r.severity === 'danger' ? 'danger' : 'warning', now);
                // optional webhook
                try { sendAlertWebhook(data.coin, { rule: r, value: val, ts: now }); } catch (e) { }
            } catch (e) { console.warn('evaluate rule failed', e); }
        }
        // After evaluating configured rules, run compact funding squeeze detector
        try { evaluateFundingSqueezeForData(data); } catch (e) { /* non-fatal */ }
    } catch (e) { console.warn('evaluateAlertRulesForData failed', e); }
}

/**
 * Detect funding squeeze conditions and trigger a single high-priority alert.
 * Non-blocking webhook and banner; uses separate cooldown to avoid flooding.
 */
function evaluateFundingSqueezeForData(data) {
    try {
        if (!data || !data.coin) return;
        const coin = data.coin;
        const now = Date.now();
        const last = lastFundingSqueezeAt[coin] || 0;
        if (now - last < FUNDING_SQUEEZE_COOLDOWN_MS) return; // still cooling down

        const funding = getNumeric(data, 'funding_settFundingRate', 'funding_settfundingrate', 'funding_Rate', 'funding_rate', 'funding_interestRate') || 0;
        const premium = getNumeric(data, 'funding_premium', 'fundingpremium') || 0;

        // compute 15m percent move: prefer past price field, fallback to provided percent if present
        let price15mPct = null;
        try {
            const past = getNumeric(data, 'price_move_15MENIT');
            const cur = getNumeric(data, 'last');
            if (past && cur && Number.isFinite(past) && past !== 0) price15mPct = ((cur - past) / past) * 100;
            else if (data.price_move_15MENIT !== undefined && data.price_move_15MENIT !== null) price15mPct = Number(data.price_move_15MENIT);
        } catch (e) { price15mPct = null; }

        // Trigger conditions: funding & premium extreme and price moving against the funding payer
        if (Math.abs(funding) >= 0.0007 && Math.abs(premium) >= 0.0005 && price15mPct !== null && (price15mPct * Math.sign(funding) < 0)) {
            // mark last trigger
            lastFundingSqueezeAt[coin] = now;
            const fundingPct = (funding * 100).toFixed(3) + '%';
            const premiumPct = (premium * 100).toFixed(3) + '%';
            const p15 = Number.isFinite(price15mPct) ? `${price15mPct >= 0 ? '+' : ''}${price15mPct.toFixed(2)}%` : '-';
            const title = `⚠️ FUNDING SQUEEZE WARNING`;
            const msg = `${coin}\nFunding: ${fundingPct} • Premium: ${premiumPct}\nPrice 15m: ${p15}\nPossible squeeze — trade with caution.`;
            try { showAlertBanner(title, msg, 'warning', 15000); } catch (e) { }
            try { addAlertToTab(coin, msg, 'warning', now); } catch (e) { }
            // send webhook non-blocking
            try { if (typeof sendAlertWebhook === 'function') sendAlertWebhook(coin, { type: 'FUNDING_SQUEEZE', coin, funding, premium, price_15m: price15mPct, ts: now }); } catch (e) { }
        }
    } catch (e) { console.warn('evaluateFundingSqueezeForData failed', e); }
}

function loadAlertsFromStore() {
    try {
        const arr = (typeof window.safeLocalStorageGet === 'function') ? window.safeLocalStorageGet(ALERTS_KEY, []) : JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
}

function saveAlertsToStore(arr) {
    try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet(ALERTS_KEY, JSON.stringify(arr || [])); else localStorage.setItem(ALERTS_KEY, JSON.stringify(arr || [])); } catch (e) { }
}

function formatTs(ts) {
    try { const d = new Date(ts); return d.toLocaleString(); } catch (e) { return String(ts); }
}

function renderAlertsList() {
    try {
        const container = document.getElementById('alertsList');
        if (!container) return;
        const arr = loadAlertsFromStore();
        container.innerHTML = '';
        for (let i = arr.length - 1; i >= 0; i--) {
            const it = arr[i];
            const el = document.createElement('div');
            el.className = 'list-group-item bg-dark text-light small';
            el.style.border = '1px solid rgba(255,255,255,0.04)';
            el.innerHTML = `<div class="d-flex w-100 justify-content-between"><strong>${it.coin ? it.coin + ' — ' : ' '}${it.type && it.type === 'warning' ? '<span class="badge bg-warning text-dark">Alert</span>' : ''}${it.type && it.type === 'danger' ? '<span class="badge bg-danger">Alert</span>' : ''}</strong><small class="text-muted">${formatTs(it.ts)}</small></div><div style="font-size:0.9em;margin-top:4px;color:#cbd5e1;">${it.message}</div>`;
            container.appendChild(el);
        }
    } catch (e) { console.warn('renderAlertsList error', e); }
}

// Clear alerts & wire Clear button
function clearAlerts() {
    try {
        saveAlertsToStore([]);
        renderAlertsList();
        showAlertBanner('Alerts cleared', 'All stored alerts were removed', 'info', 3000);
    } catch (e) { console.warn('clearAlerts failed', e); }
}

try {
    const clearBtn = document.getElementById('clearAlertsBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
        if (!confirm('Clear all stored alerts?')) return;
        clearAlerts();
    });
} catch (e) { console.warn('clearAlerts button wiring failed', e); }

function addAlertToTab(coin, message, type = 'info', ts = Date.now()) {
    try {
        const arr = loadAlertsFromStore();
        arr.push({ coin: coin || null, message: String(message || ''), type: type || 'info', ts: ts || Date.now() });
        // keep recent N alerts
        const MAX_ALERTS = 300;
        if (arr.length > MAX_ALERTS) arr.splice(0, arr.length - MAX_ALERTS);
        saveAlertsToStore(arr);
        renderAlertsList();
    } catch (e) { console.warn('addAlertToTab failed', e); }
}

// --- Rule editor helpers ---
function openRuleInForm(id) {
    try {
        const rules = loadAlertRules();
        const r = rules.find(x => x.id === id);
        if (!r) return;
        document.getElementById('ruleId').value = r.id || '';
        document.getElementById('ruleCoin').value = r.coin || '';
        document.getElementById('ruleMetric').value = r.metric || 'percent_change';
        document.getElementById('ruleOp').value = r.op || '>';
        document.getElementById('ruleThreshold').value = r.threshold !== undefined ? r.threshold : '';
        document.getElementById('ruleSeverity').value = r.severity || 'warning';
        document.getElementById('ruleName').value = r.name || '';
        document.getElementById('ruleMessage').value = r.message || '';
        // focus save
        const saveBtn = document.getElementById('ruleSaveBtn'); if (saveBtn) saveBtn.textContent = 'Update Rule';
    } catch (e) { console.warn('openRuleInForm failed', e); }
}

function clearRuleForm() {
    try {
        ['ruleId','ruleCoin','ruleMetric','ruleOp','ruleThreshold','ruleSeverity','ruleName','ruleMessage'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const saveBtn = document.getElementById('ruleSaveBtn'); if (saveBtn) saveBtn.textContent = 'Save Rule';
    } catch (e) { }
}

function deleteRule(id) {
    try {
        let rules = loadAlertRules();
        rules = rules.filter(r => r.id !== id);
        saveAlertRules(rules);
        renderAlertRules();
        showAlertBanner('Rule deleted', `Rule ${id} removed`, 'info', 2000);
    } catch (e) { console.warn('deleteRule failed', e); }
}

function saveRuleFromForm() {
    try {
        const idEl = document.getElementById('ruleId');
        const id = idEl && idEl.value ? idEl.value : null;
        const rule = {
            id: id || ('r_' + Date.now()),
            coin: (document.getElementById('ruleCoin') && document.getElementById('ruleCoin').value) || null,
            metric: document.getElementById('ruleMetric').value,
            op: document.getElementById('ruleOp').value,
            threshold: Number(document.getElementById('ruleThreshold').value) || 0,
            severity: document.getElementById('ruleSeverity').value || 'warning',
            enabled: true,
            name: document.getElementById('ruleName').value || ('Rule ' + Date.now()),
            message: document.getElementById('ruleMessage').value || ''
        };
        const rules = loadAlertRules();
        const existingIdx = rules.findIndex(r => r.id === rule.id);
        if (existingIdx >= 0) rules[existingIdx] = rule; else rules.push(rule);
        saveAlertRules(rules);
        renderAlertRules();
        clearRuleForm();
        showAlertBanner('Rule saved', `${rule.name}`, 'info', 2000);
    } catch (e) { console.warn('saveRuleFromForm failed', e); }
}

// Wire editor form on load
try {
    const saveBtn = document.getElementById('ruleSaveBtn');
    const cancelBtn = document.getElementById('ruleCancelBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => { saveRuleFromForm(); });
    if (cancelBtn) cancelBtn.addEventListener('click', () => { clearRuleForm(); });
} catch (e) { /* ignore if elements not present yet */ }

// render stored alerts and rules on load
try { renderAlertsList(); } catch (e) { }
try { if (typeof renderAlertRules === 'function') renderAlertRules(); } catch (e) { }

// --- Persistence (LocalStorage) helpers ---
const PERSIST_KEY = 'okx_calc_history_v1';
const MAX_HISTORY = 300; // keep up to this many points per coin (reduced for quota)
const MAX_COINS_STORED = 100; // max coins to keep in storage
const _lastSaveAt = {};

// In-memory cache to avoid repeated JSON parsing
let _storeCache = null;
let _storeCacheLoaded = false;
let _pendingSave = false;

function getStoreCache() {
    if (!_storeCacheLoaded) {
        // optimistic non-blocking load: prefer IndexedDB async load, but return empty cache immediately
        _storeCacheLoaded = true;
        _storeCache = {};
        try {
            if (window.idbHistory && typeof window.idbHistory.loadAllHistories === 'function') {
                window.idbHistory.loadAllHistories().then(store => {
                    try { _storeCache = store || {}; window._preloadedHistory = Object.assign({}, window._preloadedHistory || {}, _storeCache); } catch (e) { _storeCache = _storeCache || {}; }
                }).catch(e => { _storeCache = _storeCache || {}; });
            } else {
                try { _storeCache = (typeof window.safeLocalStorageGet === 'function') ? window.safeLocalStorageGet(PERSIST_KEY, {}) : JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}'); } catch (e) { _storeCache = {}; }
            }
        } catch (e) { _storeCache = {}; }
    }
    return _storeCache || {};
}

// Prune in-memory cache periodically to prevent memory leak
const MAX_CACHE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB limit for in-memory cache
let _lastCachePrune = 0;

function pruneCacheIfNeeded() {
    const now = Date.now();
    // Only check every 2 minutes
    if (now - _lastCachePrune < 120000) return;
    _lastCachePrune = now;
    
    try {
        const cacheStr = JSON.stringify(_storeCache || {});
        const cacheSize = cacheStr.length * 2; // Approximate bytes (UTF-16)
        
        if (cacheSize > MAX_CACHE_SIZE_BYTES) {
            console.warn('[Storage] Cache size', Math.round(cacheSize / 1024 / 1024), 'MB exceeded limit, pruning...');
            _storeCache = pruneStorageForQuota(_storeCache, 2);
        }
    } catch (e) {
        console.warn('[Storage] Cache prune check failed', e);
    }
}

// Start periodic cache pruning
setInterval(pruneCacheIfNeeded, 5 * 60 * 1000); // Every 5 minutes

function loadPersistedHistory(coin) {
    try {
        const store = getStoreCache();
        const arr = store && store[coin] ? store[coin] : [];
        return Array.isArray(arr) ? arr.slice(-MAX_HISTORY) : [];
    } catch (e) { console.warn('loadPersistedHistory error', e); return []; }
}

function pruneStorageForQuota(store, aggressiveLevel = 1) {
    // aggressiveLevel: 1 = light prune, 2 = medium, 3 = heavy
    const coins = Object.keys(store);
    const keepPerCoin = Math.max(50, Math.floor(MAX_HISTORY / aggressiveLevel));
    
    // Sort coins by last update (newest first) based on last entry timestamp
    const coinsByRecency = coins.map(c => {
        const arr = store[c];
        const lastTs = Array.isArray(arr) && arr.length > 0 ? (arr[arr.length - 1].ts || 0) : 0;
        return { coin: c, lastTs };
    }).sort((a, b) => b.lastTs - a.lastTs);
    
    // Keep only top N coins
    const maxCoins = Math.max(20, Math.floor(MAX_COINS_STORED / aggressiveLevel));
    const coinsToKeep = coinsByRecency.slice(0, maxCoins).map(x => x.coin);
    
    const prunedStore = {};
    for (const coin of coinsToKeep) {
        prunedStore[coin] = (store[coin] || []).slice(-keepPerCoin);
    }
    return prunedStore;
}

function savePersistedHistory(coin, arr) {
    if (!persistHistoryEnabled) return;
    try {
        const now = Date.now();
        if (_lastSaveAt[coin] && (now - _lastSaveAt[coin]) < 5000) return; // throttle 5s
        _lastSaveAt[coin] = now;
        
        // Update in-memory cache only (fast, non-blocking)
        const store = getStoreCache();
        store[coin] = arr.slice(-MAX_HISTORY);
        _storeCache = store;
        // Also persist asynchronously to IndexedDB when available
        try {
            if (window.idbHistory && typeof window.idbHistory.saveCoinHistory === 'function') {
                // fire-and-forget
                window.idbHistory.saveCoinHistory(coin, _storeCache[coin]).catch(err => console.warn('idb save failed', err));
            }
        } catch (e) { /* ignore */ }
        
        // Schedule async save to IndexedDB (non-blocking)
        try {
            if (window.idbHistory && typeof window.idbHistory.saveCoinHistory === 'function') {
                // fire-and-forget per-coin save
                try { window.idbHistory.saveCoinHistory(coin, _storeCache[coin]).catch(err => console.warn('idb save failed', err)); } catch (e) { }
            } else {
                // fallback to localStorage if IndexedDB not available
                if (!_pendingSave) {
                    _pendingSave = true;
                    const saveToStorage = () => {
                        _pendingSave = false;
                        try {
                            if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet(PERSIST_KEY, JSON.stringify(_storeCache)); else localStorage.setItem(PERSIST_KEY, JSON.stringify(_storeCache));
                        } catch (quotaErr) {
                            if (quotaErr.name === 'QuotaExceededError') {
                                console.warn('Storage quota exceeded, pruning history...');
                                for (let level = 1; level <= 3; level++) {
                                    try {
                                        _storeCache = pruneStorageForQuota(_storeCache, level);
                                        if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet(PERSIST_KEY, JSON.stringify(_storeCache)); else localStorage.setItem(PERSIST_KEY, JSON.stringify(_storeCache));
                                        console.log(`Storage pruned at level ${level}`);
                                        return;
                                    } catch (e2) {
                                        if (level === 3) {
                                            console.warn('Heavy prune failed, clearing all history');
                                            localStorage.removeItem(PERSIST_KEY);
                                            _storeCache = {};
                                        }
                                    }
                                }
                            }
                        }
                    };
                    // Use requestIdleCallback if available, else setTimeout
                    if (typeof requestIdleCallback === 'function') {
                        requestIdleCallback(saveToStorage, { timeout: 2000 });
                    } else {
                        setTimeout(saveToStorage, 100);
                    }
                }
            }
        } catch (e) { /* ignore */ }
    } catch (e) { console.warn('savePersistedHistory error', e); }
}

// Wire the UI toggle
try {
    const t = document.getElementById('persistHistoryToggle');
    if (t) {
        // Ensure toggle reflects saved preference
        t.checked = persistHistoryEnabled;
        // Defensive: make sure the toggle and its parent accept pointer events
        try { t.style.pointerEvents = 'auto'; if (t.parentElement) t.parentElement.style.pointerEvents = 'auto'; } catch (e) { }
        // Wire change handler (ask before clearing persisted data when disabling)
        t.addEventListener('change', (ev) => {
            try {
                const enable = !!ev.target.checked;
                if (!enable) {
                    const doClear = confirm('Disable Persist History? Press OK to also CLEAR stored histories, Cancel to keep stored histories.');
                    setPersistHistoryEnabled(false);
                    try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_calc_persist', 'false'); else localStorage.setItem('okx_calc_persist', 'false'); } catch (e) { }
                    // mirror to alt if present
                    try { const alt = document.getElementById('persistHistoryToggleAlt'); if (alt) alt.checked = false; } catch (e) { }
                    if (doClear) clearPersistedHistories();
                } else {
                    setPersistHistoryEnabled(true);
                    try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_calc_persist', 'true'); else localStorage.setItem('okx_calc_persist', 'true'); } catch (e) { }
                    try { const alt = document.getElementById('persistHistoryToggleAlt'); if (alt) alt.checked = true; } catch (e) { }
                }
            } catch (e) { /* ignore */ }
        });
        // Also make the label clickable (some layouts may overlay the checkbox)
        try {
            const lbl = document.querySelector('label[for="persistHistoryToggle"]');
            if (lbl) {
                lbl.style.cursor = 'pointer';
                lbl.addEventListener('click', (ev) => {
                    try { t.checked = !t.checked; t.dispatchEvent(new Event('change')); } catch (e) { }
                });
            }
        } catch (e) { console.warn('persist label wiring failed', e); }
    }
} catch (e) { console.warn('persist toggle wiring failed', e); }

// Wire clear storage button
try {
    const clearBtn = document.getElementById('clearStorageBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
                try {
                    if (window.idbHistory && typeof window.idbHistory.clearAllHistories === 'function') {
                        window.idbHistory.clearAllHistories().then(() => {
                            window._preloadedHistory = {};
                            _storeCache = {};
                            _storeCacheLoaded = true;
                            console.log('History storage cleared (IndexedDB)');
                            alert('✅ History storage cleared! Data akan mulai fresh.');
                        }).catch(err => { console.warn('Clear IDB failed', err); alert('Clear failed'); });
                    } else {
                        localStorage.removeItem(PERSIST_KEY);
                        window._preloadedHistory = {};
                        _storeCache = {};
                        _storeCacheLoaded = true;
                        console.log('History storage cleared');
                        alert('✅ History storage cleared! Data akan mulai fresh.');
                    }
                } catch (e) { console.warn('Clear storage failed', e); }
        });
    }
} catch (e) { console.warn('wiring clear storage failed', e); }

// expose selected helpers globally
window.showAlertBanner = showAlertBanner;
window.sendAlertWebhook = sendAlertWebhook;
window.addAlertToTab = addAlertToTab;
window.renderAlertsList = renderAlertsList;
window.renderAlertRules = renderAlertRules;
window.evaluateAlertRulesForData = evaluateAlertRulesForData;
window.loadPersistedHistory = loadPersistedHistory;
window.savePersistedHistory = savePersistedHistory;
window.hiddenAlertBuffer = hiddenAlertBuffer;
window.persistHistoryEnabled = persistHistoryEnabled;
window.MAX_HISTORY = MAX_HISTORY;
window.lastAlertAt = lastAlertAt;
try { if (window.__okxShim && typeof window.__okxShim.setAlertHelpers === 'function') {
    window.__okxShim.setAlertHelpers({ showAlertBanner, sendAlertWebhook, addAlertToTab, renderAlertsList, renderAlertRules, evaluateAlertRulesForData, loadPersistedHistory, savePersistedHistory, hiddenAlertBuffer, persistHistoryEnabled, MAX_HISTORY, lastAlertAt });
} } catch (e) { }

// Cleanup Bootstrap popovers on unload to prevent memory leaks
try {
    window.addEventListener('beforeunload', () => {
        try {
            if (window.bootstrap && window.bootstrap.Popover) {
                document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
                    try { const p = bootstrap.Popover.getInstance(el); if (p) p.dispose(); } catch (e) { }
                });
            }
        } catch (e) { /* ignore */ }
    });
} catch (e) { /* ignore */ }
