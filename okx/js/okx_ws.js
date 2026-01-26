/**
 * OKX HIGH-FIDELITY WEBSOCKET UTILITY
 * Optimized for direct, low-latency institutional telemetry.
 */

const OKX_WS_URL = 'wss://wspri.okx.com:8443/ws/v5/ipublic';

let ws = null;
let activeSubscription = null;
let dataCallback = null;
let reconnectTimer = null;

function formatInstId(instId) {
    if (!instId) return null;
    if (instId.includes('-')) return instId.toUpperCase();
    // Default fallback for raw ticker names
    return `${instId.toUpperCase()}-USDT-SWAP`;
}

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
            console.log(`[OKX-WS] Resubscribing to ${activeSubscription.instId}`);
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

    const formattedId = formatInstId(instId);
    const instType = formattedId.includes('-SWAP') ? 'SWAP' : 'SPOT';
    const newSubArr = { channel: 'optimized-books', instId: formattedId, instType };

    // Unsubscribe previous if active and changed
    if (activeSubscription && activeSubscription.instId !== formattedId && ws && ws.readyState === 1) {
        console.log(`[OKX-WS] Terminating stale telemetry for ${activeSubscription.instId}`);
        ws.send(JSON.stringify({
            op: 'unsubscribe',
            args: [activeSubscription]
        }));
    }

    activeSubscription = newSubArr;

    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ op: 'subscribe', args: [activeSubscription] }));
        console.log(`[OKX-WS] Switching telemetry to ${formattedId}`);
    } else {
        connect();
        // The onopen handler in connect() will pick up the activeSubscription
    }
}

/**
 * Terminate all active streams
 */
export function unsubscribe() {
    if (activeSubscription && ws && ws.readyState === 1) {
        console.log(`[OKX-WS] Unsubscribing from ${activeSubscription.instId}`);
        ws.send(JSON.stringify({ op: 'unsubscribe', args: [activeSubscription] }));
    }
    activeSubscription = null;
    dataCallback = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    console.log('[OKX-WS] Telemetry dormant');
}
