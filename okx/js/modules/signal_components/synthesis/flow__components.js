// Auto-generated file - do not edit by hand
export default {
    SYNTHESIS_FLOW_NET_FLOW_1MENIT: {
        "category": 'FLOW',
        "name": "Net flow 1m",
        "icon": "🌊",
        "path": "synthesis.flow.net_flow_1MENIT",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Net USD Flow (1m)"
    },
    SYN_FLOW_5M: { category: 'FLOW', name: 'Net Flow 5m', icon: '🌊', path: 'synthesis.flow.net_flow_5MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 5000, description: 'Net capital flow 5m' },

    FLOW_NET_15M: { category: 'FLOW', name: 'Net Flow 15m', icon: '🌊', path: 'synthesis.flow.net_flow_15MENIT', operators: ['>', '<'], defaultThreshold: 0, description: 'Net USD Flow (15m)' },
    SYNTHESIS_FLOW_NET_FLOW_1JAM: {
        "category": 'FLOW',
        "name": "Net flow 1h",
        "icon": "🌊",
        "path": "synthesis.flow.net_flow_1JAM",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Net USD Flow (1h)"
    },
    // SYN_FLOW_15M: { category: 'FLOW', name: 'Net Flow 15m', icon: '🌊', path: 'synthesis.flow.net_flow_15MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 15000, description: 'Net capital flow 15m' },
    SYNTHESIS_FLOW_NET_FLOW_24JAM: {
        "category": 'FLOW',
        "name": "Net flow 24h",
        "icon": "🌊",
        "path": "synthesis.flow.net_flow_24JAM",
        "operators": [
            ">",
            "<"
        ],
        "defaultThreshold": 0,
        "description": "Net USD Flow (24h)"
    },


    // ═══════════════════ SYNTHESIS ═══════════════════
    SYN_VEL_5M: { category: 'FLOW', name: 'Velocity 5m', icon: '🏎️', path: 'synthesis.momentum.velocity_5MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 3000, description: 'Price momentum velocity' },
    SYN_VEL_15M: { category: 'FLOW', name: 'Velocity 15m', icon: '🏎️', path: 'synthesis.momentum.velocity_15MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 5000, description: 'Price momentum velocity' },
    SYN_AGGR: { category: 'FLOW', name: 'Aggression', icon: '👊', path: 'synthesis.momentum.aggression_level_15MENIT', operators: ['==', '!='], defaultThreshold: 'ACTIVE', valueType: 'select', options: ['INSTITUTIONAL', 'ACTIVE', 'RETAIL'], description: 'Participant aggression type' },

    // ═══════════════════ SYNTHESIS (Flow/Eff) ═══════════════════
    SYN_SMART_DIV: { category: 'FLOW', name: 'Smart Money Div', icon: '🧠', path: 'signals.micro.smartMoney.normalizedScore', operators: ['>', '<'], defaultThreshold: 60, description: 'Whale vs Retail divergence' },

    SYNTHESIS_FLOW_CAPITAL_BIAS_1MENIT: {
        "category": 'FLOW',
        "name": "Capital bias 1m",
        "icon": "💰",
        "path": "synthesis.flow.capital_bias_1MENIT",
        "operators": [
            "==",
            "!=",
            "CONTAINS"
        ],
        "defaultThreshold": "ACCUMULATION",
        "valueType": "select",
        "options": ["ACCUMULATION", "DISTRIBUTION"],
        "description": "Capital flow bias (1m)"
    },
    SYNTHESIS_FLOW_CAPITAL_BIAS_5MENIT: {
        "category": 'FLOW',
        "name": "Capital bias 5m",
        "icon": "💰",
        "path": "synthesis.flow.capital_bias_5MENIT",
        "operators": [
            "==",
            "!=",
            "CONTAINS"
        ],
        "defaultThreshold": "ACCUMULATION",
        "valueType": "select",
        "options": ["ACCUMULATION", "DISTRIBUTION"],
        "description": "Capital flow bias (5m)"
    },
    SYNTHESIS_FLOW_CAPITAL_BIAS_15MENIT: { category: 'FLOW', name: 'Capital Bias 15M', icon: '💰', path: 'synthesis.flow.capital_bias_15MENIT', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'ACCUMULATION', valueType: 'select', options: ['ACCUMULATION', 'DISTRIBUTION'], description: 'Capital flow bias (15m)' },

    SYNTHESIS_FLOW_CAPITAL_BIAS_1JAM: {
        "category": 'FLOW',
        "name": "Capital bias 1h",
        "icon": "💰",
        "path": "synthesis.flow.capital_bias_1JAM",
        "operators": [
            "==",
            "!=",
            "CONTAINS"
        ],
        "defaultThreshold": "ACCUMULATION",
        "valueType": "select",
        "options": ["ACCUMULATION", "DISTRIBUTION"],
        "description": "Capital flow bias (1h)"
    },

    SYNTHESIS_FLOW_CAPITAL_BIAS_24JAM: {
        "category": 'FLOW',
        "name": "Capital bias 24h",
        "icon": "💰",
        "path": "synthesis.flow.capital_bias_24JAM",
        "operators": [
            "==",
            "!=",
            "CONTAINS"
        ],
        "defaultThreshold": "ACCUMULATION",
        "valueType": "select",
        "options": ["ACCUMULATION", "DISTRIBUTION"],
        "description": "Capital flow bias (24h)"
    },
    SYNTHESIS_FLOW_DOMINANTFLOW: {
        "category": 'FLOW',
        "name": "Dominant Flow",
        "icon": "🧭",
        "path": "synthesis.flow.dominantFlow",
        "operators": [
            "==",
            "!=",
            "CONTAINS"
        ],
        "defaultThreshold": "BULLISH",
        "valueType": "select",
        "options": ["BULLISH", "BEARISH"],
        "description": "Dominant overall flow direction"
    },

};
