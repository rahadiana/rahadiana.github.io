import { formatTime } from './utils.js';

// Import View Modules
import * as ViewMain from './modules/viewMain.js';
import * as ViewGlobal from './modules/viewGlobal.js';
import * as ViewDecision from './modules/viewDecision.js';
import * as ViewDerivatives from './modules/viewDerivatives.js';
import * as ViewRegime from './modules/viewRegime.js';
import * as ViewMicrostructure from './modules/viewMicrostructure.js';
import * as ViewLiquidity from './modules/viewLiquidity.js';
import * as ViewLiquidations from './modules/viewLiquidations.js';
import * as ViewMonitoring from './modules/viewMonitoring.js';
import * as ViewVol from './modules/viewVol.js';
import * as InfoView from './modules/viewInfo.js';
import * as ViewVisual from './modules/viewVisual.js';
import * as Sidebar from './modules/sidebar.js';
import * as ViewStrategy from './modules/viewStrategy.js';
import * as ViewP2P from './modules/viewP2P.js';
import * as ViewSynthesis from './modules/viewSynthesis.js';
import * as ViewAutomation from './modules/viewAutomation.js';
import * as ViewSimulation from './modules/viewSimulation.js';
import * as ViewSignalComposer from './modules/viewSignalComposer.js';
import * as ViewAlerts from './modules/viewAlerts.js';
import * as ViewBacktest from './modules/viewBacktest.js';
import * as ViewPortfolio from './modules/viewPortfolio.js';
import './modules/domDelegates.js';
import * as ViewRisk from './modules/viewRisk.js';
import * as ViewOrderSim from './modules/viewOrderSim.js';
import * as ViewSocial from './modules/viewSocial.js';
import * as ViewInstitutional from './modules/viewInstitutional.js';
import * as ViewComponents from './modules/viewComponents.js';
import P2PMesh from './p2p.js';
import { initAutoAttach } from './detectors/initHiddenLiquidity.js';

// Configuration
// const WS_URL = 'ws://localhost:8040';
const WS_URL = 'wss://okx-ws.nusantaracode.com/';

const VIEWS = {
    'GLOBAL': ViewGlobal,
    'STRATEGY': ViewStrategy,
    'VISUAL': ViewVisual,
    'MAIN': ViewDecision,
    'DERIVATIVES': ViewDerivatives,
    'ANALYTICS': ViewRegime,
    'SIGNALS': ViewMicrostructure,
    'LEVELS': ViewLiquidity,
    'LIQUIDATIONS': ViewLiquidations,
    'MONITORING': ViewMonitoring,
    'VOL': ViewVol,
    'SYNTHESIS': ViewSynthesis,
    'AUTOMATION': ViewAutomation,
    'SIMULATION': ViewSimulation,
    'COMPOSER': ViewSignalComposer,
    'ALERTS': ViewAlerts,
    'SOCIAL': ViewSocial,
    'BACKTEST': ViewBacktest,
    'PORTFOLIO': ViewPortfolio,
    'RISK': ViewRisk,
    'ORDERS': ViewOrderSim,
    'INSTITUTIONAL': ViewInstitutional,
    'COMPONENTS': ViewComponents
};

// State
let ws = null;
let p2p = null;
let currentTab = 'GLOBAL';
let currentSubTab = 'MAIN';
let reconnectInterval = null;
// Only attempt automatic reconnects when this flag is true. Set to false
// when intentionally closing the socket (e.g., user logout or switching modes).
let shouldReconnect = true;

const marketState = {};
window.marketState = marketState; // Expose for Signal Composer
let selectedCoin = null;
let selectedProfile = 'MODERATE';
let selectedTimeframe = '15MENIT';

// Packet Deduplication & Health Monitoring
const seenPackets = new Set();
const PACKET_CACHE_SIZE = 1000;
const meshStats = {
    wsCount: 0,
    p2pCount: 0,
    isOffloaded: false,
    lastP2PTime: Date.now(),
    mps: 0,
    messageCount: 0
};

// UI Elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const clockEl = document.getElementById('clock');
const viewContainer = document.getElementById('view-container');
const tickerTape = document.getElementById('ticker-tape');
const coinListContainer = document.getElementById('coin-list');
const detailsSubnav = document.getElementById('details-subnav');

// ⭐ AGGRESSIVE MESH HEALTH MONITOR (3s reaction time)
setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (p2p && p2p.isSuperPeer) return;

    const total = meshStats.wsCount + meshStats.p2pCount;
    // We check every 3 seconds. 75 updates / 3s = 25 MPS.
    const averageMPS = total / 3;

    // 1. THROUGHPUT GUARD: Immediate restoration if speed drops
    if (meshStats.isOffloaded && averageMPS < 25 && total > 5) {
        console.warn(`[MESH_LOW_SPEED] Fallback: Only ${averageMPS.toFixed(1)} MPS. Restoring server feed.`);
        meshStats.isOffloaded = false;
        safeSend({ type: 'mesh:starved' });
        updateStatusText('STREAMS RESTORED / LOW SPEED');
    }

    // 2. MESH HEALTHY: Offload if speed is high and mesh is efficient
    const p2pRatio = meshStats.p2pCount / total;
    if (!meshStats.isOffloaded && p2pRatio > 0.7 && averageMPS > 35) {
        console.log(`[MESH_HEALTHY] Offloading: ${Math.round(p2pRatio * 100)}% efficiency at ${averageMPS.toFixed(1)} MPS.`);
        meshStats.isOffloaded = true;
        safeSend({ type: 'mesh:healthy' });
        updateStatusText('MESH ACTIVE / OFFLOADED');
    }

    // 3. STALE PROTECTION
    const staleTime = Date.now() - meshStats.lastP2PTime;
    if (meshStats.isOffloaded && (staleTime > 5000 || p2pRatio < 0.4)) {
        console.warn(`[MESH_STALE] Restoring due to latency/efficiency drift.`);
        meshStats.isOffloaded = false;
        safeSend({ type: 'mesh:starved' });
        updateStatusText('STREAMS RESTORED / STALE');
    }

    // Update status text with current mode if not overwritten
    if (meshStats.isOffloaded) {
        updateStatusText('READY [P] / OFFLOADED');
    } else {
        const prefix = p2p?.isSuperPeer ? 'READY [S] / PROTECTED' : 'READY [P] / FULL FEED';
        updateStatusText(prefix);
    }

    // Reset counters
    meshStats.wsCount = 0;
    meshStats.p2pCount = 0;
}, 3000);

function updateStatusText(text) {
    if (statusText) statusText.innerText = text;
}

// ⭐ MPS (MESSAGES PER SECOND) MONITOR
setInterval(() => {
    const mpsEl = document.getElementById('mps-text');
    if (mpsEl) {
        const mps = Math.round(meshStats.messageCount / 2); // Divide by 2 since interval is 2s
        mpsEl.innerText = `${mps} MPS`;

        // Dynamic coloring based on health
        if (mps === 0) {
            mpsEl.className = 'text-bb-red font-black ml-2 tabular-nums';
        } else if (mps < 5) {
            mpsEl.className = 'text-bb-gold font-black ml-2 tabular-nums';
        } else {
            mpsEl.className = 'text-bb-blue font-black ml-2 tabular-nums';
        }
    }
    meshStats.messageCount = 0;
}, 2000);


// ============================================
// TAB MANAGER & UI LOGIC
// ============================================

function initTabs() {
    if (coinListContainer) {
        coinListContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.coin-item');
            if (item) {
                const coin = item.getAttribute('data-coin');
                if (coin) selectCoin(coin, true);
            }
        });
    }

    const topButtons = document.querySelectorAll('.tab-btn');
    topButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    const subButtons = document.querySelectorAll('.subtab-btn');
    subButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const subTabName = btn.getAttribute('data-subtab');
            switchSubTab(subTabName);
        });
    });

    const searchInput = document.getElementById('coin-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            Sidebar.renderList(coinListContainer, marketState, selectedCoin, selectCoin);
        });
    }

    const profileSelector = document.getElementById('profile-selector');
    if (profileSelector) {
        profileSelector.addEventListener('change', (e) => {
            selectedProfile = e.target.value;
            updateDetailContext();
            updateCurrentView();
        });
    }

    const timeframeSelector = document.getElementById('timeframe-selector');
    if (timeframeSelector) {
        timeframeSelector.addEventListener('change', (e) => {
            selectedTimeframe = e.target.value;
            updateDetailContext();
            updateCurrentView();
        });
    }

    ViewGlobal.init((coin) => {
        selectCoin(coin, true);
    });

    switchTab('GLOBAL');
}

function switchTab(tabName) {
    if (!['GLOBAL', 'STRATEGY', 'DETAILS', 'VISUAL', 'INFO', 'P2P', 'AUTOMATION', 'SIMULATION', 'COMPOSER', 'ALERTS', 'BACKTEST', 'PORTFOLIO', 'RISK', 'ORDERS'].includes(tabName)) return;

    // Lifecycle cleanup for outgoing tab/subtab
    if (currentTab === 'DETAILS' && tabName !== 'DETAILS') {
        const activeSubView = VIEWS[currentSubTab];
        if (activeSubView && typeof activeSubView.stop === 'function') {
            activeSubView.stop();
        }
    }

    // Lifecycle cleanup when leaving Alerts
    if (currentTab === 'ALERTS' && tabName !== 'ALERTS') {
        if (ViewAlerts && typeof ViewAlerts.stop === 'function') ViewAlerts.stop();
    }

    currentTab = tabName;

    const tabNav = document.getElementById('tab-nav');
    if (tabNav) {
        const buttons = tabNav.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active', 'text-white', 'border-bb-gold', 'bg-bb-gold/10');
                btn.classList.remove('text-bb-muted', 'border-transparent');
            } else {
                btn.classList.remove('active', 'text-white', 'border-bb-gold', 'bg-bb-gold/10');
                btn.classList.add('text-bb-muted', 'border-transparent');
            }
        });
    }

    if (tabName === 'DETAILS') {
        detailsSubnav.classList.remove('hidden');
        updateDetailContext();
        switchSubTab(currentSubTab);
    } else if (tabName === 'INFO') {
        detailsSubnav.classList.add('hidden');
        InfoView.render(viewContainer);
    } else if (tabName === 'P2P') {
        detailsSubnav.classList.add('hidden');
        ViewP2P.render(viewContainer);
    } else if (tabName === 'ALERTS') {
        detailsSubnav.classList.add('hidden');
        ViewAlerts.render(viewContainer);
        if (typeof ViewAlerts.init === 'function') ViewAlerts.init();
    } else if (tabName === 'BACKTEST') {
        detailsSubnav.classList.add('hidden');
        ViewBacktest.render(viewContainer);
        if (typeof ViewBacktest.init === 'function') ViewBacktest.init();
    } else if (tabName === 'PORTFOLIO') {
        detailsSubnav.classList.add('hidden');
        ViewPortfolio.render(viewContainer);
        if (typeof ViewPortfolio.init === 'function') ViewPortfolio.init();
    } else if (tabName === 'RISK') {
        detailsSubnav.classList.add('hidden');
        ViewRisk.render(viewContainer);
        if (typeof ViewRisk.init === 'function') ViewRisk.init();
    } else if (tabName === 'ORDERS') {
        detailsSubnav.classList.add('hidden');
        ViewOrderSim.render(viewContainer);
        if (typeof ViewOrderSim.init === 'function') ViewOrderSim.init();
    } else if (tabName === 'AUTOMATION') {
        detailsSubnav.classList.add('hidden');
        ViewAutomation.render(viewContainer);
    } else if (tabName === 'SIMULATION') {
        detailsSubnav.classList.add('hidden');
        ViewSimulation.render(viewContainer);
    } else if (tabName === 'COMPOSER') {
        detailsSubnav.classList.add('hidden');
        ViewSignalComposer.render(viewContainer);
    } else {
        detailsSubnav.classList.add('hidden');
        if (tabName === 'GLOBAL') ViewGlobal.render(viewContainer);
        else if (tabName === 'STRATEGY') ViewStrategy.render(viewContainer);
        else if (tabName === 'VISUAL') ViewVisual.render(viewContainer);
        updateCurrentView();
    }
}

function switchSubTab(subTabName) {
    if (!VIEWS[subTabName]) return;

    // Lifecycle cleanup for outgoing subtab
    const prevView = VIEWS[currentSubTab];
    if (prevView && typeof prevView.stop === 'function') {
        prevView.stop();
    }

    currentSubTab = subTabName;

    const buttons = document.querySelectorAll('.subtab-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-subtab') === subTabName) {
            btn.classList.add('active', 'text-bb-gold', 'border-bb-gold');
            btn.classList.remove('text-bb-muted', 'border-transparent');
        } else {
            btn.classList.remove('active', 'text-bb-gold', 'border-bb-gold');
            btn.classList.add('text-bb-muted', 'border-transparent');
        }
    });



    VIEWS[subTabName].render(viewContainer);
    updateCurrentView();
}

function selectCoin(coin, isManual = false) {
    if (!coin) return;
    selectedCoin = coin;
    // Expose current selection to modules that read global selection
    window.selectedCoin = selectedCoin;

    // ⭐ TRANSITION GUARD: Force Full Feed on coin change
    if (meshStats.isOffloaded) {
        console.log(`[TRANSITION] Asset switch detected (${coin}). Restoring Full Server Feed.`);
        meshStats.isOffloaded = false;
        safeSend({ type: 'mesh:starved' });
    }

    if (isManual) {
        const detailsBtn = document.querySelector('[data-tab="DETAILS"]');
        if (detailsBtn) detailsBtn.classList.remove('hidden');
        switchTab('DETAILS');
    }
    Sidebar.renderList(coinListContainer, marketState, selectedCoin, selectCoin);
    updateDetailContext();
    updateCurrentView();
}

function updateDetailContext() {
    const elCoin = document.getElementById('active-coin-label');
    const elTf = document.getElementById('active-tf-label');
    const elProf = document.getElementById('active-profile-label');
    if (elCoin) elCoin.innerText = selectedCoin || '---';
    if (elTf) elTf.innerText = selectedTimeframe || '---';
    if (elProf) elProf.innerText = selectedProfile || '---';
}

function updateCurrentView() {
    if (currentTab === 'GLOBAL') {
        ViewGlobal.update(marketState, selectedProfile, selectedTimeframe);
        return;
    }
    if (currentTab === 'STRATEGY') {
        ViewStrategy.update(marketState);
        return;
    }
    if (currentTab === 'VISUAL') {
        ViewVisual.update(marketState);
        return;
    }
    if (currentTab === 'INFO') {
        if (p2p) InfoView.update(p2p.getStats());
        return;
    }
    if (currentTab === 'P2P') {
        if (p2p) ViewP2P.update(p2p.getStats());
        return;
    }
    if (currentTab === 'BACKTEST') {
        if (VIEWS['BACKTEST'] && typeof VIEWS['BACKTEST'].update === 'function') VIEWS['BACKTEST'].update(marketState, selectedProfile, selectedTimeframe);
        return;
    }
    if (currentTab === 'PORTFOLIO') {
        if (VIEWS['PORTFOLIO'] && typeof VIEWS['PORTFOLIO'].update === 'function') VIEWS['PORTFOLIO'].update(marketState, selectedProfile, selectedTimeframe);
        return;
    }
    if (currentTab === 'RISK') {
        if (VIEWS['RISK'] && typeof VIEWS['RISK'].update === 'function') VIEWS['RISK'].update(marketState, selectedProfile, selectedTimeframe);
        return;
    }
    if (currentTab === 'ALERTS') {
        if (typeof ViewAlerts.update === 'function') ViewAlerts.update(marketState, selectedProfile, selectedTimeframe);
        return;
    }

    if (!selectedCoin || !marketState[selectedCoin]) return;
    const viewKey = currentTab === 'DETAILS' ? currentSubTab : currentTab;
    if (VIEWS[viewKey]) {
        VIEWS[viewKey].update(marketState[selectedCoin], selectedProfile, selectedTimeframe);
    }
}

// ============================================
// WEBSOCKET & P2P LOGIC
// ============================================

async function decompressZlib(data) {
    try {
        // Data can be Blob or ArrayBuffer
        let uint8Array;
        if (data instanceof Blob) {
            const buffer = await data.arrayBuffer();
            uint8Array = new Uint8Array(buffer);
        } else {
            uint8Array = new Uint8Array(data);
        }

        // pako.inflate auto-detects zlib/gzip header
        const decompressed = pako.inflate(uint8Array, { to: 'string' });
        return decompressed;
    } catch (err) {
        console.error('Decompression Error:', err);
        return null;
    }
}

function checkWebRTCSupport() {
    return !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
}

function detectBrowser() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edge')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edge') || ua.includes('edg/')) return 'Edge';
    if (ua.includes('opera') || ua.includes('opr/')) return 'Opera';
    return 'Unknown';
}

function safeSend(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
        return true;
    }
    return false;
}

function sendWebRTCCapability() {
    const hasWebRTC = checkWebRTCSupport();
    console.log(`[SECURITY] Mesh Capability: ${hasWebRTC ? 'Verified' : 'Failed'}`);

    safeSend({
        type: 'webrtc:capability',
        hasWebRTC: hasWebRTC,
        browser: detectBrowser(),
        platform: navigator.platform,
        userAgent: navigator.userAgent
    });
}

function connect() {
    // Prevent creating duplicate sockets if one is already open or connecting
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('[WS] connect() skipped: socket already open/connecting');
        return;
    }

    ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer'; // Optimization for pako

    ws.onopen = () => {
        // ... (keep existing onopen logic)
        // Stop any reconnect loop immediately once we have a live socket
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        console.log('Main WS Connected');
        statusDot.className = 'w-1.5 h-1.5 rounded-full bg-bb-green animate-pulse';
        statusText.innerText = 'PROVING CAPABILITY...';
        statusText.className = 'text-bb-gold animate-pulse';

        // ⭐ institutional Verification: Prove WebRTC capability to server
        sendWebRTCCapability();

        // Init P2P Mesh
        p2p = new P2PMesh(ws, (data, from) => {
            try {
                if (data && data.__appType === 'social' && typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('p2p:social', { detail: { payload: data.payload, from: from } }));
                    return;
                }
            } catch (e) { }
            handleIncomingStream(data, 'P2P');
        });
        // expose for modules to broadcast
        try { window.p2p = p2p; } catch (e) { }

        // Anti-Leech Validation
        p2p.onMeshReady = () => {
            console.log('[SECURITY] Mesh Edge Active. Sending validation signal...');
            safeSend({ type: 'p2p:ready' });

            // Periodically re-assert readiness to prevent state drift
            // Keep reference so we can clear when reconnecting
            if (!p2p._readyInterval) {
                p2p._readyInterval = setInterval(() => {
                    safeSend({ type: 'p2p:ready' });
                }, 15000);
            }
        };

        if (!p2p.isSuperPeer) {
            statusText.innerText = 'VALIDATING MESH...';
            statusText.className = 'text-bb-gold animate-pulse';
        }
    };

    ws.onmessage = async (event) => {
        meshStats.messageCount++; // ⭐ Raw Throughput Accounting
        // Debug: log raw incoming message envelope to help find missing streams
        try {
            let rawType = typeof event.data;
            let size = 0;
            let preview = null;
            if (rawType === 'string') {
                size = event.data.length;
                preview = event.data.slice(0, 200);
            } else if (event.data instanceof ArrayBuffer) {
                rawType = 'ArrayBuffer';
                size = event.data.byteLength;
                preview = '[binary]';
            } else if (event.data instanceof Blob) {
                rawType = 'Blob';
                size = event.data.size;
                preview = '[binary]';
            }
            // console.debug('[WS RAW] incoming message', { rawType, size, preview });
        } catch (e) { console.debug('[WS RAW] debug error', e); }
        try {
            let payloadText;
            if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
                // Handle Compressed Binary Data (ZLIB)
                payloadText = await decompressZlib(event.data);
                if (!payloadText) return; // Skip if decompression failed
            } else {
                // Handle Standard JSON Signaling
                payloadText = event.data;
            }

            if (!payloadText || (typeof payloadText === 'string' && payloadText.trim().length === 0)) {
                console.warn('[WS] Empty payloadText received; ignoring');
                return;
            }
            let payload = null;
            try {
                payload = JSON.parse(payloadText);
            } catch (e) {
                console.error('[WS] JSON.parse failed for payloadText preview:', payloadText && payloadText.slice ? payloadText.slice(0, 200) : String(payloadText), e);
                return;
            }
            if (payload.type === 'welcome') {
                p2p.init(payload.peerId, payload.config);
                statusText.innerText = `CONNECTED [${p2p.isSuperPeer ? 'S' : 'P'}]`;

                // SuperPeers are auto-validated by server
                if (p2p.isSuperPeer) {
                    statusText.innerText = `READY [S] / PROTECTED`;
                }
            } else if (payload.type === 'webrtc:capability:ack') {
                console.log('[SECURITY] Server verified WebRTC capability.');
                if (reconnectInterval) { clearInterval(reconnectInterval); reconnectInterval = null; }
            } else if (payload.type === 'p2p:status') {
                statusText.innerText = `READY [${p2p.isSuperPeer ? 'S' : 'P'}] / ${payload.status}`;
                statusText.className = 'text-bb-green font-bold animate-pulse';
            } else if (payload.type === 'error') {
                console.error('[SERVER ERROR]', payload.msg);

                if (payload.code === 'BOT_DETECTED') {
                    alert(`ACCESS DENIED: ${payload.msg}\n\nThis system requires a real browser for Institutional P2P distribution.`);
                } else if (payload.code === 'NO_WEBRTC_CAPABILITY' || payload.code === 'NO_WEBRTC') {
                    alert(`WEBRTC ERROR: ${payload.msg}`);
                } else if (payload.code === 'P2P_VALIDATION_TIMEOUT') {
                    alert(`MESH ERROR: ${payload.msg}`);
                } else {
                    alert(`SERVER ERROR: ${payload.msg}`);
                }
            }
            else if (payload.type === 'peer-update') {
                // Normalize peer payload for backward/forward compatibility
                let peersIds = [];
                if (Array.isArray(payload.peers)) {
                    // payload.peers may be array of strings or objects {id,...}
                    peersIds = payload.peers.map(p => (typeof p === 'string') ? p : (p && p.id ? p.id : null)).filter(Boolean);
                } else if (Array.isArray(payload.peersIds)) {
                    peersIds = payload.peersIds;
                }
                const superPeers = payload.superPeers || [];
                p2p.updatePeerList(peersIds, superPeers);
            } else if (payload.type === 'offer') {
                p2p.handleOffer(payload.senderId, payload.offer);
            } else if (payload.type === 'answer') {
                p2p.handleAnswer(payload.senderId, payload.answer);
            } else if (payload.type === 'ice-candidate') {
                p2p.handleIceCandidate(payload.senderId, payload.candidate);
            } else if (payload.type === 'stream') {
                // console.log(`[WS] 📥 Stream Received: ${payload.data.coin}`);
                handleIncomingStream(payload.data, 'WS');

                // ⭐ TORRENT-STYLE: Announce chunk availability
                if (p2p && payload.data.coin) {
                    p2p.announceChunk(payload.data.coin, payload.data);
                }

                // P2P will broadcast the original raw data for efficiency
                if (p2p) p2p.broadcast(payload.data);
            } else if (payload.type === 'relay:ack') {
                console.log('[RELAY] ack from server:', payload);
            } else if (payload.type === 'relay:delivered') {
                console.log('[RELAY] delivered report:', payload);
            } else if (payload.type === 'stream-notify') {
                // Lightweight update to keep ticker alive & populate sidebar while mesh forms
                const coin = payload.coin;
                if (!marketState[coin]) marketState[coin] = { coin: coin };

                meshStats.wsCount++; // ⭐ Add to health stats
                startRenderingHeartbeat();

                // Show warning if grace period is running out
                if (payload.graceRemaining !== undefined && payload.graceRemaining < 120) {
                    statusText.innerText = `MESH PENDING: ${payload.graceRemaining}s`;
                    statusText.className = 'text-bb-red animate-pulse';
                }

                // Patch Price data for sidebar visualization
                marketState[coin].raw = {
                    ...marketState[coin].raw,
                    PRICE: { last: payload.price, percent_change_1JAM: payload.change }
                };

                updateTicker({
                    coin: payload.coin,
                    PRICE: { price: payload.price, percent_change_1JAM: payload.change }
                });

                pendingUpdates.add(coin);

            } else if (payload.type === 'raw_data') {
                // ⭐ FALLBACK: Process Raw Data directly if Stream/Relay is missing
                // This ensures Tickers/Prices move even if Calculation Nodes are offline/blocked
                const raw = payload.data;
                const coin = raw.coin;

                if (!coin) return;

                if (!marketState[coin]) marketState[coin] = { coin: coin };

                // Update Raw State
                marketState[coin].raw = deepMerge(marketState[coin].raw, raw);

                // Trigger UI Update
                startRenderingHeartbeat();
                pendingUpdates.add(coin);

                // Direct Ticker Update
                updateTicker({
                    coin: coin,
                    PRICE: raw.PRICE,
                    VOL: raw.VOL,
                    // Pass minimal signal structure to prevent UI errors
                    signals: marketState[coin].signals || {},
                    masterSignals: marketState[coin].masterSignals || {}
                });
            }
        } catch (e) {
            console.error('WS Parse/Decompress Error:', e);
        }
    };

    ws.onclose = () => {
        statusDot.className = 'w-1.5 h-1.5 rounded-full bg-bb-red';
        statusText.innerText = 'DISCONNECTED';
        statusText.className = 'text-bb-red';
        // Clear any P2P ready re-assert interval to avoid stacked timers
        if (p2p && p2p._readyInterval) {
            clearInterval(p2p._readyInterval);
            p2p._readyInterval = null;
        }
        try { if (window && window.p2p) window.p2p = null; } catch (e) { }
        // Only start reconnect loop if we should (i.e., unexpected loss).
        if (shouldReconnect && !reconnectInterval) reconnectInterval = setInterval(connect, 3000);
    };
}

// Close WebSocket intentionally. If `reconnect` is false (default), automatic
// reconnects will be disabled. Call `disconnect(true)` to close but allow
// reconnect attempts.
function disconnect(reconnect = false) {
    shouldReconnect = reconnect;
    if (ws) {
        try {
            ws.close();
        } catch (e) {
            console.warn('[WS] Error closing socket:', e.message);
        }
        ws = null;
    }
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }
}

// Expose control to the console/app for manual use
window.app = window.app || {};
window.app.disconnect = disconnect;

const pendingUpdates = new Set();
let renderingHeartbeat = null;
let lastRenderTime = 0;
const MIN_RENDER_INTERVAL = 400; // Minimum 400ms between renders

function startRenderingHeartbeat() {
    if (renderingHeartbeat) return;

    // 🎨 UI RENDERING LOOP (500ms with throttle) - For display only
    // Trading engines (Simulation/Composer) run instantly in handleIncomingStream
    renderingHeartbeat = setInterval(() => {
        if (pendingUpdates.size === 0) return;

        // Throttle: skip if last render was too recent
        const now = Date.now();
        if (now - lastRenderTime < MIN_RENDER_INTERVAL) return;
        lastRenderTime = now;

        // 1. Process all pending coins
        pendingUpdates.forEach(coin => {
            if (currentTab === 'GLOBAL' || coin === selectedCoin) {
                updateCurrentView();
            }
        });

        // 2. Batch Sidebar update (once per heartbeat)
        Sidebar.renderList(coinListContainer, marketState, selectedCoin, selectCoin);

        // 3. Execution Automation Engine (Webhook Dispatcher)
        ViewAutomation.runAutomationEngine(marketState);

        pendingUpdates.clear();
    }, 500); // 500ms Heartbeat: Better CPU efficiency for UI
}

/**
 * Deep merge two objects to prevent data clobbering in nested structures (profiles/timeframes)
 * @param {Object} target - Original object
 * @param {Object} source - New updates
 * @returns {Object} Deeply merged object
 */
function deepMerge(target, source) {
    if (!source) return target;
    if (!target) return source;

    const result = { ...target };
    for (const key in source) {
        if (source[key] !== null &&
            typeof source[key] === 'object' &&
            key in target &&
            target[key] !== null &&
            typeof target[key] === 'object' &&
            !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key], source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

function handleIncomingStream(data, source = 'WS') {
    const coin = data.coin;
    if (!coin) return;

    // ⭐ Health Metrics tracking (Move UP to count everything before deduplication)
    if (source === 'WS') meshStats.wsCount++;
    if (source === 'P2P') {
        meshStats.p2pCount++;
        meshStats.lastP2PTime = Date.now();
        meshStats.messageCount++; // Count P2P messages separately as they don't hit ws.onmessage
    }

    // Ensure heartbeat is running
    startRenderingHeartbeat();

    // Generate Deterministic Packet ID for Deduplication (coin-price-rounded-time)
    const price = data.raw?.PRICE?.last || data.PRICE?.price || 0;
    const packetId = `${coin}-${price}-${Math.floor(Date.now() / 1000)}`;

    if (seenPackets.has(packetId)) {
        return;
    }

    // Add to Cache & Enforce Size
    seenPackets.add(packetId);
    if (seenPackets.size > PACKET_CACHE_SIZE) {
        const first = seenPackets.values().next().value;
        seenPackets.delete(first);
    }

    clockEl.innerText = formatTime(Date.now());

    // Update global market state silently
    if (!marketState[coin]) {
        marketState[coin] = data;
    } else {
        marketState[coin] = {
            ...marketState[coin],
            ...data,
            raw: deepMerge(marketState[coin].raw, data.raw),
            analytics: deepMerge(marketState[coin].analytics, data.analytics),
            signals: deepMerge(marketState[coin].signals, data.signals),
            microstructure: deepMerge(marketState[coin].microstructure, data.microstructure),
            FUNDING: data.FUNDING || marketState[coin].FUNDING,
            masterSignals: deepMerge(marketState[coin].masterSignals, data.masterSignals)
        };
    }

    // ⚡ INSTANT EXECUTION: Trading engines run immediately on data (memory-only, no DOM)
    // These are pure JS calculations, no throttling needed
    ViewSimulation.runSimulationEngine(marketState);
    ViewSignalComposer.runComposerEngine(marketState);

    // Queue for UI update (DOM rendering is throttled separately)
    pendingUpdates.add(coin);

    if (!selectedCoin) selectCoin(coin);
    updateTicker(data);
}

function updateTicker(data) {
    const tickerContainer = document.getElementById('ticker-content');
    if (!tickerContainer || (selectedCoin && data.coin !== selectedCoin)) return;

    const coin = data.coin || 'BTC';
    const price = data.raw?.PRICE?.last || data.PRICE?.price || 0;
    const change = data.raw?.PRICE?.percent_change_24h || data.PRICE?.percent_change_24h || data.raw?.PRICE?.percent_change_1JAM || 0;
    const vol = (data.raw?.VOL?.vol_BUY_1JAM || 0) + (data.raw?.VOL?.vol_SELL_1JAM || 0);
    const regime = data.signals?.marketRegime?.currentRegime || 'UNKNOWN';
    const pColor = change >= 0 ? 'text-bb-green' : 'text-bb-red';

    let masterSig = 'NEUTRAL';
    let conf = 0;
    if (data.masterSignals?.['15MENIT']?.MODERATE) {
        masterSig = data.masterSignals['15MENIT'].MODERATE.action;
        conf = data.masterSignals['15MENIT'].MODERATE.confidence;
    }
    // Support both old (BUY/SELL) and new (LONG/SHORT) signal format
    const sColor = (masterSig === 'BUY' || masterSig === 'LONG') ? 'text-bb-green' : (masterSig === 'SELL' || masterSig === 'SHORT') ? 'text-bb-red' : 'text-bb-muted';

    tickerContainer.innerHTML = `
        <div class="flex gap-4 items-center w-full">
            <div class="flex items-center gap-2 border-r border-bb-border pr-4">
                <span class="font-bold text-white">${coin}</span>
                <span class="${pColor} font-mono">${price.toFixed(price < 1 ? 4 : 2)}</span>
                <span class="${pColor} text-[9px]">(${change > 0 ? '+' : ''}${change.toFixed(2)}%)</span>
            </div>
            <div class="flex gap-4 text-bb-muted">
                <span>VOL: <span class="text-white">$${(vol / 1000000).toFixed(1)}M</span></span>
                <span>REGIME: <span class="text-bb-gold">${regime}</span></span>
            </div>
            <div class="ml-auto flex items-center gap-2 pr-4">
                <span class="text-bb-muted uppercase text-[9px]">ACTIVE SIGNAL:</span>
                <span class="font-bold ${sColor}">${masterSig} (${conf}%)</span>
            </div>
        </div>
    `;
}

// Peer Refresh Loop (reduced frequency for CPU efficiency)
setInterval(() => {
    if (currentTab === 'INFO' && p2p) {
        InfoView.update({
            ...p2p.getStats(),
            meshStats: { ...meshStats } // Pass real-time throughput & mode
        });
    }
}, 2000);

// Init
initTabs();
connect();
try {
    // Auto-attach hidden-liquidity detector to top coins (safe, idempotent)
    initAutoAttach({ topN: 8 });
} catch (e) {
    console.warn('[HL] initAutoAttach failed', e);
}
window.app = window.app || {};
window.app.selectCoin = (coin) => selectCoin(coin, true);
window.dashboardNavigate = (coin) => selectCoin(coin, true);
