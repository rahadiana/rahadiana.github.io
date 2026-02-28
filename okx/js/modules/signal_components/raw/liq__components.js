// Auto-generated file - do not edit by hand
export default {


    // ═══════════════════ LIQUIDATIONS ═══════════════════
    LIQ_RATE: { category: 'LIQ', name: 'Liq Rate', icon: '💥', path: 'raw.LIQ.liqRate', operators: ['>', '<'], defaultThreshold: 2.0, description: 'Liquidation intensity' },
    LIQ_DOMINANT: { category: 'LIQ', name: 'Liq Side', icon: '🎯', path: 'raw.LIQ.dominantSide', operators: ['==', '!='], defaultThreshold: 'BALANCED', valueType: 'select', options: ['LONG LIQ', 'SHORT LIQ', 'BALANCED'], description: 'Dominant liq side' },

};
