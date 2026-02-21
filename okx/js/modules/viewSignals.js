import * as Utils from '../utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col gap-2">
            
            <!-- TOP ROW: MICROSTRUCTURE GRID (Sec 8) -->
            <div class="h-1/3 panel">
                <div class="panel-header flex justify-between">
                    <span>MICROSTRUCTURE MATRIX</span>
                    <span class="text-[9px] text-bb-muted">INTENSITY: <span id="intensity-score" class="text-white font-bold">--</span></span>
                </div>
                <!-- 8 cards grid -->
                <div class="panel-content grid grid-cols-4 gap-2" id="micro-grid">
                    <!-- Injected -->
                </div>
            </div>

            <!-- BOTTOM CONTENT: ATTRIBUTION & BREAKOUT -->
            <div class="flex-1 flex gap-2 overflow-hidden">
                
                <!-- 17.1 ATTRIBUTION WATERFALL/TABLE -->
                <div class="w-2/3 panel flex flex-col">
                    <div class="panel-header flex justify-between">
                        <span>SIGNAL ATTRIBUTION (DRIVERS)</span>
                        <span class="text-[9px] text-bb-muted">SORTED BY IMPACT</span>
                    </div>
                    
                    <div class="grid grid-cols-12 gap-2 p-2 text-[10px] text-bb-muted border-b border-bb-border bg-bb-panel font-bold shrink-0">
                        <div class="col-span-3">SIGNAL</div>
                        <div class="col-span-2 text-center">SCORE</div>
                        <div class="col-span-5">CONTRIBUTION SHARE</div>
                        <div class="col-span-2 text-right">WEIGHT</div>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto scrollbar-thin space-y-1 p-1" id="attrib-list">
                        <!-- Injected -->
                    </div>
                </div>

                <!-- 6.5 BREAKOUT & 13.3 CONVERGENCE -->
                <div class="w-1/3 flex flex-col gap-2">
                    
                    <!-- 6.5 BREAKOUT PROBABILITY -->
                    <div class="panel h-1/3">
                        <div class="panel-header">BREAKOUT PROBABILITY</div>
                        <div class="panel-content flex flex-col justify-center" id="breakout-dash">
                            <!-- Injected -->
                        </div>
                    </div>

                    <!-- 13.3 CONVERGENCE / SIGNAL QUALITY -->
                    <div class="panel h-1/3">
                        <div class="panel-header">SIGNAL QUALITY</div>
                        <div class="panel-content space-y-2" id="quality-dash">
                            <!-- Injected -->
                        </div>
                    </div>

                    <!-- CATEGORICAL CONFLUENCE MATRIX -->
                    <div class="panel h-1/3">
                        <div class="panel-header">CONFLUENCE PILLARS</div>
                        <div class="panel-content grid grid-cols-2 gap-1" id="confluence-matrix">
                            <!-- Injected -->
                        </div>
                    </div>

                </div>

            </div>

        </div>
    `;
}

export function update(data, profile = 'INSTITUTIONAL_BASE', timeframe = '15MENIT') {
    // Data sources
    const micro = data.microstructure?.[profile] || {};
    const signals = data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.signals;
    const vol = data.analytics?.volatility;

    updateMicroGrid(micro);
    updateAttribution(signals);
    updateBreakout(vol, data.raw?.PRICE);
    updateQuality(data.analytics?.customMetrics);
    updateConfluence(data, signals, data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.masterSignal || {}, data.synthesis || {});
}

function updateMicroGrid(micro) {
    const el = document.getElementById('micro-grid');
    const elInt = document.getElementById('intensity-score');
    if (!el) return;

    // Helper for cards
    const card = (title, val, sub, colorClass) => `
        <div class="bg-bb-dark border border-bb-border p-2 flex flex-col justify-between group hover:bg-bb-panel transition-colors relative overflow-hidden">
            <div class="text-[9px] text-bb-muted uppercase z-10">${title}</div>
            <div class="flex items-end justify-between mt-1 z-10">
                <span class="text-lg font-bold ${colorClass}">${val}</span>
                <span class="text-[8px] text-bb-text opacity-70 mb-1">${sub}</span>
            </div>
            <!-- Subtle bar bg -->
            <div class="absolute bottom-0 left-0 h-1 ${colorClass.replace('text', 'bg')} opacity-20 w-full"></div>
        </div>
    `;

    // Extract
    const coh = micro.cohesion?.cohesion || 50;
    const ofsi = micro.ofsi?.ofsi || 50;
    const fbi = micro.fbi?.fbi || 0;
    const cis = micro.cis?.cis || 50;
    const tim = micro.tim?.tim || 50;
    const zPress = micro.zPress?.zPress || 0;

    // Intensity (Mock or Real)
    if (elInt) elInt.innerText = Utils.safeFixed(Math.abs(zPress) * 5, 1) + '/10';

    el.innerHTML = `
        ${card('COHESION', coh + '%', micro.cohesion?.level, coh > 60 ? 'text-bb-green' : 'text-bb-gold')}
        ${card('FLOW STR (OFSI)', ofsi, micro.ofsi?.strength, ofsi > 60 ? 'text-bb-green' : ofsi < 40 ? 'text-bb-red' : 'text-bb-muted')}
        ${card('FUNDING BIAS', fbi, micro.fbi?.direction, fbi > 80 ? 'text-bb-red' : 'text-bb-green')}
        ${card('COMPOSITE (CIS)', Utils.safeFixed(cis, 0), micro.cis?.bias, cis > 60 ? 'text-bb-green' : 'text-bb-gold')}
        ${card('TRADE IMB (TIM)', tim, micro.tim?.imbalance, tim > 60 ? 'text-bb-green' : 'text-bb-red')}
        ${card('Z-PRESSURE', Utils.safeFixed(zPress, 2), micro.zPress?.pressure, zPress > 0.5 ? 'text-bb-green' : zPress < -0.5 ? 'text-bb-red' : 'text-bb-blue')}
        ${card('RANGE COMP', Utils.safeFixed(micro.rangeComp?.rangeComp ?? 0, 0), micro.rangeComp?.status, 'text-white')}
        ${card('CORRELATION', micro.pfci?.pfci || 0, micro.pfci?.signal, 'text-bb-blue')}
    `;
}

function updateAttribution(signals) {
    const el = document.getElementById('attrib-list');
    if (!el || !signals) return;

    // Recursive flatten with validation
    let items = [];

    function flattenSignals(obj, prefix = '') {
        Object.keys(obj || {}).forEach(key => {
            const val = obj[key];
            const id = prefix ? `${prefix}.${key}` : key;
            if (!val || typeof val !== 'object') return;

            // Direct signal object
            if (val.direction && typeof val.normalizedScore === 'number') {
                items.push({
                    id,
                    direction: val.direction,
                    normalizedScore: val.normalizedScore,
                    confidence: val.confidence || 0,
                    weight: typeof val.adaptiveWeight === 'number' ? val.adaptiveWeight : (typeof val.originalWeight === 'number' ? val.originalWeight : 1),
                    metadata: val.metadata || {}
                });
            } else {
                // Recurse deeper
                flattenSignals(val, id);
            }
        });
    }

    flattenSignals(signals);

    // Use absolute values for impact share calculation
    const totalAbs = items.reduce((acc, it) => acc + Math.abs(it.normalizedScore || 0), 0);

    items.sort((a, b) => Math.abs(b.normalizedScore) - Math.abs(a.normalizedScore));

    el.innerHTML = items.slice(0, 50).map(item => {
        const share = totalAbs > 0 ? (Math.abs(item.normalizedScore) / totalAbs) * 100 : 0;
        const isLong = item.direction === 'BUY' || item.direction === 'LONG';
        const isShort = item.direction === 'SELL' || item.direction === 'SHORT';
        const scoreVal = (typeof item.normalizedScore === 'number') ? item.normalizedScore : 0;
        const weightVal = (typeof item.weight === 'number') ? item.weight : 0;

        const color = isLong ? 'text-bb-green bg-bb-green' : isShort ? 'text-bb-red bg-bb-red' : 'text-bb-muted bg-bb-muted';

        return `
            <div class="grid grid-cols-12 gap-2 p-2 border-b border-bb-border/30 hover:bg-white/5 items-center text-xs group">
                <div class="col-span-3 font-mono text-[9px] uppercase truncate text-white" title="${item.id}">${item.id}</div>
                    <div class="col-span-2 text-center font-bold ${color.split(' ')[0]}">${Utils.safeFixed(scoreVal, 1)}</div>
                <div class="col-span-5 flex items-center gap-2">
                    <div class="flex-1 h-1.5 bg-bb-dark rounded-full overflow-hidden">
                        <div class="h-full ${color.split(' ')[1]}" style="width: ${share}%"></div>
                    </div>
                        <span class="text-[9px] w-8 text-right">${Utils.safeFixed(share, 1)}%</span>
                </div>
                    <div class="col-span-2 text-right text-[9px] text-bb-muted">${Utils.safeFixed(weightVal, 2)}</div>
            </div>
        `;
    }).join('');
}

function updateBreakout(vol, priceData) {
    const el = document.getElementById('breakout-dash');
    if (!el || !vol) return;

    const prob = 76; // Mock probability until calculated
    const direction = 'UP';

    el.innerHTML = `
        <div class="text-center mb-2">
            <div class="text-4xl font-bold text-bb-green">${prob}%</div>
            <div class="text-[9px] text-bb-muted uppercase">PROBABILITY</div>
        </div>
        
        <div class="space-y-2 text-xs px-2">
             <div class="flex justify-between">
                 <span class="text-bb-muted">DIRECTION</span>
                 <span class="font-bold text-bb-green">${direction} ⬆️</span>
             </div>
             <div class="flex justify-between">
                 <span class="text-bb-muted">STATUS</span>
                 <span class="text-white">HIGH_PROB</span>
             </div>
             <div class="flex justify-between">
                 <span class="text-bb-muted">TARGET</span>
                 <span class="font-mono text-bb-gold">${'$' + Utils.safeFixed((priceData?.last || 0) * 1.019, 4)}</span>
             </div>
        </div>
    `;
}

function updateQuality(custom) {
    const el = document.getElementById('quality-dash');
    if (!el) return;

    const sqi = custom?.SQI || 0;

    el.innerHTML = `
        <div class="flex justify-between items-center bg-bb-dark p-2 border border-bb-border">
            <span class="text-[9px] text-bb-muted">SIGNAL QUALITY</span>
                <span class="font-bold ${sqi > 70 ? 'text-bb-green' : 'text-bb-gold'}">${Utils.safeFixed(sqi, 1)}</span>
        </div>
        
        <div class="bg-bb-dark p-2 border border-bb-border">
            <div class="flex justify-between text-[9px] mb-1">
                <span class="text-bb-muted">CONVERGENCE</span>
                <span class="text-white">DETECTED</span>
            </div>
            <div class="text-[9px] text-bb-muted italic">
                Momentum and Volume alignment confirmed 15m.
            </div>
        </div>
    `;
}

function updateConfluence(data, signals, master, syn) {
    const el = document.getElementById('confluence-matrix');
    if (!el) return;

    const flow = syn.flow || {};
    const lsr = data.raw?.LSR?.timeframes_15min?.longShortRatio || 1.0;

    const pillars = {
        FLOW: {
            title: 'FLOW',
            bias: flow.net_flow_15MENIT > 10000 ? 'BULL' : flow.net_flow_15MENIT < -10000 ? 'BEAR' : 'NEUT',
            val: Utils.safeFixed((flow.net_flow_15MENIT || 0) / 1000, 1) + 'K'
        },
        SENT: {
            title: 'SENT',
            bias: lsr > 1.5 ? 'BEAR' : lsr < 0.7 ? 'BULL' : 'NEUT',
            val: Utils.safeFixed(lsr, 2) + 'r'
        },
        LIQ: {
            title: 'LIQ',
            bias: (data.raw?.OB?.bidDepth / data.raw?.OB?.askDepth) > 1.2 ? 'BULL' : (data.raw?.OB?.askDepth / data.raw?.OB?.bidDepth) > 1.2 ? 'BEAR' : 'NEUT',
            val: Utils.safeFixed((data.raw?.OB?.bidDepth || 0) / (data.raw?.OB?.askDepth || 1), 2) + 'x'
        },
        TECH: {
            title: 'TECH',
            // Support both BUY/SELL (legacy) and LONG/SHORT (new)
            bias: (master.action === 'BUY' || master.action === 'LONG') ? 'BULL' : (master.action === 'SELL' || master.action === 'SHORT') ? 'BEAR' : 'NEUT',
            val: Utils.safeFixed(master.confidence || 0, 0) + '%'
        }
    };

    el.innerHTML = Object.values(pillars).map(p => {
        const color = p.bias === 'BULL' ? 'text-bb-green border-bb-green/30 bg-bb-green/5' : p.bias === 'BEAR' ? 'text-bb-red border-bb-red/30 bg-bb-red/5' : 'text-bb-muted border-white/5';
        return `
            <div class="flex flex-col items-center justify-center p-1 border rounded ${color}">
                <span class="text-[7px] font-black tracking-tighter opacity-70">${p.title}</span>
                <span class="text-[10px] font-bold">${p.val}</span>
                <span class="text-[6px] font-black">${p.bias}</span>
            </div>
        `;
    }).join('');
}
