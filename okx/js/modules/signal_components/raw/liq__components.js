// Auto-generated file - do not edit by hand
export default {


    // ═══════════════════ LIQUIDATIONS ═══════════════════
    LIQ_RATE: { category: 'LIQ', name: 'Liq Rate', icon: '💥', path: 'raw.LIQ.liqRate', operators: ['>', '<'], defaultThreshold: 2.0, description: 'Liquidation intensity' },
    LIQ_DOMINANT: { category: 'LIQ', name: 'Liq Side', icon: '🎯', path: 'raw.LIQ.dominantSide', operators: ['==', '!='], defaultThreshold: 'N/A', valueType: 'select', options: ['LONG_LIQ', 'SHORT_LIQ', 'BALANCED'], description: 'Dominant liq side' },
    LIQ_CASCADE: { category: 'LIQ', name: 'Liq Cascade', icon: '🎯', path: 'raw.LIQ.isCascade', operators: ['>', '<'], defaultThreshold: 2.0, description: 'Dominant liq side' },
    LIQ_DOMINANT_SIDE: { category: 'LIQ', name: 'Liq Dominant Side', icon: '🎯', path: 'raw.LIQ.dominantSide', operators: ['==', '!='], defaultThreshold: 'N/A', valueType: 'select', options: ['NORMAL', 'POTENTIAL_BOTTOM', 'POTENTIAL_TOP', 'HIGH_VOLATILITY', 'ELEVATED_LIQUIDATIONS'], description: 'Dominant liq side' },
};
