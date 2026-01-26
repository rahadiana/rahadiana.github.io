import * as Utils from '../utils.js';

// Callback for navigation
let onSelectCoin = null;

export function init(selectCoinCallback) {
    onSelectCoin = selectCoinCallback;
}

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col gap-4">
            
            <!-- GLOBAL MARKET STATS -->
            <div class="grid grid-cols-4 gap-2 h-20">
                <div class="panel bg-bb-sidebar flex flex-col justify-center items-center">
                    <span class="text-[10px] text-bb-muted uppercase tracking-widest">MARKET SENTIMENT</span>
                    <div class="text-2xl font-bold text-white" id="global-sentiment">--</div>
                </div>
                <div class="panel bg-bb-sidebar flex flex-col justify-center items-center">
                    <span class="text-[9px] text-bb-muted uppercase tracking-widest">AVG FUNDING</span>
                    <div class="text-2xl font-bold font-mono" id="global-funding">--</div>
                </div>
                <div class="panel bg-bb-sidebar flex flex-col justify-center items-center">
                    <span class="text-[9px] text-bb-muted uppercase tracking-widest">LONG/SHORT RATIO</span>
                    <div class="text-2xl font-bold text-white" id="global-lsr">--</div>
                </div>
                <div class="panel bg-bb-sidebar flex flex-col justify-center items-center">
                    <span class="text-[9px] text-bb-muted uppercase tracking-widest">ACTIVE ASSETS</span>
                    <div class="text-2xl font-bold text-bb-gold" id="active-assets">0</div>
                </div>
            </div>

            <!-- MAIN CONTENT SPLIT -->
            <div class="flex-1 flex gap-4 overflow-hidden">
                
                <!-- LEFT: OPPORTUNITY RANKING (The "Scanner") -->
                <div class="w-full panel flex flex-col">
                    <div class="panel-header flex justify-between items-center">
                        <span>MARKET SCANNER</span>
                        <div class="text-[9px] text-bb-muted italic">Click row to analyze</div>
                    </div>
                    <div class="panel-content overflow-hidden flex-1">
                        <div class="h-full overflow-y-auto scrollbar-thin">
                            <table class="w-full text-left border-collapse sticky top-0">
                                <thead class="text-[10px] text-bb-muted bg-bb-dark sticky top-0 z-10 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th class="p-3 border-b border-bb-border">Asset</th>
                                        <th class="p-3 border-b border-bb-border">Price</th>
                                        <th class="p-3 border-b border-bb-border text-right">24h Chg</th>
                                        <th class="p-3 border-b border-bb-border text-center">Trend (15m)</th>
                                        <th class="p-3 border-b border-bb-border text-center">Score</th>
                                        <th class="p-3 border-b border-bb-border text-center">Vol</th>
                                        <th class="p-3 border-b border-bb-border text-right">Activity</th>
                                    </tr>
                                </thead>
                                <tbody id="market-table-body" class="text-xs divide-y divide-bb-border/30">
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

export function update(marketState, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    const coins = Object.keys(marketState);
    if (coins.length === 0) return;

    // 1. Calculate Global Stats
    let totalFunding = 0;
    let totalLSR = 0;
    let bullCount = 0;
    let bearCount = 0;
    let validCount = 0;

    let items = coins.map(coin => {
        const data = marketState[coin];
        const raw = data.raw || {};
        const signals = data.signals || {};
        const master = data.masterSignals?.[timeframe]?.[profile];
        const analytics = data.analytics || {};

        // Stats accumulation
        if (data.FUNDING?.funding_Rate) totalFunding += data.FUNDING.funding_Rate;
        if (raw.LSR?.lsr_1h) totalLSR += raw.LSR.lsr_1h;

        const trend = signals.marketRegime?.currentRegime || 'NEUTRAL';
        if (trend.includes('BULL')) bullCount++;
        if (trend.includes('BEAR')) bearCount++;
        validCount++;

        return {
            coin: coin,
            fullCoin: coin,
            price: raw.PRICE?.last || 0,
            chg24h: raw.PRICE?.percent_change_24h || 0,
            chg1h: raw.PRICE?.percent_change_1JAM || 0,
            trend: trend,
            score: master?.score || 0,
            action: master?.action || 'NEUT',
            vol: analytics.volatility?.volatilityRegime || 'LOW',
            intensity: data.microstructure?.[profile]?.intensity || 0
        };
    });

    updateGlobalStats(totalFunding / validCount, totalLSR / validCount, bullCount, bearCount, coins.length);
    updateTable(items);
}

function updateGlobalStats(avgFunding, avgLSR, bulls, bears, total) {
    const elSent = document.getElementById('global-sentiment');
    const elFund = document.getElementById('global-funding');
    const elLSR = document.getElementById('global-lsr');
    const elAssets = document.getElementById('active-assets');

    if (elAssets) elAssets.innerText = total;

    if (elSent) {
        const sentiment = bulls > bears ? 'BULLISH' : bears > bulls ? 'BEARISH' : 'NEUTRAL';
        const color = bulls > bears ? 'text-bb-green' : bears > bulls ? 'text-bb-red' : 'text-bb-muted';
        elSent.innerHTML = `<span class="${color}">${sentiment}</span> <span class="text-xs text-bb-muted">(${bulls} vs ${bears})</span>`;
    }

    if (elFund) {
        const fVal = (avgFunding * 100).toFixed(4);
        elFund.innerHTML = `<span class="${avgFunding > 0.01 ? 'text-bb-red' : avgFunding < -0.01 ? 'text-bb-green' : 'text-white'}">${fVal}%</span>`;
    }

    if (elLSR) {
        elLSR.innerText = avgLSR.toFixed(2);
    }
}

function updateTable(items) {
    const tbody = document.getElementById('market-table-body');
    if (!tbody) return;

    // Sort by Score descending (High opportunities first)
    items.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

    tbody.innerHTML = items.map(item => {
        const pColor = item.chg24h >= 0 ? 'text-bb-green' : 'text-bb-red';
        const sColor = item.action === 'BUY' ? 'text-bb-green' : item.action === 'SELL' ? 'text-bb-red' : 'text-bb-muted';
        const bgRow = item.action === 'BUY' ? 'hover:bg-green-900/10' : item.action === 'SELL' ? 'hover:bg-red-900/10' : 'hover:bg-white/5';

        return `
            <tr class="cursor-pointer transition-colors ${bgRow} group border-b border-bb-border/30" onclick="window.dashboardNavigate('${item.fullCoin}')">
                <td class="p-3 font-bold text-white group-hover:text-bb-gold transition-colors">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full ${sColor === 'text-bb-green' ? 'bg-bb-green' : sColor === 'text-bb-red' ? 'bg-bb-red' : 'bg-bb-muted'}"></div>
                        ${item.coin}
                    </div>
                </td>
                <td class="p-3 font-mono text-white">$${item.price.toFixed(item.price < 1 ? 5 : 2)}</td>
                <td class="p-3 font-mono text-right ${pColor}">${item.chg24h > 0 ? '+' : ''}${item.chg24h.toFixed(2)}%</td>
                <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${item.action === 'BUY' ? 'border-green-800 bg-green-900/40 text-green-300' : item.action === 'SELL' ? 'border-red-800 bg-red-900/40 text-red-300' : 'border-gray-700 text-gray-400'}">
                        ${item.action}
                    </span>
                </td>
                <td class="p-3 text-center">
                    <div class="font-bold ${sColor} text-lg">${item.score}</div>
                </td>
                <td class="p-3 text-center text-xs text-bb-muted">${item.vol}</td>
                <td class="p-3 text-right">
                    <div class="flex justify-end gap-1">
                        ${Array(Math.min(5, Math.ceil(item.intensity / 2))).fill(0).map(() =>
            `<div class="w-1 h-3 ${item.intensity > 8 ? 'bg-bb-red' : 'bg-bb-gold'} rounded-sm"></div>`
        ).join('')}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
