(function(){
    'use strict';

    const core = (typeof AnalyticsCore !== 'undefined') ? AnalyticsCore : null;
    const toNum = (core && core.toNum) ? core.toNum : (v => {
        if (v === undefined || v === null) return 0;
        if (typeof v === 'number') return v;
        const s = String(v).replace(/,/g, '');
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    });

    const safeDiv = (a,b,f=0) => {
        const na = Number(a) || 0;
        const nb = Number(b);
        return (Number.isFinite(nb) && nb !== 0) ? (na/nb) : f;
    };

    // Improved volume ratio / imbalance computation
    function calculateImprovedVolRatio(volBuy, volSell){
        const buy = Number(volBuy) || 0;
        const sell = Number(volSell) || 0;
        const total = buy + sell;
        if (total === 0) return { ratio: 0, interpretation: 'NO_ACTIVITY', score: 0 };
        const buyPercent = (buy/total)*100;
        const logRatio = sell>0 ? Math.log10((buy||1)/(sell||1)) : (buy>0?Infinity:0);
        const imbalance = ((buy - sell)/total) * 100;
        let interpretation = 'NEUTRAL';
        let className = 'text-warning';
        let strength = Math.abs(imbalance);
        if (imbalance > 60){ interpretation = 'EXTREME_BULLISH'; className='text-success fw-bold'; }
        else if (imbalance > 30){ interpretation = 'BULLISH'; className='text-success'; }
        else if (imbalance < -60){ interpretation = 'EXTREME_BEARISH'; className='text-danger fw-bold'; }
        else if (imbalance < -30){ interpretation = 'BEARISH'; className='text-danger'; }
        return {
            imbalance: Math.round(imbalance),
            buyPercent: Math.round(buyPercent),
            logRatio: Number.isFinite(logRatio) ? Number(logRatio.toFixed(2)) : '∞',
            interpretation,
            className,
            strength: Math.round(strength),
            buy, sell, total
        };
    }

    // Robust statistics and MAD-based outlier removal
    function robustStatistics(data, options={}){
        const { removeOutliers=true, outlierThreshold=3, useMAD=true, minSamples=6 } = options;
        if (!data || data.length < minSamples) return { mean:0, median:0, std:0, mad:0, samples:0, valid:false };
        let cleanData = data.filter(x => Number.isFinite(x));
        if (cleanData.length < minSamples) return { mean:0, median:0, std:0, mad:0, samples:0, valid:false };
        const sorted = [...cleanData].sort((a,b)=>a-b);
        const mid = Math.floor(sorted.length/2);
        const median = sorted.length%2===0 ? (sorted[mid-1]+sorted[mid])/2 : sorted[mid];
        const absDeviations = cleanData.map(x => Math.abs(x - median));
        const sortedDevs = [...absDeviations].sort((a,b)=>a-b);
        const midDev = Math.floor(sortedDevs.length/2);
        const mad = sortedDevs.length%2===0 ? (sortedDevs[midDev-1] + sortedDevs[midDev])/2 : sortedDevs[midDev];
        if (removeOutliers && mad > 0){
            const madThreshold = outlierThreshold * 1.4826 * mad;
            cleanData = cleanData.filter(x => Math.abs(x - median) <= madThreshold);
        }
        const mean = cleanData.reduce((s,x)=>s+x,0)/cleanData.length;
        const variance = cleanData.reduce((s,x)=>s+Math.pow(x-mean,2),0)/cleanData.length;
        const std = Math.sqrt(variance);
        return {
            mean, median, std, mad: mad*1.4826, samples: cleanData.length, originalSamples: data.length,
            outlierCount: data.length - cleanData.length, valid: cleanData.length>=minSamples,
            p25: sorted[Math.floor(sorted.length*0.25)], p75: sorted[Math.floor(sorted.length*0.75)], iqr: sorted[Math.floor(sorted.length*0.75)] - sorted[Math.floor(sorted.length*0.25)]
        };
    }

    function calculatePercentileFromZ(z){
        const erf = (x)=>{
            const sign = x>=0?1:-1; x = Math.abs(x);
            const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
            const t = 1.0/(1.0 + p*x);
            const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);
            return sign*y;
        };
        return Math.round(50 + 50 * erf(z/Math.sqrt(2)));
    }

    function calculateRobustZScore(value, data, options={}){
        const { useMAD=false, clip=5 } = options;
        const stats = robustStatistics(data, options);
        if (!stats.valid || (useMAD ? stats.mad : stats.std) === 0){
            return { zScore:0, isSignificant:false, interpretation:'INSUFFICIENT_DATA', stats };
        }
        const zScore = useMAD ? (value - stats.median)/stats.mad : (value - stats.mean)/stats.std;
        const clippedZ = Math.max(-clip, Math.min(clip, zScore));
        let interpretation = 'NORMAL', isSignificant=false;
        if (Math.abs(zScore) >= 3){ interpretation = zScore>0?'EXTREME_HIGH':'EXTREME_LOW'; isSignificant=true; }
        else if (Math.abs(zScore) >= 2){ interpretation = zScore>0?'VERY_HIGH':'VERY_LOW'; isSignificant=true; }
        else if (Math.abs(zScore) >= 1.5){ interpretation = zScore>0?'HIGH':'LOW'; }
        return { zScore: Number(clippedZ.toFixed(2)), rawZScore: Number(zScore.toFixed(2)), isSignificant, interpretation, percentile: calculatePercentileFromZ(zScore), stats };
    }

    // Momentum score (linear regression slope normalized)
    function calculateMomentumScore(history, periods = 10){
        if (core && core.calculateMomentumScore) return core.calculateMomentumScore(history, periods);
        if (!history || history.length < periods) return 0;
        const recent = history.slice(-periods);
        const prices = recent.map(h => h.price || h.last || 0).filter(p=>p>0);
        if (prices.length < periods) return 0;
        const n = prices.length;
        const sumX = (n*(n+1))/2;
        const sumY = prices.reduce((s,p)=>s+p,0);
        const sumXY = prices.reduce((s,p,i)=>s + p*(i+1),0);
        const sumX2 = (n*(n+1)*(2*n+1))/6;
        const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
        const avgPrice = sumY / n;
        return Math.tanh(slope / avgPrice * 100);
    }

    // computeATR: use core if available
    function computeATR(history, period=14){
        if (core && core.computeATR) return core.computeATR(history, period);
        if (!history || history.length < 2) return 0;
        const trs = [];
        for (let i=1;i<history.length;i++){
            const curr = history[i], prev = history[i-1];
            const high = toNum(curr.high) || toNum(curr.last) || 0;
            const low = toNum(curr.low) || toNum(curr.last) || 0;
            const prevClose = toNum(prev.last) || toNum(prev.close) || 0;
            trs.push(Math.max(high-low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
        }
        if (trs.length===0) return 0;
        const lookback = Math.min(period, trs.length);
        const sum = trs.slice(-lookback).reduce((s,v)=>s+v,0);
        return safeDiv(sum, lookback, 0);
    }

    // Enhanced analytics that returns vol ratio meta and normalized fields
    function improvedComputeAnalytics(p){
        const volBuy2h = toNum(p.volBuy2h) || toNum(p.count_VOL_minute_120_buy) || 0;
        const volSell2h = toNum(p.volSell2h) || toNum(p.count_VOL_minute_120_sell) || 0;
        const volRatioAnalysis = calculateImprovedVolRatio(volBuy2h, volSell2h);
        return {
            volImbalance2h: (volRatioAnalysis.imbalance || 0) / 100,
            volRatioBuySell_percent: volRatioAnalysis.buyPercent,
            volDurability2h_percent: volRatioAnalysis.buyPercent,
            volRatioLogScale: volRatioAnalysis.logRatio,
            volRatioInterpretation: volRatioAnalysis.interpretation,
            volRatioStrength: volRatioAnalysis.strength,
            _volRatioMeta: volRatioAnalysis
        };
    }

    // checkTimeframeConfirmation helper
    function getTimeframeDurability(data, timeframe){
        const map = {
            '1m': { buyKey: 'count_VOL_minute1_buy', sellKey: 'count_VOL_minute1_sell' },
            '5m': { buyKey: 'count_VOL_minute_5_buy', sellKey: 'count_VOL_minute_5_sell' },
            '10m': { buyKey: 'count_VOL_minute_10_buy', sellKey: 'count_VOL_minute_10_sell' },
            '30m': { buyKey: 'count_VOL_minute_30_buy', sellKey: 'count_VOL_minute_30_sell' },
            '60m': { buyKey: 'count_VOL_minute_60_buy', sellKey: 'count_VOL_minute_60_sell' },
            '120m': { buyKey: 'count_VOL_minute_120_buy', sellKey: 'count_VOL_minute_120_sell' },
            '24h': { buyKey: 'count_VOL_minute_1440_buy', sellKey: 'count_VOL_minute_1440_sell' }
        };
        const cfg = map[timeframe]; if (!cfg) return null;
        const buy = toNum(data[cfg.buyKey]) || 0; const sell = toNum(data[cfg.sellKey]) || 0; const total = buy + sell;
        if (total === 0) return null;
        return { durability: (buy/total)*100, imbalance: ((buy - sell)/total)*100, buy, sell, total };
    }

    // checkTimeframeConfirmation (reused in enhanced rec)
    function checkTimeframeConfirmation(data, targetSignal, config){
        const conf = config || { requiredTimeframes: ['5m','30m','120m'], minTimeframes: 2 };
        const timeframes = conf.requiredTimeframes;
        const agreements = timeframes.map(tf=>{ const d = getTimeframeDurability(data, tf); if(!d) return null; const signal = d.imbalance > 20 ? 'BUY' : d.imbalance < -20 ? 'SELL' : 'NEUTRAL'; return { timeframe: tf, signal, imbalance: d.imbalance, agrees: signal === targetSignal }; }).filter(x=>x!==null);
        const agreementCount = agreements.filter(x=>x.agrees).length;
        return { confirmed: agreementCount >= (conf.minTimeframes||2), confirmationScore: agreements.length?agreementCount/agreements.length:0, agreements };
    }

    // RECOMMENDATION_CONFIG (kept minimal here, can be extended)
    const RECOMMENDATION_CONFIG = {
        weights: { pricePosition:0.15, volDurability:0.20, volImbalance:0.20, freqImbalance:0.15, persistence:0.12, divergence:0.08, momentum:0.10 },
        thresholds: { buy:0.35, sell:-0.35, strongBuy:0.60, strongSell:-0.60, minConfidence:50 },
        confirmation: { minTimeframes:2, requiredTimeframes:['5m','30m','120m'] },
        risk: { maxPenalty:0.6, thresholds: { low:30, medium:50, high:70 } }
    };

    function calculateEnhancedRecommendation(data, options={}){
        const { applyState=false, timeframe='120m', dynamicWeights=true } = options;
        if (!data) return { recommendation:'HOLD', confidence:0, score:0, className:'recommendation-hold', factors:{}, warnings:['No data provided'] };
        const a = data && (data.analytics || data._analytics) ? (data.analytics || data._analytics) : {};
        const history = data._history || [];
        const pricePosition = Number(data.pricePosition || a.pricePosition || 50);
        const volDur2h = Number(a.volDurability2h_percent || 50);
        const volDur24h = Number(a.volDurability24h_percent || 50);
        const zBuy = Number(a.zScoreBuy2h || 0); const zSell = Number(a.zScoreSell2h || 0);
        const freqZBuy = Number(a.zScoreFreqBuy2h || 0); const freqZSell = Number(a.zScoreFreqSell2h || 0);
        const persistence = Number(a.persistenceBuy3 || 0); const divergence = a.divergence || null; const riskScore = Number(a.riskScore || 0);
        const factors = { pricePosition: (50 - pricePosition)/50, volDurability: (volDur2h - 50)/50, volDur24h: (volDur24h - 50)/50, volImbalance: Math.tanh((zBuy - zSell)/3), freqImbalance: Math.tanh((freqZBuy - freqZSell)/3), persistence: (persistence - 1.5)/1.5, divergence: divergence ? (typeof divergence === 'string' && divergence.toLowerCase().includes('bull')?0.5:(typeof divergence === 'string' && divergence.toLowerCase().includes('bear')?-0.5:0)) : 0, momentum: history.length>=10?calculateMomentumScore(history):0 };
        let weights = { ...RECOMMENDATION_CONFIG.weights };
        if (dynamicWeights){
            const priceVolatility = Math.abs(factors.pricePosition);
            if (priceVolatility > 0.7){ weights.pricePosition *= 0.7; weights.momentum *= 1.3; }
            if (Math.abs(factors.persistence) > 0.5){ weights.persistence *= 1.5; weights.volImbalance *= 0.8; }
            if (Math.abs(factors.divergence) > 0){ weights.divergence *= 2.0; }
            const totalWeight = Object.values(weights).reduce((s,w)=>s+w,0); Object.keys(weights).forEach(k=>weights[k]/=totalWeight);
        }
        let rawScore = 0;
        Object.keys(factors).forEach(k=>{ if (weights[k]) rawScore += weights[k] * factors[k]; });
        const riskPenalty = Math.min(RECOMMENDATION_CONFIG.risk.maxPenalty, riskScore/100 * RECOMMENDATION_CONFIG.risk.maxPenalty);
        const adjustedScore = rawScore * (1 - riskPenalty);
        const finalScore = Math.max(-1, Math.min(1, adjustedScore));
        const thresholds = RECOMMENDATION_CONFIG.thresholds;
        let recommendation = 'HOLD'; let strength = 'WEAK';
        if (finalScore >= thresholds.strongBuy){ recommendation='STRONG_BUY'; strength='STRONG'; }
        else if (finalScore >= thresholds.buy){ recommendation='BUY'; strength='MODERATE'; }
        else if (finalScore <= thresholds.strongSell){ recommendation='STRONG_SELL'; strength='STRONG'; }
        else if (finalScore <= thresholds.sell){ recommendation='SELL'; strength='MODERATE'; }
        let confidence = Math.abs(finalScore)*100; const sampleSize = a.volBuyStats?.samples || 0;
        if (sampleSize < 10) confidence *= 0.5; else if (sampleSize < 20) confidence *= 0.75;
        if (recommendation !== 'HOLD'){ const conf = checkTimeframeConfirmation(data, recommendation.includes('BUY')?'BUY':'SELL', RECOMMENDATION_CONFIG.confirmation); if (conf.confirmed) confidence *= 1.2; else confidence *= 0.8; }
        confidence = Math.min(100, Math.round(confidence));
        if (confidence < thresholds.minConfidence && recommendation !== 'HOLD'){ recommendation='HOLD'; strength='WEAK'; }
        const warnings = []; if (sampleSize < 10) warnings.push('Limited historical data'); if (riskScore > 70) warnings.push('High risk detected'); if (Math.abs(factors.divergence)>0) warnings.push('Price/volume divergence present');
        const className = recommendation.includes('BUY') ? 'recommendation-buy' : recommendation.includes('SELL') ? 'recommendation-sell' : 'recommendation-hold';
        return { recommendation, confidence, score: Number(finalScore.toFixed(3)), rawScore: Number(rawScore.toFixed(3)), strength, className, factors, weights, riskScore, riskPenalty: Number(riskPenalty.toFixed(2)), sampleSize, warnings, _debug:{ factorContributions: Object.keys(factors).map(key=>({ factor:key, value: factors[key].toFixed(3), weight: (weights[key]||0).toFixed(3), contribution: ((factors[key]||0)*(weights[key]||0)).toFixed(3) })) } };
    }

    // Market regime detection
    function getRegimeClassName(regime){ const map = { 'TRENDING_UP':'text-success fw-bold','TRENDING_DOWN':'text-danger fw-bold','ACCUMULATION':'text-info fw-bold','DISTRIBUTION':'text-warning fw-bold','BREAKOUT_PENDING':'text-warning','VOLATILE':'text-danger','RANGING':'text-muted' }; return map[regime]||'text-muted'; }
    function getRegimeEmoji(regime){ const map = { 'TRENDING_UP':'📈','TRENDING_DOWN':'📉','ACCUMULATION':'🔋','DISTRIBUTION':'🔻','BREAKOUT_PENDING':'💥','VOLATILE':'⚡','RANGING':'↔️' }; return map[regime]||'❓'; }

    function calculateTrendStrengthFromPrices(prices){ if (!prices||prices.length<2) return 0; const n = prices.length; const sumX=(n*(n+1))/2; const sumY=prices.reduce((s,p)=>s+p,0); const sumXY = prices.reduce((s,p,i)=>s + p*(i+1),0); const sumX2=(n*(n+1)*(2*n+1))/6; const slope = (n*sumXY - sumX*sumY)/(n*sumX2 - sumX*sumX); const avgPrice = sumY/n; const intercept = (sumY - slope*sumX)/n; const yPred = prices.map((_,i)=>slope*(i+1)+intercept); const ssRes = prices.reduce((s,y,i)=>s+Math.pow(y - yPred[i],2),0); const ssTot = prices.reduce((s,y)=>s+Math.pow(y - avgPrice,2),0); const rSquared = 1 - (ssRes/ssTot); const normalizedSlope = Math.tanh(slope/avgPrice*100); return normalizedSlope * rSquared; }

    function detectMarketRegime(data, history){
        if (!history || history.length < 30) return { regime:'UNKNOWN', confidence:0, characteristics:[], warnings:['Insufficient history for regime detection'] };
        const a = data && (data.analytics || data._analytics) ? (data.analytics || data._analytics) : {};
        const atr = computeATR(history,14);
        const avgPrice = history.length>0 ? history.slice(-14).reduce((s,h)=>s + (h.price||h.last||0),0)/Math.min(history.length,14) : toNum(data.last||data.price||0);
        const atrPercent = safeDiv(atr, avgPrice, 0) * 100;
        const prices = history.slice(-30).map(h=>h.price||h.last||0);
        const trendStrength = calculateTrendStrengthFromPrices(prices);
        const recentVol = history.slice(-10).map(h=>h.volBuy2h||0); const olderVol = history.slice(-30,-10).map(h=>h.volBuy2h||0);
        const avgRecentVol = recentVol.reduce((s,v)=>s+v,0)/recentVol.length; const avgOlderVol = olderVol.reduce((s,v)=>s+v,0)/olderVol.length; const volTrend = avgOlderVol>0 ? (avgRecentVol/avgOlderVol - 1)*100 : 0;
        const highPrices = history.slice(-20).map(h=>h.high||h.price||h.last||0); const lowPrices = history.slice(-20).map(h=>h.low||h.price||h.last||0); const maxHigh = Math.max(...highPrices); const minLow = Math.min(...lowPrices.filter(x=>x>0)); const rangePercent = minLow>0 ? ((maxHigh - minLow)/minLow)*100 : 0;
        const volDur2h = Number(a.volDurability2h_percent || 50); const volImbalance = (volDur2h - 50)/50;
        const momentumScores = []; for (let i=10;i<history.length;i+=5){ const slice = history.slice(i-10,i); momentumScores.push(calculateMomentumScore(slice)); }
        const momentumStd = momentumScores.length? standardDeviation(momentumScores) : 0;
        const characteristics = []; let regime='RANGING'; let confidence=0;
        if (trendStrength > 0.5 && volImbalance > 0.3 && volTrend > 10){ regime='TRENDING_UP'; confidence = Math.min(100, (trendStrength + Math.abs(volImbalance))*50 + volTrend); characteristics.push('Strong upward momentum','Increasing buy volume'); if (atrPercent>3) characteristics.push('High volatility trending'); }
        else if (trendStrength < -0.5 && volImbalance < -0.3 && volTrend > 10){ regime='TRENDING_DOWN'; confidence = Math.min(100, (Math.abs(trendStrength) + Math.abs(volImbalance))*50 + volTrend); characteristics.push('Strong downward momentum','Increasing sell volume'); if (atrPercent>3) characteristics.push('High volatility trending'); }
        else if (trendStrength > -0.2 && trendStrength < 0.3 && volImbalance > 0.3 && volTrend > 5 && atrPercent < 2){ regime='ACCUMULATION'; confidence = Math.min(100, Math.abs(volImbalance)*70 + (2-atrPercent)*10); characteristics.push('Sideways price action','Building buy pressure','Low volatility','Potential bottom formation'); }
        else if (trendStrength > -0.3 && trendStrength < 0.2 && volImbalance < -0.3 && volTrend > 5 && atrPercent < 2){ regime='DISTRIBUTION'; confidence = Math.min(100, Math.abs(volImbalance)*70 + (2-atrPercent)*10); characteristics.push('Sideways price action','Building sell pressure','Low volatility','Potential top formation'); }
        else if (atrPercent < 1.5 && rangePercent < 5 && momentumStd < 0.3){ regime='BREAKOUT_PENDING'; confidence = Math.min(100, (1.5 - atrPercent)*50 + (5 - rangePercent)*10); characteristics.push('Extremely low volatility','Tight price range','Coiling pattern','Breakout imminent'); }
        else if (atrPercent > 5 || momentumStd > 0.5){ regime='VOLATILE'; confidence = Math.min(100, atrPercent*10 + momentumStd*100); characteristics.push('High volatility','Erratic price action','Mixed signals'); if (Math.abs(trendStrength) < 0.2) characteristics.push('No clear direction'); }
        else { regime='RANGING'; confidence = Math.max(0, 70 - Math.abs(trendStrength)*50 - Math.abs(volImbalance)*30); characteristics.push('Sideways movement','Balanced volume'); if (atrPercent>2 && atrPercent<4) characteristics.push('Moderate volatility'); else if (atrPercent<=2) characteristics.push('Low volatility'); }
        const strategies = []; const warnings = [];
        switch(regime){ case 'TRENDING_UP': strategies.push('Trend following: Buy dips, ride momentum'); strategies.push('Use trailing stops'); if (volImbalance>0.7) warnings.push('Overextended - watch for reversal'); break; case 'TRENDING_DOWN': strategies.push('Trend following: Sell rallies, short momentum'); strategies.push('Tight stops on longs'); if (volImbalance<-0.7) warnings.push('Oversold - watch for bounce'); break; case 'ACCUMULATION': strategies.push('Accumulate on weakness'); strategies.push('Set buy limit orders'); strategies.push('Prepare for upside breakout'); break; case 'DISTRIBUTION': strategies.push('Reduce exposure on strength'); strategies.push('Tighten stops'); strategies.push('Prepare for downside breakout'); break; case 'BREAKOUT_PENDING': strategies.push('Wait for breakout confirmation'); strategies.push('Set alerts at range boundaries'); strategies.push('Avoid premature entries'); warnings.push('False breakouts common in this regime'); break; case 'VOLATILE': strategies.push('Reduce position sizes'); strategies.push('Widen stops or avoid trading'); strategies.push('Wait for regime clarity'); warnings.push('High risk environment'); break; case 'RANGING': strategies.push('Mean reversion: Buy support, sell resistance'); strategies.push('Avoid trend-following strategies'); strategies.push('Use range boundaries for entries/exits'); break; }
        return { regime, confidence: Math.round(confidence), characteristics, strategies, warnings, metrics: { atrPercent: Number(atrPercent.toFixed(2)), trendStrength: Number(trendStrength.toFixed(3)), volTrend: Number(volTrend.toFixed(1)), rangePercent: Number(rangePercent.toFixed(2)), volImbalance: Number(volImbalance.toFixed(3)), momentumStd: Number(momentumStd.toFixed(3)) }, className: getRegimeClassName(regime), emoji: getRegimeEmoji(regime) };
    }

    function standardDeviation(arr){ const mean = arr.reduce((s,x)=>s+x,0)/arr.length; return Math.sqrt(arr.reduce((s,x)=>s+Math.pow(x-mean,2),0)/arr.length); }

    // Support/resistance helper omitted for brevity in enhanced module (UI can use existing function)

    function calculateAdaptiveStops(data, history, recommendation, stopConfig){
        const STOP_CONFIG = stopConfig || { atrMultipliers: { TRENDING_UP:{sl:1.5,tp:3.0}, TRENDING_DOWN:{sl:1.5,tp:3.0}, RANGING:{sl:1.0,tp:2.0}, VOLATILE:{sl:2.5,tp:4.0}, ACCUMULATION:{sl:1.2,tp:2.5}, DISTRIBUTION:{sl:1.2,tp:2.5}, BREAKOUT_PENDING:{sl:1.0,tp:3.5} }, minRiskReward:1.5, maxRiskReward:5.0, maxStopPercent:10, minStopPercent:0.5, maxTpPercent:20, minTpPercent:1.0 };
        if (!data || !history || history.length < 20) return { stopLoss:null, takeProfit:null, riskReward:0, confidence:0, warnings:['Insufficient data for stop calculation'] };
        const currentPrice = Number(data.last || data.price || 0); if (currentPrice <= 0) return { stopLoss:null, takeProfit:null, riskReward:0, confidence:0, warnings:['Invalid current price'] };
        const regime = (data.analytics || data._analytics)?.marketMode?.mode || 'RANGING'; const atr = computeATR(history,14); const atrPercent = (atr / currentPrice) * 100;
        // naive SR detection - use simple local extrema cluster
        const sr = (function(){ const lookback=50; if (!history || history.length<lookback) return { supports:[], resistances:[], pivots:{ pivot:0,r1:0,r2:0,s1:0,s2:0 } }; const recent = history.slice(-lookback); const highs = recent.map(h=>h.high||h.price||h.last||0); const lows = recent.map(h=>h.low||h.price||h.last||0); const closes = recent.map(h=>h.price||h.last||0); const supports=[]; const resistances=[]; for (let i=2;i<recent.length-2;i++){ const low=lows[i], high=highs[i]; if (low<=lows[i-1] && low<=lows[i-2] && low<=lows[i+1] && low<=lows[i+2]) supports.push({ price: low, index:i, strength:1}); if (high>=highs[i-1] && high>=highs[i-2] && high>=highs[i+1] && high>=highs[i+2]) resistances.push({ price: high, index:i, strength:1}); } const cluster=(levels,tol=0.02)=>{ if(levels.length===0) return []; const s=[...levels].sort((a,b)=>a.price-b.price); const clusters=[]; let c=[s[0]]; for (let i=1;i<s.length;i++){ const diff=Math.abs(s[i].price - c[0].price)/c[0].price; if (diff<=tol) c.push(s[i]); else { const avg=c.reduce((u,l)=>u+l.price,0)/c.length; clusters.push({ price:avg, strength:c.length, touches:c.length }); c=[s[i]]; } } if (c.length>0){ const avg=c.reduce((u,l)=>u+l.price,0)/c.length; clusters.push({ price:avg, strength:c.length, touches:c.length }); } return clusters.sort((a,b)=>b.strength - a.strength); }; const lastClose = closes[closes.length-1]; const lastHigh = Math.max(...highs.slice(-5)); const lastLow = Math.min(...lows.slice(-5).filter(x=>x>0)); const pivot = (lastHigh + lastLow + lastClose)/3; const r1 = 2*pivot - lastLow; const r2 = pivot + (lastHigh - lastLow); const s1 = 2*pivot - lastHigh; const s2 = pivot - (lastHigh - lastLow); return { supports: cluster(supports), resistances: cluster(resistances), pivots:{ pivot, r1, r2, s1, s2 } }; })();
        const multipliers = STOP_CONFIG.atrMultipliers[regime] || STOP_CONFIG.atrMultipliers.RANGING;
        let stopLossDistance = atr * multipliers.sl; let takeProfitDistance = atr * multipliers.tp;
        const direction = recommendation?.recommendation?.includes('BUY') ? 'LONG' : recommendation?.recommendation?.includes('SELL') ? 'SHORT' : null;
        if (direction === 'LONG'){
            const nearestSupport = sr.supports.filter(s=>s.price < currentPrice).sort((a,b)=>b.price - a.price)[0];
            if (nearestSupport){ const supportDistance = currentPrice - nearestSupport.price; if (supportDistance > atr*0.5 && supportDistance < atr*2){ stopLossDistance = supportDistance * 1.1; } }
            const nearestResistance = sr.resistances.filter(r=>r.price > currentPrice).sort((a,b)=>a.price - b.price)[0];
            if (nearestResistance){ const resistanceDistance = nearestResistance.price - currentPrice; if (resistanceDistance > stopLossDistance * STOP_CONFIG.minRiskReward){ takeProfitDistance = resistanceDistance * 0.95; } }
            if (!nearestResistance && sr.pivots.r1 > currentPrice) takeProfitDistance = Math.max(takeProfitDistance, sr.pivots.r1 - currentPrice);
        } else if (direction === 'SHORT'){
            const nearestResistance = sr.resistances.filter(r=>r.price > currentPrice).sort((a,b)=>a.price - b.price)[0];
            if (nearestResistance){ const resistanceDistance = nearestResistance.price - currentPrice; if (resistanceDistance > atr*0.5 && resistanceDistance < atr*2){ stopLossDistance = resistanceDistance * 1.1; } }
            const nearestSupport = sr.supports.filter(s=>s.price < currentPrice).sort((a,b)=>b.price - a.price)[0];
            if (nearestSupport){ const supportDistance = currentPrice - nearestSupport.price; if (supportDistance > stopLossDistance * STOP_CONFIG.minRiskReward){ takeProfitDistance = supportDistance * 0.95; } }
            if (!nearestSupport && sr.pivots.s1 < currentPrice) takeProfitDistance = Math.max(takeProfitDistance, currentPrice - sr.pivots.s1);
        }
        const stopLossPercent = (stopLossDistance / currentPrice) * 100; const takeProfitPercent = (takeProfitDistance / currentPrice) * 100;
        const finalStopPercent = Math.max(STOP_CONFIG.minStopPercent, Math.min(STOP_CONFIG.maxStopPercent, stopLossPercent));
        const finalTpPercent = Math.max(STOP_CONFIG.minTpPercent, Math.min(STOP_CONFIG.maxTpPercent, takeProfitPercent));
        let adjustedTpPercent = finalTpPercent; const currentRR = finalTpPercent / finalStopPercent;
        if (currentRR < STOP_CONFIG.minRiskReward) adjustedTpPercent = finalStopPercent * STOP_CONFIG.minRiskReward;
        else if (currentRR > STOP_CONFIG.maxRiskReward) adjustedTpPercent = finalStopPercent * STOP_CONFIG.maxRiskReward;
        const finalRR = adjustedTpPercent / finalStopPercent;
        const stopLossPrice = direction === 'LONG' ? currentPrice * (1 - finalStopPercent/100) : currentPrice * (1 + finalStopPercent/100);
        const takeProfitPrice = direction === 'LONG' ? currentPrice * (1 + adjustedTpPercent/100) : currentPrice * (1 - adjustedTpPercent/100);
        let confidence = 50; if (atrPercent > 0.5 && atrPercent < 5) confidence += 20; const hasNearbySupport = sr.supports.some(s=>Math.abs(s.price - stopLossPrice)/stopLossPrice < 0.02); const hasNearbyResistance = sr.resistances.some(r=>Math.abs(r.price - takeProfitPrice)/takeProfitPrice < 0.02);
        if (hasNearbySupport && direction==='LONG') confidence += 15; if (hasNearbyResistance && direction==='SHORT') confidence += 15; if (hasNearbyResistance && direction==='LONG') confidence += 10; if (hasNearbySupport && direction==='SHORT') confidence += 10; if (finalRR >= 2.0) confidence += 15; else if (finalRR >= 1.5) confidence += 10; confidence = Math.min(100, confidence);
        const warnings = []; if (atrPercent > 5) warnings.push('High volatility - wide stops required'); if (atrPercent < 0.5) warnings.push('Low volatility - tight stops may get hit'); if (finalRR < 2.0) warnings.push('Suboptimal risk/reward ratio'); if (finalStopPercent > 5) warnings.push('Large stop loss relative to entry'); if (!hasNearbySupport && direction==='LONG') warnings.push('No strong support near stop'); if (!hasNearbyResistance && direction==='SHORT') warnings.push('No strong resistance near stop');
        return { entryPrice: currentPrice, stopLoss: Number(stopLossPrice.toFixed(8)), takeProfit: Number(takeProfitPrice.toFixed(8)), stopLossPercent: Number(finalStopPercent.toFixed(2)), takeProfitPercent: Number(adjustedTpPercent.toFixed(2)), riskReward: Number(finalRR.toFixed(2)), riskAmount: Number(finalStopPercent.toFixed(2)), rewardAmount: Number(adjustedTpPercent.toFixed(2)), direction, regime, atrPercent: Number(atrPercent.toFixed(2)), confidence: Math.round(confidence), supportResistance: { nearestSupport: sr.supports[0]||null, nearestResistance: sr.resistances[0]||null, pivots: sr.pivots }, warnings };
    }

    function calculatePositionSize(accountBalance, riskPercent, stopLossPercent){ if (!accountBalance || !riskPercent || !stopLossPercent) return null; const riskAmount = accountBalance * (riskPercent/100); const positionSize = riskAmount / (stopLossPercent/100); return { accountBalance, riskPercent, riskAmount: Number(riskAmount.toFixed(2)), stopLossPercent, positionSize: Number(positionSize.toFixed(2)), maxLoss: Number(riskAmount.toFixed(2)) }; }

    // Export
    window.AnalyticsEnhanced = window.AnalyticsEnhanced || {};
    Object.assign(window.AnalyticsEnhanced, {
        calculateImprovedVolRatio,
        improvedComputeAnalytics,
        robustStatistics,
        calculateRobustZScore,
        calculateMomentumScore,
        computeATR,
        calculateEnhancedRecommendation,
        detectMarketRegime,
        calculateAdaptiveStops,
        calculatePositionSize
    });

    console.log('[AnalyticsEnhanced] loaded');
})();
