let lastStats = null;

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-sans overflow-hidden">
            <!-- TOP SUB-NAV -->
            <div class="flex items-stretch bg-bb-panel border-b border-bb-border h-8 shrink-0 px-3 overflow-x-auto scrollbar-none gap-4">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-black text-[10px] uppercase tracking-widest">MISSION CONTROL v4.0</span>
                    <span id="telemetry-peer-id" class="px-2 py-0.5 bg-white/5 border border-white/10 text-[8px] font-mono text-bb-muted rounded lowercase">id: ---</span>
                </div>
                <div class="flex items-center gap-6">
                    <a href="#section-telemetry" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">MESH_TELEMETRY</a>
                    <a href="#section-strategies" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">STRATEGY_BLUEPRINTS</a>
                    <a href="#section-core" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">CORE_DEFINITIONS</a>
                    <a href="#section-glossary" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">DATA_GLOSSARY</a>
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
                            <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">Current Role</span>
                            <span id="tel-role" class="text-xs font-black text-white italic">PROBING...</span>
                            <div id="tel-role-dot" class="w-1.5 h-1.5 rounded-full bg-bb-muted animate-pulse"></div>
                        </div>
                        <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                            <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">Active Nodes</span>
                            <span id="tel-nodes" class="text-2xl font-black text-white font-mono">00</span>
                            <span class="text-[7px] text-bb-muted uppercase">Connected Mesh Peers</span>
                        </div>
                        <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                            <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">Throughput</span>
                            <span id="tel-throughput" class="text-xs font-black text-bb-green font-mono">0.0 PKT/S</span>
                            <span class="text-[7px] text-bb-muted uppercase">Global Mesh Traffic</span>
                        </div>
                        <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                            <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">Mesh Health</span>
                            <span id="tel-health" class="text-xs font-black text-bb-gold animate-pulse uppercase">PENDING</span>
                            <span id="tel-health-reason" class="text-[7px] text-bb-muted uppercase">Establishing P2P Edge</span>
                        </div>
                    </div>

                    <div class="bg-bb-panel border border-bb-border rounded overflow-hidden">
                        <div class="px-4 py-2 bg-black/40 border-b border-bb-border flex justify-between items-center">
                            <span class="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <span class="w-1.5 h-1.5 rounded-full bg-bb-green animate-ping"></span>
                                Active Neural Connections
                            </span>
                            <span id="tel-last-update" class="text-[7px] font-mono text-bb-muted">Last Update: ---</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-[9px] font-mono">
                                <thead class="bg-bb-dark text-bb-muted font-black uppercase">
                                    <tr>
                                        <th class="p-3">PEER_ID</th>
                                        <th class="p-3 text-center">ROLE</th>
                                        <th class="p-3 text-center">PROTOCOL</th>
                                        <th class="p-3 text-center">LATENCY</th>
                                        <th class="p-3 text-center">RX/TX</th>
                                        <th class="p-3 text-right">STATUS</th>
                                    </tr>
                                </thead>
                                <tbody id="tel-peer-table" class="divide-y divide-white/5 text-bb-text">
                                    <tr>
                                        <td colspan="6" class="p-10 text-center opacity-20 uppercase tracking-widest text-xs italic">Awaiting P2P Discovery...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- SECTION: STRATEGY BLUEPRINTS -->
                <section id="section-strategies" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-gold font-black text-sm uppercase tracking-[0.2em] bg-bb-gold/10 px-3 py-1 border-l-2 border-bb-gold">02. STRATEGY_BLUEPRINT_DATABASE</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${renderMatrixCard('🚀 BREAKOUT MASTER', 'Mendeteksi ledakan harga yang divalidasi oleh institusi.', [
        { k: 'Trigger', v: 'VPIN > 0.6 + Net Flow > $30k secara bersamaan.' },
        { k: 'Logika', v: 'Memastikan breakout didukung oleh perintah beli nyata, bukan noise.' },
        { k: 'Risk', v: 'Stop-loss ketat di bawah area breakout (Fixed SL).' }
    ])}
                        ${renderMatrixCard('🧊 ICEBERG DETECTOR', 'Melacak pesanan raksasa yang disembunyikan.', [
        { k: 'Trigger', v: 'Trade Imbalance > 0.5 + Lambda High.' },
        { k: 'Logika', v: 'Melihat "tembok tidak terlihat" yang mencoba menahan harga (paku).' },
        { k: 'Bias', v: 'Ikuti arah ketimpangan pesanan (Block Order Bias).' }
    ])}
                        ${renderMatrixCard('⌛ PATIENCE SNIPER', 'Setup probabilitas tinggi (Golden Setup).', [
        { k: 'Trigger', v: 'Score > 90 + Net Flow > $60k + MTF Aligned.' },
        { k: 'Logika', v: 'Hanya menembak saat semua parameter institusi selaras sempurna.' },
        { k: 'Hold', v: 'Hold durasi menengah (12h-48h) untuk target profit lebar.' }
    ])}
                        ${renderMatrixCard('🧲 ABSORPTION HUNT', 'Menemukan area "Jaring" bandar.', [
        { k: 'Trigger', v: 'Character: ABSORPTION + High Net Flow Influx.' },
        { k: 'Logika', v: 'Volume meledak tapi harga paku. Bandar sedang nampung semua jualan.' },
        { k: 'Entry', v: 'Masuk saat harga mulai memantul dari zona paku (Pinning area).' }
    ])}
                        ${renderMatrixCard('📉 DIVERGENCE PRO', 'Deteksi anomali harga vs modal.', [
        { k: 'Trigger', v: 'Price Down (-2%) + Flow Up (+$20k).' },
        { k: 'Logika', v: 'Retail sedang panik jualan, tapi Institusi diam-diam menyerap.' },
        { k: 'Confidence', v: 'Sangat tinggi untuk reversal jangka pendek.' }
    ])}
                        ${renderMatrixCard('🧹 LIQUIDITY SWEEP', 'Deteksi Stop-Hunt Institusi.', [
        { k: 'Trigger', v: 'LSR Z-Score > 2.5 + High Liquidity Quality.' },
        { k: 'Logika', v: 'Institusi membanting harga untuk kena stop-loss sebelum terbang.' },
        { k: 'Snipe', v: 'Cari wick panjang yang divalidasi oleh pembalikan flow cepat.' }
    ])}
                    </div>
                    <div class="mt-4 p-4 bg-bb-panel/30 border border-bb-border rounded text-[9px] text-bb-muted leading-relaxed italic">
                        * Tab ini hanya menunjukkan blueprint logika utama. Platform ini mendukung total 27 Elite Professional Frameworks yang berjalan secara paralel di dalam Neural Engine. 
                    </div>
                </section>

                <!-- SECTION: CORE DEFINITIONS -->
                <section id="section-core" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-white font-black text-sm uppercase tracking-[0.2em] bg-white/10 px-3 py-1 border-l-2 border-white">03. ARCHITECTURE_DEFINITIONS</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${renderMatrixCard('👑 God Signal (COMPOSITE)', 'Framework paling advanced: Menggabungkan bobot adaptif.', [
        { k: 'Definisi', v: 'Skor 0-100 yang melalui filter adaptif berdasarkan Volatilitas & Likuiditas.' },
        { k: 'Bullish (>80)', v: 'Neural mesh mendeteksi konfluensi murni yang jarang terjadi.' }
    ])}
                        ${renderMatrixCard('📊 VPIN (Informed Trading)', 'Pendeteksi keberadaan "orang dalam" atau robot.', [
        { k: 'Definisi', v: 'Volume-Synchronized Probability of Informed Trading.' },
        { k: 'Signal', v: 'Memberitahu Anda jika market saat ini sedang didominasi oleh Informed Players.' }
    ])}
                    </div>
                </section>

                <!-- SECTION: DATA GLOSSARY -->
                <section id="section-glossary" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-blue font-black text-sm uppercase tracking-[0.2em] bg-bb-blue/10 px-3 py-1 border-l-2 border-bb-blue">04. DATA_FIELD_GLOSSARY</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>
                    <div class="bg-bb-panel border border-bb-border rounded overflow-hidden">
                        <table class="w-full text-left text-[10px]">
                            <thead class="bg-bb-dark text-bb-muted font-black uppercase">
                                <tr>
                                    <th class="p-3 w-1/4">Field / Istilah</th>
                                    <th class="p-3">Penjelasan Tactical</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5 text-bb-text font-mono">
                                <tr>
                                    <td class="p-3 font-bold text-bb-gold">Net Flow</td>
                                    <td class="p-3 text-bb-green">Capital Commitment institusi riil (Market Orders + OI Adjustment).</td>
                                </tr>
                                <tr>
                                    <td class="p-3 font-bold text-bb-gold">Efficiency</td>
                                    <td class="p-3 text-bb-blue">Movement / Volume. Mengukur kemudahan harga bergerak (No Friction).</td>
                                </tr>
                                <tr>
                                    <td class="p-3 font-bold text-bb-gold">Z-Press</td>
                                    <td class="p-3">Z-Score Tekanan Jual/Beli di Order Book. Deteksi ketidakseimbangan limit order.</td>
                                </tr>
                                <tr>
                                    <td class="p-3 font-bold text-bb-gold">Kyle Lambda</td>
                                    <td class="p-3">Illiquidity parameter. Ukuran resiko slippage saat masuk posisi besar.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- SECTION: RISK PROTOCOL -->
                <section id="section-risk" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-red font-black text-sm uppercase tracking-[0.2em] bg-bb-red/10 px-3 py-1 border-l-2 border-bb-red">05. OPERATIONAL_RISK_PROTOCOL</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="p-5 bg-bb-dark border border-bb-red/30 rounded-lg">
                            <h4 class="text-bb-red font-black text-[11px] mb-3 uppercase flex items-center gap-2">⚠️ TOXIC FLOW WARNING</h4>
                            <p class="text-[10px] text-bb-text leading-relaxed">
                                Jika terminal mendeteksi **"Toxic HFT Flow"** (Poin #33), berarti algoritma robot sedang berperang. Dalam kondisi ini, SL Anda sangat mudah terkena karena slippage instan. Hindari koin tersebut sampai intensitas mereda.
                            </p>
                        </div>
                        <div class="p-5 bg-bb-dark border border-bb-blue/30 rounded-lg">
                            <h4 class="text-bb-blue font-black text-[11px] mb-3 uppercase flex items-center gap-2">🛡️ MESH RELIABILITY</h4>
                            <p class="text-[10px] text-bb-text leading-relaxed">
                                System berjalan di atas **P2P Data Mesh**. Pastikan status anda adalah **"READY [P]"** atau **"PROTECTED [S]"**. Jika koneksi mesh drop, terminal akan auto-fallback ke server feed untuk menjaga integritas sinyal Anda.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- FINAL NOTE -->
                <div class="max-w-4xl mx-auto pt-10 border-t border-bb-border">
                    <div class="bg-bb-gold/5 p-6 rounded-lg text-[11px] text-bb-gold font-bold italic text-center leading-relaxed font-mono">
                        "In institutional trading, data doesn't lie. Only players do." - Institutional Playbook v3
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

    // 2. Stats Cards
    const elRole = document.getElementById('tel-role');
    const elRoleDot = document.getElementById('tel-role-dot');
    if (elRole) {
        elRole.innerText = stats.isSuperPeer ? 'SUPERPEER Backbone' : 'DATAPEER Edge';
        elRole.className = `text-xs font-black italic ${stats.isSuperPeer ? 'text-bb-gold' : 'text-white'}`;
        if (elRoleDot) elRoleDot.className = `w-1.5 h-1.5 rounded-full ${stats.isSuperPeer ? 'bg-bb-gold shadow-[0_0_5px_#f97316]' : 'bg-bb-green shadow-[0_0_5px_#22c55e]'}`;
    }

    const elNodes = document.getElementById('tel-nodes');
    if (elNodes) elNodes.innerText = String(stats.peerCount || 0).padStart(2, '0');

    const elHealth = document.getElementById('tel-health');
    const elReason = document.getElementById('tel-health-reason');
    if (elHealth) {
        if (stats.isValidated) {
            elHealth.innerText = 'HEALTHY_SYNC';
            elHealth.className = 'text-xs font-black text-bb-green uppercase';
            if (elReason) elReason.innerText = 'P2P Decentralized Edge Active';
        } else {
            elHealth.innerText = 'PROBING...';
            elHealth.className = 'text-xs font-black text-bb-gold animate-pulse uppercase';
            if (elReason) elReason.innerText = 'Establishing Reliable Mesh Path';
        }
    }

    const elTime = document.getElementById('tel-last-update');
    if (elTime) elTime.innerText = `Last Update: ${new Date().toLocaleTimeString()}`;

    // 3. Throughput Estimate
    const elThroughput = document.getElementById('tel-throughput');
    if (elThroughput && stats.peers) {
        const total = stats.peers.reduce((acc, p) => acc + (p.received || 0), 0);
        elThroughput.innerText = `${(total / (Math.max(1, (Date.now() - (stats.startTime || Date.now())) / 1000))).toFixed(1)} PKT/S`;
    }

    // 4. Peer Table
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

                return `
                    <tr class="hover:bg-white/5 transition-colors group">
                        <td class="p-3 text-white font-bold">${p.id}</td>
                        <td class="p-3 text-center">
                            <span class="px-1.5 py-0.5 rounded-sm ${isSuper ? 'bg-bb-gold/20 text-bb-gold' : 'bg-white/5 text-bb-muted'} text-[7px] font-black uppercase">
                                ${isSuper ? 'BACKBONE' : 'EDGE'}
                            </span>
                        </td>
                        <td class="p-3 text-center text-bb-muted uppercase text-[8px]">WebRTC_v1</td>
                        <td class="p-3 text-center">
                            <span class="${rtt < 50 ? 'text-bb-green' : rtt < 150 ? 'text-bb-gold' : 'text-bb-red'}">${rtt}ms</span>
                        </td>
                        <td class="p-3 text-center group-hover:text-white transition-colors">
                            <span class="text-bb-green">↓${rx}</span> / <span class="text-bb-blue">↑${tx}</span>
                        </td>
                        <td class="p-3 text-right">
                            <span class="font-black uppercase tracking-tighter ${statusColor}">${p.channelState === 'open' ? 'STABLE_NODE' : 'DISCONNECTED'}</span>
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
