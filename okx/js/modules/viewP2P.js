
let lastStats = null;
let animationId = null;
let bandwidthHistory = Array(60).fill(0); // 60 seconds rolling window

export function render(container) {
    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-sans overflow-hidden">
            <!-- TOP SUB-NAV -->
            <div class="flex items-center justify-between bg-bb-panel border-b border-bb-border h-8 shrink-0 px-3">
                <div class="flex items-center gap-2">
                    <span class="text-bb-gold font-black text-[10px] uppercase tracking-widest">P2P NETWORK MATRIX</span>
                    <span id="p2p-role-badge" class="text-[9px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-bb-muted uppercase">...</span>
                </div>
                <div class="flex items-center gap-4 text-[9px] text-bb-muted">
                    <span>STATUS: <span id="p2p-status-text" class="text-white font-bold">CONNECTING</span></span>
                    <span>PEERS: <span id="p2p-peer-count" class="text-white font-bold">0</span></span>
                </div>
            </div>

            <!-- CONTENT AREA -->
            <div class="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-y-auto">
                
                <!-- LEFT COLUMN: TOPOLOGY -->
                <div class="flex flex-col gap-4">
                    <!-- GRAPH CANVAS -->
                    <div class="bg-bb-dark border border-bb-border rounded-lg relative overflow-hidden flex-1 min-h-[300px]">
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

                    <!-- CONNECTION TABLE -->
                    <div class="bg-bb-dark border border-bb-border rounded-lg p-3 h-48 flex flex-col overflow-hidden">
                        <h3 class="text-bb-blue font-black text-[10px] uppercase mb-2">ACTIVE CONNECTIONS</h3>
                        <div class="flex-1 overflow-y-auto scrollbar-thin">
                            <table class="w-full text-[9px] text-left border-collapse">
                                <thead class="text-bb-muted sticky top-0 bg-bb-dark">
                                    <tr>
                                        <th class="py-1">PEER ID</th>
                                        <th class="py-1 text-center">ROLE</th>
                                        <th class="py-1 text-right">RTT</th>
                                        <th class="py-1 text-right">ACTIVITY</th>
                                    </tr>
                                </thead>
                                <tbody id="p2p-conn-table" class="text-bb-text divide-y divide-white/5">
                                    <!-- Injected -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- RIGHT COLUMN: METRICS -->
                <div class="flex flex-col gap-4">
                    <!-- BANDWITH CHART -->
                    <div class="bg-bb-dark border border-bb-border rounded-lg p-3 h-64 flex flex-col">
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="text-bb-green font-black text-[10px] uppercase">P2P BANDWIDTH ACTIVITY (Est. Packets/s)</h3>
                            <span id="p2p-current-activity" class="text-[9px] font-mono text-bb-green">0 p/s</span>
                        </div>
                        <div class="flex-1 relative overflow-hidden bg-black/20 rounded border border-white/5">
                            <canvas id="p2p-bandwidth-canvas" class="w-full h-full block"></canvas>
                        </div>
                    </div>

                    <!-- STATS GRID -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-3 bg-bb-panel border border-bb-border rounded">
                            <div class="text-[9px] text-bb-muted uppercase mb-1">Total Received</div>
                            <div class="text-lg font-black text-white" id="p2p-stat-rx">0</div>
                            <div class="text-[8px] text-bb-green mt-1">Packets</div>
                        </div>
                        <div class="p-3 bg-bb-panel border border-bb-border rounded">
                            <div class="text-[9px] text-bb-muted uppercase mb-1">Total Sent</div>
                            <div class="text-lg font-black text-white" id="p2p-stat-tx">0</div>
                            <div class="text-[8px] text-bb-blue mt-1">Packets</div>
                        </div>
                        <div class="p-3 bg-bb-panel border border-bb-border rounded">
                            <div class="text-[9px] text-bb-muted uppercase mb-1">Avg Latency</div>
                            <div class="text-lg font-black text-white" id="p2p-stat-rtt">0ms</div>
                            <div class="text-[8px] text-bb-muted mt-1">Round Trip Time</div>
                        </div>
                        <div class="p-3 bg-bb-panel border border-bb-border rounded">
                            <div class="text-[9px] text-bb-muted uppercase mb-1">Efficiency Score</div>
                            <div class="text-lg font-black text-bb-gold">100%</div>
                            <div class="text-[8px] text-bb-muted mt-1">Mesh Health</div>
                        </div>
                    </div>
                    
                    <div class="bg-bb-gold/5 border border-bb-gold/20 p-3 rounded mt-auto">
                        <h4 class="text-bb-gold font-bold text-[9px] uppercase mb-1">📡 P2P OFFLOAD ENGINE</h4>
                        <p class="text-[9px] text-bb-muted leading-relaxed">
                            This node is part of the decentralized institutional data mesh. By connecting to peers, you reduce server load and receive distributed market signals. SuperPeers act as relay nodes.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    `;

    startAnimation();
}

export function update(stats) {
    if (!stats) return;
    lastStats = stats;

    // 1. Update Header Info
    const roleEl = document.getElementById('p2p-role-badge');
    const statusEl = document.getElementById('p2p-status-text');
    const countEl = document.getElementById('p2p-peer-count');

    if (roleEl) {
        roleEl.innerText = stats.isSuperPeer ? 'SUPERPEER NODE' : 'MESH CLIENT';
        roleEl.className = `text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${stats.isSuperPeer ? 'border-bb-gold/30 bg-bb-gold/10 text-bb-gold' : 'border-bb-blue/30 bg-bb-blue/10 text-bb-blue'}`;
    }
    if (statusEl) {
        statusEl.innerText = stats.peerCount > 0 ? 'ACTIVE' : 'STANDBY';
        statusEl.className = stats.peerCount > 0 ? 'text-bb-green font-bold animate-pulse' : 'text-bb-muted font-bold';
    }
    if (countEl) countEl.innerText = stats.peerCount;

    // 2. Update Table
    const tbody = document.getElementById('p2p-conn-table');
    if (tbody) {
        if (stats.peers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center italic text-bb-muted opacity-50">Scanning for peers...</td></tr>`;
        } else {
            tbody.innerHTML = stats.peers.map(p => `
                <tr class="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                    <td class="py-2 flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full ${p.isSuper ? 'bg-bb-gold' : 'bg-bb-green'} shadow-[0_0_4px_currentColor]"></span>
                        <span class="font-mono font-bold">${p.id.substr(0, 8)}...</span>
                    </td>
                    <td class="py-2 text-center">
                        <span class="text-[7px] uppercase px-1 py-0.5 rounded ${p.isSuper ? 'bg-bb-gold/20 text-bb-gold' : 'bg-bb-green/20 text-bb-green'}">${p.isSuper ? 'SUPER' : 'PEER'}</span>
                    </td>
                    <td class="py-2 text-right font-mono ${p.rtt > 150 ? 'text-bb-red' : 'text-bb-text'}">${p.rtt || '-'}ms</td>
                    <td class="py-2 text-right font-mono text-[8px] text-bb-muted">Rx:${p.received} / Tx:${p.sent}</td>
                </tr>
            `).join('');
        }
    }

    // 3. Update Stats Grid
    let totalRx = 0, totalTx = 0, totalRtt = 0;
    stats.peers.forEach(p => { totalRx += p.received || 0; totalTx += p.sent || 0; totalRtt += p.rtt || 0; });
    const avgRtt = stats.peers.length > 0 ? Math.round(totalRtt / stats.peers.length) : 0;

    const elRx = document.getElementById('p2p-stat-rx');
    const elTx = document.getElementById('p2p-stat-tx');
    const elRtt = document.getElementById('p2p-stat-rtt');

    if (elRx) elRx.innerText = totalRx.toLocaleString();
    if (elTx) elTx.innerText = totalTx.toLocaleString();
    if (elRtt) elRtt.innerText = avgRtt + 'ms';

    // 4. Update Bandwidth Historic Data
    // We compare totalRx + totalTx with prev frame to estimate "speed"
    // Ideally p2p.js would give us rate, but we can derive delta.
    const currentTotal = totalRx + totalTx;
    if (lastStats && lastStats._prevTotal !== undefined) {
        const delta = currentTotal - lastStats._prevTotal;
        bandwidthHistory.push(delta); // Simulates activity per update tick
        bandwidthHistory.shift();

        const elAct = document.getElementById('p2p-current-activity');
        if (elAct) elAct.innerText = `${delta} pkts/tick`;
    }
    stats._prevTotal = currentTotal; // Store for next frame
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
        const rectT = canvasTopo.getBoundingClientRect();
        canvasTopo.width = rectT.width;
        canvasTopo.height = rectT.height;

        const rectB = canvasBw.getBoundingClientRect();
        canvasBw.width = rectB.width;
        canvasBw.height = rectB.height;
    };
    resize();
    // Note: window resize listener would be ideal but we rely on simple polling for now or css

    /* --- TOPOLOGY RENDERER (Force Directed-ish Star) --- */
    let nodes = [];

    const drawTopo = () => {
        if (!document.getElementById('p2p-topology-canvas')) return; // Exit if unmounted

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
                const angle = (i / count) * Math.PI * 2 + (time * 0.1); // Slow rotation
                const radius = 80 + Math.sin(time + i) * 10; // Breathing effect

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

    /* --- BANDWIDTH RENDERER (Scrolling Line) --- */
    const drawBw = () => {
        if (!document.getElementById('p2p-bandwidth-canvas')) return;

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
                const y = h - (bandwidthHistory[i] / maxVal) * (h * 0.8) - 5; // 0.8 scale to keep padding
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

export function stop() {
    if (animationId) cancelAnimationFrame(animationId);
    lastStats = null;
}
