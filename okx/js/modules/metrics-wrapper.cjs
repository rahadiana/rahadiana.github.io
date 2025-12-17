// CommonJS compatibility wrapper for metrics wrapper
(function(){
  function _n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
  function preferCore(name, ...args) {
    try {
      const core = (typeof globalThis !== 'undefined' ? globalThis.AnalyticsCore : null) || (typeof window !== 'undefined' ? window.AnalyticsCore : null);
      if (core && typeof core[name] === 'function') return core[name](...args);
    } catch (e){}
    return null;
  }
  function requireDerived() {
    try {
      if (typeof window !== 'undefined' && window.derivedMetrics) return window.derivedMetrics;
      if (typeof require === 'function') return require('./derived-metrics');
    } catch (e){}
    return null;
  }
  function computeCVD(history, opts) {
    const coreRes = preferCore('computeCVD', history, opts || {});
    if (coreRes !== null && typeof coreRes !== 'undefined') return coreRes;
    const dm = requireDerived();
    if (dm && typeof dm.computeCVD === 'function') return dm.computeCVD(history, opts || {});
    return { valid: false };
  }
  function computeVWAP(bars, opts) {
    const coreRes = preferCore('computeVWAPBands', bars, opts || {});
    if (coreRes !== null && typeof coreRes !== 'undefined') return coreRes;
    const dm = requireDerived();
    if (dm && typeof dm.computeVWAP === 'function') return dm.computeVWAP(bars, opts || {});
    return { valid: false };
  }
  function computeVWAPBands(bars, opts) { return computeVWAP(bars, opts); }
  function computeATR(bars, period) {
    const coreRes = preferCore('computeATR', bars, period || 14);
    if (coreRes !== null && typeof coreRes !== 'undefined') return coreRes;
    const dm = requireDerived();
    if (dm && typeof dm.computeATR === 'function') return dm.computeATR(bars, period || 14);
    return { valid: false };
  }
  function computeRVOL(history, opts) {
    const coreRes = preferCore('computeRVOL', history, opts || {});
    if (coreRes !== null && typeof coreRes !== 'undefined') return coreRes;
    const dm = requireDerived();
    if (dm && typeof dm.computeRVOL === 'function') return dm.computeRVOL(history, opts || {});
    return { valid: false };
  }
  function averageTradeSize(volBuy, freqBuy, volSell, freqSell) {
    try { const coreRes = preferCore('averageTradeSize', volBuy, freqBuy, volSell, freqSell); if (coreRes !== null) return coreRes; } catch (e) {}
    const dm = requireDerived();
    if (dm && typeof dm.averageTradeSize === 'function') return dm.averageTradeSize(volBuy, freqBuy, volSell, freqSell);
    return { avgBuy: 0, avgSell: 0, tradeSizeRatio: 0 };
  }
  function fundingAPR(rate, intervalsPerDay) { try { const coreRes = preferCore('fundingAPR', rate, intervalsPerDay); if (coreRes !== null) return coreRes; } catch (e) {} const dm = requireDerived(); if (dm && typeof dm.fundingAPR === 'function') return dm.fundingAPR(rate, intervalsPerDay); return 0; }
  function timeToFunding(nextTs) { try { const coreRes = preferCore('timeToFunding', nextTs); if (coreRes !== null) return coreRes; } catch (e) {} const dm = requireDerived(); if (dm && typeof dm.timeToFunding === 'function') return dm.timeToFunding(nextTs); return { ms: 0, seconds: 0, minutes: 0, hours: 0, human: 'now' }; }
  function computeKyleLambda(history, opts) { const coreRes = preferCore('computeKyleLambda', history, opts || {}); return coreRes === null ? undefined : coreRes; }
  function computeTier1Normalized(obj) { const coreRes = preferCore('computeTier1Normalized', obj); return coreRes === null ? undefined : coreRes; }
  function computeVPIN(history, opts) { const coreRes = preferCore('computeVPIN', history, opts || {}); return coreRes === null ? undefined : coreRes; }
  function computeHurstExponent(history, opts) { const coreRes = preferCore('computeHurstExponent', history, opts || {}); return coreRes === null ? undefined : coreRes; }
  function computeVolumeProfilePOC(history, opts) { const coreRes = preferCore('computeVolumeProfilePOC', history, opts || {}); return coreRes === null ? undefined : coreRes; }
  function computeDepthImbalance(snapshot) { const coreRes = preferCore('computeDepthImbalance', snapshot); return coreRes === null ? undefined : coreRes; }
  function calculateVolDurability(data, tf) { const coreRes = preferCore('calculateVolDurability', data, tf); return coreRes === null ? undefined : coreRes; }
  function calculateVolRatio(data, tf) { const coreRes = preferCore('calculateVolRatio', data, tf); return coreRes === null ? undefined : coreRes; }
  function computeAllSmartMetrics(data) { const coreRes = preferCore('computeAllSmartMetrics', data); return coreRes === null ? undefined : coreRes; }
  function computeMicrostructureMetrics(data) {
    const coreRes = preferCore('computeMicrostructureMetrics', data);
    if (coreRes === null) return undefined;
    if (coreRes && typeof coreRes === 'object') {
      const keys = ['cohesion','accVol','fbi','ofsi','fsi','zPress','tim','cis','lsi','rangeComp','pfci'];
      const out = Object.assign({}, coreRes);
      for (const k of keys) out[k] = _n(coreRes[k]);
      return out;
    }
    return coreRes;
  }
  const w = { computeCVD, computeVWAP, computeVWAPBands, computeATR, computeRVOL, averageTradeSize, fundingAPR, timeToFunding, computeKyleLambda, computeTier1Normalized, computeVPIN, computeHurstExponent, computeVolumeProfilePOC, computeDepthImbalance, calculateVolDurability, calculateVolRatio, computeAllSmartMetrics, computeMicrostructureMetrics };
  try { if (typeof window !== 'undefined') window.metricsWrapper = w; } catch (e) {}
  if (typeof module !== 'undefined' && module.exports) module.exports = w;
})();
