// Auto-generated file - do not edit by hand
export default {


    // ═══════════════════ smartMoneyIndex ═══════════════════
    smartMoneyIndex_directions: { category: 'COMPOSITE', name: 'smartMoneyIndex Direction', icon: '⚡', path: 'signals.micro.smartMoneyIndex.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Trades per minute' },
    smartMoneyIndex_rawValues: { category: 'COMPOSITE', name: 'smartMoneyIndex Value', icon: '⚡', path: 'signals.micro.smartMoneyIndex.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    smartMoneyIndex_confidences: { category: 'COMPOSITE', name: 'smartMoneyIndex Confidence', icon: '⚡', path: 'signals.micro.smartMoneyIndex.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },


    // ═══════════════════ marketRegime ═══════════════════  
    currentRegime: { category: 'COMPOSITE', name: 'currentRegime', icon: '⚡', path: 'signals.micro.marketRegime.currentRegime', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'RANGING', valueType: 'select', options: ['RANGING', 'VOLATILE_CHOPPY', 'TRENDING_BULL', 'TRENDING_BEAR'], description: 'Trades per minute' },
    // regime: { category: 'COMPOSITE', name: 'regime', icon: '⚡', path: 'signals.micro.marketRegime.regime', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Trades per minute' },
    regimeScore: { category: 'COMPOSITE', name: 'regimeScore', icon: '⚡', path: 'signals.micro.marketRegime.regimeScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    volRegime: { category: 'COMPOSITE', name: 'volRegime', icon: '⚡', path: 'signals.micro.marketRegime.volRegime', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['NORMAL', 'EXTREME_VOL', 'HIGH_VOL', 'LOW_VOL'], description: 'Trades per minute' },
    trendStrength: { category: 'COMPOSITE', name: 'trendStrength', icon: '⚡', path: 'signals.micro.marketRegime.trendStrength', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    trendDirection: { category: 'COMPOSITE', name: 'trendDirection', icon: '⚡', path: 'signals.micro.marketRegime.trendDirection', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'BULL', valueType: 'select', options: ['BULL', 'BEAR'], description: 'Trades per minute' },
    isHighVolume: { category: 'COMPOSITE', name: 'isHighVolume', icon: '⚡', path: 'signals.micro.marketRegime.isHighVolume', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NO', valueType: 'select', options: ['YES', 'NO'], description: 'Trades per minute' },
};
