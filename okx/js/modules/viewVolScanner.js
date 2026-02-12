import * as Utils from '../utils.js';

let currentSort = { column: 'change', direction: 'desc' };
let lastDataMap = new Map();

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col">
            <div class="panel-header flex justify-between items-center px-4 py-2 shrink-0">
                <div class="flex items-center gap-4">
                    <span class="text-bb-gold">VOLUME DURABILITY</span>
                    <span class="text-[9px] text-bb-muted uppercase tracking-widest">Global Asset Comparison</span>
                </div>
                <div class="text-[9px] text-bb-muted">
                    DURABILITY = 5M Pace / 1H Avg Pace
                </div>
            </div>

            <div class="flex-1 overflow-auto scrollbar-thin">
                <table class="w-full text-left border-collapse min-w-[900px]">
                    <thead class="sticky top-0 bg-bb-panel z-20 shadow-md">
                        <tr class="text-[9px] text-bb-muted uppercase border-b border-bb-border">
                            <th class="p-2 cursor-pointer hover:text-white" data-sort="id">Coin</th>
                            <th class="p-2 text-right cursor-pointer hover:text-white" data-sort="change">📊 CHG %</th>
                            <th class="p-2 text-center cursor-pointer hover:text-white" data-sort="v1m">1m</th>
                            <th class="p-2 text-center cursor-pointer hover:text-white" data-sort="v5m">5m</th>
                            <th class="p-2 text-center cursor-pointer hover:text-white" data-sort="v10m">10m</th>
                            <th class="p-2 text-center cursor-pointer hover:text-white" data-sort="v15m">15m</th>
                            <th class="p-2 text-center cursor-pointer hover:text-white" data-sort="v20m">20m</th>
                            <th class="p-2 text-center cursor-pointer hover:text-white" data-sort="v30m">30m</th>
                            <th class="p-2 text-center cursor-pointer hover:text-white" data-sort="v1h">1h</th>
                            <th class="p-2 text-center cursor-pointer hover:text-white" data-sort="v24h">24h</th>
                        </tr>
                    </thead>
                    <tbody id="vol-scanner-body" class="divide-y divide-bb-border/10">
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
            updateUI();
        });
    });
}

export function update(allCoinData) {
    // allCoinData is Expected to be a Map or Object of all assets
    if (!allCoinData) return;
    lastDataMap = allCoinData;
    updateUI();
}

function updateUI() {
    const tbody = document.getElementById('vol-scanner-body');
    if (!tbody || !lastDataMap) return;

    const dataArray = [];
    Object.entries(lastDataMap).forEach(([coin, data]) => {
        const vol = data.raw?.VOL || {};
        const price = data.raw?.PRICE || {};

        const getBuyPct = (tf) => {
            const b = parseFloat(vol[`vol_BUY_${tf}`]) || 0;
            const s = parseFloat(vol[`vol_SELL_${tf}`]) || 0;
            const t = b + s;
            return t > 0 ? (b / t) * 100 : 50;
        };

        dataArray.push({
            id: coin,
            change: parseFloat(price.percent_change_1JAM) || 0,
            v1m: getBuyPct('1MENIT'),
            v5m: getBuyPct('5MENIT'),
            v10m: getBuyPct('10MENIT'),
            v15m: getBuyPct('15MENIT'),
            v20m: getBuyPct('20MENIT'),
            v30m: getBuyPct('30MENIT'),
            v1h: getBuyPct('1JAM'),
            v24h: getBuyPct('24JAM'),
        });
    });

    // Sort
    dataArray.sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];

        if (typeof valA === 'string') {
            return currentSort.direction === 'asc'
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
        }

        return currentSort.direction === 'asc' ? valA - valB : valB - valA;
    });

    const cell = (val) => {
        const color = val > 55 ? 'text-bb-green' : val < 45 ? 'text-bb-red' : 'text-bb-muted';
        const bg = val > 65 ? 'bg-bb-green/10' : val < 35 ? 'bg-bb-red/10' : '';
        return `<td class="p-2 text-center text-[10px] font-mono font-bold ${color} ${bg}">${Utils.safeFixed(val, 1)}%</td>`;
    };

    tbody.innerHTML = dataArray.map(item => {
        const chgColor = item.change >= 0 ? 'text-bb-green' : 'text-bb-red';

        return `
            <tr class="hover:bg-white/5 transition-colors cursor-pointer group" onclick="window.app.selectCoin('${item.id}')">
                <td class="p-2">
                    <div class="font-bold text-white group-hover:text-bb-gold transition-colors text-[10px]">${item.id}</div>
                </td>
                <td class="p-2 text-right font-mono font-bold ${chgColor} text-[10px]">
                    ${item.change > 0 ? '+' : ''}${Utils.safeFixed(item.change, 2)}%
                </td>
                ${cell(item.v1m)}
                ${cell(item.v5m)}
                ${cell(item.v10m)}
                ${cell(item.v15m)}
                ${cell(item.v20m)}
                ${cell(item.v30m)}
                ${cell(item.v1h)}
                ${cell(item.v24h)}
            </tr>
        `;
    }).join('');
}
