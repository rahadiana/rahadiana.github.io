import * as Utils from '../utils.js';

let currentMode = 'LIQUIDATION'; // Default mode
let lastState = null;
let lastRenderTime = 0;
const RENDER_THROTTLE = 3000; // Reduced to 3 seconds for better responsiveness

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-mono overflow-hidden">
            <!-- TOP SUB-NAV -->
            <div class="flex items-stretch bg-bb-panel border-b border-bb-border h-8 shrink-0 px-3 gap-1">
                <div class="flex items-center gap-2 mr-4">
                    <span class="text-bb-gold font-black text-[10px] uppercase tracking-widest">GLOBAL HEATMAP</span>
                </div>
                
                <button id="btn-view-liq" class="px-3 h-full flex items-center text-[10px] font-black tracking-tight transition-all ${currentMode === 'LIQUIDATION' ? 'text-bb-gold border-b-2 border-bb-gold bg-bb-gold/10' : 'text-bb-muted border-b-2 border-transparent hover:text-white'}">LIQUIDATION</button>
                <button id="btn-view-price" class="px-3 h-full flex items-center text-[10px] font-black tracking-tight transition-all ${currentMode === 'PRICE' ? 'text-bb-gold border-b-2 border-bb-gold bg-bb-gold/10' : 'text-bb-muted border-b-2 border-transparent hover:text-white'}">PRICE</button>
                <button id="btn-view-radar" class="px-3 h-full flex items-center text-[10px] font-black tracking-tight transition-all ${currentMode === 'SMI_RADAR' ? 'text-bb-gold border-b-2 border-bb-gold bg-bb-gold/10' : 'text-bb-muted border-b-2 border-transparent hover:text-white'}">RADAR</button>
                <button id="btn-view-mtf" class="px-3 h-full flex items-center text-[10px] font-black tracking-tight transition-all ${currentMode === 'MTF_HEATMAP' ? 'text-bb-gold border-b-2 border-bb-gold bg-bb-gold/10' : 'text-bb-muted border-b-2 border-transparent hover:text-white'}">CONVERGENCE</button>
                <button id="btn-view-beta" class="px-3 h-full flex items-center text-[10px] font-black tracking-tight transition-all ${currentMode === 'BTC_BETA' ? 'text-bb-gold border-b-2 border-bb-gold bg-bb-gold/10' : 'text-bb-muted border-b-2 border-transparent hover:text-white'}">BTC BETA</button>
                <button id="btn-view-alpha" class="px-3 h-full flex items-center text-[10px] font-black tracking-tight transition-all ${currentMode === 'ALPHA_SCANNER' ? 'text-bb-gold border-b-2 border-bb-gold bg-bb-gold/10' : 'text-bb-muted border-b-2 border-transparent hover:text-white'}">ALPHA</button>
                <button id="btn-view-funding" class="px-3 h-full flex items-center text-[10px] font-black tracking-tight transition-all ${currentMode === 'FUNDING' ? 'text-bb-gold border-b-2 border-bb-gold bg-bb-gold/10' : 'text-bb-muted border-b-2 border-transparent hover:text-white'}">FUNDING</button>
                <button id="btn-view-vol" class="px-3 h-full flex items-center text-[10px] font-black tracking-tight transition-all ${currentMode === 'VOLATILITY' ? 'text-bb-gold border-b-2 border-bb-gold bg-bb-gold/10' : 'text-bb-muted border-b-2 border-transparent hover:text-white'}">VOL</button>
                <button id="btn-view-sizing" class="px-3 h-full flex items-center text-[10px] font-black tracking-tight transition-all ${currentMode === 'SIZING' ? 'text-bb-gold border-b-2 border-bb-gold bg-bb-gold/10' : 'text-bb-muted border-b-2 border-transparent hover:text-white'}">SIZING</button>

                <button id="btn-refresh-heatmap" class="ml-2 px-3 h-full flex items-center text-[9px] font-bold text-bb-muted hover:text-bb-gold transition-colors border-l border-bb-border group">
                    <span class="mr-1 group-active:rotate-180 transition-transform duration-300">↻</span> REFRESH
                </button>

                <div class="flex items-center gap-2 ml-auto border-l border-bb-border pl-4">
                    <span class="text-[9px] text-bb-muted uppercase">Sync:</span>
                    <span id="heatmap-last-sync" class="text-[9px] font-mono text-bb-green/60">--:--:--</span>
                    <span class="text-[9px] text-bb-muted uppercase ml-2" id="heatmap-total-label">TOTAL 24H LIQ:</span>
                    <span id="heatmap-total" class="text-[10px] font-bold text-white">$0.00</span>
                </div>
            </div>

            <!-- HEATMAP CONTAINER -->
            <div class="flex-1 relative overflow-hidden bg-black/40" id="heatmap-canvas-container">
                <div id="heatmap-grid" class="w-full h-full relative transition-all duration-700">
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-bb-muted opacity-50 uppercase tracking-tighter">
                        <div class="animate-pulse mb-2">Generating Market Matrix...</div>
                        <div class="text-[8px]">Synchronizing Multi-Source Data Streams</div>
                    </div>
                </div>
            </div>
            
            <!-- FOOTER LEGEND -->
            <div class="flex justify-between items-center px-3 py-1 bg-bb-panel border-t border-bb-border text-[9px] text-bb-muted" id="heatmap-legend">
                <div class="flex gap-4">
                    <span class="text-bb-green/80 font-bold underline decoration-bb-green/40 underline-offset-2 uppercase tracking-tighter" id="legend-text">Large Block = High Cumulative Liquidation</span>
                </div>
                <div class="italic text-bb-gold font-bold">Institutional Clustering Engine Active</div>
            </div>
        </div>
    `;

    // Mode Switchers
    container.querySelector('#btn-view-liq').onclick = () => switchMode('LIQUIDATION');
    container.querySelector('#btn-view-price').onclick = () => switchMode('PRICE');
    container.querySelector('#btn-view-radar').onclick = () => switchMode('SMI_RADAR');
    container.querySelector('#btn-view-mtf').onclick = () => switchMode('MTF_HEATMAP');
    container.querySelector('#btn-view-beta').onclick = () => switchMode('BTC_BETA');
    container.querySelector('#btn-view-alpha').onclick = () => switchMode('ALPHA_SCANNER');
    container.querySelector('#btn-view-funding').onclick = () => switchMode('FUNDING');
    container.querySelector('#btn-view-vol').onclick = () => switchMode('VOLATILITY');
    container.querySelector('#btn-view-sizing').onclick = () => switchMode('SIZING');

    container.querySelector('#btn-refresh-heatmap').onclick = () => {
        if (lastState) update(lastState, true);
    };

    // Immediate initial update if state exists
    if (lastState) {
        setTimeout(() => update(lastState, true), 50);
    }
}

function switchMode(mode) {
    currentMode = mode;
    const container = document.getElementById('view-container');
    if (container) render(container);
}

export function update(marketState, force = false) {
    lastState = marketState;
    const now = Date.now();
    if (!force && (now - lastRenderTime < RENDER_THROTTLE)) return;

    const container = document.getElementById('heatmap-grid');
    if (!container) return;
    lastRenderTime = now;

    // Header Sync Updates
    const syncEl = document.getElementById('heatmap-last-sync');
    if (syncEl) syncEl.innerText = new Date().toLocaleTimeString('en-US', { hour12: false });

    // Reset total/label for modes that don't use them or use them differently
    const totalEl = document.getElementById('heatmap-total');
    const labelEl = document.getElementById('heatmap-total-label');
    if (totalEl) totalEl.innerText = ''; // Clear previous value
    if (labelEl) labelEl.innerText = ''; // Clear previous label

    switch (currentMode) {
        case 'LIQUIDATION':
        case 'PRICE':
            renderTreemap(marketState, container);
            break;
        case 'SMI_RADAR':
            renderRadar(marketState, container);
            break;
        case 'MTF_HEATMAP':
            renderConvergence(marketState, container);
            break;
        case 'BTC_BETA':
            renderBeta(marketState, container);
            break;
        case 'ALPHA_SCANNER':
            renderAlpha(marketState, container);
            break;
        case 'FUNDING':
            renderFunding(marketState, container);
            break;
        case 'VOLATILITY':
            renderVolatility(marketState, container);
            break;
        case 'SIZING':
            renderSkew(marketState, container);
            break;
    }

    if (force) {
        container.style.opacity = '0.7';
        setTimeout(() => container.style.opacity = '1', 100);
    }
}

/**
 * HELPER: Treemap (Liquidation & Price)
 */
function renderTreemap(marketState, container) {
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width || (window.innerWidth - 280);
    const height = containerRect.height || (window.innerHeight - 100);

    if (width <= 0 || height <= 0) return;

    let data = [];
    if (currentMode === 'LIQUIDATION') {
        data = Object.keys(marketState).map(id => {
            const liq = marketState[id].raw?.LIQ || {};
            const total = (liq.longLiqVol || 0) + (liq.shortLiqVol || 0);
            return {
                id, coin: id, value: total,
                ratio: total > 0 ? (liq.longLiqVol / total) : 0.5,
                displayVal: total >= 1000000 ? `$${(total / 1000000).toFixed(2)}M` : `$${(total / 1000).toFixed(1)}K`
            };
        }).filter(d => d.value > 0);
    } else { // PRICE mode
        data = Object.keys(marketState).map(id => {
            const price = marketState[id].raw?.PRICE || {};
            const chg = price.percent_change_24h || 0;
            // Size = Magnitude of move (% away from zero)
            const magnitude = Math.abs(chg);
            // Normalize: 0.5 neutral, 0 = -8%, 1 = +8%
            const normalizedChg = Math.max(0, Math.min(1, (chg + 8) / 16));
            return {
                id, coin: id, value: magnitude,
                ratio: normalizedChg,
                chg: chg,
                displayVal: `${chg > 0 ? '+' : ''}${chg.toFixed(2)}%`
            };
        }).filter(d => d.value > 0.1);
    }

    data.sort((a, b) => b.value - a.value);
    if (data.length === 0) {
        container.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-bb-muted uppercase tracking-widest text-[9px]">Awaiting Market Intelligence...</div>`;
        return;
    }

    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    const totalEl = document.getElementById('heatmap-total');
    const labelEl = document.getElementById('heatmap-total-label');
    const legendEl = document.getElementById('legend-text');

    if (totalEl) {
        if (currentMode === 'LIQUIDATION') {
            totalEl.innerText = totalValue >= 1000000 ? `$${(totalValue / 1000000).toFixed(2)}M` : `$${(totalValue / 1000).toFixed(1)}K`;
            labelEl.innerText = 'TOTAL 24H LIQ:';
            legendEl.innerText = 'Block Size = Total Liquidation | Green = Long Liq | Red = Short Liq';
        } else { // PRICE mode
            totalEl.innerText = `${(totalValue / data.length).toFixed(2)}%`;
            labelEl.innerText = 'AVG % CHANGE:';
            legendEl.innerText = 'Block Size = % Movement Intensity | Color = Change Direction';
        }
    }

    const layouts = [];
    function divide(items, x, y, w, h) {
        if (items.length === 0) return;
        if (items.length === 1) { layouts.push({ ...items[0], x, y, w, h }); return; }
        const mid = Math.ceil(items.length / 2);
        const groupA = items.slice(0, mid); const groupB = items.slice(mid);
        const valA = groupA.reduce((s, i) => s + i.value, 0);
        const valB = groupB.reduce((s, i) => s + i.value, 0);
        const ratio = valA / (valA + valB);
        if (w > h) {
            const splitW = w * ratio; divide(groupA, x, y, splitW, h); divide(groupB, x + splitW, y, w - splitW, h);
        } else {
            const splitH = h * ratio; divide(groupA, x, y, w, splitH); divide(groupB, x, y + splitH, w, h - splitH);
        }
    }

    divide(data.slice(0, 50), 0, 0, width, height);

    container.innerHTML = layouts.map(l => {
        let bgColor = '';
        if (currentMode === 'LIQUIDATION') {
            // Dominance intensity: 0.5 is gray, 1.0 is vibrant green, 0.0 is vibrant red
            if (l.ratio > 0.5) {
                const intensity = (l.ratio - 0.5) * 2; // 0 to 1
                bgColor = `34, ${Math.floor(100 + intensity * 120)}, 94`;
            } else {
                const intensity = (0.5 - l.ratio) * 2; // 0 to 1
                bgColor = `${Math.floor(120 + intensity * 119)}, 68, 68`;
            }
        } else { // PRICE mode
            // Price heat: Strong Red -> Dark -> Strong Green
            if (l.ratio > 0.5) {
                const intensity = (l.ratio - 0.5) * 2; // 0 to 1
                bgColor = `34, ${Math.floor(80 + intensity * 150)}, 94`;
            } else {
                const intensity = (0.5 - l.ratio) * 2; // 0 to 1
                bgColor = `${Math.floor(100 + intensity * 150)}, 68, 68`;
            }
        }

        const baseVal = totalValue / layouts.length;
        const opacity = Math.max(0.4, Math.min(0.9, l.value / (baseVal * 2)));

        const fontSize = Math.max(7, Math.min(22, l.w / 6));
        const subFontSize = Math.max(5, Math.min(10, l.w / 12));

        return `
            <div class="absolute border border-black/40 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer hover:ring-1 hover:ring-white/50 z-10"
                 style="left: ${l.x}px; top: ${l.y}px; width: ${l.w}px; height: ${l.h}px; background-color: rgba(${bgColor}, ${opacity});"
                 onclick="window.app.selectCoin('${l.id}')">
                <div class="font-black text-white leading-none mb-0.5 select-none" style="font-size: ${fontSize}px">${l.coin}</div>
                <div class="font-bold text-white/90 leading-none select-none" style="font-size: ${subFontSize}px">${l.displayVal}</div>
            </div>
        `;
    }).join('');
}

/**
 * HELPER: SMI Radar (Bubble Chart)
 */
function renderRadar(marketState, container) {
    const rect = container.getBoundingClientRect();
    const w = rect.width; const h = rect.height;

    // Scale: X = SMI (0-100), Y = Price Chg (-10 to +10)
    const padding = 60;
    const mapX = (val) => padding + (val / 100) * (w - padding * 2);
    const mapY = (val) => h / 2 - (val / 10) * (h / 2 - padding);

    const coins = Object.keys(marketState).map(id => {
        const d = marketState[id];
        const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
        const price = d.raw?.PRICE || {};
        return {
            id, coin: id,
            smi: master.normalizedScore || 50,
            chg: price.percent_change_24h || 0,
            vol: (() => {
                const coinVol = price.total_vol || 0;
                const px = price.last || 0;
                const fiat = price.total_vol_fiat || 0;
                if (coinVol > 0 && px > 0) return coinVol * px;
                return fiat || coinVol || 1;
            })()
        };
    });

    const categories = [
        { label: 'ACCUMULATION', x: 75, y: -5, color: 'text-bb-green' },
        { label: 'RALLY', x: 75, y: 5, color: 'text-bb-gold' },
        { label: 'EXHAUSTED', x: 25, y: 5, color: 'text-bb-red' },
        { label: 'DESPAIR', x: 25, y: -5, color: 'text-bb-muted' }
    ];

    container.innerHTML = `
        <svg class="w-full h-full">
            <!-- Grid Lines -->
            <line x1="${padding}" y1="${h / 2}" x2="${w - padding}" y2="${h / 2}" stroke="#ffffff" stroke-opacity="0.1" />
            <line x1="${w / 2}" y1="${padding}" x2="${w / 2}" y2="${h - padding}" stroke="#ffffff" stroke-opacity="0.1" />
            
            <!-- Quadrant Labels -->
            ${categories.map(c => `
                <text x="${mapX(c.x)}" y="${mapY(c.y)}" text-anchor="middle" class="${c.color} font-black uppercase text-[10px] opacity-20">${c.label}</text>
            `).join('')}

            <!-- Bubbles -->
            ${coins.map(c => {
        const cx = mapX(c.smi); const cy = mapY(c.chg);
        const color = c.smi > 60 ? '#22c55e' : c.smi < 40 ? '#ef4444' : '#6b7280';
        return `
                    <g class="cursor-pointer group" onclick="window.app.selectCoin('${c.id}')">
                        <circle cx="${cx}" cy="${cy}" r="4" fill="${color}" opacity="0.6" class="group-hover:opacity-100 transition-all shadow-lg" />
                        <text x="${cx}" y="${cy - 8}" text-anchor="middle" class="fill-white font-black text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">${c.coin} (${c.smi.toFixed(0)})</text>
                    </g>
                `;
    }).join('')}
        </svg>
    `;

    document.getElementById('legend-text').innerText = 'X-Axis: Intelligence Score (SMI) | Y-Axis: 24H Price Performance';
    document.getElementById('heatmap-total-label').innerText = 'AVG SMI:';
    document.getElementById('heatmap-total').innerText = `${(coins.reduce((sum, c) => sum + c.smi, 0) / coins.length).toFixed(1)}`;
}

/**
 * HELPER: Convergence Matrix (Global MTF)
 */
function renderConvergence(marketState, container) {
    const coins = Object.keys(marketState).map(id => {
        const d = marketState[id];
        const tfData = d.signals?.profiles?.AGGRESSIVE?.timeframes || {};
        return {
            id, coin: id,
            tfs: ['1MENIT', '5MENIT', '15MENIT', '1JAM'].map(tf => tfData[tf]?.masterSignal?.action || 'WAIT')
        };
    }).sort((a, b) => {
        const countA = a.tfs.filter(t => t === 'BUY').length - a.tfs.filter(t => t === 'SELL').length;
        const countB = b.tfs.filter(t => t === 'BUY').length - b.tfs.filter(t => t === 'SELL').length;
        return Math.abs(countB) - Math.abs(countA);
    });

    const bullishCount = coins.filter(c => c.tfs.filter(t => t === 'BUY').length > c.tfs.filter(t => t === 'SELL').length).length;
    const breadthPct = (bullishCount / coins.length) * 100;

    container.innerHTML = `
        <div class="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 overflow-y-auto h-full scrollbar-thin">
            ${coins.slice(0, 48).map(c => `
                <div class="p-2 bg-white/5 border border-white/5 rounded flex flex-col items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors" onclick="window.app.selectCoin('${c.id}')">
                    <span class="text-[9px] font-black text-white group-hover:text-bb-gold transition-colors">${c.coin}</span>
                    <div class="flex gap-1">
                        ${c.tfs.map(act => `
                            <div class="w-1.5 h-3 rounded-full ${act === 'BUY' ? 'bg-bb-green shadow-[0_0_4px_#22c55e]' : act === 'SELL' ? 'bg-bb-red shadow-[0_0_4px_#ef4444]' : 'bg-white/10'}"></div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    document.getElementById('legend-text').innerText = 'Vertical Bars: 1M | 5M | 15M | 1H Alignment (Green=BUY, Red=SELL)';
    document.getElementById('heatmap-total-label').innerText = 'MARKET BREADTH (BULLISH):';
    const totalEl = document.getElementById('heatmap-total');
    if (totalEl) {
        totalEl.innerText = `${breadthPct.toFixed(1)}%`;
        totalEl.className = `text-[10px] font-bold ${breadthPct > 60 ? 'text-bb-green' : breadthPct < 40 ? 'text-bb-red' : 'text-white'}`;
    }
}

/**
 * HELPER: BTC Beta Sensitivity Map
 */
function renderBeta(marketState, container) {
    const rect = container.getBoundingClientRect();
    const w = rect.width; const h = rect.height;
    const padding = 60;

    // X = Beta (0.5 to 2.0), Y = Correlation (0 to 1)
    const mapX = (val) => padding + ((val - 0.5) / 1.5) * (w - padding * 2);
    const mapY = (val) => h - padding - (val * (h - padding * 2));

    const coins = Object.keys(marketState).map(id => {
        const d = marketState[id];
        const corr = d.analytics?.correlation || { correlation: 0.8, beta: 1.0 };
        return {
            id, coin: id,
            beta: corr.beta || 1.0,
            corr: corr.correlation || 0.8
        };
    });

    container.innerHTML = `
        <svg class="w-full h-full">
            <line x1="${padding}" y1="${h - padding}" x2="${w - padding}" y2="${h - padding}" stroke="white" stroke-opacity="0.2" />
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${h - padding}" stroke="white" stroke-opacity="0.2" />
            
            <text x="${w / 2}" y="${h - 20}" text-anchor="middle" class="fill-bb-gold/40 text-[9px] font-black uppercase">Market Sensitivity (BETA)</text>
            <text x="${20}" y="${h / 2}" text-anchor="middle" transform="rotate(-90 20 ${h / 2})" class="fill-bb-gold/40 text-[9px] font-black uppercase">Correlation to BTC</text>

            ${coins.map(c => {
        const cx = mapX(c.beta); const cy = mapY(c.corr);
        return `
                    <g class="cursor-pointer group" onclick="window.app.selectCoin('${c.id}')">
                        <circle cx="${cx}" cy="${cy}" r="3" fill="${c.beta > 1.2 ? '#eab308' : '#2563eb'}" opacity="0.6" class="hover:opacity-100 transition-all" />
                        <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="fill-white font-bold text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">${c.coin}</text>
                    </g>
                `;
    }).join('')}
        </svg>
    `;
    document.getElementById('legend-text').innerText = 'X-Axis: Market Sensitivity (Beta) | Y-Axis: Correlation to BTC (1.0 = Perfect Follower)';
}

/**
 * HELPER: Alpha Scanner (Idiosyncratic Flow)
 */
function renderAlpha(marketState, container) {
    const coins = Object.keys(marketState).map(id => {
        const d = marketState[id];
        const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
        const corr = d.analytics?.correlation || { correlation: 0.8 };
        // Alpha score = Normal Score * (1 - Correlation)
        const alpha = (master.normalizedScore || 50) * (1 - (corr.correlation || 0.8));
        return {
            id, coin: id,
            alpha: alpha,
            score: master.normalizedScore || 50,
            corr: corr.correlation || 0.8
        };
    }).sort((a, b) => b.alpha - a.alpha).slice(0, 12);

    container.innerHTML = `
        <div class="p-6 flex flex-col gap-4 h-full">
            <h3 class="text-bb-gold font-black text-xs uppercase tracking-widest border-b border-bb-gold/20 pb-2">Identified Alpha Outliers (Decorrelated Flow)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto scrollbar-thin">
                ${coins.map(c => `
                    <div class="p-4 bg-bb-panel border border-bb-gold/30 rounded flex flex-col gap-2 cursor-pointer hover:bg-bb-gold/10 transition-all group" onclick="window.app.selectCoin('${c.id}')">
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-black text-white group-hover:text-bb-gold">${c.coin}</span>
                            <span class="text-[9px] px-1.5 py-0.5 bg-bb-gold text-black font-black rounded uppercase">ALPHA ID: ${(c.alpha).toFixed(1)}</span>
                        </div>
                        <div class="flex justify-between text-[9px] text-bb-muted uppercase font-bold">
                            <span>SMI Signal: ${Math.round(c.score)}</span>
                            <span>BTC Correlation: ${(c.corr).toFixed(2)}</span>
                        </div>
                        <div class="h-1.5 bg-bb-black rounded-full overflow-hidden mt-1">
                            <div class="h-full bg-bb-gold shadow-[0_0_8px_gold]" style="width: ${c.alpha}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.getElementById('legend-text').innerText = 'Alpha ID = SMI Score weighted by Decorrelation. Highlights assets breaking away from the market.';
    document.getElementById('heatmap-total-label').innerText = 'TOP ALPHA:';
    document.getElementById('heatmap-total').innerText = coins[0]?.coin || '--';
}

/**
 * HELPER: Funding Risk Landscape (Matrix)
 */
function renderFunding(marketState, container) {
    const coins = Object.keys(marketState).map(id => {
        const d = marketState[id];
        const fund = d.raw?.FUNDING || {};
        return {
            id, coin: id,
            rate: fund.funding_Rate || 0,
            pred: fund.funding_nextFundingRate || 0
        };
    }).sort((a, b) => Math.abs(b.rate) - Math.abs(a.rate)).slice(0, 32);

    container.innerHTML = `
        <div class="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 h-full overflow-y-auto scrollbar-thin">
            ${coins.map(c => {
        const color = c.rate > 0.0005 ? 'text-bb-red font-black' : c.rate < -0.0005 ? 'text-bb-green font-black' : 'text-white/60';
        const bg = Math.abs(c.rate) > 0.001 ? 'bg-bb-gold/10 ring-1 ring-bb-gold/30' : 'bg-white/5';
        return `
                    <div class="p-3 ${bg} border border-white/5 rounded flex flex-col gap-1 cursor-pointer hover:bg-white/10 transition-all" onclick="window.app.selectCoin('${c.id}')">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-black text-white uppercase">${c.coin}</span>
                            <span class="text-[8px] font-mono ${color}">${(c.rate * 100).toFixed(4)}%</span>
                        </div>
                        <div class="flex justify-between items-center text-[7px] text-bb-muted uppercase font-bold">
                            <span>NEXT PERIOD</span>
                            <span class="text-white/40">${(c.pred * 100).toFixed(4)}%</span>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
    document.getElementById('legend-text').innerText = 'Global Funding Landscape. Red = Longs paying Shorts (Bearish Pressure) | Green = Shorts paying Longs (Squeeze Potential).';
    document.getElementById('heatmap-total-label').innerText = 'AVG FUNDING RATE:';
    const activeRates = coins.filter(c => c.rate !== 0);
    const avg = activeRates.length > 0 ? activeRates.reduce((s, c) => s + c.rate, 0) / activeRates.length : 0;
    document.getElementById('heatmap-total').innerText = `${(avg * 100).toFixed(4)}%`;
}

/**
 * HELPER: Volatility Concentration Map (Radar)
 */
function renderVolatility(marketState, container) {
    const rect = container.getBoundingClientRect();
    const w = rect.width; const h = rect.height;
    const padding = 60;

    const coins = Object.keys(marketState).map(id => {
        const d = marketState[id];
        const p = d.raw?.PRICE || {};
        const c = d.raw?.CANDLES || {};

        // Fallback to absolute price change intensity if candle-based vol is missing
        let v15 = c.candle_volatility_15m || (Math.abs(p.percent_change_15MENIT || 0) / 100);
        let v1h = c.candle_volatility_1H || (Math.abs(p.percent_change_1JAM || 0) / 100);

        return {
            id, coin: id,
            v15: v15,
            v1h: v1h
        };
    }).filter(c => c.v15 > 0 || c.v1h > 0);

    // Dynamic Scaling
    const maxV15 = Math.max(0.01, ...coins.map(c => c.v15));
    const maxV1h = Math.max(0.02, ...coins.map(c => c.v1h));

    const mapX = (val) => padding + (val / maxV15) * (w - padding * 2);
    const mapY = (val) => h - padding - (val / maxV1h) * (h - padding * 2);

    container.innerHTML = `
        <svg class="w-full h-full">
            <line x1="${padding}" y1="${h - padding}" x2="${w - padding}" y2="${h - padding}" stroke="white" stroke-opacity="0.1" />
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${h - padding}" stroke="white" stroke-opacity="0.1" />
            
            <text x="${w / 2}" y="${h - 20}" text-anchor="middle" class="fill-bb-gold/60 text-[9px] font-black uppercase">15M Intensity (Max: ${(maxV15 * 100).toFixed(1)}%)</text>
            <text x="${20}" y="${h / 2}" text-anchor="middle" transform="rotate(-90 20 ${h / 2})" class="fill-bb-gold/60 text-[9px] font-black uppercase">1H Expansion (Max: ${(maxV1h * 100).toFixed(1)}%)</text>

            ${coins.map(c => {
        const cx = mapX(c.v15); const cy = mapY(c.v1h);
        const isExpansion = c.v15 > (c.v1h * 1.5);
        return `
                    <g class="cursor-pointer group" onclick="window.app.selectCoin('${c.id}')">
                        <circle cx="${cx}" cy="${cy}" r="3" fill="${isExpansion ? '#ef4444' : '#22c55e'}" opacity="0.6" class="hover:opacity-100 transition-all shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
                        <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="fill-white font-bold text-[8px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">${c.coin}</text>
                    </g>
                `;
    }).join('')}
        </svg>
    `;
    document.getElementById('legend-text').innerText = `X-Axis: 15M Vol | Y-Axis: 1H Vol. Red = Volatility Explosion (Short-term > Long-term).`;
    document.getElementById('heatmap-total-label').innerText = 'ACTIVE VOL ASSETS:';
    document.getElementById('heatmap-total').innerText = coins.length;
}

/**
 * HELPER: Institutional Sizing & Skew (Whale Footprint)
 */
function renderSkew(marketState, container) {
    const coins = Object.keys(marketState).map(id => {
        const d = marketState[id];
        const of = d.analytics?.orderFlow || {};
        const micro = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.signals?.microstructure || {};
        return {
            id, coin: id,
            skew: of.tradeSizeImbalance || 0,
            impact: micro.kyleLambda?.rawValue || 0
        };
    }).sort((a, b) => Math.abs(b.skew) - Math.abs(a.skew)).slice(0, 24);

    container.innerHTML = `
        <div class="p-6 flex flex-col gap-4 h-full">
            <h3 class="text-bb-blue font-black text-xs uppercase tracking-widest border-b border-bb-blue/20 pb-2">Institutional Skew Detection (Whale Footprints)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto scrollbar-thin">
                ${coins.map(c => `
                    <div class="p-4 bg-bb-panel border border-bb-blue/30 rounded flex flex-col gap-2 cursor-pointer hover:bg-bb-blue/10 transition-all group" onclick="window.app.selectCoin('${c.id}')">
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-black text-white group-hover:text-bb-blue">${c.coin}</span>
                            <span class="text-[7px] px-1 bg-white/5 rounded text-bb-muted uppercase">SKEW ID</span>
                        </div>
                        <div class="text-xl font-bold ${c.skew > 0 ? 'text-bb-green' : c.skew < 0 ? 'text-bb-red' : 'text-white'}">
                            ${c.skew > 0 ? '+' : ''}${(c.skew * 100).toFixed(1)}%
                        </div>
                        <div class="flex justify-between text-[7px] text-bb-muted uppercase font-bold mt-1">
                            <span>KYLE λ IMPACT</span>
                            <span>${(c.impact).toFixed(4)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.getElementById('legend-text').innerText = 'Institutional Skew = Imbalance in Average Trade sizes. Positive = Institutional Aggression.';
    document.getElementById('heatmap-total-label').innerText = 'TOP WHALE FLOW:';
    document.getElementById('heatmap-total').innerText = coins[0]?.coin || '--';
}
