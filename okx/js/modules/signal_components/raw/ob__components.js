// Auto-generated file - do not edit by hand
export default {
// ═══════════════════ ORDERBOOK ═══════════════════
    OB_SPREAD: { category: 'OB', name: 'Spread (Bps)', icon: '↔️', path: 'raw.ORDERBOOK.spreadBps', operators: ['>', '<'], defaultThreshold: 5, description: 'Bid-Ask Spread in Basis Points' },
    OB_IMBALANCE: { category: 'OB', name: 'OB Imbalance', icon: '⚖️', path: 'raw.ORDERBOOK.imbalance', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.2, description: 'Bid/Ask Imbalance (-1 to 1)' },
    OB_DEPTH_RATIO: { category: 'OB', name: 'Depth Ratio', icon: '🧱', path: 'raw.ORDERBOOK.depthRatio', operators: ['>', '<'], defaultThreshold: 1.0, description: 'Bid Depth / Ask Depth' },
    OB_WALL_DETECTED: { category: 'OB', name: 'Wall Detected', icon: '🚧', path: 'raw.ORDERBOOK.wallDetected', operators: ['=='], defaultThreshold: true, valueType: 'boolean', description: 'Large liquidity wall present' },


};
