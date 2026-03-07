// Auto-generated file - do not edit by hand
export default {

    SYN_FLOW_5M: { category: 'FLOW', name: 'Net Flow 5m', icon: '🌊', path: 'synthesis.flow.net_flow_5MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 5000, description: 'Net capital flow 5m' },
    SYN_FLOW_15M: { category: 'FLOW', name: 'Net Flow 15m', icon: '🌊', path: 'synthesis.flow.net_flow_15MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 15000, description: 'Net capital flow 15m' },
    SYN_BIAS: { category: 'FLOW', name: 'Capital Bias', icon: '💰', path: 'synthesis.flow.capital_bias_15MENIT', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'INFLOW', valueType: 'select', options: ['STRONG_INFLOW', 'INFLOW', 'NEUTRAL', 'OUTFLOW', 'STRONG_OUTFLOW'], description: 'Capital flow direction' },
    FLOW_NET_15M: { category: 'FLOW', name: 'Net Flow 15m', icon: '🌊', path: 'synthesis.flow.net_flow_15MENIT', operators: ['>', '<'], defaultThreshold: 0, description: 'Net USD Flow (15m)' },

    // ═══════════════════ SYNTHESIS ═══════════════════
    SYN_EFF_5M: { category: 'FLOW', name: 'Efficiency 5m', icon: '📏', path: 'synthesis.efficiency.efficiency_5MENIT', operators: ['>', '<'], defaultThreshold: 1.5, description: 'Movement efficiency' },
    SYN_EFF_15M: { category: 'FLOW', name: 'Efficiency 15m', icon: '📏', path: 'synthesis.efficiency.efficiency_15MENIT', operators: ['>', '<'], defaultThreshold: 1.5, description: 'Movement efficiency' },
    SYN_CHAR: { category: 'FLOW', name: 'Character', icon: '🎭', path: 'synthesis.efficiency.character_15MENIT', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'EFFORTLESS', valueType: 'select', options: ['EFFORTLESS_BULL', 'EFFORTLESS_BEAR', 'STRONG_BULL', 'STRONG_BEAR', 'STRUGGLING', 'CHOPPY', 'NORMAL'], description: 'Market character' },
    SYN_VEL_5M: { category: 'FLOW', name: 'Velocity 5m', icon: '🏎️', path: 'synthesis.momentum.velocity_5MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 3000, description: 'Price momentum' },
    SYN_VEL_15M: { category: 'FLOW', name: 'Velocity 15m', icon: '🏎️', path: 'synthesis.momentum.velocity_15MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 5000, description: 'Price momentum' },
    SYN_AGGR: { category: 'FLOW', name: 'Aggression', icon: '👊', path: 'synthesis.momentum.aggression_level_15MENIT', operators: ['==', '!='], defaultThreshold: 'INSTITUTIONAL', valueType: 'select', options: ['RETAIL', 'MODERATE', 'INSTITUTIONAL', 'WHALE'], description: 'Participant type' },

    // ═══════════════════ SYNTHESIS (Flow/Eff) ═══════════════════
    EFF_SCORE: { category: 'FLOW', name: 'Efficiency', icon: '⚙️', path: 'synthesis.efficiency.efficiency_15MENIT', operators: ['>', '<'], defaultThreshold: 50, description: 'Price Efficiency Score' },
    SYN_SMART_DIV: { category: 'FLOW', name: 'Smart Money Div', icon: '🧠', path: 'signals.micro.smartMoney.normalizedScore', operators: ['>', '<'], defaultThreshold: 60, description: 'Whale vs Retail divergence' },


    SYNTHESIS_FLOW_NET_FLOW_1MENIT: {
        "category": 'FLOW',
        "name": "Net flow 1 M E N I T",
        "icon": "📊",
        "path": "synthesis.flow.net_flow_1MENIT",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Net_flow_1 M E N I T"
    },
    SYNTHESIS_FLOW_CAPITAL_BIAS_1MENIT: {
        "category": 'FLOW',
        "name": "Capital bias 1 M E N I T",
        "icon": "📊",
        "path": "synthesis.flow.capital_bias_1MENIT",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Capital_bias_1 M E N I T"
    },
    SYNTHESIS_FLOW_CAPITAL_BIAS_5MENIT: {
        "category": 'FLOW',
        "name": "Capital bias 5 M E N I T",
        "icon": "📊",
        "path": "synthesis.flow.capital_bias_5MENIT",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Capital_bias_5 M E N I T"
    },
    SYNTHESIS_FLOW_NET_FLOW_1JAM: {
        "category": 'FLOW',
        "name": "Net flow 1 J A M",
        "icon": "📊",
        "path": "synthesis.flow.net_flow_1JAM",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Net_flow_1 J A M"
    },
    SYNTHESIS_FLOW_CAPITAL_BIAS_1JAM: {
        "category": 'FLOW',
        "name": "Capital bias 1 J A M",
        "icon": "📊",
        "path": "synthesis.flow.capital_bias_1JAM",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Capital_bias_1 J A M"
    },
    SYNTHESIS_FLOW_NET_FLOW_24JAM: {
        "category": 'FLOW',
        "name": "Net flow 24 J A M",
        "icon": "📊",
        "path": "synthesis.flow.net_flow_24JAM",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Net_flow_24 J A M"
    },
    SYNTHESIS_FLOW_CAPITAL_BIAS_24JAM: {
        "category": 'FLOW',
        "name": "Capital bias 24 J A M",
        "icon": "📊",
        "path": "synthesis.flow.capital_bias_24JAM",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Capital_bias_24 J A M"
    },
    SYNTHESIS_FLOW_DOMINANTFLOW: {
        "category": 'FLOW',
        "name": "Dominant Flow",
        "icon": "📊",
        "path": "synthesis.flow.dominantFlow",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Dominant Flow"
    },

};
