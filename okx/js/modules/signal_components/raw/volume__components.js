// Auto-generated file - do not edit by hand
export default {
    // ═══════════════════ VOLUME METRICS ═══════════════════
    VOL_BUY_RATIO_1M: { category: 'VOLUME', name: 'Buy Ratio 1m', icon: '⚖️', path: 'raw.VOL.buy_sell_ratio_1MENIT', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.2, description: 'Buy/Sell ratio 1m' },
    VOL_BUY_RATIO_5M: { category: 'VOLUME', name: 'Buy Ratio 5m', icon: '⚖️', path: 'raw.VOL.buy_sell_ratio_5MENIT', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.2, description: 'Buy/Sell ratio 5m' },
    VOL_BUY_RATIO_15M: { category: 'VOLUME', name: 'Buy Ratio 15m', icon: '⚖️', path: 'raw.VOL.buy_sell_ratio_15MENIT', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.2, description: 'Buy/Sell ratio 15m' },
    VOL_BUY_RATIO_1H: { category: 'VOLUME', name: 'Buy Ratio 1h', icon: '⚖️', path: '_computed.volBuyRatio1h', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.1, computed: true, description: 'Buy/Sell ratio 1h' },

    VOL_SPIKE_1M: { category: 'VOLUME', name: 'Vol Spike 1m', icon: '🚀', path: '_computed.volSpike1m', operators: ['>', '<'], defaultThreshold: 2.0, computed: true, description: 'Volume spike vs hourly avg' },
    VOL_SPIKE_5M: { category: 'VOLUME', name: 'Vol Spike 5m', icon: '🚀', path: '_computed.volSpike5m', operators: ['>', '<'], defaultThreshold: 1.5, computed: true, description: 'Volume spike 5m vs hourly avg' },
    VOL_SPIKE_15M: { category: 'VOLUME', name: 'Vol Spike 15m', icon: '🚀', path: '_computed.volSpike15m', operators: ['>', '<'], defaultThreshold: 1.2, computed: true, description: 'Volume spike 15m vs hourly avg' },
    VOL_SPIKE_1H: { category: 'VOLUME', name: 'Vol Spike 1h', icon: '🚀', path: '_computed.volSpike1h', operators: ['>', '<'], defaultThreshold: 1.1, computed: true, description: 'Volume spike 1h vs hourly avg' },
    VOL_DURABILITY: { category: 'VOLUME', name: 'Vol Durability', icon: '🔋', path: '_computed.volDurability', operators: ['>', '<', '>=', '<='], defaultThreshold: 50, computed: true, description: 'Volume trend sustainability (0-100)' }
};
