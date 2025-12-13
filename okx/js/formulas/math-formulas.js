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

/**
 * Returns the mean and population standard deviation for a numeric series.
 * @deprecated Prefer using AnalyticsCore.meanStd if available
 */
function meanStd(arr) {
    // Delegate to AnalyticsCore if available
    if (typeof AnalyticsCore !== 'undefined' && AnalyticsCore.meanStd) {
        return AnalyticsCore.meanStd(arr);
    }
    // Fallback implementation
    if (!arr || arr.length === 0) return { mean: 0, std: 0 };
    const nums = arr.filter(x => Number.isFinite(x));
    if (nums.length === 0) return { mean: 0, std: 0 };
    const mean = nums.reduce((sum, v) => sum + v, 0) / nums.length;
    const variance = nums.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / nums.length;
    return { mean, std: Math.sqrt(variance) };
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
    if (typeof AnalyticsCore !== 'undefined' && AnalyticsCore.computeATR) {
        return AnalyticsCore.computeATR(history, periods);
    }
    // Fallback: simplified average absolute change
    try {
        if (!history || !Array.isArray(history) || history.length < 2) return 0;
        const arr = history.slice(-Math.max(periods, 2));
        let sum = 0;
        let count = 0;
        for (let i = 1; i < arr.length; i++) {
            const p0 = Number(arr[i - 1].price) || Number(arr[i - 1].last) || 0;
            const p1 = Number(arr[i].price) || Number(arr[i].last) || 0;
            if (p0 > 0 && p1 > 0) {
                sum += Math.abs(p1 - p0);
                count++;
            }
        }
        return count > 0 ? (sum / count) : 0;
    } catch (e) {
        return 0;
    }
}

