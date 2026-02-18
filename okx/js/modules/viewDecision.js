import * as Utils from '../utils.js';
import * as ViewSignalComposer from './viewSignalComposer.js';

let currentDecDetailTab = 'MAIN';

export function render(container) {
    container.innerHTML = `
        <div class="min-h-full flex flex-col gap-4 p-4 bg-bb-black text-bb-text font-sans relative">
            
            <!-- TOP DECISION CARD -->
            <div class="bg-bb-panel border-2 border-bb-border rounded-lg p-6 shadow-2xl flex flex-col items-center justify-center min-h-[180px] relative overflow-hidden" id="decision-main-card">
                <div class="absolute top-0 right-0 p-2 flex items-center gap-2">
                    <span id="dec-meta-guard-badge" class="hidden text-[7px] px-1.5 py-0.5 border rounded-sm font-black uppercase tracking-tighter">🛡️ ALLOW</span>
                    <span id="dec-liq-badge" class="hidden text-[7px] px-1 py-0.5 border rounded-sm font-bold uppercase tracking-tighter">Liq: Premium</span>
                    <span id="dec-hft-badge" class="hidden text-[7px] px-1 py-0.5 bg-bb-red/20 text-bb-red border border-bb-red/30 rounded-sm font-black animate-pulse uppercase tracking-tighter">Toxic HFT Flow</span>
                    <span class="text-[9px] text-bb-muted uppercase tracking-[0.2em] font-bold">Action Engine v2.1</span>
                </div>
                
                <span class="text-[10px] text-bb-muted uppercase font-bold tracking-widest mb-1">Recommended Action</span>
                <div class="flex items-center gap-3">
                    <h1 class="text-7xl font-black italic tracking-tighter" id="dec-action">WAIT</h1>
                    <div id="dec-divergence-badge" class="hidden px-2 py-1 bg-bb-red text-white text-[10px] font-black italic rounded animate-pulse border-2 border-white/20">DIVERGENCE DETECTED</div>
                </div>
                
                <div class="flex items-center gap-6 mt-4">
                    <div class="flex flex-col items-center">
                        <span class="text-[9px] text-bb-muted uppercase font-bold">Confidence</span>
                        <span class="text-2xl font-mono font-black text-bb-gold" id="dec-confidence">0%</span>
                    </div>
                    <div class="w-px h-10 bg-bb-border opacity-50"></div>
                    <div class="flex flex-col items-center">
                        <span class="text-[9px] text-bb-muted uppercase font-bold">Confluence</span>
                        <span class="text-2xl font-mono font-black text-white" id="dec-confirmations">0/0</span>
                    </div>
                    <div class="w-px h-10 bg-bb-border opacity-50"></div>
                    <div class="flex flex-col items-center">
                        <span class="text-[9px] text-bb-muted uppercase font-bold">META-GUARD</span>
                        <span class="text-lg font-mono font-black" id="dec-guard-status">--</span>
                    </div>
                </div>
            </div>

            <!-- INTELLIGENCE BRIEFING: NARRATIVE SUMMARY -->
            <div class="panel p-5 pb-5 relative !overflow-visible bg-white/[0.02] border-bb-gold/10 shrink-0" id="dec-narrative-card">
                 <div class="absolute -top-2 left-3 px-2 bg-bb-black border border-bb-gold/20 text-[7px] text-bb-gold font-black tracking-[0.2em] rounded">INSTITUTIONAL INTELLIGENCE</div>
                 <div class="mt-2 text-[14px] leading-relaxed text-white font-medium drop-shadow-sm" id="dec-narrative">
                     <span class="text-bb-muted animate-pulse italic">Scanning market microstructure and positioning metrics...</span>
                 </div>
                 <div class="mt-4 flex flex-wrap gap-2" id="dec-narrative-tags">
                     <!-- Context tags -->
                 </div>
            </div>

            <!-- MIDDLE GRID: STATS & SIZING -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[220px] shrink-0">
                <!-- POSITION SIZING -->
                <div class="bg-bb-panel border border-bb-border rounded p-4 flex flex-col gap-3">
                    <div class="flex justify-between items-center border-b border-bb-border/30 pb-2">
                        <span class="text-[10px] font-bold text-bb-muted uppercase">Risk Management</span>
                        <span class="px-2 py-0.5 bg-bb-blue/20 text-bb-blue text-[8px] font-black rounded uppercase">Calculated</span>
                    </div>
                    <div class="flex justify-between items-end">
                        <div class="flex flex-col">
                            <span class="text-[9px] text-bb-muted">Recommended Size</span>
                            <span class="text-2xl font-bold text-white" id="dec-size">$0</span>
                        </div>
                        <div class="flex flex-col items-end">
                            <span class="text-[9px] text-bb-muted">Leverage</span>
                            <span class="text-lg font-bold text-bb-gold" id="dec-lev">1.0x</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div class="p-2 bg-bb-dark border border-bb-border/50 rounded flex flex-col justify-between">
                            <div class="text-[7px] text-bb-muted uppercase font-bold">Flow Velocity</div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-black text-white" id="dec-velocity">0.00x</span>
                                <span id="dec-velocity-badge" class="text-[6px] px-1 bg-bb-blue/20 text-bb-blue rounded uppercase">STABLE</span>
                            </div>
                        </div>
                        <div class="p-2 bg-white/5 border border-bb-border/30 rounded flex justify-between items-center">
                            <div class="flex flex-col">
                                <span class="text-[7px] text-bb-muted uppercase font-bold">SL</span>
                                <span class="text-[10px] font-black text-bb-red" id="dec-sl">--</span>
                            </div>
                            <div class="flex flex-col items-end">
                                <span class="text-[7px] text-bb-muted uppercase font-bold">TP</span>
                                <span class="text-[10px] font-black text-bb-green" id="dec-tp">--</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- INTELLIGENCE TRANSPARENCY (ADAPTIVE WEIGHTING) -->
                <div class="bg-bb-panel border border-bb-border rounded p-4 flex flex-col h-full overflow-hidden">
                    <div class="flex justify-between items-center border-b border-bb-border/30 pb-2 mb-3 shrink-0">
                        <div class="flex items-center gap-2">
                             <span class="text-[10px] font-black text-bb-gold uppercase tracking-widest">Model Transparency</span>
                             <span class="text-[7px] px-1 bg-bb-gold/10 text-bb-gold rounded">BETA</span>
                        </div>
                        <span class="text-[8px] text-bb-muted uppercase font-bold">Dynamic weights</span>
                    </div>
                    
                    <!-- Weight Factors Legend -->
                    <div class="grid grid-cols-4 gap-1 mb-3 shrink-0">
                        ${['Vol', 'Conf', 'Agree', 'Regime'].map(f => `
                            <div class="flex flex-col items-center p-1 bg-white/5 rounded-sm">
                                <span class="text-[6px] text-bb-muted uppercase">${f}</span>
                                <div class="w-full h-0.5 bg-bb-blue/20 mt-1 relative overflow-hidden">
                                     <div class="absolute inset-y-0 left-0 bg-bb-blue opacity-40 animate-pulse" style="width: 70%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="flex-1 overflow-y-auto scrollbar-thin space-y-1">
                        <div id="dec-coin-detail-content">
                            <div id="dec-coin-main-content">
                                <!-- Transparency matrix items injected here -->
                                <div id="dec-drivers" class="space-y-1"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- BOTTOM SECTION: MTF & ALPHA -->
            <div class="grid grid-cols-12 gap-3 shrink-0 mb-2">
                <!-- MTF CONVERGENCE -->
                <div class="col-span-8 bg-bb-panel border border-bb-border rounded p-3 flex flex-col gap-2">
                    <div class="flex justify-between items-center mb-1">
                        <div class="flex items-center gap-2">
                            <span class="text-[9px] font-black text-bb-blue uppercase tracking-widest">MTF Convergence</span>
                            <span id="mtf-alignment-badge" class="text-[7px] px-1 bg-bb-blue/20 text-bb-blue rounded border border-bb-blue/30">NEUTRAL</span>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-4 gap-2">
                        ${['1MENIT', '5MENIT', '15MENIT', '1JAM'].map(tf => `
                            <div class="flex flex-col items-center p-2 bg-white/5 border border-white/5 rounded relative overflow-hidden group">
                                <span class="text-[8px] text-bb-muted mb-2 font-black">${tf.replace('MENIT', 'M').replace('JAM', 'H')}</span>
                                <div id="mtf-icon-${tf}" class="w-2 h-2 rounded-full bg-bb-border shadow-[0_0_8px_rgba(255,255,255,0.1)]"></div>
                                <span id="mtf-conf-${tf}" class="text-[8px] font-mono mt-2 text-white/40">--%</span>
                                <div id="mtf-bar-${tf}" class="absolute bottom-0 left-0 h-0.5 bg-bb-blue opacity-20 w-0 transition-all duration-1000"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- ALPHA INTELLIGENCE -->
                <div class="col-span-4 bg-bb-panel border border-bb-gold/30 rounded p-3 flex flex-col items-center justify-center relative overflow-hidden">
                    <div class="absolute top-1 left-2 text-[7px] text-bb-gold/60 font-black uppercase">Alpha Intelligence</div>
                    <div class="text-3xl font-black text-white italic" id="dec-alpha-val">0.0</div>
                    <span id="dec-alpha-badge" class="mt-2 text-[7px] px-1.5 py-0.5 bg-white/5 text-bb-muted border border-white/10 rounded font-black uppercase tracking-widest">Scanning...</span>
                </div>
            </div>

            <!-- FOOTER: REGIME & VWAP CONTEXT -->
            <div class="mt-auto p-3 bg-bb-panel/30 border border-bb-border rounded flex justify-between items-center" id="dec-footer">
                <div class="flex items-center gap-4 overflow-x-auto scrollbar-none">
                    <div class="flex flex-col min-w-max">
                        <span class="text-[8px] text-bb-muted uppercase">Regime</span>
                        <span class="text-[10px] font-bold text-white uppercase tracking-wider" id="dec-regime">---</span>
                    </div>
                    <div class="w-px h-6 bg-bb-border/50 shrink-0"></div>
                    <div class="flex flex-col min-w-max">
                        <span class="text-[8px] text-bb-muted uppercase">Volatility</span>
                        <span class="text-[10px] font-bold text-white uppercase tracking-wider" id="dec-vol-regime">---</span>
                    </div>
                    <div class="w-px h-6 bg-bb-border/50 shrink-0"></div>
                    <div class="flex flex-col min-w-max">
                        <span class="text-[8px] text-bb-muted uppercase">Daily VWAP</span>
                        <div class="flex items-center gap-1.5">
                             <span class="text-[10px] font-mono font-bold text-bb-gold" id="dec-vwap">--</span>
                             <span class="text-[8px] font-black px-1 rounded-sm" id="dec-vwap-delta">--</span>
                        </div>
                    </div>
                </div>
                <div class="text-[9px] text-bb-muted italic hidden md:block">Institutional Flow Analytics</div>
            </div>

        </div>
    `;
}

export function update(data, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    const raw = data.raw || {};
    const signals = data.signals?.profiles?.[profile]?.timeframes?.[timeframe] || {};
    const master = signals.masterSignal || {};
    const attribution = signals.attribution || {};
    const marketRegime = signals.marketRegime || data.signals?.marketRegime || {};
    const volRegime = data.signals?.volatilityRegime || {};
    const syn = data.synthesis || {};

    // 0. HFT Detection & Liquidity Quality
    const elHFT = document.getElementById('dec-hft-badge');
    const elLiq = document.getElementById('dec-liq-badge');

    if (elHFT) {
        const v15 = (raw.VOL?.vol_BUY_15MENIT || 0) + (raw.VOL?.vol_SELL_15MENIT || 0);
        const f15 = (raw.FREQ?.freq_BUY_15MENIT || 0) + (raw.FREQ?.freq_SELL_15MENIT || 0);
        const intensity = v15 > 0 ? (f15 / (v15 / 1000)) : 0;

        if (intensity > 40) {
            elHFT.classList.remove('hidden');
            elHFT.innerText = intensity > 80 ? 'TOXIC HFT FLOW' : 'HIGH BOT ACTIVITY';
        } else {
            elHFT.classList.add('hidden');
        }
    }

    if (elLiq) {
        const se = data.analytics?.spreadEstimates || {};
        const bps = se.combinedBps || 0;
        if (bps > 0) {
            elLiq.classList.remove('hidden');
            const status = bps < 5 ? 'PREMIUM' : bps < 15 ? 'STABLE' : 'THIN';
            const color = status === 'PREMIUM' ? 'bg-bb-green/20 text-bb-green border-bb-green/30' : status === 'STABLE' ? 'bg-bb-blue/20 text-bb-blue border-bb-blue/30' : 'bg-bb-gold/20 text-bb-gold border-bb-gold/30';
            elLiq.innerText = `LIQ: ${status}`;
            elLiq.className = `text-[7px] px-1 py-0.5 border rounded-sm font-bold uppercase tracking-tighter ${color}`;
        } else {
            elLiq.classList.add('hidden');
        }
    }

    // 1. Update Main Action
    const elAction = document.getElementById('dec-action');
    const elCard = document.getElementById('decision-main-card');
    if (elAction && elCard) {
        const action = master.action || 'WAIT';
        const displayAction = action === 'BUY' ? 'LONG' : action === 'SELL' ? 'SHORT' : action;
        elAction.innerText = displayAction;

        // Dynamic styling based on action
        elCard.classList.remove('border-bb-border', 'border-bb-green', 'border-bb-red', 'border-bb-gold');
        if (action === 'BUY') {
            elAction.className = 'text-6xl font-black italic tracking-tighter text-bb-green';
            elCard.classList.add('border-bb-green');
        } else if (action === 'SELL') {
            elAction.className = 'text-6xl font-black italic tracking-tighter text-bb-red';
            elCard.classList.add('border-bb-red');
        } else {
            elAction.className = 'text-6xl font-black italic tracking-tighter text-bb-muted';
            elCard.classList.add('border-bb-border');
        }
    }

    // Tabs removed as requested by user
    // if (typeof ViewSignalComposer.attachComposerTableEvents === 'function') ...

    // 1.5 Pillar Bias & Divergence Guard
    const pillars = calculatePillars(data, signals, master, syn);
    const hasDivergence = detectDivergence(pillars);

    const elDiv = document.getElementById('dec-divergence-badge');
    if (elDiv) {
        if (hasDivergence) elDiv.classList.remove('hidden');
        else elDiv.classList.add('hidden');
    }

    // 2. Metrics
    const elConf = document.getElementById('dec-confidence');
    const elConfirm = document.getElementById('dec-confirmations');
    if (elConf) elConf.innerText = `${Math.round(master.confidence || 0)}%`;
    if (elConfirm) elConfirm.innerText = `${master.confirmations || 0}/${master.requiredConfirmations || 0}`;

    // 2.5 Meta-Guard Status
    const metaGuard = data.signals?.institutional_guard || data.institutional_guard || {};
    const elGuardStatus = document.getElementById('dec-guard-status');
    const elGuardBadge = document.getElementById('dec-meta-guard-badge');

    if (elGuardStatus) {
        const guardStatus = metaGuard.meta_guard_status || '--';
        elGuardStatus.innerText = guardStatus;

        if (guardStatus === 'ALLOW') {
            elGuardStatus.className = 'text-lg font-mono font-black text-bb-green';
        } else if (guardStatus === 'BLOCK') {
            elGuardStatus.className = 'text-lg font-mono font-black text-bb-red animate-pulse';
        } else if (guardStatus === 'DOWNGRADE') {
            elGuardStatus.className = 'text-lg font-mono font-black text-bb-gold';
        } else {
            elGuardStatus.className = 'text-lg font-mono font-black text-bb-muted';
        }
    }

    if (elGuardBadge) {
        const guardStatus = metaGuard.meta_guard_status;
        if (guardStatus) {
            elGuardBadge.classList.remove('hidden');
            elGuardBadge.innerText = `🛡️ ${guardStatus}`;

            if (guardStatus === 'ALLOW') {
                elGuardBadge.className = 'text-[7px] px-1.5 py-0.5 border rounded-sm font-black uppercase tracking-tighter bg-bb-green/20 text-bb-green border-bb-green/30';
            } else if (guardStatus === 'BLOCK') {
                elGuardBadge.className = 'text-[7px] px-1.5 py-0.5 border rounded-sm font-black uppercase tracking-tighter bg-bb-red/20 text-bb-red border-bb-red/30 animate-pulse';
            } else if (guardStatus === 'DOWNGRADE') {
                elGuardBadge.className = 'text-[7px] px-1.5 py-0.5 border rounded-sm font-black uppercase tracking-tighter bg-bb-gold/20 text-bb-gold border-bb-gold/30';
            }

            // Add block reason tooltip
            if (metaGuard.block_reason) {
                elGuardBadge.title = `Block Reason: ${metaGuard.block_reason}`;
            }
        } else {
            elGuardBadge.classList.add('hidden');
        }
    }

    // 3. Risk Management & Flow Velocity
    const elSize = document.getElementById('dec-size');
    const elSL = document.getElementById('dec-sl');
    const elTP = document.getElementById('dec-tp');
    const elVel = document.getElementById('dec-velocity');
    const elVelBadge = document.getElementById('dec-velocity-badge');
    const of = data.analytics?.orderFlow || {};

    if (elSize) elSize.innerText = `$${Utils.formatNumber(master.positionSizing?.recommendedSize || 0)}`;
    if (elSL) elSL.innerText = `x${master.riskManagement?.stopLossMultiplier || 1.0}`;
    if (elTP) elTP.innerText = `x${master.riskManagement?.takeProfitMultiplier || 1.0}`;

    if (elVel) {
        const synMom = syn.momentum || {};
        const vel = synMom.velocity_15MENIT || 0;
        elVel.innerText = `$${Utils.formatNumber(vel, 0)}`;

        if (elVelBadge) {
            const status = synMom.aggression_level_15MENIT || 'RETAIL';
            const color = status === 'INSTITUTIONAL' ? 'bg-bb-gold text-black font-black' : status === 'ACTIVE' ? 'bg-bb-green/20 text-bb-green' : 'bg-bb-blue/20 text-bb-blue';
            elVelBadge.innerText = status;
            elVelBadge.className = `text-[6px] px-1 rounded uppercase ${color}`;
        }
    }

    // 4. Model Transparency Matrix (Adaptive Weighting Breakdown)
    const elDrivers = document.getElementById('dec-drivers');
    if (elDrivers && Array.isArray(master.contributingSignals)) {
        elDrivers.innerHTML = '';
        const categories = signals.signals || {};
        const items = master.contributingSignals.slice(0, 6);
        items.forEach(s => {
            // Find detail in categories
            let detail = null;
            for (const cat in categories) {
                if (categories[cat] && categories[cat][s.key]) {
                    detail = categories[cat][s.key];
                    break;
                }
            }

            const factors = detail?.adjustmentFactors || [];
            const UNIVERSAL_FACTORS = ['coinTier', 'coin_tier', 'tier'];
            const signalSpecificFactors = factors.filter(f => !UNIVERSAL_FACTORS.includes(f.factor) && f.factor !== undefined);
            const factorsToCheck = signalSpecificFactors.length > 0 ? signalSpecificFactors : factors;
            const topFactor = factorsToCheck.reduce((prev, curr) => {
                if (!prev) return curr;
                return Math.abs((Number(curr.multiplier) || 0) - 1) > Math.abs((Number(prev.multiplier) || 0) - 1) ? curr : prev;
            }, null);

            const weight = Number(s.weight) || 1.0;
            const formatFactorName = (name) => {
                if (!name) return 'FACTOR';
                return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase().trim();
            };

            let factorText = 'Neutral';
            if (topFactor) {
                const factorName = formatFactorName(topFactor.factor);
                const multiplierStr = Utils.formatNumber(Number(topFactor.multiplier) || 1, 2);
                if (topFactor.factor === 'agreement' && topFactor.agreements !== undefined) {
                    factorText = `${topFactor.agreements}/${topFactor.total} AGREE: ${multiplierStr}X`;
                } else {
                    factorText = `${factorName}: ${multiplierStr}X`;
                }
            }
            const factorColor = (Number(topFactor?.multiplier) || 1) > 1 ? 'text-bb-green' : (Number(topFactor?.multiplier) || 1) < 1 ? 'text-bb-red' : 'text-bb-muted';

            const formattedName = String(s.key || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').toUpperCase().trim();

            const row = document.createElement('div');
            row.className = 'flex justify-between items-center py-1 px-2 bg-white/5 border border-white/5 rounded group hover:bg-white/10 transition-all';
            const left = document.createElement('div'); left.className = 'flex flex-col max-w-[60%]';
            const nameEl = document.createElement('span'); nameEl.className = 'text-[9px] font-black text-white uppercase tracking-tighter truncate'; nameEl.textContent = formattedName;
            const catEl = document.createElement('span'); catEl.className = 'text-[7px] text-bb-muted uppercase font-bold'; catEl.textContent = detail?.category || 'SIGNAL';
            left.appendChild(nameEl); left.appendChild(catEl);

            const right = document.createElement('div'); right.className = 'flex flex-col items-end';
            const topRow = document.createElement('div'); topRow.className = 'flex items-center gap-1.5';
            const scoreEl = document.createElement('span'); scoreEl.className = `text-[8px] font-bold ${s.direction === 'BUY' ? 'text-bb-green' : s.direction === 'SELL' ? 'text-bb-red' : 'text-bb-muted'}`; scoreEl.textContent = String(Math.round(Number(s.score) || 0));
            const weightEl = document.createElement('span'); weightEl.className = 'text-[9px] font-black text-bb-gold'; weightEl.textContent = `${Utils.formatNumber(weight, 2)}w`;
            topRow.appendChild(scoreEl); topRow.appendChild(weightEl);
            const factorEl = document.createElement('span'); factorEl.className = `text-[7px] font-bold ${factorColor} uppercase tracking-tight`; factorEl.textContent = factorText;
            right.appendChild(topRow); right.appendChild(factorEl);

            row.appendChild(left); row.appendChild(right);
            elDrivers.appendChild(row);
        });
    }

    // 5. MTF Convergence Matrix update
    const profileData = data.signals?.profiles?.[profile] || {};
    const tfs = ['1MENIT', '5MENIT', '15MENIT', '1JAM'];
    let buyCount = 0;
    let sellCount = 0;

    tfs.forEach(tf => {
        const tfMaster = profileData.timeframes?.[tf]?.masterSignal || {};
        const elIcon = document.getElementById(`mtf-icon-${tf}`);
        const elConf = document.getElementById(`mtf-conf-${tf}`);
        const elBar = document.getElementById(`mtf-bar-${tf}`);

        if (elIcon) {
            const action = tfMaster.action || 'WAIT';
            if (action === 'BUY') {
                elIcon.className = 'w-2 h-2 rounded-full bg-bb-green shadow-[0_0_8px_rgba(34,197,94,0.4)]';
                buyCount++;
            } else if (action === 'SELL') {
                elIcon.className = 'w-2 h-2 rounded-full bg-bb-red shadow-[0_0_8px_rgba(239,68,68,0.4)]';
                sellCount++;
            } else {
                elIcon.className = 'w-2 h-2 rounded-full bg-bb-border shadow-none';
            }
        }

        if (elConf) {
            const conf = Math.round(tfMaster.confidence || 0);
            elConf.innerText = `${conf}%`;
            elConf.className = `text-[8px] font-mono mt-2 ${conf > 70 ? 'text-white' : 'text-white/40'}`;
        }

        if (elBar) {
            elBar.style.width = `${tfMaster.confidence || 0}%`;
            elBar.className = `absolute bottom-0 left-0 h-px transition-all duration-1000 ${tfMaster.action === 'BUY' ? 'bg-bb-green' : tfMaster.action === 'SELL' ? 'bg-bb-red' : 'bg-bb-blue'}`;
        }
    });

    const elAlignment = document.getElementById('mtf-alignment-badge');
    if (elAlignment) {
        if (buyCount === tfs.length) {
            elAlignment.innerText = 'CONVERGENCE LONG';
            elAlignment.className = 'text-[7px] px-1 bg-bb-green/20 text-bb-green rounded border border-bb-green/30 font-black';
        } else if (sellCount === tfs.length) {
            elAlignment.innerText = 'CONVERGENCE SHORT';
            elAlignment.className = 'text-[7px] px-1 bg-bb-red/20 text-bb-red rounded border border-bb-red/30 font-black';
        } else if (buyCount >= 3) {
            elAlignment.innerText = 'LEANING LONG';
            elAlignment.className = 'text-[7px] px-1 bg-bb-green/10 text-bb-green/70 rounded border border-bb-green/20';
        } else if (sellCount >= 3) {
            elAlignment.innerText = 'LEANING SHORT';
            elAlignment.className = 'text-[7px] px-1 bg-bb-red/10 text-bb-red/70 rounded border border-bb-red/20';
        } else {
            elAlignment.innerText = 'MIXED SIGNALS';
            elAlignment.className = 'text-[7px] px-1 bg-bb-blue/10 text-bb-blue/70 rounded border border-bb-blue/20';
        }
    }

    // 6. Alpha Intelligence Update
    const elAlphaVal = document.getElementById('dec-alpha-val');
    const elAlphaBadge = document.getElementById('dec-alpha-badge');
    const corr = data.analytics?.correlation || { correlation: 0.8 };

    if (elAlphaVal && elAlphaBadge) {
        const confidence = master.confidence || 0;
        const correlation = corr.correlation || 0.8;
        const alpha = confidence * (1 - correlation);

        elAlphaVal.innerText = Utils.safeFixed(alpha, 1);

        if (correlation > 0.8) { // Changed from 0.85 to 0.8 as per instruction
            elAlphaBadge.innerText = 'MARKET META';
            elAlphaBadge.className = 'mt-2 text-[7px] px-1.5 py-0.5 bg-white/5 text-bb-muted border border-white/10 rounded font-black uppercase tracking-widest';
        } else if (alpha > 30) {
            elAlphaBadge.innerText = 'PURE ALPHA BREAKOUT';
            elAlphaBadge.className = 'mt-2 text-[7px] px-1.5 py-0.5 bg-bb-gold text-black rounded font-black uppercase tracking-widest animate-pulse';
        } else if (correlation < 0.5) { // Changed from 0.6 to 0.5 as per instruction, and text to 'DECORRELATED'
            elAlphaBadge.innerText = 'DECORRELATED';
            elAlphaBadge.className = 'mt-2 text-[7px] px-1.5 py-0.5 bg-bb-blue/20 text-bb-blue border border-bb-blue/30 rounded font-black uppercase tracking-widest';
        } else {
            elAlphaBadge.innerText = 'BALANCED';
            elAlphaBadge.className = 'mt-2 text-[7px] px-1.5 py-0.5 bg-white/5 text-bb-muted rounded font-black uppercase tracking-widest';
        }
    }

    // 7. Institutional Benchmark (VWAP)
    const execution = data.analytics?.execution || {};
    const elVwap = document.getElementById('dec-vwap');
    const elVwapDelta = document.getElementById('dec-vwap-delta');
    const lastPx = data.raw?.PRICE?.last || 0;

    if (elVwap) {
        const vwapVal = execution.vwap || 0;
        elVwap.innerText = vwapVal > 0 ? Utils.formatPrice(vwapVal) : '--';

        if (elVwapDelta && vwapVal > 0 && lastPx > 0) {
            const deltaPct = ((lastPx - vwapVal) / vwapVal) * 100;
            const isPremium = deltaPct > 0;
            elVwapDelta.innerText = `${isPremium ? '+' : ''}${Utils.safeFixed(deltaPct, 2)}%`;
            elVwapDelta.className = `text-[8px] font-black px-1 rounded-sm ${isPremium ? 'bg-bb-red/20 text-bb-red' : 'bg-bb-green/20 text-bb-green'}`;
        }
    }

    // 8. Context
    const elRegime = document.getElementById('dec-regime');
    const elVolRegime = document.getElementById('dec-vol-regime');
    if (elRegime) elRegime.innerText = marketRegime.currentRegime || 'RANGING';
    if (elVolRegime) elVolRegime.innerText = volRegime.regime || 'NORMAL';

    // 9. Market Narrative Brief
    updateNarrative(data, signals, master, marketRegime, volRegime, syn, pillars, hasDivergence);
}

function updateNarrative(data, signals, master, regime, vol, syn = {}, pillars = {}, hasDivergence = false) {
    const elNarrative = document.getElementById('dec-narrative');
    const elTags = document.getElementById('dec-narrative-tags');
    if (!elNarrative || !elTags) return;

    const flow = syn.flow || {};
    const eff = syn.efficiency || {};
    const mom = syn.momentum || {};

    const netFlow = flow.net_flow_15MENIT || 0;
    const char = eff.character_15MENIT || 'NORMAL';
    const bias = flow.capital_bias_15MENIT || 'NEUTRAL';
    const action = master.action || 'WAIT';
    const aggr = mom.aggression_level_15MENIT || 'RETAIL';

    let brief = "";
    let tags = [];

    // 1. Institutional Context (The "Big Why")
    if (char === 'ABSORPTION') {
        brief = `Market is currently in an **Institutional Absorption** phase. `;
        brief += `Large buy/sell orders are being absorbed into resting limit liquidity. Volume is high, but price is being pinned by a major participant. `;
        tags.push({ text: 'ABSORPTION ZONE', color: 'bg-bb-gold/20 text-bb-gold border-bb-gold/30' });
    } else if (char === 'EFFORTLESS_MOVE') {
        brief = `We are witnessing an **Effortless Price Move**. `;
        brief += `Liquidity has thinned out and the path of least resistance is clear. Small volume is driving significant price shift. `;
        tags.push({ text: 'EFFORTLESS MOVE', color: 'bg-bb-blue/20 text-bb-blue border-bb-blue/30' });
    } else {
        brief = `Market character is **Standard**. `;
        brief += `Buying and selling pressure are interacting within expected efficiency parameters. `;
    }

    // 2. Flow Analysis (Real Money Influx)
    if (Math.abs(netFlow) > 10000) {
        brief += `A massive **Net Capital ${netFlow > 0 ? 'Inflow' : 'Outflow'}** of $${Utils.formatNumber(Math.abs(netFlow), 0)} is detected. `;
        brief += `Strategic participants are ${netFlow > 0 ? 'accumulating' : 'distributing'} heavily at these levels. `;
    } else if (bias !== 'NEUTRAL') {
        brief += `The underlying **Capital Bias** is currently leaning towards **${bias}**. `;
    }

    // 3. Aggression & Velocity
    if (aggr === 'INSTITUTIONAL') {
        brief += `Trade velocity indicates **Institutional Aggression**. Large-block traders are dominating the current execution stream. `;
        tags.push({ text: 'INSTO AGGRESSION', color: 'bg-bb-red/20 text-bb-red border-bb-red/30' });
    }

    // 4. Tactical Conclusion
    if (hasDivergence) {
        brief += `**Warning: Logical Divergence Detected.** `;
        const bullPillars = Object.keys(pillars).filter(k => pillars[k] === 'BULL');
        const bearPillars = Object.keys(pillars).filter(k => pillars[k] === 'BEAR');
        brief += `Technical indicators are split: **${bullPillars.join(', ')}** are showing strength, while **${bearPillars.join(', ')}** signal caution or reversal. `;
        brief += `Standard institutional protocol: **Reduce position size** or wait for one side to capitulate. `;
        tags.push({ text: 'DIVERGENCE', color: 'bg-bb-red/30 text-white animate-pulse' });
    } else if (action === 'BUY') {
        if (char === 'ABSORPTION') {
            brief += `**Caution Recommended.** While a BUY signal is present, the current Absorption state suggests a potential Liquidity Trap. Wait for a breakout confirmation.`;
            tags.push({ text: 'LIQUIDITY TRAP!', color: 'bg-bb-red/20 text-bb-red border-bb-red/30 animate-pulse' });
        } else {
            brief += `**Deploy Capital.** Institutional flow and market character are perfectly aligned for a high-probability Long entry.`;
            tags.push({ text: 'ALPHA SETUP', color: 'bg-bb-green/20 text-bb-green border-bb-green/30' });
        }
    } else if (action === 'SELL') {
        brief += `**Short Bias.** Combined indicators suggest institutional sell-side pressure is mounting. Risk management is advised.`;
        tags.push({ text: 'SHORT BIAS', color: 'bg-bb-red/20 text-bb-red border-bb-red/30' });
    } else {
        brief += `**Maintain Neutrality.** The system is scanning for a clearer institutional edge before recommending entry.`;
        tags.push({ text: 'NEUTRAL ZONE', color: 'bg-bb-muted/20 text-bb-muted border-bb-muted/30' });
    }

    // Extra badges
    if (Math.abs(netFlow) > 50000) tags.push({ text: 'WHALE CLUSTER', color: 'bg-bb-gold/40 text-white' });

    // Render brief with simple **bold** markers safely
    elNarrative.textContent = '';
    (function renderBold(el, text) {
        const parts = String(text || '').split(/\*\*/);
        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
                el.appendChild(document.createTextNode(parts[i]));
            } else {
                const b = document.createElement('b'); b.className = 'text-bb-gold'; b.textContent = parts[i]; el.appendChild(b);
            }
        }
    })(elNarrative, brief);

    // Render tags as safe elements
    elTags.innerHTML = '';
    tags.forEach(t => {
        const sp = document.createElement('span');
        sp.className = `text-[7px] px-1.5 py-0.5 border rounded font-black uppercase ${t.color}`;
        sp.textContent = t.text;
        elTags.appendChild(sp);
    });
}

function calculatePillars(data, signals, master, syn) {
    const flow = syn.flow || {};
    const of = data.analytics?.orderFlow || {};
    const lsr = data.raw?.LSR?.timeframes_15min?.longShortRatio || 1.0;
    const bidD = data.raw?.OB?.bidDepth || 0;
    const askD = data.raw?.OB?.askDepth || 1; // Prevent div by zero

    return {
        FLOW: flow.net_flow_15MENIT > 10000 ? 'BULL' : flow.net_flow_15MENIT < -10000 ? 'BEAR' : 'NEUT',
        SENTIMENT: lsr > 1.5 ? 'BEAR' : lsr < 0.7 ? 'BULL' : 'NEUT', // Contrarian
        LIQUIDITY: (bidD / askD) > 1.5 ? 'BULL' : (askD / (bidD || 1)) > 1.5 ? 'BEAR' : 'NEUT',
        TECHNICAL: master.action === 'BUY' ? 'BULL' : master.action === 'SELL' ? 'BEAR' : 'NEUT'
    };
}

function detectDivergence(pillars) {
    const values = Object.values(pillars).filter(v => v !== 'NEUT');
    if (values.length < 2) return false;
    return values.includes('BULL') && values.includes('BEAR');
}
