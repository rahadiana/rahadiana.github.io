(function(){
  'use strict';
  function createToggle() {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.right = '12px';
    container.style.top = '12px';
    container.style.zIndex = 99999;
    container.style.background = 'rgba(0,0,0,0.6)';
    container.style.color = '#fff';
    container.style.padding = '6px 10px';
    container.style.borderRadius = '6px';
    container.style.fontSize = '13px';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';

    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '6px';
    label.style.cursor = 'pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'webgpuToggle';

    const text = document.createElement('span');
    text.textContent = 'Use WebGPU (when available)';

    label.appendChild(checkbox);
    label.appendChild(text);
    container.appendChild(label);

    // status hint
    const hint = document.createElement('small');
    hint.style.color = '#ddd';
    hint.style.display = 'block';
    hint.style.marginLeft = '4px';
    hint.textContent = '';
    container.appendChild(hint);

    document.body.appendChild(container);

    // initialise from config if available
    try {
      const cfg = (window.__okxShim && typeof window.__okxShim.getWEBGPUConfig === 'function') ? window.__okxShim.getWEBGPUConfig() : ((window.getWEBGPUConfig && typeof window.getWEBGPUConfig === 'function') ? window.getWEBGPUConfig() : (window.WEBGPU_CONFIG || null));
      checkbox.checked = !!(cfg && cfg.enabled);
      hint.textContent = checkbox.checked ? 'enabled' : 'disabled';
    } catch (e) { checkbox.checked = true; }

    // Worker mode selector (classic/module)
    try {
      const MODE_KEY = 'okx_worker_mode_v1';
      const sel = document.createElement('select');
      sel.id = 'workerModeSelect';
      sel.style.background = 'transparent';
      sel.style.color = '#fff';
      sel.style.border = '1px solid rgba(255,255,255,0.12)';
      sel.style.padding = '2px 6px';
      sel.style.borderRadius = '4px';
      const optClassic = document.createElement('option'); optClassic.value = 'classic'; optClassic.textContent = 'Classic Worker';
      const optModule = document.createElement('option'); optModule.value = 'module'; optModule.textContent = 'Module Worker';
      sel.appendChild(optClassic); sel.appendChild(optModule);
      // read stored
      let mode = 'classic';
      try { const m = localStorage.getItem(MODE_KEY); if (m) mode = m; } catch (e) {}
      sel.value = mode;
      container.appendChild(sel);
      sel.addEventListener('change', ()=>{
        const chosen = sel.value === 'module' ? 'module' : 'classic';
        try { localStorage.setItem(MODE_KEY, chosen); } catch (e) {}
        // restart workerPool with preference
          try {
          const preferClassic = chosen === 'classic';
          try {
            const wp = (window.__okxShim && typeof window.__okxShim.getWorkerPool === 'function') ? window.__okxShim.getWorkerPool() : (window.workerPool || null);
            if (wp && typeof window.WorkerPool === 'function') {
              const emitLegacy = wp.emitLegacy;
              try { wp.terminate(); } catch (e) {}
              let newPool = null;
              try { newPool = new window.WorkerPool(); } catch (e) { newPool = null; }
              if (newPool) {
                try { newPool.preferClassic = preferClassic; } catch (e) {}
                try { if (typeof newPool.setEmitLegacy === 'function') newPool.setEmitLegacy(emitLegacy); } catch (e) {}
                try { newPool.init(); } catch (e) {}
                try { if (window.__okxShim && typeof window.__okxShim.setWorkerPool === 'function') window.__okxShim.setWorkerPool(newPool); else window.workerPool = newPool; } catch (e) { try { window.workerPool = newPool; } catch (ex) { } }
                console.log('[Worker UI] restarted workerPool, preferClassic=', preferClassic);
              }
            }
          } catch (e) { console.warn('[Worker UI] failed to restart workerPool', e); }
        } catch (e) { console.warn('[Worker UI] failed to restart workerPool', e); }
      });
    } catch (e) { /* ignore UI failure */ }

    checkbox.addEventListener('change', () => {
      const enabled = checkbox.checked;
      try {
        if (window.setWEBGPUConfig) window.setWEBGPUConfig({ enabled }, true);
        else {
          const wp2 = (window.__okxShim && typeof window.__okxShim.getWorkerPool === 'function') ? window.__okxShim.getWorkerPool() : (window.workerPool || null);
          if (wp2 && typeof wp2.setWebGPUConfig === 'function') wp2.setWebGPUConfig({ enabled });
        }
        hint.textContent = enabled ? 'enabled' : 'disabled';
        console.log('[WebGPU UI] set enabled=', enabled);
      } catch (e) { console.warn('[WebGPU UI] failed to update', e); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createToggle);
  else createToggle();
})();
