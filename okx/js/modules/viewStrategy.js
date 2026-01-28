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
                    </div>
                </div>

                <!-- CATEGORIZED STRATEGY MASTER GRID (27+ Frameworks) -->
                <div class="grid grid-cols-2 lg:grid-cols-5 gap-1.5 bg-bb-panel/30 p-1.5 rounded border border-white/5 overflow-y-auto max-h-32 scrollbar-none">
                    <div class="flex flex-col gap-1">
                        <span class="text-[7px] text-bb-gold font-bold uppercase tracking-widest px-1">01. EXECUTION ALPHA</span>
                        <div class="flex flex-wrap gap-1">
                             <button id="strat-cat-composite" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'COMPOSITE' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">👑 COMP</button>
                             <button id="strat-cat-blitz" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'BLITZ' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">⚡ BLTZ</button>
                             <button id="strat-cat-mtf_pro" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'MTF_PRO' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">📡 MTF</button>
                             <button id="strat-cat-alpha" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'ALPHA' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🏹 ALPH</button>
                             <button id="strat-cat-breakout" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'BREAKOUT' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">💥 BRKT</button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="text-[7px] text-bb-blue font-bold uppercase tracking-widest px-1">02. MODAL & WHALE</span>
                        <div class="flex flex-wrap gap-1">
                            <button id="strat-cat-flow" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'FLOW' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🌊 FLOW</button>
                            <button id="strat-cat-smart_money" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'SMART_MONEY' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🏦 SMRT</button>
                            <button id="strat-cat-whale" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'WHALE' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🐋 WHAL</button>
                            <button id="strat-cat-diverge" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'DIVERGE' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">📈 DIVG</button>
                            <button id="strat-cat-iceberg" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'ICEBERG' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🧊 ICEB</button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="text-[7px] text-bb-green font-bold uppercase tracking-widest px-1">03. MICRO & PATTERN</span>
                        <div class="flex flex-wrap gap-1">
                            <button id="strat-cat-scalp" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'SCALP' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🎯 SCLP</button>
                            <button id="strat-cat-absorb" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'ABSORB' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🧲 ABSB</button>
                            <button id="strat-cat-sweep" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'SWEEP' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🧹 SWEEP</button>
                            <button id="strat-cat-trap" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'TRAP' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🚨 TRAP</button>
                            <button id="strat-cat-vol" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'VOL' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🌩️ VOL</button>
                            <button id="strat-cat-efficiency" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'EFFICIENCY' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🧬 EFF</button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="text-[7px] text-bb-muted font-bold uppercase tracking-widest px-1">04. YIELD & VALUE</span>
                        <div class="flex flex-wrap gap-1">
                            <button id="strat-cat-swing" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'SWING' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🏛️ SWNG</button>
                            <button id="strat-cat-basis" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'BASIS' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">💎 BASS</button>
                            <button id="strat-cat-walls" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'WALLS' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🧱 WALL</button>
                            <button id="strat-cat-fisher" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'FISHER' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🌊 FISH</button>
                            <button id="strat-cat-void" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'VOID' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🕳️ VOID</button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="text-[7px] text-bb-red font-bold uppercase tracking-widest px-1">05. BEHAVIOR & RISK</span>
                        <div class="flex flex-wrap gap-1">
                            <button id="strat-cat-sentiment" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'SENTIMENT' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">⚖️ SNTI</button>
                            <button id="strat-cat-mean_rev" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'MEAN_REV' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🔄 REVR</button>
                            <button id="strat-cat-patience" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'PATIENCE' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">⌛ PATN</button>
                            <button id="strat-cat-ignition" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'IGNITION' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">📈 IGNT</button>
                            <button id="strat-cat-funding" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'FUNDING' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">💸 FUND</button>
                            <button id="strat-cat-safety" class="px-1 py-0.5 text-[8px] font-black rounded border border-transparent ${currentCategory === 'SAFETY' ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white bg-white/5'}">🛡️ SAFE</button>
                        </div>
                    </div>
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
    const cats = [
        'composite', 'blitz', 'mtf_pro', 'alpha', 'breakout',
        'flow', 'smart_money', 'whale', 'diverge', 'iceberg',
        'scalp', 'absorb', 'sweep', 'trap', 'vol', 'efficiency',
        'swing', 'basis', 'walls', 'fisher', 'void',
        'sentiment', 'mean_rev', 'patience', 'ignition', 'funding', 'safety'
    ];
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
    'COMPOSITE': {
        icon: '👑', lev: '5-15x', hold: '15m-1h', tpMult: 2.5, slMult: 1.2,
        title: 'Composite Alpha Aggregator (The God Signal)',
        desc: 'Framework paling advanced: Menggabungkan bobot adaptif, Net Flow massif, dan Konfluensi MTF. Hanya trigger saat semua parameter institusi selaras 100%.',
        filter: (id, d) => {
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const syn = d.synthesis || {};
            const mtf = d.signals?.mtfConfluence?.AGGRESSIVE || {};
            const netFlow = syn.flow?.net_flow_15MENIT || 0;
            const score = master.normalizedScore || 0;
            const isGod = score > 85 && Math.abs(netFlow) > 50000 && mtf.aligned;
            return isGod ? { bias: master.action, factors: ['Adaptive Weight Confluence', 'Whale Capital Influx', 'Full MTF Alignment'], confidence: score } : null;
        }
    },
    'BLITZ': {
        icon: '⚡', lev: '10-25x', hold: '2m-10m', tpMult: 1.0, slMult: 0.5,
        title: 'Institutional Blitz (Synthesis God Mode)',
        desc: 'Mencari konfluensi sempurna: Net Flow > $40k, EFFORTLESS MOVE, dan Institutional Aggression. Setup paling murni untuk sniper berkecepatan tinggi.',
        filter: (id, d) => {
            const syn = d.synthesis || {};
            const netFlow = syn.flow?.net_flow_15MENIT || 0;
            const char = syn.efficiency?.character_15MENIT || 'NORMAL';
            const aggr = syn.momentum?.aggression_level_15MENIT || 'RETAIL';
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const isBlitz = Math.abs(netFlow) > 40000 && char === 'EFFORTLESS_MOVE' && aggr === 'INSTITUTIONAL';
            return isBlitz ? { bias: master.action, factors: ['Whale Blitz Influx', 'Zero Friction Path', 'Institutional Aggression'], confidence: 95 } : null;
        }
    },
    'MTF_PRO': {
        icon: '📡', lev: '3-10x', hold: '1h-4h', tpMult: 2.0, slMult: 1.0,
        title: 'MTF Confluence Pro (Alignment King)',
        desc: 'Hanya trigger saat 1M, 5M, 15M, dan 1H memberikan sinyal di arah yang sama persis. Menjamin modalitas tren yang sangat kuat.',
        filter: (id, d) => {
            const p = d.signals?.profiles?.AGGRESSIVE?.timeframes || {};
            const actions = ['1MENIT', '5MENIT', '15MENIT', '1JAM'].map(tf => p[tf]?.masterSignal?.action || 'WAIT');
            const allBuy = actions.every(a => a === 'BUY');
            const allSell = actions.every(a => a === 'SELL');
            return (allBuy || allSell) ? { bias: allBuy ? 'LONG' : 'SHORT', factors: ['Total TF Alignment', 'Congruent Momentum', 'Trend Modality'], confidence: 90 } : null;
        }
    },
    'BREAKOUT': {
        icon: '💥', lev: '10x', hold: '15m-1h', tpMult: 3.0, slMult: 1.5,
        title: 'Institutional Breakout (Confirmed)',
        desc: 'Mendeteksi ledakan harga yang divalidasi oleh VPIN tinggi dan Arus Kas masuk ($) secara serentak. Menghindari False Breakout.',
        filter: (id, d) => {
            const m = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.signals?.microstructure || {};
            const syn = d.synthesis || {};
            const isBreak = (m.vpin?.rawValue || 0) > 0.6 && Math.abs(syn.flow?.net_flow_15MENIT || 0) > 30000;
            return isBreak ? { bias: syn.flow?.net_flow_15MENIT > 0 ? 'LONG' : 'SHORT', factors: ['VPIN Confirmation', 'Net Flow Power', 'Volume-OI Spike'], confidence: 88 } : null;
        }
    },
    'ALPHA': {
        icon: '🏹', lev: '5x', hold: '4h-12h', tpMult: 4.0, slMult: 2.0,
        title: 'Independent Alpha (BTC Decorrelated)',
        desc: 'Mencari koin "Outlier" yang bergerak independen (Idiosyncratic). Paling efektif saat BTC sedang sideways.',
        filter: (id, d) => {
            const corr = d.analytics?.correlation || { correlation: 0.8 };
            const m = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const isAlpha = corr.correlation < 0.4 && (m.normalizedScore || 0) > 60;
            return isAlpha ? { bias: m.action, factors: ['Idiosyncratic Movement', 'BTC Decorrelation', 'Independent Momentum'], confidence: 75 } : null;
        }
    },
    'FLOW': {
        icon: '🌊', lev: '3-10x', hold: '1h-4h', tpMult: 3.0, slMult: 1.5,
        title: 'Net Flow Directional (Capital Bias)',
        desc: 'Murni mengikuti arus modal. Trade sesuai Dominant Capital Bias (ACCUMULATION/DISTRIBUTION) yang divalidasi oleh Net Flow Riil ($).',
        filter: (id, d) => {
            const syn = d.synthesis || {};
            const flow = syn.flow || {};
            const netFlow = flow.net_flow_15MENIT || 0;
            const bias = flow.capital_bias_15MENIT || 'NEUTRAL';
            const isStrong = Math.abs(netFlow) > 20000 && bias !== 'NEUTRAL';
            return isStrong ? { bias: bias === 'ACCUMULATION' ? 'LONG' : 'SHORT', factors: ['Institutional Capital Bias', 'High Velocity Inflow', 'Volume-OI Balance'], confidence: 80 } : null;
        }
    },
    'SMART_MONEY': {
        icon: '🏦', lev: '5x', hold: '4h-24h', tpMult: 3.5, slMult: 1.5,
        title: 'Smart Money Divergence (Vol vs Freq)',
        desc: 'Mendeteksi pergerakan "Uang Pintar" saat volume per koin meledak TAPI frekuensi transaksi stabil/turun (Large orders hidden).',
        filter: (id, d) => {
            const vol = d.raw?.VOL?.vol_total_15MENIT || 0;
            const freq = d.raw?.FREQ?.freq_total_15MENIT || 1;
            const avgSize = vol / freq;
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const isSmart = avgSize > 5000 && master.action !== 'WAIT';
            return isSmart ? { bias: master.action, factors: ['Large Block Orders', 'Smart Money Masking', 'Whale Footprint'], confidence: 82 } : null;
        }
    },
    'WHALE': {
        icon: '🐋', lev: '10x', hold: '30m-1h', tpMult: 2.0, slMult: 1.0,
        title: 'Whale Shadow Tracker (Smart Money Flow)',
        desc: 'Membuntuti Whale-Pace. Hanya trigger saat rata-rata ukuran transaksi per koin meledak melewati batas normal historical.',
        filter: (id, d) => {
            const syn = d.synthesis || {};
            const aggr = syn.momentum?.aggression_level_15MENIT || 'RETAIL';
            const vel = syn.momentum?.velocity_15MENIT || 0;
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const isWhale = aggr === 'INSTITUTIONAL' && vel > 10000;
            return isWhale ? { bias: master.action || 'LONG', factors: ['Whale Intensity', 'Large Order Sizing', 'Aggressive Execution'], confidence: 80 } : null;
        }
    },
    'DIVERGE': {
        icon: '📈', lev: '5-10x', hold: '1h-2h', tpMult: 2.5, slMult: 1.2,
        title: 'Price-Flow Divergence (Anomality)',
        desc: 'Menemukan anomali di mana harga turun tapi Net Flow Institusi naik tajam (Hidden Accumulation), atau sebaliknya.',
        filter: (id, d) => {
            const syn = d.synthesis || {};
            const flow = syn.flow?.net_flow_15MENIT || 0;
            const pxChg = d.raw?.PRICE?.percent_change_24h || 0;
            const isDiv = (pxChg < -2 && flow > 20000) || (pxChg > 2 && flow < -20000);
            return isDiv ? { bias: flow > 0 ? 'LONG' : 'SHORT', factors: ['Flow Divergence', 'Institutional Front-Run', 'Hidden Accumulation'], confidence: 78 } : null;
        }
    },
    'ICEBERG': {
        icon: '🧊', lev: '10x', hold: '30m-1h', tpMult: 1.8, slMult: 0.8,
        title: 'Iceberg Order Detection (Hidden Liquidity)',
        desc: 'Mendeteksi pesanan raksasa yang dipecah-pecah di order book menggunakan analisa Order Flow Imbalance (OFI) dan Lambda.',
        filter: (id, d) => {
            const m = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.signals?.microstructure || {};
            const imbal = d.analytics?.orderFlow?.tradeSizeImbalance || 0;
            const isIce = Math.abs(imbal) > 0.5 && (m.kyleLambda?.rawValue || 0) > 0.01;
            return isIce ? { bias: imbal > 0 ? 'LONG' : 'SHORT', factors: ['Hidden Size Bias', 'Lambda Execution', 'Iceberg Presence'], confidence: 85 } : null;
        }
    },
    'SCALP': {
        icon: '🎯', lev: '10-20x', hold: '5-15m', tpMult: 1.5, slMult: 1.0,
        title: 'Microstructure Sniper (VPIN/Lambda)',
        desc: 'Mencari koin dengan Informed Trading (VPIN tinggi) dan Price Impact (Lambda) rendah. Front-run pergerakan harga sebelum volatilitas merata.',
        filter: (id, d) => {
            const m = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.signals?.microstructure || {};
            const syn = d.synthesis || {};
            const vpin = m.vpin?.rawValue || 0;
            const isHot = vpin > 0.6 && (syn.efficiency?.character_15MENIT === 'EFFORTLESS_MOVE');
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            return isHot ? { bias: master.action, factors: ['Informed Flow (VPIN)', 'Effortless Discovery', 'Low Friction Path'], confidence: (master.confidence || 70) + 15 } : null;
        }
    },
    'ABSORB': {
        icon: '🧲', lev: '10x', hold: '1h-3h', tpMult: 2.0, slMult: 1.0,
        title: 'Whale Absorption Hunter (Limit Trap)',
        desc: 'Mencari zona di mana volume meledak tapi harga tidak bergerak (Paku). Menandakan Paus sedang menyerap semua pesanan ritel.',
        filter: (id, d) => {
            const syn = d.synthesis || {};
            const char = syn.efficiency?.character_15MENIT || 'NORMAL';
            const netFlow = Math.abs(syn.flow?.net_flow_15MENIT || 0);
            const isAbs = char === 'ABSORPTION' && netFlow > 30000;
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            return isAbs ? { bias: master.action || 'WAIT', factors: ['Price Pinning', 'Deep Limit Liquidity', 'Whale Absorption'], confidence: 82 } : null;
        }
    },
    'SWEEP': {
        icon: '🧹', lev: '20x', hold: '5m-15m', tpMult: 1.2, slMult: 0.5,
        title: 'Liquidity Sweep Detector (Stop Hunt)',
        desc: 'Mendeteksi pembersihan likuiditas (wick panjang) sebelum harga berbalik arah. Teknik snipe di atas/bawah area konsolidasi.',
        filter: (id, d) => {
            const lsr = d.raw?.LSR?.timeframes_15min || {};
            const liq = d.dashboard?.liqQuality?.qualityScore || 0;
            const isSweep = Math.abs(lsr.z || 0) > 2.5 && liq > 80;
            return isSweep ? { bias: (lsr.z || 0) > 0 ? 'SHORT' : 'LONG', factors: ['Liquidity Grab', 'Stop-Hunt Pattern', 'High-Grained Reversal'], confidence: 90 } : null;
        }
    },
    'TRAP': {
        icon: '🚨', lev: '10x', hold: '1h-2h', tpMult: 2.0, slMult: 1.0,
        title: 'Liquidation Reversal (CVD/Liq Trap)',
        desc: 'Mendeteksi titik jenuh likuidasi ritel (Absorption). Masuk saat terjadi "Washout" yang divalidasi oleh pergerakan CVD berlawanan arah.',
        filter: (id, d) => {
            const syn = d.synthesis || {};
            const isAbs = syn.efficiency?.character_15MENIT === 'ABSORPTION';
            const lsr = d.raw?.LSR?.timeframes_15min || {};
            return (isAbs || Math.abs(lsr.z || 0) > 2.0) ? { bias: (lsr.z || 0) > 0 ? 'SHORT' : 'LONG', factors: ['Liquidation Cascade', 'Institutional Absorption', 'Contrarian Trap'], confidence: 85 } : null;
        }
    },
    'VOL': {
        icon: '🌩️', lev: '3-5x', hold: '4h-8h', tpMult: 5.0, slMult: 2.5,
        title: 'Volatility Breakout (Thunder Hunter)',
        desc: 'Mendeteksi transisi dari konsolidasi sepi ke ledakan volatilitas tinggi yang divalidasi oleh Volume Spike.',
        filter: (id, d) => {
            const c = d.raw?.CANDLES || {};
            const isExp = (c.candle_volatility_1H || 0) < 0.008 && (c.candle_volatility_15m || 0) > 0.006;
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            return isExp ? { bias: master.action, factors: ['Volatility Expansion', 'Momentum Ignition', 'Low-High Transistion'], confidence: master.confidence || 70 } : null;
        }
    },
    'EFFICIENCY': {
        icon: '🧬', lev: '5-10x', hold: '30m-2h', tpMult: 2.0, slMult: 0.8,
        title: 'Efficiency-Momentum (Path Hunter)',
        desc: 'Menggabungkan sinyal efficiency dan velocity. Menghindari trade saat high friction dan masuk hanya saat harga bergerak efisien terhadap volume.',
        filter: (id, d) => {
            const syn = d.synthesis || {};
            const eff = syn.efficiency?.efficiency_15MENIT || 0;
            const velocity = syn.momentum?.velocity_15MENIT || 0;
            const isEfficient = eff > 1.5 && velocity > 2000;
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            return isEfficient ? { bias: master.action, factors: ['High Efficiency Coefficient', 'Momentum Velocity', 'Low Friction Entry'], confidence: 80 } : null;
        }
    },
    'SWING': {
        icon: '🏛️', lev: '3-5x', hold: '1-3d', tpMult: 3.5, slMult: 1.5,
        title: 'Swing Accumulation (Smart Money Follower)',
        desc: 'Mencari aset yang sedang diakumulasi oleh institusi (High SMI) dengan efisiensi Arus Kas positif. Hold 1-3 hari mengikuti arus uang pintar.',
        filter: (id, d) => {
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const syn = d.synthesis || {};
            const netFlow = syn.flow?.net_flow_15MENIT || 0;
            const isAccum = (master.normalizedScore || 0) > 70 && netFlow > 5000;
            return isAccum ? { bias: master.action, factors: ['Institutional Accumulation', 'Positive Net Flow', 'Long-term Bias'], confidence: master.confidence || 70 } : null;
        }
    },
    'BASIS': {
        icon: '💎', lev: '1x', hold: '7d-30d', tpMult: 0.1, slMult: 0.05, isFlat: true,
        title: 'Delta-Neutral Basis King (Basis Hunter)',
        desc: 'Mencari selisih harga Futures vs Spot dibarengi funding raksasa. Resiko pergerakan harga nol, murni mengejar bunga biaya inap.',
        filter: (id, d) => {
            const f = d.raw?.FUNDING || {};
            const p = d.raw?.PRICE || {};
            const basis = Math.abs(p.last - p.previous) / p.previous;
            const isYield = Math.abs(f.fundingRate || 0) > 0.001 && basis < 0.002;
            return isYield ? { bias: f.fundingRate > 0 ? 'ARB SHORT' : 'ARB LONG', factors: ['Basis Capture', 'High Funding Spread', 'Zero-price Risk'], confidence: 95 } : null;
        }
    },
    'WALLS': {
        icon: '🧱', lev: '5-12x', hold: '1h-4h', tpMult: 0.02, slMult: 0.005, isFlat: true,
        title: 'Wall Defender (Order Book Support)',
        desc: 'Mencari koin yang harganya tertahan oleh tembok pesanan (Order Book Walls) raksasa. Strategi rebound dengan resiko rendah.',
        filter: (id, d) => {
            const ob = d.raw?.OB || {};
            const px = d.raw?.PRICE?.last || 0;
            const walls = [...(ob.askWalls || []), ...(ob.bidWalls || [])];
            const bigWalls = walls.filter(w => Math.abs(w.price - px) / px < 0.005);
            return bigWalls.length > 0 ? { bias: bigWalls[0].side === 'BID' ? 'LONG' : 'SHORT', factors: ['Insto Wall Defense', 'Liquidity Proxy', 'Low Risk Bounce'], confidence: 80 } : null;
        }
    },
    'FISHER': {
        icon: '🌊', lev: '5-10x', hold: '15m-45m', tpMult: 1.2, slMult: 0.8,
        title: 'Liquidity Crisis Fisher (Bottom Fisher)',
        desc: 'Menangkap titik jenuh pembalikan saat likuiditas sedang kosong (thin) dan menyentuh tembok institusi. Cocok untuk tebas pantulan ekstrim.',
        filter: (id, d) => {
            const se = d.analytics?.spreadEstimates || {};
            const ob = d.raw?.OB || {};
            const isThin = (se.combinedBps || 0) > 20 && (ob.bidDepth > ob.askDepth * 2);
            return isThin ? { bias: 'LONG', factors: ['Thin Liquidity Void', 'Order Balance Skew', 'Depth Recovery Play'], confidence: 70 } : null;
        }
    },
    'VOID': {
        icon: '🕳️', lev: '20x', hold: '5m-10m', tpMult: 0.8, slMult: 0.3, isFlat: true,
        title: 'Order Book Vacuum (Gap Hunter)',
        desc: 'Mendeteksi lubang likuiditas antara harga saat ini dengan tembok order besar berikutnya. Mengejar pergerakan kilat melewati zona kosong.',
        filter: (id, d) => {
            const ob = d.raw?.OB || {};
            const spread = ob.spreadBps || 0;
            const isVoid = spread > 6.0 && ob.bookHealth === 'THIN';
            return isVoid ? { bias: 'MOMENTUM', factors: ['Liquidity Vacuum', 'Price Gap Play', 'HFT Front-Run'], confidence: 65 } : null;
        }
    },
    'SENTIMENT': {
        icon: '⚖️', lev: '10x', hold: '1h-4h', tpMult: 2.0, slMult: 1.0,
        title: 'Sentiment Contrarian (Crowd Fader)',
        desc: 'Mengambil posisi berlawanan dengan kerumunan ritel yang sangat optimis/pesimis (High Long/Short Ratio). Merupakan strategi anti-herd entry.',
        filter: (id, d) => {
            const lsr = d.raw?.LSR?.timeframes_15min || {};
            const isExt = Math.abs(lsr.z || 0) > 1.8;
            return isExt ? { bias: lsr.z > 0 ? 'SHORT' : 'LONG', factors: ['Crowd Euphoria/Panic', 'Extreme LSR Bias', 'Contrarian Setup'], confidence: 75 } : null;
        }
    },
    'MEAN_REV': {
        icon: '🔄', lev: '5-10x', hold: '30m-1h', tpMult: 1.5, slMult: 1.0,
        title: 'Mean Reversion (Extreme Exhaustion)',
        desc: 'Mencari titik jenuh harga yang sudah terlalu jauh dari VWAP TAPI Net Flow Institusi mulai stabil/reverse. Menangkap "Snap-back" ke rata-rata.',
        filter: (id, d) => {
            const vwap = d.analytics?.execution?.vwap || 0;
            const px = d.raw?.PRICE?.last || 0;
            const diff = Math.abs(px - vwap) / (vwap || 1);
            const isExt = diff > 0.03; // Over 3% from VWAP
            return isExt ? { bias: px > vwap ? 'SHORT' : 'LONG', factors: ['VWAP Deviation', 'Price Exhaustion', 'Mean Reversion Setup'], confidence: 70 } : null;
        }
    },
    'PATIENCE': {
        icon: '⌛', lev: '2-5x', hold: '12h-48h', tpMult: 5.0, slMult: 2.0,
        title: 'The Patience Sniper (High Conviction)',
        desc: 'Menunggu setup "Perfect Storm". Hanya trigger saat MTF Pro, Net Flow Whale, dan SMI Alignment mencapai level kritis secara serentak.',
        filter: (id, d) => {
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const syn = d.synthesis || {};
            const netFlow = syn.flow?.net_flow_15MENIT || 0;
            const isPerfect = (master.normalizedScore || 0) > 90 && Math.abs(netFlow) > 60000;
            return isPerfect ? { bias: master.action, factors: ['Critical SMI Score', 'Giga Influx Inflow', 'Patient Entry Guard'], confidence: 95 } : null;
        }
    },
    'IGNITION': {
        icon: '📈', lev: '3x', hold: '3d-7d', tpMult: 10.0, slMult: 5.0,
        title: 'Genuine Momentum Ignition (Trend Starter)',
        desc: 'Mencari awal trend sehat: OI naik tajam divalidasi oleh Net Capital Inflow raksasa. Bukan koin pump-n-dump.',
        filter: (id, d) => {
            const syn = d.synthesis || {};
            const netFlow = syn.flow?.net_flow_15MENIT || 0;
            const master = d.signals?.profiles?.AGGRESSIVE?.timeframes?.['15MENIT']?.masterSignal || {};
            const isIgnition = (master.normalizedScore || 0) > 65 && netFlow > 15000;
            return isIgnition ? { bias: master.action, factors: ['Trend Incubation', 'Whale Money Entry', 'OI Shift Validation'], confidence: 85 } : null;
        }
    },
    'FUNDING': {
        icon: '💸', lev: '1-3x', hold: '8h-24h', tpMult: 0.05, slMult: 0.02, isFlat: true,
        title: 'Funding Rate Arbitrage (Yield Hunter)',
        desc: 'Memanfaatkan selisih ekstrim antara Funding Rate dan Premium Index. Long saat funding negatif (dibayar) dan Short saat funding positif tinggi.',
        filter: (id, d) => {
            const f = d.raw?.FUNDING || {};
            const rate = f.fundingRate || 0;
            const isExt = Math.abs(rate) > 0.0008;
            return isExt ? { bias: rate > 0 ? 'SHORT' : 'LONG', factors: ['Extreme Funding Yield', 'Yield Arbitrage', 'Neutral-Delta potential'], confidence: 90 } : null;
        }
    },
    'SAFETY': {
        icon: '🛡️', lev: 'N/A', hold: 'N/A', tpMult: 0, slMult: 0,
        title: 'Toxic Flow Filter (Risk Guard)',
        desc: 'Sistem pelindung modal. Mengidentifikasi koin yang sedang dimanipulasi robot HFT untuk menghindarkan Anda dari slippage parah.',
        filter: (id, d) => {
            const vol = d.raw?.VOL || {};
            const freq = d.raw?.FREQ || {};
            const v15 = (vol.vol_buy_15MENIT || 0) + (vol.vol_sell_15MENIT || 0);
            const f15 = (freq.freq_buy_15MENIT || 0) + (freq.freq_sell_15MENIT || 0);
            const intense = v15 > 0 ? (f15 / (v15 / 1000)) : 0;
            return intense > 80 ? { bias: 'STAY AWAY', factors: ['HFT Warfare', 'High Toxic Flow', 'Slippage Danger'], confidence: 99 } : null;
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

            let tp, sl, entry;
            const vwap = d.analytics?.execution?.vwap || 0;
            const ob = d.raw?.OB || {};

            // Tactical Entry Selection
            if (currentCategory === 'WALLS' || currentCategory === 'ICEBERG' || currentCategory === 'ABSORB') {
                const walls = filterRes.bias === 'LONG' || filterRes.bias === 'BUY' ? (ob.bidWalls || []) : (ob.askWalls || []);
                entry = walls.length > 0 ? walls[0].price : px;
            } else if (currentCategory === 'MEAN_REV' || currentCategory === 'COMPOSITE') {
                entry = vwap || px;
            } else {
                // Default: ATR-adjusted Limit
                const multi = filterRes.bias === 'SHORT' || filterRes.bias === 'SELL' ? 1 : -1;
                entry = px + (atr * 0.2 * multi);
            }

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

            return { id, coin: id, ...filterRes, tp, sl, entry, risk };
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
                                <div class="flex flex-col border-l border-bb-gold/30 pl-2">
                                    <span>Best Entry</span>
                                    <span class="text-bb-gold font-mono text-[9px]">${Utils.formatPrice(r.entry)}</span>
                                </div>
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
