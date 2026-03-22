// Auto-generated file - do not edit by hand

export default {

    // ═══════════════════ masterSignals ═══════════════════

    action: { category: 'MASTERSIGNALS', name: 'masterSignals Action', icon: '⚡', path: 'masterSignals.action', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL', 'NO_TRADE', 'ERROR'], description: 'Master signal trade action (LONG/SHORT/NEUTRAL/NO_TRADE/ERROR)' },
    normalizedScore: { category: 'MASTERSIGNALS', name: 'masterSignals Normalized Score', icon: '💯', path: 'masterSignals.normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Normalized score of the aggregated master signal (0-100)' },
    direction: { category: 'MASTERSIGNALS', name: 'masterSignals Direction', icon: '🧭', path: 'masterSignals.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Overall direction based on aggregate contributing signals' },
    confidence: { category: 'MASTERSIGNALS', name: 'masterSignals Confidence', icon: '🎯', path: 'masterSignals.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level of the aggregated master signal (0-100)' },
    marketRegime: { category: 'MASTERSIGNALS', name: 'masterSignals Market Regime', icon: '🌍', path: 'masterSignals.marketRegime', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LOW_VOL', 'NORMAL', 'HIGH_VOL', 'TRENDING_BULL', 'TRENDING_BEAR', 'EXTREME_VOL', 'NO_LIQUIDITY', 'VOLATILE_CHOPPY', 'UNKNOWN'], description: 'Classified market regime under which the signal was generated' },
};
