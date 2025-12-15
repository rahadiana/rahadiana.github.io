// ES module worker - imports AnalyticsCore as a module then delegates tasks
"use strict";

(async function() {
  // notify main thread that the module worker executed
  try { self.postMessage({ id: -2, success: true, info: 'worker-module-init', script: 'js/modules/worker.mjs' }); } catch (e) {}
  // Global error handlers for easier debugging: forward to main thread with richer serialized payloads
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
    } catch (e) { }
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
    } catch (e) { }
  });
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

  self.onmessage = async function(e) {
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
            // computeFullAnalytics may call GPU helpers asynchronously, so await
            result[coin] = await computeFullAnalytics(data);
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

  async function computeFullAnalytics(data) {
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
    let depth = null;
    if (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeDepthImbalance) {
      // depth imbalance may be CPU-only; call normally
      depth = globalThis.AnalyticsCore.computeDepthImbalance(data.snapshot || data);
    }

    // GPU-accelerated VWAP branch: if WEBGPU_CONFIG enables it and WebGPUWeight available
    let vwap = null;
    let upper = null;
    let lower = null;
    let std = null;
    if (globalThis.WebGPUWeight && globalThis.WEBGPU_CONFIG && globalThis.WEBGPU_CONFIG.enabledFunctions && globalThis.WEBGPU_CONFIG.enabledFunctions.computeVWAPBands) {
      try {
        const opts = { lookbackPeriods: 120 };
        // Try GPU path by calling a helper implemented below
        const vw = await gpuComputeVWAPBands(hist, { lookbackPeriods: 120, stdMultiplier: 2.0 });
        if (vw && vw.valid) {
          vwap = vw.vwap; upper = vw.upperBand; lower = vw.lowerBand; std = vw.std;
        }
      } catch (e) {
        // fall back to CPU implementation below
        vwap = null;
      }
    }

    // If GPU path didn't set vwap, compute on CPU as before
    if (vwap === null) {
      const cpuVW = (globalThis.AnalyticsCore && globalThis.AnalyticsCore.computeVWAPBands) ? globalThis.AnalyticsCore.computeVWAPBands(hist, { lookbackPeriods: 120 }) : null;
      if (cpuVW && cpuVW.valid) {
        vwap = cpuVW.vwap; upper = cpuVW.upperBand; lower = cpuVW.lowerBand; std = cpuVW.std;
      }
    }

    // GPU-accelerated CVD
    if (globalThis.WebGPUWeight && globalThis.WEBGPU_CONFIG && globalThis.WEBGPU_CONFIG.enabledFunctions && globalThis.WEBGPU_CONFIG.enabledFunctions.computeCVD) {
      try {
        const gcvd = await gpuComputeCVD(hist, { window: 'all', normalizationMethod: 'total' });
        if (gcvd && gcvd.valid) cvd = gcvd;
      } catch (e) { /* ignore and keep CPU cvd below */ }
    }

    // GPU-accelerated RVOL
    if (globalThis.WebGPUWeight && globalThis.WEBGPU_CONFIG && globalThis.WEBGPU_CONFIG.enabledFunctions && globalThis.WEBGPU_CONFIG.enabledFunctions.computeRVOL) {
      try {
        const gr = await gpuComputeRVOL(hist, { baselinePeriods: 14 });
        if (gr && gr.valid) rvol = gr;
      } catch (e) { /* ignore and keep CPU rvol below */ }
    }

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

  // GPU helper: compute CVD (cumulative volume delta) using WebGPU sums where possible
  async function gpuComputeCVD(history, opts = {}) {
    const windowOpt = opts.window || 'all';
    const normalization = opts.normalizationMethod || 'total';
    if (!history || !history.length) return { valid: false, reason: 'INSUFFICIENT_DATA' };

    const slice = history.slice(- (windowOpt === 'all' ? history.length : windowOpt));
    const buys = new Float32Array(slice.length);
    const sells = new Float32Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      const p = slice[i];
      buys[i] = Number(p.volBuy2h) || Number(p.buy) || Number(p.vol_buy) || 0;
      sells[i] = Number(p.volSell2h) || Number(p.sell) || Number(p.vol_sell) || 0;
    }

    let sumBuys = 0, sumSells = 0, totalVol = 0;
    try {
      sumBuys = await globalThis.WebGPUWeight.computeSum(buys);
      sumSells = await globalThis.WebGPUWeight.computeSum(sells);
      // totalVol uses absolute values
      const absBuys = buys.map(v => Math.abs(v));
      const absSells = sells.map(v => Math.abs(v));
      totalVol = await globalThis.WebGPUWeight.computeSum(new Float32Array(absBuys)) + await globalThis.WebGPUWeight.computeSum(new Float32Array(absSells));
    } catch (e) {
      // fallback CPU
      for (let i = 0; i < buys.length; i++) { sumBuys += buys[i]; sumSells += sells[i]; totalVol += Math.abs(buys[i]) + Math.abs(sells[i]); }
    }

    const cvd = sumBuys - sumSells;
    let normalized = cvd;
    if (normalization === 'total' && totalVol > 0) normalized = cvd / totalVol;

    const absNorm = Math.abs(normalized);
    let trend = 'NEUTRAL';
    if (absNorm > 0.05) trend = (normalized > 0) ? 'ACCUMULATION' : 'DISTRIBUTION';
    const strength = absNorm > 0.2 ? 'STRONG' : absNorm > 0.08 ? 'MODERATE' : 'WEAK';

    return { valid: true, value: cvd, normalized, trend, strength, className: trend === 'ACCUMULATION' ? 'text-success' : (trend === 'DISTRIBUTION' ? 'text-danger' : 'text-muted') };
  }

  // GPU helper: compute RVOL (relative volume) using GPU sums where possible
  async function gpuComputeRVOL(history, opts = {}) {
    const baselinePeriods = opts.baselinePeriods || 14;
    const minSamples = opts.minSamplesRequired || 10;
    if (!history || history.length < minSamples) return { valid: false, reason: 'INSUFFICIENT_DATA' };

    const slice = history.slice(-Math.max(baselinePeriods, 1) - 1);
    const vols = [];
    for (const p of slice.slice(0, -1)) {
      const vol = (Number(p.volBuy2h) || 0) + (Number(p.volSell2h) || 0) || Number(p.vol) || 0;
      vols.push(Math.max(vol, 1));
    }
    const volArr = new Float32Array(vols);
    let baseline = 1;
    try {
      const sum = await globalThis.WebGPUWeight.computeSum(volArr);
      baseline = volArr.length ? sum / volArr.length : 1;
    } catch (e) {
      const sum = volArr.reduce((s, v) => s + v, 0);
      baseline = volArr.length ? sum / volArr.length : 1;
    }
    const last = slice.length ? slice[slice.length - 1] : null;
    const current = last ? ((Number(last.volBuy2h) || 0) + (Number(last.volSell2h) || 0) || Number(last.vol) || 0) : 0;
    const value = baseline > 0 ? (current / baseline) : null;
    let significance = 'NONE';
    if (!value || value < 1.2) significance = 'LOW';
    else if (value < 2.0) significance = 'MODERATE';
    else significance = 'HIGH';

    return { valid: true, value, baseline, current, significance, className: significance === 'HIGH' ? 'text-warning fw-bold' : (significance === 'MODERATE' ? 'text-warning' : 'text-muted') };
  }

  // GPU helper used by computeFullAnalytics: compute VWAP bands using WebGPU for heavy sums
  async function gpuComputeVWAPBands(history, opts = {}) {
    if (!history || !history.length) return { valid: false, reason: 'INSUFFICIENT_DATA' };
    const lookback = opts.lookbackPeriods || 120;
    const slice = history.slice(-lookback);

    const prices = [];
    const vols = [];
    for (const p of slice) {
      const price = Number(p.price) || Number(p.last) || 0;
      const vol = (Number(p.volBuy2h) || 0) + (Number(p.volSell2h) || 0) || (Number(p.vol) || 0) || 0;
      if (price && vol) {
        prices.push(price);
        vols.push(vol);
      }
    }
    if (!prices.length) return { valid: false, reason: 'NO_PRICES' };

    const a = new Float32Array(prices);
    const b = new Float32Array(vols);

    // compute num = sum(price * vol) and den = sum(vol) using GPU helpers
    let num = 0, den = 0;
    try {
      const prod = await globalThis.WebGPUWeight.computeElementwiseMul(a, b);
      num = prod.reduce((s, v) => s + v, 0);
      den = await globalThis.WebGPUWeight.computeSum(b);
    } catch (e) {
      // fallback to CPU
      for (let i = 0; i < a.length; i++) {
        num += a[i] * b[i];
        den += b[i];
      }
    }

    const vwap = den > 0 ? num / den : (prices.length ? prices[prices.length - 1] : 0);
    // compute variance/std on CPU for now
    let varNum = 0;
    for (let i = 0; i < a.length; i++) {
      varNum += b[i] * Math.pow(a[i] - vwap, 2);
    }
    const std = den > 0 ? Math.sqrt(varNum / den) : 0;

    const stdMultiplier = opts.stdMultiplier || 2.0;
    const mult = stdMultiplier;
    const upper = vwap + mult * std;
    const lower = vwap - mult * std;

    return { valid: true, vwap, upperBand: upper, lowerBand: lower, std };
  }

})().catch(e => {
  // Attach a final catch to the IIFE promise so any unhandled rejection during module init is forwarded
  try {
    const payload = { message: e && e.message ? String(e.message) : String(e), stack: e && e.stack ? e.stack : undefined };
    self.postMessage({ id: -1, success: false, error: payload });
    self.postMessage({ id: -2, init: false, error: String(e) });
  } catch (err) { /* ignore */ }
});
