// Auto-generated file - do not edit by hand
export default {

    SYN_FLOW_5M: { category: 'SYNTHESIS', name: 'Net Flow 5m', icon: '🌊', path: 'synthesis.flow.net_flow_5MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 5000, description: 'Net capital flow 5m' },
    SYN_FLOW_15M: { category: 'SYNTHESIS', name: 'Net Flow 15m', icon: '🌊', path: 'synthesis.flow.net_flow_15MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 15000, description: 'Net capital flow 15m' },
    SYN_BIAS: { category: 'SYNTHESIS', name: 'Capital Bias', icon: '💰', path: 'synthesis.flow.capital_bias_15MENIT', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'INFLOW', valueType: 'select', options: ['STRONG_INFLOW', 'INFLOW', 'NEUTRAL', 'OUTFLOW', 'STRONG_OUTFLOW'], description: 'Capital flow direction' },
    FLOW_NET_15M: { category: 'SYNTHESIS', name: 'Net Flow 15m', icon: '🌊', path: 'synthesis.flow.net_flow_15MENIT', operators: ['>', '<'], defaultThreshold: 0, description: 'Net USD Flow (15m)' },

    // ═══════════════════ SYNTHESIS ═══════════════════
    SYN_EFF_5M: { category: 'SYNTHESIS', name: 'Efficiency 5m', icon: '📏', path: 'synthesis.efficiency.efficiency_5MENIT', operators: ['>', '<'], defaultThreshold: 1.5, description: 'Movement efficiency' },
    SYN_EFF_15M: { category: 'SYNTHESIS', name: 'Efficiency 15m', icon: '📏', path: 'synthesis.efficiency.efficiency_15MENIT', operators: ['>', '<'], defaultThreshold: 1.5, description: 'Movement efficiency' },
    SYN_CHAR: { category: 'SYNTHESIS', name: 'Character', icon: '🎭', path: 'synthesis.efficiency.character_15MENIT', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'EFFORTLESS', valueType: 'select', options: ['EFFORTLESS_BULL', 'EFFORTLESS_BEAR', 'STRONG_BULL', 'STRONG_BEAR', 'STRUGGLING', 'CHOPPY', 'NORMAL'], description: 'Market character' },
    SYN_VEL_5M: { category: 'SYNTHESIS', name: 'Velocity 5m', icon: '🏎️', path: 'synthesis.momentum.velocity_5MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 3000, description: 'Price momentum' },
    SYN_VEL_15M: { category: 'SYNTHESIS', name: 'Velocity 15m', icon: '🏎️', path: 'synthesis.momentum.velocity_15MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 5000, description: 'Price momentum' },
    SYN_AGGR: { category: 'SYNTHESIS', name: 'Aggression', icon: '👊', path: 'synthesis.momentum.aggression_level_15MENIT', operators: ['==', '!='], defaultThreshold: 'INSTITUTIONAL', valueType: 'select', options: ['RETAIL', 'MODERATE', 'INSTITUTIONAL', 'WHALE'], description: 'Participant type' },

    
    // ═══════════════════ SYNTHESIS (Flow/Eff) ═══════════════════

    EFF_SCORE: { category: 'SYNTHESIS', name: 'Efficiency', icon: '⚙️', path: 'synthesis.efficiency.efficiency_15MENIT', operators: ['>', '<'], defaultThreshold: 50, description: 'Price Efficiency Score' },

    SYN_SMART_DIV: { category: 'SYNTHESIS', name: 'Smart Money Div', icon: '🧠', path: 'signals.micro.smartMoney.normalizedScore', operators: ['>', '<'], defaultThreshold: 60, description: 'Whale vs Retail divergence' },



};
