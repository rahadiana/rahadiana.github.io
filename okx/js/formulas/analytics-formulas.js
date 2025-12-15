// Analytics & recommendation formulas extracted from the main dashboard logic.
// NOTE: For consistency, use AnalyticsCore functions when available.

// Use global toNum from AnalyticsCore if available
const _toNum = (v) => {
    if (typeof window !== 'undefined' && window.toNum) {
        return window.toNum(v);
    }
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/,/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Converts a set of possible numeric keys into a normalized number.
 * Handles comma separated strings and case-insensitive key lookups.
 */
function localGetNumeric(obj, ...keys) {
    if (!obj) return 0;
    const lower = {};
    for (const kk in obj) {
        try { lower[kk.toLowerCase()] = obj[kk]; } catch (e) { }
    }
    for (const key of keys) {
        if (!key) continue;
        if (obj[key] !== undefined && obj[key] !== null) {
            const v = obj[key];
            const n = _toNum(v);
            if (n !== 0 || v === 0 || v === '0') return n;
        }
        const lk = key.toLowerCase();
        if (lower[lk] !== undefined && lower[lk] !== null) {
            const v = lower[lk];
            const n = _toNum(v);
            if (n !== 0 || v === 0 || v === '0') return n;
        }
    }
    return 0;
}

/**
 * Public numeric getter used across tables. Mirrors localGetNumeric but exposed globally.
 */
function getNumeric(data, ...keys) {
    if (!data) return 0;
    const lower = {};
    for (const k in data) {
        try {
            lower[k.toLowerCase()] = data[k];
        } catch (e) { }
    }

    for (const key of keys) {
        if (!key) continue;
        if (data[key] !== undefined && data[key] !== null) {
            const v = data[key];
            const n = _toNum(v);
            if (n !== 0 || v === 0 || v === '0') return n;
        }
        const lk = key.toLowerCase();
        if (lower[lk] !== undefined && lower[lk] !== null) {
            const v = lower[lk];
            const n = _toNum(v);
            if (n !== 0 || v === 0 || v === '0') return n;
        }
    }
    return 0;
}

/**
 * Builds risk, liquidity, volume-ratio, and frequency analytics from a raw payload.
 */
function computeAnalytics(p) {
    const toNum = _toNum; // Use the shared helper
    const pick = (...keys) => localGetNumeric(p, ...keys);

    const out = {};
    out.dailyHigh = toNum(p.high);
    out.dailyLow = toNum(p.low);
    out.priceRange24h = out.dailyHigh > 0 && out.dailyLow > 0 ? Math.max(out.dailyHigh - out.dailyLow, 0) : 0;

    const timeframeDefs = {
        '1m': {
            volBuy: ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1m', 'vol_buy_1min'],
            volSell: ['count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1m', 'vol_sell_1min'],
            freqBuy: ['count_FREQ_minute1_buy', 'freq_buy_1MENIT', 'freq_buy_1m', 'freq_buy_1min'],
            freqSell: ['count_FREQ_minute1_sell', 'freq_sell_1MENIT', 'freq_sell_1m', 'freq_sell_1min']
        },
        '5m': {
            volBuy: ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5m', 'vol_buy_5min'],
            volSell: ['count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5m', 'vol_sell_5min'],
            freqBuy: ['count_FREQ_minute_5_buy', 'freq_buy_5MENIT', 'freq_buy_5m', 'freq_buy_5min'],
            freqSell: ['count_FREQ_minute_5_sell', 'freq_sell_5MENIT', 'freq_sell_5m', 'freq_sell_5min']
        },
        '10m': {
            volBuy: ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10m', 'vol_buy_10min'],
            volSell: ['count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10m', 'vol_sell_10min'],
            freqBuy: ['count_FREQ_minute_10_buy', 'freq_buy_10MENIT', 'freq_buy_10m'],
            freqSell: ['count_FREQ_minute_10_sell', 'freq_sell_10MENIT', 'freq_sell_10m']
        },
        '15m': {
            volBuy: ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'],
            volSell: ['count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m'],
            freqBuy: ['count_FREQ_minute_15_buy', 'freq_buy_15MENIT', 'freq_buy_15m'],
            freqSell: ['count_FREQ_minute_15_sell', 'freq_sell_15MENIT', 'freq_sell_15m']
        },
        '20m': {
            volBuy: ['count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m'],
            volSell: ['count_VOL_minute_20_sell', 'vol_sell_20MENIT', 'vol_sell_20m'],
            freqBuy: ['count_FREQ_minute_20_buy', 'freq_buy_20MENIT', 'freq_buy_20m'],
            freqSell: ['count_FREQ_minute_20_sell', 'freq_sell_20MENIT', 'freq_sell_20m']
        },
        '30m': {
            volBuy: ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'],
            volSell: ['count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m'],
            freqBuy: ['count_FREQ_minute_30_buy', 'freq_buy_30MENIT', 'freq_buy_30m'],
            freqSell: ['count_FREQ_minute_30_sell', 'freq_sell_30MENIT', 'freq_sell_30m']
        },
        '60m': {
            volBuy: ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT', 'vol_buy_60m'],
            volSell: ['count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT', 'vol_sell_60m'],
            freqBuy: ['count_FREQ_minute_60_buy', 'freq_buy_1JAM', 'freq_buy_60MENIT', 'freq_buy_60m'],
            freqSell: ['count_FREQ_minute_60_sell', 'freq_sell_1JAM', 'freq_sell_60MENIT', 'freq_sell_60m']
        },
        '120m': {
            volBuy: ['count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT', 'vol_buy_2jam'],
            volSell: ['count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT', 'vol_sell_2jam'],
            freqBuy: ['count_FREQ_minute_120_buy', 'freq_buy_2JAM', 'freq_buy_120MENIT', 'freq_buy_2jam', 'freq_buy_120'],
            freqSell: ['count_FREQ_minute_120_sell', 'freq_sell_2JAM', 'freq_sell_120MENIT', 'freq_sell_2jam', 'freq_sell_120']
        },
        '24h': {
            volBuy: ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h', 'vol_buy_24jam'],
            volSell: ['count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24h', 'vol_sell_24jam'],
            freqBuy: ['count_FREQ_minute_1440_buy', 'freq_buy_24JAM', 'freq_buy_24h'],
            freqSell: ['count_FREQ_minute_1440_sell', 'freq_sell_24JAM', 'freq_sell_24h']
        }
    };

    const timeframeMetrics = {};
    for (const [tf, def] of Object.entries(timeframeDefs)) {
        timeframeMetrics[tf] = {
            volBuy: pick(...(def.volBuy || [])),
            volSell: pick(...(def.volSell || [])),
            freqBuy: pick(...(def.freqBuy || [])),
            freqSell: pick(...(def.freqSell || []))
        };
        const tfTotal = (timeframeMetrics[tf].volBuy || 0) + (timeframeMetrics[tf].volSell || 0);
        timeframeMetrics[tf].volBias = tfTotal > 0 ? (timeframeMetrics[tf].volBuy - timeframeMetrics[tf].volSell) / tfTotal : 0;
    }
    out.timeframes = timeframeMetrics;
    out.volDurabilityByTf = {};
    for (const [tf, metrics] of Object.entries(timeframeMetrics)) {
        const total = (metrics.volBuy || 0) + (metrics.volSell || 0);
        out.volDurabilityByTf[tf] = total > 0 ? (metrics.volBuy / total) * 100 : 0;
    }

    out.volBuy2h = toNum(p.count_VOL_minute_120_buy) || toNum(p.vol_buy_2JAM) || toNum(p.vol_buy_120MENIT) || toNum(p.vol_buy_2jam);
    out.volSell2h = toNum(p.count_VOL_minute_120_sell) || toNum(p.vol_sell_2JAM) || toNum(p.vol_sell_120MENIT) || toNum(p.vol_sell_2jam);
    out.total2h = out.volBuy2h + out.volSell2h;
    out.volRatioBuySell_percent = out.volSell2h > 0 ? (out.volBuy2h / out.volSell2h) * 100 : (out.volBuy2h > 0 ? null : 0);
    out.volDurability2h_percent = out.total2h > 0 ? (out.volBuy2h / out.total2h) * 100 : 0;
    out.volImbalance2h = out.total2h > 0 ? (out.volBuy2h - out.volSell2h) / out.total2h : 0;
    out.vwdi = out.total2h > 0 ? ((out.volBuy2h / out.total2h) * 2 - 1) : 0;

    out.avgBuy2h = toNum(p.avg_VOLCOIN_buy_2JAM) || toNum(p.avg_VOLCOIN_buy_2HOUR) || toNum(p.avg_VOLCOIN_buy_2jam) || toNum(p.avg_VOLCOIN_buy_120MENIT);
    out.avgSell2h = toNum(p.avg_VOLCOIN_sell_2JAM) || toNum(p.avg_VOLCOIN_sell_2HOUR) || toNum(p.avg_VOLCOIN_sell_2jam) || toNum(p.avg_VOLCOIN_sell_120MENIT);
    out.volBuy_vs_avg_percent = out.avgBuy2h > 0 ? (out.volBuy2h / out.avgBuy2h) * 100 : (out.volBuy2h > 0 ? null : 0);
    out.volSell_vs_avg_percent = out.avgSell2h > 0 ? (out.volSell2h / out.avgSell2h) * 100 : (out.volSell2h > 0 ? null : 0);

    out.freqBuy2h = toNum(p.count_FREQ_minute_120_buy) || toNum(p.freq_buy_2JAM) || toNum(p.freq_buy_120MENIT) || toNum(p.freq_buy_2jam) || toNum(p.freq_buy_120) || 0;
    out.freqSell2h = toNum(p.count_FREQ_minute_120_sell) || toNum(p.freq_sell_2JAM) || toNum(p.freq_sell_120MENIT) || toNum(p.freq_sell_2jam) || toNum(p.freq_sell_120) || 0;
    out.avgFreqBuy2h = toNum(p.avg_FREQCOIN_buy_2JAM) || toNum(p.avg_FREQCOIN_buy_120MENIT) || toNum(p.avg_FREQCOIN_buy_2jam) || toNum(p.avg_FREQCOIN_buy_120) || 0;
    out.avgFreqSell2h = toNum(p.avg_FREQCOIN_sell_2JAM) || toNum(p.avg_FREQCOIN_sell_120MENIT) || toNum(p.avg_FREQCOIN_sell_2jam) || toNum(p.avg_FREQCOIN_sell_120) || 0;
    out.freqBuy_vs_avg_percent = out.avgFreqBuy2h > 0 ? (out.freqBuy2h / out.avgFreqBuy2h) * 100 : (out.freqBuy2h > 0 ? null : 0);
    out.freqSell_vs_avg_percent = out.avgFreqSell2h > 0 ? (out.freqSell2h / out.avgFreqSell2h) * 100 : (out.freqSell2h > 0 ? null : 0);
    const totalFreq2h = out.freqBuy2h + out.freqSell2h;
    out.freqRatio2h_percent = totalFreq2h > 0 ? (out.freqBuy2h / totalFreq2h) * 100 : 0;

    const volBuy24h = pick('count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h', 'vol_buy_24jam');
    const volSell24h = pick('count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24h', 'vol_sell_24jam');
    const total24h = volBuy24h + volSell24h;
    out.volBuy24h = volBuy24h;
    out.volSell24h = volSell24h;
    out.volDurability24h_percent = total24h > 0 ? (volBuy24h / total24h) * 100 : 50;

    const freqBuy24h = pick('count_FREQ_minute_1440_buy', 'freq_buy_24JAM', 'freq_buy_24h');
    const freqSell24h = pick('count_FREQ_minute_1440_sell', 'freq_sell_24JAM', 'freq_sell_24h');

    const totalVolFiat = toNum(p.total_vol_fiat);
    const totalFreq24h = freqBuy24h + freqSell24h;
    const totalVol = toNum(p.total_vol) || (out.total2h || 0);
    let liquidityValue = totalVol;
    if (totalVolFiat > 0 && totalFreq24h > 0) {
        const calc = totalVolFiat / totalFreq24h;
        liquidityValue = Number.isFinite(calc) ? calc : liquidityValue;
    }
    out.liquidity_avg_trade_value = liquidityValue;

    const comp = {};
    comp.imbalance = Math.abs(50 - out.volDurability2h_percent) * 0.8;
    const devBuy = out.avgBuy2h > 0 ? Math.max(0, 50 - out.volBuy_vs_avg_percent) : 0;
    const devSell = out.avgSell2h > 0 ? Math.max(0, 50 - out.volSell_vs_avg_percent) : 0;
    comp.deviation = Math.max(devBuy, devSell) * 0.5;
    const pctChange = toNum(p.percent_change) || ((toNum(p.last) && toNum(p.previous)) ? ((toNum(p.last) - toNum(p.previous)) / toNum(p.previous)) * 100 : 0);
    comp.priceMove = Math.min(30, Math.abs(pctChange) * 2);
    comp.liquidity = out.liquidity_avg_trade_value > 0 ? Math.max(0, 20 - Math.log10(out.liquidity_avg_trade_value + 1) * 4) : 10;
    const riskScore = Math.min(100, comp.imbalance + comp.deviation + comp.priceMove + comp.liquidity);
    out.riskScore = Math.round(riskScore);
    out.components = comp;

    const cohesionTfs = ['1m', '5m', '15m', '30m', '120m'];
    const biases = cohesionTfs
        .map((tf) => (timeframeMetrics[tf] && Number.isFinite(timeframeMetrics[tf].volBias) ? timeframeMetrics[tf].volBias : null))
        .filter((v) => v !== null);
    out.multiTfCohesion = biases.length ? biases.reduce((sum, v) => sum + v, 0) / biases.length : 0;

    const volBuy1m = timeframeMetrics['1m'] ? timeframeMetrics['1m'].volBuy : 0;
    const volBuy5m = timeframeMetrics['5m'] ? timeframeMetrics['5m'].volBuy : 0;
    const avg5m = volBuy5m > 0 ? volBuy5m / 5 : 0;
    out.volumeAcceleration = avg5m > 0 ? (volBuy1m - avg5m) / avg5m : 0;

    const freqBuy1m = timeframeMetrics['1m'] ? timeframeMetrics['1m'].freqBuy : 0;
    const freqBuy5m = timeframeMetrics['5m'] ? timeframeMetrics['5m'].freqBuy : 0;
    const freqSell1m = timeframeMetrics['1m'] ? timeframeMetrics['1m'].freqSell : 0;
    const freqSell5m = timeframeMetrics['5m'] ? timeframeMetrics['5m'].freqSell : 0;
    const perSec1mBuy = freqBuy1m / 60;
    const perSec5mBuy = freqBuy5m / 300;
    const perSec1mSell = freqSell1m / 60;
    const perSec5mSell = freqSell5m / 300;
    out.freqBurstBuy = perSec5mBuy > 0 ? perSec1mBuy / perSec5mBuy : 0;
    out.freqBurstSell = perSec5mSell > 0 ? perSec1mSell / perSec5mSell : 0;

    const bias1m = timeframeMetrics['1m'] ? timeframeMetrics['1m'].volBias : 0;
    const bias5m = timeframeMetrics['5m'] ? timeframeMetrics['5m'].volBias : 0;
    out.velocityOfImbalance = (bias1m - bias5m) / 5;
    out.volumeBiasMap = Object.fromEntries(Object.entries(timeframeMetrics).map(([tf, vals]) => [tf, vals.volBias || 0]));

    // Advanced Tier-1 metrics (use AnalyticsCore if available)
    try {
        const history = Array.isArray(p._history) ? p._history.slice(-120) : (Array.isArray(p.history) ? p.history.slice(-120) : []);
        const core = (typeof window !== 'undefined' && window.AnalyticsCore) ? window.AnalyticsCore : null;
        if (core && typeof core.computeKyleLambda === 'function') {
            out.kyleLambda = core.computeKyleLambda(history, { lookbackPeriods: 20, minSamples: 10, smoothingWindow: 5 });
        } else {
            out.kyleLambda = { valid: false };
        }

        if (core && typeof core.computeVWAPBands === 'function') {
            out.vwapBands = core.computeVWAPBands(history, { lookbackPeriods: 120, stdMultiplier: 2.0, adaptiveMultiplier: true, minMultiplier: 1.5, maxMultiplier: 3.0 });
        } else {
            out.vwapBands = { valid: false };
        }

        if (core && typeof core.computeCVD === 'function') {
            out.cvd = core.computeCVD(history, { window: 'all', normalizationMethod: 'total', smoothingPeriod: 3 });
        } else {
            out.cvd = { valid: false };
        }

        if (core && typeof core.computeRVOL === 'function') {
            out.rvol = core.computeRVOL(history, { baselinePeriods: 14, minSamplesRequired: 10 });
        } else {
            out.rvol = { valid: false };
        }
        // Normalized Tier-1 composite scores
        try {
            if (core && typeof core.computeTier1Normalized === 'function') {
                out.tier1 = core.computeTier1Normalized({ kyleLambda: out.kyleLambda, vwapBands: out.vwapBands, cvd: out.cvd, rvol: out.rvol });
            }
        } catch (e) { /* ignore normalization errors */ }

        // Phase-2 advanced metrics
        try {
            if (core && typeof core.computeVPIN === 'function') {
                out.vpin = core.computeVPIN(history, { lookbackBars: 50, minSamples: 10 });
            }
            if (core && typeof core.computeHurstExponent === 'function') {
                out.hurst = core.computeHurstExponent(history, { minSamples: 50 });
            }
            if (core && typeof core.computeVolumeProfilePOC === 'function') {
                out.volumeProfile = core.computeVolumeProfilePOC(history, { bins: 24 });
            }
            if (core && typeof core.computeDepthImbalance === 'function') {
                out.depthImbalance = core.computeDepthImbalance((Array.isArray(p._history) ? p._history.slice(-1)[0] : p) || p);
            }
        } catch (e) { /* ignore phase-2 errors */ }
    } catch (e) { out.kyleLambda = out.vwapBands = out.cvd = out.rvol = { valid: false }; }

    return out;
}

const RECOMMENDATION_COOLDOWN_MS = 120000; // 2 minutes cooldown to avoid flip-flopping
const RECOMMENDATION_THRESHOLD = 0.30; // absolute score threshold to emit BUY/SELL
const recommendationCooldowns = window._recommendationCooldowns || (window._recommendationCooldowns = {});

/**
 * Scores BUY/SELL/HOLD recommendations using durability, z-scores, and risk penalties.
 */
function calculateRecommendation(data, pricePosition, timeframe, applyState = false) {
    if (!data) {
        return { recommendation: 'HOLD', confidence: 0, className: 'recommendation-hold', score: 0 };
    }
    const a = data && (data.analytics || data._analytics) ? (data.analytics || data._analytics) : {};
    const volDur2h = a.volDurability2h_percent ?? getNumeric(data, 'percent_sum_VOL_minute_120_buy', 'percent_vol_buy_120min', 'percent_vol_buy_2jam');
    const volDur24h = a.volDurability24h_percent ?? getNumeric(data, 'percent_sum_VOL_overall_buy', 'percent_vol_buy_24h');
    const volBuy2h = a.volBuy2h ?? getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT', 'vol_buy_2jam');
    const volSell2h = a.volSell2h ?? getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT', 'vol_sell_2jam');
    const zBuy = a.zScoreBuy2h ?? 0;
    const zSell = a.zScoreSell2h ?? 0;
    const persistenceBuy3 = a.persistenceBuy3 ?? 0;
    const divergence = a.divergence ?? 0;
    const riskScore = a.riskScore ?? 0;

    let volDurTf = null, volBuyTf = null, volSellTf = null, zImbalanceTf = null;
    try {
        if (timeframe) {
            const map = {
                '1m': { volKey: 'percent_sum_VOL_minute1_buy', buyKey: 'count_VOL_minute1_buy', sellKey: 'count_VOL_minute1_sell' },
                '5m': { volKey: 'percent_sum_VOL_minute_5_buy', buyKey: 'count_VOL_minute_5_buy', sellKey: 'count_VOL_minute_5_sell' },
                '10m': { volKey: 'percent_sum_VOL_minute_10_buy', buyKey: 'count_VOL_minute_10_buy', sellKey: 'count_VOL_minute_10_sell' },
                '30m': { volKey: 'percent_sum_VOL_minute_30_buy', buyKey: 'count_VOL_minute_30_buy', sellKey: 'count_VOL_minute_30_sell' },
                '60m': { volKey: 'percent_sum_VOL_minute_60_buy', buyKey: 'count_VOL_minute_60_buy', sellKey: 'count_VOL_minute_60_sell' },
                '120m': { volKey: 'percent_sum_VOL_minute_120_buy', buyKey: 'count_VOL_minute_120_buy', sellKey: 'count_VOL_minute_120_sell' },
                '24h': { volKey: 'percent_sum_VOL_overall_buy', buyKey: 'count_VOL_minute_1440_buy', sellKey: 'count_VOL_minute_1440_sell' }
            };
            const info = map[String(timeframe)] || null;
            if (info) {
                // Prefer analytics timeframes (computed metrics) when available
                const tfKey = String(timeframe);
                const tfMetrics = a && a.timeframes && a.timeframes[tfKey] ? a.timeframes[tfKey] : null;
                if (tfMetrics) {
                    volBuyTf = Number(tfMetrics.volBuy || tfMetrics.vol_buy || 0) || 0;
                    volSellTf = Number(tfMetrics.volSell || tfMetrics.vol_sell || 0) || 0;
                    const total = (volBuyTf || 0) + (volSellTf || 0);
                    volDurTf = total > 0 ? Math.round((volBuyTf / total) * 100) : null;
                    zImbalanceTf = _tanh(((volBuyTf || 0) - (volSellTf || 0)) / Math.max(total, 1));
                } else {
                    // Fallback to raw aliases in payload
                    volBuyTf = getNumeric(data, info.buyKey) || 0;
                    volSellTf = getNumeric(data, info.sellKey) || 0;
                    const total = (volBuyTf || 0) + (volSellTf || 0);
                    volDurTf = getNumeric(data, info.volKey) || (total > 0 ? Math.round((volBuyTf / total) * 100) : null);
                    zImbalanceTf = _tanh(((volBuyTf || 0) - (volSellTf || 0)) / Math.max(total, 1));
                }
            }
        }
    } catch (e) { }

    const priceBias = (50 - (Number(pricePosition) || 50)) / 50;
    const volDurNorm = ((Number(volDurTf != null ? volDurTf : volDur2h) || 50) - 50) / 50;
    const vol24Norm = ((Number(volDur24h) || 50) - 50) / 50;
    const zImbalance = (zImbalanceTf != null) ? zImbalanceTf : _tanh((Number(zBuy) - Number(zSell)) / 3);
    const freqZBuy = (a && a.zScoreFreqBuy2h !== undefined) ? Number(a.zScoreFreqBuy2h) : 0;
    const freqZSell = (a && a.zScoreFreqSell2h !== undefined) ? Number(a.zScoreFreqSell2h) : 0;
    const freqImbalance = (freqZBuy || freqZSell) ? _tanh((freqZBuy - freqZSell) / 3) : _tanh((((Number(a.freqBuy2h) || 0) - (Number(a.freqSell2h) || 0)) / Math.max(((Number(a.freqBuy2h) || 0) + (Number(a.freqSell2h) || 0)), 1)));
    const persistenceNorm = ((Number(persistenceBuy3) || 0) - 1.5) / 1.5;
    const divergenceNorm = Math.max(-1, Math.min(1, (Number(divergence) || 0) / 10));
    const riskPenalty = Math.max(0, Math.min(1, (Number(riskScore) || 0) / 100));
    const factors = {
        priceBias,
        volDurNorm,
        vol24Norm,
        zImbalance,
        freqImbalance,
        persistenceNorm,
        divergenceNorm,
        riskPenalty
    };

    const strengthBuy = 0.4 * volDurNorm + 0.3 * zImbalance + 0.2 * freqImbalance + 0.1 * persistenceNorm;
    const strengthSell = 0.4 * (-volDurNorm) + 0.3 * (-zImbalance) + 0.2 * (-freqImbalance) + 0.1 * (-persistenceNorm);
    if (a) {
        a.mssr = Number((strengthBuy - strengthSell).toFixed(4));
        a.strengthFactors = { strengthBuy, strengthSell };
    }

    const W = {
        price: 0.16,
        volDur: 0.18,
        imbalance: 0.30,
        freq: 0.20,
        persistence: 0.10,
        divergence: 0.06
    };

    let rawScore = 0;
    rawScore += W.price * priceBias;
    rawScore += W.volDur * volDurNorm;
    rawScore += W.imbalance * zImbalance;
    rawScore += W.freq * freqImbalance;
    rawScore += W.persistence * persistenceNorm;
    rawScore += W.divergence * divergenceNorm;

    rawScore = rawScore * (1 - 0.5 * riskPenalty);
    const score = Math.max(-1, Math.min(1, rawScore));
    const confidence = Math.round(Math.abs(score) * 100);

    // Calculate recommendation based on score first
    let recommendation = 'HOLD';
    if (score >= RECOMMENDATION_THRESHOLD) recommendation = 'BUY';
    else if (score <= -RECOMMENDATION_THRESHOLD) recommendation = 'SELL';

    const coin = data.coin || data.symbol || data.code || 'unknown';
    const className = recommendation === 'BUY' ? 'recommendation-buy' : (recommendation === 'SELL' ? 'recommendation-sell' : 'recommendation-hold');

    // Apply cooldown AFTER calculating recommendation (fix: score is still accurate)
    let finalRecommendation = recommendation;
    if (applyState) {
        const now = Date.now();
        const last = recommendationCooldowns[coin] || { ts: 0, rec: null };
        
        // Only apply cooldown if trying to flip from last recommendation
        if (now - last.ts < RECOMMENDATION_COOLDOWN_MS && last.rec && last.rec !== recommendation) {
            // Keep the last recommendation during cooldown, but score is still accurate
            finalRecommendation = last.rec;
        }
        
        // Update cooldown state for non-HOLD recommendations
        if (recommendation !== 'HOLD') {
            recommendationCooldowns[coin] = { ts: now, rec: recommendation };
        } else if (!recommendationCooldowns[coin]) {
            recommendationCooldowns[coin] = { ts: 0, rec: null };
        }

        a.recommendationLog = a.recommendationLog || [];
        a.recommendationLog.push({
            ts: now,
            coin,
            timeframe: timeframe || '120m',
            price: Number(data.last) || 0,
            score,
            recommendation: finalRecommendation,
            confidence,
            priceBias,
            volDur: volDurTf != null ? volDurTf : volDur2h,
            volBuyTf,
            volSellTf,
            zImbalance,
            persistenceNorm,
            divergenceNorm,
            riskScore,
            factors
        });
        if (a.recommendationLog.length > 200) a.recommendationLog.shift();
    }

    // Return finalRecommendation (respects cooldown) but keep score accurate
    const finalClassName = finalRecommendation === 'BUY' ? 'recommendation-buy' : (finalRecommendation === 'SELL' ? 'recommendation-sell' : 'recommendation-hold');
    return { recommendation: finalRecommendation, confidence, className: finalClassName, score, factors };
}
