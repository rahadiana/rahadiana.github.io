import * as Utils from '../utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col gap-3 p-2 bg-bb-black font-mono overflow-hidden">
            
            <!-- HEADER -->
            <div class="flex justify-between items-center border-b border-bb-border pb-1">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-bold uppercase">POSITIONING & RISK</span>
                    <span class="text-[9px] text-bb-muted uppercase tracking-widest px-2 py-0.5 border border-bb-border rounded">Leverage Engine</span>
                </div>
            </div>

            <!-- TOP ROW: OI & LIQUIDATION -->
            <div class="grid grid-cols-2 h-1/2 gap-3">
                
                <!-- OPEN INTEREST DIVERGENCE -->
                <div class="panel flex flex-col">
                    <div class="panel-header flex justify-between">
                        <span>OI DIVERGENCE</span>
                        <span id="oi-status" class="text-[9px] font-bold">STABLE</span>
                    </div>
                    <div class="flex-1 flex flex-col p-3 bg-bb-dark/30 gap-3">
                        <div class="flex justify-between items-end border-b border-bb-border/30 pb-2">
                             <div class="flex flex-col">
                                <span class="text-[8px] text-bb-muted">OI CHANGE (1H)</span>
                                <span id="oi-val" class="text-2xl font-black">0.00%</span>
                             </div>
                             <div class="text-right">
                                <span class="text-[8px] text-bb-muted uppercase font-bold">Flow Type</span>
                                <div id="oi-type" class="text-[10px] text-white">---</div>
                             </div>
                        </div>
                        <div class="flex-1 flex flex-col justify-center">
                             <div class="text-[8px] text-bb-muted mb-2 uppercase tracking-tighter">Multi-Timeframe Buildup</div>
                             <div class="grid grid-cols-4 gap-1" id="oi-bars">
                                 <!-- Bars injected -->
                             </div>
                        </div>
                    </div>
                </div>

                <!-- LIQUIDATION CASCADE RISK -->
                <div class="panel flex flex-col">
                    <div class="panel-header flex justify-between">
                        <span>LIQUIDATION RISK</span>
                        <span class="text-[9px] text-bb-muted">CASSCADE PREDICTOR</span>
                    </div>
                    <div class="flex-1 flex flex-col p-3 bg-bb-dark/30">
                        <div class="flex-1 flex flex-col items-center justify-center relative">
                             <!-- Heatmap Ring -->
                             <div class="w-24 h-24 rounded-full border-4 border-bb-border relative flex items-center justify-center overflow-hidden">
                                <div id="liq-heat" class="absolute inset-0 bg-gradient-to-t from-bb-red/40 to-transparent transition-all duration-1000" style="height: 0%"></div>
                                <span id="liq-risk-val" class="text-2xl font-black text-white relative z-10">0%</span>
                             </div>
                             <div id="liq-risk-label" class="mt-2 text-[9px] font-bold uppercase tracking-widest text-bb-muted">LOW RISK</div>
                        </div>
                        <div class="mt-2 p-2 bg-bb-panel border border-bb-border/50 rounded flex justify-between items-center">
                             <span class="text-[8px] text-bb-muted uppercase">Vol Ratio</span>
                             <span id="liq-side" class="text-[10px] font-bold">BALANCED</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- BOTTOM ROW: FUNDING & BIAS -->
            <div class="grid grid-cols-3 flex-1 gap-3 overflow-hidden">
                
                <!-- FUNDING ARBITRAGE & YIELD -->
                <div class="panel flex flex-col overflow-hidden">
                    <div class="panel-header flex justify-between">
                        <span>ARB & YIELD MONITOR</span>
                        <span id="fund-arb-status" class="text-[7px] px-1 bg-bb-blue/20 text-bb-blue rounded uppercase tracking-tighter">Scanning...</span>
                    </div>
                    <div class="flex-1 flex flex-col p-2 gap-2 relative">
                        <div class="flex justify-between items-start">
                            <div class="flex flex-col">
                                <span class="text-[7px] text-bb-muted uppercase font-bold">8H Payout</span>
                                <div id="fund-val" class="text-xs font-mono font-bold text-white">0.0000%</div>
                            </div>
                            <div class="text-right">
                                <span class="text-[7px] text-bb-muted uppercase font-bold">Yield Est (APR)</span>
                                <div id="fund-arb-yield" class="text-xs font-mono font-black text-bb-gold">0.00%</div>
                            </div>
                        </div>
                        
                        <div class="h-1 bg-bb-dark rounded-full overflow-hidden border border-white/5 relative">
                             <div id="fund-bar" class="h-full bg-bb-gold transition-all duration-1000" style="width: 50%"></div>
                             <div class="absolute inset-y-0 left-1/2 w-px bg-white/20"></div>
                        </div>

                        <div class="p-1 px-2 bg-white/5 rounded border border-white/5">
                            <div id="fund-arb-reason" class="text-[8px] text-bb-text leading-tight italic truncate">Monitoring funding bias...</div>
                        </div>
                    </div>
                </div>

                <!-- LSR SENTIMENT -->
                <div class="panel col-span-2 flex flex-col overflow-hidden">
                    <div class="panel-header flex justify-between">
                        <span>RETAIL POSITIONING (LSR)</span>
                        <span id="lsr-global" class="text-[9px] font-bold">NEUTRAL</span>
                    </div>
                    <div class="flex-1 flex flex-col p-1 divide-y divide-bb-border/20" id="lsr-list">
                         <!-- LSR Items injected -->
                    </div>
                </div>
            </div>

        </div>
    `;
}

export function update(data, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    const rawOi = data.raw?.OI || {};
    const signalsObj = data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.signals || {};
    const deri = signalsObj.derivatives || {};
    const sent = signalsObj.sentiment || {};
    const price = data.raw?.PRICE || {};

    // 1. OI Update
    const oiDiv = deri.oiDivergence || { metadata: {} };
    const elOiVal = document.getElementById('oi-val');
    const elOiType = document.getElementById('oi-type');
    const elOiStatus = document.getElementById('oi-status');
    const oiChg = oiDiv.metadata?.oiChange || rawOi.oiChange1h || 0;

    if (elOiVal) {
        elOiVal.innerText = `${oiChg > 0 ? '+' : ''}${Utils.safeFixed(oiChg, 2)}%`;
        elOiVal.className = `text-2xl font-black ${oiChg > 0.5 ? 'text-bb-green' : oiChg < -0.5 ? 'text-bb-red' : 'text-white'}`;
    }
    if (elOiType) elOiType.innerText = oiDiv.metadata?.signalType || 'STABLE_FLOW';
    if (elOiStatus) {
        const isDiv = oiDiv.normalizedScore > 65 || oiDiv.normalizedScore < 35;
        elOiStatus.innerText = isDiv ? 'DIVERGENCE' : 'STABLE';
        elOiStatus.className = `text-[9px] font-bold ${isDiv ? 'text-bb-gold' : 'text-bb-muted'}`;
    }

    // OI MTF Bars
    const elOiBars = document.getElementById('oi-bars');
    if (elOiBars) {
        const tfs = [
            { l: '5M', v: rawOi.oiChange5m },
            { l: '15M', v: rawOi.oiChange15m },
            { l: '1H', v: rawOi.oiChange1h }
        ];
        elOiBars.innerHTML = tfs.map(tf => `
            <div class="flex flex-col gap-1">
                <div class="h-8 bg-bb-dark border border-bb-border/30 rounded relative overflow-hidden">
                    <div class="absolute bottom-0 left-0 right-0 ${tf.v > 0 ? 'bg-bb-green' : 'bg-bb-red'} opacity-40 transition-all duration-700" style="height: ${Math.min(100, Math.abs(tf.v || 0) * 20)}%"></div>
                </div>
                <div class="text-[7px] text-center text-bb-muted">${tf.l}</div>
            </div>
        `).join('');
    }

    // 2. Liquidation Risk
    const liq = deri.liquidationCascade || { normalizedScore: 0, metadata: {} };
    const elLiqHeat = document.getElementById('liq-heat');
    const elLiqRisk = document.getElementById('liq-risk-val');
    const elLiqSide = document.getElementById('liq-side');
    const elLiqLabel = document.getElementById('liq-risk-label');

    if (elLiqRisk) elLiqRisk.innerText = `${Math.round(liq.normalizedScore || 0)}%`;
    if (elLiqHeat) elLiqHeat.style.height = `${liq.normalizedScore || 0}%`;
    if (elLiqSide) elLiqSide.innerText = liq.metadata?.dominantSide || 'BALANCED';
    if (elLiqLabel) {
        const score = liq.normalizedScore || 0;
        elLiqLabel.innerText = score > 70 ? 'EXTREME RISK' : score > 40 ? 'CAUTION' : 'LOW RISK';
        elLiqLabel.className = `mt-2 text-[9px] font-bold uppercase tracking-widest ${score > 70 ? 'text-bb-red' : score > 40 ? 'text-bb-gold' : 'text-bb-muted'}`;
    }

    // 3. Funding Arbitrage & Yield
    const arb = deri.fundingArbitrage || { metadata: {} };
    const arbMeta = arb.metadata || {};
    const elFundVal = document.getElementById('fund-val');
    const elFundBar = document.getElementById('fund-bar');
    const elArbStatus = document.getElementById('fund-arb-status');
    const elArbYield = document.getElementById('fund-arb-yield');
    const elArbReason = document.getElementById('fund-arb-reason');

    if (elFundVal) {
        const ratePct = arbMeta.fundingRate?.current || (rawOi.funding_Rate * 100) || 0;
        elFundVal.innerText = `${Utils.safeFixed(ratePct, 4)}%`;
        elFundVal.className = `text-xs font-mono font-bold ${ratePct > 0.01 ? 'text-bb-red' : ratePct < -0.01 ? 'text-bb-green' : 'text-white'}`;
    }

    if (elFundBar) {
        const ratePct = arbMeta.fundingRate?.current || (rawOi.funding_Rate * 100) || 0;
        const width = 50 + (ratePct / 0.05) * 50;
        elFundBar.style.width = `${Math.max(5, Math.min(95, width))}%`;
        elFundBar.className = `h-full transition-all duration-1000 ${ratePct > 0 ? 'bg-bb-red' : 'bg-bb-green'}`;
    }

    if (elArbStatus) {
        const hasOpp = arbMeta.hasOpportunity;
        elArbStatus.innerText = hasOpp ? 'OPPORTUNITY' : 'MONITORING';
        elArbStatus.className = `text-[7px] px-1 rounded uppercase tracking-tighter ${hasOpp ? 'bg-bb-gold text-black font-black' : 'bg-bb-blue/20 text-bb-blue'}`;
    }

    if (elArbYield) {
        const apr = arbMeta.returns?.expectedAnnualized || 0;
        elArbYield.innerText = `${Utils.safeFixed(apr, 2)}% APR`;
        elArbYield.className = `text-xs font-mono font-black ${apr > 50 ? 'text-bb-gold' : 'text-white/70'}`;
    }

    if (elArbReason) {
        elArbReason.innerText = arbMeta.strategy?.entryReason || arbMeta.strategy?.reason || 'Monitoring funding bias...';
    }

    // 4. LSR
    const lsrGlobal = sent.sentimentAlignment || { metadata: {} };
    const elLsrGlobal = document.getElementById('lsr-global');
    if (elLsrGlobal) {
        elLsrGlobal.innerText = lsrGlobal.metadata?.alignmentScore > 70 ? 'EXTREME BIASED' : 'ALIGNED';
        elLsrGlobal.className = `text-[9px] font-bold ${lsrGlobal.metadata?.alignmentScore > 70 ? 'text-bb-red' : 'text-bb-blue'}`;
    }

    const elLsrList = document.getElementById('lsr-list');
    if (elLsrList && lsrGlobal.metadata?.zScores) {
        const zArr = lsrGlobal.metadata.zScores;
        const labels = lsrGlobal.metadata.timeframes || ['5M', '15M', '1H'];
        elLsrList.innerHTML = zArr.slice(0, 4).map((z, idx) => `
            <div class="flex justify-between items-center p-1 text-[9px]">
                <span class="text-bb-muted">${labels[idx]} CROWD</span>
                <div class="flex gap-2 items-center">
                    <span class="font-mono text-white">Z:${Utils.safeFixed(z, 2)}</span>
                    <span class="w-16 text-right font-bold ${z > 1 ? 'text-bb-green' : z < -1 ? 'text-bb-red' : 'text-bb-muted'}">${z > 1 ? 'BULLISH' : z < -1 ? 'BEARISH' : 'NEUTRAL'}</span>
                </div>
            </div>
        `).join('');
    }
}
