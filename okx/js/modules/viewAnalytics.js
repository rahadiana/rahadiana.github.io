import * as Utils from '../utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="h-full grid grid-cols-3 gap-2">
            
            <!-- COL 1: VOLUME DEEP DIVE (Sec 2) -->
            <div class="flex flex-col gap-2">
                <!-- 2.1 CVD ANALYSIS -->
                <div class="panel h-1/2">
                    <div class="panel-header">CVD & MOMENTUM</div>
                    <div class="panel-content space-y-3" id="cvd-analysis">
                        <!-- Injected -->
                    </div>
                </div>
                <!-- 2.3 VOLUME vs OI -->
                <div class="panel h-1/2">
                    <div class="panel-header">VOL/OI CORRELATION</div>
                    <div class="panel-content space-y-2" id="vol-oi-analysis">
                        <!-- Injected -->
                    </div>
                </div>
            </div>

            <!-- COL 2: ORDER FLOW INTELLIGENCE (Sec 3) -->
            <div class="flex flex-col gap-2">
                <!-- 3.1 ORDER FLOW DASHBOARD -->
                <div class="panel h-1/2">
                    <div class="panel-header">ORDER FLOW STRENGTH</div>
                    <div class="panel-content space-y-3" id="of-strength">
                        <!-- Injected -->
                    </div>
                </div>
                <!-- 3.3 FREQUENCY IMBALANCE -->
                <div class="panel h-1/2">
                    <div class="panel-header">TIM (TRADE IMBALANCE)</div>
                    <div class="panel-content flex flex-col justify-center" id="tim-metric">
                        <!-- Injected -->
                    </div>
                </div>
            </div>

            <!-- COL 3: VOLATILITY DEEP DIVE (Sec 6) -->
            <div class="flex flex-col gap-2">
                <!-- 6.1 VOLATILITY REGIME -->
                <div class="panel h-1/2">
                    <div class="panel-header">VOLATILITY REGIME</div>
                    <div class="panel-content space-y-2" id="vol-regime">
                        <!-- Injected -->
                    </div>
                </div>
                <!-- 6.2 VW AP ZONES -->
                <div class="panel h-1/2">
                    <div class="panel-header">VWAP ZONES</div>
                    <div class="panel-content flex flex-col justify-center" id="vwap-zones">
                        <!-- Injected -->
                    </div>
                </div>
            </div>

        </div>
    `;
}

export function update(data, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    const signalsObj = data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.signals || {};
    // FIX: Proper fallback if nested analytics is missing or empty
    const analytics = (signalsObj.analytics && Object.keys(signalsObj.analytics).length > 0)
        ? signalsObj.analytics
        : (data.analytics || {});

    if (!analytics || Object.keys(analytics).length === 0) return;

    const vol = data.raw?.VOL || {};
    const oi = data.raw?.OI || {};
    const freq = data.raw?.FREQ || {};
    const custom = analytics.customMetrics || {};
    const orderFlow = analytics.orderFlow || {};

    updateCVD(orderFlow, date => data.raw?.PRICE?.last);
    updateVolOI(vol, oi);
    updateOrderFlow(orderFlow);
    updateTIM(custom.TIM, freq);
    updateVolatility(analytics.volatility, data.raw?.PRICE);
    updateVWAPZones(analytics, data.raw?.PRICE);
}

function updateCVD(of, getPrice) {
    const el = document.getElementById('cvd-analysis');
    if (!el || !of) return;

    // 2.1 CVD Section
    const momColor = of.cvd_momentum > 0 ? 'text-bb-green' : 'text-bb-red';

    el.innerHTML = `
        <div class="flex justify-between items-end border-b border-bb-border pb-2">
            <div class="flex flex-col">
                <span class="text-[10px] text-bb-muted">CVD MOMENTUM</span>
                <span class="text-2xl font-bold font-mono ${momColor}">${of.cvd_momentum > 0 ? '+' : ''}${Utils.formatNumber(of.cvd_momentum)}</span>
            </div>
            <div class="text-right">
                <span class="text-[9px] text-bb-muted block">DIRECTION</span>
                <span class="font-bold ${of.flowDirection === 'BUY' ? 'text-bb-green' : of.flowDirection === 'SELL' ? 'text-bb-red' : 'text-white'}">
                    ${of.flowDirection === 'BUY' ? 'LONG' : of.flowDirection === 'SELL' ? 'SHORT' : of.flowDirection}
                </span>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-bb-dark p-2">
                <div class="text-[9px] text-bb-muted">CUMULATIVE (1H)</div>
                <div class="${of.cvd_1h > 0 ? 'text-bb-green' : 'text-bb-red'} font-bold">${Utils.formatNumber(of.cvd_1h)}</div>
            </div>
            <div class="bg-bb-dark p-2">
                <div class="text-[9px] text-bb-muted">STRENGTH</div>
                <div class="text-white font-bold">${of.flowStrength?.toFixed(2)}</div>
            </div>
        </div>
        
        <div class="text-[10px] text-bb-muted italic mt-1">
            ${of.interpretation}
        </div>
    `;
}

function updateVolOI(vol, oi) {
    const el = document.getElementById('vol-oi-analysis');
    if (!el || !vol) return;

    // 2.3 Vol vs OI
    const oiChange = oi.oi_chg_1JAM || 0;
    const vol1h = (vol.vol_buy_1JAM || 0) + (vol.vol_sell_1JAM || 0);
    const oiVal = oi.oi || 1;
    const ratio = vol1h / oiVal; // Vol/OI Ratio

    const oiColor = oiChange > 5 ? 'text-bb-green' : oiChange < -5 ? 'text-bb-red' : 'text-white';

    el.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-[10px] text-bb-muted">1H OI CHANGE</span>
            <span class="font-bold ${oiColor}">${oiChange > 0 ? '+' : ''}${oiChange.toFixed(2)}% ${Math.abs(oiChange) > 10 ? '🔥' : ''}</span>
        </div>
        
        <div class="w-full bg-bb-dark h-2 rounded overflow-hidden mb-2">
             <div class="bg-purple-500 h-full" style="width: ${Math.min(100, Math.abs(oiChange) * 5)}%"></div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[10px]">
             <div>
                 <span class="text-bb-muted block">VOL/OI RATIO</span>
                 <span class="${ratio < 0.1 ? 'text-bb-red' : 'text-bb-green'} font-mono">${ratio.toFixed(4)}</span>
             </div>
             <div class="text-right">
                 <span class="text-bb-muted block">TOTAL OI</span>
                 <span class="text-white font-mono">${Utils.formatNumber(oiVal)}</span>
             </div>
        </div>
        
        <div class="mt-2 p-2 bg-bb-panel border border-bb-border">
            <div class="text-[9px] text-bb-muted uppercase mb-1">INTERPRETATION</div>
            <div class="text-xs leading-tight">
                ${oiChange > 5 && vol1h < (oiVal * 0.1) ? '⚠️ Smart money accumulation (High OI, Low Vol)' : 'Normal activity'}
            </div>
        </div>
    `;
}

function updateOrderFlow(of) {
    const el = document.getElementById('of-strength');
    if (!el || !of) return;

    // 3.1 Order Flow Dashboard
    const takerBuy = of.takerBuyRatio || 0.5;
    const aggBuy = of.aggressiveBuyPct || 0.5;

    el.innerHTML = `
        <div>
            <div class="flex justify-between text-[10px] mb-1">
                <span class="text-bb-muted">TAKER BUY RATIO</span>
                <span class="${takerBuy > 0.55 ? 'text-bb-green' : 'text-bb-red'} font-bold">${(takerBuy * 100).toFixed(1)}%</span>
            </div>
            <div class="w-full bg-bb-dark h-1.5 rounded overflow-hidden">
                 <div class="bg-bb-green h-full" style="width: ${takerBuy * 100}%"></div>
            </div>
        </div>

        <div>
            <div class="flex justify-between text-[10px] mb-1">
                <span class="text-bb-muted">AGGRESSIVE BUY</span>
                <span class="${aggBuy > 0.55 ? 'text-bb-green' : 'text-white'} font-bold">${(aggBuy * 100).toFixed(1)}%</span>
            </div>
            <div class="w-full bg-bb-dark h-1.5 rounded overflow-hidden">
                 <div class="bg-blue-500 h-full" style="width: ${aggBuy * 100}%"></div>
            </div>
        </div>

        <div class="flex justify-between items-center bg-bb-dark p-2 border border-bb-border mt-2">
             <span class="text-[10px] text-bb-muted">SIZE IMBALANCE</span>
             <span class="font-bold ${of.tradeSizeImbalance > 0 ? 'text-bb-green' : 'text-bb-red'}">${of.tradeSizeImbalance.toFixed(2)}</span>
        </div>
    `;
}

function updateTIM(timMetric, freq) {
    const el = document.getElementById('tim-metric');
    if (!el) return;

    const tim = timMetric || 50;
    const val = typeof tim === 'object' ? tim.tim : tim;
    const imbalance = typeof timMetric === 'object' ? timMetric.imbalance : 'NEUTRAL';

    el.innerHTML = `
        <div class="text-center mb-2">
            <div class="text-4xl font-bold ${val > 60 ? 'text-bb-green' : val < 40 ? 'text-bb-red' : 'text-bb-gold'}">${val}</div>
            <div class="text-[10px] text-bb-muted uppercase tracking-widest">${imbalance}</div>
        </div>
        
        <div class="text-xs text-center text-bb-muted">
            Trade Imbalance Metric
        </div>
    `;
}


function updateVolatility(vol, priceData) {
    const el = document.getElementById('vol-regime');
    if (!el || !vol) return;

    const bb = vol.bollingerBands || {};
    const kc = vol.keltnerChannels || {};
    const price = priceData?.last || 0;

    // BB Position %
    const bbUpper = bb.upper || (price * 1.02);
    const bbLower = bb.lower || (price * 0.98);
    const bbPct = bbUpper !== bbLower ? ((price - bbLower) / (bbUpper - bbLower)) * 100 : 50;

    // Squeeze detection
    const bbWidth = bb.bbWidth || 0;
    const kcWidth = kc.kcWidth || 0;
    const squeeze = bbWidth < kcWidth ? 'YES 🔥' : 'NO';

    el.innerHTML = `
        <div class="flex justify-between items-center border-b border-bb-border pb-2">
            <span class="text-[10px] text-bb-muted">REGIME</span>
            <span class="font-bold px-2 py-0.5 rounded text-xs ${vol.volatilityRegime === 'HIGH_VOL' ? 'bg-red-900 text-bb-red' : 'bg-green-900 text-bb-green'}">${vol.volatilityRegime}</span>
        </div>
        
        <div class="grid grid-cols-2 gap-2">
            <div class="bg-bb-dark p-1 text-center">
                <div class="text-[9px] text-bb-muted">BB POSITION</div>
                <div class="font-bold ${bbPct > 80 ? 'text-bb-red' : bbPct < 20 ? 'text-bb-green' : 'text-white'}">${bbPct.toFixed(0)}%</div>
            </div>
            <div class="bg-bb-dark p-1 text-center">
                <div class="text-[9px] text-bb-muted">ATR %ILE</div>
                <div class="font-bold text-white">${vol.atrPercentile}%</div>
            </div>
        </div>
        
        <div class="flex justify-between items-center bg-bb-panel border border-bb-border p-1 mt-1">
            <span class="text-[9px] text-bb-muted">SQUEEZE</span>
            <span class="font-bold ${squeeze.includes('YES') ? 'text-bb-gold animate-pulse' : 'text-white'}">${squeeze}</span>
        </div>
    `;
}

function updateVWAPZones(analytics, priceData) {
    const el = document.getElementById('vwap-zones');
    if (!el) return;

    const price = priceData?.last || 0;
    // Try both paths: analytics.execution.vwap (primary) or analytics.priceAction.vwap (fallback)
    const vwap = analytics?.execution?.vwap || analytics?.priceAction?.vwap || price;
    const dist = ((price - vwap) / vwap) * 100;

    // Zone classification
    let zone = 'FAIR VALUE';
    let zoneColor = 'text-bb-gold';
    if (dist > 2) { zone = 'PREMIUM'; zoneColor = 'text-bb-red'; }
    else if (dist < -2) { zone = 'DISCOUNT'; zoneColor = 'text-bb-green'; }

    el.innerHTML = `
        <div class="text-center mb-2">
            <div class="text-[10px] text-bb-muted">CURRENT ZONE</div>
            <div class="text-2xl font-bold ${zoneColor}">${zone}</div>
            <div class="text-xs text-bb-muted">VWAP: $${vwap.toFixed(4)}</div>
        </div>
        
        <div class="w-full bg-bb-dark h-6 rounded flex items-center justify-center relative overflow-hidden border border-bb-border">
            <div class="absolute left-0 w-1/3 h-full bg-bb-green/20"></div>
            <div class="absolute left-1/3 w-1/3 h-full bg-bb-gold/20"></div>
            <div class="absolute right-0 w-1/3 h-full bg-bb-red/20"></div>
            <div class="absolute h-full w-1 bg-white" style="left: ${Math.min(100, Math.max(0, 50 + dist * 10))}%"></div>
            <div class="relative z-10 flex justify-between w-full px-1 text-[8px] font-bold">
                <span class="text-bb-green">DISCOUNT</span>
                <span class="text-bb-gold">FAIR</span>
                <span class="text-bb-red">PREMIUM</span>
            </div>
        </div>
        
        <div class="text-center mt-2 text-xs">
            <span class="text-bb-muted">Deviation: </span>
            <span class="${dist > 0 ? 'text-bb-red' : 'text-bb-green'} font-mono">${dist > 0 ? '+' : ''}${dist.toFixed(2)}%</span>
        </div>
    `;
}
