// Auto-generated file - do not edit by hand

export default {

    // ═══════════════════ orderbook ═══════════════════

    ofi_score: { category: 'ORDERBOOK', name: 'ofi_score Value', icon: '📊', path: 'signals.orderbook.ofi_score', operators: ['>', '<'], defaultThreshold: 50, description: 'Order Flow Imbalance score component' },
    ofi_direction: { category: 'ORDERBOOK', name: 'ofi_direction Value', icon: '↕️', path: 'signals.orderbook.ofi_direction', operators: ['>', '<'], defaultThreshold: 50, description: 'Directional bias implied by OFI' },
    ofi_confidence: { category: 'ORDERBOOK', name: 'ofi_confidence Value', icon: '🎯', path: 'signals.orderbook.ofi_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },
    depthImbalance_score: { category: 'ORDERBOOK', name: 'depthImbalance_score Value', icon: '📊', path: 'signals.orderbook.depthImbalance_score', operators: ['>', '<'], defaultThreshold: 50, description: 'Orderbook Depth Imbalance score component' },
    depthImbalance_direction: { category: 'ORDERBOOK', name: 'depthImbalance_direction Value', icon: '↕️', path: 'signals.orderbook.depthImbalance_direction', operators: ['>', '<'], defaultThreshold: 50, description: 'Directional bias implied by Depth Imbalance' },
    depthImbalance_confidence: { category: 'ORDERBOOK', name: 'depthImbalance_confidence Value', icon: '🎯', path: 'signals.orderbook.depthImbalance_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },
    liquidityStress_score: { category: 'ORDERBOOK', name: 'liquidityStress_score Value', icon: '📉', path: 'signals.orderbook.liquidityStress_score', operators: ['>', '<'], defaultThreshold: 50, description: 'Liquidity Stress score component' },
    liquidityStress_direction: { category: 'ORDERBOOK', name: 'liquidityStress_direction Value', icon: '↕️', path: 'signals.orderbook.liquidityStress_direction', operators: ['>', '<'], defaultThreshold: 50, description: 'Directional bias implied by Liquidity Stress' },
    liquidityStress_confidence: { category: 'ORDERBOOK', name: 'liquidityStress_confidence Value', icon: '🎯', path: 'signals.orderbook.liquidityStress_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },
    slippageScore_score: { category: 'ORDERBOOK', name: 'slippageScore_score Value', icon: '📉', path: 'signals.orderbook.slippageScore_score', operators: ['>', '<'], defaultThreshold: 50, description: 'Estimated slipping penalty score' },
    slippageScore_direction: { category: 'ORDERBOOK', name: 'slippageScore_direction Value', icon: '↕️', path: 'signals.orderbook.slippageScore_direction', operators: ['>', '<'], defaultThreshold: 50, description: 'Directional bias implied by Slippage Score' },
    slippageScore_confidence: { category: 'ORDERBOOK', name: 'slippageScore_confidence Value', icon: '🎯', path: 'signals.orderbook.slippageScore_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },
    spoofingRisk_score: { category: 'ORDERBOOK', name: 'spoofingRisk_score Value', icon: '⚠️', path: 'signals.orderbook.spoofingRisk_score', operators: ['>', '<'], defaultThreshold: 50, description: 'Estimated risk of spoofing level' },
    spoofingRisk_confidence: { category: 'ORDERBOOK', name: 'spoofingRisk_confidence Value', icon: '🎯', path: 'signals.orderbook.spoofingRisk_confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level of spoofing detection (0-100)' },

};
