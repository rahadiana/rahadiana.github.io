// Auto-generated file - do not edit by hand
export default {

        // ═══════════════════ LONG/SHORT RATIO ═══════════════════
    LSR_RATIO: { category: 'LSR', name: 'L/S Ratio', icon: '📐', path: 'raw.LSR.ratio', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.0, description: 'Long vs Short ratio' },
    LSR_LONG_PCT: { category: 'LSR', name: 'Long %', icon: '📈', path: 'raw.LSR.longAccountRatio', operators: ['>', '<'], defaultThreshold: 55, description: '% accounts long' },
    LSR_SHORT_PCT: { category: 'LSR', name: 'Short %', icon: '📉', path: 'raw.LSR.shortAccountRatio', operators: ['>', '<'], defaultThreshold: 45, description: '% accounts short' },
    LSR_ZSCORE: { category: 'LSR', name: 'LSR Z-Score', icon: '📊', path: 'raw.LSR.z', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'LSR deviation' },
    LSR_PERCENTILE: { category: 'LSR', name: 'LSR Percentile', icon: '📏', path: 'raw.LSR.percentile', operators: ['>', '<'], defaultThreshold: 80, description: 'Historical percentile' },

};
