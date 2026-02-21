import * as Utils from '../utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="h-full grid grid-cols-3 gap-2">
            
            <!-- LEFT COL: ORDER BOOK & LIQUIDITY (Sec 4) -->
            <div class="flex flex-col gap-2">
                
                <!-- 4.1 & 4.5 ORDER BOOK HEALTH & SCORE -->
                <div class="panel h-1/3">
                    <div class="panel-header flex justify-between">
                        <span>LIQUIDITY HEALTH</span>
                        <span class="text-[9px] text-bb-muted" id="book-status">STATUS: --</span>
                    </div>
                    <div class="panel-content grid grid-cols-2 gap-2" id="liq-score">
                        <!-- Injected -->
                    </div>
                </div>

                <!-- 4.1 IMBALANCE & 4.3 WALLS -->
                <div class="panel h-2/3">
                    <div class="panel-header">DEPTH & WALLS</div>
                    <div class="panel-content flex flex-col gap-2" id="ob-analysis">
                        <!-- Injected -->
                    </div>
                </div>

            </div>

            <!-- MID COL: EXECUTION & LEVELS (Sec 4.2 & 11) -->
            <div class="flex flex-col gap-2">
                
                <!-- 4.2 SPREAD & SLIPPAGE -->
                <div class="panel h-1/3">
                    <div class="panel-header">EXECUTION QUALITY</div>
                    <div class="panel-content grid grid-cols-2 gap-2" id="exec-metrics">
                        <!-- Injected -->
                    </div>
                </div>

                <!-- 11.1 SUPPORT & RESISTANCE -->
                <div class="panel h-2/3">
                    <div class="panel-header">KEY PRICE LEVELS</div>
                    <div class="panel-content flex flex-col justify-between" id="sr-levels">
                        <!-- Injected -->
                    </div>
                </div>

            </div>

            <!-- RIGHT COL: RISK & CALCULATOR (Sec 14) -->
            <div class="flex flex-col gap-2">
                
                <!-- 14.1 POSITION CALCULATOR -->
                <div class="panel h-1/2">
                    <div class="panel-header">RISK CALCULATOR (INSTITUTIONAL)</div>
                    <div class="panel-content space-y-2" id="risk-calc">
                        <!-- Injected -->
                    </div>
                </div>

                <!-- 12.1 VWAP & TARGETS -->
                <div class="panel h-1/2">
                    <div class="panel-header">VWAP & TARGETS</div>
                    <div class="panel-content space-y-2" id="vwap-targets">
                        <!-- Injected -->
                    </div>
                </div>

            </div>

        </div>
    `;
}

export function update(data, profile = 'INSTITUTIONAL_BASE', timeframe = '15MENIT') {
    const signalsObj = data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.signals || {};
    const analytics = (signalsObj.analytics && Object.keys(signalsObj.analytics).length > 0)
        ? signalsObj.analytics
        : (data.analytics || {});

    const ob = data.raw?.OB || {};
    const custom = analytics.customMetrics || {};
    const levels = analytics.priceAction || {};
    const lsi = data.microstructure?.lsi; // Root usually has health
    const price = data.raw?.PRICE?.last || 0;
    const vol = analytics.volatility || {};

    updateLiquidityScore(custom, lsi);
    updateOrderBook(ob);
    updateExecution(ob, custom);
    updateLevels(levels, price);
    updateRiskCalc(price, vol);
    updateVWAP(price, analytics);
}

function updateLiquidityScore(custom, lsiData) {
    const el = document.getElementById('liq-score');
    if (!el) return;

    const score = 100 - (custom.LHS || 50);
    const lsiLevel = lsiData?.level || 'NORMAL';

    el.innerHTML = `
        <div class="flex flex-col justify-center items-center bg-bb-dark border border-bb-border p-2">
            <span class="text-[10px] text-bb-muted">LIQUIDITY SCORE</span>
                <span class="text-3xl font-bold ${score > 70 ? 'text-bb-green' : score < 40 ? 'text-bb-red' : 'text-bb-gold'}">${Utils.safeFixed(score, 0)}</span>
            <span class="text-[9px] text-white px-2 rounded ${lsiLevel === 'CRITICAL' ? 'bg-red-900' : 'bg-green-900'}">${lsiLevel}</span>
        </div>
        
        <div class="flex flex-col justify-center px-2 space-y-1">
            <div class="flex justify-between text-xs">
                <span class="text-bb-muted">STOP LOSS (1.5 ATR)</span>
                <span class="font-mono text-bb-red">$${Utils.safeFixed(stopLoss, 4)}</span>
            </div>
             <div class="flex justify-between text-xxs">
                 <span class="text-bb-muted">RESILIENCE</span>
                 <div class="w-12 h-1 bg-bb-dark overflow-hidden"><div class="bg-purple-500 h-full" style="width: ${custom.LRI * 10 || 50}%"></div></div>
             </div>
             <div class="flex justify-between text-xxs">
                 <span class="text-bb-muted">BALANCE</span>
                 <div class="w-12 h-1 bg-bb-dark overflow-hidden"><div class="bg-yellow-500 h-full" style="width: ${(100 - Math.abs(custom.DOBI))}%"></div></div>
             </div>
        </div>
    `;
}

function updateOrderBook(ob) {
    const el = document.getElementById('ob-analysis');
    if (!el || !ob) return;

    const bids = ob.bidDepth || 0;
    const asks = ob.askDepth || 0;
    const total = bids + asks;
    const bidPct = total > 0 ? (bids / total) * 100 : 50;

    // Wall detection logic placeholder (using depth imbalance as proxy for now)
    const wallSide = asks > bids * 1.5 ? 'ASK WALL' : bids > asks * 1.5 ? 'BID WALL' : 'BALANCED';

    el.innerHTML = `
        <!-- IMBALANCE BAR -->
        <div>
            <div class="flex justify-between text-xs mb-1">
                 <span class="text-bb-green font-bold">BIDS ${Utils.safeFixed(bidPct, 0)}%</span>
                 <span class="text-bb-red font-bold">ASKS ${100 - Utils.safeFixed(bidPct, 0)}%</span>
            </div>
            <div class="w-full h-4 bg-bb-dark rounded flex overflow-hidden border border-bb-border">
                 <div class="bg-bb-green/80 flex items-center justify-center text-[9px] text-black font-bold h-full" style="width: ${bidPct}%">${Utils.formatNumber(bids)}</div>
                 <div class="bg-bb-red/80 flex items-center justify-center text-[9px] text-white font-bold h-full" style="width: ${100 - bidPct}%">${Utils.formatNumber(asks)}</div>
            </div>
        </div>

        <!-- WALL INFO -->
        <div class="flex-1 bg-bb-dark border border-bb-border p-2">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] text-bb-muted">WALL DETECTOR</span>
                <span class="text-xs font-bold ${wallSide.includes('ASK') ? 'text-bb-red' : wallSide.includes('BID') ? 'text-bb-green' : 'text-bb-muted'}">${wallSide}</span>
            </div>
            
            <div class="space-y-1 text-xxs">
                 <div class="flex justify-between">
                     <span class="text-bb-muted">OBI SCORE</span>
                     <span class="${bidPct > 60 ? 'text-bb-green' : bidPct < 40 ? 'text-bb-red' : 'text-white'}">${((bidPct - 50) * Utils.safeFixed(2), 1)}%</span>
                 </div>
                 <div class="flex justify-between">
                     <span class="text-bb-muted">DEPTH USD</span>
                     <span class="text-white">$${Utils.formatNumber((bids + asks) * 0.5)} (Est)</span>
                 </div>
            </div>
        </div>
    `;
}

function updateExecution(ob, custom) {
    const el = document.getElementById('exec-metrics');
    if (!el || !ob) return;

    const spread = ob.spreadBps || 0;
    const slippage = 100 - (custom?.LHS || 0);

    el.innerHTML = `
        <div class="bg-bb-dark p-2 text-center border border-bb-border">
            <div class="text-[9px] text-bb-muted">SPREAD (BPS)</div>
                <div class="text-xl font-bold ${spread < 5 ? 'text-bb-green' : 'text-bb-gold'}">${Utils.safeFixed(spread, 2)}</div>
        </div>
        <div class="bg-bb-dark p-2 text-center border border-bb-border">
            <div class="text-[9px] text-bb-muted">SLIPPAGE SCORE</div>
                <div class="text-xl font-bold ${slippage > 80 ? 'text-bb-green' : 'text-bb-white'}">${Utils.safeFixed(slippage, 0)}</div>
        </div>
    `;
}

function updateLevels(levels, price) {
    const el = document.getElementById('sr-levels');
    if (!el || !price) return;

    // Calculate pivot points (Standard method)
    const high = levels.high || (price * 1.02);
    const low = levels.low || (price * 0.98);
    const close = levels.close || price;

    const pivot = (high + low + close) / 3;
    const r1 = (2 * pivot) - low;
    const s1 = (2 * pivot) - high;
    const r2 = pivot + (high - low);
    const s2 = pivot - (high - low);
    const r3 = high + 2 * (pivot - low);
    const s3 = low - 2 * (high - pivot);

    // Helper to determine color based on distance
    const getDistColor = (level) => {
        const dist = ((level - price) / price) * 100;
        if (Math.abs(dist) < 1) return 'text-bb-gold';
        return dist > 0 ? 'text-bb-red' : 'text-bb-green';
    };

    el.innerHTML = `
        <div class="space-y-0.5">
            <!-- Resistance Levels -->
            <div class="flex items-center gap-2">
                <span class="text-[10px] w-6 text-bb-red font-bold">R3</span>
                <div class="flex-1 h-[2px] bg-bb-red/30 relative">
                        <span class="absolute right-0 -top-2 text-[9px] ${getDistColor(r3)}">$${Utils.safeFixed(r3, 4)} (+${Utils.safeFixed((r3 - price) / price * 100, 1)}%)</span>
                </div>
            </div>
            
            <div class="flex items-center gap-2">
                <span class="text-[10px] w-6 text-bb-red font-bold">R2</span>
                <div class="flex-1 h-[2px] bg-bb-red/40 relative">
                        <span class="absolute right-0 -top-2 text-[9px] ${getDistColor(r2)}">$${Utils.safeFixed(r2, 4)} (+${Utils.safeFixed((r2 - price) / price * 100, 1)}%)</span>
                </div>
            </div>
            
            <div class="flex items-center gap-2">
                <span class="text-[10px] w-6 text-bb-red font-bold">R1</span>
                <div class="flex-1 h-[2px] bg-bb-red/60 relative">
                        <span class="absolute right-0 -top-2 text-[9px] ${getDistColor(r1)}">$${Utils.safeFixed(r1, 4)} (+${Utils.safeFixed((r1 - price) / price * 100, 1)}%)</span>
                </div>
            </div>
            
            <!-- Pivot -->
            <div class="flex items-center gap-2 py-1">
                <span class="text-[10px] w-6 text-bb-gold font-bold">P</span>
                <div class="flex-1 h-px bg-bb-gold border-t-2 border-dashed border-bb-gold relative">
                        <span class="absolute right-0 -top-3 text-[10px] text-bb-gold font-bold">$${Utils.safeFixed(pivot, 4)}</span>
                </div>
            </div>

            <!-- Support Levels -->
            <div class="flex items-center gap-2">
                <span class="text-[10px] w-6 text-bb-green font-bold">S1</span>
                <div class="flex-1 h-[2px] bg-bb-green/60 relative">
                        <span class="absolute right-0 -top-2 text-[9px] ${getDistColor(s1)}">$${Utils.safeFixed(s1, 4)} (${Utils.safeFixed((s1 - price) / price * 100, 1)}%)</span>
                </div>
            </div>
            
            <div class="flex items-center gap-2">
                <span class="text-[10px] w-6 text-bb-green font-bold">S2</span>
                <div class="flex-1 h-[2px] bg-bb-green/40 relative">
                        <span class="absolute right-0 -top-2 text-[9px] ${getDistColor(s2)}">$${Utils.safeFixed(s2, 4)} (${Utils.safeFixed((s2 - price) / price * 100, 1)}%)</span>
                </div>
            </div>
            
            <div class="flex items-center gap-2">
                <span class="text-[10px] w-6 text-bb-green font-bold">S3</span>
                <div class="flex-1 h-[2px] bg-bb-green/30 relative">
                        <span class="absolute right-0 -top-2 text-[9px] ${getDistColor(s3)}">$${Utils.safeFixed(s3, 4)} (${Utils.safeFixed((s3 - price) / price * 100, 1)}%)</span>
                </div>
            </div>
        </div>
        
        <div class="mt-2 text-center bg-bb-dark p-1 border border-bb-border">
             <span class="text-[9px] text-bb-muted block">CURRENT PRICE</span>
             <span class="text-xs text-bb-text font-mono font-bold">${price > pivot ? '📈 ABOVE PIVOT' : '📉 BELOW PIVOT'}</span>
        </div>
    `;
}

function updateRiskCalc(price, vol) {
    const el = document.getElementById('risk-calc');
    if (!el || !price) return;

    const atr = vol?.atr || (price * 0.01); // fallback
    const stopLoss = price - (atr * 1.5);
    const riskDiff = price - stopLoss;

    // Mock Account Size $1000, 1% Risk = $10
    const riskAmt = 10;
    const posSize = riskDiff > 0 ? (riskAmt / riskDiff) : 0;
    const posSizeUsd = posSize * price;

    el.innerHTML = `
        <div class="flex justify-between text-xs border-b border-bb-border pb-1">
            <span class="text-bb-muted">RECC. SIZE</span>
            <span class="font-bold text-white">${Utils.formatNumber(posSize)} COINS</span>
        </div>
        <div class="flex justify-between text-xs border-b border-bb-border pb-1">
            <span class="text-bb-muted">VALUE (1% RISK)</span>
            <span class="font-bold text-bb-gold">$${Utils.formatNumber(posSizeUsd)}</span>
        </div>
        <div class="flex justify-between text-xs">
            <span class="text-bb-muted">STOP LOSS (1.5 ATR)</span>
                <span class="font-mono text-bb-red">$${Utils.safeFixed(stopLoss, 4)}</span>
        </div>
        
        <div class="bg-bb-dark p-1 mt-1 text-center text-[9px] text-bb-muted">
            Based on current volatility (${Utils.safeFixed((atr / price) * 100, 2)}%)
        </div>
    `;
}

function updateVWAP(price, analytics) {
    const el = document.getElementById('vwap-targets');
    if (!el) return;

    // Try both paths: analytics.execution.vwap (primary) or analytics.priceAction.vwap (fallback)
    const vwap = analytics?.execution?.vwap || analytics?.priceAction?.vwap || price;
    const dist = ((price - vwap) / vwap) * 100;

    // Targets (Mock R:R)
    const tp1 = price * 1.015;
    const tp2 = price * 1.03;

    el.innerHTML = `
        <div class="flex justify-between items-center bg-bb-dark p-1 border border-bb-border mb-1">
            <span class="text-[9px] text-bb-muted">VWAP DIST</span>
            <span class="${dist > 0 ? 'text-bb-green' : 'text-bb-red'} font-bold text-xs">${dist > 0 ? '+' : ''}${Utils.safeFixed(dist, 2)}%</span>
        </div>
        
        <div class="space-y-1 text-xs">
             <div class="flex justify-between">
                 <span class="text-bb-muted">TARGET 1 (1.5R)</span>
                 <span class="text-bb-green">$${Utils.safeFixed(tp1, 4)}</span>
             </div>
             <div class="flex justify-between">
                 <span class="text-bb-muted">TARGET 2 (3R)</span>
                 <span class="text-bb-green">$${Utils.safeFixed(tp2, 4)}</span>
             </div>
        </div>
    `;
}