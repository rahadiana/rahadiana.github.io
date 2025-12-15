// Worker script (classic worker) - loads AnalyticsCore via importScripts and delegates tasks
'use strict';

// Load analytics core into worker global scope
try {
    importScripts('../core/analytics-core.js');
} catch (e) {
    console.error('[worker] failed to import analytics-core.js', e);
}

let EMIT_LEGACY = true;

self.onmessage = function(e) {
    const { id, type, payload } = e.data || {};
    try {
        let result;
        switch (type) {
            case 'computeSmartMetrics':
                result = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeAllSmartMetrics) ? globalThis.AnalyticsCore.computeAllSmartMetrics(payload.data) : {};
                break;

            case 'computeBatch':
                result = {};
                for (const [coin, data] of Object.entries(payload.coins || {})) {
                    const smart = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeAllSmartMetrics) ? globalThis.AnalyticsCore.computeAllSmartMetrics(data) : {};
                    result[coin] = {
                        smart,
                        volDur2h: (globalThis.AnalyticsCore && globalThis.AnalyticsCore.calculateVolDurability) ? globalThis.AnalyticsCore.calculateVolDurability(data, '2h') : null,
                        volDur24h: (globalThis.AnalyticsCore && globalThis.AnalyticsCore.calculateVolDurability) ? globalThis.AnalyticsCore.calculateVolDurability(data, '24h') : null,
                        volRatio2h: (globalThis.AnalyticsCore && globalThis.AnalyticsCore.calculateVolRatio) ? globalThis.AnalyticsCore.calculateVolRatio(data, '2h') : null
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
                result = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeMicrostructureMetrics) ? globalThis.AnalyticsCore.computeMicrostructureMetrics(payload.data) : {};
                break;

            case 'ping':
                result = { pong: true, time: Date.now() };
                break;

            case 'config':
                if (payload && typeof payload.emitLegacy !== 'undefined') {
                    EMIT_LEGACY = !!payload.emitLegacy;
                }
                result = { ok: true, emitLegacy: EMIT_LEGACY };
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
    const smart = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeAllSmartMetrics) ? globalThis.AnalyticsCore.computeAllSmartMetrics(data) : {};

    const volMetrics = {};
    const timeframes = ['1m', '5m', '10m', '15m', '20m', '30m', '1h', '2h', '24h'];
    for (const tf of timeframes) {
        volMetrics[tf] = {
            durability: (globalThis.AnalyticsCore && globalThis.AnalyticsCore.calculateVolDurability) ? globalThis.AnalyticsCore.calculateVolDurability(data, tf) : null,
            ratio: (globalThis.AnalyticsCore && globalThis.AnalyticsCore.calculateVolRatio) ? globalThis.AnalyticsCore.calculateVolRatio(data, tf) : null
        };
    }

    const hist = data && (data._history || []) ? (data._history || []) : [];

    const tier1 = {};
    if (globalThis.AnalyticsCore && typeof globalThis.AnalyticsCore.computeKyleLambda === 'function') {
        try {
            const kyle = globalThis.AnalyticsCore.computeKyleLambda(hist, { lookbackPeriods: 20, minSamples: 10, smoothingWindow: 5 });
            const vwap = globalThis.AnalyticsCore.computeVWAPBands(hist, { lookbackPeriods: 120 });
            const cvd = globalThis.AnalyticsCore.computeCVD(hist, { window: 'all', normalizationMethod: 'total' });
            const rvol = globalThis.AnalyticsCore.computeRVOL(hist, { baselinePeriods: 14 });
            if (globalThis.AnalyticsCore.computeTier1Normalized) {
                Object.assign(tier1, globalThis.AnalyticsCore.computeTier1Normalized({ kyleLambda: kyle, vwapBands: vwap, cvd: cvd, rvol: rvol }));
            } else {
                Object.assign(tier1, { kyle, vwap, cvd, rvol });
            }
        } catch (e) { /* ignore */ }
    }

    const vpin = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeVPIN) ? globalThis.AnalyticsCore.computeVPIN(hist, { lookbackBars: 50, minSamples: 10 }) : null;
    const hurst = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeHurstExponent) ? globalThis.AnalyticsCore.computeHurstExponent(hist, { minSamples: 50 }) : null;
    const vp = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeVolumeProfilePOC) ? globalThis.AnalyticsCore.computeVolumeProfilePOC(hist, { bins: 24 }) : null;
    const depth = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeDepthImbalance) ? globalThis.AnalyticsCore.computeDepthImbalance(data.snapshot || data) : null;

    return { smart, volMetrics, tier1, vpin, hurst, volumeProfile: vp, depthImbalance: depth };
}
