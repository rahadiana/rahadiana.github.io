// Auto-generated file - do not edit by hand
export default {


    // ═══════════════════ gkVolatility ═══════════════════
    gkVolatility_directions: { category: 'VOLATILITY', name: 'gkVolatility Direction', icon: '↕️', path: 'signals.micro.gkVolatility.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'LONG', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Directional signal derived from Garman-Klass Volatility' },
    gkVolatility_rawValues: { category: 'VOLATILITY', name: 'gkVolatility Value', icon: '📊', path: 'signals.micro.gkVolatility.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Raw score of Garman-Klass Volatility' },
    gkVolatility_confidences: { category: 'VOLATILITY', name: 'gkVolatility Confidence', icon: '🎯', path: 'signals.micro.gkVolatility.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },


    // ═══════════════════ atrMomentum ═══════════════════
    atrMomentum_directions: { category: 'VOLATILITY', name: 'atrMomentum Direction', icon: '↕️', path: 'signals.micro.atrMomentum.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'LONG', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Directional signal derived from ATR Momentum' },
    atrMomentum_rawValues: { category: 'VOLATILITY', name: 'atrMomentum Value', icon: '📊', path: 'signals.micro.atrMomentum.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Raw score of ATR Momentum' },
    atrMomentum_confidences: { category: 'VOLATILITY', name: 'atrMomentum Confidence', icon: '🎯', path: 'signals.micro.atrMomentum.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },

    // ═══════════════════ volatilityRegime ═══════════════════
    volatilityRegime_regime: { category: 'VOLATILITY', name: 'volatilityRegime Regime', icon: '🌍', path: 'signals.micro.volatilityRegimesss.regime', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['NORMAL', 'EXTREME_VOL', 'HIGH_VOL', 'LOW_VOL'], description: 'Label regime volatilitas berdasarkan rata-rata multi-timeframe' },
    volatilityRegime_regimeScore: { category: 'VOLATILITY', name: 'volatilityRegime Regime Score', icon: '💯', path: 'signals.micro.volatilityRegimesss.regimeScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Skor numerik 0-100 mewakili severity/regime strength' },
    volatilityRegime_volTrend: { category: 'VOLATILITY', name: 'volatilityRegime Vol Trend', icon: '📈', path: 'signals.micro.volatilityRegimesss.volTrend', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'INCREASING', valueType: 'select', options: ['INCREASING', 'DECREASING', 'MIXED', 'UNKNOWN'], description: 'Multi-timeframe volatility trend' },
    volatilityRegime_volConsistency: { category: 'VOLATILITY', name: 'volatilityRegime Vol Consistency', icon: '📐', path: 'signals.micro.volatilityRegimesss.volConsistency', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'STABLE', valueType: 'select', options: ['STABLE', 'UNSTABLE', 'UNKNOWN'], description: 'Consistency of volatility based on standard deviation' },
};
