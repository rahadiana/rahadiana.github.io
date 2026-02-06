import * as Utils from '../utils.js'; // Hybrid namespace resolution

let onSelectCoin = null;

// Global State
let currentMatrix = 'OVERVIEW'; // Default matrix
let currentSort = { column: 'totalVol', dir: 'desc' };
let currentSearch = '';
let activeFilterChip = 'ALL';
let cachedMarketState = null;
let cachedProfile = 'AGGRESSIVE';
let cachedTimeframe = '15MENIT';

// ⚡ Export settings for other modules (like Composer)
window.globalViewSettings = { 
    get profile() { return cachedProfile; },
    get timeframe() { return cachedTimeframe; }
};

// Table Limit State (for performance)
const TABLE_LIMIT_KEY = 'bb_global_table_limit';
let tableLimit = (() => {
    try {
        const stored = localStorage.getItem(TABLE_LIMIT_KEY);
        return stored ? parseInt(stored, 10) : 50; // Default 50 rows
    } catch (e) {
        return 50;
    }
})();

// Alpha Sniper State
const SIGNAL_HISTORY_KEY = 'bb_signal_history';
const signalHistory = (() => {
    try {
        const stored = localStorage.getItem(SIGNAL_HISTORY_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
})();

function saveSignalHistory() {
    localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(signalHistory));
}

export function init(selectCoinCallback) {
    onSelectCoin = selectCoinCallback;
}

export function render(container) {
    const tabs = [
        'ALERTS', 'OVERVIEW', 'DECISION', 'SMART', 'SYNTHESIS', 'VOLATILITY', 'MICROSTRUCTURE', 'LIQUIDITY', 'DERIVATIVES',
        'REGIME', 'SENTIMENT', 'IO', 'PRICEMOVE', 'FREQUENCY',
        'VOLSPIKE', 'VOLDURABILITY', 'VOLRATIO', 'OPENINTEREST', 'FUNDING'
    ];

    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-mono overflow-hidden">
            <!-- TOP SUB-NAV -->
            <div class="flex items-stretch bg-bb-panel border-b border-bb-border h-8 shrink-0 px-2 gap-1 overflow-x-auto scrollbar-none">
                ${tabs.map(tab => `
                    <button data-matrix="${tab}" 
                        class="matrix-btn px-3 h-full flex items-center text-[9px] font-black tracking-tighter transition-all
                        ${tab === currentMatrix ? 'text-bb-gold border-b-2 border-bb-gold bg-bb-gold/5' : 'text-bb-muted hover:text-white border-b-2 border-transparent'}">
                        ${tab}
                    </button>
                `).join('')}
            </div>

            <!-- SEARCH & QUICK FILTERS -->
            <div class="flex flex-col gap-2 p-3 bg-bb-dark/30 border-b border-bb-border/50 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="relative flex-1 max-w-sm">
                        <span class="absolute inset-y-0 left-0 pl-2 flex items-center text-bb-muted pointer-events-none">
                             <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input type="text" id="global-search" placeholder="Search asset..." value="${currentSearch}"
                            class="w-full bg-bb-black border border-bb-border/50 rounded pl-7 pr-3 py-1 text-[10px] text-white focus:outline-none focus:border-bb-gold transition-colors placeholder-bb-muted font-bold">
                    </div>
                    
                    <!-- Row Limit Selector -->
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-bb-muted">SHOW:</span>
                        <select id="table-limit" class="bg-bb-black border border-bb-border/50 rounded px-1 py-0.5 text-[9px] text-white font-bold focus:outline-none focus:border-bb-gold cursor-pointer">
                            <option value="25" ${tableLimit === 25 ? 'selected' : ''}>25</option>
                            <option value="50" ${tableLimit === 50 ? 'selected' : ''}>50</option>
                            <option value="100" ${tableLimit === 100 ? 'selected' : ''}>100</option>
                            <option value="200" ${tableLimit === 200 ? 'selected' : ''}>200</option>
                            <option value="500" ${tableLimit === 500 ? 'selected' : ''}>500</option>
                            <option value="0" ${tableLimit === 0 ? 'selected' : ''}>ALL</option>
                        </select>
                    </div>
                    
                    <div class="flex items-center gap-4 ml-auto">
                        <span class="text-[10px] text-bb-gold font-bold uppercase tracking-widest" id="matrix-title">${currentMatrix} MATRIX</span>
                        <span class="text-[9px] text-bb-muted" id="global-count">Initializing...</span>
                    </div>
                </div>

                <div class="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                    ${['ALL', 'TRENDING', 'HIGH_VOL', 'BUY_SIGNAL', 'SELL_SIGNAL', 'CONVERGENCE', 'DISCOUNT', 'ARB_OPP', 'WHALE_ALERT'].map(chip => `
                        <button data-chip="${chip}" 
                            class="chip-btn px-2 py-0.5 rounded-sm border border-bb-border/50 text-[8px] font-black tracking-tight uppercase transition-all
                            ${activeFilterChip === chip ? 'bg-bb-gold text-black border-bb-gold' : 'text-bb-muted hover:text-white hover:border-bb-muted'}">
                            ${chip === 'BUY_SIGNAL' ? 'LONG SIGNAL' : chip === 'SELL_SIGNAL' ? 'SHORT SIGNAL' : chip === 'ARB_OPP' ? 'ARB OPPORTUNITY' : chip.replace('_', ' ')}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Table Container -->
            <div class="flex-1 overflow-hidden relative">
                <div class="absolute inset-0 overflow-auto scrollbar-thin">
                    <table class="w-max min-w-full text-left text-[10px] border-collapse" id="matrix-table">
                        <thead class="bg-bb-panel text-bb-muted uppercase sticky top-0 z-20 shadow-md border-b border-bb-border" id="matrix-head"></thead>
                        <tbody id="global-table-body" class="divide-y divide-bb-border/10 cursor-pointer"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // 1. Matrix Sub-tab handling
    container.querySelectorAll('.matrix-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMatrix = btn.getAttribute('data-matrix');
            container.querySelectorAll('.matrix-btn').forEach(b => {
                b.classList.remove('text-bb-gold', 'border-bb-gold', 'bg-bb-gold/5');
                b.classList.add('text-bb-muted', 'border-transparent');
            });
            btn.classList.add('text-bb-gold', 'border-bb-gold', 'bg-bb-gold/5');
            btn.classList.remove('text-bb-muted', 'border-transparent');
            document.getElementById('matrix-title').innerText = `${currentMatrix} MATRIX`;

            if (currentMatrix === 'OVERVIEW') currentSort = { column: 'totalVol', dir: 'desc' };
            else if (currentMatrix === 'DECISION' || currentMatrix === 'ALERTS') currentSort = { column: 'dashboard', dir: 'desc' };
            else if (currentMatrix === 'SYNTHESIS') currentSort = { column: 'netFlow15m', dir: 'desc' };
            else if (currentMatrix === 'VOLATILITY') currentSort = { column: 'atrPct', dir: 'desc' };
            else if (currentMatrix === 'SMART') currentSort = { column: 'smi', dir: 'desc' };
            else if (currentMatrix === 'PRICEMOVE') currentSort = { column: 'chg', dir: 'desc' };
            else if (currentMatrix === 'FREQUENCY') currentSort = { column: 'f15m', dir: 'desc' };
            else if (currentMatrix === 'VOLSPIKE') currentSort = { column: 's15m', dir: 'desc' };
            else if (currentMatrix === 'OPENINTEREST') currentSort = { column: 'oi1h', dir: 'desc' };
            else if (currentMatrix === 'FUNDING') currentSort = { column: 'funding', dir: 'desc' };

            renderHeader();
            if (cachedMarketState) update(cachedMarketState, cachedProfile, cachedTimeframe);
        });
    });

    // 2. Search & Filter Handlers
    const searchInp = container.querySelector('#global-search');
    if (searchInp) {
        searchInp.addEventListener('input', (e) => {
            currentSearch = e.target.value.toUpperCase();
            if (cachedMarketState) update(cachedMarketState, cachedProfile, cachedTimeframe);
        });
    }

    container.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeFilterChip = btn.getAttribute('data-chip');
            container.querySelectorAll('.chip-btn').forEach(b => {
                b.classList.remove('bg-bb-gold', 'text-black', 'border-bb-gold');
                b.classList.add('text-bb-muted', 'border-bb-border/50');
            });
            btn.classList.add('bg-bb-gold', 'text-black', 'border-bb-gold');
            btn.classList.remove('text-bb-muted', 'border-bb-border/50');
            if (cachedMarketState) update(cachedMarketState, cachedProfile, cachedTimeframe);
        });
    });

    // 3. Table Limit Handler
    const limitSelect = container.querySelector('#table-limit');
    if (limitSelect) {
        limitSelect.addEventListener('change', (e) => {
            tableLimit = parseInt(e.target.value, 10);
            localStorage.setItem(TABLE_LIMIT_KEY, tableLimit.toString());
            if (cachedMarketState) update(cachedMarketState, cachedProfile, cachedTimeframe);
        });
    }

    renderHeader();
}

const getSortArrow = (col) => {
    if (currentSort.column !== col) return '<span class="opacity-20 ml-1">↕</span>';
    return currentSort.dir === 'asc' ? '<span class="text-bb-gold ml-1">↑</span>' : '<span class="text-bb-gold ml-1">↓</span>';
};

window.globalSortMatrix = (col) => {
    if (currentSort.column === col) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = col;
        currentSort.dir = 'desc';
    }
    if (cachedMarketState) update(cachedMarketState, cachedProfile, cachedTimeframe);
};

const getSortVal = (r, col) => {
    const val = r[col];
    if (val && typeof val === 'object' && val.total !== undefined) return val.total;
    if (val && typeof val === 'object' && val.spike !== undefined) return val.spike;
    return val;
};
export function update(marketState, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    cachedMarketState = marketState;
    cachedProfile = profile;
    cachedTimeframe = timeframe;

    const coins = Object.keys(marketState);
    let dataArray = coins.map(id => {
        const data = marketState[id];
        const raw = data.raw || {};
        const dash = data.dashboard || {};
        const sigRoot = data.signals || {};
        const profileObj = sigRoot.profiles?.[profile] || {};
        const tfObj = profileObj.timeframes?.[timeframe] || {};
        const signals = tfObj.signals || {};
        const master = tfObj.masterSignal || {};
        const volModule = tfObj.volatility || signals.volatility || {};
        const price = raw.PRICE || sigRoot.PRICE || {};
        const vol = raw.VOL || sigRoot.VOL || {};
        const oiRaw = raw.OI || sigRoot.OI || {};
        const fundingRaw = raw.FUNDING || sigRoot.FUNDING || {};
        const analytics = data.analytics || {};
        const fundAn = analytics.funding || {};

        const getSpikeData = (tf, mult) => {
            const b = (vol[`vol_BUY_${tf}`] || 0);
            const s = (vol[`vol_SELL_${tf}`] || 0);
            const t = b + s;
            const h1Base = ((vol.vol_buy_1JAM || 0) + (vol.vol_sell_1JAM || 0)) / 60;
            const ratio = t > 0 ? (b - s) / t : 0;
            const durability = h1Base > 0 ? Math.min(1.0, (t / mult) / h1Base) : 0;
            const spike = h1Base > 0 ? (t / mult) / h1Base : 0;

            // ⭐ Institutional Upgrade: AVG-based Spike (Historical)
            const avgVal = raw.AVG || sigRoot.AVG || {};
            const histBuy = avgVal[`avg_VOLCOIN_buy_${tf}`] || 0;
            const histSell = avgVal[`avg_VOLCOIN_sell_${tf}`] || 0;
            const histTotal = histBuy + histSell;
            const histPace = histTotal / mult;
            const avgSpike = histPace > 0 ? (t / mult) / histPace : 0;

            return { spike, avgSpike, ratio, durability };
        };

        const getFreqData = (tf) => {
            const freq = raw.FREQ || sigRoot.FREQ || {};
            const b = freq[`freq_BUY_${tf}`] || 0;
            const s = freq[`freq_SELL_${tf}`] || 0;
            const t = b + s;
            const net = b - s;
            const ratio = t > 0 ? net / t : 0;
            return { total: t, buy: b, sell: s, net, ratio };
        };

        const syn = data.synthesis || {};
        const flow = syn.flow || {};
        const eff = syn.efficiency || {};
        const mom = syn.momentum || {};

        return {
            id,
            coin: id,
            // Synthesis Data
            netFlow15m: flow.net_flow_15MENIT || 0,
            flowBias: flow.capital_bias_15MENIT || 'NEUTRAL',
            char15m: eff.character_15MENIT || 'NORMAL',
            eff15m: eff.efficiency_15MENIT || 0,
            fric15m: eff.friction_15MENIT || 0,
            aggr15m: mom.aggression_level_15MENIT || 'RETAIL',
            velocity15m: mom.velocity_15MENIT || 0,
            price: price.last || 0,
            high: price.high || 0,
            low: price.low || 0,
            totalVol: (() => {
                const coinVol = price.total_vol || 0;
                const px = price.last || 0;
                const fiat = price.total_vol_fiat || 0;
                // Force manual calculation to ensure USD accuracy
                if (coinVol > 0 && px > 0) return coinVol * px;
                return fiat || coinVol || 0;
            })(),
            chg: price.percent_change_24h || 0,
            chg1h: price.percent_change_1JAM || 0,
            chgFromLow: price.percent_change_from_bottom || 0,
            chgFromHigh: price.percent_change_from_top || 0,
            dashboard: master.normalizedScore || 0,
            action: master.action || 'WAIT',
            conf: master.confidence || 0,
            confCount: master.confirmations || 0,
            confRequired: master.requiredConfirmations || 3,

            // SMART Matrix Mapping (REPAIRED)
            smi: master.normalizedScore || 0,
            intensity: dash.intensity?.intensity || signals.microstructure?.vpin?.rawValue || 0,
            divergence: signals.microstructure?.volumeFreqDivergence?.rawValue || 0,
            accum: dash.accumScore?.accumScore || 0,
            whale: signals.microstructure?.volumeFreqDivergence?.rawValue || 0,
            riRatio: dash.riRatio?.riRatio || 0,
            pressure: signals.microstructure?.vwoi?.rawValue || 0,
            trend: sigRoot.marketRegime?.currentRegime || 'RANGING',
            breakout: dash.breakoutPct?.breakoutPct || 0,
            lsi: signals.sentiment?.sentimentAlignment?.normalizedScore || 50,
            mode: sigRoot.volatilityRegime?.regime || 'NORMAL',
            signal: master.action || 'WAIT',
            volQuality: dash.volQuality?.qualityScore || (getSpikeData('15MENIT', 15).durability * 100),

            // VOLATILITY Matrix Mapping
            atrPct: volModule.atrMomentum?.metadata?.atrPct || 0,
            gkPct: volModule.gkVolatility?.metadata?.gkVolPct || 0,
            avgVol: volModule.volatilityRegime?.avgVolatility || 0,
            volRegime: volModule.volatilityRegime?.regime || 'NORMAL',

            fundingDiv: {
                rate: fundAn.currentRate || 0,
                hasDivergence: fundAn.hasDivergence || false
            },
            liqQuality: dash.liqQuality?.qualityScore || signals.derivatives?.liquidationCascade?.normalizedScore || 0,
            momentum: signals.volatility?.atrMomentum?.rawValue || 0,

            // Raw Microstructure
            vpin: signals.microstructure?.vpin?.rawValue || 0,
            lambda: signals.microstructure?.kyleLambda?.rawValue || 0,
            vwoi: signals.microstructure?.vwoi?.rawValue || 0,
            ofi: signals.orderBook?.ofi?.normalizedScore || 50,
            bidDepth: raw.OB?.bidDepth || 0,
            askDepth: raw.OB?.askDepth || 0,
            spread: raw.OB?.spreadBps || 0,
            slip100k: (() => {
                const s = signals.orderBook?.slippageScore?.metadata || {};
                const ob = raw.OB || {};
                let val = s.slippage100k || ob.slippage100k || (ob.slippage10k * 5) || (raw.OB?.spreadBps * 1.5 / 100);
                return Math.max(0.001, val || 0);
            })(),
            wallCount: (() => {
                const ob = raw.OB || {};
                const w = [
                    ...(ob.depthProfile?.heatmap?.askWalls || []),
                    ...(ob.depthProfile?.heatmap?.bidWalls || []),
                    ...(ob.askWalls || []),
                    ...(ob.bidWalls || [])
                ].filter(x => x && x.price > 0 && x.size > 0);
                return w.length;
            })(),
            bookHealth: raw.OB?.bookHealth || 'N/A',
            oi: raw.OI?.oiChange1h || 0,
            funding: fundAn.currentRate !== undefined ? fundAn.currentRate : (fundingRaw.funding_Rate || 0),
            nextFunding: fundAn.nextRate !== undefined ? fundAn.nextRate : (fundingRaw.funding_nextFundingRate || 0),
            payout8h: fundAn.fundingAPR || (fundAn.currentRate ? fundAn.currentRate * 3 * 365 * 100 : 0), // Use APR as the projection
            fundingBias: fundAn.fundingPressure || (fundingRaw.funding_Rate > 0 ? 'LONG HEAVY' : fundingRaw.funding_Rate < 0 ? 'SHORT HEAVY' : 'BALANCED'),
            liqRisk: signals.derivatives?.liquidationCascade?.normalizedScore || 0,
            marketRegime: sigRoot.marketRegime?.currentRegime || 'RANGING',
            volRegime: sigRoot.volatilityRegime?.regime || 'NORMAL',
            lsr: signals.sentiment?.sentimentAlignment?.normalizedScore || 50,
            lsrZ: signals.sentiment?.sentimentAlignment?.metadata?.avgZScore || 0,
            lsrRatio: (() => {
                const lsrData = sigRoot.LSR || raw.LSR || {};
                const tfMap = { '1MENIT': 'timeframes_5min', '5MENIT': 'timeframes_5min', '15MENIT': 'timeframes_15min', '30MENIT': 'timeframes_15min', '1JAM': 'timeframes_1hour', '4JAM': 'timeframes_4hour', '1HARI': 'timeframes_1day' };
                const key = tfMap[timeframe] || 'timeframes_15min';
                return lsrData[key]?.longShortRatio || 1.0;
            })(),
            takerBuy: analytics.orderFlow?.takerBuyRatio || 0.5,
            aggressive: analytics.orderFlow?.aggressiveBuyPct || 0.5,
            tradeSizeImb: analytics.orderFlow?.tradeSizeImbalance || 0,

            // Other TF data
            chg1m: price.percent_change_1MENIT || 0,
            chg5m: price.percent_change_5MENIT || 0,
            chg15m: price.percent_change_15MENIT || 0,
            chg24h: price.percent_change_24h || 0,
            s1m: getSpikeData('1MENIT', 1),
            s5m: getSpikeData('5MENIT', 5),
            s10m: getSpikeData('10MENIT', 10),
            s15m: getSpikeData('15MENIT', 15),
            s20m: getSpikeData('20MENIT', 20),
            s30m: getSpikeData('30MENIT', 30),
            s1h: getSpikeData('1JAM', 60),
            s2h: getSpikeData('2JAM', 120),
            s24h: getSpikeData('24JAM', 1440),
            oi5m: oiRaw.oiChange5m || 0,
            oi15m: oiRaw.oiChange15m || 0,
            oi1h: oiRaw.oiChange1h || 0,
            oi4h: oiRaw.oiChange4h || 0,
            oi24h: oiRaw.oiChange24h || 0,
            oiAbs: oiRaw.oi || 0,
            f1m: getFreqData('1MENIT'),
            f5m: getFreqData('5MENIT'),
            f15m: getFreqData('15MENIT'),
            f1h: getFreqData('1JAM'),
            f2h: getFreqData('2JAM'),
            f24h: getFreqData('24JAM'),
            vwapDelta: (() => {
                const vwap = analytics.execution?.vwap || 0;
                if (vwap > 0 && price.last > 0) return ((price.last - vwap) / vwap) * 100;
                return 0;
            })(),
            mtf: (() => {
                let buys = 0; let sells = 0;
                const checkTfs = ['1MENIT', '5MENIT', '15MENIT', '1JAM'];
                checkTfs.forEach(t => {
                    const act = profileObj.timeframes?.[t]?.masterSignal?.action || 'WAIT';
                    if (act === 'LONG') buys++; else if (act === 'SHORT') sells++;
                });
                if (buys === checkTfs.length) return 'BULL';
                if (sells === checkTfs.length) return 'BEAR';
                if (buys >= 3) return 'L-BULL';
                if (sells >= 3) return 'L-BEAR';
                return 'CHOP';
            })(),

            // Alpha Sniper Age tracking
            ts: (() => {
                const key = `${id}:${timeframe}:${profile}`;
                const act = master.action || 'WAIT';
                if (act === 'WAIT') {
                    delete signalHistory[key];
                    return 0;
                }
                if (!signalHistory[key] || signalHistory[key].action !== act) {
                    signalHistory[key] = { action: act, ts: Date.now() };
                    saveSignalHistory();
                }
                return signalHistory[key].ts;
            })(),
            isTrap: (master.action === 'LONG' && eff.character_15MENIT === 'ABSORPTION') || (master.action === 'SHORT' && eff.character_15MENIT === 'ABSORPTION'),
            isAlpha: (master.action === 'LONG' && flow.capital_bias_15MENIT === 'ACCUMULATION') || (master.action === 'SHORT' && flow.capital_bias_15MENIT === 'DISTRIBUTION')
        };
    });

    if (currentSearch) dataArray = dataArray.filter(r => r.id.includes(currentSearch) || r.coin.includes(currentSearch));

    // Matrix-level Filtering
    // Note: masterSignal.action uses LONG/SHORT/NEUTRAL, not BUY/SELL
    if (currentMatrix === 'ALERTS') {
        dataArray = dataArray.filter(r => (r.action === 'LONG' || r.action === 'SHORT') && r.dashboard > 50);
    }

    if (activeFilterChip !== 'ALL') {
        dataArray = dataArray.filter(r => {
            if (activeFilterChip === 'TRENDING') return r.marketRegime.includes('TREND');
            if (activeFilterChip === 'HIGH_VOL') return r.volRegime === 'HIGH_VOL' || r.volRegime === 'EXTREME_VOL';
            if (activeFilterChip === 'BUY_SIGNAL') return r.action === 'LONG';
            if (activeFilterChip === 'SELL_SIGNAL') return r.action === 'SHORT';
            if (activeFilterChip === 'CONVERGENCE') return r.mtf === 'BULL' || r.mtf === 'BEAR';
            if (activeFilterChip === 'DISCOUNT') return r.vwapDelta < -1.0;
            if (activeFilterChip === 'ARB_OPP') return r.fundingDiv?.hasDivergence === true || r.payout8h > 100;
            if (activeFilterChip === 'WHALE_ALERT') return r.whale > 0.35 || r.id.includes('BTC') || r.id.includes('ETH');
            return true;
        });
    }

    // Sort before limiting
    dataArray.sort((a, b) => {
        const valA = getSortVal(a, currentSort.column);
        const valB = getSortVal(b, currentSort.column);
        if (typeof valA === 'string') return currentSort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return currentSort.dir === 'asc' ? valA - valB : valB - valA;
    });

    // Apply table limit for performance (after sort, before render)
    const totalFiltered = dataArray.length;
    if (tableLimit > 0 && dataArray.length > tableLimit) {
        dataArray = dataArray.slice(0, tableLimit);
    }

    // Update count display
    const countEl = document.getElementById('global-count');
    if (countEl) {
        if (tableLimit > 0 && totalFiltered > tableLimit) {
            countEl.innerText = `${dataArray.length} of ${totalFiltered} Pairs`;
        } else {
            countEl.innerText = `${dataArray.length} Pairs`;
        }
    }

    renderRows(dataArray);
}

function renderHeader() {
    const head = document.getElementById('matrix-head');
    if (!head) return;

    const th = (label, key, align = 'text-left', extraClasses = '') => `
        <th class="p-2 cursor-pointer hover:text-white select-none whitespace-nowrap border-r border-bb-border/20 ${align} ${extraClasses}" 
            onclick="window.globalSortMatrix('${key}')">
            ${label}${getSortArrow(key)}
        </th>
    `;

    let html = '<tr>';
    html += th('COIN', 'coin', 'text-left', 'w-32');

    if (currentMatrix === 'ALERTS') {
        html += th('CHG% 24H', 'chg', 'text-right', 'w-24');
        html += th('URGENCY', 'dashboard', 'text-center');
        html += th('SIGNAL', 'action', 'text-center');
        html += th('SCORE', 'dashboard', 'text-center');
        html += th('CONFLU', 'confCount', 'text-center');
        html += th('SNIPER', 'isAlpha', 'text-center');
        html += th('LIVE AGE', 'ts', 'text-right');
    } else if (currentMatrix === 'VOLATILITY') {
        html += th('CHG% 24H', 'chg', 'text-right', 'w-24');
        html += th('ATR MOM%', 'atrPct', 'text-right');
        html += th('GK VOL%', 'gkPct', 'text-right');
        html += th('REGIME', 'volRegime', 'text-center');
        html += th('AVG VOL%', 'avgVol', 'text-right');
        html += th('MOMENTUM', 'momentum', 'text-center');
    } else if (currentMatrix === 'OVERVIEW') {
        html += th('PRICE', 'price', 'text-right', 'w-32');
        html += th('VOL 24H', 'totalVol', 'text-right', 'w-32');
        html += th('HEALTH', 'bookHealth', 'text-center');
        html += th('MTF', 'mtf', 'text-center');
        html += th('LSR', 'lsrRatio', 'text-center');
        html += th('VWAP Δ', 'vwapDelta', 'text-center');
        html += th('SYNTH', 'char15m', 'text-center');
        html += th('CHG 24H', 'chg', 'text-right', 'w-24');
    } else if (currentMatrix === 'SMART') {
        html += th('💰 SMI', 'smi', 'text-center');
        html += th('🔥 INTEN', 'intensity', 'text-center');
        html += th('💥 DIVX', 'divergence', 'text-center');
        html += th('🎯 ACC', 'accum', 'text-center');
        html += th('🐋 WHALE', 'whale', 'text-center');
        html += th('👥 R/I', 'riRatio', 'text-center');
        html += th('💪 PRES', 'pressure', 'text-center');
        html += th('📈 TREND', 'trend', 'text-center');
        html += th('🚀 BO%', 'breakout', 'text-center');
        html += th('⚡ LSI', 'lsi', 'text-center');
        html += th('🏷️ MODE', 'mode', 'text-center');
        html += th('💡 SIG', 'signal', 'text-center');
        html += th('📉 VQ', 'volQuality', 'text-center');
        html += th('⚖️ FDIV', 'fundingDiv', 'text-center');
        html += th('💧 LQ', 'liqQuality', 'text-center');
        html += th('🕒 MOM', 'momentum', 'text-center');
    } else {
        html += th('CHG%', 'chg', 'text-right', 'w-24');
        if (currentMatrix === 'DECISION') {
            html += th('SIGNAL', 'action', 'text-center');
            html += th('SCORE', 'dashboard', 'text-center');
            html += th('CONF', 'conf', 'text-center');
            html += th('CONFLU', 'confCount', 'text-center');
        } else if (currentMatrix === 'SYNTHESIS') {
            html += th('NET FLOW 15M', 'netFlow15m', 'text-right');
            html += th('BIAS', 'flowBias', 'text-center');
            html += th('CHARACTER', 'char15m', 'text-center');
            html += th('AGGR', 'aggr15m', 'text-center');
            html += th('EFFI', 'eff15m', 'text-center');
            html += th('FRIC', 'fric15m', 'text-center');
            html += th('VELO', 'velocity15m', 'text-right');
        } else if (currentMatrix === 'MICROSTRUCTURE') {
            html += th('VPIN', 'vpin', 'text-center');
            html += th('KYLE', 'lambda', 'text-center');
            html += th('VWOI', 'vwoi', 'text-center');
            html += th('WHALE', 'whale', 'text-center');
        } else if (currentMatrix === 'LIQUIDITY') {
            html += th('OFI', 'ofi', 'text-center');
            html += th('BID-D', 'bidDepth', 'text-right');
            html += th('ASK-D', 'askDepth', 'text-right');
            html += th('HEALTH', 'bookHealth', 'text-center');
            html += th('SLIP 100K', 'slip100k', 'text-center');
            html += th('WALLS', 'wallCount', 'text-center');
            html += th('SPREAD', 'spread', 'text-center');
        } else if (currentMatrix === 'DERIVATIVES') {
            html += th('OI 1H', 'oi', 'text-center');
            html += th('FUNDING', 'funding', 'text-right');
            html += th('LIQ', 'liqRisk', 'text-center');
        } else if (currentMatrix === 'REGIME') {
            html += th('REGIME', 'marketRegime', 'text-center');
            html += th('VOL', 'volRegime', 'text-center');
        } else if (currentMatrix === 'SENTIMENT') {
            html += th('LSR', 'lsr', 'text-center');
            html += th('LSR-Z', 'lsrZ', 'text-center');
        } else if (currentMatrix === 'IO') {
            html += th('TAKER', 'takerBuy', 'text-center');
            html += th('AGGR', 'aggressive', 'text-center');
            html += th('IMB', 'tradeSizeImb', 'text-center');
        } else if (currentMatrix === 'PRICEMOVE') {
            html += th('1M%', 'chg1m', 'text-center');
            html += th('5M%', 'chg5m', 'text-center');
            html += th('15M%', 'chg15m', 'text-center');
            html += th('24H%', 'chg24h', 'text-center');
            html += th('FROM LOW', 'chgFromLow', 'text-center');
            html += th('FROM HIGH', 'chgFromHigh', 'text-center');
        } else if (currentMatrix === 'FREQUENCY') {
            html += th('1M FRQ', 'f1m', 'text-center');
            html += th('5M FRQ', 'f5m', 'text-center');
            html += th('15M FRQ', 'f15m', 'text-center');
            html += th('1H FRQ', 'f1h', 'text-center');
            html += th('2H FRQ', 'f2h', 'text-center');
            html += th('24H FRQ', 'f24h', 'text-center');
        } else if (currentMatrix === 'VOLSPIKE') {
            html += th('1M', 's1m', 'text-center');
            html += th('5M', 's5m', 'text-center');
            html += th('10M', 's10m', 'text-center');
            html += th('15M', 's15m', 'text-center');
            html += th('20M', 's20m', 'text-center');
            html += th('30M', 's30m', 'text-center');
            html += th('1H', 's1h', 'text-center');
            html += th('2H', 's2h', 'text-center');
            html += th('24H', 's24h', 'text-center');
        } else if (currentMatrix === 'VOLDURABILITY') {
            html += th('1M DUR', 's1m', 'text-center');
            html += th('5M DUR', 's5m', 'text-center');
            html += th('10M DUR', 's10m', 'text-center');
            html += th('15M DUR', 's15m', 'text-center');
            html += th('20M DUR', 's20m', 'text-center');
            html += th('30M DUR', 's30m', 'text-center');
            html += th('1H DUR', 's1h', 'text-center');
            html += th('2H DUR', 's2h', 'text-center');
            html += th('24H DUR', 's24h', 'text-center');
        } else if (currentMatrix === 'VOLRATIO') {
            html += th('1M RATIO', 's1m', 'text-center');
            html += th('5M RATIO', 's5m', 'text-center');
            html += th('10M RATIO', 's10m', 'text-center');
            html += th('15M RATIO', 's15m', 'text-center');
            html += th('20M RATIO', 's20m', 'text-center');
            html += th('30M RATIO', 's30m', 'text-center');
            html += th('1H RATIO', 's1h', 'text-center');
            html += th('2H RATIO', 's2h', 'text-center');
            html += th('24H RATIO', 's24h', 'text-center');
        } else if (currentMatrix === 'OPENINTEREST') {
            html += th('5M CHG', 'oi5m', 'text-center');
            html += th('15M CHG', 'oi15m', 'text-center');
            html += th('1H CHG', 'oi1h', 'text-center');
            html += th('24H CHG', 'oi24h', 'text-center');
            html += th('TOTAL OI', 'oiAbs', 'text-right');
        } else if (currentMatrix === 'FUNDING') {
            html += th('CURRENT RATE', 'funding', 'text-right');
            html += th('NEXT RATE', 'nextFunding', 'text-right');
            html += th('8H PROJECTED', 'payout8h', 'text-right');
            html += th('BIAS', 'fundingBias', 'text-center');
            html += th('LIQ RISK', 'liqRisk', 'text-center');
        }
    }

    html += '</tr>';
    head.innerHTML = html;
}

function renderRows(data) {
    const tbody = document.getElementById('global-table-body');
    if (!tbody) return;

    tbody.innerHTML = data.map(r => {
        const wrap = (content, align = 'text-left', classes = '', extraStyles = '') => `
            <td class="p-2 ${align} border-r border-bb-border/5 ${classes}" style="${extraStyles}">${content || '-'}</td>
        `;

        const getDurColor = (score) => {
            if (score < 20) return 'bg-bb-muted';
            if (score < 40) return 'bg-bb-gold';
            if (score < 65) return 'bg-bb-blue';
            return 'bg-bb-green';
        };

        const getRatioColor = (ratio) => {
            if (ratio >= 0.30) return 'text-bb-green';
            if (ratio >= 0.10) return 'text-bb-green/60';
            if (ratio <= -0.30) return 'text-bb-red';
            if (ratio <= -0.10) return 'text-bb-red/60';
            return 'text-bb-muted';
        };

        let rowHtml = wrap(r.coin, 'text-left', 'font-black text-white group-hover:text-bb-gold', 'width: 128px;');

        if (currentMatrix === 'OVERVIEW') {
            const internalFormatPrice = (val) => {
                if (val === undefined || val === null || val === 0) return '--';
                if (val >= 1) return Utils.formatNumber(val, 2);
                if (val >= 0.01) return Utils.formatNumber(val, 4);
                if (val >= 0.0001) return Utils.formatNumber(val, 6);
                return Utils.formatNumber(val, 8);
            };

            rowHtml += wrap(`$${internalFormatPrice(r.price)}`, 'text-right', 'font-mono text-white', 'width: 128px;');
            rowHtml += wrap(`$${Utils.formatNumber(r.totalVol, 0)}`, 'text-right', 'font-mono text-bb-gold', 'width: 128px;');

            const hColor = r.bookHealth === 'HEALTHY' || r.bookHealth === 'STABLE' ? 'text-bb-green' :
                ['FRAGILE', 'THIN', 'CAUTION'].includes(r.bookHealth) ? 'text-bb-gold' :
                    ['CRITICAL', 'DISRUPTED'].includes(r.bookHealth) ? 'text-bb-red font-bold' : 'text-bb-muted';
            rowHtml += wrap(`<span class="px-1.5 py-0.5 bg-white/5 rounded-[2px] text-[8px] font-black tracking-tighter ${hColor}">${r.bookHealth}</span>`, 'text-center');

            const mColor = r.mtf === 'BULL' ? 'text-bb-green font-black' : r.mtf === 'BEAR' ? 'text-bb-red font-black' :
                r.mtf.includes('L-') ? 'text-white opacity-60' : 'text-bb-muted';
            rowHtml += wrap(`<span class="px-1 bg-white/5 rounded-[2px] text-[8px] ${mColor}">${r.mtf}</span>`, 'text-center');

            const lsrColor = r.lsrRatio > 1.3 ? 'text-bb-red' : r.lsrRatio < 0.8 ? 'text-bb-green' : 'text-white';
            rowHtml += wrap(r.lsrRatio.toFixed(2), 'text-center', `font-mono font-bold ${lsrColor}`);

            const vColor = r.vwapDelta > 0.5 ? 'text-bb-red' : r.vwapDelta < -0.5 ? 'text-bb-green font-bold' : 'text-white/60';
            rowHtml += wrap(`${r.vwapDelta > 0 ? '+' : ''}${r.vwapDelta.toFixed(2)}%`, 'text-center', `font-mono text-[9px] ${vColor}`);

            let synthBadge = '-';
            if (r.char15m === 'ABSORPTION') synthBadge = '<span class="text-bb-gold font-black animate-pulse">ABS</span>';
            else if (r.char15m === 'EFFORTLESS_MOVE') synthBadge = '<span class="text-bb-blue font-black">EFF</span>';
            else if (r.netFlow15m > 0) synthBadge = '<span class="text-bb-green opacity-40">IN</span>';
            else if (r.netFlow15m < 0) synthBadge = '<span class="text-bb-red opacity-40">OUT</span>';
            rowHtml += wrap(synthBadge, 'text-center', 'text-[8px] font-black');

            rowHtml += wrap(`${r.chg > 0 ? '+' : ''}${r.chg.toFixed(2)}%`, 'text-right', `font-mono ${r.chg >= 0 ? 'text-bb-green' : 'text-bb-red'} font-bold`, 'width: 96px;');
        } else if (currentMatrix === 'SMART') {
            // High Density Smart Columns (Verified Data)
            rowHtml += wrap(`<span class="${r.smi > 60 ? 'text-bb-green' : r.smi < 40 ? 'text-bb-red' : 'text-bb-muted'} font-black">${r.smi.toFixed(0)}</span>`, 'text-center');
            rowHtml += wrap(r.intensity ? r.intensity.toFixed(2) : '-', 'text-center', r.intensity > 1.8 ? 'text-bb-red font-bold' : 'text-bb-muted');
            rowHtml += wrap(r.divergence ? r.divergence.toFixed(2) : '-', 'text-center', r.divergence > 0.3 ? 'text-bb-gold font-bold' : 'text-bb-muted');
            rowHtml += wrap(r.accum ? r.accum.toFixed(0) : '-', 'text-center', r.accum > 60 ? 'text-bb-green' : r.accum < 40 ? 'text-bb-red' : 'text-bb-muted');
            rowHtml += wrap(r.whale > 0.3 ? '🐋' : '-', 'text-center');
            rowHtml += wrap(r.riRatio ? `${(r.riRatio * 100).toFixed(0)}%` : '-', 'text-center', r.riRatio > 0.7 ? 'text-bb-green' : r.riRatio < 0.3 ? 'text-bb-muted/50' : 'text-bb-muted');
            rowHtml += wrap(r.pressure ? r.pressure.toFixed(2) : '0', 'text-center', r.pressure > 0.1 ? 'text-bb-green' : r.pressure < -0.1 ? 'text-bb-red' : 'text-bb-muted');
            rowHtml += wrap(`<span class="px-1 bg-white/5 text-[8px]">${r.trend}</span>`, 'text-center');
            rowHtml += wrap(r.breakout ? `${r.breakout.toFixed(0)}%` : '0%', 'text-center', r.breakout > 70 ? 'text-bb-gold font-bold' : 'text-bb-muted');
            rowHtml += wrap(r.lsi ? r.lsi.toFixed(0) : '-', 'text-center', r.lsi > 65 ? 'text-bb-green' : r.lsi < 35 ? 'text-bb-red' : 'text-bb-muted');
            rowHtml += wrap(r.mode, 'text-center', 'text-[8px] opacity-70');
            const sigColor = r.signal === 'LONG' ? 'text-bb-green' : r.signal === 'SHORT' ? 'text-bb-red' : 'text-bb-muted';
            const sigText = r.signal === 'LONG' ? 'LONG' : r.signal === 'SHORT' ? 'SHORT' : 'WAIT';
            rowHtml += wrap(sigText, 'text-center', `font-black ${sigColor}`);
            rowHtml += wrap(`<div class="w-8 h-1 bg-bb-border/20 mx-auto rounded-full overflow-hidden"><div class="h-full ${getDurColor(r.volQuality)}" style="width: ${r.volQuality}%"></div></div>`, 'text-center');

            const fRate = r.fundingDiv?.rate || 0;
            const fDiv = r.fundingDiv?.hasDivergence || false;
            const fColor = fRate > 0.0005 ? 'text-bb-red' : fRate < -0.0005 ? 'text-bb-green' : 'text-bb-muted';
            const fText = `${(fRate * 100).toFixed(3)}%`;
            rowHtml += wrap(`<span class="${fColor} ${fDiv ? 'ring-1 ring-bb-gold rounded px-0.5' : ''}">${fDiv ? '⚠️' : ''}${fText}</span>`, 'text-center', 'text-[8px] font-mono');

            rowHtml += wrap(r.liqQuality ? `${r.liqQuality.toFixed(0)}%` : '0%', 'text-center', r.liqQuality > 70 ? 'text-bb-red' : 'text-bb-muted');
            rowHtml += wrap(r.momentum ? r.momentum.toFixed(1) : '-', 'text-center', r.momentum > 2.0 ? 'text-bb-red' : r.momentum < 0.5 ? 'text-bb-green' : 'text-bb-muted');

        } else {
            rowHtml += wrap(`${r.chg > 0 ? '+' : ''}${r.chg.toFixed(2)}%`, 'text-right', `font-mono ${r.chg >= 0 ? 'text-bb-green' : 'text-bb-red'} font-bold`, 'width: 96px;');

            if (currentMatrix === 'DECISION') {
                const action = r.action || 'WAIT';
                const sigColor = action === 'LONG' ? 'text-bb-green' : action === 'SHORT' ? 'text-bb-red' : 'text-bb-muted';
                const sigText = action === 'LONG' ? 'LONG' : action === 'SHORT' ? 'SHORT' : 'WAIT';

                // Color bar based on conviction AND direction
                const barColor = action === 'LONG' ? 'bg-bb-green' : action === 'SHORT' ? 'bg-bb-red' : 'bg-bb-muted opacity-30';

                rowHtml += wrap(sigText, 'text-center', `font-black ${sigColor}`);
                rowHtml += wrap(`<div class="h-1 bg-bb-border/20 rounded overflow-hidden"><div class="h-full ${barColor}" style="width: ${r.dashboard}%"></div></div>`, 'text-center');
                rowHtml += wrap(`${Math.round(r.conf)}%`, 'text-center', 'text-bb-gold font-bold');
                rowHtml += wrap(`${r.confCount}/${r.confRequired}`, 'text-center', 'text-white opacity-60');
            } else if (currentMatrix === 'MICROSTRUCTURE') {
                rowHtml += wrap(r.vpin.toFixed(3), 'text-center', r.vpin > 0.6 ? 'text-bb-red' : 'text-white');
                rowHtml += wrap(r.lambda.toFixed(6), 'text-center', 'text-bb-blue');
                rowHtml += wrap(r.vwoi.toFixed(2), 'text-center', r.vwoi > 0.1 ? 'text-bb-green' : r.vwoi < -0.1 ? 'text-bb-red' : 'text-bb-muted');
                rowHtml += wrap(r.whale.toFixed(2), 'text-center', 'text-bb-gold');
            } else if (currentMatrix === 'SYNTHESIS') {
                const fColor = r.netFlow15m > 0 ? 'text-bb-green' : r.netFlow15m < 0 ? 'text-bb-red' : 'text-bb-muted';
                rowHtml += wrap(`$${Utils.formatNumber(r.netFlow15m, 0)}`, 'text-right', `font-mono ${fColor}`);

                const bColor = r.flowBias === 'ACCUMULATION' ? 'text-bb-green' : 'text-bb-red';
                rowHtml += wrap(`<span class="px-1.5 bg-white/5 text-[8px] font-black ${bColor}">${r.flowBias}</span>`, 'text-center');

                let charBadge = 'text-bb-muted';
                if (r.char15m === 'ABSORPTION') charBadge = 'text-bb-gold font-black italic animate-pulse';
                if (r.char15m === 'EFFORTLESS_MOVE') charBadge = 'text-bb-blue font-black';
                rowHtml += wrap(`<span class="text-[9px] ${charBadge}">${r.char15m}</span>`, 'text-center');

                const aColor = r.aggr15m === 'INSTITUTIONAL' ? 'text-bb-gold' : r.aggr15m === 'ACTIVE' ? 'text-bb-blue' : 'text-bb-muted/50';
                rowHtml += wrap(r.aggr15m, 'text-center', `text-[8px] font-bold ${aColor}`);

                rowHtml += wrap(r.eff15m.toFixed(4), 'text-center', 'text-white opacity-60');
                rowHtml += wrap(r.fric15m.toFixed(4), 'text-center', 'text-white opacity-60');
                rowHtml += wrap(`$${Utils.formatNumber(r.velocity15m, 0)}`, 'text-right', 'font-mono text-bb-gold');
            } else if (currentMatrix === 'LIQUIDITY') {
                rowHtml += wrap(r.ofi, 'text-center', r.ofi > 60 ? 'text-bb-green' : r.ofi < 40 ? 'text-bb-red' : 'text-white');
                rowHtml += wrap(Utils.formatNumber(r.bidDepth), 'text-right', 'text-bb-green font-mono');
                rowHtml += wrap(Utils.formatNumber(r.askDepth), 'text-right', 'text-bb-red font-mono');

                const hColor = r.bookHealth === 'HEALTHY' || r.bookHealth === 'STABLE' ? 'text-bb-green' :
                    ['FRAGILE', 'THIN', 'CAUTION'].includes(r.bookHealth) ? 'text-bb-gold' :
                        ['CRITICAL', 'DISRUPTED'].includes(r.bookHealth) ? 'text-bb-red font-bold' : 'text-bb-muted';
                rowHtml += wrap(`<span class="px-1 bg-white/5 rounded-[2px] text-[8px] ${hColor}">${r.bookHealth}</span>`, 'text-center');

                rowHtml += wrap(`${r.slip100k.toFixed(3)}%`, 'text-center', `font-mono ${r.slip100k > 0.5 ? 'text-bb-red font-bold' : r.slip100k > 0.1 ? 'text-bb-gold' : 'text-bb-blue'}`);
                rowHtml += wrap(r.wallCount > 0 ? `⚠️ ${r.wallCount}` : '-', 'text-center', r.wallCount > 0 ? 'text-bb-gold font-bold' : 'text-bb-muted');
                rowHtml += wrap(r.spread.toFixed(2), 'text-center', 'text-bb-gold');
            } else if (currentMatrix === 'DERIVATIVES') {
                rowHtml += wrap(`${r.oi > 0 ? '+' : ''}${r.oi.toFixed(2)}%`, 'text-center', r.oi > 0.5 ? 'text-bb-green' : r.oi < -0.5 ? 'text-bb-red' : 'text-white');
                rowHtml += wrap(`${(r.funding * 100).toFixed(4)}%`, 'text-right', r.funding > 0.01 ? 'text-bb-red' : 'text-bb-green');
                rowHtml += wrap(`<div class="h-1.5 w-12 bg-bb-border/20 rounded overflow-hidden mx-auto"><div class="h-full bg-bb-red" style="width: ${r.liqRisk}%"></div></div>`, 'text-center');
            } else if (currentMatrix === 'REGIME') {
                rowHtml += wrap(`<span class="px-1 bg-bb-blue/10 text-bb-blue text-[8px]">${r.marketRegime}</span>`, 'text-center');
                rowHtml += wrap(`<span class="px-1 text-[8px] ${r.volRegime === 'EXTREME_VOL' ? 'text-bb-red' : 'text-white'}">${r.volRegime}</span>`, 'text-center');
            } else if (currentMatrix === 'SENTIMENT') {
                rowHtml += wrap(r.lsr, 'text-center', r.lsr > 60 ? 'text-bb-green' : r.lsr < 40 ? 'text-bb-red' : 'text-white');
                rowHtml += wrap(r.lsrZ.toFixed(2), 'text-center', Math.abs(r.lsrZ) > 2 ? 'text-bb-red' : 'text-white');
            } else if (currentMatrix === 'IO') {
                rowHtml += wrap(`<div class="h-1 bg-bb-dark rounded overflow-hidden"><div class="h-full bg-bb-green" style="width: ${r.takerBuy * 100}%"></div></div>`, 'text-center');
                rowHtml += wrap(`<div class="h-1 bg-bb-dark rounded overflow-hidden"><div class="h-full bg-bb-blue" style="width: ${r.aggressive * 100}%"></div></div>`, 'text-center');
                const imbColor = r.tradeSizeImb > 0.2 ? 'text-bb-green' : r.tradeSizeImb < -0.2 ? 'text-bb-red' : 'text-bb-muted';
                rowHtml += wrap(`<span class="${imbColor} font-mono">${r.tradeSizeImb > 0 ? '+' : ''}${(r.tradeSizeImb * 100).toFixed(1)}%</span>`, 'text-center');
            } else if (currentMatrix === 'PRICEMOVE') {
                const c = (v) => v > 0 ? 'text-bb-green' : v < 0 ? 'text-bb-red' : 'text-bb-muted';
                rowHtml += wrap(`${(r.chg1m || 0).toFixed(2)}%`, 'text-center', c(r.chg1m));
                rowHtml += wrap(`${(r.chg5m || 0).toFixed(2)}%`, 'text-center', c(r.chg5m));
                rowHtml += wrap(`${(r.chg15m || 0).toFixed(2)}%`, 'text-center', c(r.chg15m));
                rowHtml += wrap(`${(r.chg24h || 0).toFixed(2)}%`, 'text-center', c(r.chg24h));
                rowHtml += wrap(`${(r.chgFromLow || 0).toFixed(2)}%`, 'text-center', 'text-bb-green font-black');
                rowHtml += wrap(`${(r.chgFromHigh || 0).toFixed(2)}%`, 'text-center', 'text-bb-red font-black');
            } else if (currentMatrix === 'FREQUENCY') {
                const fCell = (v) => {
                    const color = v.ratio > 0.05 ? 'text-bb-green font-bold' : v.ratio < -0.05 ? 'text-bb-red font-bold' : 'text-white opacity-60';
                    const netColor = v.net > 0 ? 'text-bb-green/60' : v.net < 0 ? 'text-bb-red/60' : 'text-bb-muted/40';
                    return `
                        <div class="flex flex-col items-center leading-tight">
                            <span class="${color}">${Utils.formatNumber(v.total, 0)}</span>
                            <span class="${netColor} text-[7px] tracking-tighter">${v.net > 0 ? '+' : ''}${Utils.formatNumber(v.net, 0)}</span>
                        </div>
                    `;
                };
                rowHtml += wrap(fCell(r.f1m), 'text-center');
                rowHtml += wrap(fCell(r.f5m), 'text-center');
                rowHtml += wrap(fCell(r.f15m), 'text-center');
                rowHtml += wrap(fCell(r.f1h), 'text-center');
                rowHtml += wrap(fCell(r.f2h), 'text-center');
                rowHtml += wrap(fCell(r.f24h), 'text-center');
            } else if (currentMatrix === 'VOLSPIKE') {
                const sCell = (v) => {
                    const color = v.spike > 2.0 ? 'text-bb-gold font-black' : v.spike > 1.2 ? 'text-bb-green' : v.spike < 0.5 ? 'text-bb-red opacity-50' : 'text-bb-muted';
                    const avgColor = v.avgSpike > 3.0 ? 'text-bb-gold font-black underline' : v.avgSpike > 1.5 ? 'text-white font-bold' : 'text-bb-muted/50';
                    return `
                        <div class="flex flex-col items-center leading-tight">
                            <span class="${color}">${v.spike.toFixed(2)}x</span>
                            <span class="${avgColor} text-[7px] tracking-tighter">AVG:${v.avgSpike.toFixed(1)}x</span>
                        </div>
                    `;
                };
                rowHtml += wrap(sCell(r.s1m), 'text-center');
                rowHtml += wrap(sCell(r.s5m), 'text-center');
                rowHtml += wrap(sCell(r.s10m), 'text-center');
                rowHtml += wrap(sCell(r.s15m), 'text-center');
                rowHtml += wrap(sCell(r.s20m), 'text-center');
                rowHtml += wrap(sCell(r.s30m), 'text-center');
                rowHtml += wrap(sCell(r.s1h), 'text-center');
                rowHtml += wrap(sCell(r.s2h), 'text-center');
                rowHtml += wrap(sCell(r.s24h), 'text-center');
            } else if (currentMatrix === 'ALERTS') {
                const action = r.action || 'WAIT';
                const urgency = r.dashboard >= 80 ? 'CRITICAL' : r.dashboard >= 60 ? 'HIGH' : 'NORMAL';
                const urgColor = urgency === 'CRITICAL' ? 'text-bb-red animate-pulse' : urgency === 'HIGH' ? 'text-bb-gold' : 'text-white opacity-40';
                const sigColor = action === 'LONG' ? 'text-bb-green' : action === 'SHORT' ? 'text-bb-red' : 'text-bb-muted';
                const barColor = action === 'LONG' ? 'bg-bb-green' : action === 'SHORT' ? 'bg-bb-red' : 'bg-bb-muted';

                rowHtml += wrap(`<span class="${urgColor} font-black text-[8px]">${urgency}</span>`, 'text-center');
                rowHtml += wrap(`<span class="${sigColor} font-black">${action === 'LONG' ? 'LONG' : action === 'SHORT' ? 'SHORT' : 'WAIT'}</span>`, 'text-center');
                rowHtml += wrap(`<div class="h-1 w-full bg-bb-border/20 rounded overflow-hidden mt-1"><div class="h-full ${barColor}" style="width: ${r.dashboard}%"></div></div>`, 'text-center');
                rowHtml += wrap(`${r.confCount}/${r.confRequired}`, 'text-center', 'font-bold text-white');

                // Sniper Interpretation
                let sniperBadge = '<span class="text-bb-muted opacity-40 italic">Monitoring...</span>';
                if (r.isTrap) sniperBadge = '<span class="px-1.5 py-0.5 bg-bb-red/20 text-bb-red rounded border border-bb-red/30 font-black animate-pulse">TRAP!</span>';
                else if (r.isAlpha) sniperBadge = '<span class="px-1.5 py-0.5 bg-bb-green/20 text-bb-green rounded border border-bb-green/30 font-black">ALPHA</span>';
                else if (r.volQuality < 30) sniperBadge = '<span class="px-1.5 py-0.5 bg-white/5 text-bb-gold rounded border border-bb-gold/20 font-black">THIN</span>';
                rowHtml += wrap(sniperBadge, 'text-center');

                // Age Calculation
                const ageSec = r.ts > 0 ? Math.floor((Date.now() - r.ts) / 1000) : 0;
                const ageStr = ageSec < 60 ? `${ageSec}s` : `${Math.floor(ageSec / 60)}m`;
                rowHtml += wrap(`<span class="text-bb-muted font-mono">${ageStr} AGO</span>`, 'text-right');
            } else if (currentMatrix === 'VOLATILITY') {
                const getVolColor = (v) => v > 10 ? 'text-bb-red font-bold' : v > 5 ? 'text-bb-gold' : 'text-bb-green opacity-70';
                rowHtml += wrap(`${r.atrPct.toFixed(4)}%`, 'text-right', 'font-mono text-white');
                rowHtml += wrap(`${r.gkPct.toFixed(2)}%`, 'text-right', `font-mono ${getVolColor(r.gkPct)}`);
                rowHtml += wrap(`<span class="px-1 text-[8px] border border-bb-border rounded ${r.volRegime.includes('HIGH') || r.volRegime.includes('EXTREME') ? 'text-bb-red border-bb-red' : 'text-bb-muted'}">${r.volRegime}</span>`, 'text-center');
                rowHtml += wrap(`${r.avgVol.toFixed(2)}%`, 'text-right', 'font-mono text-bb-gold');
                rowHtml += wrap(r.momentum.toFixed(2), 'text-center', r.momentum > 1.5 ? 'text-bb-red' : 'text-bb-muted');
            } else if (currentMatrix === 'VOLDURABILITY') {
                const dCell = (v) => {
                    const barWidth = Math.round(v.durability * 5);
                    let bars = '';
                    const color = getDurColor(v.durability * 100);
                    for (let i = 0; i < 5; i++) {
                        bars += `<span class="w-1.5 h-2 rounded-xxs ${i < barWidth ? color : 'bg-bb-border/20'}"></span>`;
                    }
                    return `<div class="flex gap-0.5 justify-center">${bars}</div>`;
                };
                rowHtml += wrap(dCell(r.s1m), 'text-center');
                rowHtml += wrap(dCell(r.s5m), 'text-center');
                rowHtml += wrap(dCell(r.s10m), 'text-center');
                rowHtml += wrap(dCell(r.s15m), 'text-center');
                rowHtml += wrap(dCell(r.s20m), 'text-center');
                rowHtml += wrap(dCell(r.s30m), 'text-center');
                rowHtml += wrap(dCell(r.s1h), 'text-center');
                rowHtml += wrap(dCell(r.s2h), 'text-center');
                rowHtml += wrap(dCell(r.s24h), 'text-center');
            } else if (currentMatrix === 'VOLRATIO') {
                const rCell = (v) => {
                    const color = getRatioColor(v.ratio);
                    const label = v.ratio >= 0.10 ? 'LONG' : v.ratio <= -0.10 ? 'SHORT' : 'NEUT';
                    return `<div class="flex flex-col items-center"><span class="${color} font-bold">${v.ratio > 0 ? '+' : ''}${v.ratio.toFixed(2)}</span><span class="${color} text-[6px]">${label}</span></div>`;
                };
                rowHtml += wrap(rCell(r.s1m), 'text-center');
                rowHtml += wrap(rCell(r.s5m), 'text-center');
                rowHtml += wrap(rCell(r.s10m), 'text-center');
                rowHtml += wrap(rCell(r.s15m), 'text-center');
                rowHtml += wrap(rCell(r.s20m), 'text-center');
                rowHtml += wrap(rCell(r.s30m), 'text-center');
                rowHtml += wrap(rCell(r.s1h), 'text-center');
                rowHtml += wrap(rCell(r.s2h), 'text-center');
                rowHtml += wrap(rCell(r.s24h), 'text-center');
            } else if (currentMatrix === 'OPENINTEREST') {
                const oCell = (v) => {
                    const color = v > 1.0 ? 'text-bb-green font-bold' : v < -1.0 ? 'text-bb-red font-bold' : 'text-white opacity-60';
                    return `<span class="${color}">${v > 0 ? '+' : ''}${v.toFixed(2)}%</span>`;
                };
                rowHtml += wrap(oCell(r.oi5m), 'text-center');
                rowHtml += wrap(oCell(r.oi15m), 'text-center');
                rowHtml += wrap(oCell(r.oi1h), 'text-center');
                rowHtml += wrap(oCell(r.oi24h), 'text-center');
                rowHtml += wrap(Utils.formatNumber(r.oiAbs), 'text-right', 'font-mono text-bb-gold');
            } else if (currentMatrix === 'FUNDING') {
                const fCell = (v) => {
                    const absV = Math.abs(v);
                    const color = absV > 0.01 ? 'text-bb-red font-bold' : absV < 0.005 ? 'text-bb-muted' : 'text-white';
                    return `<span class="${color} font-mono">${(v * 100).toFixed(4)}%</span>`;
                };
                rowHtml += wrap(fCell(r.funding), 'text-right');
                rowHtml += wrap(fCell(r.nextFunding), 'text-right');
                rowHtml += wrap(`<span class="font-mono text-bb-gold">${r.payout8h.toFixed(2)}% APR</span>`, 'text-right');

                const bColor = r.fundingBias.includes('LONG') ? 'text-bb-red' : r.fundingBias.includes('SHORT') ? 'text-bb-green' : 'text-bb-muted';
                rowHtml += wrap(`<span class="${bColor} font-black text-[8px] tracking-tight truncate">${r.fundingBias}</span>`, 'text-center');
                rowHtml += wrap(`<div class="h-1.5 w-12 bg-bb-border/20 rounded overflow-hidden mx-auto"><div class="h-full bg-bb-red" style="width: ${r.liqRisk}%"></div></div>`, 'text-center');
            }
        }

        return `
            <tr data-coin="${r.id}" class="hover:bg-white/5 cursor-pointer group transition-none" mousedown="window.app.selectCoin('${r.id}')" onclick="window.app.selectCoin('${r.id}')">
                ${rowHtml}
            </tr>
        `;
    }).join('');
}
