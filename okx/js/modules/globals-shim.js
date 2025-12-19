(function(){
    'use strict';

    // Single guarded shim to centralize safe access to formerly widespread globals.
    // Exposes a single namespaced object on `window.__okxShim` to reduce scatter of window.* accesses.
    const shim = {
        getWorkerPool: function() {
            try { return shim.__workerPool || ((typeof window !== 'undefined' && window.workerPool) ? window.workerPool : null); } catch (e) { return null; }
        },
        setWorkerPool: function(wp) {
            try { shim.__workerPool = wp; if (typeof window !== 'undefined' && !window.workerPool) try { window.workerPool = wp; } catch (e) { } } catch (e) { }
        },
        getCoinDataMap: function() {
            try { return shim.__coinDataMap || ((typeof window !== 'undefined' && window.coinDataMap) ? window.coinDataMap : {}); } catch (e) { return {}; }
        },
        setCoinDataMap: function(map) {
            try { shim.__coinDataMap = map || {}; if (typeof window !== 'undefined') try { window.coinDataMap = map || {}; } catch (e) { } } catch (e) { }
        },
        getWEBGPUConfig: function() {
            try { if (typeof window !== 'undefined' && typeof window.getWEBGPUConfig === 'function') return window.getWEBGPUConfig(); return (typeof window !== 'undefined' && window.WEBGPU_CONFIG) ? window.WEBGPU_CONFIG : null; } catch (e) { return null; }
        },
        setWEBGPUConfig: function(cfg) {
            try { shim.__webgpuConfig = cfg || null; if (typeof window !== 'undefined') try { window.WEBGPU_CONFIG = cfg || null; } catch (e) { } } catch (e) { }
        },
        // small helper for compatibility: read or write a shared scheduleUpdateTable if needed
        getScheduleUpdateTable: function() {
            try { return (typeof window !== 'undefined' && typeof window.scheduleUpdateTable === 'function') ? window.scheduleUpdateTable : null; } catch (e) { return null; }
        },
        setScheduleUpdateTable: function(fn) {
            try { if (typeof window !== 'undefined') window.scheduleUpdateTable = fn; } catch (e) { }
        }
        ,
        // Alerts helpers: small safe accessors to shared alert buffers/flags
        getHiddenAlertBuffer: function() {
            try { return (typeof window !== 'undefined' && window._hiddenAlertBuffer) ? window._hiddenAlertBuffer : (window._hiddenAlertBuffer = []); } catch (e) { return (window._hiddenAlertBuffer = []); }
        },
        getPersistHistoryEnabled: function() {
            try { return (typeof window !== 'undefined' && typeof window.persistHistoryEnabled !== 'undefined') ? window.persistHistoryEnabled : false; } catch (e) { return false; }
        },
        setPersistHistoryEnabled: function(val) {
            try { if (typeof window !== 'undefined') window.persistHistoryEnabled = !!val; } catch (e) { }
        },
        // allow modules to register alert helper functions for centralized discovery
        setAlertHelpers: function(obj) {
            try { shim.__alertHelpers = obj || {}; } catch (e) { }
        }
    };

    try { if (typeof window !== 'undefined' && !window.__okxShim) window.__okxShim = shim; } catch (e) {}
})();
