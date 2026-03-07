
// Auto-generated file - do not edit by hand
export default {

    // ═══════════════════ META-GUARD ═══════════════════
    GUARD_STATUS: { category: 'GUARD', name: 'Guard Status', icon: '🛡️', path: 'signals.institutional_guard.meta_guard_status', operators: ['==', '!='], defaultThreshold: 'ALLOW', valueType: 'select', options: ['ALLOW', 'DOWNGRADE', 'BLOCK', 'SCANNING'], description: 'Meta-Guard execution status' },
    GUARD_ALLOWED: { category: 'GUARD', name: 'Execution Allowed', icon: '✅', path: 'signals.institutional_guard.execution_allowed', operators: ['=='], defaultThreshold: true, valueType: 'boolean', description: 'Is execution allowed?' },
    GUARD_CONF_ADJ: { category: 'GUARD', name: 'Confidence Adjustment', icon: '📉', path: 'signals.institutional_guard.confidence_adjustment', operators: ['>', '<', '>=', '<='], defaultThreshold: 0, description: 'Guard confidence modifier' },
    GUARD_NOISE: { category: 'GUARD', name: 'Noise Level', icon: '📢', path: 'signals.institutional_guard.noise_level', operators: ['==', '!='], defaultThreshold: 'CLEAN', valueType: 'select', options: ['CLEAN', 'NOISY', 'EXTREME'], description: 'Signal noise assessment' },
    GUARD_IVS: { category: 'GUARD', name: 'Institutional Validity', icon: '🏛️', path: 'signals.institutional_guard.ivs_score', operators: ['>', '<', '>='], defaultThreshold: 50, description: 'Institutional Validity Score' },
    GUARD_BLOCK_REASON: { category: 'GUARD', name: 'Block Reason', icon: '🚫', path: 'signals.institutional_guard.block_reason', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: null, valueType: 'select', options: ['NO_POSITIONING', 'HIGH_VOL', 'CAUSALITY_BROKEN', 'CROWD_CONTAMINATION', 'NO_LIQUIDITY', 'SANITY_CHECK_FAILED'], description: 'Reason for blocking execution' },

};
