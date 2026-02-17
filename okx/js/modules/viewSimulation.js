import * as Utils from '../utils.js';
import * as OkxWs from '../okx_ws.js';

let state = {
    balance: 10000,
    positions: [],
    history: [],
    config: {
        maxOpenPositions: 5,
        trailingStopEnabled: true,
        trailingActivationPct: 4,
        trailingCallbackPct: 2,
        maxDrawdownPct: 15,
        haltCooldownMin: 5,   // Cooldown after drawdown halt (minutes)
        dcaEnabled: false,
        dcaMaxSteps: 3,
        dcaTriggerPct: 2.0,
        dcaMultiplier: 1.0,
        dcaWaitMin: 3,
        // === REAL TRADE CONFIG ===
        enableSlippage: true,
        enableFees: true,
        makerFeePct: 0.02,    // 0.02% maker fee
        takerFeePct: 0.05,    // 0.05% taker fee (market orders)
        fundingEnabled: true  // Simulate funding rate impact
    },
    lastHaltTime: 0,
    // === PERFORMANCE METRICS ===
    metrics: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        totalFeesPaid: 0,
        maxDrawdown: 0,
        peakBalance: 10000
    }
};

// Internal engine state
const SIM_STORAGE_KEY = 'bb_simulation_state';

// Helper: Update Meta-Guard status in header
function updateGuardStatus(coin) {
    const el = document.getElementById('sim-guard-status');
    if (!el) return;

    const mkt = window.marketState || {};
    const data = mkt[coin] || mkt[coin + '-USDT'];
    const guard = data?.signals?.institutional_guard || data?.institutional_guard || null;
    const status = guard?.meta_guard_status ?? '--';

    el.innerText = status;

    if (status === 'ALLOW') {
        el.className = 'text-lg font-black text-bb-green';
    } else if (status === 'BLOCK') {
        el.className = 'text-lg font-black text-bb-red animate-pulse';
        el.title = guard?.block_reason ?? '';
    } else if (status === 'DOWNGRADE') {
        el.className = 'text-lg font-black text-bb-gold';
    } else {
        el.className = 'text-lg font-black text-bb-muted';
    }
}

/**
 * ⚡ Initialization Sequence (Non-UI)
 * Called by main.js to ensure simulation engine state is loaded on refresh
 * priority: 2
 */
export function init() {
    loadState();
    console.log('[SIMULATION] Engine initialized (State Loaded)');
}

export function render(container) {
    loadState();
    syncLiveSubscriptions();

    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-mono overflow-hidden">
            <!-- HEADER: ACCOUNT STATS -->
            <div class="p-4 border-b border-bb-border flex gap-8 bg-bb-panel/30 shrink-0 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-bb-gold/20 to-transparent"></div>
                <div class="flex flex-col">
                    <span class="text-[8px] text-bb-muted uppercase font-black tracking-widest mb-1">Virtual Balance</span>
                    <span id="sim-balance" class="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">$${(state.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[8px] text-bb-muted uppercase font-black tracking-widest mb-1">Equity (Est.)</span>
                    <span id="sim-equity" class="text-2xl font-black text-bb-gold drop-shadow-[0_0_10px_rgba(251,191,36,0.2)]">$${(state.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[8px] text-bb-muted uppercase font-black tracking-widest mb-1">Unrealized PnL</span>
                    <span id="sim-unrealized" class="text-2xl font-black text-bb-muted">$0.00</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[8px] text-bb-muted uppercase font-black tracking-widest mb-1">Closed PnL</span>
                    <span id="sim-closed-pnl" class="text-2xl font-black ${(state.metrics?.totalPnL || 0) >= 0 ? 'text-bb-green' : 'text-bb-red'}">$${Utils.safeFixed(state.metrics?.totalPnL || 0, 2)}</span>
                </div>
                <div class="flex flex-col" title="Meta-Guard status for selected asset">
                    <span class="text-[8px] text-bb-muted uppercase font-black tracking-widest mb-1">🛡️ META-GUARD</span>
                    <span id="sim-guard-status" class="text-lg font-black text-bb-muted">SCANNING</span>
                </div>
                <div class="ml-auto flex items-center gap-3">
                    <button id="sim-reset" class="px-4 py-1.5 border border-bb-red/30 text-bb-red text-[10px] font-black hover:bg-bb-red/10 transition-all uppercase rounded font-mono active:scale-95">Reset Account</button>
                </div>
            </div>

            <div class="flex-1 overflow-hidden flex gap-4 p-4">
                <!-- LEFT: ORDER PANEL (30%) -->
                <div class="w-1/3 flex flex-col gap-4 overflow-y-auto scrollbar-thin pr-2">
                    <div class="p-4 bg-bb-panel border border-bb-border rounded-lg space-y-4">
                        <h3 class="text-bb-gold font-black text-[10px] uppercase border-b border-white/5 pb-2">EXECUTE VIRTUAL TRADE</h3>
                        
                        <div class="space-y-4">
                            <div class="flex flex-col gap-1">
                                <label class="text-[8px] text-bb-muted uppercase font-black">Asset Pair</label>
                                <input id="sim-asset" type="text" placeholder="e.g. BTC-USDT" class="bg-bb-black border border-bb-border p-2 text-[11px] text-white focus:border-bb-gold outline-none w-full uppercase">
                            </div>

                            <div class="flex flex-col gap-1">
                                <label class="text-[8px] text-bb-muted uppercase font-black flex justify-between">
                                    <span>Order Size ($)</span>
                                    <span id="sim-size-preview" class="text-bb-gold">Max: $${(state.balance || 0).toLocaleString()}</span>
                                </label>
                                <input id="sim-amount" type="number" value="1000" class="bg-bb-black border border-bb-border p-2 text-[11px] text-white focus:border-bb-gold outline-none w-full">
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1">
                                    <label class="text-[8px] text-bb-muted uppercase font-black">Take Profit (%)</label>
                                    <input id="sim-tp" type="number" value="10" step="0.1" class="bg-bb-black border border-bb-border p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full">
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label class="text-[8px] text-bb-muted uppercase font-black">Stop Loss (%)</label>
                                    <input id="sim-sl" type="number" value="5" step="0.1" class="bg-bb-black border border-bb-border p-2 text-[10px] text-white focus:border-bb-gold outline-none w-full">
                                </div>
                            </div>

                            <div class="flex flex-col gap-1">
                                <label class="text-[8px] text-bb-muted uppercase font-black flex justify-between">
                                    <span>Leverage</span>
                                    <span id="sim-lev-val" class="text-bb-gold">10x</span>
                                </label>
                                <input id="sim-leverage" type="range" min="1" max="100" value="10" class="w-full h-1 bg-bb-border rounded-lg appearance-none cursor-pointer accent-bb-gold" oninput="document.getElementById('sim-lev-val').innerText = this.value + 'x'">
                            </div>

                            <div class="grid grid-cols-2 gap-3 pt-2">
                                <button id="sim-buy" class="bg-bb-green/20 border border-bb-green/40 text-bb-green font-black text-[11px] py-3 rounded hover:bg-bb-green/30 transition-all uppercase">LONG (BUY)</button>
                                <button id="sim-sell" class="bg-bb-red/20 border border-bb-red/40 text-bb-red font-black text-[11px] py-3 rounded hover:bg-bb-red/30 transition-all uppercase">SHORT (SELL)</button>
                            </div>
                        </div>
                    </div>

                    <!-- GLOBAL CONFIG PANEL -->
                    <div class="p-4 bg-bb-panel border border-bb-border rounded-lg space-y-4">
                        <div class="flex justify-between items-center border-b border-white/5 pb-2">
                            <h3 class="text-bb-muted font-black text-[9px] uppercase tracking-widest">GLOBAL SIM CONFIG</h3>
                            <span class="text-[8px] text-bb-gold/50 font-mono">ENGINE V2.1</span>
                        </div>
                        
                        <div class="grid grid-cols-3 gap-3">
                            <div class="flex flex-col gap-1">
                                <label class="text-[7px] text-bb-muted uppercase font-black">Max Positions</label>
                                <input id="cfg-max-pos" type="number" value="${state.config.maxOpenPositions}" class="bg-bb-black border border-bb-border p-1.5 text-[10px] text-white focus:border-bb-gold outline-none w-full">
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="text-[7px] text-bb-muted uppercase font-black">Drawdown Halt (%)</label>
                                <input id="cfg-max-dd" type="number" value="${state.config.maxDrawdownPct}" class="bg-bb-black border border-bb-border p-1.5 text-[10px] text-white focus:border-bb-gold outline-none w-full">
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="text-[7px] text-bb-muted uppercase font-black">Cooldown (min)</label>
                                <input id="cfg-halt-cooldown" type="number" value="${state.config.haltCooldownMin || 5}" min="1" max="60" class="bg-bb-black border border-bb-border p-1.5 text-[10px] text-white focus:border-bb-gold outline-none w-full">
                            </div>
                        </div>

                        <div class="space-y-3 p-3 bg-black/30 rounded border border-white/5">
                            <div class="flex justify-between items-center">
                                <span class="text-[8px] text-bb-gold/80 uppercase font-black tracking-widest">Smart DCA</span>
                                <button id="cfg-dca-toggle" class="px-2 py-0.5 rounded text-[7px] font-black uppercase transition-all ${state.config.dcaEnabled ? 'bg-bb-gold/20 text-bb-gold border border-bb-gold/30' : 'bg-bb-muted/10 text-bb-muted border border-white/10'}">
                                    ${state.config.dcaEnabled ? 'ACTIVE' : 'OFF'}
                                </button>
                            </div>
                            <div data-dca-row class="grid grid-cols-2 gap-3 pb-1 border-b border-white/5 transition-opacity ${state.config.dcaEnabled ? '' : 'opacity-40'}">
                                <div class="flex flex-col gap-1">
                                    <label class="text-[7px] text-bb-muted uppercase font-black">Max Steps</label>
                                    <input id="cfg-dca-steps" type="number" value="${state.config.dcaMaxSteps}" class="bg-bb-black border border-bb-border p-1.5 text-[10px] text-white focus:border-bb-gold outline-none w-full">
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label class="text-[7px] text-bb-muted uppercase font-black">Trigger ROE %</label>
                                    <input id="cfg-dca-trigger" type="number" value="${state.config.dcaTriggerPct}" step="0.1" class="bg-bb-black border border-bb-border p-1.5 text-[10px] text-white focus:border-bb-gold outline-none w-full">
                                </div>
                            </div>
                            <div data-dca-row class="grid grid-cols-2 gap-3 pb-1 border-b border-white/5 transition-opacity ${state.config.dcaEnabled ? '' : 'opacity-40'}">
                                <div class="flex flex-col gap-1">
                                    <label class="text-[7px] text-bb-muted uppercase font-black">Wait Time (Min)</label>
                                    <input id="cfg-dca-wait" type="number" value="${state.config.dcaWaitMin || 3}" class="bg-bb-black border border-bb-border p-1.5 text-[10px] text-white focus:border-bb-gold outline-none w-full">
                                </div>
                                <div class="flex flex-col gap-1 pr-1">
                                    <label class="text-[8px] opacity-0">.</label>
                                    <div class="text-[8px] text-bb-muted italic py-1 leading-tight">Prevents rapid-fire DCA steps during crashes.</div>
                                </div>
                            </div>
                            <div data-dca-row class="flex flex-col gap-1 pt-1 transition-opacity ${state.config.dcaEnabled ? '' : 'opacity-40'}">
                                <label class="text-[7px] text-bb-muted uppercase font-black flex justify-between">
                                    <span>Step Sizing Multiplier</span>
                                    <span class="text-bb-gold font-mono">${Utils.safeFixed(state.config.dcaMultiplier || 1.0, 1)}x</span>
                                </label>
                                <input id="cfg-dca-mult" type="range" min="1" max="3" step="0.1" value="${state.config.dcaMultiplier || 1.0}" class="w-full h-1 bg-bb-border rounded appearance-none cursor-pointer accent-bb-gold">
                            </div>
                        </div>

                        <div class="space-y-3 p-3 bg-black/30 rounded border border-white/5">
                            <div class="flex justify-between items-center">
                                <span class="text-[8px] text-bb-muted uppercase font-black">Profit Protection (TS)</span>
                                <button id="cfg-ts-toggle" class="px-2 py-0.5 rounded text-[7px] font-black uppercase transition-all ${state.config.trailingStopEnabled ? 'bg-bb-green/20 text-bb-green border border-bb-green/30' : 'bg-bb-muted/10 text-bb-muted border border-white/10'}">
                                    ${state.config.trailingStopEnabled ? 'ACTIVE' : 'OFF'}
                                </button>
                            </div>
                            <div data-ts-row class="grid grid-cols-2 gap-3 transition-opacity ${state.config.trailingStopEnabled ? '' : 'opacity-40'}">
                                <div class="flex flex-col gap-1">
                                    <label class="text-[7px] text-bb-muted uppercase font-black">Activation %</label>
                                    <input id="cfg-ts-act" type="number" value="${state.config.trailingActivationPct}" step="0.1" class="bg-bb-black border border-bb-border p-1.5 text-[10px] text-white focus:border-bb-gold outline-none w-full">
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label class="text-[7px] text-bb-muted uppercase font-black">Callback %</label>
                                    <input id="cfg-ts-call" type="number" value="${state.config.trailingCallbackPct}" step="0.1" class="bg-bb-black border border-bb-border p-1.5 text-[10px] text-white focus:border-bb-gold outline-none w-full">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 bg-bb-panel border border-bb-border rounded-lg min-h-[300px] flex flex-col shrink-0">
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="text-[9px] font-black text-bb-muted uppercase tracking-widest">TRADE HISTORY</h4>
                            <button id="sim-clear-history" class="text-[7px] text-bb-red hover:underline uppercase font-bold">Clear</button>
                        </div>
                        <div id="sim-history" class="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-1">
                            <!-- history items -->
                        </div>
                    </div>
                </div>

                <!-- RIGHT: ACTIVE POSITIONS (70%) -->
                <div class="flex-1 flex flex-col bg-bb-panel border border-bb-border rounded-lg overflow-hidden">
                    <div class="px-4 py-2 bg-black/40 border-b border-bb-border flex justify-between items-center shrink-0">
                        <div class="flex items-center gap-4">
                            <span class="text-[10px] font-black text-white uppercase tracking-widest font-mono">ACTIVE MARGIN POSITIONS</span>
                            <span id="pos-count" class="text-[9px] font-mono text-bb-gold">0 OPEN</span>
                        </div>
                        
                        <!-- GROUP ACTIONS -->
                        <div class="flex items-center gap-2">
                            <div class="flex items-center gap-1.5 bg-bb-black/50 p-1 rounded border border-white/5">
                                <span class="text-[7px] text-bb-muted uppercase font-black px-1">Group Set:</span>
                                <input id="group-tp" type="number" placeholder="TP %" class="bg-transparent border-none text-[8px] text-bb-green w-10 text-right focus:outline-none placeholder:text-bb-green/20">
                                <input id="group-sl" type="number" placeholder="SL %" class="bg-transparent border-none text-[8px] text-bb-red w-10 text-right focus:outline-none placeholder:text-bb-red/20">
                                <button onclick="window.app.updateSimGroupTPSL()" class="bg-bb-gold/10 hover:bg-bb-gold/20 text-bb-gold text-[7px] font-black px-2 py-0.5 rounded transition-all">APPLY ALL</button>
                            </div>
                        </div>
                    </div>
                    <div id="sim-positions" class="flex-1 overflow-y-auto scrollbar-thin">
                        <div class="h-full flex flex-col items-center justify-center text-bb-muted opacity-30 italic text-[10px]">
                            No active positions. Open a trade to begin simulation.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    attachEvents(container);
    updateUI();
}

function attachEvents(container) {
    const levSlider = container.querySelector('#sim-leverage');
    const levVal = container.querySelector('#sim-lev-val');
    if (levSlider && levVal) {
        levSlider.oninput = (e) => levVal.innerText = `${e.target.value}x`;
    }

    // Meta-Guard status update when asset is typed
    const assetInput = container.querySelector('#sim-asset');
    if (assetInput) {
        assetInput.oninput = (e) => {
            const coin = e.target.value.toUpperCase().trim();
            updateGuardStatus(coin);
        };
    }

    const buyBtn = container.querySelector('#sim-buy');
    const sellBtn = container.querySelector('#sim-sell');

    if (buyBtn) buyBtn.onclick = () => openPosition('LONG');
    if (sellBtn) sellBtn.onclick = () => openPosition('SHORT');

    const resetBtn = container.querySelector('#sim-reset');
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (confirm('Reset account to $10,000? All trades will be lost.')) {
                state = {
                    ...state,
                    balance: 10000,
                    positions: [],
                    history: [],
                    metrics: {
                        totalTrades: 0,
                        winningTrades: 0,
                        losingTrades: 0,
                        totalPnL: 0,
                        totalFeesPaid: 0,
                        maxDrawdown: 0,
                        peakBalance: 10000
                    }
                };
                saveState();
                updateUI();
            }
        };
    }

    const clearHistBtn = container.querySelector('#sim-clear-history');
    if (clearHistBtn) {
        clearHistBtn.onclick = () => {
            if (confirm('Clear trade history?')) {
                state.history = [];
                saveState();
                updateUI();
            }
        };
    }

    // Global Config Listeners
    container.querySelector('#cfg-max-pos').oninput = (e) => {
        state.config.maxOpenPositions = parseInt(e.target.value) || 5;
        saveState();
    };
    container.querySelector('#cfg-max-dd').oninput = (e) => {
        state.config.maxDrawdownPct = parseFloat(e.target.value) || 15;
        saveState();
    };
    container.querySelector('#cfg-halt-cooldown').oninput = (e) => {
        state.config.haltCooldownMin = Math.max(1, Math.min(60, parseInt(e.target.value) || 5));
        saveState();
    };
    container.querySelector('#cfg-ts-act').oninput = (e) => {
        state.config.trailingActivationPct = parseFloat(e.target.value) || 4;
        state.positions.forEach(p => { if (p.config) p.config.tsActivation = state.config.trailingActivationPct; });
        saveState();
    };
    container.querySelector('#cfg-ts-call').oninput = (e) => {
        state.config.trailingCallbackPct = parseFloat(e.target.value) || 2;
        state.positions.forEach(p => { if (p.config) p.config.tsCallback = state.config.trailingCallbackPct; });
        saveState();
    };
    container.querySelector('#cfg-ts-toggle').onclick = (e) => {
        state.config.trailingStopEnabled = !state.config.trailingStopEnabled;
        // Apply global toggle to all active positions too
        state.positions.forEach(p => { if (p.config) p.config.tsEnabled = state.config.trailingStopEnabled; });
        saveState();

        // ⚡ Update UI without full re-render
        const btn = container.querySelector('#cfg-ts-toggle');
        const tsRows = container.querySelectorAll('[data-ts-row]');
        if (btn) {
            btn.className = `px-2 py-0.5 rounded text-[7px] font-black uppercase transition-all ${state.config.trailingStopEnabled ? 'bg-bb-green/20 text-bb-green border border-bb-green/30' : 'bg-bb-muted/10 text-bb-muted border border-white/10'}`;
            btn.innerText = state.config.trailingStopEnabled ? 'ACTIVE' : 'OFF';
        }
        tsRows.forEach(row => {
            row.classList.toggle('opacity-40', !state.config.trailingStopEnabled);
        });
    };

    // DCA Listeners
    container.querySelector('#cfg-dca-toggle').onclick = (e) => {
        state.config.dcaEnabled = !state.config.dcaEnabled;
        // Apply global toggle to all active positions too
        state.positions.forEach(p => { if (p.config) p.config.dcaEnabled = state.config.dcaEnabled; });
        saveState();

        // ⚡ Update UI without full re-render
        const btn = container.querySelector('#cfg-dca-toggle');
        const dcaRows = container.querySelectorAll('[data-dca-row]');
        if (btn) {
            btn.className = `px-2 py-0.5 rounded text-[7px] font-black uppercase transition-all ${state.config.dcaEnabled ? 'bg-bb-gold/20 text-bb-gold border border-bb-gold/30' : 'bg-bb-muted/10 text-bb-muted border border-white/10'}`;
            btn.innerText = state.config.dcaEnabled ? 'ACTIVE' : 'OFF';
        }
        dcaRows.forEach(row => {
            row.classList.toggle('opacity-40', !state.config.dcaEnabled);
        });
    };
    container.querySelector('#cfg-dca-steps').oninput = (e) => {
        state.config.dcaMaxSteps = parseInt(e.target.value) || 3;
        state.positions.forEach(p => { if (p.config) p.config.dcaMaxSteps = state.config.dcaMaxSteps; });
        saveState();
    };
    container.querySelector('#cfg-dca-trigger').oninput = (e) => {
        state.config.dcaTriggerPct = parseFloat(e.target.value) || 2;
        state.positions.forEach(p => { if (p.config) p.config.dcaTriggerPct = state.config.dcaTriggerPct; });
        saveState();
    };
    container.querySelector('#cfg-dca-wait').oninput = (e) => {
        state.config.dcaWaitMin = parseInt(e.target.value) || 0;
        state.positions.forEach(p => { if (p.config) p.config.dcaWaitMin = state.config.dcaWaitMin; });
        saveState();
    };
    container.querySelector('#cfg-dca-mult').oninput = (e) => {
        state.config.dcaMultiplier = parseFloat(e.target.value);
        state.positions.forEach(p => { if (p.config) p.config.dcaMultiplier = state.config.dcaMultiplier; });
        // UI feedback for slider
        const label = e.target.previousElementSibling.querySelector('span:last-child');
        if (label) label.innerText = Utils.safeFixed(state.config.dcaMultiplier, 1) + 'x';
        saveState();
    };
}

export function openPosition(side, metadata = {}) {
    // Normalize side
    const normalizedSide = (side === 'BUY' || side === 'LONG' || side === 'B') ? 'LONG' : 'SHORT';
    side = normalizedSide;

    const asset = (metadata.coin || document.getElementById('sim-asset')?.value || '').toUpperCase();
    const amount = metadata.amount || parseFloat(document.getElementById('sim-amount')?.value || 1000);
    const leverage = metadata.leverage || parseInt(document.getElementById('sim-leverage')?.value || 10);
    // FIX: Use !== undefined to handle 0 values correctly
    const tpPerc = metadata.tp !== undefined ? parseFloat(metadata.tp) : parseFloat(document.getElementById('sim-tp')?.value || 10);
    const slPerc = metadata.sl !== undefined ? parseFloat(metadata.sl) : parseFloat(document.getElementById('sim-sl')?.value || 5);

    // ⚡ Pre-subscribe to this coin's ticker before checking price
    if (asset && !window._simSubs?.has(asset)) {
        console.log(`[SIM-WS] Pre-subscribing to ${asset} for position entry`);
        OkxWs.connect();
        const callback = (res) => {
            if (res.data && res.data[0]) {
                livePriceCache[asset] = parseFloat(res.data[0].last);
            }
        };
        OkxWs.subscribe(asset, callback);
        if (!window._simSubs) window._simSubs = new Map();
        window._simSubs.set(asset, callback);
    }

    // === REAL TRADE: Validate entry price BEFORE anything else ===
    let entryPrice = metadata.entryPrice || 0;
    if (entryPrice <= 0) {
        // Try to get from live cache first (OKX WS direct)
        entryPrice = livePriceCache[asset] || 0;
    }
    if (entryPrice <= 0) {
        // Fallback to marketState (from SIGNAL_BOT)
        const coinData = marketState[asset];
        if (coinData?.PRICE?.last) {
            entryPrice = parseFloat(coinData.PRICE.last);
        }
    }

    if (entryPrice <= 0) {
        if (!metadata.silent) {
            console.warn(`[SIM] Cannot open position for ${asset}: No valid entry price`);
        }
        return; // CRITICAL: Do not open position without valid price
    }

    if (!asset || isNaN(amount) || amount <= 0) {
        if (!metadata.silent) alert('Invalid Asset or Amount');
        return;
    }

    // HALT COOLDOWN CHECK
    const cooldownMin = state.config.haltCooldownMin || 5;
    const haltWaitMs = cooldownMin * 60 * 1000;
    const timeSinceHalt = Date.now() - (state.lastHaltTime || 0);
    if (timeSinceHalt < haltWaitMs) {
        const remainingSec = Math.ceil((haltWaitMs - timeSinceHalt) / 1000);
        const remainingMin = Math.floor(remainingSec / 60);
        const remainingSecOnly = remainingSec % 60;
        const timeStr = remainingMin > 0 ? `${remainingMin}m ${remainingSecOnly}s` : `${remainingSecOnly}s`;
        if (!metadata.silent) alert(`⏸️ Drawdown Halt Cooldown\n\nTrading paused for evaluation.\nResumes in: ${timeStr}`);
        return;
    }

    // === REAL TRADE: Calculate entry fee ===
    let entryFee = 0;
    if (state.config.enableFees) {
        const feePct = metadata.source === 'AUTOMATION' ? state.config.takerFeePct : state.config.makerFeePct;
        entryFee = (amount * leverage) * (feePct / 100);
    }

    const totalCost = amount + entryFee;
    if (totalCost > state.balance) {
        if (!metadata.silent) console.warn(`[SIM] Insufficient balance (need $${Utils.safeFixed(totalCost, 2)}, have $${Utils.safeFixed(state.balance, 2)})`);
        return;
    }

    // SMART POSITION MANAGEMENT: Close opposite positions on same coin or DCA same-side
    const existingIdx = state.positions.findIndex(p => p.coin === asset);
    if (existingIdx !== -1) {
        const existing = state.positions[existingIdx];
        if (existing.side !== side) {
            // Signal is opposite -> CLOSE existing before opening new
            if (!metadata.silent) console.log(`[SIM] Opposite signal for ${asset}. Closing existing ${existing.side}...`);
            closePosition(existing.id, metadata.entryPrice || 0, 'SIGNAL_FLIP');
        } else {
            // Same side signal -> Check for DCA
            const dcaCfg = existing.config || state.config;
            const dcaEnabled = (existing.config && existing.config.dcaEnabled !== undefined) ? existing.config.dcaEnabled : state.config.dcaEnabled;

            if (dcaEnabled && existing.dcaStep < (dcaCfg.dcaMaxSteps || 3)) {
                // DCA COOLDOWN CHECK - skip cooldown for first DCA (step 0 → 1)
                const isFirstDca = existing.dcaStep === 0;
                const lastDcaTime = existing.lastDcaTime || existing.timestamp || 0;
                const waitMin = parseFloat(dcaCfg.dcaWaitMin !== undefined ? dcaCfg.dcaWaitMin : state.config.dcaWaitMin) || 0;
                const waitMs = waitMin * 60 * 1000;
                const timeSinceLastDca = Date.now() - lastDcaTime;

                // Require configured wait before any DCA step (including first)
                const cooldownPassed = (waitMs === 0) || (timeSinceLastDca >= waitMs);

                if (!cooldownPassed) {
                    if (!metadata.silent) console.log(`[SIM] DCA Cooldown active for ${asset}. Wait: ${Utils.safeFixed((waitMs - timeSinceLastDca) / 1000, 0)}s`);
                    return;
                }

                // Perform DCA Averaging using initialAmount as base
                const dcaSize = (existing.initialAmount || amount) * (dcaCfg.dcaMultiplier || 1.0);

                // === REAL TRADE: Calculate DCA fee ===
                let dcaFee = 0;
                if (state.config.enableFees) {
                    const feePct = state.config.takerFeePct;
                    dcaFee = (dcaSize * existing.leverage) * (feePct / 100);
                }

                const dcaTotalCost = dcaSize + dcaFee;
                if (dcaTotalCost > state.balance) {
                    if (!metadata.silent) console.warn(`[SIM] Insufficient balance for DCA Step ${existing.dcaStep + 1} on ${asset} (need $${Utils.safeFixed(dcaTotalCost, 2)})`);
                    return;
                }

                const currentEntry = existing.entryPrice;
                const currentAmount = existing.amount;
                const newEntry = entryPrice; // Use validated entry price

                if (newEntry > 0 && currentEntry > 0) {
                    // Weighted Average Entry Price
                    // New Avg = ((Old Price * Old Amount) + (New Price * New Amount)) / (Total Amount)
                    const totalAmount = currentAmount + dcaSize;
                    const avgPrice = ((currentEntry * currentAmount) + (newEntry * dcaSize)) / totalAmount;

                    existing.entryPrice = avgPrice;
                    existing.amount = totalAmount;
                    existing.dcaStep += 1;
                    existing.peakRoe = -999; // Reset peak for Trailing Stop after DCA
                    existing.lastDcaTime = Date.now();
                    existing.totalFees = (existing.totalFees || 0) + dcaFee; // Track cumulative fees

                    // ⚡ Clear _dcaPending flag to allow future DCA triggers
                    delete existing._dcaPending;

                    if (!existing.logs) existing.logs = [];
                    existing.logs.push({
                        type: 'DCA',
                        step: existing.dcaStep,
                        price: newEntry,
                        amount: dcaSize,
                        fee: dcaFee,
                        time: Date.now()
                    });

                    state.balance -= dcaTotalCost;
                    saveState();
                    if (!metadata.silent) console.log(`[SIM] DCA Step ${existing.dcaStep} @ $${Utils.safeFixed(newEntry, 4)} | Size: $${Utils.safeFixed(dcaSize, 2)} | Fee: $${Utils.safeFixed(dcaFee, 2)} | New Avg: $${Utils.safeFixed(avgPrice, 4)}`);
                    updateUI();
                }
                return; // Stop here, we merged into existing
            }

            if (metadata.source === 'AUTOMATION' || metadata.source === 'AUTO-DCA') {
                if (!metadata.silent) console.log(`[SIM] Already have a ${side} position on ${asset} from ${metadata.source} (DCA Disabled/Maxed). Ignoring repeat.`);
                return; // Prevent duplicate auto-positions
            }
            // If manual, we allow scaling/doubling for now
        }
    }

    // NEW POSITION BLOCKS
    if (state.positions.length >= (state.config.maxOpenPositions || 5)) {
        if (!metadata.silent) {
            console.warn(`[SIM] Max positions (${state.config.maxOpenPositions}) reached. Blocking new entry for ${asset}`);
            alert(`Max open positions reached (${state.config.maxOpenPositions})`);
        }
        return;
    }

    const pos = {
        id: Date.now() + Math.random(),
        coin: asset,
        side: side,
        amount: amount,
        leverage: leverage,
        entryPrice: entryPrice, // USE VALIDATED ENTRY PRICE
        source: metadata.source || 'MANUAL',
        ruleName: metadata.ruleName || '',
        strategy: metadata.strategy || '',
        timestamp: Date.now(),
        logs: [{
            type: 'ENTRY',
            price: entryPrice,
            amount: amount,
            fee: entryFee,
            time: Date.now(),
            factors: metadata.factors || []
        }],
        // PER-POSITION CONFIG (Cloned from global at entry)
        config: {
            tp: tpPerc,
            sl: slPerc,
            tsEnabled: state.config.trailingStopEnabled,
            tsActivation: state.config.trailingActivationPct,
            tsCallback: state.config.trailingCallbackPct,
            dcaEnabled: state.config.dcaEnabled,
            dcaMaxSteps: state.config.dcaMaxSteps,
            dcaTriggerPct: state.config.dcaTriggerPct,
            dcaMultiplier: state.config.dcaMultiplier,
            dcaWaitMin: state.config.dcaWaitMin
        },
        dcaStep: 0,
        lastDcaTime: Date.now(),
        initialAmount: amount,
        initialEntry: entryPrice,
        // === REAL TRADE TRACKING ===
        signalPrice: metadata.signalPrice || entryPrice,
        slippage: metadata.slippage || 0,
        totalFees: entryFee,
        timeframe: metadata.timeframe || '15MENIT'
    };

    state.positions.push(pos);
    state.balance -= totalCost; // Deduct amount + fees

    // Record ENTRY in history with full details
    state.history.unshift({
        ...pos,
        type: 'ENTRY',
        ts: Date.now(),
        reason: metadata.source || 'MANUAL',
        entryFee: entryFee
    });

    // Log for debugging
    const slipInfo = metadata.slippage ? ` (slip: ${metadata.slippage >= 0 ? '+' : ''}${Utils.safeFixed(metadata.slippage, 4)})` : '';
    console.log(`[SIM-OPEN] ${side} ${asset} @ $${Utils.safeFixed(entryPrice, 4)}${slipInfo} | Size: $${amount} | Lev: ${leverage}x | Fee: $${Utils.safeFixed(entryFee, 2)} | TP: ${tpPerc}% SL: ${slPerc}%`);

    saveState();
    updateUI();
    syncLiveSubscriptions();
}

let livePriceCache = {};
let _simPriceUpdateInterval = null;

function syncLiveSubscriptions() {
    const activeCoins = new Set(state.positions.map(p => p.coin));

    if (!window._simSubs) window._simSubs = new Map(); // Changed to Map to store callbacks

    // Ensure OKX WS is connected
    OkxWs.connect();

    // Subscribe to new ones
    activeCoins.forEach(coin => {
        if (!window._simSubs.has(coin)) {
            console.log(`[SIM-WS] Auto-subscribing to ${coin}`);
            const callback = (res) => {
                if (res.data && res.data[0]) {
                    const p = parseFloat(res.data[0].last);
                    livePriceCache[coin] = p;
                    // console.log(`[SIM-WS] Price update: ${coin} = ${p}`);
                }
            };
            OkxWs.subscribe(coin, callback);
            window._simSubs.set(coin, callback);
        }
    });

    // Unsubscribe from removed ones
    window._simSubs.forEach((callback, coin) => {
        if (!activeCoins.has(coin)) {
            console.log(`[SIM-WS] Auto-unsubscribing from ${coin}`);
            OkxWs.unsubscribe(coin, callback);
            window._simSubs.delete(coin);
            delete livePriceCache[coin];
        }
    });

    // Start/stop periodic UI update based on active positions
    if (activeCoins.size > 0 && !_simPriceUpdateInterval) {
        console.log('[SIM] Starting price update interval (500ms)');
        let tickCount = 0;
        _simPriceUpdateInterval = setInterval(() => {
            if (state.positions.length > 0) {
                tickCount++;
                // Log every 10 ticks (5 seconds) to confirm interval is running
                if (tickCount % 10 === 0) {
                    console.log(`[SIM-TICK] Interval running, livePriceCache keys: ${Object.keys(livePriceCache).length}, positions: ${state.positions.length}`);
                }

                // Ensure OKX WS stays connected
                OkxWs.connect();

                // Re-subscribe if livePriceCache is empty (connection was lost)
                if (Object.keys(livePriceCache).length === 0 && window._simSubs && window._simSubs.size > 0) {
                    console.log('[SIM] LivePriceCache empty, re-subscribing...');
                    window._simSubs.clear();
                    syncLiveSubscriptions();
                    return;
                }

                // Build minimal marketState from livePriceCache for standalone operation
                const liveMarketState = {};
                Object.keys(livePriceCache).forEach(coin => {
                    liveMarketState[coin] = {
                        coin,
                        raw: { PRICE: { last: livePriceCache[coin] } }
                    };
                });
                // Run simulation engine with live prices (works even when SIGNAL_BOT is offline)
                runSimulationEngine(liveMarketState);
            }
        }, 500);
    } else if (activeCoins.size === 0 && _simPriceUpdateInterval) {
        console.log('[SIM] Stopping price update interval');
        clearInterval(_simPriceUpdateInterval);
        _simPriceUpdateInterval = null;
    }
}

function closePosition(id, currentPrice, reason = 'MANUAL') {
    const idx = state.positions.findIndex(p => p.id === id);
    if (idx === -1) return;

    const p = state.positions[idx];
    const exitPrice = currentPrice || 0;

    // === REAL TRADE: Validate exit price ===
    if (exitPrice <= 0) {
        console.warn(`[SIM] Cannot close ${p.coin}: No valid exit price`);
        return;
    }

    // === REAL TRADE: Calculate exit fee ===
    let exitFee = 0;
    if (state.config.enableFees) {
        const feePct = state.config.takerFeePct; // Exit is typically taker
        exitFee = (p.amount * p.leverage) * (feePct / 100);
    }

    const totalFees = (p.totalFees || 0) + exitFee;

    let grossPnl = 0;
    let netPnl = 0;
    if (p.entryPrice > 0 && exitPrice > 0) {
        const diff = (exitPrice - p.entryPrice) / p.entryPrice;
        grossPnl = p.amount * diff * (p.side === 'LONG' ? 1 : -1) * p.leverage;
        netPnl = grossPnl - totalFees; // Deduct all fees from PnL
    }

    // Return margin + net PnL (after fees)
    state.balance += (p.amount + netPnl);

    // === REAL TRADE: Update performance metrics ===
    if (!state.metrics) {
        state.metrics = { totalTrades: 0, winningTrades: 0, losingTrades: 0, totalPnL: 0, totalFeesPaid: 0, maxDrawdown: 0, peakBalance: 10000 };
    }
    state.metrics.totalTrades++;
    state.metrics.totalPnL += netPnl;
    state.metrics.totalFeesPaid += totalFees;

    if (netPnl >= 0) {
        state.metrics.winningTrades++;
    } else {
        state.metrics.losingTrades++;
    }

    // Track peak balance and max drawdown
    if (state.balance > state.metrics.peakBalance) {
        state.metrics.peakBalance = state.balance;
    }
    const currentDrawdown = ((state.metrics.peakBalance - state.balance) / state.metrics.peakBalance) * 100;
    if (currentDrawdown > state.metrics.maxDrawdown) {
        state.metrics.maxDrawdown = currentDrawdown;
    }

    const holdTime = Date.now() - p.timestamp;
    const holdTimeStr = holdTime < 60000 ? `${Utils.safeFixed(holdTime / 1000, 0)}s` :
        holdTime < 3600000 ? `${Utils.safeFixed(holdTime / 60000, 1)}m` :
            `${Utils.safeFixed(holdTime / 3600000, 1)}h`;

    const finalLogs = [...(p.logs || [])];
    finalLogs.push({
        type: 'EXIT',
        price: exitPrice,
        grossPnl: grossPnl,
        netPnl: netPnl,
        fee: exitFee,
        totalFees: totalFees,
        amount: p.amount,
        time: Date.now(),
        reason: reason,
        holdTime: holdTimeStr
    });

    state.history.unshift({
        ...p,
        logs: finalLogs,
        type: 'EXIT',
        exitPrice: exitPrice,
        grossPnl: grossPnl,
        pnl: netPnl, // Use net PnL as the main PnL
        totalFees: totalFees,
        reason: reason,
        holdTime: holdTimeStr,
        closedAt: Date.now(),
        ts: Date.now(),
        // === REAL TRADE: Trade summary ===
        summary: {
            entry: p.entryPrice,
            exit: exitPrice,
            side: p.side,
            leverage: p.leverage,
            grossPnl: grossPnl,
            fees: totalFees,
            netPnl: netPnl,
            roe: p.entryPrice > 0 ? Utils.safeFixed((netPnl / p.amount) * 100, 2) + '%' : '0%',
            holdTime: holdTimeStr,
            slippage: p.slippage || 0
        }
    });

    console.log(`[SIM-CLOSE] ${p.coin} ${p.side} | Entry: $${Utils.safeFixed(p.entryPrice, 4)} → Exit: $${Utils.safeFixed(exitPrice, 4)} | Gross: $${Utils.safeFixed(grossPnl, 2)} | Fees: $${Utils.safeFixed(totalFees, 2)} | Net: $${Utils.safeFixed(netPnl, 2)} | Hold: ${holdTimeStr}`);

    state.positions.splice(idx, 1);
    saveState();
    updateUI();
    syncLiveSubscriptions();
}

function saveState() {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const stored = localStorage.getItem(SIM_STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (!parsed) return;

            // Step 1: Preserve current defaults
            const defaultConfig = { ...state.config };

            // Step 2: Merge top-level properties (balance, positions, history)
            // But exclude config for now to merge it deeply later
            const { config, ...otherState } = parsed;
            state = { ...state, ...otherState };

            // Normalize positions for side consistency (BUY -> LONG)
            if (state.positions) {
                state.positions.forEach(p => {
                    if (p.side === 'BUY' || p.side === 'B') p.side = 'LONG';
                    if (p.side === 'SELL' || p.side === 'S') p.side = 'SHORT';
                });
            }

            if (!state.config) state.config = { ...defaultConfig };
            // Force backfill missing config properties
            Object.keys(defaultConfig).forEach(key => {
                if (state.config[key] === undefined) state.config[key] = defaultConfig[key];
            });

            if (state.lastHaltTime === undefined) state.lastHaltTime = 0;

            // Normalize positions and positions' configs
            if (state.positions) {
                state.positions.forEach(p => {
                    if (p.side === 'BUY' || p.side === 'B') p.side = 'LONG';
                    if (p.side === 'SELL' || p.side === 'S') p.side = 'SHORT';

                    // ⚡ Clear any stuck flags from previous session
                    delete p._dcaPending;

                    // ⚡ Force sync position config with current global config
                    // This ensures toggling DCA on/off affects all positions
                    if (p.config) {
                        // Sync DCA enabled state with global
                        p.config.dcaEnabled = state.config.dcaEnabled;
                        // Backfill missing properties
                        if (p.config.dcaWaitMin === undefined) p.config.dcaWaitMin = state.config.dcaWaitMin;
                        if (p.config.dcaTriggerPct === undefined) p.config.dcaTriggerPct = state.config.dcaTriggerPct;
                        if (p.config.dcaMaxSteps === undefined) p.config.dcaMaxSteps = state.config.dcaMaxSteps;
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load simulation state', e);
        }
    }
}

function updateUI() {
    const balEl = document.getElementById('sim-balance');
    const histEl = document.getElementById('sim-history');
    const closedPnlEl = document.getElementById('sim-closed-pnl');
    if (!balEl) return;

    const safeBalance = state.balance || 0;
    balEl.innerText = `$${safeBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // Update closed PnL in header
    if (closedPnlEl) {
        const closedPnl = state.metrics?.totalPnL || 0;
        const sign = closedPnl >= 0 ? '+' : '';
        closedPnlEl.innerText = `${sign}$${Utils.safeFixed(Math.abs(closedPnl), 2)}`;
        closedPnlEl.className = `text-2xl font-black ${closedPnl >= 0 ? 'text-bb-green' : 'text-bb-red'}`;
    }

    if (histEl) {
        if (state.history.length === 0) {
            histEl.innerHTML = `<div class="text-[8px] text-bb-muted italic opacity-30 text-center py-4">No trade history.</div>`;
        } else {
            // Calculate win rate for display
            const wins = state.metrics?.winningTrades || 0;
            const total = state.metrics?.totalTrades || 0;
            const winRate = total > 0 ? Utils.safeFixed((wins / total) * 100, 1) : 0;
            const totalFees = state.metrics?.totalFeesPaid || 0;

            let statsHtml = '';
            if (total > 0) {
                // NOTE: state.metrics.totalPnL is already NET (after fees deducted)
                // So we need to calculate GROSS by adding fees back
                const netPnl = state.metrics?.totalPnL || 0;
                const grossPnl = netPnl + totalFees; // Gross = Net + Fees

                const grossClass = grossPnl >= 0 ? 'text-bb-green' : 'text-bb-red';
                const grossSign = grossPnl >= 0 ? '+' : '';
                const netClass = netPnl >= 0 ? 'text-bb-green' : 'text-bb-red';
                const netSign = netPnl >= 0 ? '+' : '';

                statsHtml = `
                    <div class="p-3 bg-bb-gold/5 border border-bb-gold/20 rounded mb-2 space-y-2">
                        <div class="flex justify-between text-[10px]">
                            <span class="text-bb-muted">Gross PnL:</span>
                            <span class="${grossClass} font-black">${grossSign}$${Utils.safeFixed(Math.abs(grossPnl), 2)}</span>
                        </div>
                        <div class="flex justify-between text-[8px]">
                            <span class="text-bb-muted">Fees Paid:</span>
                            <span class="text-bb-red">-$${Utils.safeFixed(totalFees, 2)}</span>
                        </div>
                        <div class="flex justify-between text-[10px] border-t border-white/10 pt-2">
                            <span class="text-bb-muted">Net PnL:</span>
                            <span class="${netClass} font-black">${netSign}$${Utils.safeFixed(Math.abs(netPnl), 2)}</span>
                        </div>
                        <div class="flex justify-between text-[8px] pt-1">
                            <span class="text-bb-muted">Win Rate:</span>
                            <span class="text-bb-gold font-bold">${winRate}% <span class="text-bb-muted">(${wins}/${total})</span></span>
                        </div>
                    </div>
                `;
            }

            histEl.innerHTML = statsHtml + state.history.slice(0, 50).map(h => {
                const isEntry = h.type === 'ENTRY';
                const colorClass = isEntry ? 'text-bb-muted' : (h.pnl >= 0 ? 'text-bb-green' : 'text-bb-red');
                const sign = isEntry ? '' : (h.pnl >= 0 ? '+' : '');
                const holdTime = h.holdTime || '';
                const fees = h.totalFees ? ' (fees: $' + Utils.safeFixed(h.totalFees, 2) + ')' : '';

                return `
                <div class="p-2 bg-black/20 border border-white/5 rounded text-[8px] flex justify-between items-center group cursor-pointer hover:bg-white/5 transition-all" onclick="window.app.showTradeDetails(${h.id || h.ts})">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-white">${h.coin}</span>
                            <span class="${h.side === 'LONG' ? 'text-bb-green' : 'text-bb-red'} font-bold opacity-70">${h.side}</span>
                            <span class="text-[7px] px-1 bg-white/5 rounded text-bb-muted">${isEntry ? 'OPEN' : 'CLOSE'}</span>
                            ${holdTime ? `<span class="text-[6px] text-bb-muted">${holdTime}</span>` : ''}
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-bb-muted">${new Date(h.ts || h.closedAt).toLocaleTimeString()}</span>
                            ${h.strategy ? `<span class="text-[6px] text-bb-gold/60">${h.strategy}</span>` : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="${colorClass} font-black">${isEntry ? '$' + Utils.safeFixed(h.entryPrice || 0, (h.entryPrice || 0) < 1 ? 4 : 2) : sign + '$' + Utils.safeFixed(h.pnl || 0, 2)}</div>
                        <div class="text-[7px] text-bb-muted uppercase">${h.reason || 'MANUAL'}${!isEntry ? fees : ''}</div>
                    </div>
                </div>
                `;
            }).join('');
        }
    }
}

export async function runSimulationEngine(marketState) {
    if (!marketState) return;

    // Merge live prices into marketState for simulation engine
    Object.keys(livePriceCache).forEach(coin => {
        if (!marketState[coin]) marketState[coin] = { coin, raw: {} };
        if (!marketState[coin].raw) marketState[coin].raw = {};
        if (!marketState[coin].raw.PRICE) marketState[coin].raw.PRICE = {};

        marketState[coin].raw.PRICE.last = livePriceCache[coin];
    });

    let totalUnrealized = 0;

    // Update Positions with live prices
    const posList = document.getElementById('sim-positions');
    const posCountEl = document.getElementById('pos-count');
    const unrealizedEl = document.getElementById('sim-unrealized');
    const equityEl = document.getElementById('sim-equity');

    if (posCountEl) posCountEl.innerText = `${state.positions.length} OPEN`;

    if (!posList) return;

    if (state.positions.length === 0) {
        posList.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-bb-muted opacity-30 italic text-[10px]">No active positions.</div>`;
        if (unrealizedEl) unrealizedEl.innerText = `$0.00`;
        if (equityEl) equityEl.innerText = `$${state.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        return;
    }

    let html = `
        <table class="w-full text-left text-[10px] font-mono">
            <thead class="bg-black/40 text-bb-muted border-b border-bb-border sticky top-0 z-10">
                <tr class="text-[8px] uppercase tracking-tighter">
                    <th class="p-3 font-black">ASSET</th>
                    <th class="p-3 font-black">SIDE</th>
                    <th class="p-3 font-black text-right pr-6">SIZE ($)</th>
                    <th class="p-3 font-black text-right pr-6">ENTRY</th>
                    <th class="p-3 font-black text-right pr-6">TARGETS (TP/SL)</th>
                    <th class="p-3 font-black text-center">DCA STEP</th>
                    <th class="p-3 font-black text-center">TS PROTECT</th>
                    <th class="p-3 font-black text-right pr-6" title="Net ROE (after fees)">ROE %</th>
                    <th class="p-3 font-black text-right pr-6">PNL ($)</th>
                    <th class="p-3 font-black text-center">ACTION</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-white/5 bg-bb-panel/5">
    `;

    state.positions.forEach(p => {
        const data = marketState[p.coin];
        // Prioritize livePriceCache (direct OKX WS) over marketState (from SIGNAL_BOT)
        // This ensures price updates even when SIGNAL_BOT is offline
        const currentPrice = livePriceCache[p.coin] || data?.raw?.PRICE?.last || data?.PRICE?.price || 0;

        // === REAL TRADE: Entry price should already be set, skip if not ===
        // This should not happen anymore after the fix
        if (p.entryPrice === 0 || p.entryPrice === undefined) {
            console.warn(`[SIM] Position ${p.coin} has no entry price - this indicates a bug`);
            return; // Skip this position in rendering
        }

        // Skip trade logic if no current price, but still render the position
        const hasValidPrice = currentPrice > 0;

        if (!hasValidPrice) {
            console.warn(`[SIM] No price for ${p.coin} - OKX WS may not be connected`);
        }

        let roe = 0;
        let grossRoe = 0;
        let pnl = 0;
        const tsCfg = p.config || state.config;
        const tsEnabled = (p.config && p.config.tsEnabled !== undefined) ? p.config.tsEnabled : state.config.trailingStopEnabled;

        if (p.entryPrice > 0 && currentPrice > 0) {
            const diff = (currentPrice - p.entryPrice) / p.entryPrice;
            const direction = p.side === 'LONG' ? 1 : -1;
            grossRoe = diff * direction * p.leverage * 100;
            pnl = p.amount * (diff * direction * p.leverage);

            // ⚡ Calculate Net ROE (including fees)
            // Entry fee already paid, estimate exit fee (taker)
            const entryFee = p.totalFees || 0;
            const exitFeePct = state.config.enableFees ? (state.config.takerFeePct / 100) : 0;
            const estimatedExitFee = (p.amount * p.leverage) * exitFeePct;
            const totalEstimatedFees = entryFee + estimatedExitFee;
            const netPnlEstimate = pnl - totalEstimatedFees;
            roe = (netPnlEstimate / p.amount) * 100; // Net ROE as % of margin

            // TRAILING STOP LOGIC (Priority: Position-specific config)
            // Note: Use grossRoe for trailing stop (tracks raw price movement)
            if (tsEnabled) {
                p.peakRoe = Math.max(p.peakRoe || 0, grossRoe);

                const activation = tsCfg.tsActivation || state.config.trailingActivationPct || 4;
                const callback = tsCfg.tsCallback || state.config.trailingCallbackPct || 2;

                if (p.peakRoe >= activation) {
                    const dropFromPeak = p.peakRoe - grossRoe;
                    if (dropFromPeak >= callback) {
                        setTimeout(() => closePosition(p.id, currentPrice, 'TRAILING-STOP'), 0);
                    }
                }
            }

            // AUTO-EXIT LOGIC (TP/SL - Priority: p.config)
            // ⚡ TP/SL now uses Net ROE (consistent with display)
            const targetTp = (p.config && p.config.tp !== undefined) ? parseFloat(p.config.tp) : parseFloat(p.tp || 0);
            const targetSl = (p.config && p.config.sl !== undefined) ? parseFloat(p.config.sl) : parseFloat(p.sl || 0);

            // Debug TP/SL logic (only log when close to target)
            if (targetTp > 0 && roe >= targetTp * 0.8) {
                console.log(`[SIM-TPSL] ${p.coin} Net ROE: ${Utils.safeFixed(roe, 2)}% approaching TP: ${targetTp}%`);
            }
            if (targetSl > 0 && roe <= -targetSl * 0.8) {
                console.log(`[SIM-TPSL] ${p.coin} Net ROE: ${Utils.safeFixed(roe, 2)}% approaching SL: -${targetSl}%`);
            }

            if (targetTp > 0 && roe >= targetTp) {
                console.log(`[SIM-TPSL] 🎯 ${p.coin} HIT TP! Net ROE: ${Utils.safeFixed(roe, 2)}% >= Target: ${targetTp}%`);
                setTimeout(() => closePosition(p.id, currentPrice, 'AUTO-TP'), 0);
            } else if (targetSl > 0 && roe <= -targetSl) {
                setTimeout(() => closePosition(p.id, currentPrice, 'AUTO-TP'), 0);
            } else if (targetSl > 0 && grossRoe <= -targetSl) {
                // Only trigger SL if DCA is disabled or maxed out
                const dcaEnabled = (p.config && p.config.dcaEnabled !== undefined) ? p.config.dcaEnabled : state.config.dcaEnabled;
                const dcaMaxSteps = (p.config && p.config.dcaMaxSteps !== undefined) ? p.config.dcaMaxSteps : state.config.dcaMaxSteps;

                if (!dcaEnabled || p.dcaStep >= dcaMaxSteps) {
                    console.log(`[SIM-TPSL] 🛑 ${p.coin} HIT SL! ROE: ${Utils.safeFixed(roe, 2)}% <= Target: -${targetSl}%`);
                    setTimeout(() => closePosition(p.id, currentPrice, 'AUTO-SL'), 0);
                } else {
                    console.log(`[SIM-TPSL] ${p.coin} SL triggered but DCA enabled (step ${p.dcaStep}/${dcaMaxSteps})`);
                }
            }

            // SMART DCA TRIGGER (If ROE is negative) - uses Net ROE for consistency
            if (roe < 0) {
                const dcaEnabled = (p.config && p.config.dcaEnabled !== undefined) ? p.config.dcaEnabled : state.config.dcaEnabled;
                const dcaTrigger = parseFloat((p.config && p.config.dcaTriggerPct !== undefined) ? p.config.dcaTriggerPct : state.config.dcaTriggerPct) || 2.0;
                const dcaMaxSteps = (p.config && p.config.dcaMaxSteps !== undefined) ? p.config.dcaMaxSteps : state.config.dcaMaxSteps;
                const dcaWaitMin = parseFloat((p.config && p.config.dcaWaitMin !== undefined) ? p.config.dcaWaitMin : state.config.dcaWaitMin) || 0;

                // Debug: Log why DCA is not triggering
                if (!dcaEnabled) {
                    console.log(`[SIM-DCA] ${p.coin} DCA disabled (p.config.dcaEnabled=${p.config?.dcaEnabled}, global=${state.config.dcaEnabled})`);
                } else if (p.dcaStep >= dcaMaxSteps) {
                    console.log(`[SIM-DCA] ${p.coin} Max DCA steps reached (${p.dcaStep}/${dcaMaxSteps})`);
                } else if (roe > -dcaTrigger) {
                    // Only log if close to trigger
                    if (roe <= -(dcaTrigger * 0.7)) {
                        console.log(`[SIM-DCA] ${p.coin} ROE ${Utils.safeFixed(roe, 2)}% not at trigger -${dcaTrigger}% yet`);
                    }
                }

                if (dcaEnabled && p.dcaStep < dcaMaxSteps && roe <= -dcaTrigger) {
                    // DCA COOLDOWN CHECK - skip cooldown for first DCA (step 0 → 1)
                    const isFirstDca = p.dcaStep === 0;
                    const lastDcaTime = p.lastDcaTime || p.timestamp || 0;
                    const waitMs = dcaWaitMin * 60 * 1000;
                    const timeSinceLastDca = Date.now() - lastDcaTime;

                    // Require configured wait before any DCA step (including first)
                    const cooldownPassed = (waitMs === 0) || (timeSinceLastDca >= waitMs);

                    if (!cooldownPassed) {
                        // Cooldown active; skip this DCA trigger
                    } else {
                        // Prevent double-trigger by marking position
                        if (!p._dcaPending) {
                            p._dcaPending = true;

                            console.log(`[SIM-DCA] ${p.coin} Triggering DCA step ${p.dcaStep} → ${p.dcaStep + 1} at Net ROE: ${Utils.safeFixed(roe, 2)}%`);

                            // Logic: Trigger openPosition with same side to average down
                            // We use silent:true to avoid duplicate alerts
                            setTimeout(() => {
                                openPosition(p.side, {
                                    coin: p.coin,
                                    entryPrice: currentPrice,
                                    amount: p.initialAmount || (p.amount / (p.dcaStep + 1)),
                                    leverage: p.leverage,
                                    source: 'AUTO-DCA',
                                    silent: true
                                });
                                // Clear pending flag after a short delay
                                setTimeout(() => { p._dcaPending = false; }, 1000);
                            }, 0);
                        }
                    }
                }
            }
        }

        totalUnrealized += pnl;

        // Calculate net PnL (accounting for fees)
        const currentFees = p.totalFees || 0;
        const netPnl = pnl - currentFees;

        html += `
            <tr class="hover:bg-white/[0.03] transition-all group/row">
                <td class="p-3 align-middle">
                    <div class="flex flex-col">
                        <span class="font-black text-white text-[11px]">${p.coin}</span>
                        <div class="flex items-center gap-1 opacity-50">
                            <span class="text-[7px] font-black uppercase text-bb-gold/80">${p.source === 'MANUAL' ? 'MANUAL' : 'AUTO'}</span>
                            <span class="text-[7px] text-bb-muted uppercase">${p.source === 'MANUAL' ? 'Direct' : (p.strategy || p.ruleName || 'AUTO')}</span>
                            ${p.slippage ? `<span class="text-[6px] text-bb-red/60">slip:${p.slippage > 0 ? '+' : ''}${Utils.safeFixed(p.slippage, 2)}</span>` : ''}
                        </div>
                    </div>
                </td>
                <td class="p-3 align-middle"><span class="px-2 py-0.5 rounded-sm text-[8px] font-black ${p.side === 'LONG' ? 'bg-bb-green/20 text-bb-green border border-bb-green/30' : 'bg-bb-red/20 text-bb-red border border-bb-red/30'} uppercase">${p.side === 'LONG' ? 'BUY' : 'SELL'} ${p.leverage}x</span></td>
                <td class="p-3 text-right pr-6 align-middle">
                    <div class="flex flex-col items-end">
                        <span class="font-black text-white/80">$${p.amount.toLocaleString()}</span>
                        ${currentFees > 0 ? `<span class="text-[7px] text-bb-red/50">fee: $${Utils.safeFixed(currentFees, 2)}</span>` : ''}
                    </div>
                </td>
                <td class="p-3 text-right pr-6 align-middle font-mono text-bb-muted/80">${Utils.safeFixed(p.entryPrice, p.entryPrice < 1 ? 4 : 2)}</td>
                <td class="p-3 text-right pr-6 align-middle">
                    <div class="flex flex-col items-end gap-1 group/item cursor-pointer hover:bg-white/10 p-1 rounded transition-all active:scale-95" onclick="window.app.editSimPositionSettings(${p.id})">
                        <!-- TP Target with progress -->
                        <div class="flex items-center gap-2 min-w-[100px] justify-end">
                            ${p.config?.tp > 0 ? `
                                <div class="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div class="h-full bg-bb-green transition-all" style="width: ${Math.min(100, Math.max(0, (roe / p.config.tp) * 100))}%"></div>
                                </div>
                                <span class="text-[9px] font-black text-bb-green drop-shadow-[0_0_5px_rgba(34,197,94,0.3)]">🎯 +${p.config.tp}%</span>
                            ` : '<span class="text-[9px] text-bb-muted/30">TP: OFF</span>'}
                        </div>
                        <!-- SL Target with progress -->
                        <div class="flex items-center gap-2 min-w-[100px] justify-end">
                            ${p.config?.sl > 0 ? `
                                <div class="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div class="h-full bg-bb-red transition-all" style="width: ${Math.min(100, Math.max(0, (Math.abs(Math.min(0, roe)) / p.config.sl) * 100))}%"></div>
                                </div>
                                <span class="text-[9px] font-black text-bb-red drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]">🛑 -${p.config.sl}%</span>
                            ` : '<span class="text-[9px] text-bb-muted/30">SL: OFF</span>'}
                        </div>
                        <!-- Current Price Display -->
                        <div class="text-[7px] text-bb-muted mt-0.5">Now: $${Utils.safeFixed(currentPrice, p.entryPrice < 1 ? 4 : 2)}</div>
                    </div>
                </td>
                <td class="p-3 text-center align-middle">
                    <div class="flex flex-col items-center gap-0.5 cursor-pointer hover:bg-white/10 p-1 rounded transition-all" onclick="window.app.editSimPositionSettings(${p.id})">
                        <span class="text-[8px] font-black ${p.dcaStep > 0 ? 'text-bb-gold' : 'text-bb-muted/30'} uppercase">STEP ${p.dcaStep}/${p.config?.dcaMaxSteps || state.config.dcaMaxSteps}</span>
                        ${p.dcaStep < (p.config?.dcaMaxSteps || state.config.dcaMaxSteps) ? `
                            <span class="text-[6px] text-bb-muted font-mono leading-none">TARGET: -${(p.config?.dcaTriggerPct || state.config.dcaTriggerPct)}%</span>
                        ` : '<span class="text-[6px] text-bb-red font-black leading-none uppercase">MAXED</span>'}
                    </div>
                </td>
                <td class="p-3 text-center align-middle">
                    <div class="inline-flex flex-col items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-white/10 transition-all group/ts" onclick="window.app.editSimPositionSettings(${p.id})">
                        <div class="flex items-center gap-1">
                            <div class="w-1.5 h-1.5 rounded-full ${tsEnabled ? 'bg-bb-green shadow-[0_0_5px_#22c55e]' : 'bg-white/10'}"></div>
                            <span class="text-[8px] font-black uppercase ${tsEnabled ? 'text-bb-green' : 'text-bb-muted/30'}">${tsEnabled ? 'GUARD ON' : 'OFF'}</span>
                        </div>
                        <div class="flex gap-2 text-[7px] text-bb-muted font-black font-mono transition-opacity ${tsEnabled ? 'opacity-100' : 'opacity-0'}">
                            <span class="text-white/40">ACT:<span class="text-bb-gold">${tsCfg.tsActivation || 4}%</span></span>
                            <span class="text-white/40">CAL:<span class="text-bb-gold">${tsCfg.tsCallback || 2}%</span></span>
                        </div>
                    </div>
                </td>
                <td class="p-3 text-right pr-6 align-middle text-xs" title="Gross: ${grossRoe > 0 ? '+' : ''}${Utils.safeFixed(grossRoe, 2)}%">
                    <div class="flex flex-col items-end">
                        <span class="font-black ${roe >= 0 ? 'text-bb-green drop-shadow-[0_0_8px_rgba(34,197,94,0.2)]' : 'text-bb-red drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]'}">${roe > 0 ? '+' : ''}${Utils.safeFixed(roe, 2)}%</span>
                        <span class="text-[6px] text-bb-muted/50">net</span>
                    </div>
                </td>
                <td class="p-3 text-right pr-6 align-middle font-black ${pnl >= 0 ? 'text-bb-green' : 'text-bb-red'} text-xs">${pnl > 0 ? '+' : ''}$${Utils.safeFixed(pnl, 2)}</td>
                <td class="p-3 text-center align-middle">
                    <button class="px-3 py-1 bg-bb-red/10 border border-bb-red/30 text-bb-red text-[9px] font-black hover:bg-bb-red hover:text-white transition-all uppercase rounded active:scale-90" 
                            onclick="window.app.closeSimPosition(${p.id}, ${currentPrice})">
                        CLOSE
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    posList.innerHTML = html;

    if (unrealizedEl) {
        unrealizedEl.innerText = `${totalUnrealized >= 0 ? '+' : ''}$${Utils.safeFixed(totalUnrealized, 2)}`;
        unrealizedEl.className = `text-xl font-black ${totalUnrealized > 0 ? 'text-bb-green' : totalUnrealized < 0 ? 'text-bb-red' : 'text-bb-muted'}`;
    }

    if (equityEl) {
        const totalInitialMargin = state.positions.reduce((sum, p) => sum + p.amount, 0);
        const currentEquity = state.balance + totalUnrealized + totalInitialMargin;
        const totalValueOnStart = state.balance + totalInitialMargin; // Approximate last settled equity

        equityEl.innerText = `$${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        // CIRCUIT BREAKER: Max Drawdown %
        if (state.positions.length > 0) {
            const drawdownPct = (totalUnrealized / currentEquity) * 100;
            const haltWaitMs = 3 * 60 * 1000;
            const timeSinceHalt = Date.now() - (state.lastHaltTime || 0);

            if (drawdownPct <= -(state.config.maxDrawdownPct || 15)) {
                if (timeSinceHalt >= haltWaitMs) {
                    console.warn(`[CIRCUIT BREAKER] Drawdown target hit ${Utils.safeFixed(drawdownPct, 2)}%. Halting new entries...`);
                    state.lastHaltTime = Date.now();
                    saveState();
                    renderHaltBanner();
                }
            } else {
                // If recovered AND cooldown over, remove banner
                if (timeSinceHalt >= haltWaitMs) {
                    const banner = document.getElementById('halt-cooldown-banner');
                    if (banner) banner.remove();
                }
            }
        } else {
            // No positions but check cooldown for banner
            const haltWaitMs = 3 * 60 * 1000;
            const timeSinceHalt = Date.now() - (state.lastHaltTime || 0);
            if (timeSinceHalt >= haltWaitMs) {
                const banner = document.getElementById('halt-cooldown-banner');
                if (banner) banner.remove();
            }
        }
    }
}

function renderHaltBanner() {
    const parent = document.getElementById('sim-unrealized')?.closest('.flex.gap-8');
    if (!parent) return;

    let banner = document.getElementById('halt-cooldown-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'halt-cooldown-banner';
        banner.className = 'absolute bottom-0 left-0 w-full h-[2px] bg-bb-red animate-pulse z-50';
        parent.appendChild(banner);
    }
}

// Empty update for tab compatibility
export function update() { }

// Global exposure
window.app = window.app || {};
window.app.closeSimPosition = (id, currentPrice) => {
    if (confirm('Close simulation position?')) {
        closePosition(id, currentPrice);
    }
};

window.app.editSimPositionSettings = (id) => {
    const idx = state.positions.findIndex(p => p.id === id);
    if (idx === -1) return;
    const p = state.positions[idx];
    if (!p.config) p.config = { tp: p.tp, sl: p.sl, tsEnabled: state.config.trailingStopEnabled, tsActivation: state.config.trailingActivationPct, tsCallback: state.config.trailingCallbackPct, dcaEnabled: state.config.dcaEnabled, dcaMaxSteps: state.config.dcaMaxSteps, dcaTriggerPct: state.config.dcaTriggerPct, dcaMultiplier: state.config.dcaMultiplier };

    const newTp = prompt(`[${p.coin}] Set Take Profit %:`, p.config.tp);
    if (newTp !== null) p.config.tp = parseFloat(newTp) || 0;

    const newSl = prompt(`[${p.coin}] Set Stop Loss %:`, p.config.sl);
    if (newSl !== null) p.config.sl = parseFloat(newSl) || 0;

    const dcaToggle = confirm(`[${p.coin}] Enable Smart DCA (Averaging Down for this position?`);
    p.config.dcaEnabled = dcaToggle;

    if (dcaToggle) {
        const dcaSteps = prompt(`[${p.coin}] Max DCA Steps:`, p.config.dcaMaxSteps || 3);
        if (dcaSteps !== null) p.config.dcaMaxSteps = parseInt(dcaSteps) || 3;

        const dcaTrigger = prompt(`[${p.coin}] Trigger ROE % (e.g. 2):`, p.config.dcaTriggerPct || 2);
        if (dcaTrigger !== null) p.config.dcaTriggerPct = parseFloat(dcaTrigger) || 2;

        const dcaWait = prompt(`[${p.coin}] Wait Time (Minutes) between DCA:`, p.config.dcaWaitMin || 3);
        if (dcaWait !== null) p.config.dcaWaitMin = parseInt(dcaWait) || 0;

        const dcaMult = prompt(`[${p.coin}] Step Offset Multiplier (e.g. 1.0):`, p.config.dcaMultiplier || 1.0);
        if (dcaMult !== null) p.config.dcaMultiplier = parseFloat(dcaMult) || 1.0;
    }

    const tsToggle = confirm(`[${p.coin}] Enable Trailing Stop for this position?`);
    p.config.tsEnabled = tsToggle;

    if (tsToggle) {
        const newTsAct = prompt(`[${p.coin}] TS Activation %:`, p.config.tsActivation || 4);
        if (newTsAct !== null) p.config.tsActivation = parseFloat(newTsAct) || 4;

        const newTsCall = prompt(`[${p.coin}] TS Callback %:`, p.config.tsCallback || 2);
        if (newTsCall !== null) p.config.tsCallback = parseFloat(newTsCall) || 2;
    }

    saveState();
};

window.app.updateSimGroupTPSL = () => {
    const tp = parseFloat(document.getElementById('group-tp').value);
    const sl = parseFloat(document.getElementById('group-sl').value);

    if (isNaN(tp) && isNaN(sl)) {
        alert('Please enter at least one value (TP or SL)');
        return;
    }

    if (confirm(`Apply ${!isNaN(tp) ? 'TP:' + tp + '%' : ''} ${!isNaN(sl) ? ' SL:' + sl + '%' : ''} to ALL ${state.positions.length} active positions?`)) {
        state.positions.forEach(p => {
            if (!isNaN(tp)) {
                p.tp = tp;
                if (p.config) p.config.tp = tp;
            }
            if (!isNaN(sl)) {
                p.sl = sl;
                if (p.config) p.config.sl = sl;
            }
        });
        saveState();
        document.getElementById('group-tp').value = '';
        document.getElementById('group-sl').value = '';
    }
};

window.app.showTradeDetails = (id) => {
    const h = state.history.find(item => (item.id === id || item.ts === id));
    if (!h) return;

    let dcaHtml = '';
    if (h.logs && h.logs.length > 0) {
        dcaHtml = h.logs.map((l, i) => {
            const timeStr = new Date(l.time).toLocaleTimeString();
            let label = l.type;
            let color = 'text-white';
            if (l.type === 'ENTRY') color = 'text-bb-green';
            if (l.type === 'DCA') { label = `DCA #${l.step}`; color = 'text-bb-gold'; }
            if (l.type === 'EXIT') color = 'text-bb-red';

            const pnlStr = l.pnl !== undefined ? `<span class="${l.pnl >= 0 ? 'text-bb-green' : 'text-bb-red'} font-bold">PNL: $${Utils.safeFixed(l.pnl, 2)}</span>` : '';

            return `
                <div class="flex justify-between items-center p-2 border-b border-white/5 text-[9px]">
                    <div class="flex flex-col">
                        <span class="${color} font-black uppercase text-[7px]">${label}</span>
                        <span class="text-bb-muted">${timeStr}</span>
                    </div>
                    <div class="text-right flex flex-col">
                        <span class="text-white font-mono">$${Utils.safeFixed(l.price || 0, (l.price || 0) < 1 ? 4 : 2)}</span>
                        <span class="text-bb-muted text-[7px]">$${(l.amount || 0).toLocaleString()} BASE</span>
                        ${pnlStr}
                    </div>
                </div>
            `;
        }).join('');
    }

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4';

    // Build META-GUARD summary (safe-read from marketState)
    const guardSource = window.marketState?.[h.coin] || {};
    const guardData = guardSource.signals?.institutional_guard || guardSource.institutional_guard || null;
    let guardHtml = '';
    if (guardData) {
        const gStatus = guardData.meta_guard_status || guardData.status || 'N/A';
        const gScore = guardData.score !== undefined ? Utils.safeFixed(guardData.score, 2) : 'N/A';
        const gReason = guardData.block_reason || guardData.reason || guardData.message || '';
        const breakdown = guardData.breakdown || null;

        guardHtml = `
            <div class="p-3 bg-bb-panel border border-bb-border rounded mb-3">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="text-[9px] text-bb-muted">META-GUARD</div>
                        <div class="text-lg font-black">${gStatus}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[9px] text-bb-muted">Score</div>
                        <div class="text-xl font-black text-bb-gold">$${gScore}</div>
                    </div>
                </div>
                ${gReason ? `<div class="text-[9px] text-bb-muted mt-2">${gReason}</div>` : ''}
                ${breakdown ? `<div class="mt-2 text-[9px] text-bb-muted"><pre class="whitespace-pre-wrap text-[9px]">${JSON.stringify(breakdown, null, 2)}</pre></div>` : ''}
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="bg-bb-panel border border-bb-gold/30 w-full max-w-md rounded-lg overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div class="p-4 bg-bb-gold/10 border-b border-white/5 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <span class="text-xl font-black text-white">${h.coin}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-black ${h.side === 'LONG' ? 'bg-bb-green/20 text-bb-green' : 'bg-bb-red/20 text-bb-red'}">${h.side}</span>
                </div>
                <button class="text-bb-muted hover:text-white" onclick="this.closest('.fixed').remove()">✕</button>
            </div>
            
            ${guardHtml}

            <div class="p-4 flex-1 overflow-y-auto max-h-[60vh] scrollbar-thin">
                <div class="grid grid-cols-2 gap-4 mb-4 bg-black/20 p-3 rounded border border-white/5">
                    <div class="flex flex-col">
                        <span class="text-[7px] text-bb-muted uppercase font-black">Final Entry (Avg)</span>
                        <span class="text-white font-mono">$${Utils.safeFixed(h.entryPrice || 0, (h.entryPrice || 0) < 1 ? 4 : 2)}</span>
                    </div>
                    <div class="text-right flex flex-col">
                        <span class="text-[7px] text-bb-muted uppercase font-black">Exit Price</span>
                        <span class="text-bb-red font-mono">$${Utils.safeFixed(h.exitPrice || 0, (h.exitPrice || 0) < 1 ? 4 : 2)}</span>
                    </div>
                </div>

                <div class="space-y-1">
                    <h4 class="text-[8px] text-bb-muted uppercase font-black mb-2 flex items-center gap-2">
                        <span class="w-1 h-1 bg-bb-gold rounded-full"></span> 
                        Execution Timeline & DCA Steps
                    </h4>
                    <div class="bg-black/10 rounded border border-white/5">
                        ${dcaHtml || '<div class="p-4 text-center text-bb-muted italic text-[9px]">No logs available.</div>'}
                    </div>
                </div>

                ${h.pnl !== undefined ? `
                <div class="mt-4 p-4 rounded bg-gradient-to-br ${h.pnl >= 0 ? 'from-bb-green/20 to-transparent' : 'from-bb-red/20 to-transparent'} border ${h.pnl >= 0 ? 'border-bb-green/30' : 'border-bb-red/30'} flex justify-between items-center">
                    <span class="text-[9px] font-black uppercase text-white">Full Position Realized PnL</span>
                    <span class="text-lg font-black ${h.pnl >= 0 ? 'text-bb-green' : 'text-bb-red'}">${h.pnl >= 0 ? '+' : ''}$${Utils.safeFixed(h.pnl, 2)}</span>
                </div>
                ` : ''}
            </div>

            <div class="p-3 bg-black/40 border-t border-white/5 flex justify-end">
                <button class="px-6 py-2 bg-bb-muted/20 hover:bg-bb-muted/30 text-white text-[10px] font-black uppercase rounded transition-all" onclick="this.closest('.fixed').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};
