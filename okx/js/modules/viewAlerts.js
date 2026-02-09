// Enhanced Alert System
// - render(container): builds UI
// - init(): start rule evaluation loop
// - stop(): stop loop
// Rules stored in localStorage key 'bb_alert_rules'
const ALERTS_KEY = 'bb_alert_rules';
const HISTORY_KEY = 'bb_alert_history';
let rules = [];
let history = [];
let evalInterval = null;

function ensureToastContainer() {
  if (!document.getElementById('alert-toast-container')) {
    const tc = document.createElement('div');
    tc.id = 'alert-toast-container';
    tc.style.position = 'fixed';
    tc.style.right = '12px';
    tc.style.top = '12px';
    tc.style.zIndex = 9999;
    document.body.appendChild(tc);
  }
}

export function render(container) {
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'panel';

  root.innerHTML = `
    <h3>Alerts</h3>
    <div id="alerts-controls">
      <button id="alerts-add">Add Rule</button>
      <button id="alerts-import">Import</button>
      <button id="alerts-export">Export</button>
    </div>
    <div style="display:flex; gap:12px; margin-top:8px;">
      <div style="flex:1"><div id="alerts-list"></div></div>
      <div style="width:360px"><h4>History</h4><div id="alerts-history" style="max-height:400px; overflow:auto; background:#0b1220; padding:8px; border-radius:6px"></div></div>
    </div>
    <div id="alerts-editor" style="display:none; margin-top:10px;"></div>
  `;

  container.appendChild(root);

  document.getElementById('alerts-add').addEventListener('click', () => openEditor());
  document.getElementById('alerts-import').addEventListener('click', importRules);
  document.getElementById('alerts-export').addEventListener('click', exportRules);

  ensureToastContainer();
  loadRules();
  loadHistory();
  renderList();
  renderHistory();
}

function renderList() {
  const list = document.getElementById('alerts-list');
  list.innerHTML = '';
  if (!rules || rules.length === 0) {
    list.innerHTML = '<i>No rules defined.</i>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
    <thead><tr><th>Name</th><th>Conditions</th><th>Logic</th><th>Channels</th><th>Actions</th></tr></thead>
  `;
  const tbody = document.createElement('tbody');
  for (const r of rules) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.name)}</td>
      <td>${(r.conditions || []).map(c=>`${c.metric} ${c.operator} ${c.threshold}`).join('<br>')}</td>
      <td>${r.logical || 'AND'}</td>
      <td>${(r.channels || []).join(', ')}</td>
      <td><button data-id="${r.id}" class="edit">Edit</button> <button data-id="${r.id}" class="del">Del</button></td>
    `;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  list.appendChild(table);

  for (const btn of list.querySelectorAll('button.edit')) {
    btn.addEventListener('click', e => openEditor(btn.dataset.id));
  }
  for (const btn of list.querySelectorAll('button.del')) {
    btn.addEventListener('click', e => { removeRule(btn.dataset.id); });
  }
}

function openEditor(id = null) {
  const ed = document.getElementById('alerts-editor');
  ed.style.display = 'block';
  const r = id ? rules.find(x => x.id === id) : { id: genId(), name: '', conditions: [{ metric: 'price', operator: '>', threshold: '' }], logical: 'AND', channels: ['browser'], webhook: '' };
  ed.innerHTML = `
    <div>
      <label>Name: <input id="alert-name" value="${escapeHtml(r.name)}"></label>
    </div>
    <div id="conditions-root" style="margin-top:8px;">
      <label>Conditions:</label>
      <div id="conditions-list"></div>
      <button id="cond-add">Add Condition</button>
    </div>
    <div style="margin-top:6px;">
      <label>Logic: <select id="alert-logical"><option value="AND">AND</option><option value="OR">OR</option></select></label>
    </div>
    <div style="margin-top:6px;">
      <label>Channels: <input id="alert-channels" value="${(r.channels||[]).join(',')}"> (comma separated: browser,webhook,discord,telegram)</label>
    </div>
    <div style="margin-top:6px;">
      <label>Webhook URL: <input id="alert-webhook" value="${r.webhook || ''}" style="width:80%"></label>
    </div>
    <div style="margin-top:6px;"><button id="alert-save">Save</button> <button id="alert-cancel">Cancel</button></div>
  `;

  function renderConditions() {
    const cl = document.getElementById('conditions-list');
    cl.innerHTML = '';
    (r.conditions || []).forEach((c, idx) => {
      const row = document.createElement('div');
      row.style.display = 'flex'; row.style.gap = '6px'; row.style.marginTop = '6px';
      row.innerHTML = `
        <select data-idx="${idx}" class="cond-metric"><option value="price">price</option><option value="volume">volume</option><option value="masterSignal">masterSignalScore</option><option value="hiddenLiquidity">hiddenLiquidity (score)</option></select>
        <select data-idx="${idx}" class="cond-op"><option value=">">&gt;</option><option value="<">&lt;</option><option value=">=">&ge;</option><option value="<=">&le;</option><option value="==">==</option></select>
        <input data-idx="${idx}" class="cond-th" value="${c.threshold}" placeholder="threshold">
        <button data-idx="${idx}" class="cond-del">Del</button>
      `;
      cl.appendChild(row);
    });
    for (const m of cl.querySelectorAll('.cond-metric')) m.value = r.conditions[m.dataset.idx].metric;
    for (const o of cl.querySelectorAll('.cond-op')) o.value = r.conditions[o.dataset.idx].operator;
    for (const t of cl.querySelectorAll('.cond-th')) t.value = r.conditions[t.dataset.idx].threshold;
    for (const d of cl.querySelectorAll('.cond-del')) d.addEventListener('click', e => { r.conditions.splice(parseInt(d.dataset.idx),1); renderConditions(); });
  }

  document.getElementById('cond-add').addEventListener('click', () => { r.conditions.push({ metric: 'price', operator: '>', threshold: '' }); renderConditions(); });
  renderConditions();

  document.getElementById('alert-logical').value = r.logical || 'AND';

  document.getElementById('alert-save').addEventListener('click', () => {
    // read conditions
    const cl = document.getElementById('conditions-list');
    const newConds = [];
    for (const row of cl.children) {
      const idx = row.querySelector('.cond-metric').dataset.idx;
      const metric = row.querySelector('.cond-metric').value;
      const operator = row.querySelector('.cond-op').value;
      const threshold = parseFloat(row.querySelector('.cond-th').value) || 0;
      newConds.push({ metric, operator, threshold });
    }
    const updated = {
      id: r.id,
      name: document.getElementById('alert-name').value || 'unnamed',
      conditions: newConds,
      logical: document.getElementById('alert-logical').value || 'AND',
      channels: document.getElementById('alert-channels').value.split(',').map(s=>s.trim()).filter(Boolean),
      webhook: document.getElementById('alert-webhook').value.trim(),
      muteMs: 60000
    };
    upsertRule(updated);
    ed.style.display = 'none';
    renderList();
    renderHistory();
  });
  document.getElementById('alert-cancel').addEventListener('click', () => { ed.style.display = 'none'; });
}

function upsertRule(rule) {
  const idx = rules.findIndex(r => r.id === rule.id);
  if (idx >= 0) rules[idx] = rule; else rules.push(rule);
  saveRules();
}

function removeRule(id) {
  rules = rules.filter(r => r.id !== id);
  saveRules();
  renderList();
}

function loadRules() {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (raw) rules = JSON.parse(raw) || [];
  } catch (e) { rules = []; }
}

function loadHistory() {
  try { const raw = localStorage.getItem(HISTORY_KEY); if (raw) history = JSON.parse(raw) || []; } catch (e) { history = []; }
}

function saveHistory() { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }

function saveRules() {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(rules));
}

function importRules() {
  const s = prompt('Paste rules JSON');
  if (!s) return;
  try { const parsed = JSON.parse(s); rules = parsed; saveRules(); renderList(); alert('Imported'); } catch (e) { alert('Invalid JSON'); }
}

function exportRules() {
  const s = JSON.stringify(rules, null, 2);
  const w = window.open('about:blank');
  w.document.write('<pre>' + escapeHtml(s) + '</pre>');
}

function renderHistory() {
  const el = document.getElementById('alerts-history');
  if (!el) return;
  el.innerHTML = '';
  for (const h of (history || []).slice().reverse().slice(0,200)) {
    const d = document.createElement('div');
    d.style.padding = '6px 8px'; d.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
    d.innerHTML = `<div style="font-size:12px;color:#9aa">${new Date(h.ts).toLocaleString()}</div><div>${escapeHtml(h.msg)}</div>`;
    el.appendChild(d);
  }
}

function genId() { return 'r_' + Math.random().toString(36).slice(2,9); }

function escapeHtml(s){ return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

export function init() {
  if (evalInterval) return;
  loadRules();
  evalInterval = setInterval(() => { try { evaluateAll(); } catch (e) { console.error('alert-eval', e); } }, 5000);

  // Listen for hidden-liquidity detector events
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.__hl_alert_handler = function(e) {
      try {
        const sig = e.detail;
        if (!sig) return;
        const coin = sig.coin;
        const score = sig.score;
        const msg = `Hidden Liquidity detected on ${coin} — score ${score.toFixed(3)} (iceberg:${sig.breakdown.iceberg.toFixed(3)}, absorption:${sig.breakdown.absorption.toFixed(3)})`;
        addHistory({ ts: Date.now(), ruleId: 'hl_auto', coin, msg });
        showToast(`Hidden Liquidity: ${coin}`, msg);
        // Browser notification
        if (window.Notification && Notification.permission === 'granted') {
          new Notification(`Hidden Liquidity: ${coin}`, { body: msg });
        } else if (window.Notification && Notification.permission !== 'denied') {
          Notification.requestPermission().then(p => { if (p === 'granted') new Notification(`Hidden Liquidity: ${coin}`, { body: msg }); });
        }

        // Evaluate user rules that reference hiddenLiquidity metric
        for (const r of rules || []) {
          const conds = r.conditions || [];
          // Only evaluate rules that include hiddenLiquidity metric
          if (!conds.some(c => c.metric === 'hiddenLiquidity')) continue;
          // evaluate conditions (support logical)
          const results = conds.map(c => {
            if (c.metric !== 'hiddenLiquidity') return null;
            const thr = parseFloat(c.threshold) || 0;
            switch (c.operator) {
              case '>': return score > thr;
              case '<': return score < thr;
              case '>=': return score >= thr;
              case '<=': return score <= thr;
              case '==': return score == thr;
              default: return false;
            }
          }).filter(x => x !== null);
          if (results.length === 0) continue;
          const logical = (r.logical || 'AND').toUpperCase();
          const triggered = logical === 'AND' ? results.every(Boolean) : results.some(Boolean);
          if (triggered) {
            notify(r, coin, msg);
            addHistory({ ts: Date.now(), ruleId: r.id, coin, msg: `${r.name} triggered by HL on ${coin} (${score.toFixed(3)})` });
          }
        }
      } catch (e) { console.error('hl handler', e); }
    };
    window.addEventListener('hiddenLiquidity:alert', window.__hl_alert_handler);
  }
}

export function stop() {
  if (evalInterval) { clearInterval(evalInterval); evalInterval = null; }
  if (typeof window !== 'undefined' && window.__hl_alert_handler) {
    window.removeEventListener('hiddenLiquidity:alert', window.__hl_alert_handler);
    window.__hl_alert_handler = null;
  }
}

function evaluateAll() {
  if (!window.marketState) return;
  for (const coin of Object.keys(window.marketState)) {
    const data = window.marketState[coin];
    for (const r of rules) {
      try { evaluateRule(r, coin, data); } catch (e) { console.error('eval rule', e); }
    }
  }
}

const lastFired = {}; // ruleId: timestamp

function evaluateRule(rule, coin, data) {
  const key = rule.id + '::' + coin;
  const now = Date.now();
  if (lastFired[key] && now - lastFired[key] < (rule.muteMs || 60000)) return;
  // support multi-condition rules
  const conds = rule.conditions || [];
  if (!conds || conds.length === 0) return;
  const results = conds.map(c => {
    let v = null;
    if (c.metric === 'price') v = safeGet(data, ['raw','PRICE','last']);
    else if (c.metric === 'volume') v = safeGet(data, ['raw','total_vol_fiat']);
    else if (c.metric === 'masterSignal') v = safeGet(data, ['signals','profiles','default','timeframes','1m','masterSignal','normalizedScore']) || safeGet(data, ['signals','masterSignal','score']);
    const thr = parseFloat(c.threshold) || 0;
    switch (c.operator) {
      case '>': return v > thr;
      case '<': return v < thr;
      case '>=': return v >= thr;
      case '<=': return v <= thr;
      case '==': return v == thr;
      default: return false;
    }
  });
  const logical = (rule.logical || 'AND').toUpperCase();
  const triggered = logical === 'AND' ? results.every(Boolean) : results.some(Boolean);
  if (triggered) {
    lastFired[key] = now;
    // build friendly message
    const msg = `${rule.name} triggered on ${coin} — ${conds.map(c=>`${c.metric} ${c.operator} ${c.threshold}`).join(' ' + (logical==='AND'? ' AND ': ' OR '))}`;
    addHistory({ ts: now, ruleId: rule.id, coin, msg });
    notify(rule, coin, msg);
  }
}

function safeGet(o, path) {
  let cur = o;
  for (const p of path) {
    if (!cur) return undefined;
    cur = cur[p];
  }
  return cur;
}

async function notify(rule, coin, value) {
  const title = `Alert: ${rule.name} (${coin})`;
  const body = typeof value === 'string' ? value : `${rule.conditions ? rule.conditions.map(c=>`${c.metric}${c.operator}${c.threshold}`).join(',') : ''} — current ${value}`;
  if ((rule.channels||[]).includes('browser')) {
    if (window.Notification && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (window.Notification && Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { if (p === 'granted') new Notification(title, { body }); });
    }
  }
  // Toast
  showToast(title, body);
  // webhook / discord / telegram
  if ((rule.channels||[]).includes('webhook') && rule.webhook) {
    try {
      await fetch(rule.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId: rule.id, name: rule.name, coin, value, ts: Date.now() })
      });
    } catch (e) { console.error('alert webhook failed', e); }
  }
  if ((rule.channels||[]).includes('discord') && rule.webhook) {
    try {
      await fetch(rule.webhook, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ content: `${title}\n${body}` }) });
    } catch (e) { console.error('discord notify failed', e); }
  }
  if ((rule.channels||[]).includes('telegram') && rule.webhook) {
    try {
      // assume full telegram sendMessage API url or bot API URL is provided
      await fetch(rule.webhook, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ text: `${title}\n${body}` }) });
    } catch (e) { console.error('telegram notify failed', e); }
  }
}

function showToast(title, body) {
  ensureToastContainer();
  const tc = document.getElementById('alert-toast-container');
  if (!tc) return;
  const t = document.createElement('div');
  t.style.background = '#0f1724'; t.style.color = '#fff'; t.style.padding = '10px 12px'; t.style.marginTop = '8px'; t.style.borderRadius = '8px'; t.style.boxShadow = '0 6px 18px rgba(2,6,23,0.6)';
  t.innerHTML = `<div style="font-weight:700">${escapeHtml(title)}</div><div style="font-size:12px; opacity:0.9">${escapeHtml(body)}</div>`;
  tc.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>tc.removeChild(t),400); }, 8000);
}

function addHistory(entry) { history.push(entry); if (history.length > 1000) history.shift(); saveHistory(); renderHistory(); }

// minimal export for integration
export default { render, init, stop };
