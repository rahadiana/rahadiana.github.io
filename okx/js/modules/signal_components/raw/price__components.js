// Auto-generated file - do not edit by hand
export default {
    // ═══════════════════ PRICE METRICS ═══════════════════
    PRICE_CURRENT: { category: 'PRICE', name: 'Current Price', icon: '💲', path: 'raw.PRICE.last', operators: ['>', '<', '>=', '<='], defaultThreshold: 100, description: 'Current market price' },
    PRICE_CHANGE_1M: { category: 'PRICE', name: 'Price Δ 1m', icon: '📈', path: 'raw.PRICE.percent_change_1MENIT', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 0.2, description: 'Price % change 1 min' },
    PRICE_CHANGE_5M: { category: 'PRICE', name: 'Price Δ 5m', icon: '📈', path: 'raw.PRICE.percent_change_5MENIT', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 0.5, description: 'Price % change 5 min' },
    PRICE_CHANGE_10M: { category: 'PRICE', name: 'Price Δ 10m', icon: '📈', path: 'raw.PRICE.percent_change_10MENIT', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 0.5, description: 'Price % change 10 min' },
    PRICE_CHANGE_15M: { category: 'PRICE', name: 'Price Δ 15m', icon: '📈', path: 'raw.PRICE.percent_change_15MENIT', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 1.0, description: 'Price % change 15 min' },
    PRICE_CHANGE_20M: { category: 'PRICE', name: 'Price Δ 20m', icon: '📈', path: 'raw.PRICE.percent_change_20MENIT', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 1.0, description: 'Price % change 20 min' },
    PRICE_CHANGE_30M: { category: 'PRICE', name: 'Price Δ 30m', icon: '📈', path: 'raw.PRICE.percent_change_30MENIT', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 1.0, description: 'Price % change 30 min' },
    PRICE_CHANGE_1H: { category: 'PRICE', name: 'Price Δ 1h', icon: '📈', path: 'raw.PRICE.percent_change_1JAM', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 2.0, description: 'Price % change 1 hour' },
    PRICE_CHANGE_2H: { category: 'PRICE', name: 'Price Δ 2h', icon: '📈', path: 'raw.PRICE.percent_change_2JAM', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 2.0, description: 'Price % change 2 hours' },
    PRICE_CHANGE_24H: { category: 'PRICE', name: 'Price Δ 24h', icon: '📈', path: 'raw.PRICE.percent_change_24JAM', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 5.0, description: 'Price % change 24h' },
    PRICE_FROM_HIGH: { category: 'PRICE', name: 'From 24h High', icon: '🔺', path: 'raw.PRICE.percent_change_from_top', operators: ['>', '<'], defaultThreshold: -5, description: 'Distance from 24h high' },
    PRICE_FROM_LOW: { category: 'PRICE', name: 'From 24h Low', icon: '🔻', path: 'raw.PRICE.percent_change_from_bottom', operators: ['>', '<'], defaultThreshold: 5, description: 'Distance from 24h low' },
    // 3. PRICE CONTEXT
    PRICE_RANGE_24H: { category: 'PRICE', name: '24h Range %', icon: '📊', path: '_computed.range24h', operators: ['>', '<'], defaultThreshold: 80, description: 'Position in 24h range (0=Low, 100=High)' },
    IS_DISCOUNT: { category: 'PRICE', name: 'Deep Discount', icon: '🏷️', path: '_computed.isDiscount', operators: ['=='], defaultThreshold: true, valueType: 'boolean', description: 'Price >10% below 24h High' },
    PRICE_RANGE_24H: { category: 'PRICE', name: '24h Range %', icon: '📏', path: '_computed.range24h', operators: ['>', '<'], defaultThreshold: 5.0, computed: true, description: 'Price volatility range' },

};
