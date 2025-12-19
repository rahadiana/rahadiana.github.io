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

    const FUNDING_EXTREME = 0.001;
    const FUNDING_NEUTRAL = 0.0001;

    let divergence = 'ALIGNED';

    if (fundingRate > FUNDING_EXTREME && priceChange < -1) {
        divergence = 'LONG_TRAP';
    }
    else if (fundingRate < -FUNDING_EXTREME && priceChange > 1) {
        divergence = 'SHORT_TRAP';
    }
    else if (fundingRate > FUNDING_EXTREME && priceChange > 2) {
        divergence = 'OVERHEATED_LONG';
    }
    else if (Math.abs(fundingRate) < FUNDING_NEUTRAL && priceChange < -1) {
        divergence = 'BEARISH_FLOW';
    }

    let signal = 'NEUTRAL';

    if (divergence === 'SHORT_TRAP') signal = 'BUY_PULLBACK';
    else if (divergence === 'LONG_TRAP') signal = 'SELL_RALLIES';
    else if (divergence === 'OVERHEATED_LONG') signal = 'TAKE_PROFIT';
    else if (divergence === 'BEARISH_FLOW') signal = 'WAIT_OR_SHORT';

    return {
        divergence,
        fundingRate,
        priceChange,
        signal,
        confidence:
            divergence === 'LONG_TRAP' || divergence === 'SHORT_TRAP' ? 0.8 :
            divergence === 'OVERHEATED_LONG' ? 0.7 :
            divergence === 'BEARISH_FLOW' ? 0.6 : 0.3
    };
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
    const tradeSizeImbalance = maxTrade > 0
        ? Math.abs(avgTradeSizeBuy - avgTradeSizeSell) / maxTrade
        : 0;

    const avgFreq =
        (_n(data[`avg_FREQCOIN_buy_${tf}`]) +
         _n(data[`avg_FREQCOIN_sell_${tf}`])) / 2;

    const currentFreq = (freqBuy + freqSell) / 2;
    const freqRatio = avgFreq > 0 ? currentFreq / avgFreq : 0;

    let quality = 'MODERATE';

    // 🚨 Market aktif tapi satu sisi dominan (toxic)
    if (freqRatio > 0.6 && tradeSizeImbalance > 0.35) {
        quality = 'TOXIC_FLOW';
    }
    // ❌ Sepi + tidak natural
    else if (freqRatio < 0.3 && tradeSizeImbalance > 0.3) {
        quality = 'ILLIQUID_MANIPULATED';
    }
    // 🧊 Sepi tapi wajar
    else if (freqRatio < 0.3) {
        quality = 'ILLIQUID_QUIET';
    }
    // ✅ Ramai & seimbang
    else if (freqRatio > 0.7 && tradeSizeImbalance < 0.15) {
        quality = 'HEALTHY_LIQUID';
    }

    let signal = 'NEUTRAL';
    if (quality === 'ILLIQUID_MANIPULATED') signal = 'CAUTION';
    else if (quality === 'TOXIC_FLOW') signal = 'WAIT_OR_FADE';
    else if (quality === 'HEALTHY_LIQUID') signal = 'SAFE_TO_TRADE';

    return {
        quality,
        freqRatio,
        tradeSizeImbalance,
        avgTradeSizeBuy,
        avgTradeSizeSell,
        signal
    };
}

function calculateMomentumConsistency(data) {
    const timeframes = [
        { name: '1MENIT', key: 'price_move_1MENIT', thr: 0.2, w: 0.5 },
        { name: '5MENIT', key: 'price_move_5MENIT', thr: 0.3, w: 0.8 },
        { name: '10MENIT', key: 'price_move_10MENIT', thr: 0.4, w: 1 },
        { name: '30MENIT', key: 'price_move_30MENIT', thr: 0.5, w: 1.2 },
        { name: '1JAM', key: 'price_move_1JAM', thr: 0.6, w: 1.5 },
        { name: '2JAM', key: 'price_move_2JAM', thr: 0.8, w: 2 }
    ];

    const current = Number(data.last || 0);
    let bullScore = 0, bearScore = 0, activeTF = 0;

    for (const tf of timeframes) {
        const prev = Number(data[tf.key] || 0);
        if (prev <= 0) continue;

        const change = ((current - prev) / prev) * 100;
        if (change > tf.thr) {
            bullScore += tf.w;
            activeTF++;
        } else if (change < -tf.thr) {
            bearScore += tf.w;
            activeTF++;
        }
    }

    const totalScore = bullScore + bearScore;
    const consistency = totalScore > 0
        ? Math.abs(bullScore - bearScore) / totalScore
        : 0;

    let trend = 'NEUTRAL';
    if (bullScore > bearScore) trend = 'BULLISH';
    else if (bearScore > bullScore) trend = 'BEARISH';

    let strength = 'WEAK';
    if (consistency > 0.75 && activeTF >= 4) strength = 'STRONG';
    else if (consistency > 0.5) strength = 'MODERATE';

    const compression =
        consistency < 0.3 && activeTF >= 4 ? 'COMPRESSED' : 'NORMAL';

    return {
        bullScore: Math.round(bullScore * 10) / 10,
        bearScore: Math.round(bearScore * 10) / 10,
        consistency: Math.round(consistency * 100),
        trend,
        strength,
        compression
    };
}

// Attach new metrics to wrapper export
w.computeVolumeSpikeQuality = computeVolumeSpikeQuality;
w.calculateFundingPriceDivergence = calculateFundingPriceDivergence;
w.calculateLiquidityQuality = calculateLiquidityQuality;
w.calculateMomentumConsistency = calculateMomentumConsistency;

try { if (typeof window !== 'undefined') window.metricsWrapper = w; } catch (e) { }
try { if (typeof module !== 'undefined' && module.exports) module.exports = w; } catch (e) { }

export default w;
