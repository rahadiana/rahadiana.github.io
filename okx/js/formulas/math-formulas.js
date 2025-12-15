// Core math formulas shared across the dashboard.
// NOTE: For consistency, prefer using functions from AnalyticsCore when available.

/**
 * Converts a value into a percentage of its average and clamps NaN to 0.
 * Used by spike detection to avoid Infinity when avg volume is zero.
 */
function CheckInfinity(value, avg) {
    const persentase = avg !== 0
        ? Math.round((value / avg) * 100)
        : 0;
    return persentase;
}

// ===================== Helper: Get AnalyticsCore (centralized) =====================
function getCoreMath() {
    if (typeof globalThis !== 'undefined' && typeof globalThis.getAnalyticsCore === 'function') {
        return globalThis.getAnalyticsCore();
    }
    if (typeof AnalyticsCore !== 'undefined') return AnalyticsCore;
    if (!getCoreMath._warned) {
        getCoreMath._warned = true;
        console.warn('[math-formulas] AnalyticsCore not loaded; using fallback');
    }
    return null;
}

/**
 * Returns the mean and population standard deviation for a numeric series.
 * @deprecated Prefer using AnalyticsCore.meanStd if available
 */
function meanStd(arr) {
    const core = getCoreMath();
    if (core && core.meanStd) return core.meanStd(arr);
    return { mean: 0, std: 0 };
}

/**
 * Hyperbolic tangent approximation used to normalize imbalance scores to [-1, 1].
 */
function _tanh(x) {
    if (Math.tanh) return Math.tanh(x);
    const e = Math.exp(2 * x);
    return (e - 1) / (e + 1);
}

/**
 * Computes ATR (Average True Range) for the given history window.
 * @deprecated Prefer using AnalyticsCore.computeATR if available
 */
function computeATR(history, periods = 14) {
    // Delegate to AnalyticsCore if available (it has the proper True Range calculation)
    const core = getCoreMath();
    if (core && core.computeATR) return core.computeATR(history, periods);
    return 0;
}

