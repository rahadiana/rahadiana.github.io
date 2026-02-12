// Lightweight Social Features: share/import strategies and local leaderboard
// Storage keys: 'social_feed' -> [{id,name,author,ts,payload,likes}], 'social_group_key', 'social_whitelist'

const FEED_KEY = 'social_feed';
const GROUP_KEY = 'social_group_key';
const WHITELIST_KEY = 'social_whitelist';

function genId(){ return 's_'+Math.random().toString(36).slice(2,9); }

function loadFeed(){ try{ return JSON.parse(localStorage.getItem(FEED_KEY))||[] }catch(e){return[];} }
function saveFeed(feed){ localStorage.setItem(FEED_KEY, JSON.stringify(feed)); }

function renderFeedList(root){
  const feed = loadFeed();
  const el = root.querySelector('#social-feed');
  el.innerHTML = '';
  if (!feed.length) { el.innerHTML = '<i>No shares yet.</i>'; return; }
  for (const item of feed.slice().reverse()) {
    const d = document.createElement('div');
    d.className = 'panel p-2 mb-2';
    d.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><strong>${escapeHtml(item.name)}</strong> <small class="text-muted">by ${escapeHtml(item.author||'anon')}</small></div>
        <div><small>${new Date(item.ts).toLocaleString()}</small></div>
      </div>
      <div style="margin-top:6px; font-size:12px; max-height:120px; overflow:auto; background:#051022; padding:8px; border-radius:6px">${escapeHtml(typeof item.payload==='string'?item.payload:JSON.stringify(item.payload))}</div>
      <div style="margin-top:6px; display:flex; gap:8px">
        <button data-id="${item.id}" class="import">Import</button>
        <button data-id="${item.id}" class="copy">Copy Link</button>
        <button data-id="${item.id}" class="like">Like (${item.likes||0})</button>
      </div>
    `;
    el.appendChild(d);
  }
  // bind
  for (const b of el.querySelectorAll('button.import')) b.addEventListener('click', (e)=>{ const id=b.dataset.id; doImport(id, root); });
  for (const b of el.querySelectorAll('button.copy')) b.addEventListener('click', (e)=>{ const id=b.dataset.id; doCopyLink(id); });
  for (const b of el.querySelectorAll('button.like')) b.addEventListener('click', (e)=>{ const id=b.dataset.id; doLike(id, root); });
}

function doImport(id, root){
  const feed = loadFeed(); const item = feed.find(f=>f.id===id); if(!item) return alert('Not found');
  try{
    // attempt to parse payload as strategy JSON and save to localStorage 'shared_strategies'
    const payload = typeof item.payload==='string' ? JSON.parse(item.payload) : item.payload;
    const key = 'shared_strategies';
    const cur = JSON.parse(localStorage.getItem(key)||'[]'); cur.push({ id: genId(), name: item.name, author: item.author, ts: Date.now(), payload });
    localStorage.setItem(key, JSON.stringify(cur));
    alert('Imported into local strategies');
  }catch(e){ alert('Import failed: invalid payload'); }
}

function doCopyLink(id){ const feed = loadFeed(); const item = feed.find(f=>f.id===id); if(!item) return; const data = btoa(unescape(encodeURIComponent(JSON.stringify(item)))); const url = location.href.split('#')[0] + '#share=' + data; navigator.clipboard?.writeText(url).then(()=>alert('Link copied'));
}

function doLike(id, root){ const feed = loadFeed(); const item = feed.find(f=>f.id===id); if(!item) return; item.likes = (item.likes||0)+1; saveFeed(feed); renderFeedList(root); }

function escapeHtml(s){ return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

export function render(container){
  container.innerHTML = '';
  const root = document.createElement('div'); root.className='panel';
  root.innerHTML = `
    <h3>Social — Share Strategies</h3>
    <div style="display:flex; gap:12px;">
      <div style="flex:1">
        <label>Name:<input id="social-name" style="width:100%"></label>
        <label>Author:<input id="social-author" style="width:100%"></label>
        <label style="display:block; margin-top:8px">Payload (JSON):</label>
        <textarea id="social-payload" style="width:100%;height:120px;background:#051022;color:#9aa;padding:8px;border-radius:6px"></textarea>
        <div style="margin-top:8px; display:flex; gap:8px; align-items:center">
          <button id="social-share">Share</button> <button id="social-clear">Clear</button>
          <label style="margin-left:12px"><input type="checkbox" id="social-encrypt"> Encrypt with Group Key</label>
        </div>
        <div style="margin-top:6px">
          <input id="social-group-key" placeholder="Group passphrase (optional)" style="width:80%"> <button id="social-save-key">Save Key</button>
        </div>
      </div>
      <div style="width:360px">
        <h4>Feed</h4>
        <div id="social-feed" style="max-height:520px; overflow:auto"></div>
        <h4 style="margin-top:8px">Leaderboard</h4>
        <div id="social-board" style="background:#051022;padding:8px;border-radius:6px"></div>
        <h4 style="margin-top:8px">Whitelist / Peers</h4>
        <div id="social-peers" style="background:#051022;padding:8px;border-radius:6px; max-height:140px; overflow:auto"></div>
      </div>
    </div>
  `;
  container.appendChild(root);
  document.getElementById('social-share').addEventListener('click', async ()=>{
    const name=document.getElementById('social-name').value||'untitled';
    const author=document.getElementById('social-author').value||'anon';
    const payload=document.getElementById('social-payload').value||'';
    try{ JSON.parse(payload); }catch(e){ if(!confirm('Payload is not valid JSON. Share as raw text?')) return; }
    const encrypt = document.getElementById('social-encrypt').checked;
    let item = { id: genId(), name, author, ts: Date.now(), likes:0 };
    if (encrypt) {
      const pass = localStorage.getItem(GROUP_KEY) || document.getElementById('social-group-key').value || '';
      if (!pass) { if (!confirm('No group passphrase saved. Share unencrypted?')) return; }
      try {
        const cipher = await encryptString(payload, pass);
        item.encrypted = true;
        item.cipher = cipher;
      } catch (e) { alert('Encryption failed'); return; }
    } else {
      item.payload = payload;
    }
    const feed = loadFeed(); feed.push(item); saveFeed(feed); renderFeedList(root); renderBoard(root); document.getElementById('social-payload').value='';
    // Broadcast over P2P if available
    try{
      if (window && window.p2p && typeof window.p2p.broadcast === 'function') {
        window.p2p.broadcast({ __appType: 'social', payload: item });
      }
    } catch(e) { console.warn('p2p broadcast failed', e); }
  });
  document.getElementById('social-clear').addEventListener('click', ()=>{ document.getElementById('social-name').value=''; document.getElementById('social-author').value=''; document.getElementById('social-payload').value=''; });
  renderFeedList(root); renderBoard(root);
  // load saved group key into input
  try { const k = localStorage.getItem(GROUP_KEY); if (k) document.getElementById('social-group-key').value = k; } catch(e){}
  document.getElementById('social-save-key').addEventListener('click', ()=>{ const v=document.getElementById('social-group-key').value||''; if(v) { localStorage.setItem(GROUP_KEY,v); alert('Group key saved'); } else { localStorage.removeItem(GROUP_KEY); alert('Group key cleared'); } });
  renderPeers(root);
}

function renderBoard(root){ const feed = loadFeed(); const board = root.querySelector('#social-board'); board.innerHTML=''; const top = feed.slice().sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,10); if(!top.length){ board.innerHTML='<i>No entries yet</i>'; return;} for(const it of top){ const r=document.createElement('div'); r.style.padding='6px'; r.innerHTML=`<strong>${escapeHtml(it.name)}</strong> — ${escapeHtml(it.author||'anon')} <span class="text-muted">(${it.likes||0} likes)</span>`; board.appendChild(r);} }

export function init(){
  // support importing shared link via URL hash: #share=<base64>
  try{
    const h = location.hash || '';
    if (h.startsWith('#share=')){
      const data = h.replace('#share=',''); const json = decodeURIComponent(escape(atob(data))); const obj = JSON.parse(json);
      const feed = loadFeed(); if (!feed.find(f=>f.id===obj.id)) { feed.push(obj); saveFeed(feed); alert('Imported shared item from URL'); }
    }
  }catch(e){}
  // listen for P2P social broadcasts
  try {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.__p2p_social_handler = async function(e) {
        try {
          const remote = e.detail && e.detail.payload ? e.detail.payload : null;
          const from = e.detail && e.detail.from ? e.detail.from : null;
          if (!remote) return;
          // whitelist check
          const wl = JSON.parse(localStorage.getItem(WHITELIST_KEY) || '[]');
          if (wl && wl.length) {
            if (!from || !wl.includes(from)) return; // not allowed
          }
          let item = remote;
          if (item.encrypted) {
            const pass = localStorage.getItem(GROUP_KEY) || '';
            if (!pass) return; // cannot decrypt
            try {
              const plain = await decryptString(item.cipher, pass);
              item.payload = plain;
              delete item.cipher;
            } catch (err) { return; }
          }
          const feed = loadFeed(); if (!feed.find(f=>f.id===item.id)) { feed.push(item); saveFeed(feed); const root = document.querySelector('.panel'); if (root) { renderFeedList(root); renderBoard(root); } }
        } catch (err) {}
      };
      window.addEventListener('p2p:social', window.__p2p_social_handler);
    }
  } catch (e) {}
}


export function stop(){
  try { if (typeof window !== 'undefined' && window.__p2p_social_handler) { window.removeEventListener('p2p:social', window.__p2p_social_handler); window.__p2p_social_handler = null; } } catch(e) {}
  try { if (typeof window !== 'undefined' && window.__p2p_whitelist_handler) { window.removeEventListener('p2p:peers', window.__p2p_whitelist_handler); window.__p2p_whitelist_handler = null; } } catch(e) {}
}

// --- peers / whitelist UI ---
function renderPeers(root) {
  const el = root.querySelector('#social-peers');
  el.innerHTML = '';
  const peers = (window.p2p && typeof window.p2p.getStats === 'function') ? window.p2p.getStats().peers || [] : [];
  const wl = JSON.parse(localStorage.getItem(WHITELIST_KEY) || '[]');
  for (const p of peers) {
    const row = document.createElement('div');
    row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center'; row.style.padding='6px 0';
    row.innerHTML = `<div>${escapeHtml(p.id)} <small class="text-muted">(${p.connectionState||p.channelState||'?'})</small></div>`;
    const btn = document.createElement('button'); btn.textContent = wl.includes(p.id)?'Remove':'Whitelist'; btn.addEventListener('click', ()=>{ toggleWhitelist(p.id); renderPeers(root); });
    row.appendChild(btn);
    el.appendChild(row);
  }
  // local whitelist display
  const h = document.createElement('div'); h.style.marginTop='8px'; h.innerHTML = `<strong>Allowed:</strong> ${(wl||[]).join(', ')}`;
  el.appendChild(h);
}

function toggleWhitelist(peerId){ const wl = JSON.parse(localStorage.getItem(WHITELIST_KEY) || '[]'); const idx = wl.indexOf(peerId); if (idx===-1) wl.push(peerId); else wl.splice(idx,1); localStorage.setItem(WHITELIST_KEY, JSON.stringify(wl)); }

// --- Crypto helpers (PBKDF2 -> AES-GCM) ---
async function getKeyFromPass(pass, salt) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 100_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufToBase64(b){ return btoa(String.fromCharCode.apply(null, new Uint8Array(b))); }
function base64ToBuf(s){ const bin = atob(s); const l = bin.length; const buf = new Uint8Array(l); for (let i=0;i<l;i++) buf[i]=bin.charCodeAt(i); return buf.buffer; }

async function encryptString(plain, pass) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKeyFromPass(pass, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(plain));
  // store salt(16) + iv(12) + ct
  const combined = new Uint8Array(salt.byteLength + iv.byteLength + ct.byteLength);
  combined.set(salt, 0); combined.set(iv, salt.byteLength); combined.set(new Uint8Array(ct), salt.byteLength + iv.byteLength);
  return bufToBase64(combined.buffer);
}

async function decryptString(b64, pass) {
  const dataBuf = base64ToBuf(b64);
  const data = new Uint8Array(dataBuf);
  const salt = data.slice(0,16);
  const iv = data.slice(16,28);
  const ct = data.slice(28);
  const key = await getKeyFromPass(pass, salt.buffer);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct.buffer);
  return new TextDecoder().decode(plainBuf);
}

export default { render, init, stop };
