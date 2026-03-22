// Auto-generated file - do not edit by hand
export default {
    // ═══════════════════ ACCUMSCORE ═══════════════════
    accumScore_score: { category: 'ACCUMSCORE', name: 'accumScore_score', icon: '💰', path: 'dashboardSummary.accumScore_score', operators: ['>', '<'], defaultThreshold: 50, description: 'Composite accumulation/distribution score (-100 to 100)' },
    accumScore_phase: { category: 'ACCUMSCORE', name: 'accumScore_phase', icon: '📦', path: 'dashboardSummary.accumScore_phase', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'DISTRIBUTION', 'ACCUMULATION'], description: 'Categorical market phase (ACCUMULATION, DISTRIBUTION, NEUTRAL)' },
    accumScore_volScore: { category: 'ACCUMSCORE', name: 'accumScore_volScore', icon: '📊', path: 'dashboardSummary.accumScore_volScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Volume aspect contribution to accumulation score' },
    accumScore_oiConfirmation: { category: 'ACCUMSCORE', name: 'accumScore_oiConfirmation', icon: '📈', path: 'dashboardSummary.accumScore_oiConfirmation', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'FLAT', valueType: 'select', options: ['FLAT', 'FALLING', 'RISING'], description: 'Open Interest confirmation state' },
    accumScore_isConsolidating: { category: 'ACCUMSCORE', name: 'accumScore_isConsolidating', icon: '➖', path: 'dashboardSummary.accumScore_isConsolidating', operators: ['>', '<'], defaultThreshold: 50, description: 'Flag indicating sideways/consolidation phase' },

    // ═══════════════════ BREAKOUT ═══════════════════
    breakoutPct_breakoutPct: { category: 'BREAKOUT', name: 'breakoutPct_breakoutPct', icon: '🚀', path: 'dashboardSummary.breakoutPct_breakoutPct', operators: ['>', '<'], defaultThreshold: 50, description: 'Breakout strength as percentage' },
    breakoutPct_direction: { category: 'BREAKOUT', name: 'breakoutPct_direction', icon: '⬆️', path: 'dashboardSummary.breakoutPct_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'UP', valueType: 'select', options: ['UP', 'DOWN'], description: 'Direction of the breakout (UP/DOWN)' },
    breakoutPct_status: { category: 'BREAKOUT', name: 'breakoutPct_status', icon: '🎯', path: 'dashboardSummary.breakoutPct_status', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'LOW', valueType: 'select', options: ['LOW', 'MODERATE', 'HIGH_PROBABILITY'], description: 'Categorized probability status of breakout' },

    // ═══════════════════ INTENSITY ═══════════════════
    intensity_intensity: { category: 'INTENSITY', name: 'intensity_intensity', icon: '🔥', path: 'dashboardSummary.intensity_intensity', operators: ['>', '<'], defaultThreshold: 50, description: 'Composite intensity ratio based on volume and frequency' },
    intensity_intensityPct: { category: 'INTENSITY', name: 'intensity_intensityPct', icon: '💯', path: 'dashboardSummary.intensity_intensityPct', operators: ['>', '<'], defaultThreshold: 50, description: 'Mapped percentage-like intensity value (0-100)' },
    intensity_level: { category: 'INTENSITY', name: 'intensity_level', icon: '🌡️', path: 'dashboardSummary.intensity_level', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['NORMAL', 'DEAD', 'ELEVATED', 'HIGH'], description: 'Categorical market intensity level' },
    intensity_volIntensity: { category: 'INTENSITY', name: 'intensity_volIntensity', icon: '📊', path: 'dashboardSummary.intensity_volIntensity', operators: ['>', '<'], defaultThreshold: 50, description: 'Ratio of recent volume to baseline historical volume' },
    intensity_freqIntensity: { category: 'INTENSITY', name: 'intensity_freqIntensity', icon: '⏱️', path: 'dashboardSummary.intensity_freqIntensity', operators: ['>', '<'], defaultThreshold: 50, description: 'Ratio of recent trade frequency to baseline historical frequency' },

    // ═══════════════════ RI_RATIO ═══════════════════
    riRatio: { category: 'RI_RATIO', name: 'riRatio', icon: '⚖️', path: 'dashboardSummary.riRatio_riRatio', operators: ['>', '<'], defaultThreshold: 1, description: 'Ratio indicating trade size distribution (higher => institutional)' },
    riRatio_flowType: { category: 'RI_RATIO', name: 'riRatio_flowType', icon: '🌊', path: 'dashboardSummary.riRatio_flowType', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'RETAIL', valueType: 'select', options: ['RETAIL', 'MIXED', 'INSTITUTIONAL', 'UNKNOWN'], description: 'Categorical flow type derived from R/I Ratio' },
    riRatio_avgTradeSize: { category: 'RI_RATIO', name: 'riRatio_avgTradeSize', icon: '📏', path: 'dashboardSummary.riRatio_avgTradeSize', operators: ['>', '<'], defaultThreshold: 50, description: 'Average trade size for the timeframe' },
    riRatio_histAvgSize: { category: 'RI_RATIO', name: 'riRatio_histAvgSize', icon: '📐', path: 'dashboardSummary.riRatio_histAvgSize', operators: ['>', '<'], defaultThreshold: 50, description: 'Historical average trade size used as baseline' },

    // ═══════════════════ VOLUME_QUALITY ═══════════════════
    volQuality_qualityScore: { category: 'VOLUME_QUALITY', name: 'volQuality_qualityScore', icon: '💎', path: 'dashboardSummary.volQuality_qualityScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Weighted volume quality score (0-100)' },
    volQuality_quality: { category: 'VOLUME_QUALITY', name: 'volQuality_quality', icon: '🏷️', path: 'dashboardSummary.volQuality_quality', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'MODERATE', valueType: 'select', options: ['HIGH', 'MODERATE', 'LOW', 'UNKNOWN'], description: 'Binned volume quality label' },

    // ═══════════════════ LIQUIDITY_QUALITY ═══════════════════
    liqQuality_tier: { category: 'LIQUIDITY_QUALITY', name: 'liqQuality_tier', icon: '💧', path: 'dashboardSummary.liqQuality_tier', operators: ['>', '<'], defaultThreshold: 50, description: 'Liquidity tier (1-5)' },
    liqQuality_tierLabel: { category: 'LIQUIDITY_QUALITY', name: 'liqQuality_tierLabel', icon: '🏷️', path: 'dashboardSummary.liqQuality_tierLabel', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'FAIR', valueType: 'select', options: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'AVOID', 'UNKNOWN'], description: 'Human-readable label for liquidity tier' },
    liqQuality_qualityScore: { category: 'LIQUIDITY_QUALITY', name: 'liqQuality_qualityScore', icon: '💯', path: 'dashboardSummary.liqQuality_qualityScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Aggregate liquidity quality score (0-100)' },

    // ═══════════════════ HISTORICAL_SPIKE ═══════════════════
    historicalSpike_spike: { category: 'HISTORICAL_SPIKE', name: 'historicalSpike_spike', icon: '🌩️', path: 'dashboardSummary.historicalSpike_spike', operators: ['>', '<'], defaultThreshold: 50, description: 'Ratio of recent activity relative to historical baseline' },
    historicalSpike_status: { category: 'HISTORICAL_SPIKE', name: 'historicalSpike_status', icon: '📌', path: 'dashboardSummary.historicalSpike_status', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['EXTREME', 'HIGH', 'LOW', 'NORMAL', 'UNKNOWN'], description: 'Categorized spike status' },

    // ═══════════════════ CVD ═══════════════════
    cvd_normalizedScore: { category: 'CVD', name: 'cvd_normalizedScore', icon: '📊', path: 'dashboardSummary.cvd_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Normalized CVD score (0-100)' },
    cvd_direction: { category: 'CVD', name: 'cvd_direction', icon: '↕️', path: 'dashboardSummary.cvd_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Interpreted true direction of CVD' },
    cvd_confidence: { category: 'CVD', name: 'cvd_confidence', icon: '🎯', path: 'dashboardSummary.cvd_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level for CVD signal' },

    // ═══════════════════ AMIHUD_ILLIQUIDITY ═══════════════════
    amihudIlliquidity_normalizedScore: { category: 'AMIHUD_ILLIQUIDITY', name: 'amihudIlliquidity_normalizedScore', icon: '🏜️', path: 'dashboardSummary.amihudIlliquidity_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Normalized Amihud illiquidity score (0-100)' },
    amihudIlliquidity_direction: { category: 'AMIHUD_ILLIQUIDITY', name: 'amihudIlliquidity_direction', icon: '↕️', path: 'dashboardSummary.amihudIlliquidity_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Interpreted direction based on illiquidity' },
    amihudIlliquidity_confidence: { category: 'AMIHUD_ILLIQUIDITY', name: 'amihudIlliquidity_confidence', icon: '🎯', path: 'dashboardSummary.amihudIlliquidity_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level for illiquidity signal' },

    // ═══════════════════ BOOK_RESILIENCE ═══════════════════
    bookResilience_normalizedScore: { category: 'BOOK_RESILIENCE', name: 'bookResilience_normalizedScore', icon: '🛡️', path: 'dashboardSummary.bookResilience_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Normalized order book resilience score (0-100)' },
    bookResilience_direction: { category: 'BOOK_RESILIENCE', name: 'bookResilience_direction', icon: '↕️', path: 'dashboardSummary.bookResilience_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Interpreted direction of book resilience' },
    bookResilience_confidence: { category: 'BOOK_RESILIENCE', name: 'bookResilience_confidence', icon: '🎯', path: 'dashboardSummary.bookResilience_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level for resilience signal' },

    // ═══════════════════ MOMENTUM_QUALITY ═══════════════════
    momentumQuality_normalizedScore: { category: 'MOMENTUM_QUALITY', name: 'momentumQuality_normalizedScore', icon: '🚅', path: 'dashboardSummary.momentumQuality_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Normalized momentum quality score (0-100)' },
    momentumQuality_direction: { category: 'MOMENTUM_QUALITY', name: 'momentumQuality_direction', icon: '↕️', path: 'dashboardSummary.momentumQuality_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Interpreted direction of momentum quality' },
    momentumQuality_confidence: { category: 'MOMENTUM_QUALITY', name: 'momentumQuality_confidence', icon: '🎯', path: 'dashboardSummary.momentumQuality_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level for momentum quality signal' },

    // ═══════════════════ PRESSURE_ACCELERATION ═══════════════════
    pressureAcceleration_normalizedScore: { category: 'PRESSURE_ACCELERATION', name: 'pressureAcceleration_normalizedScore', icon: '⏩', path: 'dashboardSummary.pressureAcceleration_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Normalized pressure acceleration score (0-100)' },
    pressureAcceleration_direction: { category: 'PRESSURE_ACCELERATION', name: 'pressureAcceleration_direction', icon: '↕️', path: 'dashboardSummary.pressureAcceleration_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Interpreted direction of pressure acceleration' },
    pressureAcceleration_confidence: { category: 'PRESSURE_ACCELERATION', name: 'pressureAcceleration_confidence', icon: '🎯', path: 'dashboardSummary.pressureAcceleration_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level for acceleration signal' },

    // ═══════════════════ INSTITUTIONAL_FOOTPRINT ═══════════════════
    institutionalFootprint_normalizedScore: { category: 'INSTITUTIONAL_FOOTPRINT', name: 'institutionalFootprint_normalizedScore', icon: '🏢', path: 'dashboardSummary.institutionalFootprint_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Normalized institutional footprint score (0-100)' },
    institutionalFootprint_direction: { category: 'INSTITUTIONAL_FOOTPRINT', name: 'institutionalFootprint_direction', icon: '↕️', path: 'dashboardSummary.institutionalFootprint_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Interpreted direction of institutional activity' },
    institutionalFootprint_confidence: { category: 'INSTITUTIONAL_FOOTPRINT', name: 'institutionalFootprint_confidence', icon: '🎯', path: 'dashboardSummary.institutionalFootprint_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level for institutional footprint signal' }
};
