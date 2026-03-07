import { SIGNAL_COMPONENTS, CATEGORIES, detectUnitFromPath } from './viewSignalComposer.js';
import { computeData } from '../data_helpers.js';
import * as Utils from '../utils.js';

let container = null;
let lastCoin = null;

export function init() {
    // Optional init logic
}

export function render(targetContainer) {
    container = targetContainer;
    const coin = window.selectedCoin;

    // Set basic structure
    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black">
            <!-- HEADER -->
            <div class="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-bb-panel">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-black uppercase text-xs tracking-wider">COMPONENT INSPECTOR</span>
                    <span id="comp-coin-label" class="text-white/50 text-[10px] font-mono">${coin || '---'}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[9px] text-bb-muted uppercase">Data Source:</span>
                    <span class="text-[9px] text-white font-bold">INSTITUTIONAL / 15m</span>
                </div>
            </div>

            <!-- GRID CONTAINER -->
            <div id="components-grid" class="flex-1 overflow-y-auto custom-scrollbar p-2">
                ${renderGridContent(coin)}
            </div>
        </div>
    `;

    lastCoin = coin;
}

export function update(marketState) {
    if (!container) return;

    const coin = window.selectedCoin;
    const grid = document.getElementById('components-grid');
    const coinLabel = document.getElementById('comp-coin-label');

    if (coinLabel) coinLabel.innerText = coin || '---';

    if (grid) {
        // Full re-render of grid for now (can be optimized later)
        grid.innerHTML = renderGridContent(coin);
    }
}

function renderGridContent(coin) {
    if (!coin) return `<div class="h-full flex items-center justify-center text-bb-muted text-xs">Select a coin to view components</div>`;

    const mkt = window.marketState || {};
    const data = mkt[coin];

    if (!data) return `<div class="p-4 text-center text-bb-muted animate-pulse">Waiting for data stream...</div>`;

    // Detect best available timeframe
    let activeTf = '15MENIT';
    if (data.signals?.profiles?.INSTITUTIONAL_BASE?.timeframes) {
        const tfs = data.signals.profiles.INSTITUTIONAL_BASE.timeframes;
        if (!tfs['15MENIT']) {
            activeTf = tfs['5MENIT'] ? '5MENIT' : (tfs['1MENIT'] ? '1MENIT' : '15MENIT');
        }
    }

    // Use INSTITUTIONAL_BASE profile and selected timeframe for component view
    const computed = computeData(data, 'INSTITUTIONAL_BASE', activeTf);
    if (!computed) return `<div class="p-4 text-center text-bb-muted">Insufficient data for calculations (${activeTf})</div>`;

    // Group components by category
    const grouped = {};
    Object.values(SIGNAL_COMPONENTS).forEach(comp => {
        if (!grouped[comp.category]) grouped[comp.category] = [];
        grouped[comp.category].push(comp);
    });

    // Render grid
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            ${Object.keys(grouped).map(catKey => renderCategoryCard(catKey, grouped[catKey], computed)).join('')}
        </div>
    `;
}

function renderCategoryCard(catKey, components, data) {
    const cat = CATEGORIES[catKey] || { name: catKey, icon: '❓', color: 'gray-500' };
    const colorProp = cat.color || 'gray-500';
    // Remove "bb-" prefix (if any) and "-500" suffix to build the text class
    const colorClass = colorProp.replace('bb-', '').replace('-500', '').replace('-400', '');

    // Map tailwind-like color names to our custom OKX palette (or generic tailwind classes)
    let headerColor = `text-gray-300`;
    if (colorClass.includes('gold')) headerColor = 'text-bb-gold';
    else if (colorClass.includes('blue')) headerColor = 'text-bb-blue';
    else if (colorClass.includes('green') || colorClass.includes('emerald')) headerColor = 'text-bb-green';
    else if (colorClass.includes('red') || colorClass.includes('rose')) headerColor = 'text-bb-red';
    else if (colorClass.includes('purple') || colorClass.includes('indigo')) headerColor = 'text-purple-400';
    else if (colorClass.includes('orange') || colorClass.includes('yellow')) headerColor = 'text-orange-400';
    else if (colorClass.includes('cyan')) headerColor = 'text-cyan-400';

    return `
        <div class="bg-bb-card border border-white/5 rounded-lg overflow-hidden flex flex-col h-full hover:border-white/10 transition-colors">
            <div class="px-3 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-xs opacity-70">${cat.icon}</span>
                    <span class="text-[10px] font-bold ${headerColor} uppercase tracking-wider">${cat.name}</span>
                </div>
                <span class="text-[9px] text-white/20 font-mono">${components.length}</span>
            </div>
            <div class="p-2 space-y-0.5 flex-1">
                ${components.map(comp => renderComponentRow(comp, data)).join('')}
            </div>
        </div>
    `;
}

function renderComponentRow(comp, data) {
    // Normalize: auto-generated components use 'label', manual ones use 'name'
    const compName = comp.name || comp.label || comp.path?.split('.').pop() || '???';
    const compDesc = comp.description || comp.label || compName;

    // Get value safely
    const pathParts = (comp.path || '').split('.');
    let value = data;
    for (const part of pathParts) {
        if (!part) continue;
        value = value?.[part];
    }

    let displayValue = '-';
    let valueClass = 'text-gray-500';

    if (value !== undefined && value !== null) {
        const unit = detectUnitFromPath(comp.path || '');

        if (typeof value === 'boolean') {
            displayValue = value ? 'YES' : 'NO';
            valueClass = value ? 'text-bb-green font-bold' : 'text-bb-red font-bold';
        } else if (typeof value === 'string') {
            displayValue = value;
            const upWords = ['UP', 'LONG', 'BUY', 'BULLISH', 'HIGH', 'STRONG', 'EXTREME', 'WHALE', 'INSTITUTIONAL', 'HEALTHY', 'ALLOW', 'EFFORTLESS_MOVE'];
            const downWords = ['DOWN', 'SHORT', 'SELL', 'BEARISH', 'LOW', 'WEAK', 'RETAIL', 'CRITICAL', 'FRAGILE', 'BLOCK', 'NOISY'];

            const upperVal = value.toUpperCase();
            if (upWords.some(w => upperVal.includes(w))) {
                valueClass = 'text-bb-green font-bold';
            } else if (downWords.some(w => upperVal.includes(w))) {
                valueClass = 'text-bb-red font-bold';
            } else if (upperVal === 'BALANCED' || upperVal === 'NEUTRAL' || upperVal === 'MODERATE' || upperVal === 'NORMAL') {
                valueClass = 'text-bb-muted font-bold';
            } else {
                valueClass = 'text-white';
            }
        } else if (typeof value === 'number') {
            if (unit === '%' || compName.includes('%')) {
                displayValue = `${Utils.safeFixed(value, comp.displayDigits ?? 2)}%`;
                valueClass = value > 0 ? 'text-bb-green' : value < 0 ? 'text-bb-red' : 'text-gray-300';
            } else if ((comp.path || '').includes('PRICE') && !(comp.path || '').includes('CHANGE')) {
                displayValue = Utils.formatPrice(value);
                valueClass = 'text-bb-gold';
            } else if ((comp.path || '').includes('VOL') || (comp.path || '').includes('flow') || (comp.path || '').includes('TradeSz')) {
                displayValue = formatCompactNumber(value);
                valueClass = 'text-bb-blue';
            } else if (comp.category === 'INST' || comp.category === 'ENHANCED' || compName.includes('Ratio') || compName.includes('Beta') || compName.includes('Corr')) {
                displayValue = Utils.safeFixed(value, comp.displayDigits ?? 3);
                valueClass = value > 0.7 ? 'text-bb-green font-bold' : (value < 0.3 && value !== 0 && value > -100) ? 'text-bb-red font-bold' : 'text-white';
            } else {
                displayValue = Utils.safeFixed(value, comp.displayDigits ?? 2);
                valueClass = 'text-gray-200';
            }
        } else if (typeof value === 'object') {
            displayValue = JSON.stringify(value).substring(0, 30);
            valueClass = 'text-gray-400 italic';
        }
    }

    return `
        <div class="flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/5 group transition-colors">
            <div class="flex items-center gap-1.5 overflow-hidden w-2/3">
                <span class="text-[9px] text-bb-muted group-hover:text-white transition-colors truncate cursor-help" title="${compDesc}">${compName}</span>
            </div>
            <div class="text-[9px] font-mono ${valueClass} text-right w-1/3 truncate">
                ${displayValue}
            </div>
        </div>
    `;
}

function formatCompactNumber(number, decimals = 1) {
    if (number === undefined || number === null) return '--';
    return new Intl.NumberFormat('en-US', {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: decimals
    }).format(number);
}
