// Auto-generated file - do not edit by hand
export default {
    // ═══════════════════ summary ═══════════════════
    totalSignals: { category: 'SUMMARY', name: 'summarys totalSignals', icon: '🔢', path: 'signals.micro.summarys.totalSignals', operators: ['>', '<'], defaultThreshold: 50, description: 'Total number of individual signals evaluated' },
    buySignals: { category: 'SUMMARY', name: 'summarys buySignals', icon: '📈', path: 'signals.micro.summarys.buySignals', operators: ['>', '<'], defaultThreshold: 50, description: 'Count of signals recommending buy/long' },
    sellSignals: { category: 'SUMMARY', name: 'summarys sellSignals', icon: '📉', path: 'signals.micro.summarys.sellSignals', operators: ['>', '<'], defaultThreshold: 50, description: 'Count of signals recommending sell/short' },
    neutralSignals: { category: 'SUMMARY', name: 'summarys neutralSignals', icon: '➖', path: 'signals.micro.summarys.neutralSignals', operators: ['>', '<'], defaultThreshold: 50, description: 'Count of signals that are neutral' },
    highConfidenceSignals: { category: 'SUMMARY', name: 'summarys highConfidenceSignals', icon: '🎯', path: 'signals.micro.summarys.highConfidenceSignals', operators: ['>', '<'], defaultThreshold: 50, description: 'Count of signals flagged as high confidence' },
    masterAction: { category: 'SUMMARY', name: 'summarys masterAction', icon: '⚖️', path: 'signals.micro.summarys.masterAction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Aggregate master action recommended' },
    masterDirection: { category: 'SUMMARY', name: 'summarys masterDirection', icon: '🧭', path: 'signals.micro.summarys.masterDirection', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Alias for master action direction' },
    masterConfidence: { category: 'SUMMARY', name: 'summarys masterConfidence', icon: '🛡️', path: 'signals.micro.summarys.masterConfidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence score for master recommendation (0-100)' },
    canTrade: { category: 'SUMMARY', name: 'summarys canTrade', icon: '🚦', path: 'signals.micro.summarys.canTrade', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'YES', valueType: 'select', options: ['YES', 'NO'], description: 'Whether the system deems trading allowed' },
};
