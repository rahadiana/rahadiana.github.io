/**
 * Smart Analysis Formulas
 * WRAPPER MODULE - All calculations delegated to AnalyticsCore (single source of truth)
 * 
 * This file exists for backwards compatibility.
 * All actual implementations are in: js/core/analytics-core.js
 */

(function() {
    'use strict';

    // ===================== Helper: Get AnalyticsCore =====================
    // Use centralized helper (globalThis.getAnalyticsCore) when available.
    function getCore() {
        if (typeof globalThis !== 'undefined' && typeof globalThis.getAnalyticsCore === 'function') {
            return globalThis.getAnalyticsCore();
        }
        if (typeof AnalyticsCore !== 'undefined') return AnalyticsCore;
        // Final fallback: warn once locally
        if (!getCore._warned) {
            getCore._warned = true;
            console.warn('[smart-formulas] AnalyticsCore not loaded, using fallback');
        }
        return null;
    }

    // ===================== WRAPPER FUNCTIONS =====================
    // All functions delegate to AnalyticsCore for consistency

    /**
     * Smart Money Index (SMI)
     * @deprecated Use AnalyticsCore.calculateSmartMoneyIndex directly
     */
    function calculateSmartMoneyIndex(data) {
        const core = getCore();
        if (core && core.calculateSmartMoneyIndex) {
            return core.calculateSmartMoneyIndex(data);
        }
        // Minimal fallback if AnalyticsCore not loaded
        return { value: 100, interpretation: 'N/A', className: 'text-muted' };
    }

    /**
     * Trade Intensity Index
     * @deprecated Use AnalyticsCore.calculateTradeIntensity directly
     */
    function calculateTradeIntensity(data) {
        const core = getCore();
        if (core && core.calculateTradeIntensity) {
            return core.calculateTradeIntensity(data);
        }
        return { value: 100, level: 'N/A', className: 'text-muted' };
    }

    /**
     * Momentum Divergence
     * @deprecated Use AnalyticsCore.calculateMomentumDivergence directly
     */
    function calculateMomentumDivergence(data) {
        const core = getCore();
        if (core && core.calculateMomentumDivergence) {
            return core.calculateMomentumDivergence(data);
        }
        return { value: 0, interpretation: 'N/A', className: 'text-muted' };
    }

    /**
     * Accumulation/Distribution Score
     * @deprecated Use AnalyticsCore.calculateAccumulationScore directly
     */
    function calculateAccumulationScore(data) {
        const core = getCore();
        if (core && core.calculateAccumulationScore) {
            return core.calculateAccumulationScore(data);
        }
        return { value: 50, interpretation: 'N/A', className: 'text-muted' };
    }

    /**
     * Whale Activity Index
     * @deprecated Use AnalyticsCore.calculateWhaleActivity directly
     */
    function calculateWhaleActivity(data) {
        const core = getCore();
        if (core && core.calculateWhaleActivity) {
            return core.calculateWhaleActivity(data);
        }
        return { value: 100, level: 'N/A', className: 'text-muted' };
    }

    /**
     * Retail vs Institutional Ratio
     * @deprecated Use AnalyticsCore.calculateRetailInstitutionalRatio directly
     */
    function calculateRetailInstitutionalRatio(data) {
        const core = getCore();
        if (core && core.calculateRetailInstitutionalRatio) {
            return core.calculateRetailInstitutionalRatio(data);
        }
        return { value: 100, type: 'N/A', className: 'text-muted' };
    }

    /**
     * Pressure Index
     * @deprecated Use AnalyticsCore.calculatePressureIndex directly
     */
    function calculatePressureIndex(data) {
        const core = getCore();
        if (core && core.calculatePressureIndex) {
            return core.calculatePressureIndex(data);
        }
        return { value: 0, direction: 'N/A', className: 'text-muted' };
    }

    /**
     * Trend Strength
     * @deprecated Use AnalyticsCore.calculateTrendStrength directly
     */
    function calculateTrendStrength(data) {
        const core = getCore();
        if (core && core.calculateTrendStrength) {
            return core.calculateTrendStrength(data);
        }
        return { value: 50, level: 'N/A', direction: 'FLAT', className: 'text-muted' };
    }

    /**
     * Generate Smart Signal
     * @deprecated Use AnalyticsCore.generateSmartSignal directly
     */
    function generateSmartSignal(data) {
        const core = getCore();
        if (core && core.generateSmartSignal) {
            return core.generateSmartSignal(data);
        }
        return { signal: 'HOLD', confidence: 0, className: 'recommendation-hold', score: 0 };
    }

    /**
     * Compute all smart metrics
     * @deprecated Use AnalyticsCore.computeAllSmartMetrics directly
     */
    function computeSmartMetrics(data) {
        const core = getCore();
        if (core && core.computeAllSmartMetrics) {
            return core.computeAllSmartMetrics(data);
        }
        // Fallback: compute individually
        return {
            smi: calculateSmartMoneyIndex(data),
            intensity: calculateTradeIntensity(data),
            divergence: calculateMomentumDivergence(data),
            accumScore: calculateAccumulationScore(data),
            whale: calculateWhaleActivity(data),
            riRatio: calculateRetailInstitutionalRatio(data),
            pressure: calculatePressureIndex(data),
            trendStrength: calculateTrendStrength(data),
            smartSignal: generateSmartSignal(data)
        };
    }

    // ===================== NEW FEATURES (delegate to AnalyticsCore) =====================

    /**
     * Breakout Probability
     */
    function calculateBreakoutProbability(data) {
        const core = getCore();
        if (core && core.calculateBreakoutProbability) {
            return core.calculateBreakoutProbability(data);
        }
        return { value: 50, direction: 'NEUTRAL', confidence: 'LOW', className: 'text-muted' };
    }

    /**
     * Liquidity Stress Index
     */
    function calculateLiquidityStressIndex(data) {
        const core = getCore();
        if (core && core.calculateLiquidityStressIndex) {
            return core.calculateLiquidityStressIndex(data);
        }
        return { value: 50, level: 'N/A', className: 'text-muted' };
    }

    /**
     * Market Mode Classifier
     */
    function classifyMarketMode(data) {
        const core = getCore();
        if (core && core.classifyMarketMode) {
            return core.classifyMarketMode(data);
        }
        return { mode: 'UNKNOWN', confidence: 0, className: 'text-muted' };
    }

    // ===================== EXPORTS =====================
    // Export wrapper functions for backwards compatibility
    window.calculateSmartMoneyIndex = calculateSmartMoneyIndex;
    window.calculateTradeIntensity = calculateTradeIntensity;
    window.calculateMomentumDivergence = calculateMomentumDivergence;
    window.calculateAccumulationScore = calculateAccumulationScore;
    window.calculateWhaleActivity = calculateWhaleActivity;
    window.calculateRetailInstitutionalRatio = calculateRetailInstitutionalRatio;
    window.calculatePressureIndex = calculatePressureIndex;
    window.calculateTrendStrength = calculateTrendStrength;
    window.generateSmartSignal = generateSmartSignal;
    window.computeSmartMetrics = computeSmartMetrics;
    window.calculateBreakoutProbability = calculateBreakoutProbability;
    window.calculateLiquidityStressIndex = calculateLiquidityStressIndex;
    window.classifyMarketMode = classifyMarketMode;

})();
