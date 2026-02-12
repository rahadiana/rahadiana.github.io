import * as Utils from '../utils.js';

let lastData = null; // Cache for re-rendering on filter interaction
let activeFilter = 'ALL'; // ALL, SHORTS, LONGS

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex gap-2">
            
            <!-- LEFT: LIQUIDATION HEATMAP (VISUAL) -->
            <div class="panel flex-1 flex flex-col">
                <div class="panel-header flex justify-between items-center">
                    <span>LIQUIDATION HEATMAP (WALLS)</span>
                    <div class="flex gap-1">
                        <button class="filter-btn px-2 py-0.5 text-[9px] bg-bb-dark border border-bb-border rounded hover:bg-white/10 ${activeFilter === 'ALL' ? 'text-white border-white' : 'text-bb-muted'}" data-filter="ALL">ALL</button>
                        <button class="filter-btn px-2 py-0.5 text-[9px] bg-bb-dark border border-bb-border rounded hover:bg-red-900/30 ${activeFilter === 'SHORTS' ? 'text-red-400 border-red-400' : 'text-bb-muted'}" data-filter="SHORTS">SHORTS</button>
                        <button class="filter-btn px-2 py-0.5 text-[9px] bg-bb-dark border border-bb-border rounded hover:bg-green-900/30 ${activeFilter === 'LONGS' ? 'text-green-400 border-green-400' : 'text-bb-muted'}" data-filter="LONGS">LONGS</button>
                    </div>
                </div>
                <div class="panel-content relative flex-1 bg-bb-black overflow-hidden" id="liq-heatmap">
                    <!-- Injected Canvas/Divs -->
                </div>
            </div>

            <!-- RIGHT: CASCADE RISK & STATS -->
            <div class="w-1/3 flex flex-col gap-2">
                
                <!-- 9.2 CASCADE DETECTOR -->
                <div class="panel h-1/3">
                    <div class="panel-header">CASCADE RISK DETECTOR</div>
                    <div class="panel-content space-y-3" id="cascade-risk">
                        <!-- Injected -->
                    </div>
                </div>

                <!-- TOP CLUSTERS TABLE -->
                <div class="panel h-2/3">
                    <div class="panel-header">TOP LIQUIDATION CLUSTERS</div>
                    <div class="panel-content overflow-y-auto scrollbar-thin" id="liq-levels-table">
                        <!-- Injected -->
                    </div>
                </div>

            </div>

        </div>
    `;

    // Attach listeners
    const buttons = container.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeFilter = e.target.getAttribute('data-filter');
            // Re-render buttons state
            buttons.forEach(b => {
                const f = b.getAttribute('data-filter');
                b.className = `filter-btn px-2 py-0.5 text-[9px] bg-bb-dark border border-bb-border rounded hover:bg-white/10 ${f === activeFilter ? (f === 'SHORTS' ? 'text-red-400 border-red-400' : f === 'LONGS' ? 'text-green-400 border-green-400' : 'text-white border-white') : 'text-bb-muted'
                    }`;
            });

            // Force re-render if data exists
            if (lastData) {
                update(lastData);
            }
        });
    });
}

export function update(data, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    if (!data) return;
    lastData = data;

    const signalsObj = data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.signals || {};
    const analytics = (signalsObj.analytics && Object.keys(signalsObj.analytics).length > 0)
        ? signalsObj.analytics
        : (data.analytics || {});

    const price = data.raw?.PRICE?.last || 0;
    const atr = analytics.volatility?.atr || (price * 0.01);
    const liqData = data.raw?.LIQ || {};

    // Calculate Maps
    const liquidationMap = calculateLiquidationMap(price, atr, liqData);

    updateHeatmapDepth(liquidationMap, price, liqData);
    updateCascadeRisk(liquidationMap, price, liqData);
    updateLevelsTable(liquidationMap, price);
}

function calculateLiquidationMap(price, atr, liqData) {
    // 1. Leverage tiers with MMR per-tier (OKX-like approximations)
    const baseLeverages = [
        { x: 100, mmr: 0.005, weight: 1.5 },
        { x: 75,  mmr: 0.0065, weight: 1.3 },
        { x: 50,  mmr: 0.01, weight: 1.2 },
        { x: 25,  mmr: 0.015, weight: 1.0 },
        { x: 20,  mmr: 0.02, weight: 0.9 },
        { x: 10,  mmr: 0.05, weight: 0.7 },
        { x: 5,   mmr: 0.10, weight: 0.5 }
    ];

    let clusters = [];

    // Volume intensity from realized liquidations (scale factor)
    const volIntensity = liqData.totalLiqVol > 0 ? Math.min(2.0, 1.0 + (liqData.totalLiqVol / 1000000)) : 1.0;

    baseLeverages.forEach(l => {
        const entryBuffer = 0.001; // small buffer for spreads
        const dist = l.mmr + entryBuffer;

        // Shorts (RED) - will liquidate above current price
        clusters.push({
            price: price * (1 + dist),
            type: 'SHORT_LIQ',
            lev: l.x,
            vol: 100 * l.weight * volIntensity,
            isForecast: true,
            mmr: l.mmr
        });

        // Longs (GREEN) - will liquidate below current price
        clusters.push({
            price: price * (1 - dist),
            type: 'LONG_LIQ',
            lev: l.x,
            vol: 100 * l.weight * volIntensity,
            isForecast: true,
            mmr: l.mmr
        });
    });

    // 2. Integrate REALIZED liquidations from exchange (The "Facts")
    if (liqData.totalLiqVol > 0) {
        if (liqData.avgShortLiqPx > 0) {
            clusters.push({
                price: liqData.avgShortLiqPx,
                type: 'SHORT_LIQ',
                lev: 'REAL',
                vol: 100, // Full width for real events
                isReal: true,
                count: liqData.shortLiqCount
            });
        }
        if (liqData.avgLongLiqPx > 0) {
            clusters.push({
                price: liqData.avgLongLiqPx,
                type: 'LONG_LIQ',
                lev: 'REAL',
                vol: 100,
                isReal: true,
                count: liqData.longLiqCount
            });
        }
    }

    return clusters.sort((a, b) => b.price - a.price);
}

function updateHeatmapDepth(clusters, price, liqData) {
    const el = document.getElementById('liq-heatmap');
    if (!el) return;

    const rangePct = 0.10; // Zoomed out slightly to see 10x
    const maxPrice = price * (1 + rangePct);
    const minPrice = price * (1 - rangePct);
    const range = maxPrice - minPrice;

    const filtered = clusters.filter(c => {
        if (activeFilter === 'ALL') return true;
        if (activeFilter === 'SHORTS' && c.type === 'SHORT_LIQ') return true;
        if (activeFilter === 'LONGS' && c.type === 'LONG_LIQ') return true;
        return false;
    });

    el.innerHTML = `
        <div class="relative w-full h-full">
            <!-- Price Axis Marker -->
            <div class="absolute w-full flex items-center z-30" style="top: 50%; transform: translateY(-50%);">
                <div class="w-full border-t border-bb-gold/40 border-dashed"></div>
                    <span class="bg-bb-black text-bb-gold text-[10px] px-2 py-0.5 ml-2 border border-bb-gold rounded font-black shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                        ${'$' + Utils.safeFixed(price, price < 1 ? 5 : 2)}
                    </span>
            </div>

            <!-- Heat Clusters -->
            ${filtered.map(c => {
        const rawPos = (maxPrice - c.price) / range;
        if (rawPos < -0.05 || rawPos > 1.05) return '';

        const topPct = rawPos * 100;
        const isShort = c.type === 'SHORT_LIQ';
        const isReal = c.isReal;

        const colorClass = isReal
            ? (isShort ? 'bg-red-500 shadow-[0_0_20px_red]' : 'bg-green-500 shadow-[0_0_20px_#22c55e]')
            : (isShort ? 'bg-gradient-to-r from-transparent via-red-500/30 to-red-600/80' : 'bg-gradient-to-r from-transparent via-green-500/30 to-green-600/80');

        return `
                <div class="absolute right-0 flex items-center justify-end transition-all duration-700" 
                     style="top: ${topPct}%; transform: translateY(-50%); width: ${c.vol}%; height: ${isReal ? '8px' : '4px'}">
                    <div class="w-full h-full ${colorClass} rounded-l-[4px] relative group cursor-crosshair">
                        ${isReal ? `<div class="absolute -left-12 text-[7px] font-black text-white bg-white/10 px-1 rounded animate-pulse">HIT!</div>` : ''}
                        
                        <!-- Tooltip -->
                        <div class="hidden group-hover:block absolute right-full mr-4 bg-bb-dark border border-white/20 p-2 text-[9px] min-w-[120px] z-[100] shadow-2xl">
                             <div class="text-bb-muted uppercase font-bold mb-1">${isReal ? 'Realized Event' : 'Strategic Cluster'}</div>
                             <div class="flex justify-between">
                                <span>TYPE:</span>
                                <span class="${isShort ? 'text-red-400' : 'text-green-400'} font-black">${isShort ? 'SHORT' : 'LONG'}</span>
                             </div>
                             <div class="flex justify-between">
                                <span>PRICE:</span>
                                        <span class="text-white font-mono font-bold">${c.price ? '$' + Utils.safeFixed(c.price, 4) : '--'}</span>
                             </div>
                             <div class="flex justify-between">
                                <span>LEVEL:</span>
                                <span class="text-bb-gold font-black">${c.lev}${!isReal ? 'x' : ''}</span>
                             </div>
                             ${isReal ? `
                             <div class="mt-1 pt-1 border-t border-white/10 flex justify-between">
                                <span>HIT SIZE:</span>
                                <span class="text-white">${c.count} orders</span>
                             </div>
                             ` : ''}
                        </div>
                    </div>
                </div>
            `;
    }).join('')}

            <!-- Axis Labels -->
            <div class="absolute inset-y-0 left-2 flex flex-col justify-between py-8 text-[8px] text-bb-muted font-bold tracking-tighter opacity-40 pointer-events-none">
                <span>+$${Utils.safeFixed(price * rangePct, 0)} (RESI)</span>
                <span class="text-bb-gold opacity-100">MARKET PRICE</span>
                <span>-$${Utils.safeFixed(price * rangePct, 0)} (SUPP)</span>
            </div>
        </div>
    `;
}

function updateCascadeRisk(clusters, price, liqData) {
    const el = document.getElementById('cascade-risk');
    if (!el) return;

    // Nearest Forecast Clusters
    const nearestShort = clusters.filter(c => c.type === 'SHORT_LIQ' && c.isForecast).sort((a, b) => a.price - b.price)[0];
    const nearestLong = clusters.filter(c => c.type === 'LONG_LIQ' && c.isForecast).sort((a, b) => b.price - a.price)[0];

    const distS = nearestShort ? ((nearestShort.price - price) / price) * 100 : 99;
    const distL = nearestLong ? ((price - nearestLong.price) / price) * 100 : 99;

    const riskS = distS < 1.0;
    const riskL = distL < 1.0;
    const realHit = liqData.totalLiqVol > 0;

    let status = 'STABLE';
    let color = 'text-bb-green';
    let msg = 'Price is clear of major liquidation clusters.';

    if (realHit) {
        status = 'ACTIVE BURST';
        color = 'text-bb-red animate-ping';
        msg = `Detecting realized liquidations at exchange level. High volatility environment.`;
    } else if (riskS || riskL) {
        status = 'CASCADE RISK';
        color = 'text-bb-gold animate-pulse';
        msg = `Approaching concentrated ${riskS ? 'Short' : 'Long'} clusters (~${riskS ? Utils.safeFixed(distS, 1) : Utils.safeFixed(distL, 1)}%). Squeeze likely.`;
    }

    el.innerHTML = `
        <div class="bg-bb-dark/50 border border-bb-border rounded p-3 text-center">
            <div class="text-[8px] text-bb-muted uppercase tracking-widest mb-1">PROBABILITY INDEX</div>
            <div class="text-2xl font-black ${color}">${status}</div>
        </div>

        <div class="p-2 bg-white/5 border-l-2 ${realHit ? 'border-bb-red' : (riskS || riskL ? 'border-bb-gold' : 'border-bb-green')} rounded-r text-[10px] leading-relaxed">
            ${msg}
        </div>

        <div class="grid grid-cols-2 gap-2">
            <div class="p-2 bg-bb-dark rounded border border-white/5">
                <div class="text-[7px] text-bb-muted uppercase">Short Wall</div>
                    <div class="text-[11px] font-mono font-bold text-bb-red">${nearestShort?.price ? '$' + Utils.safeFixed(nearestShort.price, 2) : '--'}</div>
                    <div class="text-[9px] text-white/40">${Utils.safeFixed(distS, 2)}% dist</div>
            </div>
            <div class="p-2 bg-bb-dark rounded border border-white/5">
                <div class="text-[7px] text-bb-muted uppercase">Long Wall</div>
                    <div class="text-[11px] font-mono font-bold text-bb-green">${nearestLong?.price ? '$' + Utils.safeFixed(nearestLong.price, 2) : '--'}</div>
                    <div class="text-[9px] text-white/40">${Utils.safeFixed(distL, 2)}% dist</div>
            </div>
        </div>
    `;
}

function updateLevelsTable(clusters, price) {
    const el = document.getElementById('liq-levels-table');
    if (!el) return;

    // Filter focus on Strategic Forecasts first, then real events
    const displayList = clusters
        .filter(c => !c.isReal) // Focus table on the 'forecast' map
        .sort((a, b) => Math.abs(a.price - price) - Math.abs(b.price - price))
        .slice(0, 15);

    el.innerHTML = `
        <table class="w-full text-left text-[10px]">
            <thead class="bg-bb-panel sticky top-0 text-[8px] text-bb-muted font-black border-b border-bb-border">
                <tr>
                    <th class="p-2">TYPE</th>
                    <th class="p-2">LEV</th>
                    <th class="p-2">TARGET PX</th>
                    <th class="p-2 text-right">DIST %</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
                ${displayList.map(c => {
        const dist = ((c.price - price) / price) * 100;
        const isUrgent = Math.abs(dist) < 1.5;
        return `
                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="p-2 font-bold ${c.type === 'SHORT_LIQ' ? 'text-bb-red' : 'text-bb-green'}">${c.type === 'SHORT_LIQ' ? 'SHORT' : 'LONG'}</td>
                        <td class="p-2 font-mono text-bb-muted">${c.lev}x</td>
                        <td class="p-2 font-mono text-white">$${Utils.safeFixed(c.price, price < 1 ? 5 : 2)}</td>
                        <td class="p-2 text-right font-mono ${isUrgent ? 'text-bb-red font-black' : 'text-white/60'}">${dist > 0 ? '+' : ''}${Utils.safeFixed(dist, 2)}%</td>
                    </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;
}
