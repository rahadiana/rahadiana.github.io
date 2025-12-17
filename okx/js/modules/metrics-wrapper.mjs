// Central metrics wrapper (ESM): unified entrypoint for VWAP, CVD, ATR, RVOL, and helpers
/* eslint-disable no-empty */
function _n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }

function preferCore(name, ...args) {
    try {
        const core = (typeof window !== 'undefined' && window.AnalyticsCore) ? window.AnalyticsCore : (typeof globalThis !== 'undefined' ? globalThis.AnalyticsCore : null);
        if (core && typeof core[name] === 'function') return core[name](...args);
    } catch (e) { }
    return null;
}

function requireDerived() {
    try {
        if (typeof window !== 'undefined' && window.derivedMetrics) return window.derivedMetrics;
        if (typeof require === 'function') return require('./derived-metrics');
    } catch (e) {}
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

function computeVWAPBands(bars, opts) {
    return computeVWAP(bars, opts);
}

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

function fundingAPR(rate, intervalsPerDay) {
    try { const coreRes = preferCore('fundingAPR', rate, intervalsPerDay); if (coreRes !== null) return coreRes; } catch (e) {}
    const dm = requireDerived();
    if (dm && typeof dm.fundingAPR === 'function') return dm.fundingAPR(rate, intervalsPerDay);
    return 0;
}

function timeToFunding(nextTs) {
    try { const coreRes = preferCore('timeToFunding', nextTs); if (coreRes !== null) return coreRes; } catch (e) {}
    const dm = requireDerived();
    if (dm && typeof dm.timeToFunding === 'function') return dm.timeToFunding(nextTs);
    return { ms: 0, seconds: 0, minutes: 0, hours: 0, human: 'now' };
}

// Additional pass-throughs for worker/common needs
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

const w = {
    computeCVD,
    computeVWAP,
    computeVWAPBands,
    computeATR,
    computeRVOL,
    averageTradeSize,
    fundingAPR,
    timeToFunding,
    computeKyleLambda,
    computeTier1Normalized,
    computeVPIN,
    computeHurstExponent,
    computeVolumeProfilePOC,
    computeDepthImbalance,
    calculateVolDurability,
    calculateVolRatio,
    computeAllSmartMetrics,
    computeMicrostructureMetrics
};

// ---- Additional derived metrics requested in task: ----
function computeVolumeSpikeQuality(data, opts) {
    const tf = (opts && opts.timeframe) ? opts.timeframe : '2JAM';
    const buyKey = `vol_buy_${tf}`;
    const sellKey = `vol_sell_${tf}`;
    const avgBuyKey = `avg_VOLCOIN_buy_${tf}`;
    const avgSellKey = `avg_VOLCOIN_sell_${tf}`;

    const volBuy = _n(data[buyKey]);
    const volSell = _n(data[sellKey]);
    const avgBuy = _n(data[avgBuyKey]);
    const avgSell = _n(data[avgSellKey]);

    const currentVol = volBuy + volSell;
    const avgVol = avgBuy + avgSell;
    const ratio = avgVol > 0 ? currentVol / avgVol : 0;
    const priceChange = Number(data.percent_change || 0);

    let interpretation = 'NORMAL';
    if (ratio < 0.3 && Math.abs(priceChange) < 2) {
        interpretation = 'DEAD_CAT_BOUNCE';
    } else if (ratio < 0.3 && priceChange > 3) {
        interpretation = 'STEALTH_ACCUMULATION';
    } else if (ratio > 2 && priceChange > 2) {
        interpretation = 'CONFIRMED_BREAKOUT';
    }

    const signal = interpretation === 'STEALTH_ACCUMULATION' ? 'BULLISH' : interpretation === 'CONFIRMED_BREAKOUT' ? 'VERY_BULLISH' : interpretation === 'DEAD_CAT_BOUNCE' ? 'BEARISH' : 'NEUTRAL';

    return { ratio, interpretation, signal, currentVol, avgVol, priceChange };
}

function calculateFundingPriceDivergence(data) {
    const fundingRate = Number(data.funding_Rate || 0);
    const priceChange = Number(data.percent_change || 0);

    let divergence = 'ALIGNED';
    if (fundingRate < -0.001 && priceChange > 2) {
        divergence = 'STRONG_BULL_CONFLUENCE';
    } else if (fundingRate > 0.001 && priceChange > 2) {
        divergence = 'BEARISH_DIVERGENCE';
    } else if (fundingRate < -0.001 && priceChange < -2) {
        divergence = 'BULLISH_DIVERGENCE';
    }

    const signal = divergence === 'STRONG_BULL_CONFLUENCE' ? 'VERY_BULLISH' : divergence === 'BULLISH_DIVERGENCE' ? 'BUY_DIP' : divergence === 'BEARISH_DIVERGENCE' ? 'TAKE_PROFIT' : 'NEUTRAL';

    return { divergence, fundingRate, priceChange, signal };
}

function calculateLiquidityQuality(data, opts) {
    const tf = (opts && opts.timeframe) ? opts.timeframe : '2JAM';
    const volBuy = _n(data[`vol_buy_${tf}`]);
    const volSell = _n(data[`vol_sell_${tf}`]);
    const freqBuy = _n(data[`freq_buy_${tf}`]);
    const freqSell = _n(data[`freq_sell_${tf}`]);

    const avgTradeSizeBuy = freqBuy > 0 ? volBuy / freqBuy : 0;
    const avgTradeSizeSell = freqSell > 0 ? volSell / freqSell : 0;

    const maxTrade = Math.max(avgTradeSizeBuy, avgTradeSizeSell, 0);
    const tradeSizeImbalance = maxTrade > 0 ? Math.abs(avgTradeSizeBuy - avgTradeSizeSell) / maxTrade : 0;

    const avgFreq = (_n(data[`avg_FREQCOIN_buy_${tf}`]) + _n(data[`avg_FREQCOIN_sell_${tf}`])) / 2;
    const freqRatio = avgFreq > 0 ? (((freqBuy + freqSell) / 2) / avgFreq) : 0;

    let quality = 'MODERATE';
    if (freqRatio < 0.2 && tradeSizeImbalance > 0.2) {
        quality = 'ILLIQUID_MANIPULATED';
    } else if (freqRatio < 0.2) {
        quality = 'ILLIQUID_QUIET';
    } else if (freqRatio > 0.8 && tradeSizeImbalance < 0.1) {
        quality = 'HEALTHY_LIQUID';
    }

    const signal = quality === 'ILLIQUID_MANIPULATED' ? 'CAUTION' : quality === 'HEALTHY_LIQUID' ? 'SAFE_TO_TRADE' : 'NEUTRAL';

    return { quality, freqRatio, tradeSizeImbalance, avgTradeSizeBuy, avgTradeSizeSell, signal };
}

function calculateMomentumConsistency(data) {
    const timeframes = [
        { name: '1MENIT', key: 'price_move_1MENIT' },
        { name: '5MENIT', key: 'price_move_5MENIT' },
        { name: '10MENIT', key: 'price_move_10MENIT' },
        { name: '30MENIT', key: 'price_move_30MENIT' },
        { name: '1JAM', key: 'price_move_1JAM' },
        { name: '2JAM', key: 'price_move_2JAM' }
    ];

    const current = Number(data.last || 0);
    let bullishCount = 0, bearishCount = 0;
    for (const tf of timeframes) {
        const prev = Number(data[tf.key] || 0);
        if (prev <= 0) continue;
        const change = ((current - prev) / prev) * 100;
        if (change > 0.5) bullishCount++;
        else if (change < -0.5) bearishCount++;
    }
    const total = bullishCount + bearishCount;
    const consistency = total > 0 ? Math.abs(bullishCount - bearishCount) / total : 0;

    const trend = bullishCount > bearishCount ? 'BULLISH' : bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL';
    const strength = consistency > 0.8 ? 'STRONG' : consistency > 0.5 ? 'MODERATE' : 'WEAK';

    return { bullishCount, bearishCount, consistency: Math.round(consistency * 100), trend, strength };
}

// Attach new metrics to wrapper export
w.computeVolumeSpikeQuality = computeVolumeSpikeQuality;
w.calculateFundingPriceDivergence = calculateFundingPriceDivergence;
w.calculateLiquidityQuality = calculateLiquidityQuality;
w.calculateMomentumConsistency = calculateMomentumConsistency;

try { if (typeof window !== 'undefined') window.metricsWrapper = w; } catch (e) { }
try { if (typeof module !== 'undefined' && module.exports) module.exports = w; } catch (e) { }

export default w;
