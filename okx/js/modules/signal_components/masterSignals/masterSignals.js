// Auto-generated file - do not edit by hand

export default {

    // ═══════════════════ masterSignals ═══════════════════

    action: { category: 'MASTERSIGNALS', name: 'masterSignals Action', icon: '⚡', path: 'masterSignals.action', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Trades per minute' },
    normalizedScore: { category: 'MASTERSIGNALS', name: 'masterSignals Normalized Score', icon: '⚡', path: 'masterSignals.normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    direction: { category: 'MASTERSIGNALS', name: 'masterSignals Direction', icon: '⚡', path: 'masterSignals.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Trades per minute' },
    confidence: { category: 'MASTERSIGNALS', name: 'masterSignals Confidence', icon: '⚡', path: 'masterSignals.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    marketRegime: { category: 'MASTERSIGNALS', name: 'masterSignals Market Regime', icon: '⚡', path: 'masterSignals.marketRegime', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LOW_VOL', 'NORMAL', 'HIGH_VOL', 'TRENDING_BULL', 'TRENDING_BEAR', 'EXTREME_VOL', 'NO_LIQUIDITY', 'VOLATILE_CHOPPY', 'UNKNOWN'], description: 'Trades per minute' },
};
