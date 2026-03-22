// Auto-generated file - do not edit by hand
export default {

    cohesion_level: { category: 'MICROSTRUCTURESUMMARY', name: 'cohesion_level', icon: '🔗', path: 'microstructureSummary.cohesion_level', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'LONG', 'SHORT'], description: 'Normalized cohesive strength (0-100)' },
    cohesion_dominantDirection: { category: 'MICROSTRUCTURESUMMARY', name: 'cohesion_dominantDirection', icon: '🧭', path: 'microstructureSummary.cohesion_dominantDirection', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'MODERATE', valueType: 'select', options: ['MODERATE', 'WEAK', 'STRONG'], description: 'Dominant direction of cohesive flow' },

    accVol_trend: { category: 'MICROSTRUCTURESUMMARY', name: 'accVol_trend', icon: '📈', path: 'microstructureSummary.accVol_trend', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'MIXED', valueType: 'select', options: ['MIXED', 'DISTRIBUTING', 'ACCUMULATING'], description: 'Accumulation/Distribution trend status' },
    accVol_direction: { category: 'MICROSTRUCTURESUMMARY', name: 'accVol_direction', icon: '↕️', path: 'microstructureSummary.accVol_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'LONG', 'SHORT'], description: 'Overall volume direction (LONG/SHORT/NEUTRAL)' },

    fbi_direction: { category: 'MICROSTRUCTURESUMMARY', name: 'fbi_direction', icon: '💸', path: 'microstructureSummary.fbi_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'LONGS_PAY', valueType: 'select', options: ['LONGS_PAY', 'SHORTS_PAY', 'UNKNOWN'], description: 'Direction indicating which side pays funding bias' },
    fbi_extreme: { category: 'MICROSTRUCTURESUMMARY', name: 'fbi_extreme', icon: '⚠️', path: 'microstructureSummary.fbi_extreme', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'false', valueType: 'select', options: ['true', 'false'], description: 'Whether the funding bias is extreme' },

    ofsi_strength: { category: 'MICROSTRUCTURESUMMARY', name: 'ofsi_strength', icon: '💪', path: 'microstructureSummary.ofsi_strength', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'MODERATE', valueType: 'select', options: ['MODERATE', 'WEAK', 'STRONG'], description: 'Strength classification of order flow sentiment' },
    ofsi_direction: { category: 'MICROSTRUCTURESUMMARY', name: 'ofsi_direction', icon: '↕️', path: 'microstructureSummary.ofsi_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'LONG', 'SHORT'], description: 'Direction implied by raw order flow imbalance' },

    fsi_sentiment: { category: 'MICROSTRUCTURESUMMARY', name: 'fsi_sentiment', icon: '🎭', path: 'microstructureSummary.fsi_sentiment', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'BULLISH', 'BEARISH'], description: 'Overall funding sentiment bias' },

    zPress_pressure: { category: 'MICROSTRUCTURESUMMARY', name: 'zPress_pressure', icon: '🗜️', path: 'microstructureSummary.zPress_pressure', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'MODERATE', valueType: 'select', options: ['MODERATE', 'HIGH', 'LOW', 'EXTREME'], description: 'Pressure classification derived from z-score' },
    zPress_direction: { category: 'MICROSTRUCTURESUMMARY', name: 'zPress_direction', icon: '↕️', path: 'microstructureSummary.zPress_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'FLAT', valueType: 'select', options: ['FLAT', 'DOWN', 'UP'], description: 'Direction implied by Z-Press' },

    tim_imbalance: { category: 'MICROSTRUCTURESUMMARY', name: 'tim_imbalance', icon: '⚖️', path: 'microstructureSummary.tim_imbalance', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'BALANCED', valueType: 'select', options: ['BUY_HEAVY', 'SELL_HEAVY', 'BALANCED'], description: 'Categorized trade imbalance (BUY_HEAVY/SELL_HEAVY/BALANCED)' },

    rangeComp_status: { category: 'MICROSTRUCTURESUMMARY', name: 'rangeComp_status', icon: '🚥', path: 'microstructureSummary.rangeComp_status', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['NORMAL', 'EXPANDING', 'COMPRESSING', 'SQUEEZE'], description: 'Compression status relative to range' },

    pfci_signal: { category: 'MICROSTRUCTURESUMMARY', name: 'pfci_signal', icon: '📡', path: 'microstructureSummary.pfci_signal', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'TREND_FOLLOW', 'MEAN_REVERSION'], description: 'Interpreted price/funding relationship signal' },
    pfci_priceDirection: { category: 'MICROSTRUCTURESUMMARY', name: 'pfci_priceDirection', icon: '📈', path: 'microstructureSummary.pfci_priceDirection', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'FLAT', valueType: 'select', options: ['FLAT', 'UP', 'DOWN'], description: 'Direction of recent price change' },
    pfci_fundingDirection: { category: 'MICROSTRUCTURESUMMARY', name: 'pfci_fundingDirection', icon: '💸', path: 'microstructureSummary.pfci_fundingDirection', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'FLAT', valueType: 'select', options: ['FLAT', 'POSITIVE', 'NEGATIVE'], description: 'Direction of funding rate change' },

    lsi_level: { category: 'MICROSTRUCTURESUMMARY', name: 'lsi_level', icon: '🚨', path: 'microstructureSummary.lsi_level', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL'], description: 'Liquidity stress level (NORMAL/ELEVATED/HIGH/CRITICAL)' },

    volumeProfile_signal: { category: 'MICROSTRUCTURESUMMARY', name: 'volumeProfile_signal', icon: '📊', path: 'microstructureSummary.volumeProfile_signal', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['DISCOUNT', 'PREMIUM', 'UNDERVALUED', 'OVERVALUED', 'NEUTRAL'], description: 'Valuation signal relative to current price' },
    volumeProfile_interpretation: { category: 'MICROSTRUCTURESUMMARY', name: 'volumeProfile_interpretation', icon: '📌', path: 'microstructureSummary.volumeProfile_interpretation', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'AT_POC', valueType: 'select', options: ['BELOW_POC', 'ABOVE_POC', 'BELOW_VAL', 'ABOVE_VAH', 'AT_POC'], description: 'Location of price relative to POC/Value Area' },

    cvdDivergence_signal: { category: 'MICROSTRUCTURESUMMARY', name: 'cvdDivergence_signal', icon: '🔍', path: 'microstructureSummary.cvdDivergence_signal', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['BEARISH_ABSORPTION', 'BULLISH_ABSORPTION', 'BEARISH_ABSORPTION', 'NEUTRAL'], description: 'Type of absorption/divergence detected' },
    cvdDivergence_divergenceStrength: { category: 'MICROSTRUCTURESUMMARY', name: 'cvdDivergence_divergenceStrength', icon: '💪', path: 'microstructureSummary.cvdDivergence_divergenceStrength', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NONE', valueType: 'select', options: ['NONE', 'STRONG', 'MODERATE', 'WEAK'], description: 'Strength of the detected divergence' },

    cis_bias: { category: 'MICROSTRUCTURESUMMARY', name: 'cis_bias', icon: '🎭', path: 'microstructureSummary.cis_bias', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'BULLISH', 'BEARISH'], description: 'Categorized composite sentiment bias' },

};
