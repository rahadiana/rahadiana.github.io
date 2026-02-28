// Auto-generated file - do not edit by hand
export default {

    // ═══════════════════ OPEN INTEREST ═══════════════════
    OI_VALUE: { category: 'OI', name: 'OI Value ($)', icon: '🔄', path: 'raw.OI.openInterest', operators: ['>', '<'], defaultThreshold: 10000000, description: 'Total open interest' },
    OI_CHANGE_5M: { category: 'OI', name: 'OI Δ 5m %', icon: '📊', path: 'raw.OI.oiChange5m', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.5, description: 'OI change 5 min' },
    OI_CHANGE_10M: { category: 'OI', name: 'OI Δ 10m %', icon: '📊', path: 'raw.OI.oiChange10m', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.8, description: 'OI change 10 min' },
    OI_CHANGE_15M: { category: 'OI', name: 'OI Δ 15m %', icon: '📊', path: 'raw.OI.oiChange15m', operators: ['>', '<', 'ABS>'], defaultThreshold: 1.0, description: 'OI change 15 min' },
    OI_CHANGE_1H: { category: 'OI', name: 'OI Δ 1h %', icon: '📊', path: 'raw.OI.oiChange1h', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'OI change 1 hour' },
    OI_CHANGE_4H: { category: 'OI', name: 'OI Δ 4h %', icon: '📊', path: 'raw.OI.oiChange4h', operators: ['>', '<', 'ABS>'], defaultThreshold: 5.0, description: 'OI change 4 hours' },
    OI_CHANGE_24H: { category: 'OI', name: 'OI Δ 24h %', icon: '📊', path: 'raw.OI.oiChange24h', operators: ['>', '<', 'ABS>'], defaultThreshold: 10.0, description: 'OI change 24 hours' },
    // OI_VOLUME_5M: { category: 'OI', name: 'OI Vol 5m', icon: '📈', path: 'raw.OI.oiVolume5m', operators: ['>', '<'], defaultThreshold: 1000, description: 'OI volume 5 min' },
    // OI_VOLUME_10M: { category: 'OI', name: 'OI Vol 10m', icon: '📈', path: 'raw.OI.oiVolume10m', operators: ['>', '<'], defaultThreshold: 2000, description: 'OI volume 10 min' },
    // OI_VOLUME_15M: { category: 'OI', name: 'OI Vol 15m', icon: '📈', path: 'raw.OI.oiVolume15m', operators: ['>', '<'], defaultThreshold: 3000, description: 'OI volume 15 min' },
    // OI_VOLUME_1H: { category: 'OI', name: 'OI Vol 1h', icon: '📈', path: 'raw.OI.oiVolume1h', operators: ['>', '<'], defaultThreshold: 5000, description: 'OI volume 1 hour' },
    OI_VOL_TREND_5M: { category: 'OI', name: 'OI Vol Trend 5m', icon: '📈', path: 'raw.OI.volumeTrend5m', operators: ['>', '<'], defaultThreshold: 10, description: 'OI volume trend 5 min' },
    OI_VOL_TREND_15M: { category: 'OI', name: 'OI Vol Trend 15m', icon: '📈', path: 'raw.OI.volumeTrend15m', operators: ['>', '<'], defaultThreshold: 20, description: 'OI volume trend 15 min' },
    OI_NET_SCORE: { category: 'OI', name: 'OI Net Score', icon: '🎯', path: 'raw.OI.netScore', operators: ['>', '<', 'ABS>'], defaultThreshold: 10, description: 'OI sentiment score' },
    OI_TIER: { category: 'OI', name: 'OI Tier', icon: '🏆', path: 'raw.OI.tier', operators: ['==', '<=', '>='], defaultThreshold: 1, description: 'OI tier (1=Large Cap)' },
    OI_DIRECTION: { category: 'OI', name: 'OI Direction', icon: '🧭', path: 'raw.OI.marketDirection', operators: ['==', '!='], defaultThreshold: 'BULLISH', valueType: 'select', options: ['BULLISH', 'BEARISH', 'NEUTRAL', 'SIDEWAYS'], description: 'OI-based direction' },
    OI_BULL: { category: 'OI', name: 'Bull Score', icon: '🟢', path: 'raw.OI.bullScore', operators: ['>', '<', '>='], defaultThreshold: 15, description: 'OI Bullish intensity' },
    OI_BEAR: { category: 'OI', name: 'Bear Score', icon: '🔴', path: 'raw.OI.bearScore', operators: ['>', '<', '>='], defaultThreshold: 15, description: 'OI Bearish intensity' },

};
