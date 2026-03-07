// Auto-generated file - do not edit by hand
export default {

    orderFlow_flowDirection: { category: 'ANALYTICSSUMMARY', name: 'orderFlow_flowDirection', icon: '⚡', path: 'analyticsSummary.orderFlow_flowDirection', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'LONG', 'SHORT'], description: 'Trades per minute' },

    confluenceStrength: { category: 'ANALYTICSSUMMARY', name: 'confluenceStrength', icon: '⚡', path: 'analyticsSummary.mtfAnalysis_confluenceStrength', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NONE', valueType: 'select', options: ['STRONG', 'MODERATE', 'WEAK', 'NONE'], description: 'Trades per minute' },
    confluenceDirection: { category: 'ANALYTICSSUMMARY', name: 'confluenceDirection', icon: '⚡', path: 'analyticsSummary.mtfAnalysis_confluenceDirection', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'MIXED', valueType: 'select', options: ['BULLISH', 'BEARISH', 'MIXED'], description: 'Trades per minute' },

    momentumShift: { category: 'ANALYTICSSUMMARY', name: 'momentumShift', icon: '⚡', path: 'analyticsSummary.mtfAnalysis_momentumShift', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'MODERATE', valueType: 'select', options: ['MODERATE', 'WEAK', 'STRONG'], description: 'Trades per minute' },
    absorption: { category: 'ANALYTICSSUMMARY', name: 'absorption', icon: '⚡', path: 'analyticsSummary.mtfAnalysis_absorption', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'false', valueType: 'select', options: ['true', 'false'], description: 'Trades per minute' },
    exhaustion: { category: 'ANALYTICSSUMMARY', name: 'exhaustion', icon: '⚡', path: 'analyticsSummary.mtfAnalysis_exhaustion', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'false', valueType: 'select', options: ['true', 'false'], description: 'Trades per minute' },
    multiTFSignal: { category: 'ANALYTICSSUMMARY', name: 'multiTFSignal', icon: '⚡', path: 'analyticsSummary.mtfAnalysis_multiTFSignal', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'LONG', 'SHORT'], description: 'Trades per minute' },
    multiTFConfidence: { category: 'ANALYTICSSUMMARY', name: 'multiTFConfidence', icon: '⚡', path: 'analyticsSummary.mtfAnalysis_multiTFConfidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    volatility_volatilityRegime: { category: 'ANALYTICSSUMMARY', name: 'volatility_volatilityRegime', icon: '⚡', path: 'analyticsSummary.volatility_volatilityRegime', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['LOW', 'NORMAL', 'HIGH', 'EXTREME'], description: 'Trades per minute' },
    volatility_volTrend: { category: 'ANALYTICSSUMMARY', name: 'volatility_volTrend', icon: '⚡', path: 'analyticsSummary.volatility_volTrend', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'STABLE', valueType: 'select', options: ['INCREASING', 'DECREASING', 'STABLE'], description: 'Trades per minute' },

    priceAction_nearestResistance: { category: 'ANALYTICSSUMMARY', name: 'multiTFConfidence', icon: '⚡', path: 'analyticsSummary.mtfAnalysis_multiTFConfidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    priceAction_nearestSupport: { category: 'ANALYTICSSUMMARY', name: 'multiTFConfidence', icon: '⚡', path: 'analyticsSummary.mtfAnalysis_multiTFConfidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    funding_fundingDirection: { category: 'ANALYTICSSUMMARY', name: 'funding_fundingDirection', icon: '⚡', path: 'analyticsSummary.funding_fundingDirection', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'LONGS_PAY', valueType: 'select', options: ['LONGS_PAY', 'SHORTS_PAY'], description: 'Trades per minute' },
    funding_fundingLevel: { category: 'ANALYTICSSUMMARY', name: 'funding_fundingLevel', icon: '⚡', path: 'analyticsSummary.funding_fundingLevel', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['NORMAL', 'MODERATE', 'HIGH', 'EXTREME'], description: 'Trades per minute' },
    funding_fundingPressure: { category: 'ANALYTICSSUMMARY', name: 'funding_fundingPressure', icon: '⚡', path: 'analyticsSummary.funding_fundingPressure', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'LONGS_SQUEEZED', 'SHORTS_SQUEEZED'], description: 'Trades per minute' },
    funding_trend: { category: 'ANALYTICSSUMMARY', name: 'funding_trend', icon: '⚡', path: 'analyticsSummary.funding_trend', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'STABLE', valueType: 'select', options: ['INCREASING', 'DECREASING', 'STABLE'], description: 'Trades per minute' },

    correlation_classification: { category: 'ANALYTICSSUMMARY', name: 'correlation_classification', icon: '⚡', path: 'analyticsSummary.funding_trend', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'HIGH_BETA_AGGRESSIVE', 'MARKET_TRACKER', 'LOW_BETA_DEFENSIVE', 'UNCORRELATED', 'NEGATIVE_BETA_HEDGE'], description: 'Trades per minute' },
    correlation_betaReliability: { category: 'ANALYTICSSUMMARY', name: 'correlation_betaReliability', icon: '⚡', path: 'analyticsSummary.funding_trend', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'RELIABLE', valueType: 'select', options: ['RELIABLE', 'UNRELIABLE'], description: 'Trades per minute' },

    vwap_vwap: { category: 'ANALYTICSSUMMARY', name: 'vwap', icon: '⚡', path: 'analyticsSummary.mtfAnalysis_multiTFConfidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    sorterMetrics_maxPain_direction: { category: 'ANALYTICSSUMMARY', name: 'sorterMetrics_maxPain_direction', icon: '⚡', path: 'analyticsSummary.sorterMetrics_maxPain_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Trades per minute' },
    sorterMetrics_pcr_direction: { category: 'ANALYTICSSUMMARY', name: 'sorterMetrics_pcr_direction', icon: '⚡', path: 'analyticsSummary.sorterMetrics_pcr_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Trades per minute' },
    sorterMetrics_macroPremium_direction: { category: 'ANALYTICSSUMMARY', name: 'sorterMetrics_macroPremium_direction', icon: '⚡', path: 'analyticsSummary.sorterMetrics_macroPremium_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Trades per minute' },
    sorterMetrics_macroPremium_flowOrigin: { category: 'ANALYTICSSUMMARY', name: 'sorterMetrics_macroPremium_flowOrigin', icon: '⚡', path: 'analyticsSummary.sorterMetrics_macroPremium_flowOrigin', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'MIXED', valueType: 'select', options: ['MIXED', 'US_INSTITUTIONAL_BUYING', 'US_RETAIL_BIDS', 'US_INSTITUTIONAL_SELLING', 'OFFSHORE_DOMINANCE'], description: 'Trades per minute' },
    sorterMetrics_macroPremium_sentiment: { category: 'ANALYTICSSUMMARY', name: 'sorterMetrics_macroPremium_sentiment', icon: '⚡', path: 'analyticsSummary.sorterMetrics_macroPremium_sentiment', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['NEUTRAL', 'BULLISH', 'MILD_BULLISH', 'BEARISH', 'MILD_BEARISH'], description: 'Trades per minute' },

    sorterMetrics_pairs_divergence_normalizedScore: { category: 'ANALYTICSSUMMARY', name: 'sorterMetrics_pairs_divergence_normalizedScore', icon: '⚡', path: 'analyticsSummary.sorterMetrics_pairs_divergence_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },
    sorterMetrics_pairs_divergence_direction: { category: 'ANALYTICSSUMMARY', name: 'sorterMetrics_pairs_divergence_direction', icon: '⚡', path: 'analyticsSummary.sorterMetrics_pairs_divergence_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Trades per minute' },
    toxicFlow_pairs_confidence: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_pairs_confidence', icon: '⚡', path: 'analyticsSummary.toxicFlow_pairs_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    toxicFlow_vpin_normalizedScore: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_vpin_normalizedScore', icon: '⚡', path: 'analyticsSummary.toxicFlow_vpin_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    toxicFlow_vpin_direction: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_vpin_direction', icon: '⚡', path: 'analyticsSummary.toxicFlow_vpin_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Trades per minute' },

    toxicFlow_vpin_confidence: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_vpin_normalizedScore', icon: '⚡', path: 'analyticsSummary.toxicFlow_vpin_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    toxicFlow_vpin_riskLevel: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_vpin_riskLevel', icon: '⚡', path: 'analyticsSummary.toxicFlow_vpin_riskLevel', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NORMAL', valueType: 'select', options: ['NORMAL', 'EXTREME', 'HIGH', 'MODERATE'], description: 'Trades per minute' },

    toxicFlow_vpin_toxicity: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_vpin_toxicity', icon: '⚡', path: 'analyticsSummary.toxicFlow_vpin_toxicity', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'MINIMAL', valueType: 'select', options: ['MINIMAL', 'SEVERE_TOXIC_FLOW', 'ELEVATED_TOXICITY', 'DETECTABLE_INSTITUTIONAL'], description: 'Trades per minute' },
    toxicFlow_vpin_toxicity_direction: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_vpin_toxicity_direction', icon: '⚡', path: 'analyticsSummary.toxicFlow_vpin_toxicity_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'INFORMED_BUYING', valueType: 'select', options: ['INFORMED_BUYING', 'INFORMED_SELLING'], description: 'Trades per minute' },
    toxicFlow_vpin_bucketImbalance: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_vpin_bucketImbalance', icon: '⚡', path: 'analyticsSummary.toxicFlow_vpin_bucketImbalance', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },


    toxicFlow_hawkes_normalizedScore: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_hawkes_normalizedScore', icon: '⚡', path: 'analyticsSummary.toxicFlow_hawkes_normalizedScore', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    toxicFlow_hawkes_direction: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_hawkes_direction', icon: '⚡', path: 'analyticsSummary.toxicFlow_hawkes_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Trades per minute' },
    toxicFlow_hawkes_confidence: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_hawkes_confidence', icon: '⚡', path: 'analyticsSummary.toxicFlow_hawkes_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    toxicFlow_hawkes_lambda: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_hawkes_lambda', icon: '⚡', path: 'analyticsSummary.toxicFlow_hawkes_lambda', operators: ['>', '<'], defaultThreshold: 50, description: 'Trades per minute' },

    toxicFlow_hawkes_clusteringState: { category: 'ANALYTICSSUMMARY', name: 'toxicFlow_hawkes_direction', icon: '⚡', path: 'analyticsSummary.toxicFlow_hawkes_direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'STABLE', valueType: 'select', options: ['STABLE', 'EXTREME_EXCITATION', 'HERD_BEHAVIOR_ACTIVE', 'MILD_EXCITATION'], description: 'Trades per minute' },
















};
