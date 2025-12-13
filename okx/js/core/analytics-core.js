/**
 * Analytics Core - Single Source of Truth
 * All analytics calculations centralized here
 * Used by: UI (update-table, tab-renderers), Worker Pool, Tests
 */

(function() {
    'use strict';

    // ===================== Import from metrics-constants =====================
    const M = window.METRICS || {};
    const SCALES = M.SCALES || { INDEX_MIN: 0, INDEX_MAX: 100, DIVERGENCE_MIN: -100, DIVERGENCE_MAX: 100 };
    const THRESHOLDS = M.THRESHOLDS || {};
    const DEFAULTS = M.DEFAULTS || { volDurability: 50, INFINITE_RATIO: null };

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

    // ===================== Smart Money Index =====================

    function calculateSmartMoneyIndex(data) {
        const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
        
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
                interpretation: smi > 150 ? 'WHALE' : smi > 100 ? 'MIXED' : smi > 50 ? 'RETAIL' : 'LOW',
                className: smi > 150 ? 'text-success fw-bold' : smi > 100 ? 'text-warning' : 'text-muted'
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
        
        // SMI = current avg vol per trade / historical avg * 100
        const smi = safeDiv(avgVolPerTrade, histAvgVolPerTrade, 1) * 100;
        
        return {
            value: clamp(smi, 0, 500),
            normalized: mapTo0_100(smi, 0, 200),
            interpretation: smi > 150 ? 'WHALE' : smi > 100 ? 'MIXED' : smi > 50 ? 'RETAIL' : 'LOW',
            className: smi > 150 ? 'text-success fw-bold' : smi > 100 ? 'text-warning' : 'text-muted'
        };
    }

    // ===================== Trade Intensity =====================

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
        
        // Volume intensity
        const volIntensity = (safeDiv(volBuy2h, avgVolBuy, 1) + safeDiv(volSell2h, avgVolSell, 1)) / 2;
        
        // Frequency intensity
        let freqIntensity = 1;
        if (avgFreqBuy > 0 || avgFreqSell > 0) {
            freqIntensity = (safeDiv(freqBuy2h, Math.max(avgFreqBuy, 1), 1) + 
                            safeDiv(freqSell2h, Math.max(avgFreqSell, 1), 1)) / 2;
        }
        
        // Combined intensity (normalized to 0-100)
        const intensity = ((volIntensity + freqIntensity) / 2) * 50;
        
        return {
            value: clamp(intensity, 0, 200),
            normalized: mapTo0_100(intensity, 0, 150),
            level: intensity > 100 ? 'EXTREME' : intensity > 70 ? 'HIGH' : intensity > 40 ? 'MEDIUM' : 'LOW',
            className: intensity > 70 ? 'text-success fw-bold' : intensity > 40 ? 'text-warning' : 'text-muted'
        };
    }

    // ===================== Accumulation Score =====================

    function calculateAccumulationScore(data) {
        const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
        
        const volDur2h = toNum(a.volDurability2h_percent) || 50;
        const volDur24h = toNum(a.volDurability24h_percent) || 50;
        const volVsAvg = toNum(a.volBuy_vs_avg_percent) || 100;
        
        // Buy dominance factor
        const buyDominance = (volDur2h - 50) / 50; // -1 to 1
        
        // Volume above average factor
        const aboveAvg = clamp((volVsAvg - 100) / 100, -1, 1);
        
        // Persistence (24h confirms 2h)
        const persistence = Math.abs(volDur24h - 50) > 10 && 
                           Math.sign(volDur24h - 50) === Math.sign(volDur2h - 50) ? 1 : 0.5;
        
        // Score: 0-100
        const score = 50 + (buyDominance * 25) + (aboveAvg * 15) + (persistence * 10);
        
        return {
            value: clamp(score, 0, 100),
            normalized: clamp(score, 0, 100),
            interpretation: score > 70 ? 'ACCUMULATION' : score < 30 ? 'DISTRIBUTION' : 'NEUTRAL',
            className: score > 70 ? 'text-success' : score < 30 ? 'text-danger' : 'text-warning'
        };
    }

    // ===================== Momentum Divergence =====================

    function calculateMomentumDivergence(data) {
        const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
        const priceChange = toNum(data.percent_change);
        
        const volDur = toNum(a.volDurability2h_percent) || 50;
        const flowBias = (volDur - 50) / 50; // -1 to 1
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

    // ===================== Whale Activity =====================

    function calculateWhaleActivity(data) {
        const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
        
        const smi = calculateSmartMoneyIndex(data);
        const volVsAvg = toNum(a.volBuy_vs_avg_percent) || 100;
        const volDur = toNum(a.volDurability2h_percent) || 50;
        
        // Whale activity high if: big trades (SMI high) + above avg volume + buy dominance
        let whaleScore = 0;
        
        // SMI contribution (0-40 points)
        whaleScore += mapTo0_100(smi.value, 50, 200) * 0.4;
        
        // Volume vs avg contribution (0-35 points)
        whaleScore += mapTo0_100(volVsAvg, 50, 300) * 0.35;
        
        // Durability contribution (0-25 points)
        whaleScore += Math.abs(volDur - 50) * 0.5;
        
        return {
            value: clamp(whaleScore, 0, 100),
            normalized: clamp(whaleScore, 0, 100),
            level: whaleScore > 70 ? 'HIGH' : whaleScore > 40 ? 'MEDIUM' : 'LOW',
            className: whaleScore > 70 ? 'text-info fw-bold' : whaleScore > 40 ? 'text-info' : 'text-muted'
        };
    }

    // ===================== Retail vs Institutional Ratio =====================

    function calculateRetailInstitutionalRatio(data) {
        const intensity = calculateTradeIntensity(data);
        const whale = calculateWhaleActivity(data);
        
        // R/I ratio: whale activity vs overall intensity
        // High ratio = institutional dominance
        // Low ratio = retail dominance
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

    // ===================== Pressure Index =====================

    function calculatePressureIndex(data) {
        const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
        
        const volDur2h = toNum(a.volDurability2h_percent) || 50;
        const freqDur = toNum(a.freqRatio2h_percent) || 50;
        const imbalance = toNum(a.volImbalance2h) || 0;
        
        // Pressure: -100 (sell pressure) to +100 (buy pressure)
        let pressure = 0;
        
        // Volume durability contribution
        pressure += (volDur2h - 50) * 1.0;
        
        // Frequency durability contribution
        pressure += (freqDur - 50) * 0.5;
        
        // Imbalance contribution
        pressure += imbalance * 30;
        
        return {
            value: clamp(pressure, -100, 100),
            normalized: mapTo0_100(pressure, -100, 100),
            direction: pressure > 20 ? 'BUY' : pressure < -20 ? 'SELL' : 'NEUTRAL',
            className: pressure > 30 ? 'text-success' : pressure < -30 ? 'text-danger' : 'text-muted'
        };
    }

    // ===================== Trend Strength =====================

    function calculateTrendStrength(data) {
        const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
        
        const volDur2h = toNum(a.volDurability2h_percent) || 50;
        const volDur24h = toNum(a.volDurability24h_percent) || 50;
        const intensity = calculateTradeIntensity(data);
        
        // Trend strength: how persistent and strong the directional bias is
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

    // ===================== NEW: Breakout Probability =====================

    function calculateBreakoutProbability(data) {
        const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
        const history = data._history || [];
        
        // Factors for breakout:
        // 1. ATR compression (low ATR = squeeze)
        // 2. Sudden intensity spike
        // 3. Persistent volume imbalance
        // 4. Price near range extreme
        
        const atr = computeATR(history, 14);
        const avgPrice = history.length > 0 ? 
            history.slice(-14).reduce((s, h) => s + toNum(h.last), 0) / Math.min(history.length, 14) : 
            toNum(data.last);
        
        // ATR as % of price (lower = more compressed)
        const atrPercent = safeDiv(atr, avgPrice, 0.05) * 100;
        const compressionScore = clamp(100 - (atrPercent * 20), 0, 100); // Low ATR = high score
        
        // Intensity spike
        const intensity = calculateTradeIntensity(data);
        const intensityScore = intensity.normalized;
        
        // Volume imbalance persistence
        const imbalance = Math.abs(toNum(a.volImbalance2h) || 0);
        const imbalanceScore = mapTo0_100(imbalance, 0, 0.5);
        
        // Price position (near 0 or 100 = near range extreme)
        const pricePos = toNum(a.pricePosition) || 50;
        const nearExtreme = Math.max(pricePos, 100 - pricePos);
        const extremeScore = mapTo0_100(nearExtreme, 50, 100);
        
        // Combined breakout probability
        const prob = (compressionScore * 0.3) + (intensityScore * 0.25) + 
                    (imbalanceScore * 0.25) + (extremeScore * 0.2);
        
        const level = prob > 70 ? 'HIGH' : prob > 50 ? 'MEDIUM' : 'LOW';
        
        return {
            value: clamp(prob, 0, 100),
            normalized: clamp(prob, 0, 100),
            level,
            confidence: level,  // Alias for renderSmartRow compatibility
            direction: pricePos > 60 ? 'UP' : pricePos < 40 ? 'DOWN' : 'UNKNOWN',
            className: prob > 70 ? 'text-warning fw-bold' : prob > 50 ? 'text-warning' : 'text-muted',
            factors: { compression: compressionScore, intensity: intensityScore, imbalance: imbalanceScore, extreme: extremeScore }
        };
    }

    // ===================== NEW: Liquidity Stress Index =====================

    function calculateLiquidityStressIndex(data) {
        const a = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : (data || {});
        
        // LSI = how thin is the liquidity
        // High LSI = illiquid, big trades move market
        // Low LSI = liquid, stable
        
        const avgTradeValue = toNum(a.liquidity_avg_trade_value) || 0;
        const totalVolFiat = toNum(data.total_vol_fiat) || toNum(a.totalVolFiat) || 0;
        const totalFreq = (toNum(a.freqBuy2h) || 0) + (toNum(a.freqSell2h) || 0);
        
        // Calculate based on avg trade size relative to typical
        // Larger avg trades = potentially illiquid
        let lsi = 50; // Neutral default
        
        if (avgTradeValue > 0) {
            // Compare to a baseline (e.g., 1000 USDT per trade is normal)
            const baseline = 1000;
            lsi = mapTo0_100(avgTradeValue, baseline * 0.1, baseline * 10);
        }
        
        // Adjust for frequency - low frequency = more stress
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

    // ===================== NEW: Market Mode Classifier =====================

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
        
        // Volatility regime
        const isLowVol = atrPercent < 1.5;
        const isHighVol = atrPercent > 4;
        
        // Directional bias
        const hasBias = Math.abs(volDur2h - 50) > 15;
        const biasDirection = volDur2h > 50 ? 'UP' : 'DOWN';
        
        // Market mode classification
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

    // ===================== Smart Signal Generator =====================

    function generateSmartSignal(data) {
        const accum = calculateAccumulationScore(data);
        const pressure = calculatePressureIndex(data);
        const trend = calculateTrendStrength(data);
        const divergence = calculateMomentumDivergence(data);
        const whale = calculateWhaleActivity(data);
        const intensity = calculateTradeIntensity(data);
        
        let score = 0;
        
        // Accumulation contribution
        score += (accum.value - 50) * 0.8;
        
        // Pressure contribution
        score += pressure.value * 0.3;
        
        // Divergence signals
        if (divergence.interpretation === 'BULL DIV') score += 15;
        if (divergence.interpretation === 'BEAR DIV') score -= 15;
        
        // Whale + Accumulation synergy
        if (whale.value > 70 && accum.value > 55) score += 10;
        if (whale.value > 70 && accum.value < 45) score -= 10;
        
        // Intensity confirmation
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

    // ===================== Composite Smart Metrics =====================

    function computeAllSmartMetrics(data) {
        // Return with field names expected by renderSmartRow
        return {
            smi: calculateSmartMoneyIndex(data),
            intensity: calculateTradeIntensity(data),
            divergence: calculateMomentumDivergence(data),  // Was missing!
            accumScore: calculateAccumulationScore(data),   // Renamed from 'accumulation'
            whale: calculateWhaleActivity(data),
            riRatio: calculateRetailInstitutionalRatio(data), // Was missing!
            pressure: calculatePressureIndex(data),
            trendStrength: calculateTrendStrength(data),
            breakout: calculateBreakoutProbability(data),   // Renamed from 'breakoutProb'
            lsi: calculateLiquidityStressIndex(data),       // Renamed from 'liquidityStress'
            marketMode: classifyMarketMode(data),
            smartSignal: generateSmartSignal(data)          // Was missing!
        };
    }

    // ===================== Export to Window =====================

    window.AnalyticsCore = {
        // Math helpers
        safeDiv,
        toNum,
        clamp,
        normalizeMetric,
        mapTo0_100,
        mapToNeg100_100,
        
        // Statistical
        meanStd,
        zScore,
        percentile,
        computeATR,
        
        // Volume
        calculateVolRatio,
        calculateVolDurability,
        
        // Smart metrics
        calculateSmartMoneyIndex,
        calculateTradeIntensity,
        calculateMomentumDivergence,  // Added
        calculateAccumulationScore,
        calculateWhaleActivity,
        calculateRetailInstitutionalRatio,  // Added
        calculatePressureIndex,
        calculateTrendStrength,
        generateSmartSignal,  // Added
        
        // New features
        calculateBreakoutProbability,
        calculateLiquidityStressIndex,
        classifyMarketMode,
        
        // Composite
        computeAllSmartMetrics
    };

    // Also export key functions globally for backward compatibility
    window.safeDiv = safeDiv;
    window.toNum = toNum;
    window.computeATR = computeATR;
    window.generateSmartSignal = generateSmartSignal;

    console.log('[AnalyticsCore] Loaded - Single source of truth for analytics');

})();
