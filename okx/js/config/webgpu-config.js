/*
 WebGPU configuration flags.
 Toggle which functions may use WebGPU when available.
 Loaded into worker and main thread as `globalThis.WEBGPU_CONFIG`.
*/
(function(global){
    'use strict';

    const STORAGE_KEY = 'okx_webgpu_config_v1';

    const DEFAULT = {
        // master switch: allow usage of WebGPU if available
        enabled: true,

        // per-function overrides (true = prefer GPU when available)
        enabledFunctions: {
            computeMultiply: true,
            computeSum: true,
            computeElementwiseMul: true,
            // Add app-specific function names here if you implement GPU versions:
            computeVWAPBands: true,
            computeCVD: true,
            computeRVOL: true,

            computeAllSmartMetrics: true,
            calculateVolDurability: true,
            calculateVolRatio: true,
        }
    };

    function loadFromStorage() {
        try {
            const raw = (global.localStorage && global.localStorage.getItem(STORAGE_KEY)) || null;
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[WebGPUConfig] failed to read localStorage', e);
            return null;
        }
    }

    function saveToStorage(cfg) {
        try {
            if (!global.localStorage) return;
            global.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        } catch (e) {
            console.warn('[WebGPUConfig] failed to save localStorage', e);
        }
    }

    function mergeDefaults(stored) {
        if (!stored) return JSON.parse(JSON.stringify(DEFAULT));
        const merged = JSON.parse(JSON.stringify(DEFAULT));
        if (typeof stored.enabled === 'boolean') merged.enabled = stored.enabled;
        if (stored.enabledFunctions && typeof stored.enabledFunctions === 'object') {
            for (const k of Object.keys(merged.enabledFunctions)) {
                if (typeof stored.enabledFunctions[k] === 'boolean') merged.enabledFunctions[k] = stored.enabledFunctions[k];
            }
        }
        return merged;
    }

    // initialize global config from localStorage (if present) and expose helpers
    const stored = loadFromStorage();
    const initial = mergeDefaults(stored);
    global.WEBGPU_CONFIG = initial;

    // Expose helper to update config and optionally persist
    global.setWEBGPUConfig = function(cfg, persist = true) {
        try {
            const current = global.WEBGPU_CONFIG || mergeDefaults(null);
            const merged = Object.assign({}, current, cfg || {});
            if (cfg && cfg.enabledFunctions && typeof cfg.enabledFunctions === 'object') {
                merged.enabledFunctions = Object.assign({}, current.enabledFunctions, cfg.enabledFunctions);
            }
            global.WEBGPU_CONFIG = merged;
            if (persist) saveToStorage(merged);
            // broadcast to workerPool if available
            try { if (global.window && window.workerPool && typeof window.workerPool.setWebGPUConfig === 'function') window.workerPool.setWebGPUConfig(merged); } catch (e) {}
            return merged;
        } catch (e) {
            console.warn('[WebGPUConfig] setWEBGPUConfig failed', e);
            throw e;
        }
    };

    global.getWEBGPUConfig = function() { return global.WEBGPU_CONFIG || mergeDefaults(null); };

    global.toggleWEBGPU = function(enabled, persist = true) { return global.setWEBGPUConfig({ enabled: !!enabled }, persist); };

})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this));
