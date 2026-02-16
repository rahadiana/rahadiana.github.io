import OkxClient from './okx_client.js';

const OKX_WS_PUBLIC = 'wss://wspri.okx.com:8443/ws/v5/ipublic';
const OKX_WS_PRIVATE = 'wss://wspri.okx.com:8443/ws/v5/private';
const OKX_WS_PRIVATE_SIM = 'wss://wspap.okx.com:8443/ws/v5/private?brokerId=9999';

let wsPublic = null;
let wsPrivate = null;
let reconnectTimerPublic = null;
let reconnectTimerPrivate = null;

let subscriptions = new Map(); // key -> { arg, callbacks: Set }
let subscriptionsPrivate = new Map();

function abToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    if (typeof btoa !== 'undefined') return btoa(binary);
    return Buffer.from(binary, 'binary').toString('base64');
}

async function hmacSha256(secret, msg) {
    const enc = new TextEncoder();
    const key = await window.crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await window.crypto.subtle.sign('HMAC', key, enc.encode(msg));
    return abToBase64(sig);
}

function formatInstId(instId) {
    if (!instId) return null;
    if (instId.includes('-')) return instId.toUpperCase();
    return `${instId.toUpperCase()}-USDT-SWAP`;
}

/** Public (unauth) websocket */
export function connect() {
    if (wsPublic && (wsPublic.readyState === 0 || wsPublic.readyState === 1)) return;
    console.log('[OKX-WS] Initializing public telemetry...');
    wsPublic = new WebSocket(OKX_WS_PUBLIC);

    wsPublic.onopen = () => {
        console.log('[OKX-WS] Public uplink established');
        if (subscriptions.size > 0) {
            const args = Array.from(subscriptions.values()).map(s => s.arg);
            wsPublic.send(JSON.stringify({ op: 'subscribe', args }));
        }
    };

    wsPublic.onmessage = (event) => {
        try {
            const res = JSON.parse(event.data);
            if (res.data && res.arg) {
                const instId = res.arg?.instId || '';
                const channel = res.arg?.channel || '';
                const key = `${instId}:${channel}`;
                const sub = subscriptions.get(key);
                if (sub) sub.callbacks.forEach(cb => cb(res));
            }
        } catch (e) { console.error('[OKX-WS] Public Parse Error', e); }
    };

    wsPublic.onclose = () => {
        console.warn('[OKX-WS] Public link closed. Reconnecting...');
        wsPublic = null;
        if (subscriptions.size > 0) reconnectTimerPublic = setTimeout(connect, 3000);
    };
    wsPublic.onerror = (err) => console.error('[OKX-WS] Public Error', err);
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
        if (wsPublic && wsPublic.readyState === 1) wsPublic.send(JSON.stringify({ op: 'subscribe', args: [arg] }));
        else connect();
    }
    sub.callbacks.add(callback);
}

export function unsubscribe(instId, callback, channel = 'tickers') {
    if (!instId) return;
    const formattedId = formatInstId(instId);
    const key = `${formattedId}:${channel}`;
    const sub = subscriptions.get(key);
    if (!sub) return;
    if (callback) sub.callbacks.delete(callback); else sub.callbacks.clear();
    if (sub.callbacks.size === 0) {
        if (wsPublic && wsPublic.readyState === 1) wsPublic.send(JSON.stringify({ op: 'unsubscribe', args: [sub.arg] }));
        subscriptions.delete(key);
    }
}

// Track the configuration used for the active connection to detect switches
let _activeConfigSignature = null;

/** Private (authenticated) websocket for realtime positions, orders, fills */
export async function connectPrivate() {
    const c = OkxClient.getConfig();
    if (!c || !c.key || !c.secret || !c.passphrase) {
        console.warn('[OKX-WS] Private connect skipped: no API credentials');
        return;
    }

    // signature includes key and simulated flag to detect account/mode switches
    const currentSig = `${c.key}:${c.simulated}`;

    // If we have an active connection but the config has changed (e.g. switch demo<->real), disconnect first
    if (wsPrivate && _activeConfigSignature && _activeConfigSignature !== currentSig) {
        console.log('[OKX-WS] Configuration changed (Demo/Real switch). Reconnecting...');
        disconnectPrivate();
    }

    if (wsPrivate && (wsPrivate.readyState === 0 || wsPrivate.readyState === 1)) return;

    _activeConfigSignature = currentSig;

    // select private websocket URL from config if provided (useful for testnet/demo URLs)
    // OTHERWISE, auto-select based on mode
    let privateUrl = (c && c.wsUrl) ? c.wsUrl : OKX_WS_PRIVATE;
    if (c.simulated && !c.wsUrl) {
        privateUrl = OKX_WS_PRIVATE_SIM;
    }

    console.log('[OKX-WS] Connecting private WS to', privateUrl);
    wsPrivate = new WebSocket(privateUrl);
    wsPrivate.onopen = async () => {
        try {
            // Use OKX public server time to avoid client clock skew issues
            let serverTs = null;
            try {
                const tRes = await fetch('https://www.okx.com/api/v5/public/time');
                const tTxt = await tRes.text();
                const tJson = JSON.parse(tTxt);
                if (tJson && tJson.data && Array.isArray(tJson.data) && tJson.data[0] && tJson.data[0].ts) {
                    serverTs = tJson.data[0].ts;
                }
            } catch (e) {
                console.warn('[OKX-WS] Failed to fetch server time, falling back to local time', e);
            }

            const tryLoginWithTimestamp = async (ts) => {
                try {
                    const prehash = ts + 'GET' + '/users/self/verify' + '';
                    const sign = await hmacSha256(c.secret, prehash);
                    const loginArg = { apiKey: c.key, passphrase: c.passphrase, timestamp: ts, sign };
                    try { loginArg.simulated = (typeof c.simulated !== 'undefined' && c.simulated) ? 1 : 0; } catch (e) { }
                    console.debug('[OKX-WS] Attempting login with timestamp', ts);
                    wsPrivate.send(JSON.stringify({ op: 'login', args: [loginArg] }));
                    return true;
                } catch (e) { console.error('[OKX-WS] tryLoginWithTimestamp error', e); return false; }
            };

            // Build candidate timestamp formats; prefer numeric-seconds like executor
            const candidates = [];
            // If serverTs available (ISO), convert to numeric seconds string to match executor behavior
            if (serverTs) {
                try {
                    const ms = new Date(serverTs).getTime();
                    if (!isNaN(ms)) candidates.push(String(ms / 1000));
                } catch (e) { }
            }
            // local numeric seconds with fractional part (executor uses (Date.now()/1000).toString())
            candidates.push(String(Date.now() / 1000));
            // fallback ISO strings (some accounts may accept ISO)
            const localIso = new Date().toISOString();
            candidates.push(localIso);
            candidates.push(localIso.replace(/\.\d{3}Z$/, 'Z'));

            // try each candidate until one is sent
            for (const t of candidates) {
                const ok = await tryLoginWithTimestamp(t);
                if (ok) break;
            }
        } catch (e) { console.error('[OKX-WS] Private login failed', e); }
    };

    wsPrivate.onmessage = async (event) => {
        try {
            const res = JSON.parse(event.data);
            // handle invalid timestamp error by re-syncing time and re-login
            if (res && res.event === 'error') {
                if (res.code === '60004' || res.code === 60004 || res.code === '60006' || res.code === 60006) {
                    console.warn('[OKX-WS] Server reported timestamp error, retrying login with server-derived seconds');
                    try {
                        const tRes = await fetch('https://www.okx.com/api/v5/public/time');
                        const tTxt = await tRes.text();
                        const tJson = JSON.parse(tTxt);
                        let ts = null;
                        if (tJson && tJson.data && Array.isArray(tJson.data) && tJson.data[0] && tJson.data[0].ts) {
                            const ms = new Date(tJson.data[0].ts).getTime();
                            if (!isNaN(ms)) ts = String(ms / 1000);
                        }
                        if (!ts) ts = String(Date.now() / 1000);
                        const prehash = ts + 'GET' + '/users/self/verify' + '';
                        const sign = await hmacSha256(c.secret, prehash);
                        const loginArg = { apiKey: c.key, passphrase: c.passphrase, timestamp: ts, sign };
                        try { loginArg.simulated = (typeof c.simulated !== 'undefined' && c.simulated) ? 1 : 0; } catch (e) { }
                        console.debug('[OKX-WS] Retrying login with seconds ts:', ts);
                        wsPrivate.send(JSON.stringify({ op: 'login', args: [loginArg] }));
                    } catch (e) { console.error('[OKX-WS] Retry login failed', e); }
                    return;
                } else if (res.code === '50101' || res.code === 50101) {
                    // 50101 APIKey does not match current environment (Sim vs Real)
                    console.warn('[OKX-WS] Login rejected (50101/error). Trying alternate simulated flag...');
                    try {
                        const altSim = (typeof c.simulated === 'undefined' || !c.simulated) ? 1 : 0;
                        let ts = String(Date.now() / 1000);
                        // attempt to fetch time again just in case
                        try {
                            const tRes = await fetch('https://www.okx.com/api/v5/public/time');
                            const tJson = await tRes.json();
                            if (tJson && tJson.data && tJson.data[0] && tJson.data[0].ts) {
                                ts = String(Number(tJson.data[0].ts) / 1000);
                            }
                        } catch (e) { }

                        const prehash = ts + 'GET' + '/users/self/verify' + '';
                        const sign = await hmacSha256(c.secret, prehash);
                        const loginArg = { apiKey: c.key, passphrase: c.passphrase, timestamp: ts, sign };
                        try { loginArg.simulated = altSim ? 1 : 0; } catch (e) { }

                        console.log('[OKX-WS] Retrying with simulated=' + altSim);
                        wsPrivate.send(JSON.stringify({ op: 'login', args: [loginArg] }));

                        // persist detected mode — but do NOT overwrite user-saved mode
                        try {
                            const userSet = localStorage.getItem('okx_user_set_mode') === '1';
                            if (userSet) {
                                // Respect user choice: only mark that demo was detected, do not overwrite config
                                localStorage.setItem('okx_demo_detected', altSim ? '1' : '0');
                                console.log('[OKX-WS] Demo detected but user-set mode present — not overwriting okx_api_config_v1');
                            } else {
                                const cfgRaw = localStorage.getItem('okx_api_config_v1');
                                const cfg = cfgRaw ? JSON.parse(cfgRaw) : (OkxClient.getConfig() || {});
                                cfg.simulated = !!altSim;
                                localStorage.setItem('okx_api_config_v1', JSON.stringify(cfg));
                                localStorage.setItem('okx_demo_detected', altSim ? '1' : '0');
                            }
                        } catch (e) { }
                    } catch (e) { console.error('[OKX-WS] Retry 50101 failed', e); }
                    return;
                }
            }

            // Only treat login/loginOk as connection auth events. Do NOT treat server 'subscribe' ACKs
            if (res.event === 'login' || res.event === 'loginOk') {
                if (res.event === 'login') {
                    if (res.code && res.code !== '0') {
                        // handle APIKey/environment mismatch (50101) by retrying with inverted simulated flag
                        if (res.code === '50101' || res.code === 50101) {
                            console.warn('[OKX-WS] Login rejected (50101). Trying alternate simulated flag...');
                            try {
                                const altSim = (typeof c.simulated === 'undefined' || !c.simulated) ? 1 : 0;
                                let ts = String(Date.now() / 1000);
                                try {
                                    const tRes = await fetch('https://www.okx.com/api/v5/public/time');
                                    const tTxt = await tRes.text();
                                    const tJson = JSON.parse(tTxt);
                                    if (tJson && tJson.data && Array.isArray(tJson.data) && tJson.data[0] && tJson.data[0].ts) {
                                        const ms = new Date(tJson.data[0].ts).getTime();
                                        if (!isNaN(ms)) ts = String(ms / 1000);
                                    }
                                } catch (e) { /* ignore */ }
                                const prehash = ts + 'GET' + '/users/self/verify' + '';
                                const sign = await hmacSha256(c.secret, prehash);
                                const loginArg = { apiKey: c.key, passphrase: c.passphrase, timestamp: ts, sign };
                                try { loginArg.simulated = altSim ? 1 : 0; } catch (e) { }
                                wsPrivate.send(JSON.stringify({ op: 'login', args: [loginArg] }));

                                try {
                                    const cfgRaw = localStorage.getItem('okx_api_config_v1');
                                    const cfg = cfgRaw ? JSON.parse(cfgRaw) : (OkxClient.getConfig() || {});
                                    cfg.simulated = !!altSim;
                                    localStorage.setItem('okx_api_config_v1', JSON.stringify(cfg));
                                    localStorage.setItem('okx_demo_detected', altSim ? '1' : '0');
                                } catch (e) { }
                            } catch (e) { console.error('[OKX-WS] Retry with alternate simulated flag failed', e); }
                        } else {
                            console.warn('[OKX-WS] Login failed:', res);
                        }
                        return;
                    }
                }
                // when login finished, subscribe to any pending private channels
                if (subscriptionsPrivate.size > 0 && wsPrivate.readyState === 1) {
                    const args = Array.from(subscriptionsPrivate.values()).map(s => s.arg);
                    wsPrivate.send(JSON.stringify({ op: 'subscribe', args }));
                }
                return;
            }

            if (res.data && res.arg) {
                const channel = res.arg?.channel || '';
                const key = `${res.arg?.instId || ''}:${channel}`;
                const sub = subscriptionsPrivate.get(key);
                if (sub) sub.callbacks.forEach(cb => cb(res));
            }
        } catch (e) { console.error('[OKX-WS] Private Parse Error', e); }
    };

    wsPrivate.onclose = () => {
        console.warn('[OKX-WS] Private link closed. Reconnecting...');
        wsPrivate = null;
        if (subscriptionsPrivate.size > 0) reconnectTimerPrivate = setTimeout(connectPrivate, 3000);
    };
    wsPrivate.onerror = (err) => console.error('[OKX-WS] Private Error', err);
}

export async function subscribePrivate(arg, callback) {
    // arg: { channel: 'positions', instType?: 'SWAP', instId?: 'BTC-USD-SWAP' }
    if (!arg || !arg.channel || !callback) return;
    const instId = arg.instId ? formatInstId(arg.instId) : '';
    const key = `${instId}:${arg.channel}`;
    let sub = subscriptionsPrivate.get(key);
    if (!sub) {
        const a = Object.assign({}, arg);
        if (a.instId) a.instId = formatInstId(a.instId);
        sub = { arg: a, callbacks: new Set() };
        subscriptionsPrivate.set(key, sub);
        if (wsPrivate && wsPrivate.readyState === 1) wsPrivate.send(JSON.stringify({ op: 'subscribe', args: [a] }));
        else await connectPrivate();
    }
    sub.callbacks.add(callback);
}

export function unsubscribePrivate(arg, callback) {
    if (!arg || !arg.channel) return;
    const instId = arg.instId ? formatInstId(arg.instId) : '';
    const key = `${instId}:${arg.channel}`;
    const sub = subscriptionsPrivate.get(key);
    if (!sub) return;
    if (callback) sub.callbacks.delete(callback); else sub.callbacks.clear();
    if (sub.callbacks.size === 0) {
        if (wsPrivate && wsPrivate.readyState === 1) wsPrivate.send(JSON.stringify({ op: 'unsubscribe', args: [sub.arg] }));
        subscriptionsPrivate.delete(key);
    }
}

export function disconnectPrivate() {
    if (reconnectTimerPrivate) { clearTimeout(reconnectTimerPrivate); reconnectTimerPrivate = null; }
    if (wsPrivate) {
        console.log('[OKX-WS] Disconnecting private websocket...');
        // remove onclose listener to prevent auto-reconnect logic from firing immediately
        wsPrivate.onclose = null;
        try { wsPrivate.close(); } catch (e) { }
        wsPrivate = null;
    }
    _activeConfigSignature = null;
}

