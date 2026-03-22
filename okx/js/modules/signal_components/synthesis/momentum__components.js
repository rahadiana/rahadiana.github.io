// Auto-generated file - do not edit by hand
export default {

    SYNTHESIS_MOMENTUM_VELOCITY_1MENIT: {
        category: 'MOMENTUM',
        name: 'Velocity 1m',
        icon: '🏎️',
        path: 'synthesis.momentum.velocity_1MENIT',
        operators: ['>', '<'],
        defaultThreshold: 0,
        description: 'Price momentum velocity (1m)'
    },
    SYNTHESIS_MOMENTUM_AGGRESSION_LEVEL_1MENIT: {
        category: 'MOMENTUM',
        name: 'Aggression level 1m',
        icon: '👊',
        path: 'synthesis.momentum.aggression_level_1MENIT',
        operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'ACTIVE', valueType: 'select', options: ['INSTITUTIONAL', 'ACTIVE', 'RETAIL'],
        description: 'Participant aggression type (1m)'
    },
    SYNTHESIS_MOMENTUM_AGGRESSION_LEVEL_5MENIT: {
        category: 'MOMENTUM',
        name: 'Aggression level 5m',
        icon: '👊',
        path: 'synthesis.momentum.aggression_level_5MENIT',
        operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'ACTIVE', valueType: 'select', options: ['INSTITUTIONAL', 'ACTIVE', 'RETAIL'],
        description: 'Participant aggression type (5m)'
    },
    SYNTHESIS_MOMENTUM_VELOCITY_1JAM: {
        category: 'MOMENTUM',
        name: 'Velocity 1h',
        icon: '🏎️',
        path: 'synthesis.momentum.velocity_1JAM',
        operators: ['>', '<'],
        defaultThreshold: 0,
        description: 'Price momentum velocity (1h)'
    },
    SYNTHESIS_MOMENTUM_AGGRESSION_LEVEL_1JAM: {
        category: 'MOMENTUM',
        name: 'Aggression level 1h',
        icon: '👊',
        path: 'synthesis.momentum.aggression_level_1JAM',
        operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'ACTIVE', valueType: 'select', options: ['INSTITUTIONAL', 'ACTIVE', 'RETAIL'],
        description: 'Participant aggression type (1h)'
    },
    SYNTHESIS_MOMENTUM_ISAGGRESSIVE: {
        category: 'MOMENTUM',
        name: 'Is Aggressive',
        icon: '🚨',
        path: 'synthesis.momentum.isAggressive',
        operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NO', valueType: 'select', options: ['NO', 'YES'],
        description: 'Is aggressive flag representing if current flow is highly aggressive'
    },
};
