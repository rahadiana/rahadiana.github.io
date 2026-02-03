import * as Utils from '../utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="space-y-2 pb-4">
            
            <!-- ROW 1: EXECUTION TERMINAL & ALERTS -->
            <div class="grid grid-cols-4 gap-2 h-16">
                 <!-- 19.1 RECOMMENDED ACTION -->
                 <div class="panel flex items-center justify-center p-2 relative overflow-hidden">
                    <div class="absolute top-1 left-2 text-[8px] text-bb-muted uppercase">Bias</div>
                    <span class="text-xl font-black font-mono tracking-tighter" id="rec-action">--</span>
                 </div>

                 <!-- 19.2 EXECUTION TERMINAL (Institutional Targets) -->
                 <div class="col-span-2 panel grid grid-cols-4 items-center px-4 relative bg-bb-panel/20">
                    <div class="absolute top-1 left-2 text-[8px] text-bb-muted uppercase tracking-widest">Execution Console</div>
                    <div class="flex flex-col border-l border-white/5 pl-3">
                        <span class="text-[7px] text-bb-muted uppercase font-bold">Target TP</span>
                        <span class="text-xs font-mono text-bb-green font-black" id="exec-tp">---</span>
                    </div>
                    <div class="flex flex-col border-l border-white/5 pl-3">
                        <span class="text-[7px] text-bb-muted uppercase font-bold">Stop Loss</span>
                        <span class="text-xs font-mono text-bb-red font-black" id="exec-sl">---</span>
                    </div>
                    <div class="flex flex-col border-l border-white/5 pl-3">
                        <span class="text-[7px] text-bb-muted uppercase font-bold">Leverage</span>
                        <span class="text-xs font-mono text-white font-black" id="exec-lev">---</span>
                    </div>
                    <div class="flex flex-col border-l border-white/5 pl-3">
                        <span class="text-[7px] text-bb-muted uppercase font-bold">Time Horizon</span>
                        <span class="text-xs font-mono text-bb-gold font-black" id="exec-hold">---</span>
                    </div>
                 </div>
                 
                 <!-- 15.1 ALERTS TICKER -->
                 <div class="panel overflow-hidden relative border-l-2 border-bb-gold/30">
                    <div class="absolute top-1 left-2 text-[8px] text-bb-muted tracking-widest">THREATS</div>
                    <div class="h-full flex items-center px-2 pt-2 overflow-x-auto scrollbar-none" id="main-alerts">
                        <span class="text-bb-muted text-[10px] italic">Scanning...</span>
                    </div>
                 </div>
            </div>

            <!-- ROW 2: MASTER OVERVIEW (Section 1 & 13) -->
            <div class="flex gap-2 h-64">
                
                <!-- 1.1 PRICE ACTION CENTER -->
                <div class="w-1/4 panel flex flex-col justify-between">
                    <div class="panel-header">PRICE ACTION</div>
                    <div class="panel-content space-y-2" id="price-action-center">
                        <!-- Injected -->
                    </div>
                </div>

                <!-- 13.1 MASTER SIGNAL CONFLUENCE -->
                <div class="w-2/4 panel relative overflow-hidden">
                     <div class="absolute top-0 right-0 p-2 text-[9px] text-bb-muted z-10">MULTI-TIMEFRAME CONFLUENCE</div>
                     <div class="h-full flex flex-col justify-center px-4" id="master-confluence">
                         <!-- Injected -->
                     </div>
                </div>

                <!-- 16.1 REGIME CLASSIFICATION -->
                <div class="w-1/4 panel">
                    <div class="panel-header">MARKET REGIME</div>
                    <div class="panel-content flex flex-col justify-center gap-2" id="regime-dash">
                        <!-- Injected -->
                    </div>
                </div>

            </div>

            <!-- ROW 3: VOLUME & FREQUENCY (Section 1.3 & 1.4) -->
            <div class="grid grid-cols-2 gap-2 h-48">
                 
                 <!-- 1.3 VOLUME BREAKDOWN -->
                 <div class="panel">
                    <div class="panel-header flex justify-between">
                        <span>VOLUME DYNAMICS</span>
                        <span class="text-[9px]" id="vol-quality">Q-SCORE: --</span>
                    </div>
                    <div class="panel-content grid grid-cols-2 gap-2" id="vol-breakdown">
                        <!-- Injected -->
                    </div>
                 </div>

                 <!-- 1.4 FREQUENCY ANALYSIS -->
                 <div class="panel">
                    <div class="panel-header">ORDER FREQUENCY (RETAIL ACTIVITY)</div>
                    <div class="panel-content grid grid-cols-3 gap-2" id="freq-breakdown">
                        <!-- Injected -->
                    </div>
                 </div>

            </div>
        </div>
    `;
}

export function update(data, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    // 1.1 Price Action
    updatePriceAction(data.raw?.PRICE, data.analytics?.priceAction, timeframe);

    const price = data.raw?.PRICE?.last || 0;
    // 19.1 & 13.1 Rec Action & Master Signal
    const master = data.masterSignals?.[timeframe]?.[profile];
    updateMasterPanel(master, data.masterSignals, profile, data);

    // 19.2 Execution Terminal (NEW)
    updateExecutionTerminal(data, profile, timeframe);

    // 15.1 Alerts
    updateAlerts(data.analytics?.customMetrics, master);

    // 16.1 Regime
    updateRegime(data.signals?.marketRegime, data.analytics?.volatility);

    // 1.3 & 1.4 Volume/Freq
    updateVolumeFreq(data.raw?.VOL, data.raw?.FREQ, data.analytics?.customMetrics, timeframe);
}

function updateExecutionTerminal(data, profile, timeframe) {
    const elTp = document.getElementById('exec-tp');
    const elSl = document.getElementById('exec-sl');
    const elLev = document.getElementById('exec-lev');
    const elHold = document.getElementById('exec-hold');
    if (!elTp) return;

    const px = data.raw?.PRICE?.last || 0;
    const atr = data.raw?.CANDLES?.candle_atr_15m || (px * 0.01);
    const master = data.masterSignals?.[timeframe]?.[profile] || {};
    const action = master.action || 'WAIT';

    // Simplified dynamic strategy mapping (Replicating Strategy Hub Logic)
    let tpMult = 1.5, slMult = 1.0, lev = '5x', hold = '2h-4h';

    // Logic adjustments based on Market Regime
    const regime = data.signals?.marketRegime?.currentRegime || 'RANGING';
    if (regime.includes('TREND')) {
        tpMult = 3.0; slMult = 1.2; lev = '3-5x'; hold = '6h-12h';
    } else if (regime.includes('VOLATILE')) {
        tpMult = 1.2; slMult = 0.8; lev = '10x'; hold = '30m-1h';
    }

    // Calculation - support both BUY/SELL (legacy) and LONG/SHORT (new)
    let tpPx, slPx;
    if (action === 'BUY' || action === 'LONG') {
        tpPx = px + (atr * tpMult);
        slPx = px - (atr * slMult);
    } else if (action === 'SELL' || action === 'SHORT') {
        tpPx = px - (atr * tpMult);
        slPx = px + (atr * slMult);
    } else {
        elTp.innerText = '---'; elSl.innerText = '---';
        elLev.innerText = 'WAIT'; elHold.innerText = '---';
        return;
    }

    elTp.innerText = `$${Utils.formatPrice(tpPx)}`;
    elSl.innerText = `$${Utils.formatPrice(slPx)}`;
    elLev.innerText = lev;
    elHold.innerText = hold;
}

function updateMasterSignal(sig, regime) {
    const el = document.getElementById('master-signal-content');
    if (!el) return;

    const action = sig.action || 'NEUTRAL';
    // Support both BUY/SELL (legacy) and LONG/SHORT (new) formats
    const isLong = action === 'BUY' || action === 'LONG';
    const isShort = action === 'SELL' || action === 'SHORT';
    const color = isLong ? 'text-bb-green' : isShort ? 'text-bb-red' : 'text-bb-muted';
    const bg = isLong ? 'from-green-900/20' : isShort ? 'from-red-900/20' : 'from-gray-900/20';

    // Update parent glow
    el.parentElement.style.background = `radial-gradient(circle at 0% 50%, ${isLong ? '#14532d' : isShort ? '#7f1d1d' : '#333'} 0%, transparent 70%)`;

    el.innerHTML = `
        <div class="flex flex-col gap-1">
            <div class="text-bb-muted text-xs tracking-widest">MASTER SIGNAL</div>
            <div class="text-5xl font-bold ${color} tracking-tighter">${action}</div>
            <div class="flex items-center gap-2 mt-2">
                <span class="text-bb-text text-sm">CONFIDENCE</span>
                <div class="h-2 w-24 bg-bb-dark rounded-full overflow-hidden border border-bb-border">
                    <div class="h-full ${isLong ? 'bg-bb-green' : 'bg-bb-red'}" style="width: ${sig.confidence}%"></div>
                </div>
                <span class="font-bold text-bb-gold">${sig.confidence}%</span>
            </div>
        </div>
        
        <div class="text-right flex flex-col items-end gap-2">
            <div class="bg-bb-dark border border-bb-border px-3 py-2 rounded text-center">
                 <div class="text-[10px] text-bb-muted uppercase">SCORE</div>
                 <div class="text-xl font-mono font-bold ${color}">${sig.score}</div>
            </div>
            <div class="text-[10px] text-bb-muted max-w-[150px] leading-tight">
                ${regime?.currentRegime || 'UNKNOWN'} context detected.
            </div>
        </div>
    `;
}

function updateRegime(regime, vol) {
    const el = document.getElementById('regime-dash');
    if (!el || !regime) return;

    const status = regime.currentRegime || 'UNKNOWN';
    const color = status.includes('BULL') ? 'text-bb-green' : status.includes('BEAR') ? 'text-bb-red' : 'text-bb-gold';

    el.innerHTML = `
        <div class="flex items-center justify-between">
            <span class="text-[10px] text-bb-muted">STATUS</span>
            <span class="font-bold ${color}">${status}</span>
        </div>
        <div class="flex items-center justify-between">
            <span class="text-[10px] text-bb-muted">TREND STR</span>
            <span class="font-bold text-white">${regime.trendStrength?.toFixed(2)}</span>
        </div>
        <div class="flex items-center justify-between">
            <span class="text-[10px] text-bb-muted">VOLATILITY</span>
            <span class="font-bold text-bb-blue">${vol?.volatilityRegime || '--'}</span>
        </div>
        
        <div class="mt-2 text-[9px] text-bb-muted text-center border-t border-bb-border pt-1">
            RECC: <span class="text-white font-bold">AGGRESSIVE</span>
        </div>
    `;
}

function updateTopSignals(signals) {
    const el = document.getElementById('top-signals');
    if (!el) return;

    // Flatten logic (similar to viewSignals.js) to find top drivers
    let items = [];
    Object.keys(signals).forEach(key => {
        const val = signals[key];
        // If categories
        if (val.direction) {
            items.push({ name: key, ...val });
        } else if (typeof val === 'object') {
            Object.keys(val).forEach(subKey => {
                if (val[subKey] && val[subKey].direction) {
                    items.push({ name: `${key}.${subKey}`, ...val[subKey] });
                }
            });
        }
    });

    // Sort by absolute score (contribution) logic - simplified: using normalizedScore
    items.sort((a, b) => (b.normalizedScore || 0) - (a.normalizedScore || 0));

    let html = '<table class="w-full text-left border-collapse">';
    html += '<thead class="text-[10px] text-bb-muted border-b border-bb-border"><tr><th class="p-1">SIGNAL</th><th class="p-1">DIR</th><th class="p-1">SCORE</th></tr></thead>';
    html += '<tbody class="text-xs">';

    items.slice(0, 5).forEach(item => {
        // Support both BUY/SELL (legacy) and LONG/SHORT (new)
        const isLongDir = item.direction === 'BUY' || item.direction === 'LONG';
        const isShortDir = item.direction === 'SELL' || item.direction === 'SHORT';
        const iColor = isLongDir ? 'text-bb-green' : isShortDir ? 'text-bb-red' : 'text-bb-muted';
        const barColor = isLongDir ? 'bg-bb-green' : isShortDir ? 'bg-bb-red' : 'bg-bb-muted';

        html += `
            <tr class="border-b border-bb-border/50 hover:bg-white/5">
                <td class="p-1 font-mono text-[10px] truncate max-w-[80px]" title="${item.name}">${item.name.toUpperCase()}</td>
                <td class="p-1 font-bold ${iColor}">${item.direction}</td>
                <td class="p-1">
                    <div class="w-16 h-1.5 bg-bb-dark rounded-full overflow-hidden">
                        <div class="h-full ${barColor}" style="width: ${item.normalizedScore}%"></div>
                    </div>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
}

function updateRisk(vol, masterSig) {
    const el = document.getElementById('risk-panel');
    if (!el || !vol) return;

    const atr = vol.atrPercentile || 0;
    const sizeRec = masterSig?.confidence > 80 ? '100%' : masterSig?.confidence > 60 ? '50%' : '25%';

    el.innerHTML = `
        <div class="bg-bb-dark p-2 border border-bb-border">
            <div class="text-bb-muted text-[10px]">POSITION SIZE</div>
            <div class="text-white font-bold">${sizeRec}</div>
        </div>
        <div class="bg-bb-dark p-2 border border-bb-border">
             <div class="text-bb-muted text-[10px]">STOP MULT.</div>
             <div class="text-bb-gold font-bold">${(3 + (atr / 100)).toFixed(1)}x ATR</div>
        </div>
        <div class="col-span-2 bg-bb-dark p-1 px-2 border border-bb-border flex justify-between">
            <span class="text-bb-muted text-[10px]">RISK TIER</span>
            <span class="${atr > 80 ? 'text-bb-red' : 'text-bb-green'} text-[10px] uppercase font-bold">${atr > 80 ? 'HIGH VOL' : 'STD'}</span>
        </div>
    `;
}

function updateQuality(custom) {
    const el = document.getElementById('quality-panel');
    if (!el || !custom) return;

    const sqi = custom.SQI || 0;
    const lvi = custom.LVI || 0;

    el.innerHTML = `
         <div class="bg-bb-dark p-2 border border-bb-border text-center">
            <div class="text-bb-muted text-[10px]">SQI SCORE</div>
            <div class="text-xl font-bold ${sqi > 70 ? 'text-bb-green' : 'text-bb-gold'}">${sqi}</div>
        </div>
         <div class="bg-bb-dark p-2 border border-bb-border text-center">
            <div class="text-bb-muted text-[10px]">VELOCITY</div>
            <div class="text-xl font-bold text-white">${lvi}</div>
        </div>
    `;
}

function updateMicroSnap(micro) {
    const el = document.getElementById('micro-snap');
    if (!el || !micro) return;

    // Metrics are inside micro object (calculated by MicrostructureMetrics)
    // Actually wait, compute_MicrostructureMetrics returns { CONSERVATIVE: ... }
    // Check structure...

    // Wait, in compute_MicrostructureMetrics.js:
    // return { CONSERVATIVE, MODERATE, AGGRESSIVE } where each is result of calculateAll

    const cohesion = micro.cohesion?.cohesion || 50;
    const cohLevel = micro.cohesion?.level || 'NEUTRAL';
    const fbi = micro.fbi?.fbi || 0;
    const fbiDir = micro.fbi?.direction || '--';

    el.innerHTML = `
        <div class="flex justify-between items-center border-b border-bb-border pb-1">
            <span class="text-bb-muted text-[10px]">COHESION</span>
            <div class="text-right">
                <span class="font-bold text-white tracking-widest">${cohesion}%</span>
                <span class="text-[9px] ${cohLevel === 'STRONG' ? 'text-bb-green' : 'text-bb-muted'} block">${cohLevel}</span>
            </div>
        </div>
        <div class="flex justify-between items-center">
            <span class="text-bb-muted text-[10px]">FBI (BIAS)</span>
            <div class="text-right">
                <span class="font-bold ${fbi > 80 ? 'text-bb-red' : 'text-bb-green'}">${fbi}</span>
                <span class="text-[9px] text-bb-muted block">${fbiDir}</span>
            </div>
        </div>
     `;
}

function updateMTF(master, profile) {
    const el = document.getElementById('mtf-heatmap');
    if (!el) return;

    const tf5 = master['5MENIT']?.[profile]?.action || 'NEUT';
    const tf15 = master['15MENIT']?.[profile]?.action || 'NEUT';

    // Support both BUY/SELL (legacy) and LONG/SHORT (new) formats
    const color = (a) => (a === 'BUY' || a === 'LONG') ? 'bg-bb-green text-black' : (a === 'SELL' || a === 'SHORT') ? 'bg-bb-red text-white' : 'bg-bb-dark text-bb-muted';

    el.innerHTML = `
        <div class="flex gap-2 h-full items-center">
             <div class="flex-1 flex flex-col gap-1">
                <span class="text-[10px] text-bb-muted text-center">5M</span>
                <div class="${color(tf5)} text-center font-bold py-1 rounded text-xs">${tf5}</div>
             </div>
             <div class="text-bb-muted">➜</div>
             <div class="flex-1 flex flex-col gap-1">
                <span class="text-[10px] text-bb-muted text-center">15M</span>
                <div class="${color(tf15)} text-center font-bold py-1 rounded text-xs">${tf15}</div>
             </div>
             <div class="flex-1 border-l border-bb-border pl-2 ml-2 flex flex-col justify-center text-center">
                <div class="text-[10px] text-bb-muted uppercase">CONSENSUS</div>
                <div class="font-bold ${tf5 === tf15 && tf5 !== 'NEUT' ? 'text-bb-gold' : 'text-bb-muted'} text-xs">
                    ${tf5 === tf15 ? 'ALIGNED' : 'MIXED'}
                </div>
             </div>
        </div>
    `;
}

function updatePriceAction(priceData, pa, timeframe) {
    const el = document.getElementById('price-action-center');
    if (!el || !priceData) return;

    const current = priceData.last || 0;
    const chgTF = priceData[`percent_change_${timeframe}`] || 0;
    const chg24h = priceData.percent_change_24h || 0;
    const high = priceData.high || 0;
    const low = priceData.low || 0;

    // Distance from high/low
    const fromTop = high > 0 ? ((current - high) / high) * 100 : 0;
    const fromBot = low > 0 ? ((current - low) / low) * 100 : 0;

    el.innerHTML = `
        <div class="text-3xl font-bold font-mono ${chgTF >= 0 ? 'text-bb-green' : 'text-bb-red'}">
            $${current.toFixed(current < 1 ? 5 : 2)}
        </div>
        <div class="flex justify-between text-xs font-mono">
            <span class="${chgTF >= 0 ? 'text-bb-green' : 'text-bb-red'}">${chgTF > 0 ? '▲' : '▼'} ${chgTF.toFixed(2)}% (${timeframe.replace('MENIT', 'm').replace('JAM', 'h')})</span>
            <span class="${chg24h >= 0 ? 'text-bb-green' : 'text-bb-red'}">${chg24h > 0 ? '+' : ''}${chg24h.toFixed(2)}% (24h)</span>
        </div>
        
        <div class="border-t border-bb-border pt-2 grid grid-cols-2 gap-y-1 text-[10px] text-bb-muted">
             <div>OPEN: <span class="text-white">$${Utils.formatNumber(priceData.open)}</span></div>
             <div>HIGH: <span class="text-white">$${Utils.formatNumber(high)}</span></div>
             <div>PREV: <span class="text-white">$${Utils.formatNumber(priceData.previous)}</span></div>
             <div>LOW:  <span class="text-white">$${Utils.formatNumber(low)}</span></div>
        </div>

        <div class="mt-auto aspect-w-4 aspect-h-1 bg-bb-dark rounded relative h-1.5 overflow-hidden">
             <div class="absolute top-0 left-0 bottom-0 bg-bb-green opacity-50" style="width: ${Math.min(100, Math.max(0, fromBot * 10))}%"></div>
             <div class="absolute top-0 right-0 bottom-0 bg-bb-red opacity-50" style="width: ${Math.min(100, Math.max(0, Math.abs(fromTop) * 10))}%"></div>
        </div>
        <div class="flex justify-between text-[9px]">
            <span class="text-bb-green">Bot +${fromBot.toFixed(2)}%</span>
            <span class="text-bb-red">Top ${fromTop.toFixed(2)}%</span>
        </div>
    `;
}

function updateMasterPanel(sig, allSignals, profile, data) {
    const elRec = document.getElementById('rec-action');
    const elMast = document.getElementById('master-confluence');

    if (elRec) {
        const action = sig?.action || 'WAIT';
        elRec.innerText = action;
        // Support both BUY/SELL (legacy) and LONG/SHORT (new)
        const isLongAct = action === 'BUY' || action === 'LONG';
        const isShortAct = action === 'SELL' || action === 'SHORT';
        elRec.className = `text-xl font-black font-mono ${isLongAct ? 'text-bb-green' : isShortAct ? 'text-bb-red' : 'text-bb-gold'}`;
    }

    if (elMast) {
        if (!sig) {
            elMast.innerHTML = '<span class="text-bb-muted">No signal data</span>';
            return;
        }

        // Determine Strategic Context (NEW)
        const micro = data.signals?.profiles?.[profile]?.timeframes?.[(Object.keys(allSignals)[0] || '15MENIT')]?.signals?.microstructure || {};
        const isWhale = (micro.volumeFreqDivergence?.rawValue || 0) > 0.3;
        const isInformed = (micro.vpin?.rawValue || 0) > 0.6;
        const strategyTag = isWhale ? 'WHALE TRACKER' : isInformed ? 'INFORMED FLOW' : 'TREND FOLLOWER';
        const tagColor = isWhale ? 'text-bb-blue border-bb-blue/30' : isInformed ? 'text-bb-red border-bb-red/30' : 'text-bb-gold border-bb-gold/30';

        // Multi-timeframe actions
        const m5 = allSignals?.['5MENIT']?.[profile]?.action || 'NEUT';
        const m15 = allSignals?.['15MENIT']?.[profile]?.action || 'NEUT';
        const m1h = allSignals?.['1JAM']?.[profile]?.action || 'NEUT';

        const cVal = sig.confidence || 0;

        elMast.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                 <div class="flex items-center gap-3">
                      <div class="bg-bb-dark border border-bb-border px-3 py-2 rounded text-center min-w-[80px]">
                           <div class="text-[9px] text-bb-muted">SCORE</div>
                           <div class="text-xl font-bold text-white">${(sig.score || sig.normalizedScore || 0).toFixed(0)}</div>
                      </div>
                      <div class="flex flex-col">
                           <div class="flex items-center gap-2">
                               <span class="text-4xl font-bold tracking-tight ${sig.action === 'BUY' ? 'text-bb-green' : sig.action === 'SELL' ? 'text-bb-red' : 'text-bb-gold'}">${sig.action}</span>
                               <span class="text-[7px] px-1 border rounded font-black tracking-widest bg-white/5 ${tagColor}">${strategyTag}</span>
                           </div>
                           <span class="text-[10px] text-bb-muted uppercase tracking-widest">${profile} PROFILE ACTIVE</span>
                      </div>
                 </div>
                 
                 <div class="text-right">
                      <div class="text-[9px] text-bb-muted">CONFIDENCE</div>
                      <div class="text-2xl font-bold text-bb-gold">${cVal}%</div>
                 </div>
            </div>

            <!-- Heatmap Strip -->
            <div class="grid grid-cols-3 gap-1 h-8">
                 <div class="${m5 === 'BUY' ? 'bg-bb-green text-black' : m5 === 'SELL' ? 'bg-bb-red text-white' : 'bg-bb-dark text-bb-muted'} flex items-center justify-center font-black text-xs rounded border border-white/5">5m</div>
                 <div class="${m15 === 'BUY' ? 'bg-bb-green text-black' : m15 === 'SELL' ? 'bg-bb-red text-white' : 'bg-bb-dark text-bb-muted'} flex items-center justify-center font-black text-xs rounded border border-white/5">15m</div>
                 <div class="${m1h === 'BUY' ? 'bg-bb-green text-black' : m1h === 'SELL' ? 'bg-bb-red text-white' : 'bg-bb-dark text-bb-muted'} flex items-center justify-center font-black text-xs rounded border border-white/5 shadow-inner">1h</div>
            </div>
        `;

        // Dynamic background glow
        const glowColor = sig.action === 'BUY' ? '#14532d' : sig.action === 'SELL' ? '#7f1d1d' : '#222';
        elMast.parentElement.style.background = `radial-gradient(circle at 100% 0%, ${glowColor} 0%, transparent 60%)`;
    }
}

function updateAlerts(custom, sig) {
    const el = document.getElementById('main-alerts');
    if (!el) return;

    let alerts = [];
    if (custom?.WPI > 50) alerts.push({ msg: 'WHALE BUYING', type: 'green' });
    if (custom?.WPI < -50) alerts.push({ msg: 'WHALE DUMP', type: 'red' });
    if (sig?.confidence > 90) alerts.push({ msg: 'HIGH CONVICTION', type: 'gold' });
    if (custom?.LHS > 80) alerts.push({ msg: 'LIQUIDITY STRESS', type: 'red' });

    if (alerts.length === 0) {
        el.innerHTML = '<span class="text-bb-muted text-[10px] italic">No active alerts. Monitoring conditions...</span>';
    } else {
        el.innerHTML = alerts.map(a =>
            `<span class="bg-${a.type === 'red' ? 'red-900/50 text-red-200' : a.type === 'green' ? 'green-900/50 text-green-200' : 'yellow-900/50 text-yellow-200'} px-2 py-0.5 rounded text-[9px] font-bold border border-${a.type === 'red' ? 'red-800' : a.type === 'green' ? 'green-800' : 'yellow-800'} mr-2 animate-pulse">${a.msg}</span>`
        ).join('');
    }
}

function updateVolumeFreq(vol, freq, custom, timeframe) {
    // 1.3 Volume Breakdown
    const elVol = document.getElementById('vol-breakdown');
    if (elVol && vol) {
        const vBuy = vol[`vol_buy_${timeframe}`] || 0;
        const vSell = vol[`vol_sell_${timeframe}`] || 0;
        const total = vBuy + vSell;
        const buyPct = total > 0 ? (vBuy / total) * 100 : 50;

        // Quality Score
        const qs = custom?.SQI || 0;
        const elQ = document.getElementById('vol-quality');
        if (elQ) elQ.innerText = `Q-SCORE: ${qs}`;

        const tfLabel = timeframe.replace('MENIT', 'M').replace('JAM', 'H');

        elVol.innerHTML = `
            <div class="col-span-2">
                 <div class="flex justify-between text-[10px] mb-1">
                      <span class="text-bb-green font-bold">${buyPct.toFixed(0)}% BUY</span>
                      <span class="text-bb-red font-bold">${(100 - buyPct).toFixed(0)}% SELL</span>
                 </div>
                 <div class="w-full h-1.5 bg-bb-sidebar rounded overflow-hidden flex">
                      <div class="h-full bg-bb-green" style="width: ${buyPct}%"></div>
                      <div class="h-full bg-bb-red" style="width: ${100 - buyPct}%"></div>
                 </div>
            </div>
            
            <div class="bg-bb-dark p-1 border border-bb-border text-center">
                 <div class="text-[9px] text-bb-muted">${tfLabel} BUY VOL</div>
                 <div class="text-white font-mono text-xs">${Utils.formatNumber(vBuy)}</div>
            </div>
            <div class="bg-bb-dark p-1 border border-bb-border text-center">
                 <div class="text-[9px] text-bb-muted">${tfLabel} SELL VOL</div>
                 <div class="text-white font-mono text-xs">${Utils.formatNumber(vSell)}</div>
            </div>
        `;
    }

    // 1.4 Freq Breakdown
    const elFreq = document.getElementById('freq-breakdown');
    if (elFreq && freq) {
        const fBuy = freq[`freq_buy_${timeframe}`] || 0;
        const fSell = freq[`freq_sell_${timeframe}`] || 0;
        const ratio = fSell > 0 ? fBuy / fSell : fBuy;

        const isRetail = ratio > 2 && custom?.tradeSizeImbalance < 0;

        elFreq.innerHTML = `
            <div class="bg-bb-dark p-1 border border-bb-border text-center">
                 <div class="text-[9px] text-bb-muted">BUY FREQ</div>
                 <div class="text-bb-green font-bold text-xs text-mono">${fBuy}</div>
            </div>
            <div class="bg-bb-dark p-1 border border-bb-border text-center">
                 <div class="text-[9px] text-bb-muted">SELL FREQ</div>
                 <div class="text-bb-red font-bold text-xs text-mono">${fSell}</div>
            </div>
            <div class="bg-bb-dark p-1 border border-bb-border text-center">
                 <div class="text-[9px] text-bb-muted">RATIO</div>
                 <div class="text-white font-bold text-xs">${ratio.toFixed(1)}x</div>
            </div>
         `;
    }
}
