/*
  Simple Web Worker (ES module worker) that loads the wasm-pack ESM glue and exposes a small
  compute interface. Worker protocol (messages):
    { cmd: 'init', baseUrl: '/wasm-proto/pkg' } -> replies { cmd: 'ready' } or { cmd: 'error' }
    { cmd: 'compute', data: ArrayBuffer|Float64Array } -> replies { cmd: 'result', result: ArrayBuffer }

  AUTO-DETECT FEATURE:
  - If baseUrl is null/undefined/'auto', worker will auto-detect the correct path
  - Tries multiple common locations relative to the page URL
*/

let wasmReady = false;
let wasmModule = null;

// Auto-detect helper: tries multiple possible base paths
async function autoDetectBasePath() {
    // Get the page origin from worker's importScripts location or referrer
    const pageOrigin = self.location.origin;
    const pagePath = self.location.pathname;
    
    // Extract potential base paths from current URL
    const pathParts = pagePath.split('/').filter(Boolean);
    
    const candidates = [
        // Relative to worker location (most common)
        './pkg',
        '../pkg',
        '../../pkg',
        
        // Common GitHub Pages patterns
        `/${pathParts[0]}/pkg`,  // /repo-name/pkg
        `/pkg`,                   // root /pkg
        
        // Try with wasm-proto in path
        '/wasm-proto/pkg',
        `/${pathParts[0]}/wasm-proto/pkg`,
        
        // Absolute with origin
        `${pageOrigin}/pkg`,
        `${pageOrigin}/${pathParts[0]}/pkg`,
    ];
    
    // Test each candidate by trying to HEAD the wasm glue file
    for (const base of candidates) {
        try {
            const normalizedBase = base.endsWith('/') ? base : base + '/';
            const testUrl = new URL('wasm_proto.js', new URL(normalizedBase, self.location.href)).href;
            
            const response = await fetch(testUrl, { method: 'HEAD', mode: 'cors' });
            if (response.ok) {
                return normalizedBase;
            }
        } catch (e) {
            // Try next candidate
            continue;
        }
        
        // Also try wasm-proto.js variant
        try {
            const normalizedBase = base.endsWith('/') ? base : base + '/';
            const testUrl = new URL('wasm-proto.js', new URL(normalizedBase, self.location.href)).href;
            
            const response = await fetch(testUrl, { method: 'HEAD', mode: 'cors' });
            if (response.ok) {
                return normalizedBase;
            }
        } catch (e) {
            continue;
        }
    }
    
    return null;
}

self.addEventListener('message', async (ev) => {
    const msg = ev.data;
    if (!msg || !msg.cmd) return;

    if (msg.cmd === 'init') {
        let base = msg.baseUrl;
        
        // Auto-detect if not provided or explicitly requested
        if (!base || base === 'auto' || base === '') {
            try {
                self.postMessage({ cmd: 'auto-detecting', requestId: msg.requestId });
                base = await autoDetectBasePath();
                
                if (!base) {
                    self.postMessage({ 
                        cmd: 'error', 
                        error: 'Could not auto-detect WASM package location. Please provide baseUrl explicitly.',
                        requestId: msg.requestId 
                    });
                    return;
                }
                
                self.postMessage({ cmd: 'auto-detected', baseUrl: base, requestId: msg.requestId });
            } catch (err) {
                self.postMessage({ 
                    cmd: 'error', 
                    error: 'Auto-detect failed: ' + String(err),
                    requestId: msg.requestId 
                });
                return;
            }
        }
        
        try {
            self.postMessage({ cmd: 'loading', baseUrl: base, requestId: msg.requestId });

            // Build candidate URLs for the ESM glue and wasm binary.
            const normalizedBase = (typeof base === 'string' && base.length && base.charAt(base.length-1) !== '/') ? base + '/' : base;
            const glueCandidates = [];
            try {
                const baseUrl = new URL(normalizedBase, self.location.href);
                glueCandidates.push(new URL('wasm_proto.js', baseUrl).href);
                glueCandidates.push(new URL('wasm-proto.js', baseUrl).href);
            } catch (e) {
                glueCandidates.push((normalizedBase || base).replace(/\/$/, '') + '/wasm_proto.js');
                glueCandidates.push((normalizedBase || base).replace(/\/$/, '') + '/wasm-proto.js');
            }

            // Try each candidate
            let chosenGlue = null;
            let lastFetchErr = null;
            for (const url of glueCandidates) {
                try {
                    const head = await fetch(url, { method: 'HEAD', mode: 'cors' });
                    if (head && head.ok) { chosenGlue = url; break; }
                    lastFetchErr = new Error(`HEAD ${url} -> ${head.status}`);
                } catch (fe) {
                    lastFetchErr = fe;
                }
            }

            if (!chosenGlue) {
                chosenGlue = glueCandidates[0];
            }

            // Dynamic import of ESM glue generated by wasm-pack
            let mod;
            try {
                mod = await import(chosenGlue);
                self.postMessage({ cmd: 'imported-glue', url: chosenGlue, requestId: msg.requestId });
            } catch (impErr) {
                const errMsg = `dynamic import failed (${chosenGlue}): ${String(impErr)}${lastFetchErr? ' | lastFetchErr: '+String(lastFetchErr):''}`;
                self.postMessage({ cmd: 'error', error: errMsg, requestId: msg.requestId });
                return;
            }

            // Initialize WASM
            try {
                const wasmUrl = (function() {
                    try { return new URL('wasm_proto_bg.wasm', chosenGlue).href; } catch (e) { return chosenGlue.replace(/\.js$/, '_bg.wasm'); }
                })();
                if (typeof mod.default === 'function') {
                    await mod.default(wasmUrl);
                } else if (typeof mod.init === 'function') {
                    await mod.init(wasmUrl);
                } else if (typeof mod.wasm_bindgen === 'function') {
                    await mod.wasm_bindgen(wasmUrl);
                }
                self.postMessage({ cmd: 'wasm-instantiated', url: wasmUrl, requestId: msg.requestId });
            } catch (wbErr) {
                self.postMessage({ cmd: 'error', error: 'wasm init failed: ' + String(wbErr), requestId: msg.requestId });
                return;
            }

            wasmModule = mod;

            // Verify exported compute function is present
            const computeFn = wasmModule.compute_double || wasmModule.computeDouble || (wasmModule.default && wasmModule.default.compute_double) || (globalThis.wasm_bindgen && globalThis.wasm_bindgen.compute_double);
            if (typeof computeFn !== 'function') {
                self.postMessage({ cmd: 'error', error: 'expected export compute_double not found', requestId: msg.requestId });
                return;
            }

            wasmReady = true;
            self.postMessage({ cmd: 'ready', requestId: msg.requestId });
        } catch (err) {
            self.postMessage({ cmd: 'error', error: String(err), requestId: msg.requestId });
        }

        return;
    }

    if (msg.cmd === 'compute') {
        if (!wasmReady || !wasmModule) { self.postMessage({ cmd: 'error', error: 'wasm not initialized', requestId: msg.requestId }); return; }
        try {
            const payload = msg.data;
            const arr = (payload instanceof Float64Array) ? payload : new Float64Array(payload);

            let out;
            if (typeof wasmModule.compute_double === 'function') out = wasmModule.compute_double(arr);
            else if (typeof wasmModule.computeDouble === 'function') out = wasmModule.computeDouble(arr);
            else if (wasmModule.default && typeof wasmModule.default.compute_double === 'function') out = wasmModule.default.compute_double(arr);
            else if (globalThis.wasm_bindgen && typeof globalThis.wasm_bindgen.compute_double === 'function') out = globalThis.wasm_bindgen.compute_double(arr);
            else throw new Error('no compute export found');

            if (out && out.buffer) {
                const buf = out.buffer;
                self.postMessage({ cmd: 'result', result: buf, requestId: msg.requestId }, [buf]);
            } else if (out instanceof ArrayBuffer) {
                self.postMessage({ cmd: 'result', result: out, requestId: msg.requestId }, [out]);
            } else {
                const a = new Float64Array(out);
                self.postMessage({ cmd: 'result', result: a.buffer, requestId: msg.requestId }, [a.buffer]);
            }
        } catch (err) {
            self.postMessage({ cmd: 'error', error: String(err), requestId: msg.requestId });
        }
        return;
    }

    if (msg.cmd === 'compute_vwap') {
        if (!wasmReady || !wasmModule) { self.postMessage({ cmd: 'error', error: 'wasm not initialized', requestId: msg.requestId }); return; }
        try {
            const prices = (msg.prices instanceof Float64Array) ? msg.prices : new Float64Array(msg.prices);
            const vols = (msg.vols instanceof Float64Array) ? msg.vols : new Float64Array(msg.vols);
            
            let out;
            if (typeof wasmModule.compute_vwap === 'function') out = wasmModule.compute_vwap(prices, vols);
            else if (wasmModule.default && typeof wasmModule.default.compute_vwap === 'function') out = wasmModule.default.compute_vwap(prices, vols);
            else if (globalThis.wasm_bindgen && typeof globalThis.wasm_bindgen.compute_vwap === 'function') out = globalThis.wasm_bindgen.compute_vwap(prices, vols);
            else throw new Error('compute_vwap export not found');

            if (out && out.buffer) {
                const buf = out.buffer;
                self.postMessage({ cmd: 'result', result: buf, requestId: msg.requestId }, [buf]);
            } else if (out instanceof ArrayBuffer) {
                self.postMessage({ cmd: 'result', result: out, requestId: msg.requestId }, [out]);
            } else {
                const a = new Float64Array(out);
                self.postMessage({ cmd: 'result', result: a.buffer, requestId: msg.requestId }, [a.buffer]);
            }
        } catch (err) {
            self.postMessage({ cmd: 'error', error: String(err), requestId: msg.requestId });
        }
        return;
    }
});
