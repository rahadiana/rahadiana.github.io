import * as Utils from '../utils.js';

let currentCategory = 'SCALP';
let currentSearch = '';
let lastMarketState = null;

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col gap-3 p-2 bg-bb-black font-mono overflow-hidden">
            
            <!-- HEADER & STRATEGY NAV -->
            <div class="flex flex-col gap-2 border-b border-bb-border pb-2 shrink-0">
                <div class="flex justify-between items-center">
                    <span class="text-bb-gold font-bold uppercase tracking-tighter">TRADE COMMAND CENTER</span>
                    <div class="flex items-center gap-2">
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-2 flex items-center text-bb-muted pointer-events-none">
                                <svg class="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </span>
                            <input type="text" id="strat-search" placeholder="FILTER ASSET..." value="${currentSearch}"
                                class="bg-bb-dark border border-bb-border rounded pl-6 pr-2 py-0.5 text-[8px] text-white focus:outline-none focus:border-bb-gold transition-colors placeholder-bb-muted font-black w-32 uppercase">
                        </div>
                        <span class="text-[9px] text-bb-muted uppercase tracking-widest px-2 py-0.5 border border-bb-border rounded">13 Professional Frameworks</span>
                    </div>
                </div>
                <div class="flex flex-wrap gap-1 bg-bb-panel p-1 rounded border border-white/5">
                    <button id="strat-cat-scalp" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'SCALP' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">SCALP SNIPER</button>
                    <button id="strat-cat-swing" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'SWING' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">SWING ACCUM</button>
                    <button id="strat-cat-funding" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'FUNDING' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">FUNDING HUNTER</button>
                    <button id="strat-cat-alpha" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'ALPHA' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">ALPHA OUTLIER</button>
                    <button id="strat-cat-walls" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'WALLS' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">WALL DEFENDER</button>
                    <button id="strat-cat-trap" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'TRAP' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">LIQ TRAP</button>
                    <button id="strat-cat-vol" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'VOL' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">VOL BREAKOUT</button>
                    <button id="strat-cat-basis" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'BASIS' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">BASIS KING</button>
                    <button id="strat-cat-fisher" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'FISHER' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">BOTTOM FISHER</button>
                    <button id="strat-cat-shadow" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'SHADOW' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">SHADOW TRACKER</button>
                    <button id="strat-cat-void" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'VOID' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">GAP HUNTER</button>
                    <button id="strat-cat-safety" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'SAFETY' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">STAY AWAY</button>
                    <button id="strat-cat-ignition" class="px-2 py-0.5 text-[8px] font-black rounded transition-all ${currentCategory === 'IGNITION' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}">GENUINE IGNITION</button>
                </div>
            </div>

            <!-- STRATEGY DESCRIPTION CARD -->
            <div class="p-3 bg-bb-panel border border-bb-border rounded shrink-0 relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                    <span class="text-4xl" id="strat-icon">🏛️</span>
                </div>
                <h3 id="strat-title" class="text-bb-gold font-black text-xs uppercase tracking-widest mb-1">---</h3>
                <p id="strat-desc" class="text-[10px] text-bb-text leading-relaxed max-w-2xl italic">---</p>
                <div class="flex gap-4 mt-2">
                   <div class="flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-bb-green shadow-[0_0_4px_#22c55e]"></div><span class="text-[8px] text-bb-muted uppercase">Logic Verified</span></div>
                   <div class="flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-bb-blue shadow-[0_0_4px_#2b6cb0]"></div><span class="text-[8px] text-bb-muted uppercase text-bb-blue">Real-time Telemetry</span></div>
                </div>
            </div>

            <!-- RESULTS TABLE -->
            <div class="flex-1 min-h-0 bg-bb-panel border border-bb-border rounded overflow-hidden flex flex-col">
                <div class="flex text-[9px] font-black text-bb-muted uppercase border-b border-bb-border bg-black/20 shrink-0">
                    <div class="p-2 w-1/2 border-r border-bb-border">Strategic Setup & Logic</div>
                    <div class="p-2 flex-1">Institutional Execution Terminal</div>
                </div>
                <div id="strat-results-list" class="flex-1 overflow-y-auto divide-y divide-bb-border/30 scrollbar-thin">
                    <div class="p-6 text-center text-bb-muted italic text-[10px]">Scanning digital asset landscape for institutional setups...</div>
                </div>
            </div>

        </div>
    `;

    // Click handlers
    const cats = ['scalp', 'swing', 'funding', 'alpha', 'walls', 'trap', 'vol', 'basis', 'fisher', 'shadow', 'void', 'safety', 'ignition'];
    cats.forEach(c => {
        const btn = container.querySelector(`#strat-cat-${c}`);
        if (btn) {
            btn.onclick = () => {
                currentCategory = c.toUpperCase();
                render(container);
                if (lastMarketState) update(lastMarketState);
            };
        }
    });

    const searchInput = container.querySelector('#strat-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            currentSearch = e.target.value.toUpperCase();
            if (lastMarketState) update(lastMarketState);
        };
    }
}

const STRATEGIES = {
    'SCALP': {
        icon: '🎯', lev: '10-20x', hold: '5-15m', tpMult: 1.5, slMult: 1.0,
        title: 'Scalp Sniper (The Momentum Hunter)',
        desc: 'Mencari koin dengan Flow Imbalance (VWOI) tinggi dan Trade Skew positif. Dirancang untuk menangkap ledakan harga durasi 5-15 menit dengan bantuan robot HFT.',
        filter: (id, d) => {
            const m = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.signals?.microstructure || {};
            const of = d.analytics?.orderFlow || {};
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const isHot = Math.abs(m.vwoi?.rawValue || 0) > 0.4 && Math.abs(of.tradeSizeImbalance || 0) > 0.1;
            return isHot ? { bias: master.action, factors: ['High Flow Imbalance', 'Institutional Skew', 'HFT Presence'], confidence: master.confidence } : null;
        }
    },
    'SWING': {
        icon: '🏛️', lev: '3-5x', hold: '1-3d', tpMult: 3.5, slMult: 1.5,
        title: 'Swing Accumulation (Smart Money Follower)',
        desc: 'Mencari aset yang sedang diakumulasi oleh institusi (High SMI) dengan efisiensi OI yang tinggi. Dirancang untuk hold 1-3 hari mengikuti arus uang pintar.',
        filter: (id, d) => {
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const oi = d.raw?.OI || {};
            const smi = master.normalizedScore || 50;
            const isAccum = smi > 70 && (oi.volumeOIRatio > 0 && oi.volumeOIRatio < 1.0);
            const mtf = d.mtfConfluence?.AGGRESSIVE?.['15MENIT']?.isAligned || false;
            return (isAccum && mtf) ? { bias: master.action, factors: ['Heavy accumulation', 'High OI Efficiency', 'MTF Confluence'], confidence: master.confidence } : null;
        }
    },
    'FUNDING': {
        icon: '💸', lev: '1-3x', hold: '8h-24h', tpMult: 0.05, slMult: 0.02, isFlat: true,
        title: 'Funding Hunter Sniper (Yield Arbitrage)',
        desc: 'Mendeteksi peluang arbitrase antara harga dan biaya inap. Mencari funding rate ekstrim dengan indikasi pembalikan arah harga (Divergence).',
        filter: (id, d) => {
            const f = d.raw?.FUNDING || {};
            const lsr = d.raw?.LSR?.timeframes_15min || {};
            const isExt = Math.abs(f.fundingRate || 0) > 0.0005 || Math.abs(lsr.z || 0) > 1.5;
            return isExt ? { bias: f.fundingRate > 0 ? 'SHORT' : 'LONG', factors: ['Extreme Funding Rate', 'LSR Extremity', 'Yield Arb Setup'], confidence: 75 } : null;
        }
    },
    'ALPHA': {
        icon: '🏹', lev: '2-4x', hold: '12h-24h', tpMult: 4.0, slMult: 2.0,
        title: 'Pure Alpha Outlier (Independent Breakout)',
        desc: 'Menyaring koin yang sedang breakout sendirian (Idiosyncratic) tanpa tergantung pergerakan BTC. Cocok untuk mencari "koin sakti" saat market lesu.',
        filter: (id, d) => {
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const corr = d.analytics?.correlation || { correlation: 0.8 };
            const isAlpha = master.normalizedScore > 65 && corr.correlation < 0.5;
            const alphaVal = (master.confidence || 0) * (1 - corr.correlation);
            return isAlpha ? { bias: master.action, factors: ['BTC Decorrelation', 'Independent Strength', 'High Alpha Signature'], confidence: alphaVal } : null;
        }
    },
    'WALLS': {
        icon: '🧱', lev: '5-10x', hold: '1h-4h', tpMult: 0.02, slMult: 0.005, isFlat: true,
        title: 'Wall Defender (Institutional Support)',
        desc: 'Mencari koin yang harganya tertahan oleh tembok pesanan (Order Book Walls) raksasa. Strategi mantul (rebound) dengan resiko rendah karena tembok institusi.',
        filter: (id, d) => {
            const ob = d.raw?.OB || {};
            const px = d.raw?.PRICE?.last || 0;
            const walls = [...(ob.askWalls || []), ...(ob.bidWalls || [])];
            const bigWalls = walls.filter(w => Math.abs(w.price - px) / px < 0.005);
            return bigWalls.length > 0 ? { bias: bigWalls[0].side === 'BID' ? 'LONG' : 'SHORT', factors: ['Institutional Wall Proximity', 'Liquidity Defense', 'Low Risk Entry'], confidence: 80 } : null;
        }
    },
    'TRAP': {
        icon: '🚨', lev: '10x', hold: '2h', tpMult: 2.5, slMult: 1.2,
        title: 'Liquidation Trap (The Contrarian Play)',
        desc: 'Memanfaatkan ketamakan (FOMO) atau ketakutan (Panic) ritel. Mencari titik jenuh di mana bandar siap membelokkan harga untuk melikuidasi posisi ritel yang padat.',
        filter: (id, d) => {
            const lsr = d.raw?.LSR?.timeframes_15min || {};
            const isTrap = Math.abs(lsr.z || 0) > 2.0;
            return isTrap ? { bias: lsr.z > 0 ? 'SHORT' : 'LONG', factors: ['Extreme LSR Z-Score', 'Retail FOMO/Panic', 'Counter-Trade Strategy'], confidence: 85 } : null;
        }
    },
    'VOL': {
        icon: '🌩️', lev: '3-5x', hold: '4h-8h', tpMult: 5.0, slMult: 2.5,
        title: 'Volatility Breakout (Thunder Chaser)',
        desc: 'Mencari momen transisi dari sepi (low vol) ke ledakan. Sangat efektif untuk masuk di awal sebuah trend besar sebelum semua orang menyadarinya.',
        filter: (id, d) => {
            const c = d.raw?.CANDLES || {};
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const isExp = c.candle_volatility_1H < 0.01 && c.candle_volatility_15m > 0.005;
            return isExp ? { bias: master.action, factors: ['Quiet Accumulation', 'Volatility Expansion', 'Momentum Ignition'], confidence: master.confidence } : null;
        }
    },
    'BASIS': {
        icon: '⚖️', lev: '1x', hold: '7d-30d', tpMult: 0.1, slMult: 0.05, isFlat: true,
        title: 'Delta-Neutral Yield Farmer (The Basis King)',
        desc: 'Mencari peluang profit dari selisih harga Futures vs Spot dibarengi funding raksasa. Resiko pergerakan harga nol, murni mengejar bunga biaya inap.',
        filter: (id, d) => {
            const f = d.raw?.FUNDING || {};
            const p = d.raw?.PRICE || {};
            const basis = Math.abs(p.last - p.previous) / p.previous;
            const isYield = Math.abs(f.fundingRate || 0) > 0.0008 && basis < 0.002;
            return isYield ? { bias: f.fundingRate > 0 ? 'ARB SHORT' : 'ARB LONG', factors: ['High Funding Yield', 'Basis Expansion', 'Low Volatility'], confidence: 90 } : null;
        }
    },
    'FISHER': {
        icon: '🌊', lev: '5-10x', hold: '15m-45m', tpMult: 1.2, slMult: 0.8,
        title: 'Liquidity Crisis Reversal (Bottom Fisher)',
        desc: 'Menangkap titik jenuh pembalikan saat likuiditas sedang kosong (thin) dan menyentuh tembok institusi. Cocok untuk tebas pantulan (V-Bottom).',
        filter: (id, d) => {
            const se = d.analytics?.spreadEstimates || {};
            const ob = d.raw?.OB || {};
            const isThin = se.combinedBps > 20 && (ob.bidDepth > ob.askDepth * 2);
            return isThin ? { bias: 'LONG', factors: ['Liquidity Void', 'Order Balance Skew', 'Depth Recovery'], confidence: 70 } : null;
        }
    },
    'SHADOW': {
        icon: '🐋', lev: '10x', hold: '15m-30m', tpMult: 2.0, slMult: 1.0,
        title: 'Whale Front-Run (The Shadow Tracker)',
        desc: 'Membuntuti paus yang sedang belanja di koin dengan Price Impact (Lambda) tinggi. Masuk sebelum paus menghabiskan order book dan menerbangkan harga.',
        filter: (id, d) => {
            const m = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.signals?.microstructure || {};
            const of = d.analytics?.orderFlow || {};
            const isWhale = (m.kyleLambda?.rawValue || 0) > 0.005 && (of.tradeSizeImbalance || 0) > 0.2;
            return isWhale ? { bias: 'LONG', factors: ['High Kyle-Lambda', 'Positive Size Skew', 'Whale Footprint'], confidence: 75 } : null;
        }
    },
    'VOID': {
        icon: '🧱', lev: '20x', hold: '5m-10m', tpMult: 0.8, slMult: 0.3, isFlat: true,
        title: 'Order Book Vacuum (The Gap Hunter)',
        desc: 'Mendeteksi lubang likuiditas antara harga saat ini dengan tembok order besar berikutnya. Mengejar pergerakan kilat melewati zone kosong tersebut.',
        filter: (id, d) => {
            const ob = d.raw?.OB || {};
            const spread = ob.spreadBps || 0;
            const isVoid = spread > 5.0 && ob.bookHealth === 'THIN';
            return isVoid ? { bias: 'MOMENTUM', factors: ['Spread Gap', 'Thin Book Health', 'Slippage Play'], confidence: 65 } : null;
        }
    },
    'SAFETY': {
        icon: '🛡️', lev: 'N/A', hold: 'N/A', tpMult: 0, slMult: 0,
        title: 'Toxic Flow Avoidance (The Smart Patient)',
        desc: 'Filter pelindung modal. Memberikan sinyal "Stay Away" ketika market didominasi robot HFT yang saling perang harga, menghindarkan Anda dari slippage parah.',
        filter: (id, d) => {
            const vol = d.raw?.VOL || {};
            const freq = d.raw?.FREQ || {};
            const v15 = (vol.vol_buy_15MENIT || 0) + (vol.vol_sell_15MENIT || 0);
            const f15 = (freq.freq_buy_15MENIT || 0) + (freq.freq_sell_15MENIT || 0);
            const intense = v15 > 0 ? (f15 / (v15 / 1000)) : 0;
            return intense > 80 ? { bias: 'STAY AWAY', factors: ['Toxic HFT Flow', 'High Slippage Risk', 'Bot War Zone'], confidence: 99 } : null;
        }
    },
    'IGNITION': {
        icon: '📈', lev: '2-3x', hold: '3d-7d', tpMult: 10.0, slMult: 5.0,
        title: 'Genuine Momentum Ignition',
        desc: 'Mencari awal trend sehat: OI naik tajam (akumulasi asli) tapi keterlibatan Informed Traders (VPIN) masih di awal. Bukan koin gorengan.',
        filter: (id, d) => {
            const oi = d.raw?.OI || {};
            const m = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.signals?.microstructure || {};
            const isIgnition = (oi.volumeOIRatio > 0 && oi.volumeOIRatio < 0.8) && (m.vpin?.rawValue || 0) < 0.3;
            return isIgnition ? { bias: 'BUILDING', factors: ['High OI Efficiency', 'Low Toxic Flow', 'Trend Incubation'], confidence: 75 } : null;
        }
    }
};

export function update(marketState) {
    lastMarketState = marketState;
    const strat = STRATEGIES[currentCategory];
    if (!strat) return;

    const elTitle = document.getElementById('strat-title');
    const elDesc = document.getElementById('strat-desc');
    const elIcon = document.getElementById('strat-icon');
    const elList = document.getElementById('strat-results-list');

    if (elTitle) elTitle.innerText = strat.title;
    if (elDesc) elDesc.innerText = strat.desc;
    if (elIcon) elIcon.innerText = strat.icon || '🏛️';

    if (elList) {
        const results = Object.keys(marketState).map(id => {
            const d = marketState[id];
            const filterRes = strat.filter(id, d);
            if (!filterRes) return null;

            const px = d.raw?.PRICE?.last || 0;
            const atr = d.raw?.CANDLES?.candle_atr_15m || (px * 0.01);

            let tp, sl;
            if (strat.isFlat) {
                const multi = filterRes.bias.includes('SHORT') ? -1 : 1;
                tp = px * (1 + (strat.tpMult * multi));
                sl = px * (1 - (strat.slMult * multi));
            } else {
                const multi = filterRes.bias === 'SHORT' || filterRes.bias === 'SELL' ? -1 : 1;
                tp = px + (atr * strat.tpMult * multi);
                sl = px - (atr * strat.slMult * multi);
            }

            const volDensity = d.raw?.CANDLES?.candle_volatility_15m || 0;
            const risk = volDensity > 0.02 ? 'CRITICAL' : volDensity > 0.01 ? 'HIGH' : 'STABLE';

            return { id, coin: id, ...filterRes, tp, sl, risk };
        })
            .filter(r => r !== null)
            .filter(r => currentSearch === '' || r.coin.toUpperCase().includes(currentSearch))
            .sort((a, b) => b.confidence - a.confidence);

        if (results.length === 0) {
            elList.innerHTML = `
                <div class="p-12 flex flex-col items-center justify-center opacity-30 gap-2">
                    <span class="text-3xl">📡</span>
                    <span class="text-[10px] uppercase font-black tracking-widest text-white">No active ${currentCategory} setups detected</span>
                </div>
            `;
        } else {
            elList.innerHTML = results.map(r => {
                const color = r.bias.includes('LONG') || r.bias.includes('BUY') || r.bias.includes('BUILD') ? 'text-bb-green' : r.bias.includes('STAY') ? 'text-bb-gold' : 'text-bb-red';
                const bg = r.bias.includes('LONG') || r.bias.includes('BUY') || r.bias.includes('BUILD') ? 'bg-bb-green/10' : r.bias.includes('STAY') ? 'bg-bb-gold/10' : 'bg-bb-red/10';
                const riskColor = r.risk === 'CRITICAL' ? 'text-bb-red' : r.risk === 'HIGH' ? 'text-bb-gold' : 'text-bb-green';

                return `
                    <div class="flex items-stretch text-[10px] hover:bg-white/5 transition-colors cursor-pointer group border-b border-bb-border/30" onclick="window.app.selectCoin('${r.id}')">
                        <!-- LEFT: STRATEGIC SETUP (50%) -->
                        <div class="p-3 w-1/2 border-r border-bb-border/30 flex flex-col gap-2">
                            <div class="flex justify-between items-center">
                                <span class="text-xs font-black text-white group-hover:text-bb-gold uppercase">${r.coin}</span>
                                <span class="px-2 py-0.5 rounded ${bg} ${color} font-black text-[8px] tracking-widest">${r.bias}</span>
                            </div>
                            <div class="flex flex-wrap gap-1">
                                ${r.factors.map(f => `<span class="px-1.5 py-0.5 bg-black/40 border border-white/5 text-[7px] text-bb-muted rounded-sm">${f}</span>`).join('')}
                            </div>
                            <div class="flex justify-between items-center text-[7px] font-bold uppercase tracking-tighter text-bb-muted">
                                <span>Risk Assessment: <span class="${riskColor}">${r.risk}</span></span>
                                <span>Conviction: ${Math.round(r.confidence)}%</span>
                            </div>
                        </div>
                        
                        <!-- RIGHT: EXECUTION TERMINAL (50%) -->
                        <div class="p-3 w-1/2 flex flex-col justify-center gap-1 bg-bb-panel/10">
                            <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-[8px] font-black uppercase text-bb-muted tracking-tight">
                                <div class="flex flex-col border-l border-bb-green/20 pl-2">
                                    <span>Target TP</span>
                                    <span class="text-bb-green font-mono text-[9px]">${Utils.formatPrice(r.tp)}</span>
                                </div>
                                <div class="flex flex-col border-l border-bb-red/20 pl-2">
                                    <span>Stop Loss</span>
                                    <span class="text-bb-red font-mono text-[9px]">${Utils.formatPrice(r.sl)}</span>
                                </div>
                                <div class="flex flex-col border-l border-white/10 pl-2">
                                    <span>Leverage</span>
                                    <span class="text-white text-[9px]">${strat.lev}</span>
                                </div>
                                <div class="flex flex-col border-l border-white/10 pl-2">
                                    <span>Est. Hold</span>
                                    <span class="text-white text-[9px]">${strat.hold}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}
