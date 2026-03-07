import * as Utils from '../utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col gap-3 p-2 bg-bb-black font-mono animate-in fade-in duration-300">
            <!-- HEADER -->
            <div class="flex justify-between items-end border-b border-bb-border pb-2 px-2">
                <div>
                    <h2 class="text-bb-gold font-black text-xl tracking-tighter uppercase line-clamp-1">MICROSTRUCTURE HUB</h2>
                    <p class="text-bb-muted text-[10px] uppercase tracking-widest">Composite Order Book & Trade Flow Analysis</p>
                </div>
                <div class="text-right flex flex-col items-end">
                    <span id="cis-score" class="text-2xl font-black text-white leading-none">--</span>
                    <span class="text-[8px] px-1 bg-bb-gold/20 text-bb-gold border border-bb-gold/30 rounded uppercase mt-0.5">CIS INDEX</span>
                </div>
            </div>

            <!-- DYNAMIC GRID -->
            <div class="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto scrollbar-thin p-1 content-start" id="micro-grid">
                <!-- Cards injected by JS -->
                <div class="col-span-full text-center text-bb-muted text-[10px] italic py-10">Monitoring microstructure feeds...</div>
            </div>
        </div>
    `;
}

export function update(data, profile = 'INSTITUTIONAL_BASE', timeframe = '15MENIT') {
    const gridEl = document.getElementById('micro-grid');
    const cisEl = document.getElementById('cis-score');
    if (!gridEl) return;

    // The data is now fully constructed in computeData() into normalized.micro.microstructure or normalized.signals.micro
    const microRoot = data.microstructure?.[profile] || {};
    const tfMicro = data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.signals?.microstructure || {};
    const micro = Object.assign({}, microRoot, tfMicro, data.signals?.micro || {});

    // Update Header CIS Index
    const cisVal = micro.cis?.cis ?? micro.cis?.rawValue ?? '--';
    if (cisEl) {
        cisEl.innerText = typeof cisVal === 'number' ? Utils.safeFixed(cisVal, 1) : cisVal;
        cisEl.className = `text-2xl font-black leading-none ${cisVal > 60 ? 'text-bb-green' : cisVal < 40 ? 'text-bb-red' : 'text-white'}`;
    }

    // Helper to render metric cards gracefully
    const renderCard = (title, mainVal, colorClass, barVal, subtext1, subtext2) => `
        <div class="panel flex flex-col border border-bb-border/50 hover:border-bb-gold/30 transition-all duration-300 bg-bb-dark/60 h-24">
            <div class="panel-header px-2 py-1 flex justify-between tracking-tighter bg-black/20 border-b border-white/5">
                <span class="text-bb-gold font-bold">${title}</span>
            </div>
            <div class="flex-1 flex flex-col justify-center px-3 py-1 gap-1 relative overflow-hidden">
                <div class="flex justify-between items-end z-10">
                    <span class="text-2xl font-black font-mono leading-none tracking-tighter ${colorClass}">${mainVal}</span>
                    <span class="text-[8px] text-bb-muted uppercase text-right leading-tight max-w-[60%] line-clamp-2">${subtext1}</span>
                </div>
                ${barVal !== null ? `
                <div class="w-full h-1 bg-bb-black rounded-full overflow-hidden mt-1 border border-white/5 z-10">
                    <div class="h-full bg-bb-gold/50" style="width: ${Math.max(0, Math.min(100, barVal))}%"></div>
                </div>
                ` : ''}
                <div class="text-[8px] text-bb-muted/70 flex justify-between mt-1 uppercase font-bold z-10">
                    <span>${subtext2}</span>
                </div>
                <!-- Background subtle glow -->
                <div class="absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-xl opacity-10 bg-current ${colorClass.split(' ')[0]} z-0 pointer-events-none"></div>
            </div>
        </div>
    `;

    // Process all 13 micro metrics
    const cards = [];

    // 1. SIGNAL COHESION
    const coh = micro.cohesion || { cohesion: 0, level: '--' };
    const cohVal = coh.cohesion || 0;
    const cohColor = cohVal > 60 ? 'text-bb-green' : cohVal < 40 ? 'text-bb-red' : 'text-bb-muted';
    cards.push(renderCard('COHESION', Utils.safeFixed(cohVal, 0) + '%', cohColor, cohVal, coh.level || 'NEUTRAL', 'Signal Unison'));

    // 2. ACCUMULATED VOLUME (CVD)
    const accVol = micro.accVol || { rawValue: 0, divergence: 'NONE' };
    const accVal = Utils.formatNumber(accVol.rawValue || 0);
    const accColor = (accVol.rawValue || 0) > 0 ? 'text-bb-green' : 'text-bb-red';
    cards.push(renderCard('CUM. VOL DELTA', accVal, accColor, null, accVol.divergence?.replace('_DIVERGENCE', '') || 'Aligned', 'Running CVD'));

    // 3. FUNDING BASIS INDEX (FBI)
    const fbi = micro.fbi || { fbi: 0, direction: '--' };
    const fbiColor = fbi.fbi > 70 ? 'text-bb-red animate-pulse' : fbi.fbi < 30 ? 'text-bb-green' : 'text-bb-gold'; // Contrarian
    cards.push(renderCard('FBI', Utils.safeFixed(fbi.fbi, 1), fbiColor, fbi.fbi, fbi.direction, 'Funding Basis'));

    // 4. ORDER FLOW STRENGTH (OFSI)
    const ofsi = micro.ofsi || { ofsi: 0 };
    const ofsiVal = ofsi.ofsi || 0;
    const ofsiColor = ofsiVal > 60 ? 'text-bb-green' : ofsiVal < 40 ? 'text-bb-red' : 'text-bb-muted';
    cards.push(renderCard('OFSI', Utils.safeFixed(ofsiVal, 1), ofsiColor, ofsiVal, '', 'Flow Strength'));

    // 5. FUNDING SENTIMENT (FSI)
    const fsi = micro.fsi || { fsi: 0, sentiment: '--' };
    const fsiVal = fsi.fsi || 0;
    const fsiColor = fsiVal > 70 ? 'text-bb-red' : fsiVal < 30 ? 'text-bb-green' : 'text-bb-muted'; // Contrarian lean
    cards.push(renderCard('FSI', Utils.safeFixed(fsiVal, 1), fsiColor, fsiVal, fsi.sentiment, 'Funding Sent.'));

    // 6. Z-SCORE PRESSURE (zPress)
    const zPress = micro.zPress || { zPress: 0, active: false };
    const zpVal = zPress.zPress || 0;
    const zpColor = Math.abs(zpVal) > 2 ? 'text-bb-red font-black' : Math.abs(zpVal) > 1 ? 'text-bb-gold' : 'text-bb-muted';
    // scale -3 to 3 to 0-100
    const zpBar = 50 + (zpVal / 3) * 50;
    cards.push(renderCard('Z-PRESSURE', Utils.safeFixed(zpVal, 2), zpColor, zpBar, zPress.active ? 'SQUEEZE' : 'NORMAL', 'Rel to ATR'));

    // 7. TRADE IMBALANCE (TIM)
    const tim = micro.tim || { tim: 0, type: '--' };
    const timVal = tim.tim || 0;
    const timColor = timVal > 50 ? 'text-bb-green' : timVal < -50 ? 'text-bb-red' : 'text-bb-gold';
    const timBar = 50 + (timVal / 2); // scale -100 to 100 to 0-100
    cards.push(renderCard('TIM', Utils.safeFixed(timVal, 0), timColor, timBar, tim.type, 'Trade Imbalance'));

    // 8. RANGE COMPRESSION
    const range = micro.rangeComp || { compression: 0, isSqueezing: false };
    const rcVal = range.compression || 0;
    const rcColor = range.isSqueezing ? 'text-bb-gold animate-pulse' : 'text-bb-muted';
    cards.push(renderCard('RANGE COMP', Utils.safeFixed(rcVal, 0) + '%', rcColor, rcVal, range.isSqueezing ? 'SQUEEZE' : 'EXPANDING', 'Volatility Squeeze'));

    // 9. PRICE-FUNDING CORRELATION (PFCI)
    const pfci = micro.pfci || { pfci: 0 };
    const pfcVal = pfci.pfci || 0;
    const pfcColor = pfcVal > 0.5 ? 'text-bb-green' : pfcVal < -0.5 ? 'text-bb-red' : 'text-bb-muted';
    cards.push(renderCard('PFCI', Utils.safeFixed(pfcVal, 2), pfcColor, 50 + (pfcVal * 50), '', 'Correlation'));

    // 10. LIQUIDITY STRESS (LSI)
    const lsi = micro.lsi || { lsi: 0, stress: '--' };
    const lsiVal = lsi.lsi || 0;
    const lsiColor = lsiVal > 70 ? 'text-bb-red animate-pulse' : lsiVal < 30 ? 'text-bb-green' : 'text-bb-gold';
    cards.push(renderCard('LSI', Utils.safeFixed(lsiVal, 1), lsiColor, lsiVal, lsi.stress, 'Liquidity Stress'));

    // 11. VPIN (Legacy but part of micro)
    const vpin = micro.vpin || { rawValue: 0, metadata: {} };
    const vpVal = vpin.rawValue || 0;
    const vpColor = vpVal > 0.7 ? 'text-bb-red' : 'text-bb-blue';
    cards.push(renderCard('VPIN', Utils.safeFixed(vpVal, 2), vpColor, vpVal * 100, vpin.metadata?.informedTrading || '', 'Toxicity'));

    // 12. CVD DIVERGENCE (Explicit output)
    const cvdDiv = micro.cvdDivergence || { cvdSignal: 'NONE', divergenceStrength: 'NONE' };
    const dirTxt = cvdDiv.cvdSignal?.split('_')[0] || 'NONE';
    const divColor = dirTxt === 'BULLISH' ? 'text-bb-green' : dirTxt === 'BEARISH' ? 'text-bb-red' : 'text-bb-muted';
    cards.push(renderCard('CVD DIVERGE', dirTxt, divColor, null, cvdDiv.divergenceStrength, 'Signal Match'));

    // 13. VOLUME PROFILE (NEW)
    const vprof = micro.volumeProfile || { signal: 'NEUTRAL', value: 0 };
    const vpSignal = vprof.signal || 'NEUTRAL';
    const vpSigColor = vpSignal === 'DISCOUNT' || vpSignal === 'UNDERVALUED' ? 'text-bb-green' : vpSignal === 'PREMIUM' || vpSignal === 'OVERVALUED' ? 'text-bb-red' : 'text-bb-gold';
    cards.push(renderCard('VOL PROFILE', vpSignal, vpSigColor, null, vprof.metadata?.positionStr || '', 'Value Area'));

    // 14. KYLE LAMBDA (NEW)
    const kyle = micro.kyleLambda || { rawValue: 0, direction: 'NEUTRAL' };
    const klVal = kyle.rawValue || 0;
    const klColor = klVal > 0.1 ? 'text-bb-gold' : 'text-bb-muted';
    cards.push(renderCard('KYLE LAMBDA', Utils.safeFixed(klVal, 3), klColor, Math.min(100, klVal * 100), kyle.direction, 'Price Impact'));

    gridEl.innerHTML = cards.join('');
}
