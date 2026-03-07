
// Auto-generated file - do not edit by hand
export default {

    // // ═══════════════════ BTC CORRELATION / BENCHMARK ═══════════════════
    BTC_CHANGE_1M: { category: 'BTC', name: 'BTC Δ 1m', icon: '₿', path: '_computed.btcChange1m', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.1, computed: true, description: 'BTC price change 1m' },
    BTC_CHANGE_5M: { category: 'BTC', name: 'BTC Δ 5m', icon: '₿', path: '_computed.btcChange5m', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.3, computed: true, description: 'BTC price change 5m' },
    BTC_CHANGE_15M: { category: 'BTC', name: 'BTC Δ 15m', icon: '₿', path: '_computed.btcChange15m', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.5, computed: true, description: 'BTC price change 15m' },
    BTC_CHANGE_1H: { category: 'BTC', name: 'BTC Δ 1h', icon: '₿', path: '_computed.btcChange1h', operators: ['>', '<', 'ABS>'], defaultThreshold: 1.0, computed: true, description: 'BTC price change 1h' },
    BTC_DIRECTION: { category: 'BTC', name: 'BTC Direction', icon: '🧭', path: '_computed.btcDirection', operators: ['==', '!='], defaultThreshold: 'UP', valueType: 'select', options: ['UP', 'DOWN', 'FLAT'], computed: true, description: 'BTC current direction' },
    BTC_FOLLOWS: { category: 'BTC', name: 'Follows BTC', icon: '🔗', path: '_computed.btcFollows', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Coin following BTC move' },
    BTC_DIVERGES: { category: 'BTC', name: 'Diverges BTC', icon: '↔️', path: '_computed.btcDiverges', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Coin diverging from BTC' },
    BTC_BETA: { category: 'BTC', name: 'BTC Beta', icon: '📊', path: '_computed.btcBeta', operators: ['>', '<'], defaultThreshold: 1.0, computed: true, description: 'Move ratio vs BTC (>1 = outperform)' },
    BTC_OUTPERFORM: { category: 'BTC', name: 'Outperforms BTC', icon: '🚀', path: '_computed.btcOutperform', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Coin outperforming BTC' },

    // // ═══════════════════ BTC CORRELATION ═══════════════════
    BTC_BETA: { category: 'BTC', name: 'BTC Beta', icon: '🔗', path: '_computed.btcBeta', operators: ['>', '<'], defaultThreshold: 1.0, computed: true, description: 'Volatility vs BTC' },
    BTC_DIVERGENCE: { category: 'BTC', name: 'BTC Divergence', icon: '🔀', path: '_computed.btcDiverges', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Moving opposite to BTC' },
    BTC_OUTPERFORM: { category: 'BTC', name: 'Outperforming', icon: '🚀', path: '_computed.btcOutperform', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Stronger move than BTC' },
    BTC_CORR: { category: 'BTC', name: 'Pearson Correlation', icon: '📊', path: 'analytics.correlation.correlation', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.8, description: 'Correlation to BTC (-1 to 1)' },

};
