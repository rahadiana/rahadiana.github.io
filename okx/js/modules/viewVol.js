import * as Utils from '../utils.js';
import { calculateVolumePace, calculateDurability } from '../data_helpers.js';

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col gap-3 p-2 bg-bb-black text-bb-text font-mono">
            
            <!-- HEADER / TITLE -->
            <div class="flex justify-between items-center border-b border-bb-border pb-2">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-bold">VOLUME DURABILITY</span>
                    <span class="text-[9px] text-bb-muted uppercase tracking-widest px-2 py-0.5 border border-bb-border rounded">Institutional Grade</span>
                </div>
            </div>

            <!-- SUMMARY PANEL -->
            <div class="grid grid-cols-4 gap-2 bg-bb-panel p-3 border border-bb-border shadow-sm rounded-sm shrink-0" id="vol-summary-panel">
                <div class="flex flex-col">
                    <span class="text-[9px] text-bb-muted uppercase">Volume Durability</span>
                    <span class="text-xs font-bold" id="summ-durability">---</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[9px] text-bb-muted uppercase">State</span>
                    <span class="text-xs font-bold" id="summ-state">---</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[9px] text-bb-muted uppercase">Dominant TF</span>
                    <span class="text-xs font-bold" id="summ-dominant">---</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[9px] text-bb-muted uppercase">Action</span>
                    <span class="text-xs font-bold" id="summ-action">---</span>
                </div>
            </div>

            <!-- MAIN BARS AREA -->
            <div class="flex-1 overflow-y-auto scrollbar-thin space-y-4 pr-1" id="vol-bars-container">
                <!-- TF Bars injected here -->
            </div>

            <!-- FOOTER LEGEND -->
            <div class="flex justify-between items-center text-[9px] text-bb-muted border-t border-bb-border pt-2">
                <div class="flex gap-4">
                    <span class="flex items-center gap-1"><span class="w-2 h-2 bg-bb-green rounded-sm"></span> Institutional</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 bg-bb-blue rounded-sm"></span> Durable</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 bg-bb-gold rounded-sm"></span> Weak</span>
                </div>
                <div class="italic">Absorption = Solid Border | Impulsive = Dashed Border</div>
            </div>

        </div>
    `;
}

export function update(data, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    const volData = data.raw?.VOL || {};
    const priceData = data.raw?.PRICE || {};
    if (Object.keys(volData).length === 0) return;

    const tfs = [
        { label: '1M', key: '1MENIT', minutes: 1 },
        { label: '5M', key: '5MENIT', minutes: 5 },
        { label: '10M', key: '10MENIT', minutes: 10 },
        { label: '15M', key: '15MENIT', minutes: 15 },
        { label: '20M', key: '20MENIT', minutes: 20 },
        { label: '30M', key: '30MENIT', minutes: 30 },
        { label: '1H', key: '1JAM', minutes: 60 },
        { label: '2H', key: '2JAM', minutes: 120 },
        { label: '1D', key: '24JAM', minutes: 1440 }
    ];

    const avgVal = data.raw?.AVG || {};
    const v1hTotal = (volData.vol_BUY_1JAM || 0) + (volData.vol_SELL_1JAM || 0);
    const pace1hPerMin = v1hTotal / 60;

    const processedData = tfs.map(tf => {
        const pace = calculateVolumePace(volData, avgVal, tf.key, tf.minutes);
        const buy = pace.buy;
        const sell = pace.sell;
        const total = pace.total;
        const buyPct = total > 0 ? (buy / total) * 100 : 50;
        const pChg = priceData[`percent_change_${tf.key}`] || 0;

        const rawDur = pace1hPerMin > 0 ? (pace.currentPace / pace1hPerMin) : 0.5;
        const normalizedScore = calculateDurability(pace.currentPace, pace1hPerMin);

        // State Logic
        const isImpulsive = Math.abs(pChg) > 0.3; // Threshold for impulsive move
        const state = isImpulsive ? 'IMPULSIVE' : 'ABSORPTION';

        return {
            ...tf,
            score: normalizedScore,
            rawScore: rawDur,
            avgSpike: pace.spike,
            buyPct,
            pChg,
            state,
            total
        };
    });

    updateBarsUI(processedData);
    updateSummaryUI(processedData);
}

function getColor(score) {
    if (score < 0.20) return 'bg-bb-muted';
    if (score < 0.40) return 'bg-bb-gold';
    if (score < 0.65) return 'bg-bb-blue';
    return 'bg-bb-green';
}

function getLabel(score) {
    if (score < 0.20) return 'NOISE';
    if (score < 0.40) return 'WEAK';
    if (score < 0.65) return 'DURABLE';
    return 'INSTITUTIONAL';
}

function updateBarsUI(tfs) {
    const container = document.getElementById('vol-bars-container');
    if (!container) return;

    container.innerHTML = tfs.map((tf, idx) => {
        const color = getColor(tf.score);
        const borderStyle = tf.state === 'IMPULSIVE' ? 'border-dashed' : 'border-solid';
        const direction = tf.buyPct > 51 ? '🟢 BUY' : tf.buyPct < 49 ? '🔴 SELL' : '⚪ NEUTRAL';
        const dirColor = tf.buyPct > 51 ? 'text-bb-green' : tf.buyPct < 49 ? 'text-bb-red' : 'text-bb-muted';

        const barWidth = Math.round(tf.score * 10); // 0-10 segments
        let barHtml = '';
        for (let i = 0; i < 10; i++) {
            const active = i < barWidth;
            barHtml += `<span class="w-2.5 h-4 ${active ? color : 'bg-bb-dark/50'} rounded-xxs transition-all duration-500"></span>`;
        }

        // Flipped positioning for top items to avoid clipping by summary panel
        const tooltipPos = idx < 2 ? 'top-full mt-1' : 'bottom-full mb-1';

        return `
            <div class="group relative">
                <div class="flex items-center gap-4 p-2 bg-bb-panel/50 border-2 ${borderStyle} border-bb-border rounded transition-colors hover:bg-bb-panel cursor-help">
                    <!-- Label -->
                    <div class="w-16 text-[10px] font-bold text-bb-muted">${tf.label}</div>
                    
                    <!-- Visual Blocks -->
                    <div class="flex-1 flex gap-0.5 items-center">
                        ${barHtml}
                    </div>

                    <!-- Score Numeric -->
                    <div class="w-10 text-[10px] font-mono text-center">${Utils.safeFixed(tf.rawScore, 2)}</div>

                    <!-- Status Label -->
                    <div class="w-24 text-[10px] font-bold px-2 py-0.5 rounded-sm bg-white/5 text-center">${getLabel(tf.score)}</div>
 
                    <!-- Direction Badge -->
                    <div class="w-20 text-[10px] font-bold ${dirColor} text-right">${direction}</div>
                </div>
 
                <!-- ULTIMATE TOOLTIP (Centered Overlay Path) -->
                <div class="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden group-hover:block z-[9999] pointer-events-none whitespace-nowrap">
                    <div class="bg-bb-dark border-2 border-bb-gold p-4 rounded-md shadow-[0_0_50px_rgba(0,0,0,0.9)] text-[11px] min-w-[220px] backdrop-blur-xl ring-2 ring-black/50">
                        <div class="text-bb-gold border-b border-bb-gold/20 pb-2 mb-3 font-black tracking-widest text-center uppercase">DURABILITY INTEL: ${tf.label}</div>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center px-1">
                                <span class="text-bb-muted">BUY VOL</span>
                                <span class="text-bb-green font-bold font-mono">$${Utils.formatNumber(tf.total * tf.buyPct / 100, 0)}</span>
                            </div>
                            <div class="flex justify-between items-center px-1">
                                <span class="text-bb-muted">SELL VOL</span>
                                <span class="text-bb-red font-bold font-mono">$${Utils.formatNumber(tf.total * (1 - tf.buyPct / 100), 0)}</span>
                            </div>
                            <div class="h-px bg-bb-border/30 my-2"></div>
                            <div class="flex justify-between items-center px-1">
                                <span>PRICE DELTA</span>
                                <span class="${tf.pChg >= 0 ? 'text-bb-green' : 'text-bb-red'} font-bold">${tf.pChg > 0 ? '+' : ''}${Utils.safeFixed(tf.pChg, 2)}%</span>
                            </div>
                            <div class="flex justify-between items-center px-1">
                                <span>FLOW MODEL</span>
                                <span class="text-bb-gold font-black italic tracking-tighter">${tf.state}</span>
                            </div>
                            <div class="bg-bb-gold/10 p-2 mt-2 rounded border border-bb-gold/20">
                                <div class="flex flex-col gap-1">
                                    <div class="flex justify-between items-center text-white font-black">
                                        <span class="text-[9px] text-bb-gold/80 uppercase">1H Pace Score</span>
                                        <span class="text-lg">${Utils.safeFixed(tf.score * 100, 0)}%</span>
                                    </div>
                                    <div class="flex justify-between items-center text-white font-black border-t border-bb-gold/10 pt-1">
                                        <span class="text-[9px] text-bb-gold/80 uppercase">Hist AVG Spike</span>
                                        <span class="text-xs text-bb-gold">${Utils.safeFixed(tf.avgSpike, 2)}x</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateSummaryUI(tfs) {
    const topTf = tfs.reduce((prev, current) => (prev.score > current.score) ? prev : current);

    const elDur = document.getElementById('summ-durability');
    const elState = document.getElementById('summ-state');
    const elDom = document.getElementById('summ-dominant');
    const elAction = document.getElementById('summ-action');

    if (elDur) {
        elDur.innerText = getLabel(topTf.score);
        elDur.className = `text-xs font-bold ${topTf.score > 0.65 ? 'text-bb-green' : 'text-bb-gold'}`;
    }
    if (elState) {
        elState.innerText = topTf.state;
        elState.className = `text-xs font-bold ${topTf.state === 'IMPULSIVE' ? 'text-bb-blue' : 'text-bb-gold'}`;
    }
    if (elDom) elDom.innerText = topTf.label;

    if (elAction) {
        // ACTION RULE: 
        // 1. High Durability + Impulsive (Breakout) = ENTER
        // 2. High Durability + Absorption = WAIT
        const isHigh = topTf.score > 0.5;
        const action = (isHigh && topTf.state === 'IMPULSIVE') ? 'ENTER' : (isHigh ? 'WAIT' : 'OBSERVE');
        elAction.innerText = action;
        elAction.className = `text-xs font-bold ${action === 'ENTER' ? 'text-bb-green' : 'text-bb-muted'}`;
    }
}
