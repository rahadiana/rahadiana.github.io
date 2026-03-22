// Auto-generated file - do not edit by hand
export default {


    // ═══════════════════ VPIN ═══════════════════
    vpin_direction: { category: 'MICROSTRUCTURE', name: 'VPIN Direction', icon: '↕️', path: 'signals.micro.vpin.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Signal direction derived from VPIN score' },
    vpin_rawValue: { category: 'MICROSTRUCTURE', name: 'VPIN Value', icon: '⚖️', path: 'signals.micro.vpin.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Raw VPIN value indicating volume toxicity' },
    vpin_confidence: { category: 'MICROSTRUCTURE', name: 'VPIN Confidence', icon: '🎯', path: 'signals.micro.vpin.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },

    // ═══════════════════ kyleLambda ═══════════════════
    kyleLambda_direction: { category: 'MICROSTRUCTURE', name: 'kyleLambda Direction', icon: '↕️', path: 'signals.micro.kyleLambda.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Signal direction derived from Kyle Lambda score' },
    kyleLambda_rawValue: { category: 'MICROSTRUCTURE', name: 'kyleLambda Value', icon: '📈', path: 'signals.micro.kyleLambda.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Scaled Kyle Lambda (price impact per unit relative volume)' },
    kyleLambda_confidence: { category: 'MICROSTRUCTURE', name: 'kyleLambda Confidence', icon: '🎯', path: 'signals.micro.kyleLambda.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },

    // ═══════════════════ VWOI ═══════════════════
    VWOI_direction: { category: 'MICROSTRUCTURE', name: 'VWOI Direction', icon: '↕️', path: 'signals.micro.vwoi.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Signal direction derived from VWOI imbalance' },
    VWOI_rawValue: { category: 'MICROSTRUCTURE', name: 'VWOI Value', icon: '⚖️', path: 'signals.micro.vwoi.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Raw VWOI imbalance (-1 to 1)' },
    VWOI_confidence: { category: 'MICROSTRUCTURE', name: 'VWOI Confidence', icon: '🎯', path: 'signals.micro.vwoi.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },

    // ═══════════════════ volumeFreqDivergence ═══════════════════
    VOLUMEFREQDIVERGENCE_direction: { category: 'MICROSTRUCTURE', name: 'VOLUMEFREQDIVERGENCE Direction', icon: '↕️', path: 'signals.micro.volumeFreqDivergence.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'LONG', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Signal direction derived from divergence score' },
    VOLUMEFREQDIVERGENCE_rawValue: { category: 'MICROSTRUCTURE', name: 'VOLUMEFREQDIVERGENCE Value', icon: '🐋', path: 'signals.micro.volumeFreqDivergence.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Divergence score representing Whale activity' },
    VOLUMEFREQDIVERGENCE_confidence: { category: 'MICROSTRUCTURE', name: 'VOLUMEFREQDIVERGENCE Confidence', icon: '🎯', path: 'signals.micro.volumeFreqDivergence.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },

    // ═══════════════════ ACCUMSCORE ═══════════════════
    ACCUMSCORE_direction: { category: 'MICROSTRUCTURE', name: 'ACCUMSCORE Direction', icon: '↕️', path: 'signals.micro.accumScore.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Signal direction derived from accumulation score' },
    ACCUMSCORE_rawValue: { category: 'MICROSTRUCTURE', name: 'ACCUMSCORE Value', icon: '📦', path: 'signals.micro.accumScore.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Multi-timeframe accumulation score (0-100)' },
    ACCUMSCORE_confidence: { category: 'MICROSTRUCTURE', name: 'ACCUMSCORE Confidence', icon: '🎯', path: 'signals.micro.accumScore.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },

};
