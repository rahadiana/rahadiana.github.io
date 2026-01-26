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
import P2PMesh from './p2p.js';

// Configuration
const WS_URL = 'wss://eofficev2.bekasikota.go.id/okx-ws';
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
    'VOL': ViewVol
};

// State
let ws = null;
let p2p = null;
let currentTab = 'GLOBAL';
let currentSubTab = 'MAIN';
let reconnectInterval = null;

const marketState = {};
let selectedCoin = null;
let selectedProfile = 'MODERATE';
let selectedTimeframe = '15MENIT';

// Packet Deduplication Cache
const seenPackets = new Set();
const PACKET_CACHE_SIZE = 1000;

// UI Elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const clockEl = document.getElementById('clock');
const viewContainer = document.getElementById('view-container');
const tickerTape = document.getElementById('ticker-tape');
const coinListContainer = document.getElementById('coin-list');
const detailsSubnav = document.getElementById('details-subnav');

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
    if (!['GLOBAL', 'STRATEGY', 'DETAILS', 'VISUAL', 'INFO', 'P2P'].includes(tabName)) return;

    // Lifecycle cleanup for outgoing tab/subtab
    if (currentTab === 'DETAILS' && tabName !== 'DETAILS') {
        const activeSubView = VIEWS[currentSubTab];
        if (activeSubView && typeof activeSubView.stop === 'function') {
            activeSubView.stop();
        }
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

    if (!selectedCoin || !marketState[selectedCoin]) return;
    const viewKey = currentTab === 'DETAILS' ? currentSubTab : currentTab;
    if (VIEWS[viewKey]) {
        VIEWS[viewKey].update(marketState[selectedCoin], selectedProfile, selectedTimeframe);
    }
}

// ============================================
// WEBSOCKET & P2P LOGIC
// ============================================

async function decompressGzip(blob) {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = blob.stream().pipeThrough(ds);
    return await new Response(decompressedStream).text();
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
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('Main WS Connected');
        statusDot.className = 'w-1.5 h-1.5 rounded-full bg-bb-green animate-pulse';
        statusText.innerText = 'PROVING CAPABILITY...';
        statusText.className = 'text-bb-gold animate-pulse';

        // ⭐ institutional Verification: Prove WebRTC capability to server
        sendWebRTCCapability();

        // Init P2P Mesh
        p2p = new P2PMesh(ws, (data) => {
            handleIncomingStream(data, 'P2P');
        });

        // Anti-Leech Validation
        p2p.onMeshReady = () => {
            console.log('[SECURITY] Mesh Edge Active. Sending validation signal...');
            safeSend({ type: 'p2p:ready' });

            // Periodically re-assert readiness to prevent state drift
            setInterval(() => {
                safeSend({ type: 'p2p:ready' });
            }, 15000);
        };

        if (!p2p.isSuperPeer) {
            statusText.innerText = 'VALIDATING MESH...';
            statusText.className = 'text-bb-gold animate-pulse';
        }
    };

    ws.onmessage = async (event) => {
        try {
            let payloadText;
            if (event.data instanceof Blob) {
                // Handle Compressed Binary Data
                payloadText = await decompressGzip(event.data);
            } else {
                // Handle Standard JSON Signaling
                payloadText = event.data;
            }

            const payload = JSON.parse(payloadText);
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
                p2p.updatePeerList(payload.peers, payload.superPeers);
            } else if (payload.type === 'offer') {
                p2p.handleOffer(payload.senderId, payload.offer);
            } else if (payload.type === 'answer') {
                p2p.handleAnswer(payload.senderId, payload.answer);
            } else if (payload.type === 'ice-candidate') {
                p2p.handleIceCandidate(payload.senderId, payload.candidate);
            } else if (payload.type === 'stream') {
                handleIncomingStream(payload.data, 'WS');
                // P2P will broadcast the original raw data for efficiency
                if (p2p) p2p.broadcast(payload.data);
            } else if (payload.type === 'stream-notify') {
                // Lightweight update to keep ticker alive & populate sidebar while mesh forms
                const coin = payload.coin;
                if (!marketState[coin]) marketState[coin] = { coin: coin };

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

                Sidebar.renderList(coinListContainer, marketState, selectedCoin, selectCoin);
            }
        } catch (e) {
            console.error('WS Parse/Decompress Error:', e);
        }
    };

    ws.onclose = () => {
        statusDot.className = 'w-1.5 h-1.5 rounded-full bg-bb-red';
        statusText.innerText = 'DISCONNECTED';
        statusText.className = 'text-bb-red';
        if (!reconnectInterval) reconnectInterval = setInterval(connect, 3000);
    };
}

function handleIncomingStream(data, source = 'WS') {
    const coin = data.coin;

    // Generate Deterministic Packet ID for Deduplication (coin-price-rounded-time)
    const price = data.raw?.PRICE?.last || data.PRICE?.price || 0;
    const packetId = `${coin}-${price}-${Math.floor(Date.now() / 1000)}`;

    if (seenPackets.has(packetId)) {
        // console.log(`[DEDUPE] Skipping duplicate for ${coin}`);
        return;
    }

    // Add to Cache & Enforce Size
    seenPackets.add(packetId);
    if (seenPackets.size > PACKET_CACHE_SIZE) {
        const first = seenPackets.values().next().value;
        seenPackets.delete(first);
    }

    clockEl.innerText = formatTime(Date.now());

    // Log P2P arrival source for verification
    if (source === 'P2P') {
        const stats = p2p.getStats();
        // console.log(`[DATA] Rx: ${coin} via P2P Mesh`);

        // ⭐ RELAY/FLOOD: Rebroadcast newly seen P2P data to neighbors
        if (p2p) p2p.broadcast(data);
    }

    if (!marketState[coin]) {
        marketState[coin] = data;
    } else {
        marketState[coin] = {
            ...marketState[coin],
            ...data,
            raw: { ...marketState[coin].raw, ...data.raw },
            analytics: { ...marketState[coin].analytics, ...data.analytics },
            signals: { ...marketState[coin].signals, ...data.signals },
            microstructure: { ...marketState[coin].microstructure, ...data.microstructure },
            FUNDING: data.FUNDING || marketState[coin].FUNDING,
            masterSignals: data.masterSignals || marketState[coin].masterSignals
        };
    }

    if (!selectedCoin) selectCoin(coin);
    updateTicker(data);
    Sidebar.renderList(coinListContainer, marketState, selectedCoin, selectCoin);
    if (currentTab === 'GLOBAL' || coin === selectedCoin) {
        updateCurrentView();
    }
}

function updateTicker(data) {
    const tickerContainer = document.getElementById('ticker-content');
    if (!tickerContainer || (selectedCoin && data.coin !== selectedCoin)) return;

    const coin = data.coin || 'BTC';
    const price = data.raw?.PRICE?.last || data.PRICE?.price || 0;
    const change = data.raw?.PRICE?.percent_change_1JAM || data.PRICE?.percent_change_1JAM || 0;
    const vol = (data.raw?.VOL?.vol_buy_1JAM || 0) + (data.raw?.VOL?.vol_sell_1JAM || 0);
    const regime = data.signals?.marketRegime?.currentRegime || 'UNKNOWN';
    const pColor = change >= 0 ? 'text-bb-green' : 'text-bb-red';

    let masterSig = 'NEUTRAL';
    let conf = 0;
    if (data.masterSignals?.['15MENIT']?.MODERATE) {
        masterSig = data.masterSignals['15MENIT'].MODERATE.action;
        conf = data.masterSignals['15MENIT'].MODERATE.confidence;
    }
    const sColor = masterSig === 'BUY' ? 'text-bb-green' : masterSig === 'SELL' ? 'text-bb-red' : 'text-bb-muted';

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

// Peer Refresh Loop
setInterval(() => {
    if (currentTab === 'INFO' && p2p) {
        InfoView.update(p2p.getStats());
    }
}, 1000);

// Init
initTabs();
connect();
window.app = { selectCoin: (coin) => selectCoin(coin, true) };
window.dashboardNavigate = (coin) => selectCoin(coin, true);
