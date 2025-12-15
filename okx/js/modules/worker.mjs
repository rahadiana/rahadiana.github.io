// ES module worker - imports AnalyticsCore as a module then delegates tasks
"use strict";

(async function() {
  try {
    // Prefer ES module re-export wrapper which provides named helpers
    const mod = await import('../core/analytics-core.esm.mjs');
    // Bind named functions into local scope for faster access
    var {
      computeAllSmartMetrics,
      computeKyleLambda,
      computeVWAPBands,
      computeCVD,
      computeRVOL,
      computeTier1Normalized,
      computeVPIN,
      computeHurstExponent,
      computeVolumeProfilePOC,
      computeDepthImbalance,
      calculateVolDurability,
      calculateVolRatio
    } = mod;
  } catch (e) {
    // Fallback to legacy global-based access
    try { await import('../core/analytics-core.js'); } catch (err) { console.error('[worker.mjs] failed to import analytics core', err); }
    // ensure functions reference globalThis.AnalyticsCore
    computeAllSmartMetrics = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeAllSmartMetrics ? globalThis.AnalyticsCore.computeAllSmartMetrics(...a) : undefined;
    computeKyleLambda = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeKyleLambda ? globalThis.AnalyticsCore.computeKyleLambda(...a) : undefined;
    computeVWAPBands = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeVWAPBands ? globalThis.AnalyticsCore.computeVWAPBands(...a) : undefined;
    computeCVD = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeCVD ? globalThis.AnalyticsCore.computeCVD(...a) : undefined;
    computeRVOL = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeRVOL ? globalThis.AnalyticsCore.computeRVOL(...a) : undefined;
    computeTier1Normalized = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeTier1Normalized ? globalThis.AnalyticsCore.computeTier1Normalized(...a) : undefined;
    computeVPIN = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeVPIN ? globalThis.AnalyticsCore.computeVPIN(...a) : undefined;
    computeHurstExponent = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeHurstExponent ? globalThis.AnalyticsCore.computeHurstExponent(...a) : undefined;
    computeVolumeProfilePOC = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeVolumeProfilePOC ? globalThis.AnalyticsCore.computeVolumeProfilePOC(...a) : undefined;
    computeDepthImbalance = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeDepthImbalance ? globalThis.AnalyticsCore.computeDepthImbalance(...a) : undefined;
    calculateVolDurability = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.calculateVolDurability ? globalThis.AnalyticsCore.calculateVolDurability(...a) : undefined;
    calculateVolRatio = (...a) => globalThis.AnalyticsCore && globalThis.AnalyticsCore.calculateVolRatio ? globalThis.AnalyticsCore.calculateVolRatio(...a) : undefined;
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
    let kyle, vwap, cvd, rvol;
    if (globalThis.AnalyticsCore && typeof globalThis.AnalyticsCore.computeKyleLambda === 'function') {
      try {
        kyle = globalThis.AnalyticsCore.computeKyleLambda(hist, { lookbackPeriods: 20, minSamples: 10, smoothingWindow: 5 });
        vwap = globalThis.AnalyticsCore.computeVWAPBands(hist, { lookbackPeriods: 120 });
        cvd = globalThis.AnalyticsCore.computeCVD(hist, { window: 'all', normalizationMethod: 'total' });
        rvol = globalThis.AnalyticsCore.computeRVOL(hist, { baselinePeriods: 14 });
        if (globalThis.AnalyticsCore.computeTier1Normalized) {
          Object.assign(tier1, globalThis.AnalyticsCore.computeTier1Normalized({ kyleLambda: kyle, vwapBands: vwap, cvd: cvd, rvol: rvol }));
        } else {
          Object.assign(tier1, { kyle, vwap, cvd, rvol });
        }
        // Normalize tier1 numeric scores into objects with `.normalized` for parity with main-thread shape
        for (const k of ['kyle','vwap','cvd','rvol']) {
          if (tier1 && Object.prototype.hasOwnProperty.call(tier1, k) && typeof tier1[k] === 'number') {
            tier1[k] = { normalized: tier1[k] };
          }
        }
      } catch (e) { /* ignore */ }
    }

    const vpin = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeVPIN) ? globalThis.AnalyticsCore.computeVPIN(hist, { lookbackBars: 50, minSamples: 10 }) : null;
    const hurst = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeHurstExponent) ? globalThis.AnalyticsCore.computeHurstExponent(hist, { minSamples: 50 }) : null;
    const vp = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeVolumeProfilePOC) ? globalThis.AnalyticsCore.computeVolumeProfilePOC(hist, { bins: 24 }) : null;
    const depth = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeDepthImbalance) ? globalThis.AnalyticsCore.computeDepthImbalance(data.snapshot || data) : null;

    // Emit top-level keys to match main-thread AnalyticsCore output shape
    return {
      smart,
      volMetrics,
      // detailed metric objects
      kyle: (typeof kyle !== 'undefined' ? kyle : (tier1 && tier1.kyle ? tier1.kyle : null)),
      vwap: (typeof vwap !== 'undefined' ? vwap : (tier1 && tier1.vwap ? tier1.vwap : null)),
      cvd: (typeof cvd !== 'undefined' ? cvd : (tier1 && tier1.cvd ? tier1.cvd : null)),
      rvol: (typeof rvol !== 'undefined' ? rvol : (tier1 && tier1.rvol ? tier1.rvol : null)),
      // legacy/summary fields
      tier1,
      vpin,
      hurst,
      vp,
      depth
    };
  }

})();
