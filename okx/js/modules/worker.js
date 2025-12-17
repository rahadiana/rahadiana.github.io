// Worker script (classic worker) - loads AnalyticsCore via importScripts and delegates tasks
'use strict';

// Load analytics core into worker global scope
try {
    importScripts('../core/analytics-core.js');
} catch (e) {
    console.error('[worker] failed to import analytics-core.js', e);
}

// Notify main thread that worker script executed (helps diagnose load/import errors)
try {
    self.postMessage({ id: -2, success: true, info: 'worker-classic-init', script: 'js/modules/worker.js' });
} catch (e) { /* ignore */ }

// Load WebGPU config first so helper can read flags — wrap loads to surface precise failures
try {
    try {
        importScripts('../config/webgpu-config.js');
    } catch (err) {
        self.postMessage({ id: -1, phase: 'import-webgpu-config', success: false, error: String(err), stack: err && err.stack ? err.stack : undefined });
        throw err;
    }
    try {
        importScripts('webgpu-weight.js');
    } catch (err) {
        // non-fatal but still report exact failure
        self.postMessage({ id: -1, phase: 'import-webgpu-weight', success: false, error: String(err), stack: err && err.stack ? err.stack : undefined });
    }
} catch (e) {
    // If config load failed we rethrow to make the failure obvious in dev tools
    throw e;
}
let EMIT_LEGACY = true;
// Helper: prefer centralized metrics wrapper if present (some environments may set `metricsWrapper` on global)
function preferWrapper(fnName, ...args) {
    try {
        const mw = (typeof globalThis !== 'undefined' ? globalThis.metricsWrapper : null);
        if (mw && typeof mw[fnName] === 'function') {
            const r = mw[fnName](...args);
            if (typeof r !== 'undefined') return r;
        }
    } catch (e) { /* swallow */ }
    try {
        if (globalThis.AnalyticsCore && typeof globalThis.AnalyticsCore[fnName] === 'function') {
            return globalThis.AnalyticsCore[fnName](...args);
        }
    } catch (e) { /* swallow */ }
    return undefined;
}
// Global error handlers to forward detailed errors to main thread for easier debugging
self.addEventListener('error', function (ev) {
    try {
        const payload = {
            message: ev && ev.message ? String(ev.message) : (ev && ev.type ? String(ev.type) : String(ev)),
            filename: ev && ev.filename ? ev.filename : undefined,
            lineno: ev && ev.lineno ? ev.lineno : undefined,
            colno: ev && ev.colno ? ev.colno : undefined,
            stack: ev && ev.error && ev.error.stack ? ev.error.stack : undefined,
            type: ev && ev.type ? ev.type : 'error'
        };
        self.postMessage({ id: -1, success: false, error: payload });
    } catch (e) { /* ignore */ }
});

self.addEventListener('unhandledrejection', function (ev) {
    try {
        const reason = ev && ev.reason ? ev.reason : ev;
        const payload = {
            message: reason && reason.message ? String(reason.message) : String(reason),
            stack: reason && reason.stack ? reason.stack : undefined,
            type: ev && ev.type ? ev.type : 'unhandledrejection'
        };
        self.postMessage({ id: -1, success: false, error: payload });
    } catch (e) { /* ignore */ }
});

self.onmessage = function(e) {
    const { id, type, payload } = e.data || {};
    try {
        let result;
        switch (type) {
            case 'computeSmartMetrics':
                result = preferWrapper('computeAllSmartMetrics', payload.data) || {};
                break;

            case 'computeBatch':
                result = {};
                for (const [coin, data] of Object.entries(payload.coins || {})) {
                    const smart = preferWrapper('computeAllSmartMetrics', data) || {};
                    result[coin] = {
                        smart,
                        volDur2h: preferWrapper('calculateVolDurability', data, '2h') || null,
                        volDur24h: preferWrapper('calculateVolDurability', data, '24h') || null,
                        volRatio2h: preferWrapper('calculateVolRatio', data, '2h') || null
                    };
                }
                break;

            case 'computeAnalyticsBatch':
                result = {};
                for (const [coin, data] of Object.entries(payload.coins || {})) {
                    result[coin] = computeFullAnalytics(data);
                }
                break;

            case 'computeMicrostructure':
                result = preferWrapper('computeMicrostructureMetrics', payload.data) || {};
                break;

            case 'ping':
                result = { pong: true, time: Date.now() };
                break;

            case 'config':
                if (payload && typeof payload.emitLegacy !== 'undefined') {
                    EMIT_LEGACY = !!payload.emitLegacy;
                }
                // Accept webgpu config broadcasts from main thread
                if (payload && payload.webgpu) {
                    try { globalThis.WEBGPU_CONFIG = payload.webgpu; } catch (e) { /* ignore */ }
                }
                result = { ok: true, emitLegacy: EMIT_LEGACY, webgpu: globalThis.WEBGPU_CONFIG || null };
                break;

            default:
                throw new Error('Unknown task type: ' + type);
        }

        self.postMessage({ id, success: true, result });
    } catch (error) {
        self.postMessage({ id, success: false, error: error && error.message ? error.message : String(error) });
    }
};

function computeFullAnalytics(data) {
    const smart = preferWrapper('computeAllSmartMetrics', data) || {};

    const volMetrics = {};
    const timeframes = ['1m', '5m', '10m', '15m', '20m', '30m', '1h', '2h', '24h'];
    for (const tf of timeframes) {
        volMetrics[tf] = {
            durability: preferWrapper('calculateVolDurability', data, tf) || null,
            ratio: preferWrapper('calculateVolRatio', data, tf) || null
        };
    }

    const hist = data && (data._history || []) ? (data._history || []) : [];

    const tier1 = {};
    try {
        const kyle = preferWrapper('computeKyleLambda', hist, { lookbackPeriods: 20, minSamples: 10, smoothingWindow: 5 });
        const vwap = preferWrapper('computeVWAPBands', hist, { lookbackPeriods: 120 });
        const cvd = preferWrapper('computeCVD', hist, { window: 'all', normalizationMethod: 'total' });
        const rvol = preferWrapper('computeRVOL', hist, { baselinePeriods: 14 });
        const tierNormalized = preferWrapper('computeTier1Normalized', { kyleLambda: kyle, vwapBands: vwap, cvd: cvd, rvol: rvol });
        if (tierNormalized) Object.assign(tier1, tierNormalized); else Object.assign(tier1, { kyle, vwap, cvd, rvol });
    } catch (e) { /* ignore */ }
    // Ensure tier1 numeric scores are normalized into objects with `.normalized` for parity
    try {
        for (const k of ['kyle', 'vwap', 'cvd', 'rvol']) {
            if (tier1 && Object.prototype.hasOwnProperty.call(tier1, k) && typeof tier1[k] === 'number') {
                tier1[k] = { normalized: tier1[k] };
            }
            // If it's an object but missing `.normalized`, and contains a numeric value field, normalize it
            if (tier1 && Object.prototype.hasOwnProperty.call(tier1, k) && tier1[k] && typeof tier1[k] === 'object' && typeof tier1[k].normalized === 'undefined') {
                if (typeof tier1[k].value === 'number') tier1[k].normalized = tier1[k].value;
            }
        }
    } catch (e) { /* ignore */ }

    const vpin = preferWrapper('computeVPIN', hist, { lookbackBars: 50, minSamples: 10 }) || null;
    const hurst = preferWrapper('computeHurstExponent', hist, { minSamples: 50 }) || null;
    const vp = preferWrapper('computeVolumeProfilePOC', hist, { bins: 24 }) || null;
    const depth = preferWrapper('computeDepthImbalance', data.snapshot || data) || null;

    return { smart, volMetrics, tier1, vpin, hurst, volumeProfile: vp, depthImbalance: depth };
}
