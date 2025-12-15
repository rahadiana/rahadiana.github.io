// Helper utilities split from websocket-example.js

// Debounce helper to reduce DOM churn from frequent updates
function debounce(fn, wait) {
    let t = null;
    return function (...args) {
        if (t) clearTimeout(t);
        t = setTimeout(() => { try { fn.apply(this, args); } catch (e) { }; t = null; }, wait);
    };
}

// Draw a simple SVG sparkline from a history array
function drawSparkline(history, width = 600, height = 80) {
    if (!history || history.length === 0) return '';
    const vals = history.map(h => Number(h.price || h.volBuy2h || h.volSell2h || 0));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = (max - min) || 1;
    const step = width / Math.max(1, vals.length - 1);
    const points = vals.map((v, i) => {
        const x = Math.round(i * step);
        const y = Math.round(height - ((v - min) / range) * height);
        return `${x},${y}`;
    }).join(' ');
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><polyline fill="none" stroke="#0d6efd" stroke-width="2" points="${points}"/></svg>`;
}

// Comparator helper for advanced filters
const ADV_COMPARATOR_TOLERANCE = 1e-9;
function normalizeComparatorValue(raw, fallback = '>') {
    const val = (raw || '').toString().trim();
    if (val === '>' || val === '<' || val === '=') return val;
    if (val === '>=' || val.toLowerCase() === 'gte') return '>';
    if (val === '<=' || val.toLowerCase() === 'lte') return '<';
    if (val.toLowerCase() === 'eq') return '=';
    return fallback;
}
function compareWithComparator(value, comparator, target) {
    const comp = normalizeComparatorValue(comparator);
    const val = Number(value);
    const threshold = Number(target);
    const v = Number.isFinite(val) ? val : 0;
    const t = Number.isFinite(threshold) ? threshold : 0;
    switch (comp) {
        case '<':
            return v < t;
        case '=':
            return Math.abs(v - t) <= ADV_COMPARATOR_TOLERANCE;
        case '>':
        default:
            return v > t;
    }
}

// Expose helpers globally
window.debounce = debounce;
window.drawSparkline = drawSparkline;
window.normalizeComparatorValue = normalizeComparatorValue;
window.compareWithComparator = compareWithComparator;

// Read a smart metric value supporting both legacy flattened keys and nested objects
function getSmartMetric(smartObj, legacyKey, nestedKey) {
    if (!smartObj) return 0;
    // Legacy flattened value
    if (legacyKey && typeof smartObj[legacyKey] !== 'undefined' && smartObj[legacyKey] !== null) {
        const v = Number(smartObj[legacyKey]);
        if (!isNaN(v)) return v;
    }
    // Nested object style (AnalyticsCore)
    if (nestedKey && smartObj[nestedKey]) {
        const nested = smartObj[nestedKey];
        if (typeof nested === 'number') return nested;
        if (nested && typeof nested.value !== 'undefined' && nested.value !== null) {
            const nv = Number(nested.value);
            if (!isNaN(nv)) return nv;
        }
    }
    // fallback: attempt to read either common flattened aliases
    const aliases = [legacyKey, nestedKey];
    for (const a of aliases) {
        if (!a) continue;
        const low = Object.keys(smartObj).find(k => String(k).toLowerCase() === String(a).toLowerCase());
        if (low) {
            const v = Number(smartObj[low]);
            if (!isNaN(v)) return v;
        }
    }
    return 0;
}
window.getSmartMetric = getSmartMetric;

// Return a unified smart-metrics object for renderers.
// Prefers AnalyticsCore.computeAllSmartMetrics, then computeSmartMetrics (worker), then synthesizes from data._analytics.
function getUnifiedSmartMetrics(data) {
    try {
        if (!data) return null;
        if (typeof AnalyticsCore !== 'undefined' && AnalyticsCore.computeAllSmartMetrics) {
            return AnalyticsCore.computeAllSmartMetrics(data);
        }
        if (typeof computeSmartMetrics === 'function') {
            return computeSmartMetrics(data);
        }
        const a = data && (data.analytics || data._analytics) ? (data.analytics || data._analytics) : {};
        // Synthesize a minimal metrics object expected by renderers
        const smiVal = Number(a.smartMoneyIndex || a.smi || 0) || 0;
        const accumVal = Number(a.accumulationScore || a.accumScore || a.accumulation || 50) || 50;
        const pressureVal = Number(a.pressureIndex || (a.pressure && a.pressure.value) || 0) || 0;
        const ri = a.retailInstitutionalRatio || a.riRatio || a.retail_institutional_ratio || 100;
        const smartSignal = a.smartSignal || a.smart_signal || { signal: 'HOLD', confidence: 0, className: 'text-muted' };
        return {
            smi: { value: smiVal, interpretation: a.smiInterpretation || '', className: a.smiClass || '' },
            intensity: { value: a.intensity && a.intensity.value ? Number(a.intensity.value) : (a.intensity || 0), level: (a.intensity && a.intensity.level) || '' },
            divergence: { value: (a.divergence !== undefined ? a.divergence : 0), interpretation: a.divergenceInterpretation || '', className: a.divergenceClass || '' },
            accumScore: { value: accumVal, interpretation: a.accumInterpretation || '', className: a.accumClass || '' },
            whale: { value: Number(a.whaleActivity || 0), level: a.whaleLevel || '' },
            riRatio: { value: Number(ri), type: a.riType || '', className: a.riClass || '' },
            pressure: { value: pressureVal, direction: (a.pressure && a.pressure.direction) || '', className: a.pressureClass || '' },
            trendStrength: { value: Number((a.trendStrength && a.trendStrength.value) || a.trendStrength || 50), level: (a.trendStrength && a.trendStrength.level) || '' },
            breakout: { value: Number(a.breakout && a.breakout.value || 0), direction: (a.breakout && a.breakout.direction) || '', confidence: (a.breakout && a.breakout.confidence) || 0, className: a.breakoutClass || '' },
            lsi: { value: Number(a.lsi && a.lsi.value || a.lsi || 50), level: (a.lsi && a.lsi.level) || '' },
            marketMode: { mode: (a.marketMode && a.marketMode.mode) || a.marketMode || 'UNKNOWN', confidence: (a.marketMode && a.marketMode.confidence) || 0, className: a.marketModeClass || '' },
            smartSignal: smartSignal,
            // keep common flattened analytics for backwards compatibility
            volDurability2h_percent: a.volDurability2h_percent !== undefined ? a.volDurability2h_percent : (a.volDurability2h || null),
            volRatioBuySell_percent: a.volRatioBuySell_percent !== undefined ? a.volRatioBuySell_percent : (a.volRatioBuySell || null),
            freqBuy2h: Number(a.freqBuy2h || 0),
            freqSell2h: Number(a.freqSell2h || 0),
            volBuy2h: Number(a.volBuy2h || 0),
            volSell2h: Number(a.volSell2h || 0),
            riskScore: Number(a.riskScore || 0)
        };
    } catch (e) {
        return null;
    }
}
window.getUnifiedSmartMetrics = getUnifiedSmartMetrics;

// --- Adapter shims for percent/fraction normalization ---
// Ensures a value is expressed as percent (0..100). Accepts raw percent or fraction (-1..1 or 0..1).
function ensurePercent(val) {
    if (val === undefined || val === null) return 0;
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    // If value looks like fraction (-1..1), convert to percent
    if (Math.abs(n) <= 1) return n * 100;
    return n;
}

// Ensures a value is a fraction between -1 and 1. Accepts percent (0..100) or fraction.
function ensureFraction(val) {
    if (val === undefined || val === null) return 0;
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    if (Math.abs(n) > 1) return n / 100;
    return n;
}

// Read a percent-style metric from unified metrics or legacy keys and normalize to percent (0..100)
function getPercentValue(metrics, keyCandidates) {
    if (!metrics) return 0;
    const keys = Array.isArray(keyCandidates) ? keyCandidates : [keyCandidates];
    for (const k of keys) {
        if (!k) continue;
        if (typeof metrics[k] !== 'undefined' && metrics[k] !== null) {
            // If nested object with .value
            const v = (typeof metrics[k] === 'object' && metrics[k] !== null && typeof metrics[k].value !== 'undefined') ? metrics[k].value : metrics[k];
            if (v === null || v === undefined) continue;
            return ensurePercent(v);
        }
        // try flattened variants
        const low = Object.keys(metrics).find(x => String(x).toLowerCase() === String(k).toLowerCase());
        if (low) {
            const vv = metrics[low];
            return ensurePercent(vv);
        }
    }
    return 0;
}

window.ensurePercent = ensurePercent;
window.ensureFraction = ensureFraction;
window.getPercentValue = getPercentValue;
