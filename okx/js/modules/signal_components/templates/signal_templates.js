// Preset Templates
export default {
    // ═══════════════════ SCALPING ═══════════════════
    SCALP_AGGRESSIVE: { name: '⚡ Scalp Aggressive', description: 'Fast scalping with vol + OB Imbalance', conditions: [{ component: 'VOL_SPIKE_1M', operator: '>', value: 2.0, weight: 2 }, { component: 'OB_IMBALANCE', operator: 'ABS>', value: 0.3, weight: 1.5 }, { component: 'MICRO_VPIN', operator: '>', value: 0.5, weight: 1 }, { component: 'VOL_DURABILITY', operator: '>', value: 60, weight: 1 }], logic: 'WEIGHTED', minScore: 65, cooldown: 60 },

};
