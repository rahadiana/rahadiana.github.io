// Auto-generated file - do not edit by hand
export default {


    // ═══════════════════ liquiditySweep ═══════════════════
    liquiditySweep_directions: { category: 'INSTITUTIONAL', name: 'liquiditySweep Direction', icon: '↕️', path: 'signals.micro.liquiditySweeps.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Suggested trade direction following liquidity sweep' },
    liquiditySweep_rawValues: { category: 'INSTITUTIONAL', name: 'liquiditySweep Value', icon: '🌊', path: 'signals.micro.liquiditySweeps.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Raw score computed for the detected sweep' },
    liquiditySweep_confidences: { category: 'INSTITUTIONAL', name: 'liquiditySweep Confidence', icon: '🎯', path: 'signals.micro.liquiditySweeps.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence derived from score distance to neutral (0-100)' },


    // ═══════════════════ fvg ═══════════════════
    fvg_directionss: { category: 'INSTITUTIONAL', name: 'fvg Direction', icon: '↕️', path: 'signals.micro.fvg.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Recommended market direction derived from Fair Value Gap' },
    fvg_rawValuess: { category: 'INSTITUTIONAL', name: 'fvg Value', icon: '🕳️', path: 'signals.micro.fvg.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Internal raw score produced by the FVG detector' },
    fvg_confidencess: { category: 'INSTITUTIONAL', name: 'fvg Confidence', icon: '🎯', path: 'signals.micro.fvg.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Estimated confidence assigned by adaptive weighting' },
};
