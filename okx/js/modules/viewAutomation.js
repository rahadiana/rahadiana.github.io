import * as Utils from '../utils.js';
import * as ViewSimulation from './viewSimulation.js';

let rules = [];
const triggeredSignals = new Map(); // key: ruleId + coin + bias, value: timestamp
let editingRuleId = null;
const AUTO_LOG_KEY = 'bb_automation_logs';

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-mono overflow-hidden">
            <!-- HEADER -->
            <div class="p-3 border-b border-white/5 flex justify-between items-center bg-bb-panel/20 shrink-0">
                <div class="flex items-center gap-4">
                    <span class="text-bb-gold font-black text-xs uppercase tracking-widest">SIGNAL AUTOMATION LAYER</span>
                    <div class="h-4 w-px bg-white/10"></div>
                    <span class="text-[9px] text-bb-muted uppercase">Browser-Side Execution Engine</span>
                </div>
                <div class="flex gap-2">
                    <button id="auto-export" class="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-bold text-white hover:bg-white/10 transition-colors uppercase">Export Config</button>
                    <button id="auto-import-btn" class="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-bold text-white hover:bg-white/10 transition-colors uppercase">Import Config</button>
                    <input type="file" id="auto-import-file" class="hidden" accept=".json">
                </div>
            </div>

            <div class="flex-1 overflow-hidden flex gap-4 p-4">
                <!-- LEFT: RULE BUILDER (40%) -->
                <div class="w-1/3 min-w-[320px] flex flex-col gap-4 overflow-y-auto scrollbar-thin pr-1">
                    <div class="p-5 bg-bb-panel border border-white/5 rounded-xl space-y-5 shadow-2xl">
                        <div class="flex items-center gap-2 border-b border-white/5 pb-3">
                            <div class="h-1.5 w-1.5 rounded-full bg-bb-gold animate-pulse"></div>
                            <h3 id="builder-title" class="text-bb-gold font-black text-[10px] uppercase tracking-widest">DEPLOY NEW ENGINE RULE</h3>
                        </div>
                        
                        <div class="space-y-4">
                            <!-- BASIC CONFIG -->
                            <div class="space-y-3">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Automation Identity</label>
                                    <input id="rule-name" type="text" placeholder="e.g. ALPHA SCALP SNIPER" class="bg-bb-black border border-white/10 p-2.5 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded transition-all">
                                </div>
                                
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Trigger Strategy</label>
                                        <select id="rule-strategy" class="bg-bb-black border border-white/10 p-2.5 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded transition-all">
                                            <option value="COMPOSITE">👑 COMPOSITE ALPHA</option>
                                            <option value="FLASH">⚡ FLASH IGNITION</option>
                                            <option value="GAMMA">🎲 GAMMA PROXY</option>
                                            <option value="SCALP">🎯 SCALP SNIPER</option>
                                            <option value="WHALE">🐋 WHALE SHADOW</option>
                                            <option value="BLITZ">⚡ INSTO BLITZ</option>
                                            <option value="FLOW">🌊 CAPITAL FLOW</option>
                                            <option value="BREAKOUT">💥 BREAKOUT</option>
                                            <option value="SWEEP">🧹 LIQ SWEEP</option>
                                            <option value="CLUSTER">🎯 VOL CLUSTER</option>
                                            <option value="TAPE">📜 TAPE READER</option>
                                            <option value="ANOMALY">⚠️ STAT ANOMALY</option>
                                        </select>
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Target Conf. %</label>
                                        <input id="rule-confidence" type="number" value="80" class="bg-bb-black border border-white/10 p-2.5 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded transition-all">
                                    </div>
                                </div>

                                <div class="flex flex-col gap-1.5">
                                    <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Webhook Target URL</label>
                                    <input id="rule-url" type="text" placeholder="https://endpoint.com/signal" class="bg-bb-black border border-white/10 p-2.5 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded transition-all">
                                </div>
                            </div>

                            <!-- LOGIC & SIMULATION BRIDGE -->
                            <div class="p-4 bg-black/40 border border-white/5 rounded-lg space-y-4">
                                <span class="text-[7px] text-bb-muted uppercase font-black tracking-widest block opacity-50">Logic & Simulation Bridge</span>
                                
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Cooldown (Sec)</label>
                                        <input id="rule-cooldown" type="number" value="300" class="bg-bb-black border border-white/10 p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded">
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Auto-Simulate</label>
                                        <select id="rule-autosim" class="bg-bb-black border border-white/10 p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded">
                                            <option value="false">NO (Webhook Only)</option>
                                            <option value="true" selected>YES (Sim Trade)</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Sim size ($)</label>
                                        <input id="rule-sim-amount" type="number" value="1000" class="bg-bb-black border border-white/10 p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded">
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Sim Leverage</label>
                                        <input id="rule-sim-leverage" type="number" value="10" class="bg-bb-black border border-white/10 p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded">
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Default TP (%)</label>
                                        <input id="rule-sim-tp" type="number" value="10" step="0.1" class="bg-bb-black border border-white/10 p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded">
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Default SL (%)</label>
                                        <input id="rule-sim-sl" type="number" value="5" step="0.1" class="bg-bb-black border border-white/10 p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded">
                                    </div>
                                </div>
                            </div>

                            <button id="add-rule" class="w-full bg-bb-gold text-black font-black text-[11px] py-3 rounded-lg hover:translate-y-[-1px] active:translate-y-[0] transition-all uppercase shadow-lg shadow-bb-gold/10">DEPLOY ENGINE ATOM</button>
                        </div>
                    </div>

                    <div class="p-4 bg-bb-panel border border-bb-red/30 rounded-lg bg-bb-red/5">
                        <h4 class="text-bb-red font-black text-[10px] uppercase mb-2">SYSTEM WARNING</h4>
                        <p class="text-[9px] text-bb-text leading-relaxed opacity-70 italic">
                            Semua eksekusi sinyal berada di sisi klien (Your Browser). Dashboard harus tetap terbuka (Active Tab) agar sinyal dapat dikirim ke URL tujuan. Pastikan Webhook URL mendukung CORS jika berada di domain berbeda.
                        </p>
                    </div>
                </div>

                <!-- RIGHT: ACTIVE RULES & LOGS (60%) -->
                <div class="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div class="flex-1 bg-bb-panel border border-white/5 rounded-lg flex flex-col overflow-hidden">
                        <div class="px-4 py-2 bg-black/40 border-b border-white/5 flex justify-between items-center shrink-0">
                            <span class="text-[9px] font-black text-white uppercase tracking-widest">ACTIVE AUTOMATIONS</span>
                            <span id="rules-count" class="text-[9px] font-mono text-bb-gold">0 ACTIVE RULES</span>
                        </div>
                        <div id="rules-list" class="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                            <!-- rules here -->
                        </div>
                    </div>

                    <div class="h-1/3 bg-bb-panel border border-white/5 rounded-lg flex flex-col overflow-hidden">
                        <div class="px-4 py-2 bg-black/40 border-b border-white/5 shrink-0 flex justify-between items-center">
                            <span class="text-[10px] font-black text-bb-muted uppercase tracking-widest">SIGNAL EXECUTION LOG</span>
                            <button id="clear-logs" class="text-[8px] text-bb-red hover:underline uppercase font-bold">Clear</button>
                        </div>
                        <div id="auto-logs" class="flex-1 overflow-y-auto p-4 space-y-1 text-[9px] font-mono scrollbar-thin">
                            <div class="text-bb-muted italic">Awaiting first execution event...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadRules();
    loadLogs();
    attachEvents(container);
}

function attachEvents(container) {
    const addBtn = container.querySelector('#add-rule');
    if (addBtn) {
        addBtn.onclick = () => {
            const rule = {
                id: Date.now().toString(),
                name: container.querySelector('#rule-name').value || 'Unnamed Rule',
                strategy: container.querySelector('#rule-strategy').value,
                confidence: parseInt(container.querySelector('#rule-confidence').value) || 80,
                url: container.querySelector('#rule-url').value,
                cooldown: parseInt(container.querySelector('#rule-cooldown').value) || 300,
                active: true,
                createdAt: new Date().toISOString(),
                autoSimulate: container.querySelector('#rule-autosim').value === 'true',
                simAmount: parseFloat(container.querySelector('#rule-sim-amount').value) || 1000,
                simLeverage: parseInt(container.querySelector('#rule-sim-leverage').value) || 10,
                simTp: parseFloat(container.querySelector('#rule-sim-tp').value) || 10,
                simSl: parseFloat(container.querySelector('#rule-sim-sl').value) || 5
            };

            if (!rule.url) {
                alert('Webhook URL is required!');
                return;
            }

            if (editingRuleId) {
                const idx = rules.findIndex(r => r.id === editingRuleId);
                if (idx !== -1) {
                    rules[idx] = { ...rules[idx], ...rule, id: editingRuleId }; // Keep original ID and createdAt
                    log('SYSTEM', `Updated rule: ${rule.name}`, 'gold');
                }
                editingRuleId = null;
                addBtn.innerText = 'DEPLOY ENGINE ATOM';
            } else {
                rules.push(rule);
                log('SYSTEM', `Deployed new rule: ${rule.name}`, 'bb-gold');
            }

            saveRules();
            renderRulesList();
            resetForm(container);
        };
    }

    // Export
    const exportBtn = container.querySelector('#auto-export');
    if (exportBtn) {
        exportBtn.onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rules, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", "bb_automation_config.json");
            dlAnchorElem.click();
            log('SYSTEM', 'Config exported as JSON', 'blue');
        };
    }

    // Import
    const importBtn = container.querySelector('#auto-import-btn');
    const importFile = container.querySelector('#auto-import-file');
    if (importBtn && importFile) {
        importBtn.onclick = () => importFile.click();
        importFile.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                try {
                    const imported = JSON.parse(re.target.result);
                    if (Array.isArray(imported)) {
                        rules = imported;
                        saveRules();
                        renderRulesList();
                        log('SYSTEM', `Imported ${rules.length} rules successfully`, 'blue');
                    }
                } catch (err) {
                    alert('Invalid JSON file!');
                }
            };
            reader.readAsText(file);
        };
    }

    // Clear Logs
    const clearBtn = container.querySelector('#clear-logs');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm('Clear all execution logs?')) {
                localStorage.removeItem(AUTO_LOG_KEY);
                const logContainer = document.getElementById('auto-logs');
                if (logContainer) logContainer.innerHTML = '<div class="text-bb-muted italic">Awaiting first execution event...</div>';
            }
        };
    }
}

function saveRules() {
    localStorage.setItem('bb_automation_rules', JSON.stringify(rules));
}

function loadRules() {
    const stored = localStorage.getItem('bb_automation_rules');
    if (stored) {
        try {
            rules = JSON.parse(stored);
            renderRulesList();
        } catch (e) {
            rules = [];
        }
    }
}

function renderRulesList() {
    const list = document.getElementById('rules-list');
    const count = document.getElementById('rules-count');
    if (!list) return;

    if (count) count.innerText = `${rules.length} ACTIVE RULES`;

    if (rules.length === 0) {
        list.innerHTML = `<div class="p-12 text-center text-bb-muted italic text-[10px] opacity-30">No active automation rules. Build one to start generating external signals.</div>`;
        return;
    }

    list.innerHTML = rules.map(rule => `
        <div class="p-4 flex justify-between items-center group hover:bg-white/5 transition-all border-b border-white/[0.03]">
            <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-black text-white uppercase tracking-wider">${rule.name}</span>
                    <span class="px-2 py-0.5 bg-bb-gold/10 text-bb-gold text-[7px] font-black rounded border border-bb-gold/20 uppercase">${rule.strategy}</span>
                    ${rule.autoSimulate ? '<span class="px-2 py-0.5 bg-bb-green/10 text-bb-green text-[7px] font-black rounded border border-bb-green/20 uppercase shadow-lg shadow-bb-green/5">SIM ACTIVE</span>' : ''}
                </div>
                <div class="flex items-center gap-3">
                    <div class="text-[8px] font-mono text-bb-muted flex items-center gap-1.5 opacity-60">
                        <svg class="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" /></svg>
                        <span class="underline decoration-bb-blue/30">${rule.url.substring(0, 35)}${rule.url.length > 35 ? '...' : ''}</span>
                    </div>
                    <div class="h-2.5 w-px bg-white/10"></div>
                    <div class="flex items-center gap-3 text-[8px] font-black uppercase">
                        <span class="text-bb-muted tracking-tighter">Cooldown <span class="text-white">${rule.cooldown}s</span></span>
                        ${rule.autoSimulate ? `
                            <span class="text-bb-muted tracking-tighter">Size <span class="text-bb-gold">$${rule.simAmount}</span></span>
                            <span class="text-bb-muted tracking-tighter">Lev <span class="text-bb-gold">${rule.simLeverage}x</span></span>
                            <span class="text-bb-muted tracking-tighter">TP <span class="text-bb-green">${rule.simTp}%</span></span>
                            <span class="text-bb-muted tracking-tighter">SL <span class="text-bb-red">${rule.simSl}%</span></span>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-6">
                <div class="flex flex-col items-end gap-1.5">
                    <span class="text-[7px] text-bb-muted uppercase font-black opacity-50 tracking-widest">Active State</span>
                    <button class="w-11 h-5.5 rounded-full bg-bb-sidebar relative border border-white/10 transition-colors ${rule.active ? 'bg-bb-green/10' : ''}" onclick="window.app.toggleRule('${rule.id}')">
                        <div class="w-4 h-4 rounded-full transition-all absolute top-0.5 ${rule.active ? 'bg-bb-green left-6 shadow-lg shadow-bb-green/20' : 'bg-bb-muted left-0.5 opacity-40'}"></div>
                    </button>
                </div>
                <button class="p-2.5 text-bb-muted hover:text-bb-green hover:bg-bb-green/10 rounded-lg transition-all opacity-0 group-hover:opacity-100" onclick="window.app.editRule('${rule.id}')">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button class="p-2.5 text-bb-muted hover:text-bb-red hover:bg-bb-red/10 rounded-lg transition-all opacity-0 group-hover:opacity-100" onclick="window.app.deleteRule('${rule.id}')">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    `).join('');
}

// Global exposure for onClick handlers
window.app = window.app || {};
window.app.toggleRule = (id) => {
    const rule = rules.find(r => r.id === id);
    if (rule) {
        rule.active = !rule.active;
        saveRules();
        renderRulesList();
        log('SYSTEM', `Rule ${rule.name} is now ${rule.active ? 'ENABLED' : 'DISABLED'}`, rule.active ? 'green' : 'muted');
    }
};

window.app.deleteRule = (id) => {
    if (confirm('Delete this rule?')) {
        const idx = rules.findIndex(r => r.id === id);
        if (idx !== -1) {
            log('SYSTEM', `Deleted rule: ${rules[idx].name}`, 'red');
            rules.splice(idx, 1);
            saveRules();
            renderRulesList();
        }
    }
};

window.app.editRule = (id) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;

    editingRuleId = id;

    // Fill the form
    const container = document.getElementById('view-container');
    if (!container) return;

    container.querySelector('#rule-name').value = rule.name;
    container.querySelector('#rule-strategy').value = rule.strategy;
    container.querySelector('#rule-confidence').value = rule.confidence;
    container.querySelector('#rule-url').value = rule.url;
    container.querySelector('#rule-cooldown').value = rule.cooldown;
    container.querySelector('#rule-autosim').value = rule.autoSimulate.toString();
    container.querySelector('#rule-sim-amount').value = rule.simAmount;
    container.querySelector('#rule-sim-leverage').value = rule.simLeverage;
    container.querySelector('#rule-sim-tp').value = rule.simTp;
    container.querySelector('#rule-sim-sl').value = rule.simSl;

    // Change button text
    const addBtn = container.querySelector('#add-rule');
    if (addBtn) {
        addBtn.innerText = 'UPDATE ENGINE RULE';
        addBtn.scrollIntoView({ behavior: 'smooth' });
    }
};

function resetForm(container) {
    container.querySelector('#rule-name').value = '';
    container.querySelector('#rule-strategy').selectedIndex = 0;
    container.querySelector('#rule-confidence').value = 80;
    container.querySelector('#rule-url').value = '';
    container.querySelector('#rule-cooldown').value = 300;
    container.querySelector('#rule-autosim').value = 'true';
    container.querySelector('#rule-sim-amount').value = 1000;
    container.querySelector('#rule-sim-leverage').value = 10;
    container.querySelector('#rule-sim-tp').value = 10;
    container.querySelector('#rule-sim-sl').value = 5;
}

export async function runAutomationEngine(marketState) {
    if (!marketState || rules.length === 0) return;

    for (const rule of rules) {
        if (!rule.active) continue;

        for (const coin in marketState) {
            const data = marketState[coin];
            if (!data) continue; // Safety guard

            const signalResult = checkSignal(rule.strategy, data);

            if (signalResult && signalResult.confidence >= rule.confidence) {
                // Check Cooldown
                const key = `${rule.id}:${coin}:${signalResult.bias}`;
                const lastTrigger = triggeredSignals.get(key) || 0;
                const now = Date.now();

                if (now - lastTrigger > rule.cooldown * 1000) {
                    executeWebhook(rule, coin, signalResult, data);
                    triggeredSignals.set(key, now);
                }
            }
        }
    }
}

// Empty update for tab compatibility
export function update() { }

function checkSignal(strategy, data) {
    if (!data) return null; // Safety guard
    const timeframe = '15MENIT';
    const profile = 'AGGRESSIVE';
    const syn = data.synthesis || {};
    const signals = data.signals || {};
    const profiles = signals.profiles || {};
    const tfData = profiles[profile]?.timeframes?.[timeframe] || {};
    const master = tfData.masterSignal || {};
    const micro = tfData.signals?.microstructure || {};

    switch (strategy) {
        case 'COMPOSITE': {
            const mtf = data.signals?.mtfConfluence?.AGGRESSIVE || {};
            const netFlow = syn.flow?.net_flow_15MENIT || 0;
            const score = master.normalizedScore || 0;
            const isGod = score > 80 && Math.abs(netFlow) > 30000 && mtf.aligned;
            return isGod ? { bias: master.action, factors: ['Adaptive Confluence'], confidence: score } : null;
        }
        case 'SCALP': {
            const vpin = micro.vpin?.rawValue || 0;
            const isScalp = vpin > 0.6 && syn.efficiency?.character_15MENIT === 'EFFORTLESS_MOVE';
            return isScalp ? { bias: master.action, factors: ['VPIN Sniper'], confidence: master.normalizedScore || 80 } : null;
        }
        case 'WHALE': {
            const aggr = syn.momentum?.aggression_level_15MENIT || 'RETAIL';
            const vel = syn.momentum?.velocity_15MENIT || 0;
            const isWhale = aggr === 'INSTITUTIONAL' && vel > 10000;
            return isWhale ? { bias: master.action || 'LONG', factors: ['Whale Footprint'], confidence: 85 } : null;
        }
        case 'FLASH': {
            const m = data.signals?.profiles?.AGGRESSIVE?.timeframes?.['1MENIT']?.masterSignal || {};
            const vol = data.raw?.VOL?.vol_total_1MENIT || 1;
            const avgVol = data.raw?.VOL?.vol_total_5MENIT || 5;
            const surge = vol / (avgVol / 5);
            return surge > 1.5 ? { bias: 'LONG', factors: ['Ignition Volume'], confidence: 80 } : null;
        }
        case 'GAMMA': {
            const oiData = data.raw?.OI || {};
            const oiChange = Math.abs(oiData.oiChange1h || 0);
            return oiChange > 5.0 ? { bias: 'LONG_VOL', factors: ['Gamma Squeeze'], confidence: 75 } : null;
        }
        case 'CLUSTER': {
            const vol = data.raw?.VOL?.vol_total_1JAM || 0;
            const pxChange = Math.abs(data.raw?.PRICE?.percent_change_1H || 0);
            return (vol > 1000000 && pxChange < 0.5) ? { bias: 'HOLD', factors: ['Vol Cluster'], confidence: 70 } : null;
        }
        case 'TAPE': {
            const aggr = data.synthesis?.momentum?.aggression_level_1MENIT || 'RETAIL';
            return aggr === 'INSTITUTIONAL' ? { bias: 'SCALP', factors: ['Tape Aggression'], confidence: 85 } : null;
        }
        case 'ANOMALY': {
            const lsrZ = Math.abs(data.raw?.LSR?.timeframes_15min?.z || 0);
            return lsrZ > 3.0 ? { bias: 'ANOMALY', factors: ['3-Sigma'], confidence: 88 } : null;
        }
        default:
            if ((master.normalizedScore || 0) >= 80) {
                return { bias: master.action, factors: ['Master Signal Drive'], confidence: master.normalizedScore };
            }
            return null;
    }
}

async function executeWebhook(rule, coin, signal, data) {
    const payload = {
        event: "signal_trigger",
        timestamp: new Date().toISOString(),
        ruleName: rule.name,
        strategy: rule.strategy,
        coin: coin,
        bias: signal.bias,
        confidence: signal.confidence,
        factors: signal.factors,
        metadata: {
            source: "OKX_SIGNAL_TERMINAL_V2_BROWSER",
            engine: "MissionControl Automation"
        }
    };

    log('EXECUTE', `Sending ${signal.bias} for ${coin} via ${rule.name}`, 'green');

    try {
        const response = await fetch(rule.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Bridge to Simulation
        if (rule.autoSimulate) {
            ViewSimulation.openPosition(signal.bias, {
                coin: coin,
                amount: rule.simAmount || 1000,
                leverage: rule.simLeverage || 10,
                tp: rule.simTp || 0,
                sl: rule.simSl || 0,
                source: 'AUTOMATION',
                ruleName: rule.name,
                entryPrice: data?.raw?.PRICE?.last || data?.PRICE?.price,
                silent: true
            });
            log('BRIDGE', `Auto-position opened in Simulation ($${rule.simAmount})`, 'gold');
        }

        if (response.ok) {
            log('SUCCESS', `Webhook delivered to ${rule.url.substring(0, 20)}...`, 'blue');
        } else {
            log('ERROR', `Webhook failed (${response.status}): ${response.statusText}`, 'red');
        }
    } catch (err) {
        log('ERROR', `Network error: ${err.message}`, 'red');
    }
}

function log(type, msg, color = 'muted') {
    const logContainer = document.getElementById('auto-logs');
    if (!logContainer) return;

    if (logContainer.innerHTML.includes('Awaiting')) logContainer.innerHTML = '';

    const timestamp = new Date().toISOString();
    const entry = { type, msg, color, timestamp };

    // Persist log
    const storedLogs = JSON.parse(localStorage.getItem(AUTO_LOG_KEY) || '[]');
    storedLogs.unshift(entry);
    localStorage.setItem(AUTO_LOG_KEY, JSON.stringify(storedLogs.slice(0, 100))); // Keep last 100

    renderLogEntry(entry, logContainer, true);
}

function renderLogEntry(entry, container, prepend = false) {
    const colors = {
        'red': 'text-bb-red',
        'green': 'text-bb-green',
        'blue': 'text-bb-blue',
        'gold': 'text-bb-gold',
        'muted': 'text-bb-muted'
    };

    const el = document.createElement('div');
    el.className = "flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300";
    el.innerHTML = `
        <span class="text-[8px] text-bb-muted shrink-0">${new Date(entry.timestamp).toLocaleTimeString()}</span>
        <span class="font-black ${colors[entry.color]} shrink-0 uppercase">[${entry.type}]</span>
        <span class="text-bb-text truncate">${entry.msg}</span>
    `;

    if (prepend) {
        container.prepend(el);
        if (container.children.length > 100) {
            container.removeChild(container.lastChild);
        }
    } else {
        container.appendChild(el);
    }
}

function loadLogs() {
    const logContainer = document.getElementById('auto-logs');
    if (!logContainer) return;

    const storedLogs = JSON.parse(localStorage.getItem(AUTO_LOG_KEY) || '[]');
    if (storedLogs.length > 0) {
        logContainer.innerHTML = '';
        storedLogs.forEach(entry => renderLogEntry(entry, logContainer, false));
    }
}
