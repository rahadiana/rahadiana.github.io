/**
 * OKX HIGH-FIDELITY WEBSOCKET UTILITY
 * Optimized for direct, low-latency institutional telemetry.
 */

const OKX_WS_URL = 'wss://wspri.okx.com:8443/ws/v5/ipublic';

let ws = null;
let activeSubscription = null;
let dataCallback = null;
let reconnectTimer = null;

/**
 * Initialize WebSocket link
 */
export function connect() {
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;

    console.log('[OKX-WS] Initializing high-fidelity uplink...');
    ws = new WebSocket(OKX_WS_URL);

    ws.onopen = () => {
        console.log('[OKX-WS] Uplink established (Real-Time Depth)');
        if (activeSubscription) {
            ws.send(JSON.stringify({ op: 'subscribe', args: [activeSubscription] }));
        }
    };

    ws.onmessage = (event) => {
        try {
            const res = JSON.parse(event.data);
            if (res.event === 'subscribe') {
                console.log(`[OKX-WS] Stream authenticated: ${res.arg?.instId}`);
                return;
            }
            if (res.data && dataCallback) {
                dataCallback(res);
            }
        } catch (e) {
            console.error('[OKX-WS] Protocol Parse Error', e);
        }
    };

    ws.onclose = () => {
        console.warn('[OKX-WS] Link severed. Polling for recovery...');
        ws = null;
        if (activeSubscription) {
            reconnectTimer = setTimeout(connect, 3000);
        }
    };

    ws.onerror = (err) => {
        console.error('[OKX-WS] Protocol Violation/Error', err);
    };
}

/**
 * Subscribe to real-time optimized depth for a specific asset
 */
export function subscribe(instId, callback) {
    if (!instId) return;
    dataCallback = callback;

    const instType = instId.includes('-SWAP') ? 'SWAP' : 'SPOT';
    const newSubArr = { channel: 'optimized-books', instId, instType };

    // Unsubscribe previous if active
    if (activeSubscription && activeSubscription.instId !== instId && ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
            op: 'unsubscribe',
            args: [activeSubscription]
        }));
    }

    activeSubscription = newSubArr;

    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ op: 'subscribe', args: [activeSubscription] }));
        console.log(`[OKX-WS] Switching telemetry to ${instId}`);
    } else {
        connect();
    }
}

/**
 * Terminate all active streams
 */
export function unsubscribe() {
    if (activeSubscription && ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ op: 'unsubscribe', args: [activeSubscription] }));
    }
    activeSubscription = null;
    dataCallback = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    console.log('[OKX-WS] Telemetry dormant');
}
