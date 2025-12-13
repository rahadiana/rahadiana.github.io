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

    // ===================== Worker Code (runs in separate thread) =====================
    // NOTE: These formulas are synchronized with js/core/analytics-core.js
    const workerCode = `
        'use strict';
        
        // ============ Math Helpers (same as AnalyticsCore) ============
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
        
        function clamp(val, min, max) {
            return Math.max(min, Math.min(max, val));
        }
        
        function mapTo0_100(value, fromMin, fromMax) {
            if (!Number.isFinite(value)) return 50;
            if (fromMax === fromMin) return 0;
            const normalized = ((value - fromMin) / (fromMax - fromMin)) * 100;
            return clamp(normalized, 0, 100);
        }

        // Helper to get analytics data (support both nested 'analytics' and legacy '_analytics')
        function getA(data) {
            return (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
        }

        // ============ Smart Formulas (SYNCHRONIZED with analytics-core.js) ============
        
        /**
         * Smart Money Index - SAME LOGIC AS analytics-core.js
         * Detects if big players (whales) or retail traders are dominating
         */
        function calculateSmartMoneyIndex(data) {
            const a = getA(data);
            
            const volBuy2h = toNum(a.volBuy2h);
            const volSell2h = toNum(a.volSell2h);
            const freqBuy2h = toNum(a.freqBuy2h);
            const freqSell2h = toNum(a.freqSell2h);
            
            const totalVol = volBuy2h + volSell2h;
            const totalFreq = freqBuy2h + freqSell2h;
            
            // No frequency data - fallback to volume-based
            if (totalFreq === 0) {
                const volVsAvg = toNum(a.volBuy_vs_avg_percent) || 100;
                const volDur = toNum(a.volDurability2h_percent) || 50;
                const smi = (volVsAvg * 0.5) + (volDur * 0.5);
                return {
                    value: clamp(smi, 0, 200),
                    normalized: mapTo0_100(smi, 0, 200),
                    interpretation: smi > 150 ? 'WHALE' : smi > 100 ? 'MIXED' : smi > 50 ? 'RETAIL' : 'LOW'
                };
            }
            
            // Average volume per trade
            const avgVolPerTrade = safeDiv(totalVol, totalFreq, 0);
            
            // Historical average
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
                interpretation: smi > 150 ? 'WHALE' : smi > 100 ? 'MIXED' : smi > 50 ? 'RETAIL' : 'LOW'
            };
        }

        /**
         * Trade Intensity - SAME LOGIC AS analytics-core.js
         */
        function calculateTradeIntensity(data) {
            const a = getA(data);
            
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
                level: intensity > 100 ? 'EXTREME' : intensity > 70 ? 'HIGH' : intensity > 40 ? 'MEDIUM' : 'LOW'
            };
        }

        /**
         * Momentum Divergence - SAME LOGIC AS analytics-core.js
         */
        function calculateMomentumDivergence(data) {
            const a = getA(data);
            const priceChange = toNum(data.percent_change);
            
            const volDur = toNum(a.volDurability2h_percent) || 50;
            const flowBias = (volDur - 50) / 50; // -1 to 1
            const priceDir = priceChange > 0.5 ? 1 : priceChange < -0.5 ? -1 : 0;
            
            const divergence = flowBias - (priceDir * 0.5);
            
            let interpretation = 'NEUTRAL';
            if (divergence > 0.3 && priceChange < 0) {
                interpretation = 'BULL DIV';
            } else if (divergence < -0.3 && priceChange > 0) {
                interpretation = 'BEAR DIV';
            } else if (divergence > 0.2) {
                interpretation = 'BULLISH';
            } else if (divergence < -0.2) {
                interpretation = 'BEARISH';
            }
            
            return {
                value: divergence,
                interpretation,
                priceChange,
                flowBias
            };
        }

        /**
         * Accumulation Score - SAME LOGIC AS analytics-core.js
         */
        function calculateAccumulationScore(data) {
            const a = getA(data);
            
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
                interpretation: score > 70 ? 'ACCUMULATION' : score < 30 ? 'DISTRIBUTION' : 'NEUTRAL'
            };
        }

        /**
         * Whale Activity - SAME LOGIC AS analytics-core.js
         */
        function calculateWhaleActivity(data) {
            const a = getA(data);
            
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
                level: whaleScore > 70 ? 'HIGH' : whaleScore > 40 ? 'MEDIUM' : 'LOW'
            };
        }

        /**
         * Pressure Index - SAME LOGIC AS analytics-core.js
         */
        function calculatePressureIndex(data) {
            const a = getA(data);
            
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
                direction: pressure > 20 ? 'BUY' : pressure < -20 ? 'SELL' : 'NEUTRAL'
            };
        }

        /**
         * Trend Strength - SAME LOGIC AS analytics-core.js
         */
        function calculateTrendStrength(data) {
            const a = getA(data);
            
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
                level: strength > 70 ? 'STRONG' : strength > 40 ? 'MODERATE' : 'WEAK'
            };
        }

        /**
         * Generate Smart Signal - SAME LOGIC
         */
        function generateSmartSignal(data) {
            const accum = calculateAccumulationScore(data);
            const pressure = calculatePressureIndex(data);
            const trend = calculateTrendStrength(data);
            const divergence = calculateMomentumDivergence(data);
            const whale = calculateWhaleActivity(data);
            
            let score = 0;
            score += (accum.value - 50) * 0.8;
            score += pressure.value * 0.3;
            
            if (divergence.interpretation === 'BULL DIV') score += 15;
            if (divergence.interpretation === 'BEAR DIV') score -= 15;
            
            if (whale.value > 70 && accum.value > 55) score += 10;
            
            const intensity = calculateTradeIntensity(data);
            if (intensity.value > 70 && pressure.value > 20) score += 10;
            if (intensity.value > 70 && pressure.value < -20) score -= 10;
            
            let signal = 'HOLD';
            let confidence = Math.min(Math.abs(score), 100);
            
            if (score > 25) signal = 'BUY';
            else if (score < -25) signal = 'SELL';
            
            return { signal, confidence: Math.round(confidence), score: Math.round(score) };
        }

        /**
         * Compute all smart metrics - consistent with AnalyticsCore
         */
        function computeSmartMetrics(data) {
            const smi = calculateSmartMoneyIndex(data);
            const intensity = calculateTradeIntensity(data);
            const divergence = calculateMomentumDivergence(data);
            const accum = calculateAccumulationScore(data);
            const whale = calculateWhaleActivity(data);
            const pressure = calculatePressureIndex(data);
            const trend = calculateTrendStrength(data);
            const signal = generateSmartSignal(data);
            
            // Calculate R/I ratio
            const riRatio = intensity.value > 0 ? safeDiv(whale.value, intensity.value, 1) * 100 : 100;
            
            // Build analytics-style nested object
            const nested = {
                smi: smi,
                intensity: intensity,
                divergence: divergence,
                accumScore: accum,
                whale: whale,
                riRatio: clamp(riRatio, 0, 500),
                pressure: pressure,
                trendStrengthObj: trend,
                breakout: { value: 0, direction: 'UNKNOWN', confidence: 0, className: 'text-muted' },
                lsi: { value: 0, level: 'N/A', className: 'text-muted' },
                marketMode: { mode: 'UNKNOWN', confidence: 0, className: 'text-muted' },
                smartSignal: signal
            };

            if (typeof EMIT_LEGACY === 'undefined' || EMIT_LEGACY) {
                // Merge legacy flattened keys for backward compatibility
                return Object.assign({
                    smartMoneyIndex: smi.value,
                    smiNormalized: smi.normalized,
                    smiInterpretation: smi.interpretation,
                    tradeIntensity: intensity.value,
                    intensityNormalized: intensity.normalized,
                    intensityLevel: intensity.level,
                    momentumDivergence: divergence.value,
                    divergenceInterpretation: divergence.interpretation,
                    accumulationScore: accum.value,
                    accumInterpretation: accum.interpretation,
                    whaleActivity: whale.value,
                    whaleLevel: whale.level,
                    retailInstitutionalRatio: clamp(riRatio, 0, 500),
                    pressureIndex: pressure.value,
                    pressureDirection: pressure.direction,
                    trendStrength: trend.value,
                    trendLevel: trend.level,
                    trendDirection: trend.direction,
                    signal: signal
                }, nested);
            }

            // When legacy emission is disabled, return only nested analytics-style object
            return nested;
        }

        // ============ Analytics Formulas ============
        function calculateVolDurability(data, timeframe) {
            const tfMap = {
                '1m': 1, '5m': 5, '10m': 10, '15m': 15, '20m': 20,
                '30m': 30, '60m': 60, '1h': 60, '120m': 120, '2h': 120,
                '24h': 1440, '1440m': 1440
            };
            const minutes = tfMap[timeframe] || 120;
            
            const buy = Number(data['count_VOL_minute_' + minutes + '_buy']) || 0;
            const sell = Number(data['count_VOL_minute_' + minutes + '_sell']) || 0;
            const total = buy + sell;
            
            if (total === 0) return 50;
            return clamp((buy / total) * 100, 0, 100);
        }

        function calculateVolRatio(data, timeframe) {
            const tfMap = {
                '1m': 1, '5m': 5, '10m': 10, '15m': 15, '20m': 20,
                '30m': 30, '60m': 60, '1h': 60, '120m': 120, '2h': 120,
                '24h': 1440, '1440m': 1440
            };
            const minutes = tfMap[timeframe] || 120;
            
            const buy = Number(data['count_VOL_minute_' + minutes + '_buy']) || 0;
            const sell = Number(data['count_VOL_minute_' + minutes + '_sell']) || 0;
            
            if (sell === 0) return buy > 0 ? null : 100;
            return (buy / sell) * 100;
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
            
            return {
                smart,
                volMetrics,
                freqMetrics,
                freqRatios,
                micro,
                recScore
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
    `;

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
            this.stats = {
                tasksCompleted: 0,
                tasksQueued: 0,
                avgProcessTime: 0
            };
        }

        init() {
            if (this.initialized) return this;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            for (let i = 0; i < this.size; i++) {
                const worker = new Worker(workerUrl);
                worker.id = i;
                worker.onmessage = (e) => this._handleMessage(worker, e);
                worker.onerror = (e) => this._handleError(worker, e);
                this.workers.push(worker);
            }

            // Send initial config to workers (emit legacy keys enabled/disabled)
            for (const w of this.workers) {
                try { w.postMessage({ type: 'config', payload: { emitLegacy: !!this.emitLegacy } }); } catch (e) { /* ignore */ }
            }
            
            this.initialized = true;
            console.log(`[WorkerPool] Initialized with ${this.size} workers (${navigator.hardwareConcurrency} cores available)`);
            
            return this;
        }

        _handleMessage(worker, e) {
            const { id, success, result, error } = e.data;
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
            console.error(`[WorkerPool] Worker ${worker.id} error:`, e);
            this.busyWorkers.delete(worker.id);
            this._processQueue();
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
                worker.postMessage({ id: task.id, type: task.type, payload: task.payload });
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
                try { w.postMessage({ type: 'config', payload: { emitLegacy: this.emitLegacy } }); } catch (e) { /* ignore */ }
            }
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

    // Expose globally
    window.workerPool = workerPool;
    window.WorkerPool = WorkerPool;

})();
