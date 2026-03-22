// Auto-generated file - do not edit by hand
export default {


    // ═══════════════════ oiDivergence ═══════════════════
    oiDivergence_directions: { category: 'DERIVATIVES', name: 'oiDivergence Direction', icon: '↕️', path: 'signals.micro.oiDivergence.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'LONG', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Derived directional signal (LONG/SHORT/NEUTRAL)' },
    oiDivergence_rawValues: { category: 'DERIVATIVES', name: 'oiDivergence Value', icon: '📊', path: 'signals.micro.oiDivergence.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Raw OI divergence score mapped to 0-100' },
    oiDivergence_confidences: { category: 'DERIVATIVES', name: 'oiDivergence Confidence', icon: '🎯', path: 'signals.micro.oiDivergence.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },

    // ═══════════════════ liquidationCascade ═══════════════════
    liquidationCascade_directions: { category: 'DERIVATIVES', name: 'liquidationCascade Direction', icon: '💥', path: 'signals.micro.liquidationCascadess.direction', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'LONG', valueType: 'select', options: ['LONG', 'SHORT', 'NEUTRAL'], description: 'Contrarian signal direction from liquidation cascades' },
    liquidationCascade_rawValues: { category: 'DERIVATIVES', name: 'liquidationCascade Value', icon: '🔥', path: 'signals.micro.liquidationCascadess.rawValue', operators: ['>', '<'], defaultThreshold: 50, description: 'Cascade risk score (0-10)' },
    liquidationCascade_confidences: { category: 'DERIVATIVES', name: 'liquidationCascade Confidence', icon: '🎯', path: 'signals.micro.liquidationCascadess.confidence', operators: ['>', '<'], defaultThreshold: 50, description: 'Confidence level (0-100)' },

};
