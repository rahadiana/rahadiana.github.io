/**
 * worker-pool.js
 * Web Worker Pool for multicore processing in browser
 * Uses inline Blob workers - no separate files needed
 * 
 * IMPORTANT: Formulas here MUST match analytics-core.js exactly!
 * This is the worker-thread version of the same calculations.
 */

(function() {
    'use strict';

    // Module-scoped cache for WebGPU config to avoid scattering direct writes to window
    let _localWEBGPUConfig = (function(){ try { return (typeof window !== 'undefined' && window.WEBGPU_CONFIG) ? window.WEBGPU_CONFIG : undefined } catch(e){ return undefined } })();
    const getGlobalWebGPUConfig = function() {
        return _localWEBGPUConfig;
    };

    // Worker implementation moved to js/modules/worker.js to allow importing the single-source AnalyticsCore
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
        return { valid: true, value: smooth, rawMean: avg, normalized, interpretation, className };
    }

        function computeVWAPBands(history, opts) {
            opts = opts || {};
            const lookback = opts.lookbackPeriods || 120;
            const stdMultiplier = (typeof opts.stdMultiplier === 'number') ? opts.stdMultiplier : 2.0;
            const adaptive = !!opts.adaptiveMultiplier;
            const minM = opts.minMultiplier || 1.5;
            const maxM = opts.maxMultiplier || 3.0;
            if (!Array.isArray(history) || history.length === 0) return { valid:false, reason:'INSUFFICIENT_DATA' };
            const slice = history.slice(-lookback);
            let num=0, den=0; const prices=[];
            for (const p of slice) {
                const price = toNum(p.price) || toNum(p.last) || 0;
                const vol = (toNum(p.volBuy2h)||0)+(toNum(p.volSell2h)||0)||toNum(p.vol)||0;
                if (price && vol) { num += price*vol; den += vol; }
                if (price) prices.push({price,vol});
            }
            const vwap = den>0? num/den : (prices.length?prices[prices.length-1].price:0);
            let varNum=0; for (const pv of prices) varNum += pv.vol * Math.pow(pv.price - vwap, 2);
            const std = den>0 ? Math.sqrt(varNum/den) : 0;
            let mult = stdMultiplier;
            if (adaptive && std>0 && vwap>0) { const rel = std/Math.max(1e-8,vwap); mult = Math.max(minM, Math.min(maxM, stdMultiplier*(1+rel*5))); }
            const upper = vwap + mult*std; const lower = vwap - mult*std;
            const position = vwap===0 ? 'N/A' : ((prices.length && prices[prices.length-1].price>upper)?'ABOVE_VWAP':(prices.length && prices[prices.length-1].price<lower)?'BELOW_VWAP':'AT_VWAP');
            const deviationPct = vwap>0?((prices.length? (prices[prices.length-1].price - vwap):0)/vwap)*100:0;
            const signal = position==='ABOVE_VWAP' && Math.abs(deviationPct) > (std/vwap*100) ? 'OVERBOUGHT_WARNING' : (position==='BELOW_VWAP'?'OVERSOLD':'NONE');
            return { valid:true, vwap, upperBand: upper, lowerBand: lower, std, multiplier: mult, currentPosition: position, deviationPct, signal, className: signal==='OVERBOUGHT_WARNING'?'text-danger':(signal==='OVERSOLD'?'text-success':'text-muted') };
        }

        function computeCVD(history, opts) {
            opts = opts || {};
            const windowOpt = opts.window || 'all';
            const normalization = opts.normalizationMethod || 'total';
            if (!Array.isArray(history) || history.length===0) return { valid:false, reason:'INSUFFICIENT_DATA' };
            const slice = history.slice(-(windowOpt==='all'?history.length:windowOpt));
            let cvd=0, totalVol=0;
            for (const p of slice) {
                const buy = toNum(p.volBuy2h)||toNum(p.buy)||toNum(p.vol_buy)||0;
                const sell = toNum(p.volSell2h)||toNum(p.sell)||toNum(p.vol_sell)||0;
                const delta = buy - sell; cvd += delta; totalVol += Math.abs(buy)+Math.abs(sell);
            }
            let normalized = cvd; if (normalization==='total' && totalVol>0) normalized = cvd/totalVol;
            const absNorm = Math.abs(normalized); let trend='NEUTRAL'; if (absNorm>0.05) trend = (normalized>0)?'ACCUMULATION':'DISTRIBUTION';
            const strength = absNorm>0.2?'STRONG':absNorm>0.08?'MODERATE':'WEAK';
            return { valid:true, value: cvd, normalized, trend, strength, className: trend==='ACCUMULATION'?'text-success':(trend==='DISTRIBUTION'?'text-danger':'text-muted') };
        }

        function computeRVOL(history, opts) {
            opts = opts || {};
            const baselinePeriods = opts.baselinePeriods || 14;
            const minSamples = opts.minSamplesRequired || 10;
            if (!Array.isArray(history) || history.length < minSamples) return { valid:false, reason:'INSUFFICIENT_DATA' };
            const slice = history.slice(-Math.max(baselinePeriods,1)-1);
            const vols = [];
            for (const p of slice.slice(0,-1)) { const vol = (toNum(p.volBuy2h)||0)+(toNum(p.volSell2h)||0)||toNum(p.vol)||0; vols.push(Math.max(vol,1)); }
            const baseline = vols.length ? vols.reduce((s,v)=>s+v,0)/vols.length : 1;
            const last = slice.length ? slice[slice.length-1] : null; const current = last? ((toNum(last.volBuy2h)||0)+(toNum(last.volSell2h)||0)||toNum(last.vol)||0):0;
            const value = baseline>0? (current / baseline) : null;
            let significance = 'NONE'; if (!value || value < 1.2) significance = 'LOW'; else if (value < 2.0) significance = 'MODERATE'; else significance = 'HIGH';
            return { valid:true, value, baseline, current, significance, className: significance==='HIGH'?'text-warning fw-bold':(significance==='MODERATE'?'text-warning':'text-muted') };
        }

        // ============ Phase-2 Helpers in Worker ============
        function computeVPIN(history, opts) {
            opts = opts || {};
            const lookback = opts.lookbackBars || 50;
            const minSamples = opts.minSamples || 10;
            if (!Array.isArray(history) || history.length < minSamples) return { valid:false, reason:'INSUFFICIENT_DATA' };
            const slice = history.slice(-lookback);
            const imbalances = [];
            for (const p of slice) {
                const buy = toNum(p.volBuy) || toNum(p.volBuy2h) || toNum(p.vol_buy) || 0;
                const sell = toNum(p.volSell) || toNum(p.volSell2h) || toNum(p.vol_sell) || 0;
                const total = buy + sell;
                if (total <= 0) continue;
                imbalances.push(Math.abs((buy - sell) / total));
            }
            if (!imbalances.length) return { valid:false, reason:'NO_VOLUME' };
            const avg = imbalances.reduce((s,v)=>s+v,0)/imbalances.length;
            return { valid:true, value: avg, percent: avg*100, normalized: Math.round(mapTo0_100(avg,0,1)) };
        }

        function computeHurstExponent(history, opts) {
            opts = opts || {};
            const minSamples = opts.minSamples || 50;
            if (!Array.isArray(history) || history.length < minSamples) return { valid:false, reason:'INSUFFICIENT_DATA' };
            const prices = history.map(h=>toNum(h.price)||toNum(h.last)||0).filter(x=>Number.isFinite(x)&&x>0);
            if (prices.length < minSamples) return { valid:false, reason:'INSUFFICIENT_PRICES' };
            const N = prices.length;
            const ks=[]; const rs=[];
            const maxK = Math.floor(N/2);
            for (let k=10;k<=Math.min(100,maxK);k=Math.floor(k*1.5)){
                const segments = Math.floor(N/k);
                if (segments<2) continue;
                let Rsum=0;
                for (let s=0;s<segments;s++){
                    const seg = prices.slice(s*k,(s+1)*k);
                    const mean = seg.reduce((a,b)=>a+b,0)/seg.length;
                    const dev = seg.map(v=>v-mean);
                    const cum=[]; let c=0; for (const d of dev){ c+=d; cum.push(c);} 
                    const R = Math.max(...cum)-Math.min(...cum);
                    const S = Math.sqrt(seg.reduce((a,b)=>a+Math.pow(b-mean,2),0)/seg.length)||1e-8;
                    Rsum += R / S;
                }
                const RS = Rsum / segments;
                ks.push(Math.log(k)); rs.push(Math.log(RS));
            }
            if (ks.length<2) return { valid:false, reason:'INSUFFICIENT_SCALING' };
            const n = ks.length; const meanK = ks.reduce((a,b)=>a+b,0)/n; const meanR = rs.reduce((a,b)=>a+b,0)/n;
            let num=0, den=0; for (let i=0;i<n;i++){ num += (ks[i]-meanK)*(rs[i]-meanR); den += Math.pow(ks[i]-meanK,2); }
            const slope = den===0?0:num/den; let hurst = slope;
            if (!Number.isFinite(hurst) || hurst <= 0) hurst = 0;
            hurst = Math.max(0, Math.min(1, hurst));
            const interpretation = hurst>0.55?'TRENDING':(hurst<0.45?'MEAN_REVERTING':'RANDOM');
            return { valid:true, value: hurst, interpretation, normalized: Math.round(mapTo0_100(hurst,0,1)) };
        }

        function computeVolumeProfilePOC(history, opts) {
            opts = opts || {};
            const bins = opts.bins || 20;
            if (!Array.isArray(history) || history.length===0) return { valid:false, reason:'INSUFFICIENT_DATA' };
            const prices = history.map(h=>toNum(h.price)||toNum(h.last)||0).filter(p=>Number.isFinite(p));
            const vols = history.map(h=> (toNum(h.volBuy)||toNum(h.volBuy2h)||0) + (toNum(h.volSell)||toNum(h.volSell2h)||0) || toNum(h.vol)||0);
            const minP = Math.min(...prices); const maxP = Math.max(...prices);
            if (minP===maxP) return { valid:false, reason:'FLAT_PRICE' };
            const binSize = (maxP-minP)/bins; const profile=new Array(bins).fill(0);
            for (let i=0;i<prices.length;i++){ const p=prices[i]; const v=vols[i]||0; const idx = Math.min(bins-1,Math.max(0,Math.floor((p-minP)/binSize))); profile[idx]+=v; }
            let maxIdx=0, maxV=0, totalV=0; for (let i=0;i<profile.length;i++){ totalV+=profile[i]; if (profile[i]>maxV){ maxV=profile[i]; maxIdx=i; } }
            const poc = minP + (maxIdx+0.5)*binSize;
            const target = totalV*0.7; let areaV=profile[maxIdx]; let low=maxIdx, high=maxIdx;
            while (areaV<target && (low>0||high<bins-1)){
                const left = (low>0)?profile[low-1]:-1; const right = (high<bins-1)?profile[high+1]:-1;
                if (left>=right){ if (left>0){ low-=1; areaV+=profile[low]; } else if (right>0){ high+=1; areaV+=profile[high]; } else break; }
                else { if (right>0){ high+=1; areaV+=profile[high]; } else if (left>0){ low-=1; areaV+=profile[low]; } else break; }
            }
            const valueAreaLow = minP + low*binSize; const valueAreaHigh = minP + (high+1)*binSize;
            return { valid:true, poc, valueAreaLow, valueAreaHigh, profile, totalVolume: totalV };
        }

        function computeDepthImbalance(snapshot, opts) {
            opts = opts || {};
            if (!snapshot) return { valid:false, reason:'NO_SNAPSHOT' };
            const bid = toNum(snapshot.bidDepth)||toNum(snapshot.bid_size)||toNum(snapshot.bids_size)||0;
            const ask = toNum(snapshot.askDepth)||toNum(snapshot.ask_size)||toNum(snapshot.asks_size)||0;
            const total = bid + ask; if (total===0) return { valid:false, reason:'NO_DEPTH' };
            const imb = (bid - ask) / total; return { valid:true, value: imb, normalized: Math.round(mapTo0_100(imb,-1,1)), className: imb>0?'text-success':'text-danger' };
        }

        // ============ Message Handler ============
        // Runtime-controlled flag to enable/disable emitting legacy flattened keys
        let EMIT_LEGACY = true;

        self.onmessage = function(e) {
            const { id, type, payload } = e.data;
            
            try {
                let result;
                
                switch (type) {
                    case 'computeSmartMetrics':
                        result = computeSmartMetrics(payload.data);
                        break;
                        
                    case 'computeBatch':
                        // Process multiple coins at once - Smart metrics
                        result = {};
                        for (const [coin, data] of Object.entries(payload.coins)) {
                            result[coin] = {
                                smart: computeSmartMetrics(data),
                                volDur2h: calculateVolDurability(data, '2h'),
                                volDur24h: calculateVolDurability(data, '24h'),
                                volRatio2h: calculateVolRatio(data, '2h')
                            };
                        }
                        break;
                    
                    case 'computeAnalyticsBatch':
                        // Full analytics for all tabs
                        result = {};
                        for (const [coin, data] of Object.entries(payload.coins)) {
                            result[coin] = computeFullAnalytics(data);
                        }
                        break;
                    
                    case 'computeMicrostructure':
                        result = computeMicrostructureMetrics(payload.data);
                        break;
                        
                    case 'ping':
                        result = { pong: true, time: Date.now() };
                        break;
                    case 'config':
                        // Accept runtime config from main thread
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
                self.postMessage({ id, success: false, error: error.message });
            }
        };
        
        // ============ Full Analytics Computation ============
        function computeFullAnalytics(data) {
            const smart = computeSmartMetrics(data);
            
            // Volume metrics per timeframe
            const volMetrics = {};
            const timeframes = ['1m', '5m', '10m', '15m', '20m', '30m', '1h', '2h', '24h'];
            for (const tf of timeframes) {
                volMetrics[tf] = {
                    durability: calculateVolDurability(data, tf),
                    ratio: calculateVolRatio(data, tf)
                };
            }
            
            // Frequency metrics - prefer nested 'analytics', fallback to legacy '_analytics' or raw fields
            const a = data.analytics || data._analytics || {};
            const tf = a.timeframes || {};
            const freqMetrics = {
                buy1m: (tf['1m'] && tf['1m'].freqBuy) || Number(data.freq_buy_1MENIT) || 0,
                sell1m: (tf['1m'] && tf['1m'].freqSell) || Number(data.freq_sell_1MENIT) || 0,
                buy5m: (tf['5m'] && tf['5m'].freqBuy) || Number(data.freq_buy_5MENIT) || 0,
                sell5m: (tf['5m'] && tf['5m'].freqSell) || Number(data.freq_sell_5MENIT) || 0,
                buy10m: (tf['10m'] && tf['10m'].freqBuy) || Number(data.freq_buy_10MENIT) || 0,
                sell10m: (tf['10m'] && tf['10m'].freqSell) || Number(data.freq_sell_10MENIT) || 0,
                buy30m: (tf['30m'] && tf['30m'].freqBuy) || Number(data.freq_buy_30MENIT) || 0,
                sell30m: (tf['30m'] && tf['30m'].freqSell) || Number(data.freq_sell_30MENIT) || 0,
                buy1h: (tf['60m'] && tf['60m'].freqBuy) || Number(data.freq_buy_1JAM) || 0,
                sell1h: (tf['60m'] && tf['60m'].freqSell) || Number(data.freq_sell_1JAM) || 0,
                buy2h: a.freqBuy2h || (tf['120m'] && tf['120m'].freqBuy) || Number(data.freq_buy_2JAM) || 0,
                sell2h: a.freqSell2h || (tf['120m'] && tf['120m'].freqSell) || Number(data.freq_sell_2JAM) || 0
            };
            
            // Frequency ratios - use freqMetrics we just computed
            const freqRatios = {
                '1m': freqMetrics.sell1m > 0 ? (freqMetrics.buy1m / freqMetrics.sell1m) * 100 : (freqMetrics.buy1m > 0 ? null : 100),
                '5m': freqMetrics.sell5m > 0 ? (freqMetrics.buy5m / freqMetrics.sell5m) * 100 : (freqMetrics.buy5m > 0 ? null : 100),
                '10m': freqMetrics.sell10m > 0 ? (freqMetrics.buy10m / freqMetrics.sell10m) * 100 : (freqMetrics.buy10m > 0 ? null : 100),
                '30m': freqMetrics.sell30m > 0 ? (freqMetrics.buy30m / freqMetrics.sell30m) * 100 : (freqMetrics.buy30m > 0 ? null : 100),
                '1h': freqMetrics.sell1h > 0 ? (freqMetrics.buy1h / freqMetrics.sell1h) * 100 : (freqMetrics.buy1h > 0 ? null : 100),
                '2h': freqMetrics.sell2h > 0 ? (freqMetrics.buy2h / freqMetrics.sell2h) * 100 : (freqMetrics.buy2h > 0 ? null : 100)
            };
            
            // Microstructure
            const micro = computeMicrostructureMetrics(data);
            
            // Recommendation score (simplified)
            const recScore = calculateRecommendationScore(data, smart);

            // Advanced Tier-1 metrics in worker
            let history = Array.isArray(data._history) ? data._history : (Array.isArray(data.history) ? data.history : []);
            try { history = history.slice(-120); } catch (e) { history = history || []; }
            const vwapBands = (typeof computeVWAPBands === 'function') ? computeVWAPBands(history, { lookbackPeriods: 120, stdMultiplier: 2.0, adaptiveMultiplier: true, minMultiplier: 1.5, maxMultiplier: 3.0 }) : { valid: false };
            const kyle = (typeof computeKyleLambda === 'function') ? computeKyleLambda(history, { lookbackPeriods: 20, minSamples: 10, smoothingWindow: 5 }) : { valid: false };
            const cvd = (typeof computeCVD === 'function') ? computeCVD(history, { window: 'all', normalizationMethod: 'total', smoothingPeriod: 3 }) : { valid: false };
            const rvol = (typeof computeRVOL === 'function') ? computeRVOL(history, { baselinePeriods: 14, minSamplesRequired: 10 }) : { valid: false };
            // Phase-2 in worker: VPIN, Hurst, VolumeProfile, Depth Imbalance
            const vpin = (typeof computeVPIN === 'function') ? computeVPIN(history, { lookbackBars: 50, minSamples: 10 }) : { valid: false };
            const hurst = (typeof computeHurstExponent === 'function') ? computeHurstExponent(history, { minSamples: 50 }) : { valid: false };
            const volProfile = (typeof computeVolumeProfilePOC === 'function') ? computeVolumeProfilePOC(history, { bins: 24 }) : { valid: false };
            const depthImb = (typeof computeDepthImbalance === 'function') ? computeDepthImbalance((Array.isArray(data._history) ? data._history.slice(-1)[0] : data) || data) : { valid: false };

            return {
                smart,
                volMetrics,
                freqMetrics,
                freqRatios,
                micro,
                recScore,
                multiTfConfluence: calculateMultiTimeframeConfluence(data),
                // Tier-1 advanced metrics
                vwapBands,
                kyleLambda: kyle,
                cvd,
                rvol,
                // Phase-2
                vpin,
                hurst,
                volumeProfile: volProfile,
                depthImbalance: depthImb
            };
        }
        
        // ============ Microstructure Metrics ============
        function computeMicrostructureMetrics(data) {
            // Use pre-computed analytics if available, prefer nested 'analytics', fallback to legacy '_analytics' or raw data
            const a = data.analytics || data._analytics || {};
            const tf = a.timeframes || {};
            
            // Get values from analytics first, then raw WebSocket field names
            const volBuy2h = a.volBuy2h || Number(data.vol_buy_2JAM) || 0;
            const volSell2h = a.volSell2h || Number(data.vol_sell_2JAM) || 0;
            const freqBuy2h = a.freqBuy2h || Number(data.freq_buy_2JAM) || 0;
            const freqSell2h = a.freqSell2h || Number(data.freq_sell_2JAM) || 0;
            const avgVolBuy = a.avgBuy2h || Number(data.avg_VOLCOIN_buy_2JAM) || 1;
            const avgVolSell = a.avgSell2h || Number(data.avg_VOLCOIN_sell_2JAM) || 1;
            const avgFreqBuy = a.avgFreqBuy2h || Number(data.avg_FREQCOIN_buy_2JAM) || 1;
            
            // Get 1m and 5m data (correct WebSocket field names)
            const volBuy1m = (tf['1m'] && tf['1m'].volBuy) || Number(data.vol_buy_1MENIT) || 0;
            const volBuy5m = (tf['5m'] && tf['5m'].volBuy) || Number(data.vol_buy_5MENIT) || 0;
            const freqBuy1m = (tf['1m'] && tf['1m'].freqBuy) || Number(data.freq_buy_1MENIT) || 0;
            const freqBuy5m = (tf['5m'] && tf['5m'].freqBuy) || Number(data.freq_buy_5MENIT) || 0;
            
            const totalVol = volBuy2h + volSell2h;
            const totalFreq = freqBuy2h + freqSell2h;
            
            // Cohesion Index
            const volRatio = totalVol > 0 ? volBuy2h / totalVol : 0.5;
            const freqRatio = totalFreq > 0 ? freqBuy2h / totalFreq : 0.5;
            const pricePos = Number(data.price_position) || 50;
            const priceFactor = pricePos / 100;
            const cohesion = clamp(((volRatio + freqRatio + (1 - priceFactor)) / 3) * 100, 0, 100);
            
            // Acc Vol (Volume Acceleration)
            const avg5m = volBuy5m > 0 ? volBuy5m / 5 : 0;
            const accVol = avg5m > 0 ? (volBuy1m - avg5m) / avg5m : 0;
            
            // FBI (Frequency Burst Index)
            const shortTermFreq = (freqBuy1m * 5 + freqBuy5m) / 6;
            const fbi = safeDiv(shortTermFreq, avgFreqBuy, 1);
            
            // OFSI (Order Flow Stability Index)
            const volDelta = volBuy2h - volSell2h;
            const freqDelta = freqBuy2h - freqSell2h;
            const volNorm = totalVol > 0 ? Math.abs(volDelta) / totalVol : 0;
            const freqNorm = totalFreq > 0 ? Math.abs(freqDelta) / totalFreq : 0;
            const ofsi = clamp((1 - Math.abs(volNorm - freqNorm)) * 100, 0, 100);
            
            // FSI (Flow Strength Index)
            const buyPressure = safeDiv(volBuy2h, avgVolBuy, 1) + safeDiv(freqBuy2h, avgFreqBuy, 1);
            const sellPressure = safeDiv(volSell2h, avgVolSell, 1) + safeDiv(freqSell2h, avgFreqBuy, 1);
            const fsi = clamp(50 + (buyPressure - sellPressure) * 10, 0, 100);
            
            // Z-Press (Z-Weighted Pressure)
            const volZBuy = (volBuy2h - avgVolBuy) / (avgVolBuy || 1);
            const volZSell = (volSell2h - avgVolSell) / (avgVolSell || 1);
            const zPress = clamp((volZBuy - volZSell) * 20, -100, 100);
            
            // TIM (Trade Imbalance Momentum)
            const tim = totalVol > 0 ? ((volBuy2h - volSell2h) / totalVol) * 100 : 0;
            
            // CIS (Composite Institutional Signal)
            const cis = clamp((cohesion * 0.3 + fsi * 0.3 + (fbi > 1 ? 50 : fbi * 50) * 0.2 + ofsi * 0.2), 0, 100);
            
            // LSI (Liquidity Shock Index) - simplified
            const volSpike = safeDiv(volBuy2h + volSell2h, avgVolBuy + avgVolSell, 1);
            const lsi = volSpike > 2 ? clamp(volSpike * 20, 0, 100) : 0;
            
            // Range Compression
            const high = Number(data.high) || 0;
            const low = Number(data.low) || 0;
            const last = Number(data.last) || 0;
            const range = high - low;
            const rangeComp = last > 0 && range > 0 ? (range / last) * 100 : 0;
            
            // PFCI (Price-Flow Conflict Index)
            const priceChange = Number(data.percent_change) || 0;
            const flowDirection = volBuy2h > volSell2h ? 1 : -1;
            const priceDirection = priceChange > 0 ? 1 : -1;
            const pfci = priceDirection !== flowDirection ? Math.abs(priceChange) * 10 : 0;
            
            return {
                cohesion,
                accVol,
                fbi,
                ofsi,
                fsi,
                zPress,
                tim,
                cis,
                lsi,
                rangeComp,
                pfci
            };
        }
        
        // ============ Recommendation Score ============
        function calculateRecommendationScore(data, smart) {
            let score = 50; // neutral

            // Helper to read metric value from either legacy flattened keys or nested objects
            const getMetricValue = (obj, legacyKey, nestedKey) => {
                if (!obj) return 0;
                const legacy = obj[legacyKey];
                if (typeof legacy !== 'undefined' && !isNaN(Number(legacy))) return Number(legacy) || 0;
                const nested = obj[nestedKey];
                if (nested && typeof nested.value !== 'undefined' && !isNaN(Number(nested.value))) return Number(nested.value) || 0;
                return 0;
            };

            // Price position factor
            const pricePos = Number(data.price_position) || 50;
            if (pricePos < 30) score += 10;
            else if (pricePos > 70) score -= 10;

            // Volume ratio factor
            const volBuy = Number(data.count_VOL_minute_120_buy) || 0;
            const volSell = Number(data.count_VOL_minute_120_sell) || 0;
            const volRatio = volSell > 0 ? volBuy / volSell : 1;
            if (volRatio > 2) score += 15;
            else if (volRatio < 0.5) score -= 15;
            else if (volRatio > 1.5) score += 8;
            else if (volRatio < 0.67) score -= 8;

            // Smart metrics factor (support both legacy and nested shapes)
            const smiVal = getMetricValue(smart, 'smartMoneyIndex', 'smi');
            const pressureVal = getMetricValue(smart, 'pressureIndex', 'pressure');
            const accumVal = getMetricValue(smart, 'accumulationScore', 'accumScore');

            if (smiVal > 60) score += 10;
            else if (smiVal < 40) score -= 10;

            if (pressureVal > 30) score += 8;
            else if (pressureVal < -30) score -= 8;

            if (accumVal > 60) score += 5;
            else if (accumVal < 40) score -= 5;

            return clamp(score, 0, 100);
        }

        // ================= Multi-Timeframe Confluence (worker fallback) ================
        function calculateMultiTimeframeConfluence(data, timeframes = ['120m','30m','15m','5m','1m'], weights = null) {
            const defaultWeights = { '120m': 0.30, '30m': 0.25, '15m': 0.20, '5m': 0.15, '1m': 0.10 };
            const w = weights || defaultWeights;
            const results = [];
            let agg = 0, totalWeight = 0;
            for (const tf of timeframes) {
                try {
                    // Worker doesn't implement calculateRecommendation; fallback to pressure index
                    const p = calculatePressureIndex(data);
                    const recSign = p.direction === 'BUY' ? 1 : (p.direction === 'SELL' ? -1 : 0);
                    const conf = Math.max(0, Math.min(100, Math.round(Math.abs(p.value) || 0)));
                    const wt = (w && w[tf]) ? w[tf] : (1 / timeframes.length);
                    const contrib = recSign * (conf / 100) * wt;
                    agg += contrib; totalWeight += wt;
                    results.push({ timeframe: tf, rec: recSign === 1 ? 'BUY' : (recSign === -1 ? 'SELL' : 'HOLD'), confidence: conf, weight: wt, contrib });
                } catch (e) {
                    const wt = (w && w[tf]) ? w[tf] : (1 / timeframes.length);
                    results.push({ timeframe: tf, rec: 'HOLD', confidence: 0, weight: wt, contrib: 0 });
                }
            }
            const normalized = totalWeight > 0 ? (agg / totalWeight) : 0;
            const confluencePercent = Math.round(Math.abs(normalized) * 100);
            const consensus = normalized > 0.25 ? 'BUY' : (normalized < -0.25 ? 'SELL' : 'MIXED');
            return { consensus, score: normalized, confluence: confluencePercent, breakdown: results };
        }

    // ===================== Worker Pool Class =====================
    class WorkerPool {
        constructor(size = navigator.hardwareConcurrency || 4) {
            this.size = Math.max(2, Math.min(size, 8)); // 2-8 workers
            this.workers = [];
            this.taskQueue = [];
            this.pendingTasks = new Map();
            this.taskId = 0;
            this.busyWorkers = new Set();
            this.initialized = false;
            this.emitLegacy = true; // default: keep emitting legacy flattened keys
            // Prefer classic workers by default to maximize compatibility in older browsers
            this.preferClassic = true;
            // Respawn/backoff policy
            this.maxWorkerRespawn = 2;
            this.initialRespawnDelay = 1000; // ms
            this.stats = {
                tasksCompleted: 0,
                tasksQueued: 0,
                avgProcessTime: 0
            };
        }

        init() {
            if (this.initialized) return this;
            
            const classicScript = 'js/modules/worker.js';
            const moduleScript = 'js/modules/worker.mjs';
            // Quick non-blocking checks to help diagnose worker load issues (logs HTTP status / content-type)
            try {
                fetch(moduleScript, { method: 'GET' }).then(r => console.log('[WorkerPool] moduleScript fetch', moduleScript, r.status, r.headers.get('content-type'))).catch(err => console.warn('[WorkerPool] moduleScript fetch failed', moduleScript, err));
            } catch (e) {}
            try {
                fetch(classicScript, { method: 'GET' }).then(r => console.log('[WorkerPool] classicScript fetch', classicScript, r.status, r.headers.get('content-type'))).catch(err => console.warn('[WorkerPool] classicScript fetch failed', classicScript, err));
            } catch (e) {}
            for (let i = 0; i < this.size; i++) {
                let worker;
                let usedScript = null;
                try {
                    if (this.preferClassic) {
                        worker = new Worker(classicScript);
                        usedScript = classicScript;
                    } else {
                        // Prefer module worker when supported
                        worker = new Worker(moduleScript, { type: 'module' });
                        usedScript = moduleScript;
                    }
                } catch (e) {
                    // Fallback to the other script if creation failed
                    try {
                        worker = new Worker(this.preferClassic ? moduleScript : classicScript, this.preferClassic ? { type: 'module' } : undefined);
                        usedScript = this.preferClassic ? moduleScript : classicScript;
                    } catch (ee) {
                        console.error('[WorkerPool] Failed to spawn worker with either script', ee);
                        continue;
                    }
                }
                worker.id = i;
                worker._inited = false;
                worker._errorCount = 0;
                worker._retryDelay = this.initialRespawnDelay;
                // if worker doesn't post an init message within 5s, warn
                const initTimer = setTimeout(() => {
                    if (!worker._inited) console.warn(`[WorkerPool] Worker ${worker.id} did not send init message (script: ${usedScript}) within 5s`);
                }, 5000);
                worker._clearInitTimer = () => clearTimeout(initTimer);
                worker.onmessage = (e) => this._handleMessage(worker, e);
                worker.onerror = (e) => this._handleError(worker, e);
                console.log(`[WorkerPool] Spawned worker ${i} using ${usedScript}`);
                this.workers.push(worker);
            }

            // Send initial config to workers (emit legacy keys enabled/disabled)
            for (const w of this.workers) {
                try {
                    const payload = { emitLegacy: !!this.emitLegacy };
                    const webgpuCfg = getGlobalWebGPUConfig();
                    if (webgpuCfg) payload.webgpu = webgpuCfg;
                    w.postMessage({ type: 'config', payload });
                } catch (e) { /* ignore */ }
            }
            
            this.initialized = true;
            console.log(`[WorkerPool] Initialized with ${this.size} workers (${navigator.hardwareConcurrency} cores available)`);
            
            return this;
        }

        _handleMessage(worker, e) {
            const { id, success, result, error, init } = e.data || {};
            // detect init messages from worker (id: -2 or explicit init flag)
            if (typeof id !== 'undefined' && id === -2 || init === true || e.data && e.data.info) {
                worker._inited = true;
                if (typeof worker._clearInitTimer === 'function') worker._clearInitTimer();
                try { console.log(`[WorkerPool] Worker ${worker.id} init:`, e.data); } catch (ex) {}
            }
            const { id: _id, success: _success, result: _result, error: _error } = { id, success, result, error };
            // Special: worker forwarded runtime errors use id === -1
            if (typeof id !== 'undefined' && id === -1) {
                try {
                    console.error(`[WorkerPool] Worker ${worker.id} forwarded error:`, { success, error, result });
                } catch (ex) {
                    console.error(`[WorkerPool] Worker ${worker.id} forwarded error (raw):`, e.data);
                }
                // don't treat this as a task completion
                return;
            }
            const task = this.pendingTasks.get(id);
            
            if (task) {
                const elapsed = Date.now() - task.startTime;
                this.stats.tasksCompleted++;
                this.stats.avgProcessTime = (this.stats.avgProcessTime * (this.stats.tasksCompleted - 1) + elapsed) / this.stats.tasksCompleted;
                
                if (success) {
                    task.resolve(result);
                } else {
                    task.reject(new Error(error));
                }
                this.pendingTasks.delete(id);
            }
            
            this.busyWorkers.delete(worker.id);
            this._processQueue();
        }

        _handleError(worker, e) {
            // Log detailed ErrorEvent fields where available
            try {
                const msg = e && e.message ? e.message : (e && e.error && e.error.message ? e.error.message : String(e));
                const file = e && e.filename ? e.filename : (e && e.fileName ? e.fileName : undefined);
                const lineno = e && e.lineno ? e.lineno : (e && e.lineNumber ? e.lineNumber : undefined);
                const colno = e && e.colno ? e.colno : (e && e.columnNumber ? e.columnNumber : undefined);
                console.error(`[WorkerPool] Worker ${worker.id} error:`, { message: msg, file, lineno, colno, event: e });
            } catch (logErr) {
                console.error(`[WorkerPool] Worker ${worker.id} error:`, e);
            }
            this.busyWorkers.delete(worker.id);
            this._processQueue();

            // Respawn with limited retries and exponential backoff to avoid tight loops
            worker._errorCount = (worker._errorCount || 0) + 1;
            if (worker._errorCount <= this.maxWorkerRespawn) {
                const retryDelay = worker._retryDelay || this.initialRespawnDelay || 1000;
                console.warn(`[WorkerPool] Scheduling respawn of worker ${worker.id} in ${retryDelay}ms (attempt ${worker._errorCount}/${this.maxWorkerRespawn})`);
                try { worker.terminate(); } catch (tErr) { /* ignore */ }
                setTimeout(() => {
                    try {
                        let newWorker;
                        if (this.preferClassic) newWorker = new Worker('js/modules/worker.js');
                        else newWorker = new Worker('js/modules/worker.mjs', { type: 'module' });
                        newWorker.id = worker.id;
                        newWorker._errorCount = worker._errorCount;
                        newWorker._retryDelay = Math.min((worker._retryDelay || this.initialRespawnDelay) * 2, 30000);
                        newWorker.onmessage = (ev) => this._handleMessage(newWorker, ev);
                        newWorker.onerror = (ev) => this._handleError(newWorker, ev);
                        const idx = this.workers.findIndex(w => w === worker || w.id === worker.id);
                        if (idx >= 0) this.workers[idx] = newWorker; else this.workers.push(newWorker);
                        try {
                            const payload = { emitLegacy: !!this.emitLegacy };
                            try { if (typeof window !== 'undefined' && window.WEBGPU_CONFIG) payload.webgpu = window.WEBGPU_CONFIG; } catch (e) {}
                            newWorker.postMessage({ type: 'config', payload });
                        } catch (e) { /* ignore */ }
                        console.log(`[WorkerPool] Respawned worker ${newWorker.id}`);
                    } catch (respawnErr) {
                        console.error('[WorkerPool] Failed to respawn worker', respawnErr);
                    }
                }, retryDelay);
                // increase worker retry delay for next attempt
                worker._retryDelay = Math.min((worker._retryDelay || this.initialRespawnDelay) * 2, 30000);
            } else {
                // Give up: terminate and remove worker
                console.error(`[WorkerPool] Worker ${worker.id} exceeded max respawn attempts; removing`);
                try { worker.terminate(); } catch (tErr) { /* ignore */ }
                const idx = this.workers.findIndex(w => w === worker || w.id === worker.id);
                if (idx >= 0) this.workers.splice(idx, 1);
            }
        }

        _getIdleWorker() {
            for (const worker of this.workers) {
                if (!this.busyWorkers.has(worker.id)) {
                    return worker;
                }
            }
            return null;
        }

        _processQueue() {
            while (this.taskQueue.length > 0) {
                const worker = this._getIdleWorker();
                if (!worker) break;
                
                const task = this.taskQueue.shift();
                this.busyWorkers.add(worker.id);
                task.startTime = Date.now();
                // Clone payload to avoid race conditions where main-thread mutates data
                let payloadToSend = task.payload;
                try {
                    if (typeof structuredClone === 'function') {
                        payloadToSend = structuredClone(task.payload);
                    } else {
                        payloadToSend = JSON.parse(JSON.stringify(task.payload));
                    }
                } catch (cloneErr) {
                    // Fall back to sending original payload but warn—structured cloning failed
                    console.warn('[WorkerPool] payload clone failed, sending original payload reference', cloneErr);
                    payloadToSend = task.payload;
                }
                try {
                    worker.postMessage({ id: task.id, type: task.type, payload: payloadToSend });
                } catch (postErr) {
                    // If postMessage fails (e.g., data contains cyclic refs), attempt a safer clone per coin/data
                    console.warn('[WorkerPool] postMessage failed, attempting safe per-item clone', postErr);
                    try {
                        const safePayload = {};
                        if (payloadToSend && payloadToSend.coins && typeof payloadToSend.coins === 'object') {
                            safePayload.coins = {};
                            for (const [k, v] of Object.entries(payloadToSend.coins)) {
                                try {
                                    safePayload.coins[k] = (typeof structuredClone === 'function') ? structuredClone(v) : JSON.parse(JSON.stringify(v));
                                } catch (e) {
                                    console.warn(`[WorkerPool] cloning coin ${k} failed, skipping`, e);
                                }
                            }
                        } else if (payloadToSend && payloadToSend.data) {
                            try {
                                safePayload.data = (typeof structuredClone === 'function') ? structuredClone(payloadToSend.data) : JSON.parse(JSON.stringify(payloadToSend.data));
                            } catch (e) { safePayload.data = payloadToSend.data; }
                        }
                        worker.postMessage({ id: task.id, type: task.type, payload: Object.keys(safePayload).length ? safePayload : payloadToSend });
                    } catch (e2) {
                        console.error('[WorkerPool] failed to post task after cloning attempts', e2);
                        // Reject the task to avoid hanging
                        this.pendingTasks.get(task.id)?.reject(e2);
                        this.pendingTasks.delete(task.id);
                        this.busyWorkers.delete(worker.id);
                        continue;
                    }
                }
            }
        }

        execute(type, payload) {
            return new Promise((resolve, reject) => {
                if (!this.initialized) {
                    this.init();
                }
                
                const id = ++this.taskId;
                const task = { id, type, payload, resolve, reject, startTime: 0 };
                
                this.pendingTasks.set(id, task);
                this.taskQueue.push(task);
                this.stats.tasksQueued++;
                
                this._processQueue();
            });
        }

        // Convenience methods
        computeSmartMetrics(data) {
            return this.execute('computeSmartMetrics', { data });
        }

        computeBatch(coins) {
            return this.execute('computeBatch', { coins });
        }
        
        computeAnalyticsBatch(coins) {
            return this.execute('computeAnalyticsBatch', { coins });
        }
        
        computeMicrostructure(data) {
            return this.execute('computeMicrostructure', { data });
        }

        ping() {
            return this.execute('ping', {});
        }

        getStats() {
            return {
                ...this.stats,
                workers: this.size,
                busy: this.busyWorkers.size,
                queued: this.taskQueue.length,
                pending: this.pendingTasks.size
            };
        }

        terminate() {
            for (const worker of this.workers) {
                worker.terminate();
            }
            this.workers = [];
            this.initialized = false;
            console.log('[WorkerPool] Terminated');
        }

        // Toggle whether workers emit legacy flattened keys (runtime)
        setEmitLegacy(flag) {
            this.emitLegacy = !!flag;
            for (const w of this.workers) {
                try {
                    const payload = { emitLegacy: this.emitLegacy };
                    try { if (typeof window !== 'undefined' && window.WEBGPU_CONFIG) payload.webgpu = window.WEBGPU_CONFIG; } catch (e) {}
                    w.postMessage({ type: 'config', payload });
                } catch (e) { /* ignore */ }
            }
        }

        // Set WebGPU configuration and broadcast to all workers
        setWebGPUConfig(cfg) {
            try {
                const merged = Object.assign({}, _localWEBGPUConfig || {}, cfg || {});
                _localWEBGPUConfig = merged;
                // Attempt to mirror to global for backward compatibility, but don't rely on it
                try { if (typeof window !== 'undefined') window.WEBGPU_CONFIG = merged; } catch (e) {}
                for (const w of this.workers) {
                    try { w.postMessage({ type: 'config', payload: { webgpu: merged, emitLegacy: !!this.emitLegacy } }); } catch (e) { /* ignore */ }
                }
                return merged;
            } catch (e) {
                console.error('[WorkerPool] setWebGPUConfig failed', e);
                throw e;
            }
        }

        getWebGPUConfig() {
            return _localWEBGPUConfig || null;
        }
    }

    // ===================== Global Instance =====================
    const workerPool = new WorkerPool();
    
    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => workerPool.init());
    } else {
        workerPool.init();
    }

    // Expose via shim for compatibility; avoid writing into `window.*` here
    try { if (window.__okxShim && typeof window.__okxShim.setWorkerPool === 'function') window.__okxShim.setWorkerPool(workerPool); } catch (e) { }

})();
