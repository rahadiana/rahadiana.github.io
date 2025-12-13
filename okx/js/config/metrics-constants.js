/**
 * Centralized Metrics Constants
 * All thresholds, weights, and magic numbers in one place for easy tuning
 */

(function() {
    'use strict';

    // ===================== Recommendation System =====================
    const RECOMMENDATION = {
        THRESHOLD: 0.30,           // Absolute score threshold for BUY/SELL
        COOLDOWN_MS: 120000,       // 2 minutes cooldown to avoid flip-flopping
        CONFIDENCE_MIN: 60,        // Minimum confidence for BUY/SELL recommendation
    };

    // ===================== Scoring Weights =====================
    // Total should sum to ~1.0 for normalized scoring
    const WEIGHTS = {
        // Price factors
        price: 0.16,
        pricePosition: 0.25,
        momentum: 0.15,
        
        // Volume factors
        volDurability2h: 0.12,
        volDurability24h: 0.08,
        volRatio: 0.25,
        volVsAvg: 0.03,
        
        // Flow factors
        imbalance: 0.30,
        divergence: 0.06,
        persistence: 0.08,
        
        // Risk penalty multiplier (0.5 means risk of 100% reduces score by 50%)
        riskPenalty: 0.5,
    };

    // ===================== Scale Ranges =====================
    const SCALES = {
        // Standard indices (0-100)
        INDEX_MIN: 0,
        INDEX_MAX: 100,
        
        // Extended indices for extreme values
        EXTENDED_MAX: 500,
        
        // Normalized factors (-1 to 1)
        FACTOR_MIN: -1,
        FACTOR_MAX: 1,
        
        // Divergence/Imbalance (-100 to 100)
        DIVERGENCE_MIN: -100,
        DIVERGENCE_MAX: 100,
    };

    // ===================== Thresholds =====================
    const THRESHOLDS = {
        // Durability classification
        durability: {
            excellent: 67,
            good: 34,
            poor: 0,
        },
        
        // Vol Ratio classification
        volRatio: {
            extremeBullish: 500,
            veryBullish: 200,
            bullish: 150,
            neutral: 50,
            bearish: 20,
        },
        
        // Smart Money Index
        smi: {
            whale: 150,
            mixed: 100,
            retail: 50,
        },
        
        // Trade Intensity
        intensity: {
            high: 70,
            medium: 40,
        },
        
        // Spike detection
        spike: {
            multiplier: 2.0,  // Volume > 2x average = spike
        },
        
        // Z-score thresholds
        zScore: {
            significant: 2.0,
            moderate: 1.0,
        },
    };

    // ===================== Default Values =====================
    const DEFAULTS = {
        // When no data available
        volDurability: 50,
        pricePosition: 50,
        confidence: 0,
        riskScore: 0,
        
        // Sentinel for infinite ratio (buy > 0, sell = 0)
        INFINITE_RATIO: null,  // Use null instead of 999
        INFINITE_DISPLAY: '∞',
    };

    // ===================== UI Constants =====================
    const UI = {
        // Row limits
        defaultRowLimit: 5,
        maxRowLimit: 100,
        
        // Throttle intervals (ms)
        updateDebounce: 300,
        smartTabThrottle: 1000,
        microTabThrottle: 1000,
        
        // History limits
        maxHistory: 300,
        maxCoinsStored: 100,
        
        // Alert limits
        maxAlertBanners: 5,
        recommendationLogMax: 200,
    };

    // ===================== Helper Functions =====================
    
    /**
     * Safe division with fallback
     * @param {number} a - Numerator
     * @param {number} b - Denominator
     * @param {number|null} fallback - Value to return if division not possible
     * @returns {number|null}
     */
    function safeDiv(a, b, fallback = 0) {
        const numA = Number(a);
        const numB = Number(b);
        if (!Number.isFinite(numB) || numB === 0) {
            return fallback;
        }
        const result = numA / numB;
        return Number.isFinite(result) ? result : fallback;
    }

    /**
     * Normalize a value from one range to another
     * @param {number} value - Input value
     * @param {number} fromMin - Input range minimum
     * @param {number} fromMax - Input range maximum
     * @param {number} toMin - Output range minimum (default 0)
     * @param {number} toMax - Output range maximum (default 100)
     * @returns {number}
     */
    function normalizeMetric(value, fromMin, fromMax, toMin = 0, toMax = 100) {
        if (fromMax === fromMin) return toMin;
        const normalized = ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin) + toMin;
        return Math.max(toMin, Math.min(toMax, normalized));
    }

    /**
     * Clamp value between min and max
     * @param {number} value - Input value
     * @param {number} min - Minimum
     * @param {number} max - Maximum
     * @returns {number}
     */
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Convert numeric value to string, with infinity handling
     * @param {number|null} value - Value to format
     * @param {number} decimals - Decimal places
     * @returns {string}
     */
    function formatMetric(value, decimals = 0) {
        if (value === null || value === DEFAULTS.INFINITE_RATIO) {
            return DEFAULTS.INFINITE_DISPLAY;
        }
        if (!Number.isFinite(value)) {
            return '-';
        }
        return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
    }

    /**
     * Calculate vol ratio with proper null handling
     * @param {number} buy - Buy volume
     * @param {number} sell - Sell volume
     * @returns {number|null} - null means infinite (buy only)
     */
    function calculateVolRatio(buy, sell) {
        const numBuy = Number(buy) || 0;
        const numSell = Number(sell) || 0;
        
        if (numSell > 0) {
            return (numBuy / numSell) * 100;
        }
        if (numBuy > 0) {
            return DEFAULTS.INFINITE_RATIO; // Infinite ratio
        }
        return 0;
    }

    /**
     * Get CSS class for vol ratio value
     * @param {number|null} ratio - Vol ratio value
     * @returns {string}
     */
    function getVolRatioClass(ratio) {
        if (ratio === null) return 'text-success fw-bold'; // Infinite = strong buy
        if (ratio >= THRESHOLDS.volRatio.veryBullish) return 'text-success fw-bold';
        if (ratio >= THRESHOLDS.volRatio.bullish) return 'text-success';
        if (ratio >= THRESHOLDS.volRatio.neutral) return 'text-warning';
        if (ratio >= THRESHOLDS.volRatio.bearish) return 'text-danger';
        return 'text-danger fw-bold';
    }

    /**
     * Get CSS class for durability value
     * @param {number} durability - Durability percentage (0-100)
     * @returns {string}
     */
    function getDurabilityClass(durability) {
        if (durability >= THRESHOLDS.durability.excellent) return 'text-success';
        if (durability >= THRESHOLDS.durability.good) return 'text-warning';
        return 'text-danger';
    }

    // ===================== Export to Window =====================
    window.METRICS = {
        RECOMMENDATION,
        WEIGHTS,
        SCALES,
        THRESHOLDS,
        DEFAULTS,
        UI,
        
        // Helper functions
        safeDiv,
        normalizeMetric,
        clamp,
        formatMetric,
        calculateVolRatio,
        getVolRatioClass,
        getDurabilityClass,
    };

    // Also export individual helpers for convenience
    window.safeDiv = safeDiv;
    window.normalizeMetric = normalizeMetric;
    window.formatMetric = formatMetric;
    window.calculateVolRatio = calculateVolRatio;

})();
