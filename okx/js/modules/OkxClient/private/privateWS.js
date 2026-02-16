
/**
 * Robust OKX v5 Private WebSocket client
 * - Login/auth (supports browser SubtleCrypto and Node `crypto`)
 * - Subscribe/unsubscribe with request->response promises
 * - Auto-reconnect with exponential backoff + jitter
 * - Heartbeat (ping) and basic event emitter interface
 * - Minimal external dependencies; works in browser or Node
 *
 * Usage:
 * const ws = new PrivateWS({apiKey, apiSecret, passphrase});
 * await ws.connect();
 * const resp = await ws.subscribe([{channel:'account'}]);
 * ws.on('message', msg => console.log(msg));
 * await ws.close();
 */

class EventEmitter {
    constructor() { this._ev = Object.create(null); }
    on(name, fn) { (this._ev[name] = this._ev[name] || []).push(fn); return this; }
    off(name, fn) { if (!this._ev[name]) return this; this._ev[name] = this._ev[name].filter(f => f !== fn); return this; }
    emit(name, ...args) { (this._ev[name] || []).forEach(fn => { try { fn(...args); } catch (e) { setTimeout(() => { throw e }, 0); } }); }
}

const DEFAULTS = {
    url: 'wss://ws.okx.com:8443/ws/v5/private',
    autoReconnect: true,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    pingInterval: 20000,
    pongTimeout: 10000,
};

function uuid() { return Math.random().toString(36).slice(2, 10); }

class PrivateWS extends EventEmitter {
    constructor(opts = {}) {
        super();
        this.opts = Object.assign({}, DEFAULTS, opts);
        this.url = this.opts.url;
        this.apiKey = opts.apiKey;
        this.apiSecret = opts.apiSecret;
        this.passphrase = opts.passphrase;
        this.simulated = !!(opts.simulated || opts.simulatedTrading || opts.demo);

        this.ws = null;
        this._connected = false;
        this._authPromise = null;
        this._pending = Object.create(null);
        this._backoff = this.opts.reconnectDelay;
        this._pingTimer = null;
        this._pongTimer = null;
        this._closedByUser = false;
    }

    async _sign(timestamp) {
        const message = `${timestamp}GET/users/self/verify`;
        const secret = this.apiSecret || '';
        const encoder = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;

        // Browser SubtleCrypto
        if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
            const keyData = encoder.encode(secret);
            const msgData = encoder.encode(message);
            const key = await globalThis.crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const sig = await globalThis.crypto.subtle.sign('HMAC', key, msgData);
            return base64FromArrayBuffer(sig);
        }

        // Node.js fallback
        try {
            // eslint-disable-next-line global-require
            const crypto = require('crypto');
            return crypto.createHmac('sha256', secret).update(message).digest('base64');
        } catch (e) {
            throw new Error('No crypto available to sign message');
        }
    }

    async connect() {
        this._closedByUser = false;
        if (this.ws && this.ws.readyState === (typeof WebSocket !== 'undefined' ? WebSocket.OPEN : 1)) return;
        this._createSocket();
        return this._waitForAuth();
    }

    _createSocket() {
        this.ws = new (typeof WebSocket !== 'undefined' ? WebSocket : require('ws'))(this.url);
        this.ws.onopen = () => this._onOpen();
        this.ws.onmessage = (evt) => this._onMessage(evt.data || evt);
        this.ws.onerror = (err) => this._onError(err);
        this.ws.onclose = (ev) => this._onClose(ev);
    }

    async _onOpen() {
        this.emit('open');
        this._backoff = this.opts.reconnectDelay;
        // login
        const ts = (Date.now() / 1000).toString();
        let sign;
        try { sign = await this._sign(ts); } catch (e) { this.emit('error', e); }

        const loginArg = { apiKey: this.apiKey, passphrase: this.passphrase, timestamp: ts, sign };
        // explicitly include simulated flag: 1 = demo, 0 = real
        try { loginArg.simulated = this.simulated ? 1 : 0; } catch (e) { }
        const loginMsg = { op: 'login', args: [loginArg] };
        this._authPromise = deferred();
        this._sendRaw(loginMsg);
        this._startPing();
    }

    _onMessage(raw) {
        let msg;
        try { msg = (typeof raw === 'string') ? JSON.parse(raw) : JSON.parse(raw.toString()); } catch (e) { this.emit('error', e); return; }

        // login response
        if (msg.event === 'login') {
            if (msg.code === '0' || msg.code === 0) { this._authPromise.resolve(msg); this.emit('login', msg); }
            else { this._authPromise.reject(msg); this.emit('login_error', msg); }
            return;
        }

        // request/response matching by id
        if (msg.id && this._pending[msg.id]) {
            const p = this._pending[msg.id];
            delete this._pending[msg.id];
            if (msg.event === 'error' || (msg.code && msg.code !== '0' && msg.code !== 0)) p.reject(msg);
            else p.resolve(msg);
            return;
        }

        // pong handling
        if (msg.event === 'pong' || msg.op === 'pong') {
            this._clearPongTimer();
            return;
        }

        // push data or other events
        this.emit('message', msg);
    }

    _onError(err) { this.emit('error', err); }

    _onClose(ev) {
        this.emit('close', ev);
        this._clearPing();
        // Reject any pending requests to avoid hanging promises
        this._rejectAllPending(new Error('WebSocket closed'));
        if (this._authPromise && this._authPromise.reject) {
            try { this._authPromise.reject({ code: 'WS_CLOSED', msg: 'WebSocket closed' }); } catch (e) { }
        }
        if (this._closedByUser) return;
        if (this.opts.autoReconnect) this._reconnect();
    }

    /** Reject all pending request promises with provided error */
    _rejectAllPending(err) {
        try {
            for (const k of Object.keys(this._pending)) {
                try { this._pending[k].reject(err); } catch (e) { }
                delete this._pending[k];
            }
        } catch (e) { }
    }

    async _waitForAuth() {
        if (!this._authPromise) this._authPromise = deferred();
        return this._authPromise.promise;
    }

    async subscribe(args) {
        const id = uuid();
        // Ensure extraParams is a JSON string when provided as an object
        const argsToSend = (args || []).map(a => {
            if (a && typeof a.extraParams === 'object') {
                return Object.assign({}, a, { extraParams: JSON.stringify(a.extraParams) });
            }
            return a;
        });
        const msg = { id, op: 'subscribe', args: argsToSend };
        const p = deferred();
        this._pending[id] = p;
        this._sendRaw(msg);
        return p.promise;
    }

    async unsubscribe(args) {
        const id = uuid();
        const argsToSend = (args || []).map(a => {
            if (a && typeof a.extraParams === 'object') {
                return Object.assign({}, a, { extraParams: JSON.stringify(a.extraParams) });
            }
            return a;
        });
        const msg = { id, op: 'unsubscribe', args: argsToSend };
        const p = deferred();
        this._pending[id] = p;
        this._sendRaw(msg);
        return p.promise;
    }

    _sendRaw(obj) {
        try { this.ws.send(JSON.stringify(obj)); }
        catch (e) { this.emit('error', e); }
    }

    _startPing() {
        this._clearPing();
        this._pingTimer = setInterval(() => {
            try { this._sendRaw({ op: 'ping' }); this._startPongTimer(); } catch (e) { this.emit('error', e); }
        }, this.opts.pingInterval);
    }

    _startPongTimer() {
        this._clearPongTimer();
        this._pongTimer = setTimeout(() => {
            this.emit('error', new Error('pong timeout')); this.ws.close();
        }, this.opts.pongTimeout);
    }

    _clearPing() { if (this._pingTimer) { clearInterval(this._pingTimer); this._pingTimer = null; } this._clearPongTimer(); }
    _clearPongTimer() { if (this._pongTimer) { clearTimeout(this._pongTimer); this._pongTimer = null; } }

    async _reconnect() {
        const delay = Math.min(this._backoff * (1 + Math.random() * 0.2), this.opts.maxReconnectDelay);
        await wait(delay);
        this._backoff = Math.min(this._backoff * 1.8, this.opts.maxReconnectDelay);
        this._createSocket();
    }

    async close() {
        this._closedByUser = true;
        this.opts.autoReconnect = false;
        if (this.ws) try { this.ws.close(); } catch (e) { }
        this._clearPing();
    }
}

// --- small helpers ---
function deferred() { let r, s; const p = new Promise((res, rej) => { r = res; s = rej; }); return { promise: p, resolve: r, reject: s }; }

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

function base64FromArrayBuffer(buf) {
    // browser or node friendly
    try {
        let binary = '';
        const bytes = new Uint8Array(buf);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        if (typeof btoa !== 'undefined') return btoa(binary);
        return Buffer.from(binary, 'binary').toString('base64');
    } catch (e) { return ''; }
}

module.exports = PrivateWS;

