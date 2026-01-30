const OKX_WS_URL = 'wss://wspri.okx.com:8443/ws/v5/ipublic';

let ws = null;
let subscriptions = new Map(); // "instId:channel" -> { arg, callbacks: Set }
let reconnectTimer = null;

function formatInstId(instId) {
    if (!instId) return null;
    if (instId.includes('-')) return instId.toUpperCase();
    return `${instId.toUpperCase()}-USDT-SWAP`;
}

export function connect() {
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;

    console.log('[OKX-WS] Initializing multi-channel telemetry...');
    ws = new WebSocket(OKX_WS_URL);

    ws.onopen = () => {
        console.log('[OKX-WS] Multi-channel uplink established');
        if (subscriptions.size > 0) {
            const args = Array.from(subscriptions.values()).map(s => s.arg);
            console.log(`[OKX-WS] Resubscribing to ${args.length} channels...`);
            ws.send(JSON.stringify({ op: 'subscribe', args }));
        }
    };

    ws.onmessage = (event) => {
        try {
            const res = JSON.parse(event.data);
            if (res.event === 'subscribe') {
                console.log(`[OKX-WS] Authenticated: ${res.arg?.instId} [${res.arg?.channel}]`);
                return;
            }
            if (res.data) {
                const instId = res.arg?.instId;
                const channel = res.arg?.channel;
                const key = `${instId}:${channel}`;

                const sub = subscriptions.get(key);
                if (sub) {
                    sub.callbacks.forEach(cb => cb(res));
                }
            }
        } catch (e) {
            console.error('[OKX-WS] Protocol Parse Error', e);
        }
    };

    ws.onclose = () => {
        console.warn('[OKX-WS] Link severed. Polling for recovery...');
        ws = null;
        if (subscriptions.size > 0) {
            reconnectTimer = setTimeout(connect, 3000);
        }
    };

    ws.onerror = (err) => console.error('[OKX-WS] Protocol Violation/Error', err);
}

export function subscribe(instId, callback, channel = 'tickers') {
    if (!instId || !callback) return;
    const formattedId = formatInstId(instId);
    const key = `${formattedId}:${channel}`;

    let sub = subscriptions.get(key);
    if (!sub) {
        const arg = { channel, instId: formattedId };
        sub = { arg, callbacks: new Set() };
        subscriptions.set(key, sub);

        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ op: 'subscribe', args: [arg] }));
        } else {
            connect();
        }
    }

    sub.callbacks.add(callback);
    console.log(`[OKX-WS] Subscribed to ${formattedId} [${channel}] (Total Subs: ${subscriptions.size})`);
}

export function unsubscribe(instId, callback, channel = 'tickers') {
    if (!instId) return;
    const formattedId = formatInstId(instId);

    // If channel is '*' or not provided, we might want to unsubscribe all? 
    // For now, adhere to default 'tickers' to support named channel logic, 
    // unless explicit 'books' passed.
    const key = `${formattedId}:${channel}`;
    const sub = subscriptions.get(key);
    if (!sub) return;

    if (callback) {
        sub.callbacks.delete(callback);
    } else {
        // Force unsubscribe all if no callback provided
        sub.callbacks.clear();
    }

    if (sub.callbacks.size === 0) {
        console.log(`[OKX-WS] Terminating telemetry for ${formattedId} [${channel}]`);
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ op: 'unsubscribe', args: [sub.arg] }));
        }
        subscriptions.delete(key);
    }
}
