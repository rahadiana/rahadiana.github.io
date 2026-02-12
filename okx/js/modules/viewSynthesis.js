import * as Utils from '../utils.js';

let lastAssetData = null;

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col space-y-4 p-4 font-mono animate-in fade-in duration-300">
            <!-- HEADER -->
            <div class="flex justify-between items-end border-b border-bb-border pb-2">
                <div>
                    <h2 class="text-bb-gold font-black text-xl tracking-tighter uppercase line-clamp-1">INSTITUTIONAL SYNTHESIS HUB</h2>
                    <p class="text-bb-muted text-[10px] uppercase tracking-widest">Advanced Capital Flow & Market Friction Analysis</p>
                </div>
                <div class="text-right">
                    <div id="syn-last-update" class="text-[9px] text-bb-muted italic">Waiting for heartbeat...</div>
                </div>
            </div>

            <!-- GRID LAYOUT -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-auto scrollbar-thin">
                
                <!-- 1. NET CAPITAL FLOW -->
                <div class="bg-bb-dark border border-bb-border rounded p-4 flex flex-col">
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-bb-gold font-bold text-xs uppercase tracking-tight">🌊 Capital Flow</span>
                        <div id="flow-dominant-bias" class="text-[9px] px-2 py-0.5 rounded border">NEUTRAL</div>
                    </div>
                    <div class="flex-1 overflow-auto">
                        <table class="w-full text-[10px]">
                            <thead class="text-bb-muted border-b border-bb-border">
                                <tr>
                                    <th class="text-left pb-1 uppercase font-bold">TF</th>
                                    <th class="text-right pb-1 uppercase font-bold">Net Flow ($)</th>
                                    <th class="text-right pb-1 uppercase font-bold">Bias</th>
                                </tr>
                            </thead>
                            <tbody id="flow-table-body" class="divide-y divide-bb-border/10">
                                <!-- Injected -->
                            </tbody>
                        </table>
                    </div>
                    <div class="mt-4 pt-4 border-t border-bb-border/20 text-[9px] text-bb-muted">
                        <p>Aggregates Net Vol + Delta OI - Liquidations to determine true accumulation.</p>
                    </div>
                </div>

                <!-- 2. MARKET CHARACTER (EFFICIENCY) -->
                <div class="bg-bb-dark border border-bb-border rounded p-4 flex flex-col text-xs">
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-bb-gold font-bold text-xs uppercase tracking-tight">🛡️ Market Character</span>
                    </div>
                    <div id="character-container" class="space-y-3 flex-1 overflow-auto">
                        <!-- Injected cards -->
                    </div>
                    <div class="mt-4 pt-4 border-t border-bb-border/20 text-[9px] text-bb-muted italic">
                        <p>Absorption = High Vol, Low Move. Effortless = Low Vol, High Move.</p>
                    </div>
                </div>

                <!-- 3. AGGRESSION & VELOCITY -->
                <div class="bg-bb-dark border border-bb-border rounded p-4 flex flex-col">
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-bb-gold font-bold text-xs uppercase tracking-tight">⚡ Momentum Velocity</span>
                    </div>
                    <div class="space-y-4 flex-1">
                        <div id="velocity-metrics" class="space-y-4">
                            <!-- Injected gauges -->
                        </div>
                    </div>
                    <div class="mt-4 pt-4 border-t border-bb-border/20 text-[9px] text-bb-muted">
                        <p>Trade Size (Vol/Freq) measures whether moves are retail-led or institutional-aggressive.</p>
                    </div>
                </div>

            </div>
        </div>
    `;
}

export function update(assetData) {
    if (!assetData) return;
    lastAssetData = assetData;

    const syn = assetData.synthesis || {};
    const flow = syn.flow || {};
    const efficiency = syn.efficiency || {};
    const momentum = syn.momentum || {};

    // Update Last Update
    const updateEl = document.getElementById('syn-last-update');
    if (updateEl) updateEl.innerText = `LAST_SEQ: ${new Date().toLocaleTimeString()}`;

    // 1. FLOW TABLE
    const flowBody = document.getElementById('flow-table-body');
    if (flowBody) {
        const tfs = ['1MENIT', '5MENIT', '15MENIT', '1JAM', '24JAM'];
        flowBody.innerHTML = tfs.map(tf => {
            const valRaw = flow[`net_flow_${tf}`] ?? 0;
            const val = Number(valRaw) || 0;
            const bias = flow[`capital_bias_${tf}`] ?? 'NEUTRAL';
            const color = val > 0 ? 'text-bb-green' : val < 0 ? 'text-bb-red' : 'text-bb-muted';
            const biasColor = bias === 'ACCUMULATION' ? 'bg-bb-green/10 text-bb-green border-bb-green/20' : bias === 'DISTRIBUTION' ? 'bg-bb-red/10 text-bb-red border-bb-red/20' : 'bg-bb-panel border-bb-border text-bb-muted';

            return `
                <tr class="hover:bg-white/5">
                    <td class="py-2 text-white font-bold">${tf.replace('MENIT', 'M').replace('JAM', 'H').replace('HARI', 'D')}</td>
                    <td class="py-2 text-right font-mono ${color}">$${Utils.formatNumber(val, 0)}</td>
                    <td class="py-2 text-right">
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-black border ${biasColor}">${bias}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const flowBiasEl = document.getElementById('flow-dominant-bias');
    if (flowBiasEl) {
        const dominant = flow.dominantFlow ?? 'NEUTRAL';
        flowBiasEl.innerText = dominant;
        flowBiasEl.className = `text-[9px] px-2 py-0.5 rounded border ${dominant === 'BULLISH' ? 'bg-bb-green text-black border-bb-green' : dominant === 'BEARISH' ? 'bg-bb-red text-white border-bb-red/50' : 'bg-bb-panel text-white border-bb-border'}`;
    }

    // 2. CHARACTER CARDS
    const charContainer = document.getElementById('character-container');
    if (charContainer) {
        const tfs = ['1MENIT', '5MENIT', '15MENIT', '1JAM'];
        charContainer.innerHTML = tfs.map(tf => {
            const char = efficiency[`character_${tf}`] ?? 'NORMAL';
            const effRaw = efficiency[`efficiency_${tf}`] ?? 0;
            const fricRaw = efficiency[`friction_${tf}`] ?? 0;
            const eff = Number(effRaw) || 0;
            const fric = Number(fricRaw) || 0;

            let badgeClass = 'bg-bb-panel border-bb-border text-bb-muted';
            if (char === 'ABSORPTION') badgeClass = 'bg-bb-gold/10 border-bb-gold text-bb-gold animate-pulse';
            if (char === 'EFFORTLESS_MOVE') badgeClass = 'bg-bb-blue/10 border-bb-blue text-bb-blue font-bold';

            return `
                <div class="p-3 border border-bb-border/30 rounded bg-bb-black/40">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-bb-muted font-bold text-[10px]">${tf}</span>
                        <span class="text-[8px] px-2 py-0.5 rounded border uppercase font-black ${badgeClass}">${char}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-[9px]">
                        <div>
                            <div class="text-bb-muted mb-0.5 uppercase tracking-tighter">Efficiency</div>
                                <div class="text-white font-mono">${Utils.safeFixed(eff, 4)} <span class="text-[7px] text-bb-muted tracking-tighter">%/M</span></div>
                        </div>
                        <div class="text-right">
                            <div class="text-bb-muted mb-0.5 uppercase tracking-tighter">Friction</div>
                                <div class="text-white font-mono">${Utils.safeFixed(fric, 4)} <span class="text-[7px] text-bb-muted tracking-tighter">M/%</span></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 3. VELOCITY GAUGES
    const velContainer = document.getElementById('velocity-metrics');
    if (velContainer) {
        const tfs = ['1MENIT', '5MENIT', '15MENIT'];
        velContainer.innerHTML = tfs.map(tf => {
            const velRaw = momentum[`velocity_${tf}`] ?? 0;
            const level = momentum[`aggression_level_${tf}`] ?? 'RETAIL';
            const vel = Number(velRaw) || 0;

            let color = 'bg-bb-muted';
            let textColor = 'text-bb-muted';
            if (level === 'INSTITUTIONAL') { color = 'bg-bb-gold'; textColor = 'text-bb-gold'; }
            else if (level === 'ACTIVE') { color = 'bg-bb-blue'; textColor = 'text-bb-blue'; }

            // simple bar, guard division
            const barWidth = Math.min(100, vel > 0 ? ((vel / 2000) * 100) : 0);

            return `
                <div>
                    <div class="flex justify-between text-[10px] mb-1">
                        <span class="text-bb-muted font-bold uppercase">${tf} VELOCITY</span>
                        <span class="font-black italic ${textColor}">${level}</span>
                    </div>
                    <div class="h-1.5 bg-bb-border/20 rounded-full overflow-hidden">
                        <div class="h-full ${color} transition-all duration-700" style="width: ${barWidth}%"></div>
                    </div>
                    <div class="flex justify-between text-[8px] mt-1 text-bb-muted/50 font-mono italic">
                        <span>Avg Trade: $${Utils.formatNumber(vel, 2)}</span>
                        <span>MTF AGGRESSION</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}
