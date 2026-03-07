// Auto-generated file - do not edit by hand
export default {
    // ═══════════════════ ACCUMSCORE ═══════════════════
    accumScore_score: { category: 'ACCUMSCORE', name: 'accumScore_score', icon: '⚡', path: 'dashboardSummary.accumScore_score', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    accumScore_phase: { category: 'ACCUMSCORE', name: 'accumScore_phase', icon: '⚡', path: 'dashboardSummary.accumScore_phase', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'DISTRIBUTION', 'ACCUMULATION'], description: 'Trades per minute' },
    accumScore_volScore: { category: 'ACCUMSCORE', name: 'accumScore_volScore', icon: '⚡', path: 'dashboardSummary.accumScore_volScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    accumScore_oiConfirmation: { category: 'ACCUMSCORE', name: 'accumScore_oiConfirmation', icon: '⚡', path: 'dashboardSummary.accumScore_oiConfirmation', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'FLAT', valueType: 'select', options: ['FLAT', 'FALLING', 'RISING'], description: 'Trades per minute' },
    accumScore_isConsolidating: { category: 'ACCUMSCORE', name: 'accumScore_isConsolidating', icon: '⚡', path: 'dashboardSummary.accumScore_isConsolidating', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    // ═══════════════════ BREAKOUT ═══════════════════
    breakoutPct_breakoutPct: { category: 'BREAKOUT', name: 'breakoutPct_breakoutPct', icon: '⚡', path: 'dashboardSummary.breakoutPct_breakoutPct', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    breakoutPct_direction: { category: 'BREAKOUT', name: 'breakoutPct_direction', icon: '⚡', path: 'dashboardSummary.breakoutPct_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'UP', valueType: 'select', options: ['UP', 'DOWN'], description: 'Trades per minute' },
    breakoutPct_status: { category: 'BREAKOUT', name: 'breakoutPct_status', icon: '⚡', path: 'dashboardSummary.breakoutPct_status', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'LOW', valueType: 'select', options: ['LOW', 'MODERATE', 'HIGH_PROBABILITY'], description: 'Trades per minute' },

    // ═══════════════════ INTENSITY ═══════════════════
    intensity_intensity: { category: 'INTENSITY', name: 'intensity_intensity', icon: '⚡', path: 'dashboardSummary.intensity_intensity', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    intensity_intensityPct: { category: 'INTENSITY', name: 'intensity_intensityPct', icon: '⚡', path: 'dashboardSummary.intensity_intensityPct', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    intensity_level: { category: 'INTENSITY', name: 'intensity_level', icon: '⚡', path: 'dashboardSummary.intensity_level', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['NORMAL', 'DEAD', 'ELEVATED', 'HIGH'], description: 'Trades per minute' },
    intensity_volIntensity: { category: 'INTENSITY', name: 'intensity_volIntensity', icon: '⚡', path: 'dashboardSummary.intensity_volIntensity', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    intensity_freqIntensity: { category: 'INTENSITY', name: 'intensity_freqIntensity', icon: '⚡', path: 'dashboardSummary.intensity_freqIntensity', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    // ═══════════════════ RI_RATIO ═══════════════════
    riRatio: { category: 'RI_RATIO', name: 'riRatio', icon: '⚡', path: 'dashboardSummary.riRatio', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    riRatio_flowType: { category: 'RI_RATIO', name: 'flowType', icon: '⚡', path: 'dashboardSummary.intensity_level', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'RETAIL', valueType: 'select', options: ['RETAIL', 'MIXED', 'INSTITUTIONAL', 'UNKNOWN'], description: 'Trades per minute' },
    riRatio_avgTradeSize: { category: 'RI_RATIO', name: 'avgTradeSize', icon: '⚡', path: 'dashboardSummary.avgTradeSize', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    riRatio_histAvgSize: { category: 'RI_RATIO', name: 'histAvgSize', icon: '⚡', path: 'dashboardSummary.histAvgSize', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    // ═══════════════════ VOLUME_QUALITY ═══════════════════
    volQuality_qualityScore: { category: 'VOLUME_QUALITY', name: 'Vol_qualityScore', icon: '⚡', path: 'dashboardSummary.qualityScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    volQuality_quality: { category: 'VOLUME_QUALITY', name: 'Vol_quality', icon: '⚡', path: 'dashboardSummary.quality', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'MODERATE', valueType: 'select', options: ['HIGH', 'MODERATE', 'LOW', 'UNKNOWN'], description: 'Trades per minute' },

    // ═══════════════════ LIQUIDITY_QUALITY ═══════════════════
    liqQuality_tier: { category: 'LIQUIDITY_QUALITY', name: 'liqQuality_tier', icon: '⚡', path: 'dashboardSummary.liqQuality_tier', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    liqQuality_tierLabel: { category: 'LIQUIDITY_QUALITY', name: 'liqQuality_tierLabel', icon: '⚡', path: 'dashboardSummary.liqQuality_tierLabel', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'FAIR', valueType: 'select', options: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'AVOID', 'UNKNOWN'], description: 'Trades per minute' },
    liqQuality_qualityScore: { category: 'LIQUIDITY_QUALITY', name: 'liqQuality_qualityScore', icon: '⚡', path: 'dashboardSummary.liqQuality_qualityScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    // ═══════════════════ HISTORICAL_SPIKE ═══════════════════
    historicalSpike_spike: { category: 'HISTORICAL_SPIKE', name: 'historicalSpike_spike', icon: '⚡', path: 'dashboardSummary.historicalSpike_spike', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    historicalSpike_status: { category: 'HISTORICAL_SPIKE', name: 'historicalSpike_status', icon: '⚡', path: 'dashboardSummary.historicalSpike_status', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['EXTREME', 'HIGH', 'LOW', 'NORMAL', 'UNKNOWN'], description: 'Trades per minute' },

    // ═══════════════════ CVD ═══════════════════
    cvd_normalizedScore: { category: 'CVD', name: 'cvd_normalizedScore', icon: '⚡', path: 'dashboardSummary.cvd_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    cvd_direction: { category: 'CVD', name: 'cvd_direction', icon: '⚡', path: 'dashboardSummary.cvd_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL',], description: 'Trades per minute' },
    cvd_confidence: { category: 'CVD', name: 'cvd_confidence', icon: '⚡', path: 'dashboardSummary.cvd_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    // ═══════════════════ AMIHUD_ILLIQUIDITY ═══════════════════
    amihudIlliquidity_normalizedScore: { category: 'AMIHUD_ILLIQUIDITY', name: 'amihudIlliquidity_normalizedScore', icon: '⚡', path: 'dashboardSummary.amihudIlliquidity_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    amihudIlliquidity_direction: { category: 'AMIHUD_ILLIQUIDITY', name: 'amihudIlliquidity_direction', icon: '⚡', path: 'dashboardSummary.amihudIlliquidity_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL',], description: 'Trades per minute' },
    amihudIlliquidity_confidence: { category: 'AMIHUD_ILLIQUIDITY', name: 'amihudIlliquidity_confidence', icon: '⚡', path: 'dashboardSummary.amihudIlliquidity_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    // ═══════════════════ BOOK_RESILIENCE ═══════════════════
    bookResilience_normalizedScore: { category: 'BOOK_RESILIENCE', name: 'bookResilience_normalizedScore', icon: '⚡', path: 'dashboardSummary.bookResilience_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    bookResilience_direction: { category: 'BOOK_RESILIENCE', name: 'bookResilience_direction', icon: '⚡', path: 'dashboardSummary.bookResilience_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL',], description: 'Trades per minute' },
    bookResilience_confidence: { category: 'BOOK_RESILIENCE', name: 'bookResilience_confidence', icon: '⚡', path: 'dashboardSummary.bookResilience_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    // ═══════════════════ MOMENTUM_QUALITY ═══════════════════
    momentumQuality_normalizedScore: { category: 'MOMENTUM_QUALITY', name: 'momentumQuality_normalizedScore', icon: '⚡', path: 'dashboardSummary.momentumQuality_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    momentumQuality_direction: { category: 'MOMENTUM_QUALITY', name: 'momentumQuality_direction', icon: '⚡', path: 'dashboardSummary.momentumQuality_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL',], description: 'Trades per minute' },
    momentumQuality_confidence: { category: 'MOMENTUM_QUALITY', name: 'momentumQuality_confidence', icon: '⚡', path: 'dashboardSummary.momentumQuality_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    // ═══════════════════ PRESSURE_ACCELERATION ═══════════════════
    pressureAcceleration_normalizedScore: { category: 'PRESSURE_ACCELERATION', name: 'pressureAcceleration_normalizedScore', icon: '⚡', path: 'dashboardSummary.pressureAcceleration_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    pressureAcceleration_direction: { category: 'PRESSURE_ACCELERATION', name: 'pressureAcceleration_direction', icon: '⚡', path: 'dashboardSummary.pressureAcceleration_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL',], description: 'Trades per minute' },
    pressureAcceleration_confidence: { category: 'PRESSURE_ACCELERATION', name: 'pressureAcceleration_confidence', icon: '⚡', path: 'dashboardSummary.pressureAcceleration_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    // ═══════════════════ INSTITUTIONAL_FOOTPRINT ═══════════════════
    institutionalFootprint_normalizedScore: { category: 'INSTITUTIONAL_FOOTPRINT', name: 'institutionalFootprint_normalizedScore', icon: '⚡', path: 'dashboardSummary.institutionalFootprint_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    institutionalFootprint_direction: { category: 'INSTITUTIONAL_FOOTPRINT', name: 'institutionalFootprint_direction', icon: '⚡', path: 'dashboardSummary.institutionalFootprint_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL',], description: 'Trades per minute' },
    institutionalFootprint_confidence: { category: 'INSTITUTIONAL_FOOTPRINT', name: 'institutionalFootprint_confidence', icon: '⚡', path: 'dashboardSummary.institutionalFootprint_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

};
