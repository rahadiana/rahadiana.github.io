import * as Utils from '../utils.js';

let currentSort = { column: 'coin', direction: 'asc' };
let lastDataMap = {};

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-mono">
            <div class="panel-header flex justify-between items-center px-4 py-2 bg-bb-panel border-b border-bb-border shrink-0">
                <div class="flex items-center gap-4">
                    <span class="text-bb-gold font-bold uppercase tracking-tight">GLOBAL VOLUME RATIO</span>
                    <span class="text-[9px] text-bb-muted uppercase tracking-widest px-2 py-0.5 border border-bb-border rounded">Directional Bias vs Quality</span>
                </div>
            </div>

            <div class="flex-1 overflow-auto scrollbar-thin">
                <table class="w-full text-left border-collapse min-w-[1200px]">
                    <thead class="sticky top-0 bg-bb-panel z-20 shadow-md">
                        <tr class="text-[8px] text-bb-muted uppercase border-b border-bb-border">
                            <th class="p-2 cursor-pointer hover:text-white" data-sort="coin">Coin</th>
                            <th class="p-2 text-right cursor-pointer hover:text-white" data-sort="chg1h">1H %</th>
                            <th class="p-2 text-center border-l border-bb-border/30 cursor-pointer hover:text-white" data-sort="m1">1M</th>
                            <th class="p-2 text-center border-l border-bb-border/30 cursor-pointer hover:text-white" data-sort="m5">5M</th>
                            <th class="p-2 text-center border-l border-bb-border/30 cursor-pointer hover:text-white" data-sort="m10">10M</th>
                            <th class="p-2 text-center border-l border-bb-border/30 cursor-pointer hover:text-white" data-sort="m15">15M</th>
                            <th class="p-2 text-center border-l border-bb-border/30 cursor-pointer hover:text-white" data-sort="m20">20M</th>
                            <th class="p-2 text-center border-l border-bb-border/30 cursor-pointer hover:text-white" data-sort="m30">30M</th>
                            <th class="p-2 text-center border-l border-bb-border/30 cursor-pointer hover:text-white" data-sort="h1">1H</th>
                            <th class="p-2 text-center border-l border-bb-border/30 cursor-pointer hover:text-white" data-sort="h2">2H</th>
                            <th class="p-2 text-center border-l border-bb-border/30 cursor-pointer hover:text-white" data-sort="d1">1D</th>
                        </tr>
                    </thead>
                    <tbody id="vol-ratio-body" class="divide-y divide-bb-border/10">
                        <!-- Injected -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Add sort listeners
    const headers = container.querySelectorAll('th[data-sort]');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (currentSort.column === col) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = col;
                currentSort.direction = 'desc';
            }
            updateTable();
        });
    });
}

export function update(allCoinData) {
    if (!allCoinData) return;
    lastDataMap = allCoinData;
    updateTable();
}

function getDurabilityColor(score) {
    if (score < 0.20) return 'bg-bb-muted';
    if (score < 0.40) return 'bg-bb-gold';
    if (score < 0.65) return 'bg-bb-blue';
    return 'bg-bb-green';
}

function getRatioColor(ratio) {
    if (ratio >= 0.30) return 'text-bb-green';
    if (ratio >= 0.10) return 'text-bb-green/60';
    if (ratio <= -0.30) return 'text-bb-red';
    if (ratio <= -0.10) return 'text-bb-red/60';
    return 'text-bb-muted';
}

function updateTable() {
    const tbody = document.getElementById('vol-ratio-body');
    if (!tbody || !lastDataMap) return;

    const dataArray = [];
    Object.entries(lastDataMap).forEach(([coin, data]) => {
        const raw = data.raw || {};
        const vol = raw.VOL || {};
        const price = raw.PRICE || {};

        const getMetrics = (tf, mult) => {
            const b = vol[`vol_BUY_${tf}`] || 0;
            const s = vol[`vol_SELL_${tf}`] || 0;
            const t = b + s;
            const ratio = t > 0 ? (b - s) / t : 0;

            const h1Base = ((vol.vol_BUY_1JAM || 0) + (vol.vol_SELL_1JAM || 0)) / 60;
            const currentPace = t / mult;
            const durability = h1Base > 0 ? Math.min(1.0, (currentPace / h1Base) / 2) : 0;

            // ⭐ Institutional Upgrade: AVG-based Spike (Historical)
            const avgVal = raw.AVG || {};
            const histTotal = (avgVal[`avg_VOLCOIN_buy_${tf}`] || 0) + (avgVal[`avg_VOLCOIN_sell_${tf}`] || 0);
            const histPace = histTotal / mult;
            const avgSpike = histPace > 0 ? (currentPace / histPace) : 0;

            return { ratio, durability, avgSpike };
        };

        dataArray.push({
            id: coin,
            coin: coin,
            chg1h: price.percent_change_1JAM || 0,
            m1: getMetrics('1MENIT', 1),
            m5: getMetrics('5MENIT', 5),
            m10: getMetrics('10MENIT', 10),
            m15: getMetrics('15MENIT', 15),
            m20: getMetrics('20MENIT', 20),
            m30: getMetrics('30MENIT', 30),
            h1: getMetrics('1JAM', 60),
            h2: getMetrics('2JAM', 120),
            d1: getMetrics('24JAM', 1440)
        });
    });

    // Sort
    dataArray.sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];

        // Handle nested ratio sorting for TF columns
        if (typeof valA === 'object' && valA !== null && valA.ratio !== undefined) {
            valA = valA.ratio;
        }
        if (typeof valB === 'object' && valB !== null && valB.ratio !== undefined) {
            valB = valB.ratio;
        }

        if (typeof valA === 'string') {
            return currentSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return currentSort.direction === 'asc' ? valA - valB : valB - valA;
    });

    const createProfileCell = (m) => {
        const rColor = getRatioColor(m.ratio);
        // Use LONG/SHORT to match signal output format
        const rLabel = m.ratio >= 0.10 ? 'LONG' : m.ratio <= -0.10 ? 'SHORT' : 'NEUT';

        // mini bar and spike
        const avgTag = m.avgSpike > 1.5 ? `<span class="text-bb-gold">${m.avgSpike.toFixed(1)}x</span>` : `<span class="text-bb-muted/30">AVG</span>`;
        const barWidth = Math.round(m.durability * 5);
        let bars = '';
        const dColor = getDurabilityColor(m.durability);
        for (let i = 0; i < 5; i++) {
            bars += `<span class="w-1.5 h-1.5 rounded-xxs ${i < barWidth ? dColor : 'bg-bb-border/10'}"></span>`;
        }

        return `
            <td class="p-1 border-l border-bb-border/20">
                <div class="flex flex-col items-center leading-none gap-0.5">
                    <div class="flex items-center gap-1">
                        <div class="flex gap-0.25">${bars}</div>
                        <div class="text-[6px] font-black tracking-tighter">${avgTag}</div>
                    </div>
                    <div class="flex justify-between w-full px-1 text-[7px] font-black italic">
                        <span class="${rColor}">${m.ratio > 0 ? '+' : ''}${m.ratio.toFixed(2)}</span>
                        <span class="${rColor}">${rLabel}</span>
                    </div>
                </div>
            </td>
        `;
    };

    tbody.innerHTML = dataArray.map(item => `
        <tr class="hover:bg-white/5 transition-colors cursor-pointer group" onclick="window.app.selectCoin('${item.id}')">
            <td class="p-2">
                <div class="font-bold text-white group-hover:text-bb-gold transition-colors text-[9px]">${item.coin}</div>
            </td>
            <td class="p-2 text-right font-mono font-bold text-[9px] ${item.chg1h >= 0 ? 'text-bb-green' : 'text-bb-red'}">
                ${item.chg1h > 0 ? '+' : ''}${item.chg1h.toFixed(2)}%
            </td>
            ${createProfileCell(item.m1)}
            ${createProfileCell(item.m5)}
            ${createProfileCell(item.m10)}
            ${createProfileCell(item.m15)}
            ${createProfileCell(item.m20)}
            ${createProfileCell(item.m30)}
            ${createProfileCell(item.h1)}
            ${createProfileCell(item.h2)}
            ${createProfileCell(item.d1)}
        </tr>
    `).join('');
}
