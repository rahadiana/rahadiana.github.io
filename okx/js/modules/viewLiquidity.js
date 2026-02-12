import * as Utils from '../utils.js';
import * as OkxWs from '../okx_ws.js';

let activeCoinId = null;
let lastMarketDataReference = null;
let localAsks = new Map();
let localBids = new Map();
let lastHighBid = 0;
let lastHighBidSize = 0;
let lastLowAsk = 0;
let lastLowAskSize = 0;
let ofiAccumulator = 0;
let currentSubscriptionCallback = null;

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col gap-3 p-2 bg-bb-black font-mono overflow-hidden">
            
            <!-- HEADER -->
            <div class="flex justify-between items-center border-b border-bb-border pb-1 shrink-0">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-bold uppercase tracking-tighter">LIQUIDITY & DEPTH ENGINE</span>
                    <span class="text-[8px] bg-bb-gold/10 text-bb-gold px-1.5 py-0.5 rounded border border-bb-gold/30">L-TIER 3</span>
                    <span id="liq-book-health" class="text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-widest bg-white/5 text-bb-muted border-white/10">SCANNING</span>
                </div>
                <div id="liq-total-depth-badge" class="text-[10px] text-bb-muted">$0.00M TOTAL DEPTH</div>
            </div>

            <!-- TOP GRID: OFI & SUMMARY -->
            <div class="grid grid-cols-12 gap-3 shrink-0">
                <!-- OFI SCORE -->
                <div class="col-span-3 panel flex flex-col items-center justify-center p-3 relative overflow-hidden h-24">
                    <div class="absolute top-1 left-2 text-[8px] text-bb-muted uppercase flex items-center gap-1">
                        Pressure
                        <span class="w-1 h-1 rounded-full bg-bb-green animate-ping"></span>
                    </div>
                    <div class="text-3xl font-black italic text-white" id="liq-ofi-score">50</div>
                    <div id="liq-ofi-label" class="text-[8px] font-bold mt-1 uppercase tracking-widest px-1.5 rounded border">NEUTRAL</div>
                </div>


                <!-- DEPTH SUMMARY BARS & WALL INTENSITY -->
                <div class="col-span-6 panel flex flex-col p-3 h-24 gap-2">
                    <div class="flex justify-between items-center text-[9px] uppercase font-bold text-bb-muted">
                        <span>Book Metrics</span>
                        <div class="flex gap-4">
                            <span class="text-bb-green" id="liq-bid-sum">$0</span>
                            <span class="text-bb-red" id="liq-ask-sum">$0</span>
                        </div>
                    </div>
                    
                    <!-- Gauge 1: Global Depth Imbalance -->
                    <div class="flex flex-col gap-1">
                        <div class="h-1.5 bg-bb-dark rounded-full overflow-hidden flex border border-white/5">
                            <div id="liq-bid-bar" class="h-full bg-bb-green transition-all duration-500" style="width: 50%"></div>
                            <div id="liq-ask-bar" class="h-full bg-bb-red transition-all duration-500" style="width: 50%"></div>
                        </div>
                        <div class="flex justify-between text-[7px] text-bb-muted uppercase tracking-tighter">
                            <span>Bids (Global)</span><span>Imbalance Index</span><span>Asks (Global)</span>
                        </div>
                    </div>

                    <!-- Gauge 2: institutional Wall Intensity (Large Blocks) -->
                    <div class="flex flex-col gap-1">
                         <div class="w-full h-1.5 bg-bb-dark border border-white/10 rounded-full relative">
                             <div id="liq-wall-pin" class="absolute top-0 bottom-0 w-1 bg-bb-blue shadow-[0_0_8px_cyan] transform -translate-x-1/2 left-1/2"></div>
                         </div>
                         <div class="flex justify-between text-[7px] text-bb-blue uppercase font-black tracking-tighter">
                             <span>Wall Support</span><span>Block Intensity Index</span><span>Wall Resistance</span>
                         </div>
                    </div>
                </div>

                <!-- PRICE IMPACT MATRIX (SLIPPAGE) -->
                <div class="col-span-3 panel flex flex-col p-2 h-24 overflow-hidden">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[8px] text-bb-blue font-bold uppercase tracking-wider">Price Impact Matrix</span>
                        <div class="flex gap-1">
                            <div class="w-1 h-1 rounded-full bg-bb-blue"></div>
                            <div class="w-1 h-1 rounded-full bg-bb-blue/30"></div>
                        </div>
                    </div>
                    <div class="flex-1 flex flex-col justify-between py-1">
                        <div class="flex justify-between items-center px-1">
                            <span class="text-[8px] text-bb-muted">1K ORDER</span>
                            <span class="text-[10px] font-mono font-bold text-white/90" id="liq-slip-1k">0.000%</span>
                        </div>
                        <div class="flex justify-between items-center px-1 bg-white/5 rounded-sm">
                            <span class="text-[8px] text-bb-muted">10K ORDER</span>
                            <span class="text-[10px] font-mono font-bold text-white/90" id="liq-slip-10k">0.000%</span>
                        </div>
                        <div class="flex justify-between items-center px-1">
                            <span class="text-[8px] text-bb-muted">100K ORDER</span>
                            <span class="text-[10px] font-mono font-black text-bb-blue" id="liq-slip-100k">0.000%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENT: DEPTH PROFILE CHART (LADDER) -->
            <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- CHART PANEL -->
                <div class="panel flex flex-col overflow-hidden">
                    <div class="panel-header flex justify-between">
                        <span>DEPTH PROFILE LADDER</span>
                        <span class="text-bb-gold">PRICE CLUSTERS</span>
                    </div>
                    <div class="flex-1 overflow-y-auto scrollbar-thin p-1" id="liq-depth-profile-ladder">
                        <!-- Injected dynamically -->
                        <div class="h-full flex items-center justify-center text-bb-muted italic text-[9px]">Initializing depth stream...</div>
                    </div>
                </div>

                <!-- WALL DETECTOR & RECOM -->
                <div class="panel flex flex-col overflow-hidden">
                    <div class="panel-header text-bb-blue">INSTITUTIONAL WALLS</div>
                    <div class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
                        <div id="liq-walls-list" class="space-y-1">
                            <!-- Injected -->
                        </div>
                        <div class="p-3 bg-bb-dark/50 border border-white/5 rounded">
                            <h4 class="text-bb-gold text-[9px] font-bold mb-3 uppercase flex justify-between">
                                <span>Liquidity Intelligence</span>
                                <span class="text-bb-blue">Magnet Engine</span>
                            </h4>
                            
                            <!-- LIQUIDATION GRAVITY ZONES -->
                            <div class="grid grid-cols-1 gap-2 mb-3" id="liq-gravity-matrix">
                                <div class="p-2 bg-bb-red/5 border border-bb-red/20 rounded relative overflow-hidden">
                                     <div class="flex justify-between items-center mb-1">
                                         <span class="text-[8px] text-bb-red font-black uppercase">Short Liq Hunt</span>
                                         <span id="liq-mag-short-px" class="text-[10px] font-mono text-white">0.0000</span>
                                     </div>
                                     <div class="h-1 bg-bb-dark rounded-full overflow-hidden">
                                         <div id="liq-mag-short-bar" class="h-full bg-bb-red shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-1000" style="width: 0%"></div>
                                     </div>
                                </div>
                                <div class="p-2 bg-bb-green/5 border border-bb-green/20 rounded relative overflow-hidden">
                                     <div class="flex justify-between items-center mb-1">
                                         <span class="text-[8px] text-bb-green font-black uppercase">Long Liq Hunt</span>
                                         <span id="liq-mag-long-px" class="text-[10px] font-mono text-white">0.0000</span>
                                     </div>
                                     <div class="h-1 bg-bb-dark rounded-full overflow-hidden">
                                         <div id="liq-mag-long-bar" class="h-full bg-bb-green shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all duration-1000" style="width: 0%"></div>
                                     </div>
                                </div>
                            </div>

                            <p id="liq-intelligence-text" class="text-[9px] text-bb-text leading-relaxed italic border-t border-white/5 pt-2">Monitoring orderbook concentration for institutional footprints...</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;
}

export function update(data, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    if (!data) return;
    const coinId = data.coin;
    lastMarketDataReference = data;

    // Manage Live WebSocket Subscription
    if (activeCoinId !== coinId) {
        if (activeCoinId && currentSubscriptionCallback) {
            console.log(`[LIQUIDITY] Switching stream from ${activeCoinId} to ${coinId}`);
            OkxWs.unsubscribe(activeCoinId, currentSubscriptionCallback, 'optimized-books');
        }

        console.log(`[LIQUIDITY] Activating High-Fidelity stream for: ${coinId}`);
        activeCoinId = coinId;
        localAsks.clear();
        localBids.clear();

        currentSubscriptionCallback = (wsRes) => {
            if (activeCoinId === coinId) {
                processWsData(wsRes);
            }
        };

        OkxWs.subscribe(coinId, currentSubscriptionCallback, 'optimized-books');
    }

    const ob = data.raw?.OB || {};
    const signalsObj = data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.signals || {};
    const ofi = signalsObj.orderBook?.ofi || { normalizedScore: 50 };

    // 1. OFI & Basic Summary
    const elOfiScore = document.getElementById('liq-ofi-score');
    const elOfiLabel = document.getElementById('liq-ofi-label');
    if (elOfiScore) elOfiScore.innerText = ofi.normalizedScore || 50;
    if (elOfiLabel) {
        const score = ofi.normalizedScore || 50;
        elOfiLabel.innerText = score > 60 ? 'BUY PRESSURE' : score < 40 ? 'SELL PRESSURE' : 'EQUILIBRIUM';
        elOfiLabel.className = `text-[8px] font-bold mt-1 uppercase tracking-widest px-1.5 rounded border ${score > 60 ? 'border-bb-green text-bb-green bg-bb-green/5' : score < 40 ? 'border-bb-red text-bb-red bg-bb-red/5' : 'border-bb-border text-bb-muted'}`;
    }

    const bids = ob.bidDepth || 0;
    const asks = ob.askDepth || 0;
    const total = bids + asks;

    // 0. Book Health Update
    const healthEl = document.getElementById('liq-book-health');
    if (healthEl) {
        const health = ob.bookHealth || 'N/A';
        healthEl.innerText = health;
        let healthClass = 'bg-bb-green/10 text-bb-green border-bb-green/30';
        if (['FRAGILE', 'THIN', 'CAUTION'].includes(health)) healthClass = 'bg-bb-gold/10 text-bb-gold border-bb-gold/30';
        if (['CRITICAL', 'DISRUPTED', 'EMPTY'].includes(health)) healthClass = 'bg-bb-red/10 text-bb-red border-bb-red/30';
        if (health === 'N/A') healthClass = 'bg-white/5 text-bb-muted border-white/10';
        healthEl.className = `text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-widest ${healthClass}`;
    }
    const bidPct = total > 0 ? (bids / total) * 100 : 50;

    const elTotalBadge = document.getElementById('liq-total-depth-badge');
    if (elTotalBadge) elTotalBadge.innerText = `$${Utils.formatNumber(total / 1000000, 2)}M TOTAL DEPTH`;

    document.getElementById('liq-bid-sum').innerText = `$${Utils.formatNumber(bids)}`;
    document.getElementById('liq-ask-sum').innerText = `$${Utils.formatNumber(asks)}`;
    document.getElementById('liq-bid-bar').style.width = `${bidPct}%`;
    document.getElementById('liq-ask-bar').style.width = `${100 - bidPct}%`;

    // 2. Wall Intensity Index (Centralized Calculation)
    const wallPin = document.getElementById('liq-wall-pin');
    if (wallPin) {
        const rawWalls = [
            ...(ob.depthProfile?.heatmap?.askWalls || []).map(w => ({ ...w, side: 'ASK' })),
            ...(ob.depthProfile?.heatmap?.bidWalls || []).map(w => ({ ...w, side: 'BID' })),
            ...(ob.askWalls || []).map(w => ({ ...w, side: 'ASK' })),
            ...(ob.bidWalls || []).map(w => ({ ...w, side: 'BID' }))
        ];

        const bidWallSum = rawWalls.filter(w => w.side === 'BID').reduce((s, w) => s + (w.size * w.price), 0);
        const askWallSum = rawWalls.filter(w => w.side === 'ASK').reduce((s, w) => s + (w.size * w.price), 0);
        const wallTotal = bidWallSum + askWallSum;

        const intensityLeft = wallTotal > 0 ? (bidWallSum / wallTotal) * 100 : 50;
        wallPin.style.left = `${Math.max(5, Math.min(95, intensityLeft))}%`;
    }

    const spread = ob.spreadBps || 0;

    // 2. Price Impact Matrix (Slippage Breakdown)
    const metrics = signalsObj.orderBook?.slippageScore?.metadata || {};

    const getSlip = (sigVal, rawVal, fallback) => {
        let val = sigVal || rawVal;
        if (!val || val === 0) val = fallback;
        return Math.max(0.001, val);
    };

    const slip1k = getSlip(metrics.slippage1k, ob.slippage1k, (spread / 200));
    const slip10k = getSlip(metrics.slippage10k, ob.slippage10k, slip1k * 5);
    const slip100k = getSlip(metrics.slippage100k, ob.slippage100k, slip10k * 5);

    const updateSlipEl = (id, val) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerText = `${Utils.safeFixed(val, 3)}%`;
        el.className = `text-[10px] font-mono font-bold ${val > 0.5 ? 'text-bb-red' : val > 0.1 ? 'text-bb-gold' : id === 'liq-slip-100k' ? 'text-bb-blue' : 'text-white/90'}`;
    };

    updateSlipEl('liq-slip-1k', slip1k);
    updateSlipEl('liq-slip-10k', slip10k);
    updateSlipEl('liq-slip-100k', slip100k);

    // 3. DEPTH PROFILE LADDER
    renderLadder();

    // 4. Walls Intelligence (Institutional Scale Fix)
    const elWalls = document.getElementById('liq-walls-list');
    const elIntel = document.getElementById('liq-intelligence-text');
    if (elWalls && elIntel) {
        const coinSymbol = (data.coin || 'ASSET');
        const liq = data.raw?.LIQ || {};
        const lastPx = data.raw?.PRICE?.last || 0;

        // Magnet Logic
        const shortMagPx = liq.avgShortLiqPx || 0;
        const longMagPx = liq.avgLongLiqPx || 0;

        const updateMag = (idPx, idBar, targetPx) => {
            const elPx = document.getElementById(idPx);
            const elBar = document.getElementById(idBar);
            if (!elPx || !elBar) return;

            elPx.innerText = targetPx > 0 ? Utils.formatPrice(targetPx) : 'OFFLINE';
            if (targetPx > 0 && lastPx > 0) {
                const dist = Math.abs(targetPx - lastPx) / lastPx;
                const gravity = Math.max(0, Math.min(100, (1 - (dist / 0.025)) * 100)); // 2.5% range
                elBar.style.width = `${gravity}%`;
            } else {
                elBar.style.width = '0%';
            }
        };

        updateMag('liq-mag-short-px', 'liq-mag-short-bar', shortMagPx);
        updateMag('liq-mag-long-px', 'liq-mag-long-bar', longMagPx);

        // Raw Walls Processing
        const rawWalls = [
            ...(ob.depthProfile?.heatmap?.askWalls || []).map(w => ({ ...w, side: 'ASK' })),
            ...(ob.depthProfile?.heatmap?.bidWalls || []).map(w => ({ ...w, side: 'BID' })),
            ...(ob.askWalls || []).map(w => ({ ...w, side: 'ASK' })),
            ...(ob.bidWalls || []).map(w => ({ ...w, side: 'BID' }))
        ];

        const validWalls = rawWalls
            .filter(w => w && w.price > 0 && w.size > 0)
            .sort((a, b) => b.size - a.size)
            .slice(0, 5);

        if (validWalls.length === 0) {
            elWalls.innerHTML = `
                <div class="flex flex-col items-center justify-center py-6 gap-2 border border-dashed border-white/5 rounded">
                    <span class="text-[10px] text-bb-blue font-bold opacity-30 tracking-widest">SCANNING...</span>
                    <div class="text-[8px] text-bb-muted italic">No institutional block orders detected.</div>
                </div>
            `;
            elIntel.innerText = "Orderbook appears balanced. Liquidation magnets monitored for volatility triggers.";
        } else {
            elWalls.innerHTML = validWalls.map(w => {
                const usdValue = w.size * w.price;
                const formattedCoinSize = Utils.formatNumber(w.size);
                const formattedUsdValue = Utils.formatNumber(usdValue);

                return `
                <div class="flex flex-col p-2 bg-white/5 rounded border-l-2 ${w.side === 'BID' ? 'border-bb-green shadow-[inset_2px_0_4px_-1px_rgba(34,197,94,0.1)]' : 'border-bb-red shadow-[inset_2px_0_4px_-1px_rgba(239,68,68,0.1)]'}">
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] font-black text-white">${Utils.formatPrice(w.price)}</span>
                        <span class="text-[8px] px-1 bg-white/5 rounded text-bb-muted">${w.side} WALL</span>
                    </div>
                    <div class="flex justify-between items-end mt-1">
                        <span class="text-[11px] font-bold ${w.side === 'BID' ? 'text-bb-green' : 'text-bb-red'}">
                            ${formattedCoinSize} ${coinSymbol}
                        </span>
                        <span class="text-[8px] text-bb-muted font-mono">$${formattedUsdValue}</span>
                    </div>
                </div>
                `;
            }).join('');

            const bigWall = validWalls[0];
            const wallUsd = bigWall.size * bigWall.price;
            let intelMsg = `Heavy concentration of ${bigWall.side === 'BID' ? 'buy' : 'sell'} liquidity ($${Utils.formatNumber(wallUsd)}) detected at ${Utils.formatPrice(bigWall.price)}. `;

            if (shortMagPx > 0 && Math.abs(shortMagPx - lastPx) / lastPx < 0.01) intelMsg += "⚠️ SHORT LIQUIDITY HUNT IN PROGRESS.";
            if (longMagPx > 0 && Math.abs(longMagPx - lastPx) / lastPx < 0.01) intelMsg += "⚠️ LONG LIQUIDITY HUNT IN PROGRESS.";

            elIntel.innerText = intelMsg;
        }
    }
}

function processWsData(res) {
    // Optimized Books: action 'snapshot' clears book. 'update' modifies it.
    if (res.action === 'snapshot') {
        localAsks.clear();
        localBids.clear();
    }

    (res.data || []).forEach(d => {
        if (d.asks) d.asks.forEach(row => {
            const px = parseFloat(row[0]);
            const sz = parseFloat(row[1]); // [price, size, ...]
            if (sz === 0) localAsks.delete(px); else localAsks.set(px, sz);
        });
        if (d.bids) d.bids.forEach(row => {
            const px = parseFloat(row[0]);
            const sz = parseFloat(row[1]);
            if (sz === 0) localBids.delete(px); else localBids.set(px, sz);
        });
    });



    renderLadder();
    calculateOFI(res.data || []);
    updateRealTimeMetrics();
}

function calculateOFI(dataItems) {
    dataItems.forEach(d => {
        if (!d.bids || !d.asks || d.bids.length === 0 || d.asks.length === 0) return;

        const bestBid = parseFloat(d.bids[0][0]);
        const bestBidSize = parseFloat(d.bids[0][1]);
        const bestAsk = parseFloat(d.asks[0][0]);
        const bestAskSize = parseFloat(d.asks[0][1]);

        let deltaBid = 0;
        if (bestBid > lastHighBid) deltaBid = bestBidSize;
        else if (bestBid === lastHighBid) deltaBid = bestBidSize - lastHighBidSize;
        else deltaBid = -lastHighBidSize;

        let deltaAsk = 0;
        if (bestAsk < lastLowAsk) deltaAsk = bestAskSize;
        else if (bestAsk === lastLowAsk) deltaAsk = bestAskSize - lastLowAskSize;
        else deltaAsk = -lastLowAskSize;

        ofiAccumulator += (deltaBid - deltaAsk);

        lastHighBid = bestBid;
        lastHighBidSize = bestBidSize;
        lastLowAsk = bestAsk;
        lastLowAskSize = bestAskSize;
    });
}

function updateRealTimeMetrics() {
    if (localAsks.size === 0 || localBids.size === 0) return;

    // 1. Convert to Arrays for Calculation
    const sortedAsks = Array.from(localAsks.entries()).sort((a, b) => a[0] - b[0]); // Lowest Ask First
    const sortedBids = Array.from(localBids.entries()).sort((a, b) => b[0] - a[0]); // Highest Bid First

    // 2. Book Metrics (Sums & Imbalance)
    const totalBidVal = sortedBids.reduce((acc, [p, s]) => acc + (p * s), 0);
    const totalAskVal = sortedAsks.reduce((acc, [p, s]) => acc + (p * s), 0);

    const elBidSum = document.getElementById('liq-bid-sum');
    const elAskSum = document.getElementById('liq-ask-sum');
    const elBadge = document.getElementById('liq-total-depth-badge');
    const elBidBar = document.getElementById('liq-bid-bar');
    const elAskBar = document.getElementById('liq-ask-bar');

    if (elBidSum) elBidSum.innerText = `$${Utils.formatNumber(totalBidVal)}`;
    if (elAskSum) elAskSum.innerText = `$${Utils.formatNumber(totalAskVal)}`;
    if (elBadge) elBadge.innerText = `$${Utils.formatNumber((totalBidVal + totalAskVal) / 1000000, 2)}M ACTIVE DEPTH`;

    const totalVal = totalBidVal + totalAskVal;
    const bidPct = totalVal > 0 ? (totalBidVal / totalVal) * 100 : 50;
    if (elBidBar) elBidBar.style.width = `${bidPct}%`;
    if (elAskBar) elAskBar.style.width = `${100 - bidPct}%`;

    // 3. Simulated Slippage (Price Impact)
    const calcSlippage = (usdSize, side) => {
        const book = side === 'buy' ? sortedAsks : sortedBids; // Buying eats Asks
        const bestPx = book[0][0];
        let filled = 0;
        let cost = 0;

        for (const [px, sz] of book) {
            const needed = (usdSize - cost) / px; // Approx needed items
            const take = Math.min(sz, needed);
            cost += take * px;
            filled += take;
            if (cost >= usdSize * 0.99) break; // Close enough
        }

        if (cost === 0) return 0;
        const avgPx = cost / filled;
        return (Math.abs(avgPx - bestPx) / bestPx) * 100;
    };

    const slip1k = (calcSlippage(1000, 'buy') + calcSlippage(1000, 'sell')) / 2;
    const slip10k = (calcSlippage(10000, 'buy') + calcSlippage(10000, 'sell')) / 2;
    const slip100k = (calcSlippage(100000, 'buy') + calcSlippage(100000, 'sell')) / 2;

    const updateSlipEl = (id, val) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerText = `${Utils.safeFixed(val, 4)}%`;
        el.className = `text-[10px] font-mono font-bold ${val > 0.5 ? 'text-bb-red' : val > 0.1 ? 'text-bb-gold' : 'text-bb-blue'}`;
    };

    updateSlipEl('liq-slip-1k', slip1k);
    updateSlipEl('liq-slip-10k', slip10k);
    updateSlipEl('liq-slip-100k', slip100k);

    // 4. Institutional Walls (Live Detection)
    const rawWalls = [];
    const avgSize = (totalBidVal + totalAskVal) / (localBids.size + localAsks.size || 1) / ((sortedBids[0]?.[0] + sortedAsks[0]?.[0]) / 2 || 1);

    // Simple block detection: size > 10x average level size
    sortedBids.slice(0, 50).forEach(([p, s]) => { if (s > avgSize * 10) rawWalls.push({ price: p, size: s, side: 'BID' }); });
    sortedAsks.slice(0, 50).forEach(([p, s]) => { if (s > avgSize * 10) rawWalls.push({ price: p, size: s, side: 'ASK' }); });

    const elWalls = document.getElementById('liq-walls-list');
    if (elWalls && rawWalls.length > 0) {
        const coinSymbol = (activeCoinId || 'ASSET');
        elWalls.innerHTML = rawWalls.sort((a, b) => b.size - a.size).slice(0, 5).map(w => `
            <div class="flex flex-col p-2 bg-bb-blue/5 rounded border-l-2 ${w.side === 'BID' ? 'border-bb-green' : 'border-bb-red'} animate-pulse">
                <div class="flex justify-between items-center">
                    <span class="text-[10px] font-black text-white">${Utils.formatPrice(w.price)}</span>
                    <span class="text-[7px] px-1 bg-bb-blue/20 rounded text-bb-blue font-black tracking-tighter">LIVE WS WALL</span>
                </div>
                <div class="flex justify-between items-end mt-1">
                    <span class="text-[11px] font-bold ${w.side === 'BID' ? 'text-bb-green' : 'text-bb-red'}">${Utils.formatNumber(w.size)} ${coinSymbol}</span>
                    <span class="text-[8px] text-bb-muted font-mono">$${Utils.formatNumber(w.size * w.price)}</span>
                </div>
            </div>
        `).join('');
    }

    // 5. Update OFI (Pressure) UI
    const elOfiScore = document.getElementById('liq-ofi-score');
    const elOfiLabel = document.getElementById('liq-ofi-label');
    if (elOfiScore) {
        const normalizedOfi = Math.max(0, Math.min(100, 50 + (ofiAccumulator / 100))); // Scaled for UI
        elOfiScore.innerText = Math.round(normalizedOfi);
        elOfiScore.className = `text-3xl font-black italic ${normalizedOfi > 60 ? 'text-bb-green' : normalizedOfi < 40 ? 'text-bb-red' : 'text-white'}`;

        if (elOfiLabel) {
            elOfiLabel.innerText = normalizedOfi > 60 ? 'BULLISH RADIANCE' : normalizedOfi < 40 ? 'BEARISH PRESSURE' : 'EQUILIBRIUM';
            elOfiLabel.className = `text-[8px] font-bold mt-1 uppercase tracking-widest px-1.5 rounded border ${normalizedOfi > 60 ? 'border-bb-green text-bb-green bg-bb-green/10' : normalizedOfi < 40 ? 'border-bb-red text-bb-red bg-bb-red/10' : 'border-bb-border text-bb-muted'}`;
        }
    }
}

function renderLadder() {
    const ladderContainer = document.getElementById('liq-depth-profile-ladder');
    if (!ladderContainer) return;

    let asksRes = [];
    let bidsRes = [];
    let maxCum = 1;

    // Use WS Data if available
    if (localAsks.size > 0 || localBids.size > 0) {
        const liveAsks = Array.from(localAsks.entries()).map(([p, s]) => ({ price: p, size: s })).sort((a, b) => a.price - b.price);
        const liveBids = Array.from(localBids.entries()).map(([p, s]) => ({ price: p, size: s })).sort((a, b) => b.price - a.price);

        // Calculate Cumulative
        let cA = 0; asksRes = liveAsks.slice(0, 15).map(a => { cA += a.size; return { ...a, cumSize: cA }; }).reverse();
        let cB = 0; bidsRes = liveBids.slice(0, 15).map(b => { cB += b.size; return { ...b, cumSize: cB }; });
        maxCum = Math.max(cA, cB, 1);
    }
    // Fallback System: Server Data
    else if (lastMarketDataReference?.raw?.OB?.depthProfile) {
        const dp = lastMarketDataReference.raw.OB.depthProfile;
        maxCum = Math.max(
            ...(dp.cumulativeAsks || []).map(a => a.cumSize || 0),
            ...(dp.cumulativeBids || []).map(b => b.cumSize || 0),
            1
        );
        asksRes = [...(dp.cumulativeAsks || [])].reverse().slice(0, 15);
        bidsRes = [...(dp.cumulativeBids || [])].slice(0, 15);
    }

    // Try to fetch iceberg reasons for current active coin from HL detector
    const sig = (window.hiddenLiquidityDetector && window.hiddenLiquidityDetector.getSignal) ? window.hiddenLiquidityDetector.getSignal(activeCoinId) : null;
    const icebergReasons = sig?.icebergReasons || [];

    const renderRow = (item, type) => {
        const sideColor = type === 'ask' ? 'bg-bb-red' : 'bg-bb-green';
        const textColor = type === 'ask' ? 'text-bb-red' : 'text-bb-green';
        const barPct = Math.min(100, ((item.cumSize || 0) / (maxCum * 0.8)) * 100);

        // try match an iceberg reason by price (tolerance relative)
        let hlBadge = '';
        let hlClass = '';
        try {
            const match = icebergReasons.find(r => Math.abs((r.price || 0) - (item.price || 0)) <= Math.max((item.price || 1) * 0.0005, 0.0001));
            if (match) {
                hlBadge = `<span class="ml-1 text-[8px] font-black text-bb-gold">HL:${match.refillCount} • ${Utils.formatNumber(match.tradeVolume || 0)}</span>`;
                hlClass = 'ring-1 ring-bb-gold/40 bg-white/3';
            }
        } catch (e) { /* ignore */ }

        return `
            <div class="flex items-center gap-2 h-4 group hover:bg-white/5 px-1 transition-all duration-300 ${hlClass}">
                <div class="w-16 text-[9px] font-mono ${textColor} text-left tracking-tight">${Utils.safeFixed(item.price || 0, getItemPrecision())}${hlBadge}</div>
                <div class="flex-1 h-2.5 bg-bb-dark/50 relative overflow-hidden rounded-sm border border-white/5">
                    <div class="absolute inset-y-0 left-0 ${sideColor} opacity-40 transition-all duration-500" style="width: ${barPct}%"></div>
                    <div class="absolute inset-x-0 inset-y-0 flex items-center justify-end px-2 text-[7px] font-bold text-white/60 z-10">
                        ${Utils.formatNumber(item.size || 0)}
                    </div>
                </div>
                <div class="w-14 text-right text-[8px] text-bb-muted font-mono tracking-tight">${Utils.formatNumber(item.cumSize || 0)}</div>
            </div>
        `;
    };

    const isLive = localAsks.size > 0;
    ladderContainer.innerHTML = `
        <div class="space-y-0.5 relative">
            ${isLive ? `<div class="absolute -top-5 right-0 flex items-center gap-1.5 opacity-80"><span class="w-1.5 h-1.5 rounded-full bg-bb-green shadow-[0_0_5px_lime] animate-pulse"></span><span class="text-[8px] text-bb-green font-black uppercase tracking-widest">LIVE FEED</span></div>` : ''}
            ${asksRes.map(a => renderRow(a, 'ask')).join('')}
            <div class="h-px bg-white/10 my-1 relative flex items-center justify-center">
                 <span class="bg-bb-black px-2 text-[8px] text-white font-black uppercase tracking-widest border border-white/10 rounded-full">SPREAD ${Utils.safeFixed(Math.abs((asksRes[asksRes.length - 1]?.price || 0) - (bidsRes[0]?.price || 0)), getItemPrecision())}</span>
            </div>
            ${bidsRes.map(b => renderRow(b, 'bid')).join('')}
        </div>
    `;
}

function getItemPrecision() {
    const px = lastMarketDataReference?.raw?.PRICE?.last || 0;
    return px < 1 ? 5 : px < 10 ? 4 : 2;
}

export function stop() {
    if (activeCoinId && currentSubscriptionCallback) {
        OkxWs.unsubscribe(activeCoinId, currentSubscriptionCallback, 'optimized-books');
    }
    activeCoinId = null;
    localAsks.clear();
    localBids.clear();
    currentSubscriptionCallback = null;
}


