/**
 * View Institutional - Meta-Guard Layer Display
 * 
 * Displays the AI interpretation layers:
 * - SignalInterpreter output
 * - AnalyticsValidator output  
 * - GovernanceValidator output
 * - InstitutionalGuard (Meta-Guard) output
 * 
 * PRINCIPLE: "Meta-Guard tidak membuat uang. Meta-Guard mencegah kehilangan uang."
 */

import * as Utils from '../utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="min-h-full flex flex-col gap-4 p-4 bg-bb-black text-bb-text font-sans">
            
            <!-- META-GUARD STATUS CARD -->
            <div class="bg-bb-panel border-2 rounded-lg p-6 shadow-2xl relative overflow-hidden" id="meta-guard-card">
                <div class="absolute top-0 right-0 p-2">
                    <span class="text-[9px] text-bb-muted uppercase tracking-[0.2em] font-bold">META-GUARD v1.0</span>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="flex flex-col">
                        <span class="text-[10px] text-bb-muted uppercase font-bold tracking-widest mb-1">Guard Status</span>
                        <h1 class="text-5xl font-black italic tracking-tighter" id="mg-status">SCANNING</h1>
                        <span class="text-[11px] text-bb-muted mt-2" id="mg-block-reason"></span>
                    </div>
                    
                    <div class="flex flex-col items-end gap-2">
                        <div class="flex items-center gap-3">
                            <div class="flex flex-col items-center">
                                <span class="text-[8px] text-bb-muted uppercase">Confidence Adj</span>
                                <span class="text-xl font-mono font-black" id="mg-confidence-adj">0</span>
                            </div>
                            <div class="flex flex-col items-center">
                                <span class="text-[8px] text-bb-muted uppercase">Noise Level</span>
                                <span class="text-lg font-mono font-bold" id="mg-noise">--</span>
                            </div>
                        </div>
                        <span class="text-[9px] px-2 py-1 rounded font-bold" id="mg-execution-badge">PENDING</span>
                    </div>
                </div>
            </div>

            <!-- MG CHECKS GRID -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-2" id="mg-checks-grid">
                ${['MG-1: Validity', 'MG-3: Causality', 'MG-4: Volatility', 'MG-5: Crowd', 'MG-6: Liquidity'].map((name, i) => `
                    <div class="bg-bb-panel border border-bb-border rounded p-3 flex flex-col items-center" id="mg-check-${i + 1}">
                        <span class="text-[8px] text-bb-muted uppercase font-bold mb-1">${name}</span>
                        <div class="w-3 h-3 rounded-full bg-bb-border" id="mg-check-${i + 1}-dot"></div>
                        <span class="text-[9px] mt-1 text-white/50" id="mg-check-${i + 1}-msg">--</span>
                    </div>
                `).join('')}
            </div>

            <!-- INTERPRETATION SECTION -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                <!-- AI INTERPRETATION -->
                <div class="bg-bb-panel border border-bb-gold/30 rounded p-4">
                    <div class="flex justify-between items-center border-b border-bb-border/30 pb-2 mb-3">
                        <span class="text-[10px] font-black text-bb-gold uppercase tracking-widest">AI Interpretation</span>
                        <span class="text-[8px] px-1.5 py-0.5 bg-bb-gold/10 text-bb-gold rounded" id="interp-confidence">--</span>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-[9px] text-bb-muted uppercase">Market Bias</span>
                            <span class="text-sm font-black" id="interp-bias">--</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-[9px] text-bb-muted uppercase">Institutional Reading</span>
                            <span class="text-[10px] font-bold text-white" id="interp-reading">--</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-[9px] text-bb-muted uppercase">Timing Quality</span>
                            <span class="text-[10px] font-bold" id="interp-timing">--</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-[9px] text-bb-muted uppercase">Execution Risk</span>
                            <span class="text-[10px] font-bold" id="interp-risk">--</span>
                        </div>
                        
                        <div class="mt-3 p-2 bg-white/5 rounded border border-white/10">
                            <span class="text-[8px] text-bb-muted uppercase block mb-1">Reasoning</span>
                            <p class="text-[10px] text-white/80 leading-relaxed" id="interp-reasoning">--</p>
                        </div>
                    </div>
                </div>

                <!-- GOVERNANCE / ANALYTICS -->
                <div class="bg-bb-panel border border-bb-border rounded p-4">
                    <div class="flex justify-between items-center border-b border-bb-border/30 pb-2 mb-3">
                        <span class="text-[10px] font-black text-bb-blue uppercase tracking-widest">Governance Layer</span>
                        <span class="text-[8px] px-1.5 py-0.5 rounded" id="gov-status-badge">--</span>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex justify-between items-center p-2 bg-white/5 rounded">
                            <span class="text-[9px] text-bb-muted uppercase">Strategy Fit</span>
                            <span class="text-[10px] font-bold text-white" id="gov-strategy-fit">--</span>
                        </div>
                        <div class="flex justify-between items-center p-2 bg-white/5 rounded">
                            <span class="text-[9px] text-bb-muted uppercase">Asset Noise</span>
                            <span class="text-[10px] font-bold" id="gov-noise">--</span>
                        </div>
                        <div class="flex justify-between items-center p-2 bg-white/5 rounded">
                            <span class="text-[9px] text-bb-muted uppercase">Execution Allowed</span>
                            <span class="text-[10px] font-bold" id="gov-execution">--</span>
                        </div>
                        <div class="flex justify-between items-center p-2 bg-white/5 rounded">
                            <span class="text-[9px] text-bb-muted uppercase">Explainability Ready</span>
                            <span class="text-[10px] font-bold" id="gov-explain">--</span>
                        </div>
                    </div>
                    
                    <div class="mt-3" id="gov-warnings">
                        <!-- Warnings injected here -->
                    </div>
                </div>
            </div>

            <!-- ACTIVE ROLES -->
            <div class="bg-bb-panel border border-bb-border rounded p-4">
                <div class="flex justify-between items-center border-b border-bb-border/30 pb-2 mb-3">
                    <span class="text-[10px] font-black text-white uppercase tracking-widest">Active Signal Roles</span>
                    <span class="text-[8px] text-bb-muted">Hierarchy: Positioning → Flow → Crowd → Timing</span>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-6 gap-2" id="active-roles-grid">
                    ${['POSITIONING', 'INFORMED_FLOW', 'CROWD', 'FORCED', 'EXECUTION', 'CONTEXT'].map(role => `
                        <div class="p-2 bg-white/5 rounded border border-white/10 flex flex-col items-center" id="role-${role.toLowerCase()}">
                            <span class="text-[7px] text-bb-muted uppercase">${role.replace('_', ' ')}</span>
                            <span class="text-[10px] font-bold text-white mt-1">--</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- PRINCIPLE FOOTER -->
            <div class="mt-auto p-3 bg-bb-panel/30 border border-bb-gold/20 rounded">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] text-bb-gold italic">"Meta-Guard tidak membuat uang. Meta-Guard mencegah kehilangan uang."</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[8px] text-bb-muted" id="mg-timestamp">--</span>
                    </div>
                </div>
            </div>

        </div>
    `;
}

export function update(data) {
    // Extract layers from data
    const signals = data.signals || {};
    const interpretation = signals.interpretation || data.interpretation || {};
    const analyticsVal = signals.analytics_validation || data.analytics_validation || {};
    const governanceVal = signals.governance_validation || data.governance_validation || {};
    const metaGuard = signals.institutional_guard || data.institutional_guard || {};

    // 1. META-GUARD STATUS CARD
    updateMetaGuardStatus(metaGuard);

    // 2. MG CHECKS GRID
    updateMGChecks(metaGuard);

    // 3. INTERPRETATION
    updateInterpretation(interpretation);

    // 4. GOVERNANCE
    updateGovernance(governanceVal, analyticsVal);

    // 5. ACTIVE ROLES
    updateActiveRoles(interpretation);

    // 6. TIMESTAMP
    const elTimestamp = document.getElementById('mg-timestamp');
    if (elTimestamp) {
        elTimestamp.innerText = `Updated: ${new Date().toLocaleTimeString()}`;
    }
}

function updateMetaGuardStatus(mg) {
    const elCard = document.getElementById('meta-guard-card');
    const elStatus = document.getElementById('mg-status');
    const elBlockReason = document.getElementById('mg-block-reason');
    const elConfAdj = document.getElementById('mg-confidence-adj');
    const elNoise = document.getElementById('mg-noise');
    const elExecBadge = document.getElementById('mg-execution-badge');

    if (!elCard || !elStatus) return;

    const status = mg.meta_guard_status || 'SCANNING';
    elStatus.innerText = status;

    // Style based on status
    elCard.classList.remove('border-bb-green', 'border-bb-red', 'border-bb-gold', 'border-bb-border');
    if (status === 'ALLOW') {
        elStatus.className = 'text-5xl font-black italic tracking-tighter text-bb-green';
        elCard.classList.add('border-bb-green');
    } else if (status === 'BLOCK') {
        elStatus.className = 'text-5xl font-black italic tracking-tighter text-bb-red';
        elCard.classList.add('border-bb-red');
    } else if (status === 'DOWNGRADE') {
        elStatus.className = 'text-5xl font-black italic tracking-tighter text-bb-gold';
        elCard.classList.add('border-bb-gold');
    } else {
        elStatus.className = 'text-5xl font-black italic tracking-tighter text-bb-muted';
        elCard.classList.add('border-bb-border');
    }

    // Block reason
    if (elBlockReason) {
        if (mg.block_reason) {
            elBlockReason.innerText = `Block Reason: ${mg.block_reason}`;
            elBlockReason.className = 'text-[11px] text-bb-red mt-2';
        } else {
            elBlockReason.innerText = '';
        }
    }

    // Confidence adjustment
    if (elConfAdj) {
        const adj = mg.confidence_adjustment || 0;
        elConfAdj.innerText = adj > 0 ? `+${adj}` : adj;
        elConfAdj.className = `text-xl font-mono font-black ${adj < 0 ? 'text-bb-red' : adj > 0 ? 'text-bb-green' : 'text-white'}`;
    }

    // Noise level
    if (elNoise) {
        const noise = mg.noise_level || 'CLEAN';
        elNoise.innerText = noise;
        elNoise.className = `text-lg font-mono font-bold ${noise === 'NOISY' ? 'text-bb-red' : noise === 'MODERATE' ? 'text-bb-gold' : 'text-bb-green'}`;
    }

    // Execution badge
    if (elExecBadge) {
        const allowed = mg.execution_allowed;
        elExecBadge.innerText = allowed ? 'EXECUTION ALLOWED' : 'EXECUTION BLOCKED';
        elExecBadge.className = `text-[9px] px-2 py-1 rounded font-bold ${allowed ? 'bg-bb-green/20 text-bb-green' : 'bg-bb-red/20 text-bb-red'}`;
    }
}

function updateMGChecks(mg) {
    const checks = [
        { id: 1, key: 'mg1_institutional_validity', field: 'valid' },
        { id: 2, key: 'mg3_causality_chain', field: 'intact' },
        { id: 3, key: 'mg4_volatility_kill_switch', field: 'blocked', invert: true },
        { id: 4, key: 'mg5_crowd_contamination', field: 'contaminated', invert: true },
        { id: 5, key: 'mg6_liquidity_first', field: 'valid' }
    ];

    checks.forEach(check => {
        const elDot = document.getElementById(`mg-check-${check.id}-dot`);
        const elMsg = document.getElementById(`mg-check-${check.id}-msg`);

        if (!elDot) return;

        const checkData = mg[check.key] || {};
        let passed = checkData[check.field];
        if (check.invert) passed = !passed;

        if (passed === undefined) {
            elDot.className = 'w-3 h-3 rounded-full bg-bb-border';
            if (elMsg) elMsg.innerText = 'N/A';
        } else if (passed) {
            elDot.className = 'w-3 h-3 rounded-full bg-bb-green shadow-[0_0_8px_rgba(34,197,94,0.5)]';
            if (elMsg) elMsg.innerText = 'PASS';
            if (elMsg) elMsg.className = 'text-[9px] mt-1 text-bb-green';
        } else {
            elDot.className = 'w-3 h-3 rounded-full bg-bb-red shadow-[0_0_8px_rgba(239,68,68,0.5)]';
            if (elMsg) elMsg.innerText = 'FAIL';
            if (elMsg) elMsg.className = 'text-[9px] mt-1 text-bb-red';
        }
    });
}

function updateInterpretation(interp) {
    // Bias
    const elBias = document.getElementById('interp-bias');
    if (elBias) {
        const bias = interp.market_bias || 'NEUTRAL';
        elBias.innerText = bias;
        elBias.className = `text-sm font-black ${bias === 'LONG' ? 'text-bb-green' : bias === 'SHORT' ? 'text-bb-red' : 'text-bb-muted'}`;
    }

    // Confidence badge
    const elConfBadge = document.getElementById('interp-confidence');
    if (elConfBadge) {
        const conf = interp.overall_confidence || 'LOW';
        elConfBadge.innerText = conf;
        elConfBadge.className = `text-[8px] px-1.5 py-0.5 rounded ${conf === 'HIGH' ? 'bg-bb-green/20 text-bb-green' : conf === 'MEDIUM' ? 'bg-bb-gold/10 text-bb-gold' : 'bg-bb-muted/20 text-bb-muted'}`;
    }

    // Reading
    const elReading = document.getElementById('interp-reading');
    if (elReading) elReading.innerText = interp.institutional_reading || '--';

    // Timing
    const elTiming = document.getElementById('interp-timing');
    if (elTiming) {
        const timing = interp.timing_quality || '--';
        elTiming.innerText = timing;
        elTiming.className = `text-[10px] font-bold ${timing === 'OPTIMAL' ? 'text-bb-green' : timing === 'ACCEPTABLE' ? 'text-bb-blue' : 'text-bb-muted'}`;
    }

    // Risk
    const elRisk = document.getElementById('interp-risk');
    if (elRisk) {
        const risk = interp.execution_risk || '--';
        elRisk.innerText = risk;
        elRisk.className = `text-[10px] font-bold ${risk === 'LOW' ? 'text-bb-green' : risk === 'MEDIUM' ? 'text-bb-gold' : risk === 'HIGH' ? 'text-bb-red' : 'text-bb-muted'}`;
    }

    // Reasoning
    const elReasoning = document.getElementById('interp-reasoning');
    if (elReasoning) {
        const reasoning = interp.reasoning || [];
        elReasoning.innerText = Array.isArray(reasoning) ? reasoning.slice(0, 3).join(' ') : reasoning || '--';
    }
}

function updateGovernance(gov, analytics) {
    // Status badge
    const elStatusBadge = document.getElementById('gov-status-badge');
    if (elStatusBadge) {
        const allowed = gov.execution_allowed;
        elStatusBadge.innerText = allowed ? 'APPROVED' : 'BLOCKED';
        elStatusBadge.className = `text-[8px] px-1.5 py-0.5 rounded ${allowed ? 'bg-bb-green/20 text-bb-green' : 'bg-bb-red/20 text-bb-red'}`;
    }

    // Strategy fit
    const elFit = document.getElementById('gov-strategy-fit');
    if (elFit) elFit.innerText = gov.strategy_fit || '--';

    // Asset noise
    const elNoise = document.getElementById('gov-noise');
    if (elNoise) {
        const noise = gov.asset_noise_level || '--';
        elNoise.innerText = noise;
        elNoise.className = `text-[10px] font-bold ${noise === 'LOW' ? 'text-bb-green' : noise === 'MEDIUM' ? 'text-bb-gold' : 'text-bb-red'}`;
    }

    // Execution
    const elExec = document.getElementById('gov-execution');
    if (elExec) {
        const allowed = gov.execution_allowed;
        elExec.innerText = allowed ? 'YES' : 'NO';
        elExec.className = `text-[10px] font-bold ${allowed ? 'text-bb-green' : 'text-bb-red'}`;
    }

    // Explainability
    const elExplain = document.getElementById('gov-explain');
    if (elExplain) {
        const ready = gov.explainability_ready;
        elExplain.innerText = ready ? 'READY' : 'INCOMPLETE';
        elExplain.className = `text-[10px] font-bold ${ready ? 'text-bb-green' : 'text-bb-muted'}`;
    }

    // Warnings
    const elWarnings = document.getElementById('gov-warnings');
    if (elWarnings) {
        const warnings = [...(gov.warnings || []), ...(analytics.warnings || [])];
        if (warnings.length > 0) {
            elWarnings.innerHTML = warnings.slice(0, 3).map(w => `
                <div class="text-[9px] px-2 py-1 bg-bb-gold/10 text-bb-gold border border-bb-gold/20 rounded mb-1">⚠️ ${w}</div>
            `).join('');
        } else {
            elWarnings.innerHTML = '';
        }
    }
}

function updateActiveRoles(interp) {
    const roles = interp.active_roles || {};
    const roleKeys = ['positioning', 'informed_flow', 'crowd', 'forced', 'execution', 'context'];

    roleKeys.forEach(role => {
        const el = document.getElementById(`role-${role}`);
        if (!el) return;

        const roleData = roles[role.toUpperCase()] || roles[role];
        const valueEl = el.querySelector('span:last-child');

        if (roleData && valueEl) {
            valueEl.innerText = roleData.key || roleData.name || 'Active';
            valueEl.className = 'text-[10px] font-bold text-bb-green mt-1';
            el.classList.add('border-bb-green/30');
        } else if (valueEl) {
            valueEl.innerText = '--';
            valueEl.className = 'text-[10px] font-bold text-white/30 mt-1';
            el.classList.remove('border-bb-green/30');
        }
    });
}
