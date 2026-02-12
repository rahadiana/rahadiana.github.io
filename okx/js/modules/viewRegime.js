import * as Utils from '../utils.js';
import { getMasterSignal, getSignals, getMicrostructure } from '../data_helpers.js';

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col gap-3 p-2 bg-bb-black font-mono">
            
            <!-- HEADER -->
            <div class="flex justify-between items-center border-b border-bb-border pb-1">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-bold">REGIME & VOLATILITY</span>
                    <span class="text-[9px] text-bb-muted uppercase tracking-widest px-2 py-0.5 border border-bb-border rounded">Strategy Filter</span>
                </div>
            </div>

            <!-- TOP GRID: MARKET REGIME -->
            <div class="grid grid-cols-2 h-1/2 gap-3">
                
                <!-- CURRENT REGIME -->
                <div class="panel flex flex-col items-center justify-center p-6 bg-bb-dark/30">
                    <span class="text-[10px] text-bb-muted uppercase font-bold tracking-widest mb-2">Market Classification</span>
                    <h2 class="text-4xl font-black italic tracking-tighter text-white text-center" id="reg-current-name">---</h2>
                    <div id="reg-current-score" class="mt-4 px-4 py-1 rounded bg-bb-panel border border-bb-border text-[10px] font-bold">STRENGTH: --</div>
                    <p class="text-[8px] text-bb-muted mt-4 text-center max-w-[200px]" id="reg-desc">
                        Determining if market is in a trending or distribution phase.
                    </p>
                </div>

                <!-- VOLATILITY STATE -->
                <div class="panel flex flex-col">
                    <div class="panel-header">VOLATILITY THERMOMETER</div>
                    <div class="flex-1 flex flex-col p-4 justify-center gap-6">
                        <div class="relative h-4 bg-bb-dark rounded-full overflow-hidden border border-bb-border">
                            <div class="absolute inset-0 bg-gradient-to-r from-bb-green/20 via-bb-gold/20 to-bb-red/40"></div>
                            <div id="reg-vol-pin" class="absolute top-0 bottom-0 w-1.5 bg-white shadow-xl transform -translate-x-1/2 left-1/2 transition-all duration-1000"></div>
                        </div>
                        <div class="grid grid-cols-3 text-[8px] text-bb-muted font-bold text-center">
                            <span>LOW VOL</span><span>NORMAL</span><span>EXTREME</span>
                        </div>
                        <div class="flex justify-between items-center p-2 bg-bb-panel rounded border border-bb-border/50">
                             <span class="text-[9px] text-bb-muted">ATR MOMENTUM</span>
                             <span id="reg-atr-val" class="text-xs font-bold font-mono">0.00%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- BOTTOM: STRATEGY ALIGNMENT -->
            <div class="flex-1 panel flex flex-col overflow-hidden">
                <div class="panel-header">RECOMMENDED PROFILE ALIGNMENT</div>
                <div class="flex-1 grid grid-cols-3 divide-x divide-bb-border/30">
                    <!-- Conservative -->
                    <div class="flex flex-col items-center justify-center p-4 gap-2" id="reg-prof-con">
                        <span class="text-[10px] font-bold text-bb-muted">CONSERVATIVE</span>
                        <div class="w-2 h-2 rounded-full bg-bb-border" id="reg-dot-con"></div>
                    </div>
                    <!-- Moderate -->
                    <div class="flex flex-col items-center justify-center p-4 gap-2" id="reg-prof-mod">
                        <span class="text-[10px] font-bold text-bb-muted">MODERATE</span>
                        <div class="w-2 h-2 rounded-full bg-bb-border" id="reg-dot-mod"></div>
                    </div>
                    <!-- Aggressive -->
                    <div class="flex flex-col items-center justify-center p-4 gap-2" id="reg-prof-agg">
                        <span class="text-[10px] font-bold text-bb-muted">AGGRESSIVE</span>
                        <div class="w-2 h-2 rounded-full bg-bb-border" id="reg-dot-agg"></div>
                    </div>
                </div>
            </div>

        </div>
    `;
}

export function update(data, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    const master = getMasterSignal(data, profile, timeframe);
    const signalsObj = getSignals(data, profile, timeframe);
    const micro = getMicrostructure(data, profile);

    // Market regime may be a string or an object under master
    const regimeName = master.marketRegime || master.currentRegime || master.regime || 'RANGING';
    const confidence = master.confidence ?? master.regimeScore ?? (master.normalizedScore ? Math.round(master.normalizedScore * 100) : 50);

    // Volatility roots: prefer signals volatility then analytics
    const volRoot = signalsObj.volatility || data.analytics?.volatility || {};
    const volRegime = volRoot.volatilityRegime || {};
    const atrPct = volRoot.atrMomentum?.metadata?.atrPct ?? data.analytics?.volatility?.atr ?? 0;

    // 1. Regime Update
    const elName = document.getElementById('reg-current-name');
    const elScore = document.getElementById('reg-current-score');
    if (elName) elName.innerText = regimeName;
    if (elScore) elScore.innerText = `STRENGTH: ${confidence}`;

    // 2. Vol Thermometer
    const elPin = document.getElementById('reg-vol-pin');
    const elAtr = document.getElementById('reg-atr-val');
    if (elPin) {
        const score = volRegime?.regime === 'EXTREME_VOL' ? 95 : volRegime?.regime === 'HIGH_VOL' ? 75 : volRegime?.regime === 'LOW_VOL' ? 25 : 50;
        elPin.style.left = `${score}%`;
    }
    if (elAtr) elAtr.innerText = `${(atrPct * Utils.safeFixed(100), 3)}%`;

    // 3. Recommended Profiles
    const rec = master.recommendedStrategy || master.profileName || master.recommendation || profile;
    const profiles = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'];

    profiles.forEach(p => {
        const dotId = `reg-dot-${p.toLowerCase().substring(0, 3)}`;
        const elDot = document.getElementById(dotId);
        if (elDot) {
            if (p === rec) {
                elDot.className = 'w-3 h-3 rounded-full bg-bb-gold animate-ping shadow-[0_0_10px_#fbbf24]';
            } else {
                elDot.className = 'w-2 h-2 rounded-full bg-bb-border';
            }
        }
    });
}
