// Auto-generated file - do not edit by hand
export default {


    // ═══════════════════ lsrContrarian ═══════════════════
    lsrContrarian_directions: { category: 'SENTIMENT', name: 'lsrContrarian Direction', icon: '↕️', path: 'signals.micro.lsrContrarian.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Contrarian signal direction based on Long/Short Ratio' },
    lsrContrarian_rawValues: { category: 'SENTIMENT', name: 'lsrContrarian Value', icon: '⚖️', path: 'signals.micro.lsrContrarian.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Raw contrarian z-score used for normalization' },
    lsrContrarian_confidences: { category: 'SENTIMENT', name: 'lsrContrarian Confidence', icon: '🎯', path: 'signals.micro.lsrContrarian.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence derived from distance to neutral (0-100)' },


    // ═══════════════════ sentimentAlignment ═══════════════════
    sentimentAlignment_directionss: { category: 'SENTIMENT', name: 'sentimentAlignment Direction', icon: '🧭', path: 'signals.micro.sentimentAlignmentsssss.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Multi-timeframe sentiment alignment signal direction' },
    sentimentAlignment_rawValuess: { category: 'SENTIMENT', name: 'sentimentAlignment Value', icon: '📊', path: 'signals.micro.sentimentAlignmentsssss.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Weighted contrarian z-score across timeframes' },
    sentimentAlignment_confidencess: { category: 'SENTIMENT', name: 'sentimentAlignment Confidence', icon: '🎯', path: 'signals.micro.sentimentAlignmentsssss.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence based on alignment consensus' },
};
