(function(){
  'use strict';
  const MODE_KEY = 'okx_worker_mode_v1';
  const CFG_KEY = 'okx_webgpu_config_v1';

  function removeFloatingUI() {
    try {
      const cb = document.getElementById('webgpuToggle');
      if (cb) {
        const container = cb.closest('div');
        if (container && container.parentNode) container.parentNode.removeChild(container);
      }
    } catch (e) { /* ignore */ }
  }

  function createSettings(panel) {
    // WebGPU section
    const section = document.createElement('div');
    section.className = 'mb-3';
    const title = document.createElement('h6'); title.textContent = 'WebGPU';
    const desc = document.createElement('div'); desc.className='text-muted small mb-2'; desc.textContent = 'Enable WebGPU acceleration where available.';
    const row = document.createElement('div'); row.className='d-flex align-items-center gap-3';

    const checkbox = document.createElement('input'); checkbox.type='checkbox'; checkbox.id='settings_webgpu_enable';
    const label = document.createElement('label'); label.htmlFor = checkbox.id; label.textContent = 'Use WebGPU (when available)';

    row.appendChild(checkbox); row.appendChild(label);
    section.appendChild(title); section.appendChild(desc); section.appendChild(row);

    // Worker mode
    const wsec = document.createElement('div'); wsec.className='mb-3';
    const wtitle = document.createElement('h6'); wtitle.textContent = 'Worker Mode';
    const wdesc = document.createElement('div'); wdesc.className='text-muted small mb-2'; wdesc.textContent = 'Choose Classic (importScripts) or Module (ES modules) workers.';
    const wsel = document.createElement('select'); wsel.className='form-select form-select-sm w-auto'; wsel.id='settings_worker_mode';
    const opt1 = document.createElement('option'); opt1.value='classic'; opt1.textContent='Classic Worker';
    const opt2 = document.createElement('option'); opt2.value='module'; opt2.textContent='Module Worker';
    wsel.appendChild(opt1); wsel.appendChild(opt2);
    wsec.appendChild(wtitle); wsec.appendChild(wdesc); wsec.appendChild(wsel);

    // Persist History (bind to existing control if present)
    const psec = document.createElement('div'); psec.className='mb-3';
    const ptitle = document.createElement('h6'); ptitle.textContent = 'Local Persistence';
    const pdesc = document.createElement('div'); pdesc.className='text-muted small mb-2'; pdesc.textContent = 'Persist history and settings locally.';
    const pbox = document.createElement('input'); pbox.type='checkbox'; pbox.id='settings_persist_history';
    const plabel = document.createElement('label'); plabel.htmlFor=pbox.id; plabel.textContent='Persist History';
    psec.appendChild(ptitle); psec.appendChild(pdesc); psec.appendChild(pbox); psec.appendChild(plabel);

    // Show Advanced Metrics (sync with #showAdvancedMetricsToggle if present)
    const amsec = document.createElement('div'); amsec.className='mb-3';
    const amtitle = document.createElement('h6'); amtitle.textContent = 'Display';
    const amdesc = document.createElement('div'); amdesc.className='text-muted small mb-2'; amdesc.textContent = 'UI display options.';
    const ambox = document.createElement('input'); ambox.type='checkbox'; ambox.id='settings_show_advanced';
    const amlabel = document.createElement('label'); amlabel.htmlFor = ambox.id; amlabel.textContent = 'Show Advanced Metrics by default';
    amsec.appendChild(amtitle); amsec.appendChild(amdesc); amsec.appendChild(ambox); amsec.appendChild(amlabel);

    // Row limit
    const lsec = document.createElement('div'); lsec.className='mb-3';
    const ltitle = document.createElement('h6'); ltitle.textContent = 'Rows & Limits';
    const ldesc = document.createElement('div'); ldesc.className='text-muted small mb-2'; ldesc.textContent = 'Default row limit for tables.';
    const linput = document.createElement('input'); linput.type='number'; linput.className='form-control form-control-sm w-auto'; linput.id='settings_limit_rows'; linput.min='1';
    lsec.appendChild(ltitle); lsec.appendChild(ldesc); lsec.appendChild(linput);

    // Buttons
    const btns = document.createElement('div'); btns.className='mt-3';
    const resetBtn = document.createElement('button'); resetBtn.className='btn btn-sm btn-outline-secondary me-2'; resetBtn.textContent='Reset Defaults';
    const clearStorageBtn = document.createElement('button'); clearStorageBtn.className='btn btn-sm btn-outline-danger'; clearStorageBtn.textContent='Clear Local Storage';
    btns.appendChild(resetBtn); btns.appendChild(clearStorageBtn);

    // Storage tools
    const ssec = document.createElement('div'); ssec.className='mb-3';
    const stitle = document.createElement('h6'); stitle.textContent = 'Storage';
    const sdesc = document.createElement('div'); sdesc.className='text-muted small mb-2'; sdesc.textContent = 'Manage persisted data to avoid slowdowns.';
    const trimLabel = document.createElement('label'); trimLabel.textContent = 'Trim alerts older than (days):'; trimLabel.className='d-block small';
    const trimInput = document.createElement('input'); trimInput.type='number'; trimInput.min='0'; trimInput.value='30'; trimInput.className='form-control form-control-sm w-auto mb-2'; trimInput.id='settings_trim_alert_days';
    const trimBtn = document.createElement('button'); trimBtn.className='btn btn-sm btn-outline-primary me-2'; trimBtn.textContent='Trim Alerts';
    const pruneBtn = document.createElement('button'); pruneBtn.className='btn btn-sm btn-outline-secondary me-2'; pruneBtn.textContent='Prune Histories (IDB)';
    const migrateBtn = document.createElement('button'); migrateBtn.className='btn btn-sm btn-outline-success'; migrateBtn.textContent='Migrate Alerts → IDB';
    ssec.appendChild(stitle); ssec.appendChild(sdesc); ssec.appendChild(trimLabel); ssec.appendChild(trimInput); ssec.appendChild(trimBtn); ssec.appendChild(pruneBtn); ssec.appendChild(migrateBtn);

    panel.appendChild(section);
    panel.appendChild(wsec);
    panel.appendChild(psec);
    panel.appendChild(amsec);
    panel.appendChild(lsec);
    panel.appendChild(ssec);
    panel.appendChild(btns);

    // initialize values
    try{
      const cfg = (window.getWEBGPUConfig && window.getWEBGPUConfig()) || window.WEBGPU_CONFIG || { enabled: true };
      checkbox.checked = !!cfg.enabled;
    }catch(e){ checkbox.checked = true; }

    try{
      const m = localStorage.getItem(MODE_KEY) || 'classic';
      wsel.value = m;
    }catch(e){ wsel.value='classic'; }

    try{
      const persist = !!document.getElementById('persistHistoryToggle') && document.getElementById('persistHistoryToggle').checked;
      pbox.checked = persist;
    }catch(e){ pbox.checked = true; }

    // init show advanced metrics from existing toggle
    try{
      const existing = document.getElementById('showAdvancedMetricsToggle');
      ambox.checked = !!(existing && existing.checked);
    }catch(e){ ambox.checked = false; }

    // init row limit from existing input
    try{
      const existingLimit = document.getElementById('limitInput');
      linput.value = existingLimit && existingLimit.value ? existingLimit.value : 5;
    }catch(e){ linput.value = 5; }

    // handlers
    checkbox.addEventListener('change', ()=>{
      try{ if (window.setWEBGPUConfig) window.setWEBGPUConfig({ enabled: !!checkbox.checked }, true); else if (window.workerPool && window.workerPool.setWebGPUConfig) window.workerPool.setWebGPUConfig({ enabled: !!checkbox.checked });
      }catch(e){ console.warn('setWEBGPUConfig failed',e); }
    });

    wsel.addEventListener('change', ()=>{
      const chosen = wsel.value === 'module' ? 'module' : 'classic';
      try{ localStorage.setItem(MODE_KEY, chosen); }catch(e){}
      // restart worker pool
      try{
        const preferClassic = chosen === 'classic';
        if (window.workerPool && typeof window.WorkerPool === 'function') {
          const emitLegacy = window.workerPool.emitLegacy;
          window.workerPool.terminate();
          window.workerPool = new window.WorkerPool();
          window.workerPool.preferClassic = preferClassic;
          if (typeof window.workerPool.setEmitLegacy === 'function') window.workerPool.setEmitLegacy(emitLegacy);
          window.workerPool.init();
        }
      }catch(e){ console.warn('restart workerPool failed',e); }
    });

    pbox.addEventListener('change', ()=>{
      try{
        const other = document.getElementById('persistHistoryToggle');
        if (other) other.checked = pbox.checked;
        // attempt to dispatch any existing handler
        try{ other && other.dispatchEvent(new Event('change')); }catch(e){}
      }catch(e){}
    });

    // show advanced handler
    ambox.addEventListener('change', ()=>{
      try{
        const other = document.getElementById('showAdvancedMetricsToggle');
        if (other) other.checked = ambox.checked;
        try{ other && other.dispatchEvent(new Event('change')); }catch(e){}
      }catch(e){}
    });

    // limit input handler
    linput.addEventListener('change', ()=>{
      try{
        const other = document.getElementById('limitInput');
        if (other) other.value = linput.value;
        try{ other && other.dispatchEvent(new Event('input')); }catch(e){}
      }catch(e){}
    });

    resetBtn.addEventListener('click', ()=>{
      try{ localStorage.removeItem(CFG_KEY); localStorage.removeItem(MODE_KEY); location.reload(); }catch(e){ location.reload(); }
    });

    clearStorageBtn.addEventListener('click', ()=>{
      try{ localStorage.clear(); alert('localStorage cleared'); }catch(e){ alert('failed to clear'); }
    });

    // Trim alerts older than N days
    trimBtn.addEventListener('click', ()=>{
      try{
        const days = Math.max(0, parseInt(trimInput.value,10) || 0);
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const arr = (typeof window.loadAlertsFromStore === 'function') ? window.loadAlertsFromStore() : (JSON.parse(localStorage.getItem('okx_calc_alerts_v1')||'[]'));
        const kept = (arr || []).filter(it => (it && it.ts) ? (it.ts >= cutoff) : true);
        if (typeof window.saveAlertsToStore === 'function') window.saveAlertsToStore(kept); else localStorage.setItem('okx_calc_alerts_v1', JSON.stringify(kept));
        try{ if (typeof window.renderAlertsList === 'function') window.renderAlertsList(); }catch(e){}
        alert('Trimmed alerts. Kept ' + (kept.length) + ' items.');
      }catch(e){ console.warn('trim alerts failed', e); alert('Trim failed'); }
    });

    // Prune IDB histories now
    pruneBtn.addEventListener('click', ()=>{
      try{
        if (window.idbHistory && typeof window.idbHistory.pruneOldHistories === 'function') {
          pruneBtn.disabled = true; pruneBtn.textContent = 'Pruning...';
          window.idbHistory.pruneOldHistories().then(res=>{ alert('Prune complete'); pruneBtn.disabled=false; pruneBtn.textContent='Prune Histories (IDB)'; }).catch(e=>{ console.warn('prune failed',e); alert('Prune failed'); pruneBtn.disabled=false; pruneBtn.textContent='Prune Histories (IDB)'; });
        } else { alert('IDB helper not available in this environment'); }
      }catch(e){ console.warn('prune click failed', e); alert('Prune failed'); }
    });

    // Migrate alerts into IDB under coin '__alerts__' using idbHistory.saveCoinHistory
    migrateBtn.addEventListener('click', ()=>{
      try{
        if (!window.idbHistory || typeof window.idbHistory.saveCoinHistory !== 'function') { alert('IDB helper not available'); return; }
        const arr = (typeof window.loadAlertsFromStore === 'function') ? window.loadAlertsFromStore() : (JSON.parse(localStorage.getItem('okx_calc_alerts_v1')||'[]'));
        if (!arr || arr.length === 0) { alert('No alerts to migrate'); return; }
        migrateBtn.disabled = true; migrateBtn.textContent = 'Migrating...';
        // Save as a single history array entry per alert (idbHistory will cap and prune)
        window.idbHistory.saveCoinHistory('__alerts__', arr).then(()=>{
          try{ localStorage.removeItem('okx_calc_alerts_v1'); }catch(e){}
          alert('Migration complete — alerts moved to IndexedDB.');
        }).catch(e=>{ console.warn('migrate failed', e); alert('Migration failed'); }).finally(()=>{ migrateBtn.disabled=false; migrateBtn.textContent='Migrate Alerts → IDB'; });
      }catch(e){ console.warn('migrate click failed', e); alert('Migration failed'); }
    });
  }

  function init(){
    removeFloatingUI();
    const panel = document.getElementById('settingsPanel');
    if (!panel) return;
    createSettings(panel);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
