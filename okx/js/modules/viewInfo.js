let lastStats = null;

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-sans overflow-hidden">
            <!-- TOP SUB-NAV -->
            <div class="flex items-stretch bg-bb-panel border-b border-bb-border h-8 shrink-0 px-3 overflow-x-auto scrollbar-none gap-4">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-black text-[10px] uppercase tracking-widest">MISSION CONTROL v5.0</span>
                    <span id="telemetry-peer-id" class="px-2 py-0.5 bg-white/5 border border-white/10 text-[8px] font-mono text-bb-muted rounded lowercase">id: ---</span>
                </div>
                <div class="flex items-center gap-6">
                    <a href="#section-telemetry" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">MESH_TELEMETRY</a>
                    <a href="#section-glossary" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">DATA_GLOSSARY</a>
                    <a href="#section-strategies" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">STRATEGY_DATABASE</a>
                    <a href="#section-risk" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">RISK_PROTOCOL</a>
                </div>
            </div>

            <!-- CONTENT AREA -->
            <div class="flex-1 overflow-y-auto p-4 space-y-12 scrollbar-thin pb-20 scroll-smooth">
                
                <!-- SECTION: TELEMETRY -->
                <section id="section-telemetry" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-green font-black text-sm uppercase tracking-[0.2em] bg-bb-green/10 px-3 py-1 border-l-2 border-bb-green">01. LIVE_MESH_TELEMETRY</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                        <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center group">
                            <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">DATA STREAM MODE</span>
                            <span id="tel-stream-mode" class="text-xs font-black text-white italic">FULL FEED</span>
                            <div id="tel-mode-dot" class="w-1.5 h-1.5 rounded-full bg-bb-blue animate-pulse"></div>
                        </div>
                        <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                            <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">NETWORK MPS</span>
                            <span id="tel-mps" class="text-2xl font-black text-white font-mono">00</span>
                            <span class="text-[7px] text-bb-muted uppercase italic">Real-time Ingress Speed</span>
                        </div>
                        <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                            <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">MESH EFFICIENCY</span>
                            <span id="tel-efficiency" class="text-xs font-black text-bb-green font-mono">0%</span>
                            <span class="text-[7px] text-bb-muted uppercase italic">P2P Relay Ratio</span>
                        </div>
                        <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                            <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">ACTIVE PEERS</span>
                            <span id="tel-nodes" class="text-xs font-black text-bb-gold font-mono uppercase">0 NODES</span>
                            <span id="tel-health-reason" class="text-[7px] text-bb-muted uppercase italic">Establishing Edge</span>
                        </div>
                    </div>

                    <div class="bg-bb-panel border border-bb-border rounded overflow-hidden">
                        <div class="px-4 py-2 bg-black/40 border-b border-bb-border flex justify-between items-center">
                            <span class="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <span class="w-1.5 h-1.5 rounded-full bg-bb-green animate-ping"></span>
                                NEURAL INTERFACE STATUS
                            </span>
                            <span id="tel-last-update" class="text-[7px] font-mono text-bb-muted">Last Update: ---</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-[9px] font-mono">
                                <thead class="bg-bb-dark text-bb-muted font-black uppercase">
                                    <tr>
                                        <th class="p-3">NODE_ID</th>
                                        <th class="p-3 text-center">ROLE</th>
                                        <th class="p-3 text-center">LOAD</th>
                                        <th class="p-3 text-center">LATENCY</th>
                                        <th class="p-3 text-center">THROUGHPUT</th>
                                        <th class="p-3 text-right">INTEGRITY</th>
                                    </tr>
                                </thead>
                                <tbody id="tel-peer-table" class="divide-y divide-white/5 text-bb-text">
                                    <tr>
                                        <td colspan="6" class="p-10 text-center opacity-20 uppercase tracking-widest text-xs italic">Awaiting Telemetry Sync...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- SECTION: DATA GLOSSARY -->
                <section id="section-glossary" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-blue font-black text-sm uppercase tracking-[0.2em] bg-bb-blue/10 px-3 py-1 border-l-2 border-bb-blue">02. HFT_METRICS_GLOSSARY</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${renderGlossaryCard('Net Flow (True Cash Flow)', 'Energi penggerak pasar sesungguhnya.', 'Net Flow = (Market Buy - Market Sell) + (Long OI Change - Short OI Change). Jika positif, berarti dana institusi sedang dikomitmenkan ke posisi baru, bukan sekedar covering.')}
                        ${renderGlossaryCard('Hurst Exponent (Regime)', 'Deteksi siklus vs trend.', 'H > 0.5: Trending (Momentum). H < 0.5: Mean Reverting (Sideways). H = 0.5: Random Walk (Noise). Digunakan untuk memilih strategi Swing vs Scalp.')}
                        ${renderGlossaryCard('VPIN (Informed Volume)', 'Mendeteksi arus orang dalam.', 'Volume-Synchronized Probability of Informed Trading. Mengukur asimetri order book. VPIN tinggi mengindikasikan pemain besar (informed) sedang agresif masuk.')}
                        ${renderGlossaryCard('Kyle Lambda (Illiquidity)', 'Pengukur resiko slippage.', 'Mengestimasi pengaruh satu dollar terhadap pergerakan harga. Lambda tinggi = Pasar tipis (Slippage tinggi). Lambda rendah = Likuiditas tebal (Aman untuk posisi besar).')}
                        ${renderGlossaryCard('CVD Momentum (Aggression)', 'Kecepatan agresi pasar.', 'Cumulative Volume Delta. Menunjukkan apakah pembeli atau penjual yang lebih "kebelet" mengeksekusi harga. Diukur dalam delta per satuan waktu.')}
                        ${renderGlossaryCard('OFI (Order Flow Imbalance)', 'Tembok tersembunyi.', 'Mengukur perubahan antara Bid/Ask di berbagai level limit order. Membantu mendeteksi Iceberg Orders (tembok beli/jual yang tidak terlihat di layar luar).')}
                    </div>
                </section>

                <!-- SECTION: STRATEGY DATABASE -->
                <section id="section-strategies" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-gold font-black text-sm uppercase tracking-[0.2em] bg-bb-gold/10 px-3 py-1 border-l-2 border-bb-gold">03. STRATEGY_ARCHITECTURE_DATABASE</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${renderMatrixCard('👑 COMPOSITE ALPHA', 'The God Signal: Adaptive Framework.', [
        { k: 'Requirement', v: 'Score > 85 + Full MTF Align.' },
        { k: 'Logika', v: 'Fusi dari 12 metrik HFT dengan bobot dinamis.' },
        { k: 'Precision', v: 'Hanya meledak saat probabilitas > 92%.' }
    ])}
                        ${renderMatrixCard('⚡ SCALP SNIPER', 'High-Speed Microstructure Scout.', [
        { k: 'Requirement', v: 'VPIN > 0.7 + Low Lambda.' },
        { k: 'Logika', v: 'Mencari "Frictionless Move" saat likuiditas cukup.' },
        { k: 'Target', v: '0.5% - 1.5% profit dalam < 10 menit.' }
    ])}
                        ${renderMatrixCard('🏹 WHALE TRACKER', 'Follow the Smart Money Footprint.', [
        { k: 'Requirement', v: 'Net Flow > $200k + Avg Trade > $10k.' },
        { k: 'Logika', v: 'Mendeteksi akumulasi raksasa lewat CVD & OI.' },
        { k: 'Hold', v: 'Swing position mengikuti arah akumulasi.' }
    ])}
                        ${renderMatrixCard('🌊 MOMENTUM BLITZ', 'Trend Strength Exploiter.', [
        { k: 'Requirement', v: 'Hurst > 0.65 + Efficiency > 0.8.' },
        { k: 'Logika', v: 'Entry pada fase "Accelerated Trend" tanpa hambatan.' },
        { k: 'Edge', v: 'Memaksimalkan profit saat pasar sedang euphoria.' }
    ])}
                        ${renderMatrixCard('🏛️ REVERSAL SCANNER', 'Washout & Exhaustion Hunter.', [
        { k: 'Requirement', v: 'LSR Z > 3.0 + Absorption Check.' },
        { k: 'Logika', v: 'Mencari titik jenuh ritel (FOMO/Panic).' },
        { k: 'Snipe', v: 'Kontrarian entry saat paus mulai menyerap harga.' }
    ])}
                        ${renderMatrixCard('🧱 LIQUIDITY KING', 'Wall & Iceberg Front-runner.', [
        { k: 'Requirement', v: 'OFI Imbalance > 0.8 + Wall Proximity.' },
        { k: 'Logika', v: 'Menggunakan tembok besar sebagai perisai Stop Loss.' },
        { k: 'Strategy', v: 'Front-run level likuiditas asli di bursa.' }
    ])}
                    </div>
                </section>

                <!-- SECTION: RISK PROTOCOL -->
                <section id="section-risk" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-red font-black text-sm uppercase tracking-[0.2em] bg-bb-red/10 px-3 py-1 border-l-2 border-bb-red">04. OPERATIONAL_RISK_PROTOCOL</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="p-5 bg-bb-dark border border-bb-red/30 rounded-lg">
                            <h4 class="text-bb-red font-black text-[11px] mb-3 uppercase flex items-center gap-2">⚠️ TOXIC FLOW WARNING</h4>
                            <p class="text-[10px] text-bb-text leading-relaxed">
                                Jika terminal mendeteksi **"Toxic HFT Flow"**, berarti algoritma robot sedang berperang secara agresif. Dalam kondisi ini, SL Anda sangat mudah terkena karena slippage instan (Whale War). Hindari entry sampai intensitas (VPIN) mereda.
                            </p>
                        </div>
                        <div class="p-5 bg-bb-dark border border-bb-blue/30 rounded-lg">
                            <h4 class="text-bb-blue font-black text-[11px] mb-3 uppercase flex items-center gap-2">🛡️ MESH RELIABILITY</h4>
                            <p class="text-[10px] text-bb-text leading-relaxed">
                                System berjalan di atas **Adaptive Data Mesh**. Jika koneksi P2P melambat di bawah 25 MPS, terminal akan otomatis beralih ke **Full Server Feed**. Status **OFFLOADED** berarti Anda sedang menghemat CPU server berkat efisiensi P2P.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- FINAL NOTE -->
                <div class="max-w-4xl mx-auto pt-10 border-t border-bb-border">
                    <div class="bg-bb-gold/5 p-6 rounded-lg text-[11px] text-bb-gold font-bold italic text-center leading-relaxed font-mono">
                        "Data provides the edge. Execution determines the legacy." - MISSION CONTROL OPS v5.0
                    </div>
                </div>

            </div>
        </div>
    `;
}

export function update(stats) {
    if (!stats) return;
    lastStats = stats;

    // 1. Header Info
    const elId = document.getElementById('telemetry-peer-id');
    if (elId) elId.innerText = `id: ${stats.myId || '---'}`;

    // 2. Mesh Stats Integration
    const mStats = stats.meshStats || {};

    const elMode = document.getElementById('tel-stream-mode');
    const elModeDot = document.getElementById('tel-mode-dot');
    if (elMode) {
        const isOff = mStats.isOffloaded;
        elMode.innerText = isOff ? 'MESH OFFLOADED' : 'FULL SERVER FEED';
        elMode.className = `text-xs font-black italic ${isOff ? 'text-bb-gold' : 'text-bb-blue'}`;
        if (elModeDot) elModeDot.className = `w-1.5 h-1.5 rounded-full ${isOff ? 'bg-bb-gold animate-pulse' : 'bg-bb-blue animate-pulse'}`;
    }

    const elMps = document.getElementById('tel-mps');
    if (elMps) {
        elMps.innerText = String(mStats.mps || 0).padStart(2, '0');
        elMps.className = `text-2xl font-black font-mono ${mStats.mps < 15 ? 'text-bb-red' : mStats.mps < 25 ? 'text-bb-gold' : 'text-white'}`;
    }

    const elEff = document.getElementById('tel-efficiency');
    if (elEff) {
        const total = (mStats.wsCount || 0) + (mStats.p2pCount || 0);
        const ratio = total > 0 ? Math.round((mStats.p2pCount / total) * 100) : 0;
        elEff.innerText = `${ratio}%`;
        elEff.className = `text-xs font-black font-mono ${ratio > 70 ? 'text-bb-green' : 'text-bb-muted'}`;
    }

    const elNodes = document.getElementById('tel-nodes');
    const elReason = document.getElementById('tel-health-reason');
    if (elNodes) {
        elNodes.innerText = `${stats.peerCount || 0} PEERS`;
        if (elReason) elReason.innerText = stats.isValidated ? 'Neural Mesh Validated' : 'Probing Signal Path';
    }

    const elTime = document.getElementById('tel-last-update');
    if (elTime) elTime.innerText = `Last Telemetry: ${new Date().toLocaleTimeString()}`;

    // 3. Peer Table
    const elTable = document.getElementById('tel-peer-table');
    if (elTable && stats.peers) {
        if (stats.peers.length === 0) {
            elTable.innerHTML = `<tr><td colspan="6" class="p-10 text-center opacity-20 uppercase tracking-widest text-xs italic">Searching for Mesh Neighbors...</td></tr>`;
        } else {
            elTable.innerHTML = stats.peers.map(p => {
                const isSuper = p.isSuper;
                const statusColor = p.channelState === 'open' ? 'text-bb-green' : 'text-bb-red';
                const rx = p.received || 0;
                const tx = p.sent || 0;
                const rtt = p.rtt || 0;
                const load = Math.min(100, Math.round((rx / (Math.max(1, mStats.mps) * 10)) * 100)); // Estimated neighbor load contribution

                return `
                    <tr class="hover:bg-white/5 transition-colors group">
                        <td class="p-3 text-white font-bold opacity-70 group-hover:opacity-100 font-mono">${p.id}</td>
                        <td class="p-3 text-center">
                            <span class="px-1.5 py-0.5 rounded-sm ${isSuper ? 'bg-bb-gold/20 text-bb-gold' : 'bg-white/5 text-bb-muted'} text-[7px] font-black uppercase">
                                ${isSuper ? 'BACKBONE' : 'EDGE_NODE'}
                            </span>
                        </td>
                        <td class="p-3 text-center text-bb-muted font-mono">${load}%</td>
                        <td class="p-3 text-center">
                            <span class="${rtt < 50 ? 'text-bb-green' : rtt < 150 ? 'text-bb-gold' : 'text-bb-red'}">${rtt}ms</span>
                        </td>
                        <td class="p-3 text-center group-hover:text-white transition-colors">
                            <span class="text-bb-green">↓${rx}</span> / <span class="text-bb-blue">↑${tx}</span>
                        </td>
                        <td class="p-3 text-right">
                            <span class="font-black uppercase tracking-tighter ${statusColor}">${p.channelState === 'open' ? 'VERIFIED' : 'SYNC_LOST'}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

function renderMatrixCard(title, desc, items) {
    return `<div class="p-4 bg-bb-panel border border-bb-border rounded-lg hover:border-bb-gold/20 transition-all group hover:bg-bb-panel/60">
        <h3 class="text-white font-black text-[11px] mb-2 uppercase group-hover:text-bb-gold transition-colors flex items-center justify-between">
            ${title}
            <span class="w-1 h-3 bg-bb-gold/0 group-hover:bg-bb-gold transition-all"></span>
        </h3>
        <p class="text-[9px] text-bb-muted leading-relaxed mb-4 italic h-8">${desc}</p>
        <div class="space-y-2 border-t border-white/5 pt-4">
            ${items.map(i => `<div class="flex flex-col gap-0.5">
                <span class="text-bb-gold font-black text-[7px] uppercase tracking-tighter opacity-70">${i.k}:</span>
                <span class="text-[9px] text-bb-text leading-snug font-mono">${i.v}</span>
            </div>`).join('')}
        </div>
    </div>`;
}

function renderGlossaryCard(title, subtitle, desc) {
    return `
        <div class="p-4 bg-bb-panel border border-bb-border rounded-lg">
            <div class="flex flex-col gap-1 mb-3">
                <span class="text-bb-blue font-black text-[11px] uppercase tracking-widest">${title}</span>
                <span class="text-[8px] text-bb-muted uppercase italic">${subtitle}</span>
            </div>
            <p class="text-[10px] text-bb-text leading-relaxed font-mono opacity-80">${desc}</p>
        </div>
    `;
}
