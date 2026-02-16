/**
 * tradeSafety.js
 * Browser-side safety controls ported from okx_trade_excecutor/src/engine/
 *
 * Features:
 *  1. Kill Switch   — Instant halt toggle (localStorage persisted)
 *  2. Circuit Breaker — Auto-halt after N losses in M-minute window
 *  3. Drawdown Guard  — Auto-halt if drawdown % exceeds threshold
 *  4. Flatten All     — Emergency close all OKX positions
 */

import OkxClient from '../okx_client.js';

// ─── STORAGE KEY ──────────────────────────────────────────
const STORAGE_KEY = 'bb_trade_safety';

// ─── STATE ────────────────────────────────────────────────
let killed = false;
let killReason = null;
let killTime = null;

// Circuit Breaker
const lossEvents = []; // [{ ts, pnl, coin }]
let cbConfig = {
    windowMs: 3 * 60_000,   // 3 minutes
    maxLosses: 20,          // stop after 20 losses
};

// Drawdown Guard
let ddConfig = {
    maxDrawdownPct: 10,
    enabled: true
};
let equityPeak = 0;
let currentEquity = 0;
let initialEquity = 0;
let ddTripped = false;

// Trailing Stop (Per Position)
let tsConfig = {
    enabled: true,
    activationPct: 1.2,
    callbackPct: 0.8
};
// Map<instId, { highestPnl: number, active: boolean }>
let tsState = new Map();

// Session PnL
let sessionRealizedPnL = 0;
let sessionStartTime = Date.now();

// ─── PROFIT TARGET ────────────────────────────────────────
let tpConfig = {
    enabled: false,
    targetPnL: 100
};

// ─── PERSISTENCE ──────────────────────────────────────────
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            killed, killReason, killTime,
            cbConfig, ddConfig, tsConfig, tpConfig,
            equityPeak, initialEquity, ddTripped,
            sessionRealizedPnL, sessionStartTime,
        }));
    } catch (e) { }
}

function loadState() {
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (!s) return;
        const d = JSON.parse(s);
        if (d.killed) { killed = true; killReason = d.killReason; killTime = d.killTime; }
        if (d.cbConfig) Object.assign(cbConfig, d.cbConfig);
        if (d.ddConfig) Object.assign(ddConfig, d.ddConfig);
        if (d.tsConfig) Object.assign(tsConfig, d.tsConfig);
        if (d.tpConfig) Object.assign(tpConfig, d.tpConfig);
        if (d.equityPeak) equityPeak = d.equityPeak;
        if (d.initialEquity) initialEquity = d.initialEquity;
        if (d.ddTripped) ddTripped = d.ddTripped;
        if (d.sessionRealizedPnL) sessionRealizedPnL = d.sessionRealizedPnL;
        if (d.sessionStartTime) sessionStartTime = d.sessionStartTime;
    } catch (e) { }
}

// Load on module init
loadState();

// ─── KILL SWITCH ──────────────────────────────────────────

function halt(reason = 'manual') {
    killed = true;
    killReason = reason;
    killTime = Date.now();
    saveState();
    console.error(`🔐 [SAFETY] HALT ACTIVATED: ${reason}`);
    window.dispatchEvent(new CustomEvent('trade-safety-update'));
}

function resume() {
    killed = false;
    killReason = null;
    killTime = null;
    ddTripped = false;
    lossEvents.length = 0;
    saveState();
    console.log('🔓 [SAFETY] Trading resumed');
    window.dispatchEvent(new CustomEvent('trade-safety-update'));
}

function isHalted() {
    return killed;
}

// ─── CIRCUIT BREAKER ──────────────────────────────────────

function recordLoss(pnl, coin = '') {
    if (pnl >= 0) return; // only losses
    lossEvents.push({ ts: Date.now(), pnl, coin });
    _cleanupCBWindow();

    if (lossEvents.length >= cbConfig.maxLosses) {
        halt(`Circuit Breaker: ${lossEvents.length} losses in ${Math.round(cbConfig.windowMs / 60000)}m`);
    }
    window.dispatchEvent(new CustomEvent('trade-safety-update'));
}

function _cleanupCBWindow() {
    const now = Date.now();
    while (lossEvents.length && now - lossEvents[0].ts > cbConfig.windowMs) {
        lossEvents.shift();
    }
}

function getCBStatus() {
    _cleanupCBWindow();
    return {
        losses: lossEvents.length,
        maxLosses: cbConfig.maxLosses,
        windowMs: cbConfig.windowMs,
        tripped: lossEvents.length >= cbConfig.maxLosses,
    };
}

function configureCB(opts = {}) {
    if (opts.maxLosses != null) cbConfig.maxLosses = opts.maxLosses;
    if (opts.windowMs != null) cbConfig.windowMs = opts.windowMs;
    saveState();
}

// ─── DRAWDOWN GUARD ───────────────────────────────────────

function updateEquity(equity) {
    currentEquity = equity;
    if (!initialEquity || initialEquity <= 0) {
        initialEquity = equity;
    }
    equityPeak = Math.max(equityPeak, equity);

    // Check drawdown
    if (equityPeak > 0 && initialEquity > 0) {
        const ddPct = ((equityPeak - equity) / equityPeak) * 100;
        if (ddPct > ddConfig.maxDrawdownPct && !ddTripped && !killed) {
            ddTripped = true;
            halt(`Drawdown Guard: ${ddPct.toFixed(2)}% exceeds ${ddConfig.maxDrawdownPct}% limit`);
        }
    }

    // Trailing stop check is handled by viewOrderSim calling updateTrailingStop() per position.
    saveState();
    window.dispatchEvent(new CustomEvent('trade-safety-update'));
}

function getDrawdownStatus() {
    const dd = equityPeak > 0 ? equityPeak - currentEquity : 0;
    const ddPct = equityPeak > 0 ? ((dd / equityPeak) * 100) : 0;
    return {
        equity: currentEquity,
        peak: equityPeak,
        drawdown: dd,
        drawdownPct: ddPct,
        maxAllowedPct: ddConfig.maxDrawdownPct,
        tripped: ddTripped,
    };
}

function configureDD(opts = {}) {
    if (opts.maxDrawdownPct != null) ddConfig.maxDrawdownPct = opts.maxDrawdownPct;
    saveState();
}

// ─── SESSION PNL & PROFIT TARGET ──────────────────────────

function addRealizedPnL(pnl) {
    sessionRealizedPnL += pnl;
    if (pnl < 0) recordLoss(pnl);

    // Check Profit Target
    if (tpConfig.enabled && sessionRealizedPnL >= tpConfig.targetPnL && !killed) {
        halt(`🎯 Profit Target Reached: $${sessionRealizedPnL.toFixed(2)} >= $${tpConfig.targetPnL}`);
        showToast(`🎯 WINNER: Session Target Hit ($${sessionRealizedPnL.toFixed(2)})`, 'success');
    }

    saveState();
}

function getSessionStats() {
    return {
        realizedPnL: sessionRealizedPnL,
        sessionDurationMs: Date.now() - sessionStartTime,
        targetPnL: tpConfig.targetPnL,
        targetEnabled: tpConfig.enabled
    };
}

function resetSession() {
    sessionRealizedPnL = 0;
    sessionStartTime = Date.now();
    equityPeak = 0;
    initialEquity = 0;
    ddTripped = false;
    lossEvents.length = 0;
    saveState();
    window.dispatchEvent(new CustomEvent('trade-safety-update'));
}

function configureTP(opts = {}) {
    if (opts.enabled != null) tpConfig.enabled = opts.enabled;
    if (opts.targetPnL != null) tpConfig.targetPnL = parseFloat(opts.targetPnL);
    saveState();
}

// ─── TRAILING STOP ────────────────────────────────────────

function updateTrailingStop(instId, currentPnlPct) {
    // 0. Check for position-specific override
    let config = tsConfig;
    try {
        const raw = localStorage.getItem('os_pos_override_' + instId);
        if (raw) {
            const ovr = JSON.parse(raw);
            if (ovr.ts && ovr.ts.enabled !== undefined) {
                if (!ovr.ts.enabled) return { triggered: false };
                config = Object.assign({}, tsConfig, ovr.ts);
            }
        }
    } catch (e) { }

    if (!config.enabled) return { triggered: false };

    let state = tsState.get(instId);
    if (!state) {
        state = { highestPnl: currentPnlPct, active: false };
        tsState.set(instId, state);
    }

    // 1. Update High Watermark
    if (currentPnlPct > state.highestPnl) {
        state.highestPnl = currentPnlPct;
    }

    // 2. Check Activation
    if (!state.active && state.highestPnl >= config.activationPct) {
        state.active = true;
        console.log(`📈 [Safety] TS Activated for ${instId} at ${state.highestPnl.toFixed(2)}% (Override: ${config !== tsConfig})`);
    }

    // 3. Check Trigger
    if (state.active) {
        const triggerLevel = state.highestPnl - config.callbackPct;
        if (currentPnlPct <= triggerLevel) {
            console.log(`🛑 [Safety] TS Triggered for ${instId}: Current ${currentPnlPct.toFixed(2)}% <= Trigger ${triggerLevel.toFixed(2)}% (High: ${state.highestPnl.toFixed(2)}%, Callback: ${config.callbackPct}%)`);
            tsState.delete(instId); // Clear state after trigger
            return { triggered: true, reason: `Trailing Stop: Dropped ${config.callbackPct}% from peak ${state.highestPnl.toFixed(2)}%` };
        }
    }

    return { triggered: false };
}

function configureTS(opts = {}) {
    if (opts.enabled != null) tsConfig.enabled = opts.enabled;
    if (opts.activationPct != null) tsConfig.activationPct = parseFloat(opts.activationPct);
    if (opts.callbackPct != null) tsConfig.callbackPct = parseFloat(opts.callbackPct);
    saveState();
}

function getTSStatus(instId) {
    const state = tsState.get(instId);
    return {
        enabled: tsConfig.enabled,
        activationPct: tsConfig.activationPct,
        callbackPct: tsConfig.callbackPct,
        highestPnl: state ? state.highestPnl : 0,
        active: state ? state.active : false
    };
}

// ─── FLATTEN ALL ──────────────────────────────────────────

async function flattenAll() {
    const results = { attempted: 0, success: 0, failed: 0, errors: [] };

    try {
        const posRes = await OkxClient.fetchPositions();
        const positions = (posRes && posRes.data) ? posRes.data : [];

        if (positions.length === 0) {
            console.log('🚨 [FLATTEN] No positions to close');
            return results;
        }

        for (const p of positions) {
            const sz = Math.abs(Number(p.pos || 0));
            if (sz <= 0) continue;
            results.attempted++;

            const instId = p.instId;
            const posSide = (p.posSide || '').toLowerCase();
            const closeSide = (posSide === 'long' || Number(p.pos) > 0) ? 'long' : 'short';
            // Use the position's actual margin mode; fall back to saved preference
            const tdMode = p.mgnMode || localStorage.getItem('okx_margin_mode') || 'cross';

            try {
                await OkxClient.closePositionBy({
                    instId,
                    tdMode,
                    posSide: (posSide && posSide !== 'net') ? posSide : undefined,
                    sz: String(sz),
                });
                results.success++;
                console.log(`✅ [FLATTEN] Closed ${instId} ${closeSide} x${sz}`);
            } catch (e) {
                results.failed++;
                results.errors.push({ instId, error: e.message });
                console.error(`❌ [FLATTEN] Failed ${instId}:`, e.message);
            }
        }
    } catch (e) {
        console.error('🚨 [FLATTEN] Error fetching positions:', e);
    }

    // Auto-halt after flatten
    halt('Flatten All executed');

    return results;
}

// ─── GATE CHECK ───────────────────────────────────────────

/**
 * Main gate: should we allow a new trade?
 * @returns {{ allowed: boolean, reason: string }}
 */
function canTrade() {
    if (killed) return { allowed: false, reason: `HALTED: ${killReason || 'Kill Switch active'}` };

    _cleanupCBWindow();
    if (lossEvents.length >= cbConfig.maxLosses) {
        return { allowed: false, reason: `Circuit Breaker: ${lossEvents.length}/${cbConfig.maxLosses} losses` };
    }

    if (ddTripped) {
        return { allowed: false, reason: 'Drawdown limit exceeded' };
    }

    if (tpConfig.enabled && sessionRealizedPnL >= tpConfig.targetPnL) {
        return { allowed: false, reason: `Profit Target Reached ($${sessionRealizedPnL.toFixed(2)} >= $${tpConfig.targetPnL})` };
    }

    return { allowed: true, reason: 'OK' };
}

// ─── STATUS ───────────────────────────────────────────────

function getFullStatus() {
    return {
        halted: killed,
        killReason,
        killTime,
        circuitBreaker: getCBStatus(),
        drawdown: getDrawdownStatus(),
        session: getSessionStats(),
        canTrade: canTrade(),
    };
}

// ─── UI RENDERING ─────────────────────────────────────────

function renderSafetyPanel() {
    const status = getFullStatus();
    // Compute active trailing stop count from all tracked positions
    let tsActiveCount = 0;
    for (const [, s] of tsState) { if (s && s.active) tsActiveCount++; }
    const ts = { enabled: tsConfig.enabled, activeCount: tsActiveCount };
    const cb = status.circuitBreaker;
    const dd = status.drawdown;
    const sess = status.session;

    const haltClass = status.halted ? 'bg-red-600' : 'bg-white/5';
    const haltLabel = status.halted ? '🔴 HALTED' : '🟢 ACTIVE';
    const ddColor = dd.drawdownPct > dd.maxAllowedPct * 0.7 ? 'text-bb-red' : 'text-bb-green';
    const cbColor = cb.losses >= cb.maxLosses * 0.7 ? 'text-bb-red' : 'text-bb-green';
    const tsColor = ts.enabled ? 'text-bb-green' : 'text-bb-muted';
    const tpColor = (sess.targetEnabled && sess.realizedPnL >= sess.targetPnL) ? 'text-bb-green' : 'text-white';

    return `
    <div class="panel mt-2 p-3 ${haltClass} border border-white/10 rounded" id="safety-panel">
      <div class="flex items-center justify-between mb-2">
        <div class="text-[10px] font-black text-bb-muted uppercase tracking-wider">🛡️ Safety Controls</div>
        <div class="text-[10px] font-bold ${status.halted ? 'text-red-400' : 'text-bb-green'}">${haltLabel}</div>
      </div>
      <div class="flex gap-1.5 mb-2">
        <button id="safety-halt-btn" class="px-2 py-1 text-[9px] font-bold rounded ${status.halted ? 'bg-red-700 text-white' : 'bg-red-600/20 text-red-400 hover:bg-red-600/40'}" ${status.halted ? 'disabled' : ''}>🔴 HALT</button>
        <button id="safety-resume-btn" class="px-2 py-1 text-[9px] font-bold rounded ${!status.halted ? 'bg-white/5 text-bb-muted' : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'}">🟢 RESUME</button>
        <button id="safety-flatten-btn" class="px-2 py-1 text-[9px] font-bold rounded bg-orange-600/20 text-orange-400 hover:bg-orange-600/40">🚨 FLATTEN ALL</button>
        <button id="safety-reset-btn" class="px-2 py-1 text-[9px] font-bold rounded bg-white/5 text-bb-muted hover:bg-white/10">↻ Reset</button>
      </div>
      <div class="grid grid-cols-4 gap-2 text-[9px]">
        <div>
          <div class="text-bb-muted">Circuit Breaker</div>
          <div class="${cbColor} font-bold">${cb.losses}/${cb.maxLosses} losses</div>
        </div>
        <div>
          <div class="text-bb-muted">Drawdown</div>
          <div class="${ddColor} font-bold">${dd.drawdownPct.toFixed(2)}%</div>
        </div>
        <div>
          <div class="text-bb-muted">Session PnL</div>
          <div class="${status.session.realizedPnL >= 0 ? 'text-bb-green' : 'text-bb-red'} font-bold">$${status.session.realizedPnL.toFixed(2)}</div>
        </div>
        <div>
            <div class="text-bb-muted">Trailing Stop</div>
            <div class="${tsColor} font-bold">${ts.enabled ? 'ON' : 'OFF'} (${ts.activeCount})</div>
        </div>
      </div>
      
      <!-- CONTROLS ROW -->
      <div class="mt-2 grid grid-cols-2 gap-2 text-[8px] border-t border-white/5 pt-2">
        <!-- CB Config -->
        <div class="flex items-center gap-1">
          <label class="text-bb-muted">Max Loss:</label>
          <input id="safety-cb-max" type="number" value="${cb.maxLosses}" min="1" max="50" class="w-8 bg-bb-black border border-white/10 text-white text-center rounded">
          <label class="text-bb-muted">in</label>
          <input id="safety-cb-window" type="number" value="${Math.round(cb.windowMs / 60000)}" min="1" max="60" class="w-8 bg-bb-black border border-white/10 text-white text-center rounded">
          <span class="text-bb-muted">m</span>
        </div>
        
        <!-- DD Config -->
        <div class="flex items-center gap-1 justify-end">
          <label class="text-bb-muted">Max DD:</label>
          <input id="safety-dd-max" type="number" value="${dd.maxAllowedPct}" min="1" max="50" step="0.5" class="w-10 bg-bb-black border border-white/10 text-white text-center rounded">
          <span class="text-bb-muted">%</span>
        </div>

        <!-- Profit Target (NEW) -->
        <div class="flex items-center gap-1 col-span-2 bg-white/5 p-1 rounded">
           <input type="checkbox" id="safety-tp-enable" ${sess.targetEnabled ? 'checked' : ''}>
           <label class="text-bb-muted">Stop if Profit >= $</label>
           <input id="safety-tp-val" type="number" value="${sess.targetPnL}" class="w-12 bg-bb-black border border-white/10 text-white text-center rounded">
           <span class="${tpColor} ml-auto font-bold">${sess.targetEnabled ? (sess.realizedPnL >= sess.targetPnL ? 'REACHED' : 'ACTIVE') : 'OFF'}</span>
        </div>
      </div>

      ${status.halted ? `<div class="mt-1 text-[8px] text-red-400">Reason: ${status.killReason || 'Unknown'}</div>` : ''}
    </div>
  `;
}

function attachSafetyEvents(container) {
    container.querySelector('#safety-halt-btn')?.addEventListener('click', () => {
        halt('Manual halt');
    });

    container.querySelector('#safety-resume-btn')?.addEventListener('click', () => {
        if (confirm('Resume trading? All safety locks will be cleared.')) {
            resume();
        }
    });

    container.querySelector('#safety-flatten-btn')?.addEventListener('click', async () => {
        if (confirm('🚨 FLATTEN ALL — This will close ALL open positions immediately. Are you sure?')) {
            const res = await flattenAll();
            alert(`Flatten: ${res.success}/${res.attempted} closed, ${res.failed} failed`);
        }
    });

    container.querySelector('#safety-reset-btn')?.addEventListener('click', () => {
        if (confirm('Reset session PnL, drawdown, and circuit breaker?')) {
            resetSession();
        }
    });

    container.querySelector('#safety-cb-max')?.addEventListener('change', (e) => {
        configureCB({ maxLosses: parseInt(e.target.value) || 3 });
    });

    container.querySelector('#safety-cb-window')?.addEventListener('change', (e) => {
        configureCB({ windowMs: (parseInt(e.target.value) || 5) * 60_000 });
    });

    container.querySelector('#safety-dd-max')?.addEventListener('change', (e) => {
        configureDD({ maxDrawdownPct: parseFloat(e.target.value) || 5 });
    });

    // Profit Target Events
    container.querySelector('#safety-tp-enable')?.addEventListener('change', (e) => {
        configureTP({ enabled: e.target.checked });
        renderSafetyPanel(); // re-render to update status label
    });

    container.querySelector('#safety-tp-val')?.addEventListener('change', (e) => {
        configureTP({ targetPnL: parseFloat(e.target.value) || 0 });
    });
}

// ─── EXPORTS ──────────────────────────────────────────────

export default {
    // Kill Switch
    halt,
    resume,
    isHalted,
    // Circuit Breaker
    recordLoss,
    getCBStatus,
    configureCB,
    // Drawdown
    updateEquity,
    getDrawdownStatus,
    configureDD,
    // Session
    addRealizedPnL,
    getSessionStats,
    resetSession,
    // Profit Target
    configureTP,
    // Trailing Stop
    updateTrailingStop,
    configureTS,
    getTSStatus,
    // Flatten
    flattenAll,
    // Gate
    canTrade,
    // Status
    getFullStatus,
    // UI
    renderSafetyPanel,
    attachSafetyEvents,
};
