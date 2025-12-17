// Analytics Core - ES Module implementation
// This is the canonical implementation moved from analytics-core.js
// Exported as named exports and as default `AnalyticsCore` object.

// ===================== Import from metrics-constants =====================
const M = globalThis.METRICS || {};
M.SCALES || { INDEX_MIN: 0, INDEX_MAX: 100, DIVERGENCE_MIN: -100, DIVERGENCE_MAX: 100 };
M.THRESHOLDS || {};
M.DEFAULTS || { volDurability: 50, INFINITE_RATIO: null };

// ===================== Safe Math Helpers =====================

function safeDiv(a, b, fallback = 0) {
    const na = Number(a) || 0;
    const nb = Number(b);
    return (Number.isFinite(nb) && nb !== 0) ? (na / nb) : fallback;
}

function toNum(v) {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/,/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function normalizeMetric(value, fromMin, fromMax, toMin = 0, toMax = 100) {
    if (!Number.isFinite(value)) return (toMin + toMax) / 2;
    if (fromMax === fromMin) return toMin;
    const normalized = ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin) + toMin;
    return clamp(normalized, toMin, toMax);
}

function mapTo0_100(value, fromMin = 0, fromMax = 100) {
    return normalizeMetric(value, fromMin, fromMax, 0, 100);
}

function mapToNeg100_100(value, fromMin = -1, fromMax = 1) {
    return normalizeMetric(value, fromMin, fromMax, -100, 100);
}

// ===================== Statistical Functions =====================

function meanStd(arr) {
    if (!arr || arr.length === 0) return { mean: 0, std: 0 };
    const nums = arr.filter(x => Number.isFinite(x));
    if (nums.length === 0) return { mean: 0, std: 0 };
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / nums.length;
    return { mean, std: Math.sqrt(variance) };
}

function zScore(value, mean, std) {
    if (!Number.isFinite(std) || std === 0) return 0;
    return (value - mean) / std;
}

function safeZScore(value, mean, std, fallback = 0) {
    if (!Number.isFinite(std) || std === 0) return fallback;
    const v = Number(value);
    const m = Number(mean);
    if (!Number.isFinite(v) || !Number.isFinite(m)) return fallback;
    return (v - m) / std;
}

function percentile(arr, p) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor((p / 100) * sorted.length);
    return sorted[Math.min(idx, sorted.length - 1)];
}

// ===================== ATR Calculation =====================

function computeATR(history, period = 14) {
    if (!history || history.length < 2) return 0;
    
    const trs = [];
    for (let i = 1; i < history.length; i++) {
        const curr = history[i];
        const prev = history[i - 1];
        const high = toNum(curr.high) || toNum(curr.last);
        const low = toNum(curr.low) || toNum(curr.last);
        const prevClose = toNum(prev.last) || toNum(prev.close);
        
        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trs.push(tr);
    }
    
    if (trs.length === 0) return 0;
    const lookback = Math.min(period, trs.length);
    const sum = trs.slice(-lookback).reduce((a, b) => a + b, 0);
    return safeDiv(sum, lookback, 0);
}

// ===================== Volume Calculations =====================

function calculateVolRatio(buy, sell) {
    const numBuy = toNum(buy);
    const numSell = toNum(sell);
    
    if (numSell > 0) return (numBuy / numSell) * 100;
    if (numBuy > 0) return null; // Infinite ratio
    return 0;
}

function calculateVolDurability(buy, sell, fallback = 50) {
    const total = toNum(buy) + toNum(sell);
    if (total <= 0) return fallback;

    return clamp((toNum(buy) / total) * 100, 0, 100);
}

// ===================== Tier-1 Advanced Formulas =====================

function computeKyleLambda(history, opts = {}) {
    const lookback = opts.lookbackPeriods || 20;
    const minSamples = opts.minSamples || 10;
    const smoothing = opts.smoothingWindow || 5;
    if (!history || history.length < minSamples) return { valid: false, reason: 'INSUFFICIENT_DATA' };

    const slice = history.slice(-lookback);
    const lambdas = [];
    for (let i = 1; i < slice.length; i++) {
        const prev = slice[i - 1];
        const cur = slice[i];
        const p0 = toNum(prev.price) || toNum(prev.last) || 0;
        const p1 = toNum(cur.price) || toNum(cur.last) || 0;
        const vol0 = (toNum(prev.volBuy2h) || 0) + (toNum(prev.volSell2h) || 0) || (toNum(prev.vol) || 0);
        const vol1 = (toNum(cur.volBuy2h) || 0) + (toNum(cur.volSell2h) || 0) || (toNum(cur.vol) || 0);
        const dp = p1 - p0;
        const dv = vol1 - vol0;
        if (dv !== 0) lambdas.push(dp / dv);
    }
    if (lambdas.length < minSamples) return { valid: false, reason: 'INSUFFICIENT_SAMPLES' };

    const avg = lambdas.reduce((s, v) => s + v, 0) / lambdas.length;
    const smoothWindow = Math.min(smoothing, lambdas.length);
    const smoothVals = lambdas.slice(-smoothWindow);
    const smooth = smoothVals.reduce((s, v) => s + v, 0) / smoothVals.length;

    const abs = Math.abs(smooth);
    const normalized = mapTo0_100(Math.min(abs * 1000, 100), 0, 100);
    const interpretation = abs > 0.01 ? 'ILLiquid' : (abs > 0.001 ? 'MODERATE_LIQUID' : 'LIQUID');
    const className = abs > 0.01 ? 'text-danger' : (abs > 0.001 ? 'text-warning' : 'text-success');

    return {
        valid: true,
        value: smooth,
        rawMean: avg,
        normalized: normalized,
        interpretation,
        className
    };
}

function computeVWAPBands(history, opts = {}) {
    const lookback = opts.lookbackPeriods || 120;
    const stdMultiplier = typeof opts.stdMultiplier === 'number' ? opts.stdMultiplier : 2.0;
    const adaptive = !!opts.adaptiveMultiplier;
    const minM = opts.minMultiplier || 1.5;
    const maxM = opts.maxMultiplier || 3.0;
    if (!history || !history.length) return { valid: false, reason: 'INSUFFICIENT_DATA' };

    const slice = history.slice(-lookback);
    let num = 0, den = 0;
    const prices = [];
    for (const p of slice) {
        const price = toNum(p.price) || toNum(p.last) || 0;
        const vol = (toNum(p.volBuy2h) || 0) + (toNum(p.volSell2h) || 0) || (toNum(p.vol) || 0) || 0;
        if (price && vol) {
            num += price * vol;
            den += vol;
        }
        if (price) prices.push({ price, vol });
    }
    const vwap = den > 0 ? num / den : (prices.length ? prices[prices.length - 1].price : 0);

    let varNum = 0;
    for (const pv of prices) {
        varNum += pv.vol * Math.pow(pv.price - vwap, 2);
    }
    const std = den > 0 ? Math.sqrt(varNum / den) : 0;

    let mult = stdMultiplier;
    if (adaptive && std > 0 && vwap > 0) {
        const rel = std / Math.max(1e-8, vwap);
        mult = clamp(stdMultiplier * (1 + rel * 5), minM, maxM);
    }

    const upper = vwap + mult * std;
    const lower = vwap - mult * std;
    const position = vwap === 0 ? 'N/A' : ( (prices.length && prices[prices.length-1].price > upper) ? 'ABOVE_VWAP' : (prices.length && prices[prices.length-1].price < lower) ? 'BELOW_VWAP' : 'AT_VWAP' );
    const deviationPct = vwap > 0 ? ((prices.length ? (prices[prices.length-1].price - vwap) : 0) / vwap) * 100 : 0;

    const signal = position === 'ABOVE_VWAP' && Math.abs(deviationPct) > (std/vwap*100) ? 'OVERBOUGHT_WARNING' : (position === 'BELOW_VWAP' ? 'OVERSOLD' : 'NONE');

    return {
        valid: true,
        vwap,
        upperBand: upper,
        lowerBand: lower,
        std,
        multiplier: mult,
        currentPosition: position,
        deviationPct,
        signal,
        className: signal === 'OVERBOUGHT_WARNING' ? 'text-danger' : (signal === 'OVERSOLD' ? 'text-success' : 'text-muted')
    };
}

function computeCVD(history, opts = {}) {
    const windowOpt = opts.window || 'all';
    const normalization = opts.normalizationMethod || 'total';
    opts.smoothingPeriod || 0;
    if (!history || !history.length) return { valid: false, reason: 'INSUFFICIENT_DATA' };

    const slice = history.slice(- (windowOpt === 'all' ? history.length : windowOpt));
    let cvd = 0;
    let totalVol = 0;
    for (const p of slice) {
        const buy = toNum(p.volBuy2h) || toNum(p.buy) || toNum(p.vol_buy) || 0;
        const sell = toNum(p.volSell2h) || toNum(p.sell) || toNum(p.vol_sell) || 0;
        const delta = buy - sell;
        cvd += delta;
        totalVol += Math.abs(buy) + Math.abs(sell);
    }
    let normalized = cvd;
    if (normalization === 'total' && totalVol > 0) normalized = cvd / totalVol;

    const absNorm = Math.abs(normalized);
    let trend = 'NEUTRAL';
    if (absNorm > 0.05) trend = (normalized > 0) ? 'ACCUMULATION' : 'DISTRIBUTION';
    const strength = absNorm > 0.2 ? 'STRONG' : absNorm > 0.08 ? 'MODERATE' : 'WEAK';

    return {
        valid: true,
        value: cvd,
        normalized,
        trend,
        strength,
        className: trend === 'ACCUMULATION' ? 'text-success' : (trend === 'DISTRIBUTION' ? 'text-danger' : 'text-muted')
    };
}

function computeRVOL(history, opts = {}) {
    const baselinePeriods = opts.baselinePeriods || 14;
    const minSamples = opts.minSamplesRequired || 10;
    if (!history || history.length < minSamples) return { valid: false, reason: 'INSUFFICIENT_DATA' };

    const slice = history.slice(-Math.max(baselinePeriods, 1) - 1);
    const vols = [];
    for (const p of slice.slice(0, -1)) {
        const vol = (toNum(p.volBuy2h) || 0) + (toNum(p.volSell2h) || 0) || toNum(p.vol) || 0;
        vols.push(Math.max(vol, 1));
    }
    const baseline = vols.length ? vols.reduce((s, v) => s + v, 0) / vols.length : 1;
    const last = slice.length ? slice[slice.length - 1] : null;
    const current = last ? ((toNum(last.volBuy2h) || 0) + (toNum(last.volSell2h) || 0) || toNum(last.vol) || 0) : 0;
    const value = baseline > 0 ? (current / baseline) : null;
    let significance = 'NONE';
    if (!value || value < 1.2) significance = 'LOW';
    else if (value < 2.0) significance = 'MODERATE';
    else significance = 'HIGH';

    return {
        valid: true,
        value,
        baseline,
        current,
        significance,
        className: significance === 'HIGH' ? 'text-warning fw-bold' : (significance === 'MODERATE' ? 'text-warning' : 'text-muted')
    };
}

function normalizeKyleLambda(input, opts = {}) {
    const val = (input && typeof input === 'object') ? (Number(input.value) || 0) : Number(input || 0);
    const abs = Math.abs(val);
    const max = (opts.max || 0.02);
    const score = mapTo0_100(Math.min(abs, max), 0, max);
    return Math.round(score);
}

function normalizeVWAP(vwapBands, opts = {}) {
    if (!vwapBands || typeof vwapBands !== 'object') return 50;
    const dev = Number(vwapBands.deviationPct) || 0;
    const min = (opts.minPercent || -5);
    const max = (opts.maxPercent || 5);
    return Math.round(mapTo0_100(dev, min, max));
}

function normalizeCVD(cvdObj, opts = {}) {
    const v = (cvdObj && typeof cvdObj === 'object' && Number.isFinite(Number(cvdObj.normalized))) ? Number(cvdObj.normalized) : (Number(cvdObj) || 0);
    return Math.round(mapTo0_100(v, -1, 1));
}

function normalizeRVOL(rvolObj, opts = {}) {
    const v = (rvolObj && typeof rvolObj === 'object' && Number.isFinite(Number(rvolObj.value))) ? Number(rvolObj.value) : (Number(rvolObj) || 0);
    const max = (opts.max || 3);
    return Math.round(mapTo0_100(v, 0, max));
}

function computeTier1Normalized(results, opts = {}) {
    const weights = (M && M.WEIGHTS && M.WEIGHTS.TIER1) ? M.WEIGHTS.TIER1 : null;
    const w = weights || { kyle: 0.3, vwap: 0.25, cvd: 0.25, rvol: 0.2 };
    const kScore = normalizeKyleLambda(results.kyleLambda, opts.kyle);
    const vScore = normalizeVWAP(results.vwapBands, opts.vwap);
    const cScore = normalizeCVD(results.cvd, opts.cvd);
    const rScore = normalizeRVOL(results.rvol, opts.rvol);
    const composite = Math.round((kScore * w.kyle) + (vScore * w.vwap) + (cScore * w.cvd) + (rScore * w.rvol));
    return { kyle: kScore, vwap: vScore, cvd: cScore, rvol: rScore, tier1Score: composite };
}

function computeVPIN(history, opts = {}) {
    const lookback = opts.lookbackBars || 50;
    const minSamples = opts.minSamples || 10;
    if (!Array.isArray(history) || history.length < minSamples) return { valid: false, reason: 'INSUFFICIENT_DATA' };
    const slice = history.slice(-lookback);
    const imbalances = [];
    for (const p of slice) {
        const buy = toNum(p.volBuy) || toNum(p.volBuy2h) || toNum(p.vol_buy) || 0;
        const sell = toNum(p.volSell) || toNum(p.volSell2h) || toNum(p.vol_sell) || 0;
        const total = buy + sell;
        if (total <= 0) continue;
        const imb = (buy - sell) / total;
        imbalances.push(Math.abs(imb));
    }
    if (!imbalances.length) return { valid: false, reason: 'NO_VOLUME' };
    const avgAbs = imbalances.reduce((s, v) => s + v, 0) / imbalances.length;
    const vp = avgAbs;
    return { valid: true, value: vp, percent: vp * 100, normalized: Math.round(mapTo0_100(vp, 0, 1)) };
}

function computeHurstExponent(history, opts = {}) {
    const minSamples = opts.minSamples || 50;
    if (!Array.isArray(history) || history.length < minSamples) return { valid: false, reason: 'INSUFFICIENT_DATA' };
    const prices = history.map(h => toNum(h.price) || toNum(h.last) || 0).filter(x => Number.isFinite(x) && x > 0);
    if (prices.length < minSamples) return { valid: false, reason: 'INSUFFICIENT_PRICES' };
    const N = prices.length;
    const maxK = Math.floor(N / 2);
    const ks = [];
    const rs = [];
    for (let k = 10; k <= Math.min(100, maxK); k = Math.floor(k * 1.5)) {
        const segments = Math.floor(N / k);
        if (segments < 2) continue;
        let Rsum = 0;
        for (let s = 0; s < segments; s++) {
            const seg = prices.slice(s * k, (s + 1) * k);
            const mean = seg.reduce((a, b) => a + b, 0) / seg.length;
            const dev = seg.map(v => v - mean);
            const cum = [];
            let c = 0;
            for (const d of dev) { c += d; cum.push(c); }
            const R = Math.max(...cum) - Math.min(...cum);
            const S = Math.sqrt(seg.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / seg.length) || 1e-8;
            Rsum += R / S;
        }
        const RS = Rsum / segments;
        ks.push(Math.log(k));
        rs.push(Math.log(RS));
    }
    if (ks.length < 2) return { valid: false, reason: 'INSUFFICIENT_SCALING' };
    const n = ks.length;
    const meanK = ks.reduce((a, b) => a + b, 0) / n;
    const meanR = rs.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (ks[i] - meanK) * (rs[i] - meanR); den += Math.pow(ks[i] - meanK, 2); }
    const slope = den === 0 ? 0 : num / den;
    let hurst = slope;
    if (!Number.isFinite(hurst) || hurst <= 0) hurst = 0;
    hurst = Math.max(0, Math.min(1, hurst));
    const interpretation = hurst > 0.55 ? 'TRENDING' : (hurst < 0.45 ? 'MEAN_REVERTING' : 'RANDOM');
    return { valid: true, value: hurst, interpretation, normalized: Math.round(mapTo0_100(hurst, 0, 1)) };
}

function computeVolumeProfilePOC(history, opts = {}) {
    const bins = opts.bins || 20;
    if (!Array.isArray(history) || history.length === 0) return { valid: false, reason: 'INSUFFICIENT_DATA' };
    const prices = history.map(h => toNum(h.price) || toNum(h.last) || 0).filter(p => Number.isFinite(p));
    const vols = history.map(h => (toNum(h.volBuy) || toNum(h.volBuy2h) || 0) + (toNum(h.volSell) || toNum(h.volSell2h) || 0) || toNum(h.vol) || 0);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    if (minP === maxP) return { valid: false, reason: 'FLAT_PRICE' };
    const binSize = (maxP - minP) / bins;
    const profile = new Array(bins).fill(0);
    for (let i = 0; i < prices.length; i++) {
        const p = prices[i];
        const v = vols[i] || 0;
        const idx = Math.min(bins - 1, Math.max(0, Math.floor((p - minP) / binSize)));
        profile[idx] += v;
    }
    let maxIdx = 0; let maxV = 0; let totalV = 0;
    for (let i = 0; i < profile.length; i++) { totalV += profile[i]; if (profile[i] > maxV) { maxV = profile[i]; maxIdx = i; } }
    const poc = minP + (maxIdx + 0.5) * binSize;
    const target = totalV * 0.7;
    let areaV = profile[maxIdx];
    let low = maxIdx, high = maxIdx;
    while (areaV < target && (low > 0 || high < bins - 1)) {
        const left = (low > 0) ? profile[low - 1] : -1;
        const right = (high < bins - 1) ? profile[high + 1] : -1;
        if (left >= right) { if (left > 0) { low -= 1; areaV += profile[low]; } else if (right > 0) { high += 1; areaV += profile[high]; } else break; }
        else { if (right > 0) { high += 1; areaV += profile[high]; } else if (left > 0) { low -= 1; areaV += profile[low]; } else break; }
    }
    const valueAreaLow = minP + low * binSize;
    const valueAreaHigh = minP + (high + 1) * binSize;
    return { valid: true, poc, valueAreaLow, valueAreaHigh, profile, totalVolume: totalV };
}

function computeDepthImbalance(snapshot, opts = {}) {
    if (!snapshot) return { valid: false, reason: 'NO_SNAPSHOT' };
    const bid = toNum(snapshot.bidDepth) || toNum(snapshot.bid_size) || toNum(snapshot.bids_size) || 0;
    const ask = toNum(snapshot.askDepth) || toNum(snapshot.ask_size) || toNum(snapshot.asks_size) || 0;
    const total = bid + ask;
    if (total === 0) return { valid: false, reason: 'NO_DEPTH' };
    const imb = (bid - ask) / total;
    return { valid: true, value: imb, normalized: Math.round(mapTo0_100(imb, -1, 1)), className: imb > 0 ? 'text-success' : 'text-danger' };
}

function calculateSmartMoneyIndex(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    
    const volBuy2h = toNum(a.volBuy2h);
    const volSell2h = toNum(a.volSell2h);
    const freqBuy2h = toNum(a.freqBuy2h);
    const freqSell2h = toNum(a.freqSell2h);
    
    const totalVol = volBuy2h + volSell2h;
    const totalFreq = freqBuy2h + freqSell2h;
    
    if (totalFreq === 0) {
        const volVsAvg = toNum(a.volBuy_vs_avg_percent) || 100;
        const volDur = toNum(a.volDurability2h_percent) || 50;
        const smi = (volVsAvg * 0.5) + (volDur * 0.5);
        return {
            value: clamp(smi, 0, 200),
            normalized: mapTo0_100(smi, 0, 200),
            interpretation: smi > 150 ? 'WHALE' : smi > 100 ? 'MIXED' : smi > 50 ? 'RETAIL' : 'LOW',
            className: smi > 150 ? 'text-success fw-bold' : smi > 100 ? 'text-warning' : 'text-muted'
        };
    }
    
    const avgVolPerTrade = safeDiv(totalVol, totalFreq, 0);
    
    const avgVolBuy = toNum(a.avgBuy2h);
    const avgVolSell = toNum(a.avgSell2h);
    const avgFreqBuy = toNum(a.avgFreqBuy2h);
    const avgFreqSell = toNum(a.avgFreqSell2h);
    
    const histTotalVol = avgVolBuy + avgVolSell;
    const histTotalFreq = avgFreqBuy + avgFreqSell;
    const histAvgVolPerTrade = safeDiv(histTotalVol, histTotalFreq, avgVolPerTrade);
    
    const smi = safeDiv(avgVolPerTrade, histAvgVolPerTrade, 1) * 100;
    
    return {
        value: clamp(smi, 0, 500),
        normalized: mapTo0_100(smi, 0, 200),
        interpretation: smi > 150 ? 'WHALE' : smi > 100 ? 'MIXED' : smi > 50 ? 'RETAIL' : 'LOW',
        className: smi > 150 ? 'text-success fw-bold' : smi > 100 ? 'text-warning' : 'text-muted'
    };
}

function calculateTradeIntensity(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    
    const volBuy2h = toNum(a.volBuy2h);
    const volSell2h = toNum(a.volSell2h);
    const avgVolBuy = Math.max(toNum(a.avgBuy2h), 1);
    const avgVolSell = Math.max(toNum(a.avgSell2h), 1);
    
    const freqBuy2h = toNum(a.freqBuy2h);
    const freqSell2h = toNum(a.freqSell2h);
    const avgFreqBuy = toNum(a.avgFreqBuy2h);
    const avgFreqSell = toNum(a.avgFreqSell2h);
    
    const volIntensity = (safeDiv(volBuy2h, avgVolBuy, 1) + safeDiv(volSell2h, avgVolSell, 1)) / 2;
    
    let freqIntensity = 1;
    if (avgFreqBuy > 0 || avgFreqSell > 0) {
        freqIntensity = (safeDiv(freqBuy2h, Math.max(avgFreqBuy, 1), 1) + 
                        safeDiv(freqSell2h, Math.max(avgFreqSell, 1), 1)) / 2;
    }
    
    const intensity = ((volIntensity + freqIntensity) / 2) * 50;
    
    return {
        value: clamp(intensity, 0, 200),
        normalized: mapTo0_100(intensity, 0, 150),
        level: intensity > 100 ? 'EXTREME' : intensity > 70 ? 'HIGH' : intensity > 40 ? 'MEDIUM' : 'LOW',
        className: intensity > 70 ? 'text-success fw-bold' : intensity > 40 ? 'text-warning' : 'text-muted'
    };
}

function calculateAccumulationScore(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    
    const volDur2h = toNum(a.volDurability2h_percent) || 50;
    const volDur24h = toNum(a.volDurability24h_percent) || 50;
    const volVsAvg = toNum(a.volBuy_vs_avg_percent) || 100;
    
    const buyDominance = (volDur2h - 50) / 50;
    const aboveAvg = clamp((volVsAvg - 100) / 100, -1, 1);
    const persistence = Math.abs(volDur24h - 50) > 10 && 
                       Math.sign(volDur24h - 50) === Math.sign(volDur2h - 50) ? 1 : 0.5;
    
    const score = 50 + (buyDominance * 25) + (aboveAvg * 15) + (persistence * 10);
    
    return {
        value: clamp(score, 0, 100),
        normalized: clamp(score, 0, 100),
        interpretation: score > 70 ? 'ACCUMULATION' : score < 30 ? 'DISTRIBUTION' : 'NEUTRAL',
        className: score > 70 ? 'text-success' : score < 30 ? 'text-danger' : 'text-warning'
    };
}

function calculateMomentumDivergence(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    const priceChange = toNum(data.percent_change);
    
    const volDur = toNum(a.volDurability2h_percent) || 50;
    const flowBias = (volDur - 50) / 50;
    const priceDir = priceChange > 0.5 ? 1 : priceChange < -0.5 ? -1 : 0;
    
    const divergence = flowBias - (priceDir * 0.5);
    
    let interpretation = 'NEUTRAL';
    let className = 'text-muted';
    
    if (divergence > 0.3 && priceChange < 0) {
        interpretation = 'BULL DIV';
        className = 'text-success fw-bold';
    } else if (divergence < -0.3 && priceChange > 0) {
        interpretation = 'BEAR DIV';
        className = 'text-danger fw-bold';
    } else if (divergence > 0.2) {
        interpretation = 'BULLISH';
        className = 'text-success';
    } else if (divergence < -0.2) {
        interpretation = 'BEARISH';
        className = 'text-danger';
    }
    
    return {
        value: divergence,
        normalized: mapToNeg100_100(divergence, -1, 1),
        interpretation,
        priceChange,
        flowBias,
        className
    };
}

function calculateWhaleActivity(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    
    const smi = calculateSmartMoneyIndex(data);
    const volVsAvg = toNum(a.volBuy_vs_avg_percent) || 100;
    const volDur = toNum(a.volDurability2h_percent) || 50;
    
    let whaleScore = 0;
    whaleScore += mapTo0_100(smi.value, 50, 200) * 0.4;
    whaleScore += mapTo0_100(volVsAvg, 50, 300) * 0.35;
    whaleScore += Math.abs(volDur - 50) * 0.5;
    
    return {
        value: clamp(whaleScore, 0, 100),
        normalized: clamp(whaleScore, 0, 100),
        level: whaleScore > 70 ? 'HIGH' : whaleScore > 40 ? 'MEDIUM' : 'LOW',
        className: whaleScore > 70 ? 'text-info fw-bold' : whaleScore > 40 ? 'text-info' : 'text-muted'
    };
}

function calculateRetailInstitutionalRatio(data) {
    const intensity = calculateTradeIntensity(data);
    const whale = calculateWhaleActivity(data);
    const ratio = intensity.value > 0 ? safeDiv(whale.value, intensity.value, 1) * 100 : 100;
    const clampedRatio = clamp(ratio, 0, 300);
    
    let type = 'MIXED';
    let className = 'text-muted';
    
    if (clampedRatio > 150) {
        type = 'INST';
        className = 'text-info fw-bold';
    } else if (clampedRatio > 100) {
        type = 'INST+';
        className = 'text-info';
    } else if (clampedRatio < 60) {
        type = 'RETAIL';
        className = 'text-warning';
    } else if (clampedRatio < 80) {
        type = 'RETAIL+';
        className = 'text-warning';
    }
    
    return {
        value: clampedRatio,
        normalized: mapTo0_100(clampedRatio, 0, 200),
        type,
        className
    };
}

function calculatePressureIndex(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    
    const volDur2h = toNum(a.volDurability2h_percent) || 50;
    const freqDur = toNum(a.freqRatio2h_percent) || 50;
    const imbalance = toNum(a.volImbalance2h) || 0;
    
    let pressure = 0;
    pressure += (volDur2h - 50) * 1.0;
    pressure += (freqDur - 50) * 0.5;
    pressure += imbalance * 30;
    
    return {
        value: clamp(pressure, -100, 100),
        normalized: mapTo0_100(pressure, -100, 100),
        direction: pressure > 20 ? 'BUY' : pressure < -20 ? 'SELL' : 'NEUTRAL',
        className: pressure > 30 ? 'text-success' : pressure < -30 ? 'text-danger' : 'text-muted'
    };
}

function calculateOrderFlowImbalance(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    const volBuy = toNum(a.volBuy2h) || 0;
    const volSell = toNum(a.volSell2h) || 0;
    const freqBuy = toNum(a.freqBuy2h) || 0;
    const freqSell = toNum(a.freqSell2h) || 0;

    const volDen = volBuy + volSell;
    const freqDen = freqBuy + freqSell;

    const volImb = volDen > 0 ? (volBuy - volSell) / volDen : 0;
    const freqImb = freqDen > 0 ? (freqBuy - freqSell) / freqDen : 0;

    const combined = (volImb * 0.7) + (freqImb * 0.3);

    const interp = combined > 0.05 ? 'BUY' : combined < -0.05 ? 'SELL' : 'NEUTRAL';
    const cls = combined > 0.05 ? 'text-success' : combined < -0.05 ? 'text-danger' : 'text-muted';

    return {
        value: combined,
        normalized: mapToNeg100_100(combined, -1, 1),
        interpretation: interp,
        volImbalance: volImb,
        freqImbalance: freqImb,
        className: cls
    };
}

function calculateVolumeProfile(data, bins = 50, valueAreaPercent = 0.70) {
    const history = data && Array.isArray(data._history) ? data._history : (data && Array.isArray(data.history) ? data.history : []);
    if (!history || history.length === 0) return { pocPrice: 0, pocBin: 0, valueAreaLow: 0, valueAreaHigh: 0, totalVolume: 0, valueAreaPercent: 0 };

    const points = history.map(p => {
        const price = toNum(p.price) || toNum(p.last) || toNum(p.close) || toNum(p.high) || toNum(p.low) || 0;
        const vol = toNum(p.vol) || toNum(p.volume) || toNum(p.size) || toNum(p.qty) || toNum(p.buy) + toNum(p.sell) || 0;
        return { price, vol };
    }).filter(pt => pt.price > 0 && pt.vol > 0);

    if (!points.length) return { pocPrice: 0, pocBin: 0, valueAreaLow: 0, valueAreaHigh: 0, totalVolume: 0, valueAreaPercent: 0 };

    let minP = Infinity, maxP = -Infinity, totalVol = 0;
    for (const pt of points) { if (pt.price < minP) minP = pt.price; if (pt.price > maxP) maxP = pt.price; totalVol += pt.vol; }
    if (!Number.isFinite(minP) || !Number.isFinite(maxP) || minP >= maxP) {
        const avgPrice = points.reduce((s, p) => s + p.price, 0) / points.length;
        return { pocPrice: avgPrice, pocBin: 0, valueAreaLow: avgPrice, valueAreaHigh: avgPrice, totalVolume: totalVol, valueAreaPercent: 1 };
    }

    const binCount = Math.max(1, Math.floor(bins));
    const width = (maxP - minP) / binCount;
    const buckets = new Array(binCount).fill(0);
    for (const pt of points) {
        let idx = Math.floor((pt.price - minP) / width);
        if (idx < 0) idx = 0;
        if (idx >= binCount) idx = binCount - 1;
        buckets[idx] += pt.vol;
    }

    let poc = 0, maxVol = -1;
    for (let i = 0; i < buckets.length; i++) { if (buckets[i] > maxVol) { maxVol = buckets[i]; poc = i; } }

    const target = totalVol * Math.max(0.01, Math.min(0.99, valueAreaPercent));
    let left = poc; let right = poc; let collected = buckets[poc];
    while (collected < target) {
        const leftVol = (left - 1) >= 0 ? buckets[left - 1] : -1;
        const rightVol = (right + 1) < buckets.length ? buckets[right + 1] : -1;
        if (leftVol <= 0 && rightVol <= 0) break;
        if (rightVol > leftVol) {
            right++; collected += buckets[right];
        } else { left--; collected += buckets[left]; }
    }

    const pocPrice = minP + (poc + 0.5) * width;
    const valueAreaLow = minP + left * width;
    const valueAreaHigh = minP + (right + 1) * width;
    const actualValueAreaPercent = totalVol > 0 ? (collected / totalVol) : 0;

    return {
        pocBin: poc,
        pocPrice: Number.isFinite(pocPrice) ? pocPrice : 0,
        valueAreaLow: Number.isFinite(valueAreaLow) ? valueAreaLow : 0,
        valueAreaHigh: Number.isFinite(valueAreaHigh) ? valueAreaHigh : 0,
        totalVolume: totalVol,
        valueAreaPercent: actualValueAreaPercent,
        buckets,
        binWidth: width,
        minPrice: minP,
        maxPrice: maxP
    };
}

function detectLiquiditySweep(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
    const history = Array.isArray(data && data._history) ? data._history : (Array.isArray(data && data.history) ? data.history : []);
    const recent = history.length ? history[history.length - 1] : null;

    const getVolFields = (pt) => {
        if (!pt) return { buy: 0, sell: 0, total: 0 };
        const buy = toNum(pt.buy) || toNum(pt.volBuy) || toNum(pt.vol_buy) || toNum(pt.volBuy2h) || 0;
        const sell = toNum(pt.sell) || toNum(pt.volSell) || toNum(pt.vol_sell) || toNum(pt.volSell2h) || 0;
        return { buy, sell, total: buy + sell };
    };

    const windowSize = Math.min(10, Math.max(3, Math.floor(history.length / 6)));
    const recentWindow = history.slice(Math.max(0, history.length - windowSize), history.length - 1);
    let sumBuy = 0, sumSell = 0, count = 0;
    for (const p of recentWindow) {
        const vf = getVolFields(p);
        sumBuy += vf.buy; sumSell += vf.sell; count++;
    }
    const avgBuy = count > 0 ? (sumBuy / count) : (toNum(a.avgBuy2h) || 1);
    const avgSell = count > 0 ? (sumSell / count) : (toNum(a.avgSell2h) || 1);

    const recentV = getVolFields(recent);
    const buyRatio = avgBuy > 0 ? (recentV.buy / avgBuy) : 0;
    const sellRatio = avgSell > 0 ? (recentV.sell / avgSell) : 0;

    const priceNow = toNum(recent && (recent.price || recent.last || recent.close)) || toNum(data.last) || 0;
    const prevPrice = toNum(history.length >= 2 ? history[history.length - 2].price || history[history.length - 2].last : null) || 0;
    const pricePct = (prevPrice > 0 && priceNow > 0) ? ((priceNow - prevPrice) / prevPrice) * 100 : 0;

    const RATIO_SWEEP = 3.0;
    const PRICE_MOVE_PCT = 0.3;

    let side = 'NONE';
    let confidence = 0;

    if (buyRatio >= RATIO_SWEEP && pricePct >= PRICE_MOVE_PCT) {
        side = 'BUY';
        confidence = Math.min(100, Math.round(((buyRatio - RATIO_SWEEP) / RATIO_SWEEP) * 50 + Math.min(50, pricePct * 10)));
    } else if (sellRatio >= RATIO_SWEEP && pricePct <= -PRICE_MOVE_PCT) {
        side = 'SELL';
        confidence = Math.min(100, Math.round(((sellRatio - RATIO_SWEEP) / RATIO_SWEEP) * 50 + Math.min(50, Math.abs(pricePct) * 10)));
    }

    const totalAvg = Math.max(1, avgBuy + avgSell);
    const totalRecent = Math.max(1, recentV.total);
    const totalSpikeRatio = totalRecent / totalAvg;
    if (totalSpikeRatio > 5 && confidence < 30) {
        confidence = Math.min(100, confidence + Math.round((totalSpikeRatio - 5) * 5));
        if (recentV.buy > recentV.sell) side = 'BUY'; else if (recentV.sell > recentV.buy) side = 'SELL';
    }

    return {
        sweep: side !== 'NONE' && confidence > 0,
        side,
        confidence,
        buyRatio: Number.isFinite(buyRatio) ? buyRatio : 0,
        sellRatio: Number.isFinite(sellRatio) ? sellRatio : 0,
        pricePct: Number.isFinite(pricePct) ? pricePct : 0,
        totalSpikeRatio: Number.isFinite(totalSpikeRatio) ? totalSpikeRatio : 0
    };
}

function calculateTrendStrength(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    
    const volDur2h = toNum(a.volDurability2h_percent) || 50;
    const volDur24h = toNum(a.volDurability24h_percent) || 50;
    const intensity = calculateTradeIntensity(data);
    
    const biasConsistency = 1 - Math.abs((volDur2h - 50) / 50 - (volDur24h - 50) / 50);
    const biasStrength = Math.abs(volDur2h - 50) / 50;
    const volumeConfirmation = intensity.normalized / 100;
    
    const strength = (biasStrength * 0.5 + biasConsistency * 0.3 + volumeConfirmation * 0.2) * 100;
    const direction = volDur2h > 55 ? 'UP' : volDur2h < 45 ? 'DOWN' : 'SIDEWAYS';
    
    return {
        value: clamp(strength, 0, 100),
        normalized: clamp(strength, 0, 100),
        direction,
        level: strength > 70 ? 'STRONG' : strength > 40 ? 'MODERATE' : 'WEAK',
        className: strength > 60 ? 'text-success' : strength > 30 ? 'text-warning' : 'text-muted'
    };
}

function calculateBreakoutProbability(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    const history = data._history || [];
    
    const atr = computeATR(history, 14);
    const avgPrice = history.length > 0 ? 
        history.slice(-14).reduce((s, h) => s + toNum(h.last), 0) / Math.min(history.length, 14) : 
        toNum(data.last);
    
    const atrPercent = safeDiv(atr, avgPrice, 0.05) * 100;
    const compressionScore = clamp(100 - (atrPercent * 20), 0, 100);
    
    const intensity = calculateTradeIntensity(data);
    const intensityScore = intensity.normalized;
    
    const imbalance = Math.abs(toNum(a.volImbalance2h) || 0);
    const imbalanceScore = mapTo0_100(imbalance, 0, 0.5);
    
    const pricePos = toNum(a.pricePosition) || 50;
    const nearExtreme = Math.max(pricePos, 100 - pricePos);
    const extremeScore = mapTo0_100(nearExtreme, 50, 100);
    
    const prob = (compressionScore * 0.3) + (intensityScore * 0.25) + 
                (imbalanceScore * 0.25) + (extremeScore * 0.2);
    
    const level = prob > 70 ? 'HIGH' : prob > 50 ? 'MEDIUM' : 'LOW';
    
    return {
        value: clamp(prob, 0, 100),
        normalized: clamp(prob, 0, 100),
        level,
        confidence: level,
        direction: pricePos > 60 ? 'UP' : pricePos < 40 ? 'DOWN' : 'UNKNOWN',
        className: prob > 70 ? 'text-warning fw-bold' : prob > 50 ? 'text-warning' : 'text-muted',
        factors: { compression: compressionScore, intensity: intensityScore, imbalance: imbalanceScore, extreme: extremeScore }
    };
}

function calculateLiquidityStressIndex(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    
    const avgTradeValue = toNum(a.liquidity_avg_trade_value) || 0;
    toNum(data.total_vol_fiat) || toNum(a.totalVolFiat) || 0;
    const totalFreq = (toNum(a.freqBuy2h) || 0) + (toNum(a.freqSell2h) || 0);
    
    let lsi = 50;
    if (avgTradeValue > 0) {
        const baseline = 1000;
        lsi = mapTo0_100(avgTradeValue, baseline * 0.1, baseline * 10);
    }
    if (totalFreq > 0 && totalFreq < 100) {
        lsi += (100 - totalFreq) * 0.2;
    }
    lsi = clamp(lsi, 0, 100);
    
    return {
        value: lsi,
        normalized: lsi,
        level: lsi > 70 ? 'ILLIQUID' : lsi > 40 ? 'MODERATE' : 'LIQUID',
        className: lsi > 70 ? 'text-danger' : lsi > 40 ? 'text-warning' : 'text-success',
        avgTradeValue
    };
}

function classifyMarketMode(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    const history = data._history || [];
    
    const atr = computeATR(history, 14);
    const avgPrice = history.length > 0 ?
        history.slice(-14).reduce((s, h) => s + toNum(h.last), 0) / Math.min(history.length, 14) :
        toNum(data.last);
    
    const atrPercent = safeDiv(atr, avgPrice, 0.02) * 100;
    const volDur2h = toNum(a.volDurability2h_percent) || 50;
    const pricePos = toNum(a.pricePosition) || 50;
    
    const isLowVol = atrPercent < 1.5;
    const isHighVol = atrPercent > 4;
    
    const hasBias = Math.abs(volDur2h - 50) > 15;
    const biasDirection = volDur2h > 50 ? 'UP' : 'DOWN';
    
    let mode = 'RANGE';
    let confidence = 50;
    
    if (isLowVol && !hasBias) {
        mode = 'SQUEEZE';
        confidence = 70 + (1.5 - atrPercent) * 10;
    } else if (isHighVol && hasBias) {
        mode = 'TREND';
        confidence = 60 + Math.abs(volDur2h - 50);
    } else if (hasBias && pricePos > 70) {
        mode = 'TREND_UP';
        confidence = 55 + (pricePos - 70);
    } else if (hasBias && pricePos < 30) {
        mode = 'TREND_DOWN';
        confidence = 55 + (30 - pricePos);
    } else {
        mode = 'RANGE';
        confidence = 50 + (50 - Math.abs(volDur2h - 50));
    }
    
    return {
        mode,
        confidence: clamp(confidence, 0, 100),
        atrPercent,
        bias: hasBias ? biasDirection : 'NONE',
        className: mode.includes('TREND') ? 'text-success' : mode === 'SQUEEZE' ? 'text-warning' : 'text-muted'
    };
}

function detectRegimeTransition(data) {
    const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
    const history = Array.isArray(data && data._history) ? data._history : (Array.isArray(data && data.history) ? data.history : []);

    const atr = computeATR(history, 14);
    const avgPrice = history.length > 0 ? history.slice(-14).reduce((s, h) => s + toNum(h.last), 0) / Math.min(history.length, 14) : toNum(data.last);
    const atrPct = safeDiv(atr, avgPrice, 0) * 100;

    const volDur2h = toNum(a.volDurability2h_percent) || 50;
    const volDur24h = toNum(a.volDurability24h_percent) || 50;

    let regime = 'UNKNOWN';
    let confidence = 30;

    const lowVol = atrPct < 1.5;
    const highVol = atrPct > 4;
    const durDelta = volDur2h - volDur24h;

    if (lowVol && durDelta > 5) {
        regime = 'ACCUMULATION';
        confidence = 50 + Math.min(50, durDelta * 2 + (1.5 - atrPct) * 10);
    } else if (highVol && durDelta < -5) {
        regime = 'DISTRIBUTION';
        confidence = 50 + Math.min(50, Math.abs(durDelta) * 2 + (atrPct - 4) * 5);
    } else if (highVol && Math.abs(durDelta) > 8) {
        regime = durDelta > 0 ? 'TREND_UP' : 'TREND_DOWN';
        confidence = 50 + Math.min(50, Math.abs(durDelta) * 2 + (atrPct - 4) * 5);
    } else if (lowVol && Math.abs(durDelta) <= 5) {
        regime = 'RANGE';
        confidence = 40 + Math.min(40, (1.5 - atrPct) * 10);
    } else {
        const atrShort = computeATR(history.slice(-6), 6) || 0;
        const atrTrend = atrShort > atr ? 1 : (atrShort < atr ? -1 : 0);
        if (atrTrend > 0 && Math.abs(durDelta) > 3) {
            regime = durDelta > 0 ? 'EMERGING_UP' : 'EMERGING_DOWN';
            confidence = 35 + Math.min(50, Math.abs(durDelta) * 3);
        } else {
            regime = 'MIXED';
            confidence = 30;
        }
    }

    return {
        regime,
        confidence: clamp(Math.round(confidence), 0, 100),
        atrPercent: Number.isFinite(atrPct) ? atrPct : 0,
        volDur2h,
        volDur24h,
        volDurDelta: durDelta
    };
}

function generateSmartSignal(data) {
    const accum = calculateAccumulationScore(data);
    const pressure = calculatePressureIndex(data);
    calculateTrendStrength(data);
    const divergence = calculateMomentumDivergence(data);
    const whale = calculateWhaleActivity(data);
    const intensity = calculateTradeIntensity(data);
    
    let score = 0;
    score += (accum.value - 50) * 0.8;
    score += pressure.value * 0.3;
    if (divergence.interpretation === 'BULL DIV') score += 15;
    if (divergence.interpretation === 'BEAR DIV') score -= 15;
    if (whale.value > 70 && accum.value > 55) score += 10;
    if (whale.value > 70 && accum.value < 45) score -= 10;
    if (intensity.value > 70 && pressure.value > 20) score += 10;
    if (intensity.value > 70 && pressure.value < -20) score -= 10;
    
    let signal = 'HOLD';
    let className = 'recommendation-hold';
    const confidence = Math.min(Math.abs(score), 100);
    
    if (score > 25) {
        signal = 'BUY';
        className = 'recommendation-buy';
    } else if (score < -25) {
        signal = 'SELL';
        className = 'recommendation-sell';
    }
    
    return {
        signal,
        confidence: Math.round(confidence),
        score: Math.round(score),
        className
    };
}

function calculateMultiTimeframeConfluence(data, timeframes = ['120m','30m','15m','5m','1m'], weights = null) {
    const defaultWeights = { '120m': 0.30, '30m': 0.25, '15m': 0.20, '5m': 0.15, '1m': 0.10 };
    const w = weights || defaultWeights;

    const history = Array.isArray(data && data._history) ? data._history : (Array.isArray(data && data.history) ? data.history : []);
    let pricePos = 50;
    try {
        if (data && data.analytics && Number.isFinite(Number(data.analytics.pricePosition))) {
            pricePos = Number(data.analytics.pricePosition);
        } else if (history && history.length) {
            const last = toNum(history[history.length - 1].last) || toNum(data.last) || 0;
            let minP = Infinity, maxP = -Infinity;
            for (let i = Math.max(0, history.length - 120); i < history.length; i++) {
                const p = history[i];
                const pr = toNum(p.price) || toNum(p.last) || toNum(p.close) || 0;
                if (pr > 0) { if (pr < minP) minP = pr; if (pr > maxP) maxP = pr; }
            }
            if (Number.isFinite(minP) && Number.isFinite(maxP) && maxP > minP && last > 0) {
                pricePos = Math.round(((last - minP) / (maxP - minP)) * 100);
            }
        } else if (data && data.last && data.high && data.low) {
            const last = toNum(data.last), high = toNum(data.high), low = toNum(data.low);
            if (high > low) pricePos = Math.round(((last - low) / (high - low)) * 100);
        }
    } catch (e) { pricePos = 50; }

    const results = [];
    let agg = 0; let totalWeight = 0;

    for (const tf of timeframes) {
        try {
            let rec = null;
            if (typeof calculateRecommendation === 'function') {
                rec = calculateRecommendation(data, pricePos, tf, false);
            }
            if (!rec) {
                const p = calculatePressureIndex(data);
                const score = (p.direction === 'BUY') ? 1 : (p.direction === 'SELL') ? -1 : 0;
                rec = { recommendation: score > 0 ? 'BUY' : score < 0 ? 'SELL' : 'HOLD', confidence: Math.min(100, Math.round(Math.abs(p.value))) };
            }

            const conf = Math.max(0, Math.min(100, Number(rec.confidence) || 0));
            const sign = rec.recommendation === 'BUY' ? 1 : (rec.recommendation === 'SELL' ? -1 : 0);
            const wt = (w && w[tf]) ? w[tf] : (1 / timeframes.length);
            const contrib = sign * (conf / 100) * wt;
            agg += contrib; totalWeight += wt;
            results.push({ timeframe: tf, rec: rec.recommendation || 'HOLD', confidence: conf, weight: wt, contrib });
        } catch (e) {
            results.push({ timeframe: tf, rec: 'HOLD', confidence: 0, weight: (w && w[tf]) ? w[tf] : (1 / timeframes.length), contrib: 0 });
        }
    }

    const normalized = totalWeight > 0 ? (agg / totalWeight) : 0;
    const confluencePercent = Math.round(Math.abs(normalized) * 100);
    const consensus = normalized > 0.25 ? 'BUY' : (normalized < -0.25 ? 'SELL' : 'MIXED');

    return {
        consensus,
        score: normalized,
        confluence: confluencePercent,
        breakdown: results
    };
}

function computeAllSmartMetrics(data) {
    return {
        ofi: calculateOrderFlowImbalance(data),
        volumeProfile: calculateVolumeProfile(data, 50, 0.70),
        liquiditySweep: detectLiquiditySweep(data),
        regimeTransition: detectRegimeTransition(data),
        multiTfConfluence: calculateMultiTimeframeConfluence(data),
        smi: calculateSmartMoneyIndex(data),
        intensity: calculateTradeIntensity(data),
        divergence: calculateMomentumDivergence(data),
        accumScore: calculateAccumulationScore(data),
        whale: calculateWhaleActivity(data),
        riRatio: calculateRetailInstitutionalRatio(data),
        pressure: calculatePressureIndex(data),
        trendStrength: calculateTrendStrength(data),
        breakout: calculateBreakoutProbability(data),
        lsi: calculateLiquidityStressIndex(data),
        marketMode: classifyMarketMode(data),
        smartSignal: generateSmartSignal(data)
    };
}

// Build AnalyticsCore object and exports
const AnalyticsCore = {
    safeDiv,
    toNum,
    clamp,
    normalizeMetric,
    mapTo0_100,
    mapToNeg100_100,
    meanStd,
    zScore,
    safeZScore,
    percentile,
    computeATR,
    calculateVolRatio,
    calculateVolDurability,
    calculateSmartMoneyIndex,
    calculateTradeIntensity,
    calculateMomentumDivergence,
    calculateAccumulationScore,
    calculateWhaleActivity,
    calculateRetailInstitutionalRatio,
    calculatePressureIndex,
    calculateTrendStrength,
    generateSmartSignal,
    calculateOrderFlowImbalance,
    calculateVolumeProfile,
    detectLiquiditySweep,
    calculateBreakoutProbability,
    calculateLiquidityStressIndex,
    classifyMarketMode,
    detectRegimeTransition,
    computeAllSmartMetrics,
    computeKyleLambda,
    computeVWAPBands,
    computeCVD,
    computeRVOL,
    normalizeKyleLambda,
    normalizeVWAP,
    normalizeCVD,
    normalizeRVOL,
    computeTier1Normalized,
    computeVPIN,
    computeHurstExponent,
    computeVolumeProfilePOC,
    computeDepthImbalance
};

export { AnalyticsCore, calculateAccumulationScore, calculateBreakoutProbability, calculateLiquidityStressIndex, calculateMomentumDivergence, calculateOrderFlowImbalance, calculatePressureIndex, calculateRetailInstitutionalRatio, calculateSmartMoneyIndex, calculateTradeIntensity, calculateTrendStrength, calculateVolDurability, calculateVolRatio, calculateVolumeProfile, calculateWhaleActivity, clamp, classifyMarketMode, computeATR, computeAllSmartMetrics, computeCVD, computeDepthImbalance, computeHurstExponent, computeKyleLambda, computeRVOL, computeTier1Normalized, computeVPIN, computeVWAPBands, computeVolumeProfilePOC, AnalyticsCore as default, detectLiquiditySweep, detectRegimeTransition, generateSmartSignal, mapTo0_100, mapToNeg100_100, meanStd, normalizeCVD, normalizeKyleLambda, normalizeMetric, normalizeRVOL, normalizeVWAP, percentile, safeDiv, safeZScore, toNum, zScore };
//# sourceMappingURL=analytics-core.esm.js.map
