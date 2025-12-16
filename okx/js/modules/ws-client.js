// WebSocket client extracted from websocket-example.js

(function () {
    if (typeof window !== 'undefined' && window.__wsClientLoaded) return;
    if (typeof window !== 'undefined') window.__wsClientLoaded = true;

    var ws = null;
    var reconnectAttempts = 0;
    var reconnectTimeout = null;
    var wsStatus = 'disconnected'; // 'connecting', 'connected', 'disconnected'
    var messageCount = 0;
    var lastResetTime = Date.now();
    // Buffer incoming messages until the app registers `window.onWsMessage`
    var _wsMessageBuffer = [];
    var _wsFlushInterval = null;
    // How long to keep polling for a handler before dropping buffered messages
    var _WS_FLUSH_TIMEOUT_MS = 30000; // 30s

    // Exponential backoff configuration
    var reconnectDelay = 1000; // Start with 1 second
    var RECONNECT_DELAY_MIN = 1000;  // Minimum 1 second
    var RECONNECT_DELAY_MAX = 30000; // Maximum 30 seconds
    var RECONNECT_BACKOFF_MULTIPLIER = 1.5;

    // Update status indicator in UI
    function updateWsStatusUI(status, extra) {
        wsStatus = status;
        try {
            const statusEl = document.getElementById('wsStatus');
            if (statusEl) {
                let text = status === 'connected' ? '🟢 Connected' :
                    status === 'connecting' ? '🟡 Connecting...' : '🔴 Disconnected';
                if (extra) text += ' ' + extra;
                statusEl.textContent = text;
                statusEl.className = 'badge ' + (status === 'connected' ? 'bg-success' :
                    status === 'connecting' ? 'bg-warning' : 'bg-danger');
            }
        } catch (e) { }
    }

    // Attach handlers to a WebSocket instance by binding the named handlers
    function attachHandlers(socket) {
        if (!socket) return;
        socket.onopen = function () {
            console.log("WebSocket connected.");
            reconnectAttempts = 0;
            reconnectDelay = RECONNECT_DELAY_MIN; // Reset backoff on successful connection
            messageCount = 0;
            lastResetTime = Date.now();
            updateWsStatusUI('connected');
            startHeartbeat(); // Start heartbeat monitoring
            try { const el = document.getElementById('loading'); if (el) el.style.display = 'none'; } catch (e) { }
            try { if (typeof window.onWsOpen === 'function') window.onWsOpen(); } catch (e) { }
        };
        socket.onmessage = function (event) {
            messageCount++;
            updateLastActivity(); // Update activity time for heartbeat
            try {
                if (typeof window.onWsMessage === 'function') {
                    // If handler exists, flush any buffered messages first
                    if (_wsMessageBuffer && _wsMessageBuffer.length) {
                        try {
                            for (const ev of _wsMessageBuffer) {
                                try { window.onWsMessage(ev); } catch (err) { console.error('onWsMessage handler error (buffered)', err); }
                            }
                        } catch (err) { }
                        _wsMessageBuffer = [];
                    }
                    // deliver current
                    window.onWsMessage(event);
                } else {
                    // buffer until handler registered
                    _wsMessageBuffer.push(event);
                    // start a short poll to flush when handler becomes available
                    if (!_wsFlushInterval) {
                        let waited = 0;
                        _wsFlushInterval = setInterval(() => {
                            if (typeof window.onWsMessage === 'function') {
                                try {
                                    for (const ev of _wsMessageBuffer) {
                                        try { window.onWsMessage(ev); } catch (err) { console.error('onWsMessage handler error (flushed)', err); }
                                    }
                                } catch (e) { }
                                _wsMessageBuffer = [];
                                clearInterval(_wsFlushInterval);
                                _wsFlushInterval = null;
                            }
                            waited += 100;
                            if (waited > _WS_FLUSH_TIMEOUT_MS) { // stop polling after timeout
                                _wsMessageBuffer = [];
                                clearInterval(_wsFlushInterval);
                                _wsFlushInterval = null;
                            }
                        }, 100);
                    }
                }
            } catch (e) { console.error('onWsMessage handler error', e); }
        };

    // Expose a manual flush function so consumers can force delivery of buffered messages
    const _flushWsBuffer = function () {
        try {
            if (!_wsMessageBuffer || !_wsMessageBuffer.length) return 0;
            if (typeof window.onWsMessage !== 'function') return 0;
            for (const ev of _wsMessageBuffer) {
                try { window.onWsMessage(ev); } catch (err) { console.error('onWsMessage handler error (manual flush)', err); }
            }
            const n = _wsMessageBuffer.length;
            _wsMessageBuffer = [];
            if (_wsFlushInterval) { clearInterval(_wsFlushInterval); _wsFlushInterval = null; }
            return n;
        } catch (e) { return 0; }
    };
    // attach for backward compatibility
    try { window._flushWsBuffer = _flushWsBuffer; } catch (e) { }
        socket.onclose = function (ev) {
            console.log('WebSocket closed', ev && ev.code);
            stopHeartbeat(); // Stop heartbeat on close
            updateWsStatusUI('disconnected');
            // Auto-reconnect with exponential backoff if closed unexpectedly
            if (!intentionalClose) {
                scheduleReconnect();
            }
        };
        socket.onerror = function (err) {
            console.error('WebSocket error', err);
            updateWsStatusUI('disconnected');
        };
    }

    var intentionalClose = false;

    // Heartbeat/ping configuration
    var heartbeatInterval = null;
    var lastPongTime = Date.now();
    var HEARTBEAT_INTERVAL_MS = 15000; // Send ping every 15 seconds
    var HEARTBEAT_TIMEOUT_MS = 30000;  // Reconnect if no activity for 30 seconds

    // Start heartbeat monitoring
    function startHeartbeat() {
        stopHeartbeat(); // Clear any existing interval
        lastPongTime = Date.now();

        heartbeatInterval = setInterval(function () {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                stopHeartbeat();
                return;
            }

            // Check if connection is stale (no message received in timeout period)
            const timeSinceLastActivity = Date.now() - lastPongTime;
            if (timeSinceLastActivity > HEARTBEAT_TIMEOUT_MS) {
                console.warn('[WS Heartbeat] Connection stale, no activity for ' + (timeSinceLastActivity / 1000).toFixed(1) + 's. Reconnecting...');
                stopHeartbeat();
                intentionalClose = true;
                try { ws.close(); } catch (e) { }
                scheduleReconnect();
                return;
            }

            // Send ping (if server supports it)
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
                }
            } catch (e) {
                console.warn('[WS Heartbeat] Failed to send ping:', e);
            }
        }, HEARTBEAT_INTERVAL_MS);
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    // Update lastPongTime on any message (acts as pong)
    function updateLastActivity() {
        lastPongTime = Date.now();
        try { window.lastPongTime = lastPongTime; } catch (e) { }
    }

    // Schedule reconnection with exponential backoff + jitter
    function scheduleReconnect() {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);

        // Add jitter (random 0-500ms) to prevent thundering herd
        const jitter = Math.random() * 500;
        const delay = Math.min(reconnectDelay + jitter, RECONNECT_DELAY_MAX);

        reconnectAttempts++;
        console.log(`Scheduling reconnect #${reconnectAttempts} in ${(delay / 1000).toFixed(1)}s`);
        updateWsStatusUI('disconnected', `(retry in ${Math.round(delay / 1000)}s)`);

        reconnectTimeout = setTimeout(function () {
            console.log('Reconnecting WebSocket...');
            createAndAttach();
        }, delay);

        // Increase delay for next attempt (exponential backoff)
        reconnectDelay = Math.min(reconnectDelay * RECONNECT_BACKOFF_MULTIPLIER, RECONNECT_DELAY_MAX);
    }

    function createAndAttach() {
        intentionalClose = false;

        // Clean up existing resources
        stopHeartbeat();
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }

        // Reset counters
        messageCount = 0;
        lastResetTime = Date.now();

        try {
            if (ws && ws.readyState !== WebSocket.CLOSED) {
                intentionalClose = true;
                try { ws.close(); } catch (e) { }
            }
        } catch (e) { }

        updateWsStatusUI('connecting');
        ws = new WebSocket('wss://eofficev2.bekasikota.go.id/okx-ws');
        attachHandlers(ws);
        try { window.ws = ws; } catch (e) { }
    }

    // create initial connection
    createAndAttach();

    // NOTE: Removed periodic restart - it was causing 25-second gaps in real-time data
    // The WebSocket will auto-reconnect on close/error, no need for forced restarts

    // Update message rate in UI periodically
    setInterval(function () {
        try {
            const elapsed = (Date.now() - lastResetTime) / 1000;
            const msgPerSec = messageCount / Math.max(1, elapsed);
            if (wsStatus === 'connected') {
                updateWsStatusUI('connected', `(${msgPerSec.toFixed(0)} msg/s)`);
            }
        } catch (e) { }
    }, 2000);

    // expose for external use
    const getWsStatus = function () { return wsStatus; };
    const getWsMessageRate = function () {
        const elapsed = (Date.now() - lastResetTime) / 1000;
        return messageCount / Math.max(1, elapsed);
    };
    const getWsHeartbeatStatus = function () {
        const elapsed = Date.now() - lastPongTime;
        if (elapsed < 20000) return { status: 'healthy', elapsed };
        if (elapsed < 40000) return { status: 'delayed', elapsed };
        return { status: 'stale', elapsed };
    };

    // Attach select APIs to window for backward compatibility (non-fatal if blocked)
    try { window.createAndAttach = createAndAttach; } catch (e) { }
    try { if (typeof window.getWsStatus === 'undefined') window.getWsStatus = getWsStatus; } catch (e) { }
    try { if (typeof window.getWsMessageRate === 'undefined') window.getWsMessageRate = getWsMessageRate; } catch (e) { }
    try { if (typeof window.getWsHeartbeatStatus === 'undefined') window.getWsHeartbeatStatus = getWsHeartbeatStatus; } catch (e) { }
    try { window.ws = ws; } catch (e) { }
    try { window.lastPongTime = lastPongTime; } catch (e) { }

})();
