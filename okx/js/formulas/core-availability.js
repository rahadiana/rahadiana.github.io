// Central helper for formula wrappers to detect AnalyticsCore availability
(function () {
    'use strict';

    if (typeof globalThis.__analyticsCoreAvailabilityRegistered !== 'undefined') return;
    globalThis.__analyticsCoreAvailabilityRegistered = true;

    globalThis.__ANALYTICS_CORE_WARNED = globalThis.__ANALYTICS_CORE_WARNED || false;

    function getAnalyticsCore() {
        if (typeof globalThis !== 'undefined' && globalThis.AnalyticsCore) return globalThis.AnalyticsCore;
        // Delay the warning slightly to avoid spurious logs during normal module loading.
        // If the core still isn't present after the timeout, warn once.
        if (!globalThis.__ANALYTICS_CORE_WARNED) {
            if (!globalThis.__ANALYTICS_CORE_WARN_TIMEOUT) {
                globalThis.__ANALYTICS_CORE_WARN_TIMEOUT = setTimeout(() => {
                    if (!globalThis.AnalyticsCore && !globalThis.__ANALYTICS_CORE_WARNED) {
                        globalThis.__ANALYTICS_CORE_WARNED = true;
                        console.warn('[formulas] AnalyticsCore not loaded — using fallbacks');
                    }
                    globalThis.__ANALYTICS_CORE_WARN_TIMEOUT = null;
                }, 1000);
            }
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
                    if (globalThis.__ANALYTICS_CORE_WARN_TIMEOUT) {
                        clearTimeout(globalThis.__ANALYTICS_CORE_WARN_TIMEOUT);
                        globalThis.__ANALYTICS_CORE_WARN_TIMEOUT = null;
                    }
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
