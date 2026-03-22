// Auto-generated file - do not edit by hand
export default {

    // ═══════════════════ OPEN INTEREST ═══════════════════
    OI_VALUE: { category: 'OI', name: 'OI Value ($)', icon: '🔄', path: 'raw.OI.oi', operators: ['>', '<'], defaultThreshold: 500000, description: 'Total open interest' },
    OI_volumeOIRatio: { category: 'OI', name: 'Volume / OI Ratio', icon: '🔄', path: 'raw.OI.volumeOIRatio', operators: ['>', '<'], defaultThreshold: 100000, description: 'Volume / OI ratio metric.' },
    OI_volumeDeviation: { category: 'OI', name: 'OI Volume Deviation', icon: '🔄', path: 'raw.OI.volumeDeviation', operators: ['>', '<', 'ABS>'], defaultThreshold: 50.0, description: 'Deviation of volume vs baseline (0-100)' },

    OI_CONVIDENCE: { category: 'OI', name: 'OI Confidence', icon: '🔄', path: 'raw.OI.signalConfidence', operators: ['>', '<'], defaultThreshold: 50, description: 'OI confidence (0-100)' },

    OI_CHANGE_5M: { category: 'OI', name: 'OI Δ 5m %', icon: '📊', path: 'raw.OI.oiChange5m', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.5, description: 'OI change 5 min' },
    OI_CHANGE_15M: { category: 'OI', name: 'OI Δ 15m %', icon: '📊', path: 'raw.OI.oiChange15m', operators: ['>', '<', 'ABS>'], defaultThreshold: 1.0, description: 'OI change 15 min' },
    OI_CHANGE_1H: { category: 'OI', name: 'OI Δ 1h %', icon: '📊', path: 'raw.OI.oiChange1h', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'OI change 1 hour' },
    OI_CHANGE_4H: { category: 'OI', name: 'OI Δ 4h %', icon: '📊', path: 'raw.OI.oiChange4h', operators: ['>', '<', 'ABS>'], defaultThreshold: 5.0, description: 'OI change 4 hours' },
    OI_CHANGE_24H: { category: 'OI', name: 'OI Δ 24h %', icon: '📊', path: 'raw.OI.oiChange24h', operators: ['>', '<', 'ABS>'], defaultThreshold: 10.0, description: 'OI change 24 hours' },

    OI_VOL_TREND_5M: { category: 'OI', name: 'OI Vol Trend 5m', icon: '📈', path: 'raw.OI.volumeTrend5m', operators: ['>', '<'], defaultThreshold: 10, description: 'OI volume trend 5 min' },
    OI_VOL_TREND_15M: { category: 'OI', name: 'OI Vol Trend 15m', icon: '📈', path: 'raw.OI.volumeTrend15m', operators: ['>', '<'], defaultThreshold: 20, description: 'OI volume trend 15 min' },

    OI_NET_SCORE: { category: 'OI', name: 'OI Net Score', icon: '🎯', path: 'raw.OI.netScore', operators: ['>', '<', 'ABS>'], defaultThreshold: 10, description: 'OI sentiment score' },
    OI_TIER: { category: 'OI', name: 'OI Tier', icon: '🏆', path: 'raw.OI.tier', operators: ['==', '<=', '>='], defaultThreshold: 3, description: 'OI tier (1=Large Cap, 2=Mid Cap, 3=Small Cap)' },
    OI_DIRECTION: { category: 'OI', name: 'OI Direction', icon: '🧭', path: 'raw.OI.marketDirection', operators: ['==', '!='], defaultThreshold: 'BULLISH', valueType: 'select', options: ['BULLISH', 'BEARISH', 'NEUTRAL', 'SIDEWAYS'], description: 'OI-based direction' },

    OI_BULL: { category: 'OI', name: 'Bull Score', icon: '🟢', path: 'raw.OI.bullScore', operators: ['>', '<', '>='], defaultThreshold: 15, description: 'OI Bullish intensity' },
    OI_BEAR: { category: 'OI', name: 'Bear Score', icon: '🔴', path: 'raw.OI.bearScore', operators: ['>', '<', '>='], defaultThreshold: 15, description: 'OI Bearish intensity' },
    OI_signalScore_direction: { category: 'OI', name: 'Signal Score Direction', icon: '🧭', path: 'raw.OI.signalScore.direction', operators: ['==', '!='], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ["BULL", "BEAR", "NEUTRAL"], description: 'OI-based signal score direction' },
    OI_isLowVolume: { category: 'OI', name: 'OI Is Low Volume', icon: '🧭', path: 'raw.OI.isLowVolume', operators: ['==', '!='], defaultThreshold: 'TRUE', valueType: 'select', options: ["TRUE", "FALSE"], description: 'OI-based low volume indicator' },
    OI_isVolumeSpike: { category: 'OI', name: 'OI Is Volume Spike', icon: '🧭', path: 'raw.OI.isVolumeSpike', operators: ['==', '!='], defaultThreshold: 'TRUE', valueType: 'select', options: ["TRUE", "FALSE"], description: 'OI-based volume spike indicator' },
};
