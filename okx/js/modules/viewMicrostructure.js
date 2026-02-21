import * as Utils from '../utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col gap-3 p-2 bg-bb-black font-mono">
            
            <!-- HEADER -->
            <div class="flex justify-between items-center border-b border-bb-border pb-1">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-bold">MICROSTRUCTURE</span>
                    <span class="text-[9px] text-bb-muted uppercase tracking-widest px-2 py-0.5 border border-bb-border rounded">Institutional Flow Analysis</span>
                </div>
            </div>

            <!-- TOP GRID: INFORMED TRADING & WHALES -->
            <div class="grid grid-cols-2 h-1/2 gap-3">
                <!-- VPIN / INFORMED TRADING -->
                <div class="panel flex flex-col">
                    <div class="panel-header flex justify-between">
                        <span>INFORMED TRADING (VPIN)</span>
                        <span class="text-[9px] text-bb-muted">TOXICITY MONITOR</span>
                    </div>
                    <div class="flex-1 flex flex-col items-center justify-center gap-4 bg-bb-dark/30">
                        <div class="relative w-32 h-32 flex items-center justify-center">
                           <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90">
                              <path class="text-bb-border" stroke-dasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="2"/>
                              <path id="vpin-arc" class="text-bb-gold" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                           </svg>
                           <div class="absolute flex flex-col items-center">
                               <span class="text-2xl font-black text-white" id="vpin-val">0.00</span>
                               <span class="text-[8px] text-bb-muted uppercase">informed idx</span>
                           </div>
                        </div>
                        <div id="vpin-label" class="text-[10px] font-bold px-3 py-1 bg-bb-panel border border-bb-border rounded shadow-sm">NEUTRAL</div>
                    </div>
                </div>

                <!-- KYLE LAMBDA / IMPACT -->
                <div class="panel flex flex-col">
                    <div class="panel-header flex justify-between">
                        <span>PRICE IMPACT (λ)</span>
                        <span class="text-[9px] text-bb-muted">LIQUIDITY DEPTH</span>
                    </div>
                    <div class="flex-1 flex flex-col p-4 bg-bb-dark/30 gap-4">
                        <div class="flex flex-col gap-1">
                             <div class="flex justify-between text-[9px] text-bb-muted uppercase"><span>Impact Coefficient</span><span id="lambda-val" class="font-mono text-white">0.00</span></div>
                             <div class="h-2 bg-bb-dark rounded-full overflow-hidden border border-bb-border">
                                <div id="lambda-bar" class="h-full bg-bb-blue transition-all duration-700" style="width: 0%"></div>
                             </div>
                        </div>
                         <div class="flex flex-col gap-1">
                             <div class="flex justify-between text-[9px] text-bb-muted uppercase"><span>Whale Activity</span><span id="whale-val" class="font-mono text-white">0.00</span></div>
                             <div class="h-2 bg-bb-dark rounded-full overflow-hidden border border-bb-border">
                                <div id="whale-bar" class="h-full bg-bb-green transition-all duration-700" style="width: 0%"></div>
                             </div>
                        </div>
                        <div class="mt-auto p-2 bg-white/5 border border-bb-border/50 rounded italic text-[9px] text-bb-muted" id="impact-desc">
                            Analyzing price absorption relative to volume spikes.
                        </div>
                    </div>
                </div>
            </div>

            <!-- BOTTOM GRID: VWOI & SMI & ORDER FLOW -->
            <div class="grid grid-cols-4 flex-1 gap-3 overflow-hidden">
                <!-- VWOI & ORDER FLOW SKEW -->
                 <div class="panel flex flex-col">
                    <div class="panel-header uppercase">Flow Imbalance</div>
                    <div class="flex-1 flex flex-col justify-center p-2 gap-3 bg-bb-sidebar/30">
                        <div class="relative">
                            <div class="w-full h-2.5 bg-bb-dark border border-bb-border rounded-full relative">
                                 <div id="vwoi-pin" class="absolute top-0 bottom-0 w-1 bg-bb-gold shadow-lg transform -translate-x-1/2 left-1/2"></div>
                            </div>
                            <div class="flex justify-between w-full text-[6px] text-bb-muted px-1 uppercase font-bold mt-1">
                                <span>Sell</span><span>Neutral</span><span>Buy</span>
                            </div>
                        </div>
                        <div class="relative">
                            <div class="w-full h-2.5 bg-bb-dark border border-bb-border rounded-full relative">
                                 <div id="skew-pin" class="absolute top-0 bottom-0 w-1 bg-bb-blue shadow-lg transform -translate-x-1/2 left-1/2"></div>
                            </div>
                            <div class="flex justify-between w-full text-[6px] text-bb-muted px-1 uppercase font-bold mt-1">
                                <span>Retry</span><span>Equil</span><span>Inst</span>
                            </div>
                        </div>
                    </div>
                 </div>

                 <!-- SENTIMENT EXTREMITY (Z-SCORE) -->
                 <div class="panel flex flex-col">
                    <div class="panel-header uppercase">Extremity (Z)</div>
                    <div class="flex-1 flex flex-col items-center justify-center p-2 bg-bb-red/5">
                        <div class="text-xl font-black text-white" id="lsr-z-val">0.0</div>
                        <div class="w-full h-1 bg-bb-dark border border-bb-border rounded-full relative my-1">
                             <div id="lsr-z-pin" class="absolute top-0 bottom-0 w-1 bg-bb-red shadow-lg transform -translate-x-1/2 left-1/2"></div>
                        </div>
                        <span id="lsr-z-label" class="text-[7px] font-bold text-bb-muted uppercase tracking-tighter">NORMAL</span>
                    </div>
                 </div>

                 <!-- SMART MONEY INDEX (SMI) -->
                 <div class="panel flex flex-col overflow-hidden relative">
                    <div class="panel-header flex justify-between uppercase">
                        <span>Smart Money</span>
                        <span id="smi-activity" class="text-[7px] px-1 bg-white/5 text-bb-muted border border-white/5 rounded">---</span>
                    </div>
                    <div class="flex-1 flex flex-col items-center justify-center bg-bb-blue/5">
                        <div class="text-2xl font-black italic text-white" id="smi-val">50.0</div>
                        <div id="smi-label" class="text-[8px] font-bold text-bb-blue tracking-widest uppercase text-center">---</div>
                    </div>
                 </div>

                 <!-- FLOW ATTRIBUTION -->
                 <div class="panel flex flex-col overflow-hidden">
                     <div class="panel-header uppercase">Attribution</div>
                     <div class="flex-1 overflow-y-auto scrollbar-thin divide-y divide-bb-border/10" id="micro-list">
                         <!-- Items injected -->
                     </div>
                 </div>
            </div>

        </div>
    `;
}

export function update(data, profile = 'INSTITUTIONAL_BASE', timeframe = '15MENIT') {
    const signalsObj = data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.signals || {};
    const microRoot = data.microstructure?.[profile] || {};
    const micro = Object.assign({}, microRoot, signalsObj.microstructure || {});

    // 1. VPIN Update
    const vpin = micro.vpin || { rawValue: 0, metadata: {} };
    const vpinArc = document.getElementById('vpin-arc');
    const vpinVal = document.getElementById('vpin-val');
    const vpinLabel = document.getElementById('vpin-label');

    if (vpinVal) vpinVal.innerText = Utils.safeFixed(vpin.rawValue || 0, 2);
    if (vpinArc) vpinArc.style.strokeDasharray = `${(vpin.rawValue || 0) * 100}, 100`;
    if (vpinLabel) {
        vpinLabel.innerText = vpin.metadata?.informedTrading || 'LOW';
        vpinLabel.className = `text-[10px] font-bold px-3 py-1 rounded shadow-sm ${vpin.rawValue > 0.6 ? 'bg-bb-red text-white' : 'bg-bb-panel text-bb-muted'}`;
    }

    // 2. Kyle Lambda
    const kl = micro.kyleLambda || { rawValue: 0, metadata: {} };
    const elKlVal = document.getElementById('lambda-val');
    const elKlBar = document.getElementById('lambda-bar');
    if (elKlVal) elKlVal.innerText = Utils.safeFixed(kl.rawValue || 0, 4);
    if (elKlBar) elKlBar.style.width = `${Math.min(100, (kl.rawValue || 0) * 20)}%`;

    // 3. Whale Divergence
    const whale = micro.volumeFreqDivergence || { rawValue: 0, metadata: {} };
    const elWhaleVal = document.getElementById('whale-val');
    const elWhaleBar = document.getElementById('whale-bar');
    if (elWhaleVal) elWhaleVal.innerText = Utils.safeFixed(whale.rawValue || 0, 2);
    if (elWhaleBar) elWhaleBar.style.width = `${Math.min(100, (whale.rawValue || 0) * 100)}%`;

    // 3. Flow Imbalance & Skew (VWOI + Sizing)
    const of = data.analytics?.orderFlow || {};
    const vwoi = micro.vwoi || { rawValue: 0 };
    const vwoiPin = document.getElementById('vwoi-pin');
    const skewPin = document.getElementById('skew-pin');

    if (vwoiPin) {
        const left = 50 + (vwoi.rawValue || 0) * 50; // -1 to +1 -> 0% to 100%
        vwoiPin.style.left = `${Math.max(5, Math.min(95, left))}%`;
    }

    if (skewPin) {
        const skew = of.tradeSizeImbalance || 0;
        const left = 50 + (skew / 0.5) * 50;
        skewPin.style.left = `${Math.max(5, Math.min(95, left))}%`;
    }

    // 3.5 Sentiment Extremity (Z-Score)
    const lsr = data.raw?.LSR?.timeframes_15min || {};
    const zPin = document.getElementById('lsr-z-pin');
    const zVal = document.getElementById('lsr-z-val');
    const zLabel = document.getElementById('lsr-z-label');

    if (zVal) {
        const z = lsr.z || 0;
        zVal.innerText = Utils.safeFixed(z, 2);

        if (zPin) {
            // Scale -3 to 3 -> 0 to 100
            const left = 50 + (z / 3) * 50;
            zPin.style.left = `${Math.max(5, Math.min(95, left))}%`;
        }

        if (zLabel) {
            const status = z > 2.0 ? 'EXTREME FOMO' : z < -2.0 ? 'EXTREME PANIC' : z > 1.0 ? 'FOMO LEAN' : z < -1.0 ? 'PANIC LEAN' : 'SYMMETRICAL';
            const color = Math.abs(z) > 2 ? 'text-bb-red font-black animate-pulse' : Math.abs(z) > 1 ? 'text-bb-gold' : 'text-bb-muted';
            zLabel.innerText = status;
            zLabel.className = `text-[7px] font-bold uppercase tracking-tighter ${color}`;
        }
    }

    // 4. Smart Money Index (SMI)
    const composite = signalsObj.composite || {};
    const smi = composite.smartMoneyIndex || { normalizedScore: 50, metadata: {} };

    const elSmiVal = document.getElementById('smi-val');
    const elSmiLabel = document.getElementById('smi-label');
    const elSmiActivity = document.getElementById('smi-activity');

    if (elSmiVal) {
        const score = (typeof smi.normalizedScore === 'number') ? smi.normalizedScore : 50;
        elSmiVal.innerText = Utils.safeFixed(score, 1);
        elSmiVal.className = `text-3xl font-black italic ${score > 60 ? 'text-bb-green' : score < 40 ? 'text-bb-red' : 'text-white'}`;
    }

    if (elSmiLabel) {
        const dir = smi.direction || 'NEUTRAL';
        // Support both BUY/SELL (legacy) and LONG/SHORT (new)
        const isLong = dir === 'BUY' || dir === 'LONG';
        const isShort = dir === 'SELL' || dir === 'SHORT';
        elSmiLabel.innerText = isLong ? 'HEAVY ACCUMULATION' : isShort ? 'HEAVY DISTRIBUTION' : 'EQUILIBRIUM';
        elSmiLabel.className = `text-[8px] font-bold tracking-widest uppercase ${isLong ? 'text-bb-green' : isShort ? 'text-bb-red' : 'text-bb-blue'}`;
    }

    if (elSmiActivity) {
        elSmiActivity.innerText = smi.metadata?.smartMoneyActivity || 'MODERATE';
    }

    // 5. Flow Attribution List (Compact)
    const elList = document.getElementById('micro-list');
    if (elList) {
        const oi = data.raw?.OI || {};
        const effVal = oi.volumeOIRatio || 0;
        const effStatus = effVal === 0 ? '---' : effVal < 0.5 ? 'ACCUMULATION' : effVal < 1.5 ? 'SMART FLOW' : effVal < 3.0 ? 'BALANCED' : 'HOT SPECULATION';

        const metrics = [
            { name: 'VPIN', val: vpin.rawValue, status: vpin.metadata?.informedTrading },
            { name: 'λ-Impact', val: kl.rawValue, status: kl.metadata?.impactEvaluation },
            { name: 'Whale Act', val: whale.rawValue, status: whale.metadata?.whaleActivity },
            { name: 'OI Efficiency', val: effVal, status: effStatus }
        ];

        elList.innerHTML = metrics.map(m => `
            <div class="flex justify-between items-center p-1.5 text-[9px]">
                <span class="text-bb-muted uppercase font-bold">${m.name}</span>
                <div class="flex gap-2 items-center">
                    <span class="font-mono text-white/50">${typeof m.val === 'number' ? Utils.safeFixed(m.val, 2) : '---'}</span>
                    <span class="text-[7px] font-black leading-none px-1 py-0.5 rounded border border-white/5 ${m.status?.includes('HIGH') || m.status?.includes('SMART') || m.status?.includes('ACCUM') ? 'text-bb-green bg-bb-green/5' : m.status?.includes('HOT') || m.status?.includes('SPEC') ? 'text-bb-red bg-bb-red/5' : 'text-bb-blue bg-bb-blue/5'}">${m.status || '---'}</span>
                </div>
            </div>
        `).join('');
    }
}
