import * as Utils from '../utils.js';
import * as ViewSimulation from './viewSimulation.js';

let rules = [];
const triggeredSignals = new Map(); // key: ruleId + coin + bias, value: timestamp
let editingRuleId = null;
const AUTO_LOG_KEY = 'bb_automation_logs';

// 🔧 TUNED: Profile-based thresholds matching StrategyProfiles.js
const PROFILE_THRESHOLDS = {
    INSTITUTIONAL_BASE: {
        minScore: 52, minConfidence: 55, minNetFlow: 15000,
        vpinThreshold: 0.45, oiZThreshold: 1.2, velocityMin: 3000,
        cooldownMultiplier: 0.5,
        leverageMax: 20
    }
};

// Helper to get thresholds for a profile
function getThresholds(profile = 'INSTITUTIONAL_BASE') {
    return PROFILE_THRESHOLDS[profile] || PROFILE_THRESHOLDS.INSTITUTIONAL_BASE;
}

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
                                            <option value="EFFICIENCY">🧬 EFFICIENCY</option>
                                            <option value="MTF_PRO">📡 MTF CONFLUENCE</option>
                                            <option value="PATIENCE">⌛ PATIENCE SNIPER</option>
                                        </select>
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Risk Profile</label>
                                        <select id="rule-profile" class="bg-bb-black border border-white/10 p-2.5 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded transition-all">
                                            <option value="INSTITUTIONAL_BASE" selected>🏛️ INSTITUTIONAL</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Min Confidence %</label>
                                        <input id="rule-confidence" type="number" value="65" class="bg-bb-black border border-white/10 p-2.5 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded transition-all">
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Min Signal Quality</label>
                                        <input id="rule-quality" type="number" value="0.5" step="0.1" min="0" max="1" class="bg-bb-black border border-white/10 p-2.5 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded transition-all">
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
                                
                                <div class="grid grid-cols-3 gap-3">
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
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Trailing Stop</label>
                                        <select id="rule-trailing" class="bg-bb-black border border-white/10 p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded">
                                            <option value="false">OFF</option>
                                            <option value="true" selected>ON</option>
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
                                
                                <!-- 🔧 NEW: Advanced Risk Controls -->
                                <div class="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Max Daily Trades</label>
                                        <input id="rule-max-daily" type="number" value="10" class="bg-bb-black border border-white/10 p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded">
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Daily Loss Limit %</label>
                                        <input id="rule-daily-loss" type="number" value="5" step="0.5" class="bg-bb-black border border-white/10 p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded">
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[8px] text-bb-muted uppercase font-black tracking-tighter opacity-60">Max Consec. Loss</label>
                                        <input id="rule-max-loss-streak" type="number" value="3" class="bg-bb-black border border-white/10 p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full rounded">
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
            const profile = container.querySelector('#rule-profile').value;
            const th = getThresholds(profile);

            const rule = {
                id: Date.now().toString(),
                name: container.querySelector('#rule-name').value || 'Unnamed Rule',
                strategy: container.querySelector('#rule-strategy').value,
                profile: profile,
                confidence: parseInt(container.querySelector('#rule-confidence').value) || th.minConfidence,
                minQuality: parseFloat(container.querySelector('#rule-quality').value) || 0.5,
                url: container.querySelector('#rule-url').value,
                cooldown: Math.round((parseInt(container.querySelector('#rule-cooldown').value) || 300) * th.cooldownMultiplier),
                active: true,
                createdAt: new Date().toISOString(),
                autoSimulate: container.querySelector('#rule-autosim').value === 'true',
                trailingStop: container.querySelector('#rule-trailing').value === 'true',
                simAmount: parseFloat(container.querySelector('#rule-sim-amount').value) || 1000,
                simLeverage: Math.min(parseInt(container.querySelector('#rule-sim-leverage').value) || 10, th.leverageMax),
                simTp: parseFloat(container.querySelector('#rule-sim-tp').value) || 10,
                simSl: parseFloat(container.querySelector('#rule-sim-sl').value) || 5,
                // 🔧 NEW: Risk controls
                maxDailyTrades: parseInt(container.querySelector('#rule-max-daily').value) || 10,
                dailyLossLimit: parseFloat(container.querySelector('#rule-daily-loss').value) || 5,
                maxLossStreak: parseInt(container.querySelector('#rule-max-loss-streak').value) || 3,
                // Runtime tracking
                dailyTradeCount: 0,
                dailyPnL: 0,
                lossStreak: 0,
                lastTradeDate: null
            };

            if (!rule.url) {
                alert('Webhook URL is required!');
                return;
            }

            if (editingRuleId) {
                const idx = rules.findIndex(r => r.id === editingRuleId);
                if (idx !== -1) {
                    rules[idx] = { ...rules[idx], ...rule, id: editingRuleId }; // Keep original ID and createdAt
                    log('SYSTEM', `Updated rule: ${rule.name} [${rule.profile}]`, 'gold');
                }
                editingRuleId = null;
                addBtn.innerText = 'DEPLOY ENGINE ATOM';
            } else {
                rules.push(rule);
                log('SYSTEM', `Deployed new rule: ${rule.name} [${rule.profile}]`, 'bb-gold');
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

export function init() {
    loadRules();
    console.log('[AUTOMATION] Engine initialized (Rules Loaded)');
}

function saveRules() {
    localStorage.setItem('bb_automation_rules', JSON.stringify(rules));
    // Persist triggered signals to prevent repeat-fire on refresh
    try {
        localStorage.setItem('bb_automation_runtime', JSON.stringify(Array.from(triggeredSignals.entries())));
    } catch (e) { }
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
    const runtime = localStorage.getItem('bb_automation_runtime');
    if (runtime) {
        try {
            const data = JSON.parse(runtime);
            data.forEach(([k, v]) => triggeredSignals.set(k, v));
            console.log('[AUTOMATION] Restored', triggeredSignals.size, 'execution cooldowns');
        } catch (e) { }
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

    list.innerHTML = rules.map(rule => {
        const profileColor = rule.profile === 'INSTITUTIONAL_BASE' ? 'purple-500' : 'bb-gold';
        const profileIcon = rule.profile === 'INSTITUTIONAL_BASE' ? '🏛️' : '⚖️';

        return `
        <div class="p-4 flex justify-between items-center group hover:bg-white/5 transition-all border-b border-white/[0.03]">
            <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-black text-white uppercase tracking-wider">${rule.name}</span>
                    <span class="px-2 py-0.5 bg-bb-gold/10 text-bb-gold text-[7px] font-black rounded border border-bb-gold/20 uppercase">${rule.strategy}</span>
                    <span class="px-2 py-0.5 bg-${profileColor}/10 text-${profileColor} text-[7px] font-black rounded border border-${profileColor}/20 uppercase">${profileIcon} ${rule.profile || 'INSTITUTIONAL_BASE'}</span>
                    ${rule.autoSimulate ? '<span class="px-2 py-0.5 bg-bb-green/10 text-bb-green text-[7px] font-black rounded border border-bb-green/20 uppercase shadow-lg shadow-bb-green/5">SIM</span>' : ''}
                    ${rule.trailingStop ? '<span class="px-2 py-0.5 bg-bb-blue/10 text-bb-blue text-[7px] font-black rounded border border-bb-blue/20 uppercase">TRAIL</span>' : ''}
                </div>
                <div class="flex items-center gap-3">
                    <div class="text-[8px] font-mono text-bb-muted flex items-center gap-1.5 opacity-60">
                        <svg class="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" /></svg>
                        <span class="underline decoration-bb-blue/30">${rule.url.substring(0, 35)}${rule.url.length > 35 ? '...' : ''}</span>
                    </div>
                    <div class="h-2.5 w-px bg-white/10"></div>
                    <div class="flex items-center gap-3 text-[8px] font-black uppercase">
                        <span class="text-bb-muted tracking-tighter">CD <span class="text-white">${rule.cooldown}s</span></span>
                        <span class="text-bb-muted tracking-tighter">Conf <span class="text-white">${rule.confidence}%</span></span>
                        ${rule.autoSimulate ? `
                            <span class="text-bb-muted tracking-tighter">$<span class="text-bb-gold">${rule.simAmount}</span></span>
                            <span class="text-bb-muted tracking-tighter"><span class="text-bb-gold">${rule.simLeverage}x</span></span>
                            <span class="text-bb-green">${rule.simTp}%</span>/<span class="text-bb-red">${rule.simSl}%</span>
                        ` : ''}
                    </div>
                </div>
                <!-- 🔧 NEW: Runtime stats -->
                <div class="flex items-center gap-3 text-[7px] text-bb-muted/50">
                    <span>Today: ${rule.dailyTradeCount || 0}/${rule.maxDailyTrades || 10} trades</span>
                    <span>PnL: <span class="${(rule.dailyPnL || 0) >= 0 ? 'text-bb-green' : 'text-bb-red'}">${(rule.dailyPnL || 0) >= 0 ? '+' : ''}${Utils.safeFixed(rule.dailyPnL || 0, 2)}%</span></span>
                    <span>Streak: ${rule.lossStreak || 0}</span>
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
    `}).join('');
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
    container.querySelector('#rule-profile').value = rule.profile || 'INSTITUTIONAL_BASE';
    container.querySelector('#rule-confidence').value = rule.confidence;
    container.querySelector('#rule-quality').value = rule.minQuality || 0.5;
    container.querySelector('#rule-url').value = rule.url;
    container.querySelector('#rule-cooldown').value = rule.cooldown;
    container.querySelector('#rule-autosim').value = rule.autoSimulate.toString();
    container.querySelector('#rule-trailing').value = (rule.trailingStop || false).toString();
    container.querySelector('#rule-sim-amount').value = rule.simAmount;
    container.querySelector('#rule-sim-leverage').value = rule.simLeverage;
    container.querySelector('#rule-sim-tp').value = rule.simTp;
    container.querySelector('#rule-sim-sl').value = rule.simSl;
    container.querySelector('#rule-max-daily').value = rule.maxDailyTrades || 10;
    container.querySelector('#rule-daily-loss').value = rule.dailyLossLimit || 5;
    container.querySelector('#rule-max-loss-streak').value = rule.maxLossStreak || 3;

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
    container.querySelector('#rule-profile').value = 'INSTITUTIONAL_BASE';
    container.querySelector('#rule-confidence').value = 65;
    container.querySelector('#rule-quality').value = 0.5;
    container.querySelector('#rule-url').value = '';
    container.querySelector('#rule-cooldown').value = 300;
    container.querySelector('#rule-autosim').value = 'true';
    container.querySelector('#rule-trailing').value = 'true';
    container.querySelector('#rule-sim-amount').value = 1000;
    container.querySelector('#rule-sim-leverage').value = 10;
    container.querySelector('#rule-sim-tp').value = 10;
    container.querySelector('#rule-sim-sl').value = 5;
    container.querySelector('#rule-max-daily').value = 10;
    container.querySelector('#rule-daily-loss').value = 5;
    container.querySelector('#rule-max-loss-streak').value = 3;
}

export async function runAutomationEngine(marketState) {
    if (!marketState || rules.length === 0) return;

    const today = new Date().toISOString().split('T')[0];

    for (const rule of rules) {
        if (!rule.active) continue;

        // Initialize runtime stats if not exists
        if (!rule.runtimeStats) {
            rule.runtimeStats = {
                todayTrades: 0,
                todayPnL: 0,
                lossStreak: 0,
                lastTradeDate: null,
                totalTrades: 0
            };
        }

        // Reset daily stats if new day
        if (rule.runtimeStats.lastTradeDate !== today) {
            rule.runtimeStats.todayTrades = 0;
            rule.runtimeStats.todayPnL = 0;
            rule.runtimeStats.lastTradeDate = today;
        }

        // 🛡️ CHECK DAILY TRADE LIMIT
        const maxDaily = rule.maxDailyTrades || 10;
        if (rule.runtimeStats.todayTrades >= maxDaily) {
            log('LIMIT', `${rule.name}: Daily trade limit reached (${maxDaily})`, 'yellow');
            continue;
        }

        // 🛡️ CHECK DAILY LOSS LIMIT
        const dailyLossLimit = rule.dailyLossLimit || 5;
        if (rule.runtimeStats.todayPnL <= -dailyLossLimit) {
            log('LIMIT', `${rule.name}: Daily loss limit reached (${dailyLossLimit}%)`, 'red');
            continue;
        }

        // 🛡️ CHECK CONSECUTIVE LOSS STREAK
        const maxStreak = rule.maxLossStreak || 3;
        if (rule.runtimeStats.lossStreak >= maxStreak) {
            log('LIMIT', `${rule.name}: Loss streak limit reached (${maxStreak})`, 'red');
            continue;
        }

        for (const coin in marketState) {
            const data = marketState[coin];
            if (!data) continue;

            const signalResult = checkSignal(rule.strategy, data, rule);

            if (signalResult &&
                signalResult.confidence >= rule.confidence &&
                (signalResult.quality || 1) >= (rule.minQuality || 0)) {

                // Check Cooldown
                const key = `${rule.id}:${coin}:${signalResult.bias}`;
                const lastTrigger = triggeredSignals.get(key) || 0;
                const now = Date.now();

                if (now - lastTrigger > rule.cooldown * 1000) {
                    executeWebhook(rule, coin, signalResult, data);
                    triggeredSignals.set(key, now);

                    // Update runtime stats
                    rule.runtimeStats.todayTrades++;
                    rule.runtimeStats.totalTrades++;
                    saveRules(); // Persist stats and cooldown immediately
                }
            }
        }
    }
}

// Empty update for tab compatibility
export function update() { }

// === REAL TRADE SIMULATION HELPERS ===
const SLIPPAGE_CONFIG = {
    baseSlippagePct: 0.05,      // 0.05% base slippage
    volatilityMultiplier: 2.0,  // 2x slippage in high vol
    lowLiquidityMultiplier: 3.0 // 3x slippage for low liquidity coins
};

function calculateSlippage(price, side, data) {
    if (!price || price <= 0) return 0;

    let slippagePct = SLIPPAGE_CONFIG.baseSlippagePct;

    // Increase slippage in volatile conditions
    const volRegime = data?.signals?.marketRegime?.volRegime || 'NORMAL';
    if (volRegime === 'HIGH_VOL' || volRegime === 'EXTREME_VOL') {
        slippagePct *= SLIPPAGE_CONFIG.volatilityMultiplier;
    }

    // Increase slippage for low liquidity (check OI tier)
    const oiTier = data?.raw?.OI?.tier || data?.raw?.OI?.oiTier || 2;
    if (oiTier >= 3) {
        slippagePct *= SLIPPAGE_CONFIG.lowLiquidityMultiplier;
    }

    // Apply slippage: BUY = higher price, SELL = lower price
    const slippageAmount = price * (slippagePct / 100);
    return side === 'LONG' || side === 'BUY' ? slippageAmount : -slippageAmount;
}

function getExecutionPrice(data) {
    // Priority: last trade price > mark price > index price
    const price = data?.raw?.PRICE?.last
        || data?.PRICE?.price
        || data?.raw?.PRICE?.price
        || data?.masterSignals?.['15MENIT']?.INSTITUTIONAL_BASE?.metadata?.lastPrice
        || 0;
    return price;
}

function validateSignalQuality(master, data) {
    // Reject stale signals (older than 30 seconds)
    const signalTime = master?.timestamp || data?.timestamp || 0;
    const now = Date.now();
    if (signalTime > 0 && (now - signalTime) > 30000) {
        return { valid: false, reason: 'STALE_SIGNAL' };
    }

    // Reject NO_TRADE or NEUTRAL actions
    if (!master?.action || master.action === 'NO_TRADE' || master.action === 'NEUTRAL') {
        return { valid: false, reason: 'NO_ACTIONABLE_SIGNAL' };
    }

    // Reject if confidence too low
    if ((master?.confidence || 0) < 40) {
        return { valid: false, reason: 'LOW_CONFIDENCE' };
    }

    return { valid: true };
}

function checkSignal(strategy, data, rule = {}) {
    if (!data) return null;

    const profile = rule.profile || 'INSTITUTIONAL_BASE';
    const th = getThresholds(profile);
    const minQuality = rule.minQuality || 0.5;

    // Helper to safely extract any signal value
    const getSigVal = (sigObj, metaKey) => {
        if (!sigObj) return 0;
        if (typeof sigObj === 'number') return sigObj;
        if (metaKey && sigObj.metadata && sigObj.metadata[metaKey] !== undefined) return sigObj.metadata[metaKey];
        if (sigObj.rawValue !== undefined) return sigObj.rawValue;
        if (sigObj.normalizedScore !== undefined) return sigObj.normalizedScore;
        return 0;
    };

    // === DYNAMIC TIMEFRAME & PROFILE BASED ON STRATEGY ===
    const strategyConfig = {
        'COMPOSITE': { timeframes: ['15MENIT', '5MENIT'], useEnhanced: true },
        'SCALP': { timeframes: ['1MENIT', '5MENIT'], useEnhanced: true },
        'WHALE': { timeframes: ['15MENIT', '1JAM'], useEnhanced: true },
        'FLASH': { timeframes: ['1MENIT'], useEnhanced: true },
        'GAMMA': { timeframes: ['15MENIT', '1JAM'], useEnhanced: false },
        'CLUSTER': { timeframes: ['1JAM'], useEnhanced: false },
        'TAPE': { timeframes: ['1MENIT', '5MENIT'], useEnhanced: true },
        'ANOMALY': { timeframes: ['15MENIT'], useEnhanced: false },
        'BLITZ': { timeframes: ['5MENIT', '15MENIT'], useEnhanced: true },
        'FLOW': { timeframes: ['15MENIT', '1JAM'], useEnhanced: true },
        'BREAKOUT': { timeframes: ['15MENIT', '1JAM'], useEnhanced: true },
        'SWEEP': { timeframes: ['5MENIT', '15MENIT'], useEnhanced: false },
        'EFFICIENCY': { timeframes: ['15MENIT', '30MENIT'], useEnhanced: true },
        'MTF_PRO': { timeframes: ['1MENIT', '5MENIT', '15MENIT', '1JAM'], useEnhanced: true },
        'PATIENCE': { timeframes: ['15MENIT', '1JAM'], useEnhanced: true }
    };

    const config = strategyConfig[strategy] || { timeframes: ['15MENIT'], useEnhanced: true };
    const syn = data.synthesis || {};
    const signals = data.signals || {};
    const profiles = signals.profiles || {};
    const raw = data.raw || {};

    // Get best available master signal from configured timeframes
    let master = null;
    let usedTimeframe = null;
    let enhanced = {};
    let micro = {};

    for (const tf of config.timeframes) {
        const tfData = profiles[profile]?.timeframes?.[tf];
        if (tfData?.masterSignal?.action && tfData.masterSignal.action !== 'NO_TRADE' && tfData.masterSignal.action !== 'WAIT') {
            master = tfData.masterSignal;
            usedTimeframe = tf;
            enhanced = tfData?.signals?.enhanced || {};
            micro = tfData?.signals?.microstructure || {};
            break;
        }
    }

    // Fallback to masterSignals shortcut
    if (!master) {
        for (const tf of config.timeframes) {
            const ms = data.masterSignals?.[tf]?.[profile];
            if (ms?.action && ms.action !== 'NO_TRADE' && ms.action !== 'WAIT') {
                master = ms;
                usedTimeframe = tf;
                break;
            }
        }
    }

    // 🔧 NEW: Calculate signal quality
    const signalQuality = calculateSignalQuality(master, enhanced, syn);
    if (signalQuality < minQuality) {
        return null; // Signal quality below threshold
    }

    // Validate signal quality
    const validation = validateSignalQuality(master, data);

    switch (strategy) {
        case 'COMPOSITE': {
            // Multi-factor confluence check with enhanced signals
            const mtf = signals?.mtfConfluence?.[profile] || {};
            const netFlow = syn.flow?.net_flow_15MENIT || syn.flow?.net_flow_5MENIT || 0;
            const score = master?.normalizedScore || 0;
            const confirmations = master?.confirmations || 0;

            // 🔧 Enhanced signals
            const instFootprint = getSigVal(enhanced.institutionalFootprint);
            const momQuality = getSigVal(enhanced.momentumQuality);
            const cvd = getSigVal(enhanced.cvd);

            const hasFlow = Math.abs(netFlow) > th.minNetFlow * 0.5;
            const hasScore = score >= th.minScore || score <= (100 - th.minScore);
            const hasConfirmations = confirmations >= 2;
            const hasMTF = mtf.aligned || mtf.confluence >= 0.6;
            const hasInstitutional = instFootprint > 0.5;
            const hasMomentum = momQuality > 0.4;

            const factors = [];
            if (hasScore) factors.push(`Score:${Utils.safeFixed(score, 0)}`);
            if (hasFlow) factors.push(`Flow:${Utils.safeFixed(netFlow / 1000, 1)}K`);
            if (hasConfirmations) factors.push(`Confirms:${confirmations}`);
            if (hasMTF) factors.push('MTF');
            if (hasInstitutional) factors.push(`Inst:${Utils.safeFixed(instFootprint * 100, 0)}%`);
            if (hasMomentum) factors.push(`MQ:${Utils.safeFixed(momQuality * 100, 0)}%`);

            // Need at least 3 factors for composite
            if (factors.length >= 3 && validation.valid) {
                return {
                    bias: master.action,
                    factors,
                    confidence: Math.min(98, score + (factors.length * 3) + (instFootprint * 10)),
                    timeframe: usedTimeframe,
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'SCALP': {
            const vpin = getSigVal(micro.vpin) || getSigVal(micro.vpinBvc);
            const efficiency = syn.efficiency?.character_15MENIT || syn.efficiency?.character_5MENIT || '';
            const cvd = getSigVal(enhanced.cvd);
            const pressureAccel = getSigVal(enhanced.pressureAcceleration);
            const bookRes = getSigVal(enhanced.bookResilience);

            const hasVpin = vpin > th.vpinThreshold;
            const hasEfficiency = efficiency.includes('EFFORTLESS') || efficiency.includes('STRONG');
            const hasCVD = Math.abs(cvd) > 0.3;
            const hasBookSupport = bookRes > 0.4;

            if (hasVpin && (hasEfficiency || hasCVD) && hasBookSupport && master?.action) {
                const bias = cvd > 0 ? 'LONG' : cvd < 0 ? 'SHORT' : master.action;
                return {
                    bias,
                    factors: [`VPIN:${Utils.safeFixed(vpin * 100, 0)}%`, `CVD:${Utils.safeFixed(cvd * 100, 0)}%`, `Book:${Utils.safeFixed(bookRes * 100, 0)}%`],
                    confidence: Math.min(95, 70 + (vpin * 20) + (pressureAccel * 10)),
                    timeframe: usedTimeframe,
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'WHALE': {
            const aggr = syn.momentum?.aggression_level_15MENIT || syn.momentum?.aggression_level_5MENIT || 'RETAIL';
            const vel = Math.abs(syn.momentum?.velocity_15MENIT || syn.momentum?.velocity_5MENIT || 0);
            const instFootprint = getSigVal(enhanced.institutionalFootprint);
            const amihud = getSigVal(enhanced.amihudIlliquidity, 1);

            const isInstitutional = aggr === 'INSTITUTIONAL' || aggr === 'WHALE' || instFootprint > 0.6;
            const hasVelocity = vel > th.velocityMin;
            const hasLiquidity = amihud < 0.5; // Low illiquidity = can execute large orders

            if (isInstitutional && hasVelocity && hasLiquidity && master?.action) {
                return {
                    bias: master.action,
                    factors: [`Inst:${Utils.safeFixed(instFootprint * 100, 0)}%`, `Vel:${Utils.safeFixed(vel / 1000, 1)}K`, 'LowIlliq'],
                    confidence: 85 + (instFootprint * 10),
                    timeframe: usedTimeframe,
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'EFFICIENCY': {
            const eff = syn.efficiency?.efficiency_15MENIT || 0;
            const velocity = syn.momentum?.velocity_15MENIT || 0;
            const momQuality = getSigVal(enhanced.momentumQuality);
            const pressureAccel = getSigVal(enhanced.pressureAcceleration);

            const hasEfficiency = eff > 1.0;
            const hasVelocity = velocity > th.velocityMin;
            const hasQuality = momQuality > 0.5;
            const hasAccel = pressureAccel > 0.3;

            if (hasEfficiency && hasVelocity && hasQuality && hasAccel && master?.action) {
                return {
                    bias: master.action,
                    factors: [`Eff:${Utils.safeFixed(eff, 1)}`, `MQ:${Utils.safeFixed(momQuality * 100, 0)}%`, `Accel:${Utils.safeFixed(pressureAccel * 100, 0)}%`],
                    confidence: 80 + (momQuality * 15),
                    timeframe: usedTimeframe,
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'MTF_PRO': {
            const p = profiles[profile]?.timeframes || {};
            const actions = ['1MENIT', '5MENIT', '15MENIT', '1JAM'].map(tf => p[tf]?.masterSignal?.action || 'WAIT');
            const allLong = actions.every(a => a === 'BUY' || a === 'LONG');
            const allShort = actions.every(a => a === 'SELL' || a === 'SHORT');

            if (!allLong && !allShort) return null;

            // Check momentum quality across TFs
            const momQualities = ['5MENIT', '15MENIT', '1JAM'].map(tf =>
                p[tf]?.signals?.enhanced?.momentumQuality?.rawValue || 0
            );
            const avgMomQuality = momQualities.reduce((a, b) => a + b, 0) / momQualities.length;

            if (avgMomQuality < 0.4) return null;

            return {
                bias: allLong ? 'LONG' : 'SHORT',
                factors: ['MTF Aligned', `AvgMQ:${Utils.safeFixed(avgMomQuality * 100, 0)}%`],
                confidence: 90 + (avgMomQuality * 8),
                timeframe: '15MENIT',
                quality: signalQuality
            };
        }

        case 'PATIENCE': {
            const netFlow = syn.flow?.net_flow_15MENIT || 0;
            const instFootprint = getSigVal(enhanced.institutionalFootprint);
            const momQuality = getSigVal(enhanced.momentumQuality);
            const bookRes = getSigVal(enhanced.bookResilience);
            const score = master?.normalizedScore || 50;

            const isPerfect = (score > th.minScore + 20 || score < (100 - th.minScore - 20)) &&
                Math.abs(netFlow) > th.minNetFlow * 2 &&
                instFootprint > 0.7 &&
                momQuality > 0.6 &&
                bookRes > 0.6;

            if (isPerfect && master?.action) {
                return {
                    bias: master.action,
                    factors: ['Perfect Storm', `Inst:${Utils.safeFixed(instFootprint * 100, 0)}%`, `MQ:${Utils.safeFixed(momQuality * 100, 0)}%`],
                    confidence: 98,
                    timeframe: usedTimeframe,
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'FLASH': {
            const vol1m = raw?.VOL?.vol_total_1MENIT || 0;
            const vol5m = raw?.VOL?.vol_total_5MENIT || 1;
            const avgVolPerMin = vol5m / 5;
            const surge = avgVolPerMin > 0 ? vol1m / avgVolPerMin : 0;
            const priceChange = Math.abs(raw?.PRICE?.percent_change_1MENIT || 0);
            const cvd = getSigVal(enhanced.cvd);
            const pressureAccel = getSigVal(enhanced.pressureAcceleration);

            if (surge > 1.8 && priceChange > 0.3 && Math.abs(cvd) > 0.2) {
                const bias = cvd > 0 ? 'LONG' : 'SHORT';
                return {
                    bias,
                    factors: [`Surge:${Utils.safeFixed(surge, 1)}x`, `Move:${Utils.safeFixed(priceChange, 2)}%`, `CVD:${Utils.safeFixed(cvd * 100, 0)}%`],
                    confidence: Math.min(90, 65 + (surge * 5) + (pressureAccel * 10)),
                    timeframe: '1MENIT',
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'BLITZ': {
            const netFlow = syn.flow?.net_flow_15MENIT || syn.flow?.net_flow_5MENIT || 0;
            const char = syn.efficiency?.character_15MENIT || '';
            const aggr = syn.momentum?.aggression_level_15MENIT || 'RETAIL';
            const cvd = getSigVal(enhanced.cvd);
            const cvdDivergence = enhanced.cvd?.divergence || false;

            const isBlitz = Math.abs(netFlow) > th.minNetFlow &&
                char.includes('EFFORTLESS') &&
                (aggr === 'INSTITUTIONAL' || aggr === 'WHALE') &&
                Math.sign(cvd) === Math.sign(netFlow) &&
                !cvdDivergence;

            if (isBlitz && master?.action) {
                return {
                    bias: master.action,
                    factors: ['Blitz', `Flow:${Utils.safeFixed(netFlow / 1000, 1)}K`, 'CVD Confirmed'],
                    confidence: 95,
                    timeframe: usedTimeframe,
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'FLOW': {
            const netFlow = syn.flow?.net_flow_15MENIT || syn.flow?.net_flow_1JAM || 0;
            const flowChar = syn.flow?.character_15MENIT || '';
            const cvd = getSigVal(enhanced.cvd);

            // Flow + CVD must agree
            if (Math.abs(netFlow) > th.minNetFlow * 0.8 && flowChar && Math.sign(cvd) === Math.sign(netFlow)) {
                const bias = netFlow > 0 ? 'LONG' : 'SHORT';
                return {
                    bias,
                    factors: [`Flow:${Utils.safeFixed(netFlow / 1000, 1)}K`, flowChar, 'CVD Confirmed'],
                    confidence: 80,
                    timeframe: '15MENIT',
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'BREAKOUT': {
            const volRatio = raw?.OI?.volumeRatio || 1;
            const priceChange = raw?.PRICE?.percent_change_15MENIT || 0;
            const bookRes = getSigVal(enhanced.bookResilience);
            const vpin = getSigVal(micro.vpin);

            // Confirmed breakout: Volume + Price + VPIN + Book support
            if (volRatio > 1.5 && Math.abs(priceChange) > 1.0 && vpin > th.vpinThreshold && bookRes > 0.4) {
                const bias = priceChange > 0 ? 'LONG' : 'SHORT';
                return {
                    bias,
                    factors: [`VolRatio:${Utils.safeFixed(volRatio, 1)}x`, `Break:${Utils.safeFixed(priceChange, 1)}%`, `Book:${Utils.safeFixed(bookRes * 100, 0)}%`],
                    confidence: 85 + (bookRes * 10),
                    timeframe: '15MENIT',
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'TAPE': {
            const aggr1m = syn.momentum?.aggression_level_1MENIT || 'RETAIL';
            const aggr5m = syn.momentum?.aggression_level_5MENIT || 'RETAIL';
            const ofi = micro.ofi?.normalizedScore || getSigVal(micro.ofi) || 50;
            const cvd = getSigVal(enhanced.cvd);

            const isInstitutional = aggr1m === 'INSTITUTIONAL' || aggr5m === 'INSTITUTIONAL';
            const hasOFI = ofi > 65 || ofi < 35;

            if (isInstitutional && hasOFI) {
                const bias = cvd > 0 ? 'LONG' : cvd < 0 ? 'SHORT' : (ofi > 50 ? 'LONG' : 'SHORT');
                return {
                    bias,
                    factors: ['Tape:INSTO', `OFI:${Utils.safeFixed(ofi, 0)}`, `CVD:${Utils.safeFixed(cvd * 100, 0)}%`],
                    confidence: 85,
                    timeframe: '5MENIT',
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'GAMMA': {
            const oiChange = Math.abs(raw?.OI?.oiChange1h || raw?.OI?.oiChange15m || 0);
            const oiDir = raw?.OI?.marketDirection || '';
            const priceDir = (raw?.PRICE?.percent_change_1JAM || 0) > 0 ? 'BULLISH' : 'BEARISH';

            if (oiChange > th.oiZThreshold * 1.5) {
                const oiUp = (raw?.OI?.oiChange1h || 0) > 0;
                const priceDown = (raw?.PRICE?.percent_change_1JAM || 0) < 0;
                const isDivergence = oiUp !== (priceDir === 'BULLISH');

                return {
                    bias: isDivergence ? (priceDown ? 'LONG' : 'SHORT') : (oiDir === 'BULLISH' ? 'LONG' : 'SHORT'),
                    factors: [`OI:${Utils.safeFixed(oiChange, 1)}%`, isDivergence ? 'DIVERGENCE' : oiDir],
                    confidence: 75 + (oiChange * 2),
                    timeframe: '1JAM',
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'ANOMALY': {
            const lsrZ = raw?.LSR?.timeframes_15min?.z || raw?.LSR?.z || 0;
            const fundingZ = raw?.FUNDING?.zScore || 0;

            if (Math.abs(lsrZ) > th.lsrZThreshold || Math.abs(fundingZ) > 2.0) {
                const bias = (lsrZ > 0 || fundingZ > 0) ? 'SHORT' : 'LONG';
                return {
                    bias,
                    factors: [`LSR-Z:${Utils.safeFixed(lsrZ, 1)}%`, 'FADE'],
                    confidence: 80 + Math.min(10, Math.abs(lsrZ) * 3),
                    timeframe: '15MENIT',
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'CLUSTER': {
            const vol = raw?.VOL?.vol_total_1JAM || 0;
            const pxChange = Math.abs(raw?.PRICE?.percent_change_1JAM || 0);

            if (vol > 500000 && pxChange < 0.8) {
                const buyVol = raw?.VOL?.vol_BUY_1JAM || 0;
                const sellVol = raw?.VOL?.vol_SELL_1JAM || 0;
                const bias = buyVol > sellVol ? 'LONG' : 'SHORT';

                return {
                    bias,
                    factors: [`Vol:$${Utils.safeFixed(vol / 1e6, 2)}M`, `Range:${Utils.safeFixed(pxChange, 2)}%`],
                    confidence: 70,
                    timeframe: '1JAM',
                    quality: signalQuality
                };
            }
            return null;
        }

        case 'SWEEP': {
            const liqData = raw?.LIQ || {};
            const liqRate = liqData.liqRate || 0;
            const dominantSide = liqData.dominantSide || 'NONE';

            if (liqRate > 2.0 && dominantSide !== 'NONE') {
                const bias = dominantSide === 'LONG' ? 'LONG' : 'SHORT';
                return {
                    bias,
                    factors: [`LiqRate:${Utils.safeFixed(liqRate, 1)}%`, `Sweep:${dominantSide}`],
                    confidence: 82,
                    timeframe: '15MENIT',
                    quality: signalQuality
                };
            }
            return null;
        }

        default: {
            if (validation.valid && master) {
                const score = master.normalizedScore || 50;
                if (score >= th.minScore || score <= (100 - th.minScore)) {
                    return {
                        bias: master.action,
                        factors: ['Master Signal'],
                        confidence: master.confidence || score,
                        timeframe: usedTimeframe,
                        quality: signalQuality
                    };
                }
            }
            return null;
        }
    }
}

// 🔧 NEW: Calculate signal quality score
function calculateSignalQuality(master, enhanced, synthesis) {
    if (!master) return 0;

    let quality = 0;

    // Factor 1: Confidence (40%)
    quality += (master.confidence || 50) / 100 * 0.4;

    // Factor 2: Confirmations (20%)
    const confirmations = master.confirmations || 0;
    quality += Math.min(confirmations / 4, 1) * 0.2;

    // Factor 3: Enhanced signal alignment (25%)
    const instFootprint = enhanced?.institutionalFootprint?.rawValue || 0;
    const momQuality = enhanced?.momentumQuality?.rawValue || 0;
    quality += ((instFootprint + momQuality) / 2) * 0.25;

    // Factor 4: Efficiency (15%)
    const efficiency = synthesis?.efficiency?.efficiency_15MENIT || 0;
    quality += Math.min(efficiency / 3, 1) * 0.15;

    return Math.min(1, Math.max(0, quality));
}

async function executeWebhook(rule, coin, signal, data) {
    // === REAL TRADE: Get execution price with slippage ===
    const rawPrice = getExecutionPrice(data);
    const slippage = calculateSlippage(rawPrice, signal.bias, data);
    const executionPrice = rawPrice + slippage;

    if (executionPrice <= 0) {
        log('ERROR', `No valid price for ${coin}. Skipping execution.`, 'red');
        return;
    }

    // Get profile for leverage caps
    const profile = rule.profile || 'INSTITUTIONAL_BASE';
    const profileConfig = PROFILE_THRESHOLDS[profile] || PROFILE_THRESHOLDS.INSTITUTIONAL_BASE;
    const cappedLeverage = Math.min(rule.simLeverage || 10, profileConfig.maxLeverage);

    const payload = {
        event: "signal_trigger",
        timestamp: new Date().toISOString(),
        ruleName: rule.name,
        strategy: rule.strategy,
        profile: profile,
        coin: coin,
        bias: signal.bias,
        confidence: signal.confidence,
        quality: signal.quality || 0,
        factors: signal.factors,
        timeframe: signal.timeframe || '15MENIT',
        execution: {
            rawPrice: rawPrice,
            slippage: slippage,
            executionPrice: executionPrice,
            slippagePct: rawPrice > 0 ? Utils.safeFixed((slippage / rawPrice) * 100, 4) : 0
        },
        riskParams: {
            amount: rule.simAmount,
            leverage: cappedLeverage,
            tp: rule.simTp,
            sl: rule.simSl,
            trailingStop: rule.trailingStop || false,
            maxDailyTrades: rule.maxDailyTrades,
            dailyLossLimit: rule.dailyLossLimit
        },
        metadata: {
            source: "OKX_SIGNAL_TERMINAL_V2_BROWSER",
            engine: "MissionControl Automation v3.0 Profile-Aware",
            regime: data?.signals?.marketRegime?.currentRegime || 'UNKNOWN'
        }
    };

    log('EXECUTE', `[${profile}] ${signal.bias} ${coin} @ $${Utils.safeFixed(executionPrice, 4)} (slip: ${slippage >= 0 ? '+' : ''}${Utils.safeFixed(slippage, 4)})`, 'green');

    try {
        const response = await fetch(rule.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Bridge to Simulation with REAL execution price
        if (rule.autoSimulate) {
            // Simulate execution delay (50-200ms like real exchange)
            const execDelay = 50 + Math.random() * 150;

            setTimeout(() => {
                ViewSimulation.openPosition(signal.bias, {
                    coin: coin,
                    amount: rule.simAmount || 1000,
                    leverage: cappedLeverage,
                    tp: rule.simTp || 0,
                    sl: rule.simSl || 0,
                    trailingStop: rule.trailingStop || false,
                    source: 'AUTOMATION',
                    ruleName: rule.name,
                    profile: profile,
                    entryPrice: executionPrice,
                    signalPrice: rawPrice,
                    slippage: slippage,
                    strategy: rule.strategy,
                    timeframe: signal.timeframe,
                    factors: signal.factors,
                    quality: signal.quality,
                    silent: true
                });
                log('BRIDGE', `Position filled @ $${Utils.safeFixed(executionPrice, 4)} (${Utils.safeFixed(execDelay, 0)}ms latency)`, 'gold');
            }, execDelay);
        }

        if (response.ok) {
            log('SUCCESS', `Webhook OK → ${rule.url.substring(0, 25)}...`, 'blue');
        } else {
            log('ERROR', `Webhook failed (${response.status}): ${response.statusText}`, 'red');
        }
    } catch (err) {
        // Still execute simulation even if webhook fails
        if (rule.autoSimulate) {
            ViewSimulation.openPosition(signal.bias, {
                coin: coin,
                amount: rule.simAmount || 1000,
                leverage: cappedLeverage,
                tp: rule.simTp || 0,
                sl: rule.simSl || 0,
                trailingStop: rule.trailingStop || false,
                source: 'AUTOMATION',
                ruleName: rule.name,
                profile: profile,
                entryPrice: executionPrice,
                silent: true
            });
            log('BRIDGE', `Webhook failed but sim position opened @ $${Utils.safeFixed(executionPrice, 4)}`, 'gold');
        }
        log('ERROR', `Network: ${err.message}`, 'red');
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
