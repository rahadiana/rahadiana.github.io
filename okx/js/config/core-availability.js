// Central helper for formula wrappers to detect AnalyticsCore availability
(function () {
    'use strict';

    if (typeof globalThis.__analyticsCoreAvailabilityRegistered !== 'undefined') return;
    globalThis.__analyticsCoreAvailabilityRegistered = true;

    globalThis.__ANALYTICS_CORE_WARNED = globalThis.__ANALYTICS_CORE_WARNED || false;

    function getAnalyticsCore() {
        if (typeof globalThis !== 'undefined' && globalThis.AnalyticsCore) return globalThis.AnalyticsCore;
        if (!globalThis.__ANALYTICS_CORE_WARNED) {
            globalThis.__ANALYTICS_CORE_WARNED = true;
            console.warn('[formulas] AnalyticsCore not loaded — using fallbacks');
        }
        return null;
    }

    function waitForAnalyticsCore(timeoutMs = 2000) {
        return new Promise((resolve) => {
            if (typeof globalThis !== 'undefined' && globalThis.AnalyticsCore) return resolve(globalThis.AnalyticsCore);
            const start = Date.now();
            const iv = setInterval(() => {
                if (typeof globalThis !== 'undefined' && globalThis.AnalyticsCore) {
                    clearInterval(iv);
                    return resolve(globalThis.AnalyticsCore);
                }
                if (Date.now() - start > timeoutMs) {
                    clearInterval(iv);
                    return resolve(null);
                }
            }, 50);
        });
    }

    globalThis.getAnalyticsCore = getAnalyticsCore;
    globalThis.waitForAnalyticsCore = waitForAnalyticsCore;

})();
