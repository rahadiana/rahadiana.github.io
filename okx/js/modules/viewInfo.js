let lastStats = null;
let animationId = null;

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-sans overflow-hidden">
            <!-- TOP SUB-NAV -->
            <div class="flex items-stretch bg-bb-panel border-b border-bb-border h-8 shrink-0 px-3 overflow-x-auto scrollbar-none gap-4">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-black text-[10px] uppercase tracking-widest">KNOWLEDGE MATRIX v3.0</span>
                </div>
                <div class="flex items-center gap-6">
                    <a href="#section-core" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">CORE_DEFINITIONS</a>
                    <a href="#section-visuals" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">VISUAL_INTELLIGENCE</a>
                    <a href="#section-glossary" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">DATA_GLOSSARY</a>
                    <a href="#section-risk" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">RISK_PROTOCOL</a>
                </div>
            </div>

            <!-- CONTENT AREA -->
            <div class="flex-1 overflow-y-auto p-4 space-y-12 scrollbar-thin pb-20">
                
                <!-- SECTION: INTRO -->
                <div class="max-w-4xl mx-auto space-y-2 text-center py-6">
                    <h1 class="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Terminal Protocol Intelligence</h1>
                    <p class="text-xs text-bb-muted leading-relaxed max-w-2xl mx-auto">
                        Terminal ini bukan sekadar chart harga. Ini adalah mesin analisa mikrostruktur pasar (Market Microstructure) yang mendeteksi jejak kaki uang besar (Institutional Footprints) sebelum pergerakan besar terjadi.
                    </p>
                </div>

                <!-- SECTION: CORE DEFINITIONS -->
                <section id="section-core" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-gold font-black text-sm uppercase tracking-[0.2em] bg-bb-gold/10 px-3 py-1 border-l-2 border-bb-gold">01. CORE_SYSTEM_DEFINITIONS</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${renderMatrixCard('💰 SMI (Smart Money Index)', 'Indikator utama kekuatan akumulasi institusi.', [
        { k: 'Definisi', v: 'Skor 0-100 yang menggabungkan volume, Open Interest (OI), dan kecepatan aliran uang.' },
        { k: 'Bullish (>60)', v: 'Institusi sedang memborong barang secara perlahan. Harga berpotensi meledak ke atas.' },
        { k: 'Bearish (<40)', v: 'Institusi sedang membuang barang (distribusi). Risiko kejatuhan tinggi.' }
    ])}
                        ${renderMatrixCard('📊 VPIN (Informed Trading)', 'Pendeteksi keberadaan "orang dalam" atau robot canggih.', [
        { k: 'Definisi', v: 'Volume-Synchronized Probability of Informed Trading.' },
        { k: 'Arti Tinggi', v: 'Market sedang didominasi oleh trader yang "tahu lebih awal". Sangat volatil.' },
        { k: 'Arti Rendah', v: 'Market didominasi oleh ritel atau noise trading biasa. Cenderung stabil.' }
    ])}
                        ${renderMatrixCard('⚡ Kyle Lambda (Illiquidity)', 'Pengukur "kepedulian" harga terhadap order besar.', [
        { k: 'Definisi', v: 'Mengukur Price Impact. Berapa besar harga bergeser untuk setiap 1 unit volume.' },
        { k: 'Sinyal', v: 'Semakin tinggi Lambda, semakin keropos/thin orderbook-nya (Gampang dipompa/dibanting).' }
    ])}
                        ${renderMatrixCard('⚖️ LSR (Retail Sentiment)', 'Pendeteksi kerumunan ritel (Crowd Sentiment).', [
        { k: 'Definisi', v: 'Long/Short Ratio. Perbandingan posisi trader ritel di exchange.' },
        { k: 'Contrarian', v: 'Jika LSR sangat tinggi (Ritel Long), Institusi cenderung membanting harga ke bawah (Liquidation Hunt).' }
    ])}
                    </div>
                </section>

                <!-- SECTION: VISUAL INTELLIGENCE -->
                <section id="section-visuals" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-blue font-black text-sm uppercase tracking-[0.2em] bg-bb-blue/10 px-3 py-1 border-l-2 border-bb-blue">02. VISUAL_INTELLIGENCE_LAYER</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>

                    <div class="space-y-6">
                        <!-- Heatmap -->
                        <div class="bg-bb-dark border-2 border-white/5 rounded-lg p-6">
                            <h3 class="text-white font-black text-xs uppercase mb-4 flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                HYBRID LIQUIDATION HEATMAP
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div class="space-y-3">
                                    <div class="text-[10px] text-bb-gold font-bold uppercase underline decoration-bb-gold/20 underline-offset-4">Strategic Clusters</div>
                                    <p class="text-[9px] text-bb-text leading-relaxed">Cluster warna pudar menunjukkan level likuidasi teoritis (leverage 10x-100x). Ini adalah magnet harga ke depan.</p>
                                </div>
                                <div class="space-y-3">
                                    <div class="text-[10px] text-bb-red font-bold uppercase underline decoration-bb-red/20 underline-offset-4">Realized HIT Indicator</div>
                                    <p class="text-[9px] text-bb-text leading-relaxed">Garis menyala bertanda **"HIT!"** adalah kejadian likuidasi nyata yang baru saja terjadi di OKX.</p>
                                </div>
                                <div class="space-y-3">
                                    <div class="text-[10px] text-bb-blue font-bold uppercase underline decoration-bb-blue/20 underline-offset-4">Active Burst Mode</div>
                                    <p class="text-[9px] text-bb-text leading-relaxed">Saat status berubah jadi **"ACTIVE BURST"**, berarti sedang terjadi pembantaian massal dan volatilitas akan meledak.</p>
                                </div>
                            </div>
                        </div>

                        <!-- MTF Convergence -->
                        <div class="bg-bb-dark border-2 border-white/5 rounded-lg p-6">
                            <h3 class="text-white font-black text-xs uppercase mb-4 flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-bb-green shadow-[0_0_8px_#22c55e]"></span>
                                MTF CONVERGENCE (Bar Vertikal)
                            </h3>
                            <p class="text-[10px] text-bb-muted mb-4 leading-relaxed">
                                Menampilkan keselarasan sinyal di berbagai Timeframe (1M, 5M, 15M, 1H).
                            </p>
                            <div class="grid grid-cols-4 gap-2">
                                <div class="p-2 bg-black/40 border border-white/5">
                                    <div class="w-full h-1 bg-bb-green mb-1"></div>
                                    <div class="text-[8px] font-bold">FULL GREEN</div>
                                    <div class="text-[7px] text-bb-muted">Bullish Kuat di semua TF.</div>
                                </div>
                                <div class="p-2 bg-black/40 border border-white/5">
                                    <div class="w-full h-1 bg-bb-red mb-1"></div>
                                    <div class="text-[8px] font-bold">FULL RED</div>
                                    <div class="text-[7px] text-bb-muted">Bearish Kuat di semua TF.</div>
                                </div>
                                <div class="p-2 bg-black/40 border border-white/5">
                                    <div class="w-full h-1 bg-bb-gold mb-1"></div>
                                    <div class="text-[8px] font-bold">MIXED/NEUT</div>
                                    <div class="text-[7px] text-bb-muted">Konsolidasi/Ragu-ragu.</div>
                                </div>
                                <div class="p-2 bg-black/40 border border-white/5">
                                    <div class="w-full h-1 bg-white/20 mb-1"></div>
                                    <div class="text-[8px] font-bold">DARK BAR</div>
                                    <div class="text-[7px] text-bb-muted">Aliran data offline/No signal.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- SECTION: DATA GLOSSARY -->
                <section id="section-glossary" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-green font-black text-sm uppercase tracking-[0.2em] bg-bb-green/10 px-3 py-1 border-l-2 border-bb-green">03. DATA_FIELD_GLOSSARY</h2>
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
                            <tbody class="divide-y divide-white/5 text-bb-text">
                                <tr>
                                    <td class="p-3 font-bold text-bb-gold">VWOI</td>
                                    <td class="p-3">Ketimpangan pesanan di Open Interest. Positif (+) berarti buyer lebih agresif membuka posisi baru.</td>
                                </tr>
                                <tr>
                                    <td class="p-3 font-bold text-bb-gold">CVD Momentum</td>
                                    <td class="p-3">Delta volume jual/beli akumulatif. Mengukur siapa yang lebih dominan menghajar Market Order (Aggressive Taker).</td>
                                </tr>
                                <tr>
                                    <td class="p-3 font-bold text-bb-gold">Vol Durability</td>
                                    <td class="p-3">Kesinambungan volume. "Institutional" berarti volume besar dan konsisten, "Thin/Weak" berarti gampang padam.</td>
                                </tr>
                                <tr>
                                    <td class="p-3 font-bold text-bb-gold">TIM (Trade Imbalance)</td>
                                    <td class="p-3">Rasio ketidakseimbangan antara jumlah transaksi kecil vs transaksi besar secara real-time.</td>
                                </tr>
                                <tr>
                                    <td class="p-3 font-bold text-bb-gold">VWAP Zone</td>
                                    <td class="p-3">"Discount" berarti harga di bawah rata-rata bandar (Murah), "Premium" berarti sudah terlalu mahal (Reset imminent).</td>
                                </tr>
                                <tr>
                                    <td class="p-3 font-bold text-bb-gold">OI Chg 1H/24H</td>
                                    <td class="p-3">Perubahan minat pasar. OI Naik + Harga Naik = Akumulasi Sehat. OI Naik + Harga Turun = Shorting Sehat.</td>
                                </tr>
                            </tbody>
                        </table>
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
                                Jika terminal mendeteksi **"Toxic HFT Flow"** atau status **"STAY AWAY"**, berarti robot-robot institusi sedang berperang (High frequency noise). Dalam kondisi ini, SL Anda sangat mudah terkena karena slippage ekstrim. Hindari koin tersebut.
                            </p>
                        </div>
                        <div class="p-5 bg-bb-dark border border-bb-blue/30 rounded-lg">
                            <h4 class="text-bb-blue font-black text-[11px] mb-3 uppercase flex items-center gap-2">🛡️ CONFLUENCE FIRST</h4>
                            <p class="text-[10px] text-bb-text leading-relaxed">
                                Jangan pernah masuk hanya karena satu indikator (misal cuma liat SMI). Mesin ini dirancang untuk **Konfluensi**. Masuklah ketika minimal 3 sub-matriks (misal: SMI + LSR-Z + CVD) memberikan tanda yang searah.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- FINAL NOTE -->
                <div class="max-w-4xl mx-auto pt-10 border-t border-bb-border">
                    <div class="bg-bb-gold/5 p-6 rounded-lg text-[11px] text-bb-gold font-bold italic text-center leading-relaxed">
                        "Trading di terminal ini bukan soal menebak masa depan, melainkan soal memantau realitas aliran data secara objektif. Institusi tidak pernah menebak, mereka merencanakan eksekusi berdasarkan likuiditas."
                    </div>
                </div>

            </div>
        </div>
    `;
}

export function update(p2pStats) {
    // Currently Info tab doesn't have live peer data visual, 
    // but we can keep the logic path for future expansion
}

function renderMatrixCard(title, desc, items) {
    return `<div class="p-4 bg-bb-dark border border-white/5 rounded-lg hover:border-bb-gold/20 transition-colors group">
        <h3 class="text-white font-black text-[11px] mb-2 uppercase group-hover:text-bb-gold transition-colors">${title}</h3>
        <p class="text-[10px] text-bb-muted leading-relaxed mb-4">${desc}</p>
        <div class="space-y-2 border-t border-white/10 pt-4">
            ${items.map(i => `<div class="flex flex-col gap-0.5">
                <span class="text-bb-gold font-black text-[8px] uppercase tracking-tighter">${i.k}:</span>
                <span class="text-[9px] text-bb-text leading-snug">${i.v}</span>
            </div>`).join('')}
        </div>
    </div>`;
}
