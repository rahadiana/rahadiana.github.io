import * as Utils from '../utils.js';
import { getMasterSignal, getMicrostructure, getSignals } from '../data_helpers.js';

let onSelectCoin = null;

// Sort state
let currentSortCol = 'nf15m';
let isSortDesc = true;
let currentFilter = '';

export function init(selectCoinCallback) {
    onSelectCoin = selectCoinCallback;
}

// Attach event listeners for sorting & filtering globally using event delegation
// so they survive HTML recreation on tab switch.
document.addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (th && th.closest('table').querySelector('#flow-table-body')) {
        const col = th.getAttribute('data-sort');
        if (currentSortCol === col) {
            isSortDesc = !isSortDesc; // Toggle direction
        } else {
            currentSortCol = col;
            isSortDesc = true; // Default to desc for new column
        }
        
        // Trigger an immediate re-render if data exists
        if (window.marketState && Object.keys(window.marketState).length > 0) {
            update(window.marketState);
        }
    }
});

document.addEventListener('input', (e) => {
    if (e.target.id === 'flow-search') {
        currentFilter = e.target.value.trim().toLowerCase();
        if (window.marketState && Object.keys(window.marketState).length > 0) {
            update(window.marketState);
        }
    }
});

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col gap-4">
            <!-- FLOW MARKET STATS -->
            <div class="grid grid-cols-4 gap-2 h-20">
                <div class="panel bg-bb-sidebar flex flex-col justify-center items-center">
                    <span class="text-[10px] text-bb-muted uppercase tracking-widest">Global Net Flow (15m)</span>
                    <div class="text-2xl font-bold font-mono" id="flow-global-netflow">--</div>
                </div>
                <div class="panel bg-bb-sidebar flex flex-col justify-center items-center">
                    <span class="text-[10px] text-bb-muted uppercase tracking-widest">Avg Cap Bias (15m)</span>
                    <div class="text-2xl font-bold font-mono" id="flow-global-capbias">--</div>
                </div>
                <div class="panel bg-bb-sidebar flex flex-col justify-center items-center">
                    <span class="text-[10px] text-bb-muted uppercase tracking-widest">Bullish Flow Assets</span>
                    <div class="text-2xl font-bold text-bb-green" id="flow-bull-assets">0</div>
                </div>
                <div class="panel bg-bb-sidebar flex flex-col justify-center items-center">
                    <span class="text-[10px] text-bb-muted uppercase tracking-widest">Bearish Flow Assets</span>
                    <div class="text-2xl font-bold text-bb-red" id="flow-bear-assets">0</div>
                </div>
            </div>

            <!-- MAIN CONTENT SPLIT -->
            <div class="flex-1 flex gap-4 overflow-hidden">
                <!-- FLOW SCANNER -->
                <div class="w-full panel flex flex-col">
                    <div class="panel-header flex justify-between items-center">
                        <span>FLOW SCANNER</span>
                        <div class="flex items-center gap-4">
                            <input type="text" id="flow-search" placeholder="Filter Pair..." class="bg-black/50 border border-white/10 text-[9px] text-white px-2 py-0.5 rounded focus:border-bb-gold outline-none w-32">
                            <div class="text-[9px] text-bb-muted italic">Click row to analyze</div>
                        </div>
                    </div>
                    <div class="panel-content overflow-hidden flex-1">
                        <div class="h-full overflow-y-auto scrollbar-thin">
                            <table class="w-full text-left border-collapse sticky top-0">
                                <thead class="text-[10px] text-bb-muted bg-bb-dark sticky top-0 z-10 font-bold uppercase tracking-wider select-none">
                                    <tr>
                                        <th class="p-3 border-b border-bb-border cursor-pointer hover:text-white" data-sort="coin">Asset <span class="sort-indicator text-[8px]"></span></th>
                                        <th class="p-3 border-b border-bb-border text-right cursor-pointer hover:text-white" data-sort="change24h">24H Change <span class="sort-indicator text-[8px]"></span></th>
                                        
                                        <!-- Net Flows -->
                                        <th class="p-3 border-b border-bb-border text-right border-l border-white/5 cursor-pointer hover:text-white" data-sort="nf1m">Net Flow 1m <span class="sort-indicator text-[8px]"></span></th>
                                        <th class="p-3 border-b border-bb-border text-right cursor-pointer hover:text-white" data-sort="nf5m">Net Flow 5m <span class="sort-indicator text-[8px]"></span></th>
                                        <th class="p-3 border-b border-bb-border text-right cursor-pointer hover:text-white" data-sort="nf15m">Net Flow 15m <span class="sort-indicator text-[8px]"></span></th>
                                        <th class="p-3 border-b border-bb-border text-right cursor-pointer hover:text-white" data-sort="nf1h">Net Flow 1H <span class="sort-indicator text-[8px]"></span></th>
                                        <th class="p-3 border-b border-bb-border text-right cursor-pointer hover:text-white" data-sort="nf24h">Net Flow 24H <span class="sort-indicator text-[8px]"></span></th>
                                        
                                        <!-- Capital Bias -->
                                        <th class="p-3 border-b border-bb-border text-center border-l border-white/5 cursor-pointer hover:text-white" data-sort="cb5m">Cap Bias 5m <span class="sort-indicator text-[8px]"></span></th>
                                        <th class="p-3 border-b border-bb-border text-center cursor-pointer hover:text-white" data-sort="cb15m">Cap Bias 15m <span class="sort-indicator text-[8px]"></span></th>
                                        <th class="p-3 border-b border-bb-border text-center cursor-pointer hover:text-white" data-sort="cb1h">Cap Bias 1H <span class="sort-indicator text-[8px]"></span></th>
                                        <th class="p-3 border-b border-bb-border text-center cursor-pointer hover:text-white" data-sort="cb24h">Cap Bias 24H <span class="sort-indicator text-[8px]"></span></th>
                                    </tr>
                                </thead>
                                <tbody id="flow-table-body" class="text-xs divide-y divide-bb-border/30">
                                    <!-- Scanning... -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper to format large USD numbers
function formatMoney(value) {
    if (value == null) return '--';
    const num = Number(value);
    if (isNaN(num)) return '--';
    
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : (num > 0 ? '+' : '');
    
    if (abs >= 1000000) {
        return sign + '$' + Utils.safeFixed(abs / 1000000, 2) + 'M';
    } else if (abs >= 1000) {
        return sign + '$' + Utils.safeFixed(abs / 1000, 1) + 'k';
    } else {
        return sign + '$' + Utils.safeFixed(abs, 0);
    }
}

// Helper to format percentages
function formatPct(value) {
    if (value == null) return '--';
    const num = Number(value);
    if (isNaN(num)) return '--';
    const sign = num > 0 ? '+' : '';
    return sign + Utils.safeFixed(num, 2) + '%';
}

function getColorForFlow(value) {
    if (value == null) return 'text-bb-muted';
    const num = Number(value);
    if (isNaN(num)) return 'text-bb-muted';
    return num > 0 ? 'text-bb-green' : num < 0 ? 'text-bb-red' : 'text-white/60';
}

function getColorClassForBias(value) {
    if (typeof value !== 'string') return 'text-bb-muted border-gray-700 bg-gray-900/40';
    const upper = value.toUpperCase();
    if (upper.includes('BULL') || upper.includes('ACCUMULATION')) return 'text-green-300 border-green-800 bg-green-900/40';
    if (upper.includes('BEAR') || upper.includes('DISTRIBUTION')) return 'text-red-300 border-red-800 bg-red-900/40';
    return 'text-gray-400 border-gray-700 bg-gray-900/40';
}


// Helper to parse bias string into numeric value for sorting
function getBiasNumericValue(biasStr) {
    if (typeof biasStr !== 'string') return 0;
    const upper = biasStr.toUpperCase();
    if (upper.includes('EXTREME_BULL') || upper === 'ACCUMULATION_STRONG') return 2;
    if (upper.includes('BULL') || upper.includes('ACCUMULATION')) return 1;
    if (upper.includes('EXTREME_BEAR') || upper === 'DISTRIBUTION_STRONG') return -2;
    if (upper.includes('BEAR') || upper.includes('DISTRIBUTION')) return -1;
    return 0;
}


export function update(marketState, profile = 'INSTITUTIONAL_BASE', timeframe = '15MENIT') {
    const coins = Object.keys(marketState);
    if (coins.length === 0) return;

    let totalNetFlow15m = 0;
    let bullCount = 0;
    let bearCount = 0;
    let sumCapBias = 0;
    let validCapBiasCount = 0;

    let items = coins.map(coin => {
        const data = marketState[coin];
        const raw = data.raw || {};
        
        // Target specifically the flow components directly matching flow__components.js mapped locations
        const syn = data.synthesis || {};
        const flow = syn.flow || {};
        
        const netFlow1m = flow.net_flow_1MENIT ?? flow.net_flow_1m ?? null;
        const netFlow5m = flow.net_flow_5MENIT ?? flow.net_flow_5m ?? null;
        const netFlow15m = flow.net_flow_15MENIT ?? flow.net_flow_15m ?? null;
        const netFlow1H = flow.net_flow_1JAM ?? flow.net_flow_1h ?? null;
        const netFlow24H = flow.net_flow_24JAM ?? flow.net_flow_24h ?? null;
        
        const capBias5m = flow.capital_bias_5MENIT ?? flow.capitalBias5m ?? 'NEUTRAL';
        const capBias15m = flow.capital_bias_15MENIT ?? flow.capitalBias15m ?? 'NEUTRAL';
        const capBias1H = flow.capital_bias_1JAM ?? flow.capitalBias1h ?? 'NEUTRAL';
        const capBias24H = flow.capital_bias_24JAM ?? flow.capitalBias24h ?? 'NEUTRAL';

        // Tally global stats
        if (netFlow15m != null) totalNetFlow15m += Number(netFlow15m);
        
        const upperCapBias = capBias15m.toUpperCase();
        if (upperCapBias.includes('BULL') || upperCapBias.includes('ACCUMULATION')) bullCount++;
        else if (upperCapBias.includes('BEAR') || upperCapBias.includes('DISTRIBUTION')) bearCount++;
        
        // Simple numeric estimation of cap bias for global average (-1 to 1)
        if (upperCapBias !== 'NEUTRAL') {
            const val = (upperCapBias.includes('EXTREME_BULL') || upperCapBias === 'ACCUMULATION_STRONG') ? 1 : 
                        (upperCapBias.includes('BULL') || upperCapBias.includes('ACCUMULATION')) ? 0.5 : 
                        (upperCapBias.includes('EXTREME_BEAR') || upperCapBias === 'DISTRIBUTION_STRONG') ? -1 : 
                        (upperCapBias.includes('BEAR') || upperCapBias.includes('DISTRIBUTION')) ? -0.5 : 0;
            sumCapBias += val;
            validCapBiasCount++;
        }

        return {
            coin: coin,
            fullCoin: coin,
            change24h: raw.PRICE?.percent_change_24h || 0,
            
            nf1m: netFlow1m,
            nf5m: netFlow5m,
            nf15m: netFlow15m,
            nf1h: netFlow1H,
            nf24h: netFlow24H,
            
            cb5m: capBias5m,
            cb15m: capBias15m,
            cb1h: capBias1H,
            cb24h: capBias24H
        };
    });

    updateGlobalStats(totalNetFlow15m, sumCapBias, validCapBiasCount, bullCount, bearCount);
    updateTable(items);
}

function updateGlobalStats(totalNetFlow15m, sumCapBias, validCapBiasCount, bulls, bears) {
    const elFlow = document.getElementById('flow-global-netflow');
    const elCap = document.getElementById('flow-global-capbias');
    const elBulls = document.getElementById('flow-bull-assets');
    const elBears = document.getElementById('flow-bear-assets');

    if (elFlow) {
        const flowColor = totalNetFlow15m > 0 ? 'text-bb-green' : totalNetFlow15m < 0 ? 'text-bb-red' : 'text-white';
        elFlow.innerHTML = `<span class="${flowColor}">${formatMoney(totalNetFlow15m)}</span>`;
    }

    if (elCap) {
        const avgBias = validCapBiasCount > 0 ? (sumCapBias / validCapBiasCount) : 0;
        let biasLabel = 'NEUTRAL';
        if (avgBias > 0.5) biasLabel = 'EXTREME BULL';
        else if (avgBias > 0.1) biasLabel = 'BULLISH';
        else if (avgBias < -0.5) biasLabel = 'EXTREME BEAR';
        else if (avgBias < -0.1) biasLabel = 'BEARISH';
        
        const biasColor = avgBias > 0 ? 'text-bb-green' : avgBias < 0 ? 'text-bb-red' : 'text-bb-muted';
        elCap.innerHTML = `<span class="${biasColor}">${biasLabel}</span>`;
    }

    if (elBulls) elBulls.innerText = bulls;
    if (elBears) elBears.innerText = bears;
}

function updateTable(items) {
    const tbody = document.getElementById('flow-table-body');
    const thead = tbody?.closest('table')?.querySelector('thead');
    if (!tbody) return;

    // Apply Filter
    let filteredItems = items;
    if (currentFilter) {
        filteredItems = items.filter(item => item.coin.toLowerCase().includes(currentFilter));
    }

    // Apply Sort
    filteredItems.sort((a, b) => {
        let valA = a[currentSortCol];
        let valB = b[currentSortCol];

        // Handle string comparison for coins
        if (currentSortCol === 'coin') {
            return isSortDesc ? b.coin.localeCompare(a.coin) : a.coin.localeCompare(b.coin);
        }
        
        // Handle Bias sorting
        if (currentSortCol.startsWith('cb')) {
            valA = getBiasNumericValue(valA);
            valB = getBiasNumericValue(valB);
        }

        // Null handling (push to bottom)
        if (valA == null) valA = -Infinity;
        if (valB == null) valB = -Infinity;

        return isSortDesc ? (valB - valA) : (valA - valB);
    });
    
    // Update sort indicators in header
    if (thead) {
        thead.querySelectorAll('th').forEach(th => {
            const indicator = th.querySelector('.sort-indicator');
            if (indicator) {
                if (th.getAttribute('data-sort') === currentSortCol) {
                    indicator.textContent = isSortDesc ? '▼' : '▲';
                    th.classList.add('text-white');
                } else {
                    indicator.textContent = '';
                    th.classList.remove('text-white');
                }
            }
        });
    }

    tbody.innerHTML = filteredItems.map(item => {
        // Determine primary row color hint from 15m flow
        const isBull = (item.nf15m || 0) > 0;
        const isBear = (item.nf15m || 0) < 0;
        const bgRow = isBull ? 'hover:bg-green-900/10' : isBear ? 'hover:bg-red-900/10' : 'hover:bg-white/5';
        
        const sColor = isBull ? 'text-bb-green' : isBear ? 'text-bb-red' : 'text-bb-muted';

        const drawBias = (biasStr) => {
            const cls = getColorClassForBias(biasStr);
            return `<span class="px-1.5 py-0.5 rounded text-[8px] font-bold border ${cls}">${biasStr}</span>`;
        };
        
        const changeColor = (item.change24h || 0) >= 0 ? 'text-bb-green' : 'text-bb-red';

        return `
            <tr class="cursor-pointer transition-colors ${bgRow} group border-b border-bb-border/30" onclick="window.dashboardNavigate('${item.fullCoin}')">
                <td class="p-3 font-bold text-white group-hover:text-bb-gold transition-colors">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full ${sColor === 'text-bb-green' ? 'bg-bb-green' : sColor === 'text-bb-red' ? 'bg-bb-red' : 'bg-bb-muted'}"></div>
                        ${item.coin}
                    </div>
                </td>
                <td class="p-3 font-mono ${changeColor} text-right">${formatPct(item.change24h)}</td>
                
                <td class="p-3 font-mono text-right border-l border-white/5 ${getColorForFlow(item.nf1m)}">${formatMoney(item.nf1m)}</td>
                <td class="p-3 font-mono text-right ${getColorForFlow(item.nf5m)}">${formatMoney(item.nf5m)}</td>
                <td class="p-3 font-bold font-mono text-right ${getColorForFlow(item.nf15m)}">${formatMoney(item.nf15m)}</td>
                <td class="p-3 font-mono text-right ${getColorForFlow(item.nf1h)}">${formatMoney(item.nf1h)}</td>
                <td class="p-3 font-mono text-right ${getColorForFlow(item.nf24h)}">${formatMoney(item.nf24h)}</td>
                
                <td class="p-3 text-center border-l border-white/5">${drawBias(item.cb5m)}</td>
                <td class="p-3 text-center">${drawBias(item.cb15m)}</td>
                <td class="p-3 text-center">${drawBias(item.cb1h)}</td>
                <td class="p-3 text-center">${drawBias(item.cb24h)}</td>
            </tr>
        `;
    }).join('');
}
