let lastStats = null;
let animationId = null;
let bandwidthHistory = Array(60).fill(0);

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-sans overflow-hidden">
            <!-- TOP SUB-NAV -->
            <div class="flex items-stretch bg-bb-panel border-b border-bb-border h-8 shrink-0 px-3 overflow-x-auto scrollbar-none gap-4">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-black text-[10px] uppercase tracking-widest">MISSION CONTROL v6.0</span>
                    <span id="telemetry-peer-id" class="px-2 py-0.5 bg-white/5 border border-white/10 text-[8px] font-mono text-bb-muted rounded lowercase">id: ---</span>
                </div>
                <div class="flex items-center gap-6">
                    <a href="#section-features" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">FEATURES</a>
                    <a href="#section-telemetry" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">MESH_TELEMETRY</a>
                    <a href="#section-glossary" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">DATA_GLOSSARY</a>
                    <a href="#section-composer-db" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">COMPOSER_DB</a>
                    <a href="#section-meta-guard" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">META-GUARD</a>
                    <a href="#section-simulation" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">SIMULATION</a>
                    <a href="#section-risk" class="text-[9px] font-black text-bb-muted hover:text-white transition-colors">RISK</a>
                </div>
            </div>

            <!-- CONTENT AREA -->
            <div class="flex-1 overflow-y-auto p-4 space-y-12 scrollbar-thin pb-20 scroll-smooth">
                
                <!-- SECTION: FEATURES OVERVIEW -->
                <section id="section-features" class="max-w-6xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-gold font-black text-sm uppercase tracking-[0.2em] bg-bb-gold/10 px-3 py-1 border-l-2 border-bb-gold">00. DASHBOARD FEATURES</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>
                    
                    <p class="text-[11px] text-bb-muted mb-6 max-w-3xl">
                        Platform analitik trading cryptocurrency real-time dengan data dari OKX Exchange. 
                        Menggabungkan HFT metrics, order flow analysis, dan AI-powered signals untuk keputusan trading yang presisi.
                    </p>

                    <!-- MAIN TABS -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        ${renderFeatureCard('📊', 'OVERVIEW', 'Dashboard utama menampilkan ringkasan semua coin aktif dengan sorting berdasarkan signal strength, volume, dan metrics kunci.', ['Real-time price updates', 'Signal strength indicators', 'Quick action buttons', 'Multi-coin monitoring'])}
                        ${renderFeatureCard('⚡', 'SIGNALS', 'Sistem sinyal multi-profile (Conservative/Moderate/Aggressive) dengan 7 timeframe dari 1 menit hingga 24 jam.', ['Composite Alpha Score', 'MTF (Multi-Timeframe) Alignment', 'Confidence levels', 'Entry/Exit recommendations'])}
                        ${renderFeatureCard('🎯', 'SIMULATION', 'Paper trading simulator dengan fitur lengkap untuk testing strategi tanpa risiko modal nyata.', ['Virtual balance tracking', 'Smart DCA automation', 'TP/SL management', 'Trailing Stop', 'Meta-Guard Integration'])}
                        ${renderFeatureCard('🛡️', 'META-GUARD', 'Layer proteksi tingkat institusi yang memvalidasi setiap sinyal sebelum eksekusi. Block trade berbahaya via Institutional Guard.', ['Status: ALLOW/BLOCK/DOWNGRADE', 'Institutional Positioning Check', 'Anti-Manipulation Filters', 'Execution Validation'])}
                        ${renderFeatureCard('🧬', 'COMPOSER', 'Advanced Signal Builder dengan 30+ Strategy Presets dan Meta-Guard integration. Build, Test, and Execute custom strategies.', ['30+ Strategy Presets', 'Custom signal creation', 'Meta-Guard Logic', 'Multi-condition builder'])}
                        ${renderFeatureCard('📈', 'ANALYTICS', 'Deep analytics dashboard dengan visualisasi distribusi signal dan performance metrics.', ['Signal distribution charts', 'Timeframe analysis', 'Profile comparison', 'Historical patterns'])}
                    </div>

                    <!-- ANALYSIS TABS -->
                    <h3 class="text-bb-blue font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span class="w-2 h-2 bg-bb-blue rounded-full"></span>
                        MARKET ANALYSIS MODULES
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                        ${renderMiniFeature('🏛️', 'DERIVATIVES', 'Funding rate, OI analysis, LSR tracking untuk futures market')}
                        ${renderMiniFeature('💧', 'LIQUIDITY', 'Order book depth, bid/ask imbalance, wall detection')}
                        ${renderMiniFeature('💥', 'LIQUIDATIONS', 'Real-time liquidation heatmap dan cascade detection')}
                        ${renderMiniFeature('🔬', 'MICROSTRUCTURE', 'VPIN, Kyle Lambda, OFI, dan HFT metrics lainnya')}
                        ${renderMiniFeature('📊', 'VOL SCANNER', 'Volume anomaly detection dengan multi-timeframe analysis')}
                        ${renderMiniFeature('📉', 'VOL RATIO', 'Buy/Sell volume ratio dengan trend analysis')}
                        ${renderMiniFeature('🌊', 'REGIME', 'Hurst exponent, trend/mean-reversion detection')}
                        ${renderMiniFeature('🎯', 'LEVELS', 'Support/Resistance dan key price levels')}
                        ${renderMiniFeature('🔗', 'CORRELATION', 'Cross-asset correlation matrix dan BTC beta')}
                        ${renderMiniFeature('🧮', 'SYNTHESIS', 'Flow, Efficiency, Momentum synthesis scores')}
                        ${renderMiniFeature('📡', 'MONITORING', 'System health dan connection status')}
                        ${renderMiniFeature('🌐', 'GLOBAL', 'Market-wide sentiment dan aggregate metrics')}
                    </div>

                    <!-- SPECIAL FEATURES -->
                    <h3 class="text-bb-green font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span class="w-2 h-2 bg-bb-green rounded-full"></span>
                        SPECIAL FEATURES
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="p-4 bg-bb-panel border border-bb-green/30 rounded-lg">
                            <h4 class="text-bb-green font-black text-[10px] mb-2 uppercase">🔄 SMART DCA</h4>
                            <p class="text-[9px] text-bb-muted leading-relaxed">
                                Dollar Cost Averaging otomatis saat posisi merugi. Configurable step sizes (2%, 4%, 8%, 16%) 
                                dengan multiplier untuk averaging down yang agresif atau konservatif.
                            </p>
                        </div>
                        <div class="p-4 bg-bb-panel border border-bb-blue/30 rounded-lg">
                            <h4 class="text-bb-blue font-black text-[10px] mb-2 uppercase">📈 TRAILING STOP</h4>
                            <p class="text-[9px] text-bb-muted leading-relaxed">
                                Trailing stop yang mengikuti profit tertinggi. Aktivasi setelah mencapai threshold tertentu,
                                lock profit saat market reversal dengan callback percentage.
                            </p>
                        </div>
                        <div class="p-4 bg-bb-panel border border-bb-gold/30 rounded-lg">
                            <h4 class="text-bb-gold font-black text-[10px] mb-2 uppercase">🛡️ DRAWDOWN HALT</h4>
                            <p class="text-[9px] text-bb-muted leading-relaxed">
                                Otomatis pause trading saat drawdown mencapai threshold. Cooldown period untuk evaluasi
                                sebelum melanjutkan trading. Mencegah tilt trading.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- SECTION: TELEMETRY & P2P MESH -->
                <section id="section-telemetry" class="max-w-6xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-green font-black text-sm uppercase tracking-[0.2em] bg-bb-green/10 px-3 py-1 border-l-2 border-bb-green">01. LIVE_MESH_TELEMETRY</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        
                        <!-- LEFT: P2P TOPOLOGY -->
                        <div class="lg:col-span-2 flex flex-col gap-4">
                            <!-- GRAPH CANVAS -->
                            <div class="bg-bb-dark border border-bb-border rounded-lg relative overflow-hidden h-[400px]">
                                <div class="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
                                    <h3 class="text-bb-gold font-black text-[10px] uppercase shadow-black drop-shadow-md">NETWORK TOPOLOGY</h3>
                                    <div class="flex items-center gap-2 text-[8px] text-bb-muted">
                                        <span class="w-2 h-2 rounded-full bg-bb-blue"></span> YOU
                                        <span class="w-2 h-2 rounded-full bg-bb-gold"></span> SUPERPEER
                                        <span class="w-2 h-2 rounded-full bg-bb-green"></span> PEER
                                    </div>
                                </div>
                                <canvas id="p2p-topology-canvas" class="w-full h-full block"></canvas>
                            </div>

                             <!-- BANDWIDTH CHART -->
                            <div class="bg-bb-dark border border-bb-border rounded-lg p-3 h-48 flex flex-col">
                                <div class="flex justify-between items-center mb-2">
                                    <h3 class="text-bb-green font-black text-[10px] uppercase">P2P BANDWIDTH ACTIVITY (Est. Packets/s)</h3>
                                    <span id="p2p-current-activity" class="text-[9px] font-mono text-bb-green">0 p/s</span>
                                </div>
                                <div class="flex-1 relative overflow-hidden bg-black/20 rounded border border-white/5">
                                    <canvas id="p2p-bandwidth-canvas" class="w-full h-full block"></canvas>
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT: STATS & LOGS -->
                        <div class="flex flex-col gap-4">
                            <!-- STATS GRID -->
                            <div class="grid grid-cols-2 gap-3">
                                <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center group">
                                    <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">DATA STREAM MODE</span>
                                    <span id="tel-stream-mode" class="text-xs font-black text-white italic">FULL FEED</span>
                                    <div id="tel-mode-dot" class="w-1.5 h-1.5 rounded-full bg-bb-blue animate-pulse"></div>
                                </div>
                                <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                                    <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">NETWORK MPS</span>
                                    <span id="tel-mps" class="text-2xl font-black text-white font-mono">00</span>
                                </div>
                                <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                                    <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">MESH EFFICIENCY</span>
                                    <span id="tel-efficiency" class="text-xs font-black text-bb-green font-mono">0%</span>
                                </div>
                                <div class="p-4 bg-bb-panel border border-bb-border/50 rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                                    <span class="text-[8px] font-black text-bb-muted uppercase tracking-tighter">ACTIVE PEERS</span>
                                    <span id="tel-nodes" class="text-xs font-black text-bb-gold font-mono uppercase">0 NODES</span>
                                </div>
                            </div>

                             <!-- PEER TABLE -->
                            <div class="bg-bb-panel border border-bb-border rounded overflow-hidden flex-1 flex flex-col min-h-[300px]">
                                <div class="px-4 py-2 bg-black/40 border-b border-bb-border flex justify-between items-center shrink-0">
                                    <span class="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <span class="w-1.5 h-1.5 rounded-full bg-bb-green animate-ping"></span>
                                        NEURAL INTERFACE STATUS
                                    </span>
                                </div>
                                <div class="overflow-y-auto flex-1 h-0 scrollbar-thin">
                                    <table class="w-full text-left text-[9px] font-mono">
                                        <thead class="bg-bb-dark text-bb-muted font-black uppercase sticky top-0">
                                            <tr>
                                                <th class="p-3">NODE_ID</th>
                                                <th class="p-3 text-center">ROLE</th>
                                                <th class="p-3 text-center">LATENCY</th>
                                                <th class="p-3 text-right">Activity</th>
                                            </tr>
                                        </thead>
                                        <tbody id="tel-peer-table" class="divide-y divide-white/5 text-bb-text">
                                            <tr>
                                                <td colspan="4" class="p-10 text-center opacity-20 uppercase tracking-widest text-xs italic">Awaiting Telemetry Sync...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
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
                        ${renderGlossaryCard('Composite Alpha', 'Signal gabungan terkuat.', 'Fusi dari 12+ metrik HFT dengan bobot dinamis berdasarkan market regime. Score > 85 dengan MTF alignment mengindikasikan high-probability setup.')}
                        ${renderGlossaryCard('LSR (Long/Short Ratio)', 'Posisi retail vs institusi.', 'Rasio posisi long vs short di pasar futures. Z-score > 2 mengindikasikan crowded trade (potensi reversal). Digunakan untuk kontrarian entry.')}
                    </div>
                </section>

                <!-- SECTION: META-GUARD PROTOCOL -->
                <section id="section-meta-guard" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-green font-black text-sm uppercase tracking-[0.2em] bg-bb-green/10 px-3 py-1 border-l-2 border-bb-green">02b. META-GUARD_PROTOCOL</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="p-4 bg-bb-panel border border-bb-green/30 rounded-lg">
                            <h4 class="text-bb-green font-black text-[11px] mb-2 uppercase">✅ ALLOW STATE</h4>
                            <p class="text-[9px] text-bb-muted leading-relaxed">
                                Kondisi pasar optimal. Institutional Positioning mendukung arah trade. Volume dan Likuiditas sehat.
                                <br><br><span class="text-white font-bold">Action:</span> Execution Allowed with Full confidence.
                            </p>
                        </div>
                        <div class="p-4 bg-bb-panel border border-bb-gold/30 rounded-lg">
                            <h4 class="text-bb-gold font-black text-[11px] mb-2 uppercase">⚠️ DOWNGRADE STATE</h4>
                            <p class="text-[9px] text-bb-muted leading-relaxed">
                                Terdeteksi noise atau conflicting signals. Institusi mungkin sedang hedging.
                                <br><br><span class="text-white font-bold">Action:</span> Execution Allowed but with <span class="text-bb-gold">Reduced Size (50%)</span> & Tigher SL.
                            </p>
                        </div>
                        <div class="p-4 bg-bb-panel border border-bb-red/30 rounded-lg">
                            <h4 class="text-bb-red font-black text-[11px] mb-2 uppercase">🚫 BLOCK STATE</h4>
                            <p class="text-[9px] text-bb-muted leading-relaxed">
                                Bahaya terdeteksi: Toxic Flow, Manipulation, atau Crowd Contamination.
                                <br><br><span class="text-white font-bold">Action:</span> <span class="text-bb-red">EXECUTION BLOCKED.</span> Guard akan mencegah entry apapun sampai kondisi aman.
                            </p>
                        </div>
                    </div>

                    <div class="p-4 bg-bb-dark border border-bb-border rounded-lg">
                        <h4 class="text-white font-black text-[10px] mb-2 uppercase">🛡️ GUARD CHECKLIST</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-[9px]">
                            <div class="flex flex-col gap-1">
                                <span class="text-bb-muted uppercase font-bold">1. Positioning Check</span>
                                <span class="text-bb-text opacity-70">Memastikan tidak melawan arah institusi besar (Whale).</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-bb-muted uppercase font-bold">2. Toxicity Scan</span>
                                <span class="text-bb-text opacity-70">Mendeteksi HFT predatory flow (VPIN Extreme).</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-bb-muted uppercase font-bold">3. Causality Logic</span>
                                <span class="text-bb-text opacity-70">Price move harus divalidasi oleh Volume & OI (No Fakeouts).</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-bb-muted uppercase font-bold">4. Liquidity Health</span>
                                <span class="text-bb-text opacity-70">Memastikan slippage rendah (Kyle Lambda check).</span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- SECTION: STRATEGY DATABASE -->
                <section id="section-composer-db" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-gold font-black text-sm uppercase tracking-[0.2em] bg-bb-gold/10 px-3 py-1 border-l-2 border-bb-gold">03. COMPOSER_PRESET_ARCHITECTURES</h2>
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

                <!-- SECTION: SIMULATION GUIDE -->
                <section id="section-simulation" class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-green font-black text-sm uppercase tracking-[0.2em] bg-bb-green/10 px-3 py-1 border-l-2 border-bb-green">04. SIMULATION_TRADING_GUIDE</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div class="p-5 bg-bb-dark border border-bb-border rounded-lg">
                            <h4 class="text-white font-black text-[11px] mb-4 uppercase flex items-center gap-2">
                                <span class="text-bb-green">📖</span> CARA MENGGUNAKAN SIMULATOR
                            </h4>
                            <ol class="text-[10px] text-bb-text leading-relaxed space-y-3 list-decimal list-inside">
                                <li><span class="text-bb-muted">Pilih coin dari dropdown atau ketik manual (format: XXX-USDT-SWAP)</span></li>
                                <li><span class="text-bb-muted">Set position size ($), leverage, TP%, dan SL%</span></li>
                                <li><span class="text-bb-muted">Klik LONG atau SHORT untuk membuka posisi</span></li>
                                <li><span class="text-bb-muted">Monitor PnL & 🛡️ Guard Status real-time</span></li>
                                <li><span class="text-bb-muted">Review trade history di panel bawah</span></li>
                            </ol>
                        </div>
                        <div class="p-5 bg-bb-dark border border-bb-border rounded-lg">
                            <h4 class="text-white font-black text-[11px] mb-4 uppercase flex items-center gap-2">
                                <span class="text-bb-gold">⚙️</span> KONFIGURASI LANJUTAN
                            </h4>
                            <ul class="text-[10px] text-bb-text leading-relaxed space-y-2">
                                <li><span class="text-bb-gold font-bold">DCA:</span> <span class="text-bb-muted">Enable untuk auto-averaging saat rugi (steps: 2%, 4%, 8%, 16%)</span></li>
                                <li><span class="text-bb-gold font-bold">TS:</span> <span class="text-bb-muted">Trailing Stop - lock profit setelah mencapai threshold</span></li>
                                <li><span class="text-bb-gold font-bold">Fees:</span> <span class="text-bb-muted">Simulasikan trading fees (maker 0.02%, taker 0.05%)</span></li>
                                <li><span class="text-bb-gold font-bold">Guard:</span> <span class="text-bb-muted">Validasi entry dengan Meta-Guard (Indikator di Header)</span></li>
                                <li><span class="text-bb-gold font-bold">Halt:</span> <span class="text-bb-muted">Auto-pause saat drawdown > threshold</span></li>
                            </ul>
                        </div>
                    </div>

                    <div class="p-4 bg-bb-panel border border-bb-gold/30 rounded-lg">
                        <h4 class="text-bb-gold font-black text-[10px] mb-3 uppercase">💡 PRO TIPS</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-[9px] text-bb-muted">
                            <div>
                                <p class="mb-2">• <span class="text-white">Gunakan DCA dengan bijak</span> - hanya untuk coins dengan fundamental kuat</p>
                                <p class="mb-2">• <span class="text-white">Set TP lebih besar dari SL</span> - Risk/Reward ratio minimal 1:1.5</p>
                                <p>• <span class="text-white">Trailing Stop aktif setelah</span> mencapai 50% dari target TP</p>
                            </div>
                            <div>
                                <p class="mb-2">• <span class="text-white">Automation mode</span> - biarkan signal system yang entry/exit</p>
                                <p class="mb-2">• <span class="text-white">Max 3-5 posisi bersamaan</span> untuk risk management</p>
                                <p>• <span class="text-white">Review trade history</span> untuk pelajari pattern winning/losing</p>
                            </div>
                        </div>
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
                                Jika terminal mendeteksi <span class="text-bb-red font-bold">"Toxic HFT Flow"</span>, berarti algoritma robot sedang berperang secara agresif. Dalam kondisi ini, SL Anda sangat mudah terkena karena slippage instan (Whale War). Hindari entry sampai intensitas (VPIN) mereda.
                            </p>
                        </div>
                        <div class="p-5 bg-bb-dark border border-bb-blue/30 rounded-lg">
                            <h4 class="text-bb-blue font-black text-[11px] mb-3 uppercase flex items-center gap-2">🛡️ MESH RELIABILITY</h4>
                            <p class="text-[10px] text-bb-text leading-relaxed">
                                System berjalan di atas <span class="text-bb-blue font-bold">Adaptive Data Mesh</span>. Jika koneksi P2P melambat di bawah 25 MPS, terminal akan otomatis beralih ke <span class="text-bb-blue font-bold">Full Server Feed</span>. Status <span class="text-bb-gold font-bold">OFFLOADED</span> berarti Anda sedang menghemat CPU server berkat efisiensi P2P.
                            </p>
                        </div>
                        <div class="p-5 bg-bb-dark border border-bb-gold/30 rounded-lg">
                            <h4 class="text-bb-gold font-black text-[11px] mb-3 uppercase flex items-center gap-2">📊 SIMULATION DISCLAIMER</h4>
                            <p class="text-[10px] text-bb-text leading-relaxed">
                                Simulation mode menggunakan harga real-time dari OKX, tetapi <span class="text-bb-gold font-bold">tidak memperhitungkan slippage aktual</span>, liquidity impact, dan market depth. Hasil simulasi mungkin berbeda dari trading nyata. Gunakan sebagai alat pembelajaran, bukan jaminan profit.
                            </p>
                        </div>
                        <div class="p-5 bg-bb-dark border border-bb-green/30 rounded-lg">
                            <h4 class="text-bb-green font-black text-[11px] mb-3 uppercase flex items-center gap-2">✅ DATA FRESHNESS</h4>
                            <p class="text-[10px] text-bb-text leading-relaxed">
                                Data di-refresh setiap <span class="text-bb-green font-bold">30-100ms</span> tergantung market activity. Cache dibersihkan setiap 60 detik untuk memastikan freshness. Jika data terasa stale, refresh browser atau check koneksi WebSocket di tab Monitoring.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- KEYBOARD SHORTCUTS -->
                <section class="max-w-5xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <h2 class="text-bb-muted font-black text-sm uppercase tracking-[0.2em] bg-white/5 px-3 py-1 border-l-2 border-bb-muted">06. KEYBOARD_SHORTCUTS</h2>
                        <div class="h-px flex-1 bg-bb-border"></div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        ${renderShortcut('1-9', 'Switch tabs 1-9')}
                        ${renderShortcut('ESC', 'Close modals')}
                        ${renderShortcut('R', 'Refresh data')}
                        ${renderShortcut('/', 'Quick search')}
                    </div>
                </section>

                <!-- FINAL NOTE -->
                <div class="max-w-4xl mx-auto pt-10 border-t border-bb-border">
                    <div class="bg-bb-gold/5 p-6 rounded-lg text-[11px] text-bb-gold font-bold italic text-center leading-relaxed font-mono">
                        "Data provides the edge. Execution determines the legacy." - MISSION CONTROL OPS v6.0
                    </div>
                    <p class="text-center text-[8px] text-bb-muted mt-4 uppercase tracking-widest">
                        Built with ❤️ for Crypto Traders • Real-time OKX Data • P2P Mesh Network
                    </p>
                </div>

            </div>
        </div>
    `;

    // Start animation loop when rendered
    startAnimation();
}

export function stop() {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
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
    // const elReason = document.getElementById('tel-health-reason'); // Removed in new layout
    if (elNodes) {
        elNodes.innerText = `${stats.peerCount || 0} PEERS`;
    }

    // 3. Peer Table
    const elTable = document.getElementById('tel-peer-table');
    if (elTable && stats.peers) {
        if (stats.peers.length === 0) {
            elTable.innerHTML = `<tr><td colspan="4" class="p-10 text-center opacity-20 uppercase tracking-widest text-xs italic">Searching for Mesh Neighbors...</td></tr>`;
        } else {
            elTable.innerHTML = stats.peers.map(p => {
                const isSuper = p.isSuper;
                const statusColor = p.channelState === 'open' ? 'text-bb-green' : 'text-bb-red';
                const rx = p.received || 0;
                const tx = p.sent || 0;
                const rtt = p.rtt || 0;
                // const load = Math.min(100, Math.round((rx / (Math.max(1, mStats.mps) * 10)) * 100)); 

                return `
                    <tr class="hover:bg-white/5 transition-colors group">
                        <td class="p-3 text-white font-bold opacity-70 group-hover:opacity-100 font-mono flex items-center gap-2">
                             <span class="w-1.5 h-1.5 rounded-full ${isSuper ? 'bg-bb-gold' : 'bg-bb-green'} shadow-[0_0_4px_currentColor]"></span>
                            ${p.id.substr(0, 8)}...
                        </td>
                        <td class="p-3 text-center">
                            <span class="px-1.5 py-0.5 rounded-sm ${isSuper ? 'bg-bb-gold/20 text-bb-gold' : 'bg-white/5 text-bb-muted'} text-[7px] font-black uppercase">
                                ${isSuper ? 'BACKBONE' : 'EDGE'}
                            </span>
                        </td>
                        <td class="p-3 text-center">
                            <span class="${rtt < 50 ? 'text-bb-green' : rtt < 150 ? 'text-bb-gold' : 'text-bb-red'} font-mono">${rtt}ms</span>
                        </td>
                        <td class="p-3 text-right text-[8px] text-bb-muted font-mono">
                             Rx:${rx} / Tx:${tx}
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // 4. Update Bandwidth Historic Data (Logic from viewP2P.js)
    let totalRx = 0, totalTx = 0;
    if (stats.peers) {
        stats.peers.forEach(p => { totalRx += p.received || 0; totalTx += p.sent || 0; });
    }
    const currentTotal = totalRx + totalTx;

    // Calculate delta if we have previous frame data
    if (lastStats && lastStats._prevTotal !== undefined) {
        const delta = currentTotal - lastStats._prevTotal;
        bandwidthHistory.push(delta);
        bandwidthHistory.shift();

        const elAct = document.getElementById('p2p-current-activity');
        if (elAct) elAct.innerText = `${delta} pkts/tick`;
    }
    // Store current total in stats object for next frame comparison
    // Note: Mutating stats object which is passed by reference from p2p module. 
    // This is checking if we should store it locally or on the stats obj. 
    // Storing on stats obj is fine as it persists in the P2P module instance usually, 
    // but here stats comes from p2p.getStats().
    stats._prevTotal = currentTotal;
}

function startAnimation() {
    if (animationId) cancelAnimationFrame(animationId);

    // Topology Canvas
    const canvasTopo = document.getElementById('p2p-topology-canvas');
    const ctxTopo = canvasTopo?.getContext('2d');

    // Bandwidth Canvas
    const canvasBw = document.getElementById('p2p-bandwidth-canvas');
    const ctxBw = canvasBw?.getContext('2d');

    if (!canvasTopo || !canvasBw) return;

    // Resize handler
    const resize = () => {
        if (!canvasTopo || !canvasBw) return;
        const rectT = canvasTopo.getBoundingClientRect();
        canvasTopo.width = rectT.width;
        canvasTopo.height = rectT.height;

        const rectB = canvasBw.getBoundingClientRect();
        canvasBw.width = rectB.width;
        canvasBw.height = rectB.height;
    };
    // Initial resize
    resize();
    // We could add window resize listener but simplistic approach for now

    /* --- TOPOLOGY RENDERER --- */
    const drawTopo = () => {
        if (!ctxTopo || !canvasTopo) return;

        ctxTopo.clearRect(0, 0, canvasTopo.width, canvasTopo.height);
        const cx = canvasTopo.width / 2;
        const cy = canvasTopo.height / 2;

        // Draw Center (YOU)
        ctxTopo.beginPath();
        ctxTopo.arc(cx, cy, 8, 0, Math.PI * 2);
        ctxTopo.fillStyle = '#3b82f6'; // Blue
        ctxTopo.shadowColor = '#3b82f6';
        ctxTopo.shadowBlur = 15;
        ctxTopo.fill();
        ctxTopo.shadowBlur = 0;

        ctxTopo.fillStyle = 'white';
        ctxTopo.font = 'bold 10px monospace';
        ctxTopo.textAlign = 'center';
        ctxTopo.fillText('YOU', cx, cy + 20);

        if (lastStats && lastStats.peers) {
            const time = Date.now() * 0.001;
            lastStats.peers.forEach((p, i) => {
                const count = lastStats.peers.length;
                // Distribute nodes in a circle
                const angle = (i / Math.max(1, count)) * Math.PI * 2 + (time * 0.1);
                const radius = 100 + Math.sin(time + i) * 10; // Dynamic radius

                const px = cx + Math.cos(angle) * radius;
                const py = cy + Math.sin(angle) * radius;

                // Line
                ctxTopo.beginPath();
                ctxTopo.moveTo(cx, cy);
                ctxTopo.lineTo(px, py);
                ctxTopo.strokeStyle = 'rgba(255,255,255,0.1)';
                ctxTopo.lineWidth = 1;
                ctxTopo.stroke();

                // Node
                ctxTopo.beginPath();
                ctxTopo.arc(px, py, 6, 0, Math.PI * 2);
                ctxTopo.fillStyle = p.isSuper ? '#fbbf24' : '#22c55e'; // Gold or Green
                ctxTopo.shadowColor = ctxTopo.fillStyle;
                ctxTopo.shadowBlur = 10;
                ctxTopo.fill();
                ctxTopo.shadowBlur = 0;

                // Label
                ctxTopo.fillStyle = 'rgba(255,255,255,0.7)';
                ctxTopo.font = '8px monospace';
                ctxTopo.fillText(p.id.substr(0, 4), px, py + 15);
            });
        }
    };

    /* --- BANDWIDTH RENDERER --- */
    const drawBw = () => {
        if (!ctxBw || !canvasBw) return;

        ctxBw.clearRect(0, 0, canvasBw.width, canvasBw.height);
        const w = canvasBw.width;
        const h = canvasBw.height;

        // Grid
        ctxBw.strokeStyle = 'rgba(255,255,255,0.05)';
        ctxBw.beginPath();
        for (let i = 0; i < w; i += 40) { ctxBw.moveTo(i, 0); ctxBw.lineTo(i, h); }
        for (let i = 0; i < h; i += 40) { ctxBw.moveTo(0, i); ctxBw.lineTo(w, i); }
        ctxBw.stroke();

        // Data Line
        if (bandwidthHistory.length > 1) {
            const maxVal = Math.max(10, ...bandwidthHistory);
            const step = w / (bandwidthHistory.length - 1);

            ctxBw.beginPath();
            ctxBw.moveTo(0, h - (bandwidthHistory[0] / maxVal) * h);

            for (let i = 1; i < bandwidthHistory.length; i++) {
                const x = i * step;
                const y = h - (bandwidthHistory[i] / maxVal) * (h * 0.8) - 5;
                ctxBw.lineTo(x, y);
            }

            // Gradient Fill
            ctxBw.lineTo(w, h);
            ctxBw.lineTo(0, h);
            ctxBw.closePath();
            const grad = ctxBw.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, 'rgba(34, 197, 94, 0.5)'); // Green
            grad.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
            ctxBw.fillStyle = grad;
            ctxBw.fill();

            // Stroke on top
            ctxBw.beginPath();
            ctxBw.moveTo(0, h - (bandwidthHistory[0] / maxVal) * h);
            for (let i = 1; i < bandwidthHistory.length; i++) {
                const x = i * step;
                const y = h - (bandwidthHistory[i] / maxVal) * (h * 0.8) - 5;
                ctxBw.lineTo(x, y);
            }
            ctxBw.strokeStyle = '#22c55e';
            ctxBw.lineWidth = 2;
            ctxBw.stroke();
        }
    };

    const loop = () => {
        drawTopo();
        drawBw();
        animationId = requestAnimationFrame(loop);
    };
    loop();
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

function renderFeatureCard(icon, title, desc, features) {
    return `
        <div class="p-4 bg-bb-panel border border-bb-border rounded-lg hover:border-bb-gold/30 transition-all group">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-xl">${icon}</span>
                <h3 class="text-white font-black text-[11px] uppercase group-hover:text-bb-gold transition-colors">${title}</h3>
            </div>
            <p class="text-[9px] text-bb-muted leading-relaxed mb-3">${desc}</p>
            <ul class="space-y-1">
                ${features.map(f => `<li class="text-[8px] text-bb-text flex items-center gap-1.5">
                    <span class="w-1 h-1 bg-bb-gold/50 rounded-full"></span>${f}
                </li>`).join('')}
            </ul>
        </div>
    `;
}

function renderMiniFeature(icon, title, desc) {
    return `
        <div class="p-3 bg-bb-panel border border-bb-border/50 rounded hover:bg-white/5 transition-all">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-sm">${icon}</span>
                <span class="text-white font-black text-[9px] uppercase">${title}</span>
            </div>
            <p class="text-[8px] text-bb-muted leading-relaxed">${desc}</p>
        </div>
    `;
}

function renderShortcut(key, action) {
    return `
        <div class="p-2 bg-bb-panel border border-bb-border/50 rounded flex items-center gap-2">
            <kbd class="px-2 py-0.5 bg-black/50 border border-white/20 rounded text-[9px] font-mono text-white">${key}</kbd>
            <span class="text-[8px] text-bb-muted">${action}</span>
        </div>
    `;
}
