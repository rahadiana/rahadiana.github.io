import * as Utils from '../utils.js';

export function renderList(container, marketState, selectedCoin, onSelect) {
    if (!container) return;

    // Get all coins, sort by name
    const coins = Object.keys(marketState).sort();

    // Filter
    const filterInput = document.getElementById('coin-search');
    const filterText = filterInput ? filterInput.value.toUpperCase() : '';

    let visibleCount = 0;

    coins.forEach(coin => {
        const shouldShow = !filterText || coin.includes(filterText);
        let item = container.querySelector(`.coin-item[data-coin="${coin}"]`);

        if (!shouldShow) {
            if (item) item.style.display = 'none';
            return;
        }

        visibleCount++;
        const data = marketState[coin];
        const isSelected = coin === selectedCoin;

        // Data Extraction (Unified with Global Matrix)
        const price = data.raw?.PRICE?.last || 0;
        const change = data.raw?.PRICE?.percent_change_24h || 0; // Use 24H for consistency
        const fundAn = data.analytics?.funding || {};
        const funding = fundAn.currentRate !== undefined ? fundAn.currentRate : (data.raw?.FUNDING?.funding_Rate || 0);

        // High Precision Price Formatter
        const internalFormatPrice = (val) => {
            if (val === undefined || val === null || val === 0) return '--';
            if (val >= 1) return Utils.formatNumber(val, 2);
            if (val >= 0.01) return Utils.formatNumber(val, 4);
            if (val >= 0.0001) return Utils.formatNumber(val, 6);
            return Utils.formatNumber(val, 8);
        };

        // Signal Indicator
        let action = 'WAIT';
        const ms = data.masterSignals?.['15MENIT']?.['INSTITUTIONAL_BASE']
            || data.signals?.profiles?.['INSTITUTIONAL_BASE']?.timeframes?.['15MENIT']?.masterSignal;

        if (ms && ms.action) {
            action = ms.action;
        }

        const sigColor = (action === 'BUY' || action === 'LONG') ? 'bg-bb-green' : (action === 'SELL' || action === 'SHORT') ? 'bg-bb-red' : 'bg-bb-muted';
        const priceColor = change >= 0 ? 'text-bb-green' : 'text-bb-red';
        const selectClasses = isSelected ? 'bg-bb-panel border-l-4 border-l-bb-gold' : 'border-l-4 border-l-transparent';
        const baseClasses = `coin-item p-2 border-b border-bb-border cursor-pointer hover:bg-white/5 transition-colors ${selectClasses}`;

        // Create if not exists
        if (!item) {
            item = document.createElement('div');
            item.className = baseClasses;
            item.setAttribute('data-coin', coin);
            // Listener handled by delegation on container
            container.appendChild(item);
        } else {
            // Update classes
            item.className = baseClasses;
            item.style.display = 'block';
        }

        // Update Content
        item.innerHTML = `
            <div class="flex justify-between items-center mb-1 pointer-events-none">
                <div class="font-bold text-white text-xs">${coin}</div>
                <div class="flex items-center gap-1">
                    <span class="text-xxs text-bb-muted">${Utils.safeFixed(funding * 100, 4)}%</span>
                    <span class="w-1.5 h-1.5 rounded-full ${sigColor}"></span>
                </div>
            </div>
            
            <div class="flex justify-between items-center text-xs pointer-events-none">
                <div class="${priceColor} font-mono">${internalFormatPrice(price)}</div>
                <div class="${priceColor} font-bold">${change > 0 ? '+' : ''}${Utils.safeFixed(change, 2)}%</div>
            </div>
        `;
    });

    // Update count
    const countEl = document.getElementById('list-count');
    if (countEl) countEl.innerText = `${visibleCount} Pairs`;
}
