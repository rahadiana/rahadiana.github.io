// Auto-generated file - do not edit by hand
export default {

    // ═══════════════════ FUNDING RATE ═══════════════════
    FUNDING_RATE: { category: 'FUNDING', name: 'Funding Rate', icon: '💰', path: 'raw.FUNDING.fundingRate', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.0001, description: 'Current funding rate' },
    FUNDING_APY: { category: 'FUNDING', name: 'Funding APY %', icon: '📈', path: '_computed.fundingApy', operators: ['>', '<', 'ABS>'], defaultThreshold: 10, computed: true, description: 'Annualized funding' },
    FUNDING_ZSCORE: { category: 'FUNDING', name: 'Funding Z-Score', icon: '📉', path: 'raw.FUNDING.zScore', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'Funding deviation' },
    FUNDING_BIAS: { category: 'FUNDING', name: 'Funding Bias', icon: '🎯', path: 'raw.FUNDING.marketBias', operators: ['==', '!='], defaultThreshold: 'BULLISH', valueType: 'select', options: ['BULLISH', 'BEARISH', 'NEUTRAL', 'EXTREME_BULL', 'EXTREME_BEAR'], description: 'Funding sentiment' },

};
