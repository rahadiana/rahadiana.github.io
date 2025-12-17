// Lightweight IndexedDB wrapper for storing per-coin history arrays
(function () {
    'use strict';
    const DB_NAME = 'okx_history_db_v1';
    const STORE = 'histories';
    const DB_VERSION = 1;

    function openDb() {
        return new Promise((resolve, reject) => {
            try {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = function (ev) {
                    const db = ev.target.result;
                    if (!db.objectStoreNames.contains(STORE)) {
                        db.createObjectStore(STORE, { keyPath: 'coin' });
                    }
                };
                req.onsuccess = function (ev) { resolve(ev.target.result); };
                req.onerror = function (ev) { reject(ev.target.error || new Error('IDB open failed')); };
            } catch (e) { reject(e); }
        });
    }

    async function saveCoinHistory(coin, arr) {
        if (!coin) return;
        try {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                const store = tx.objectStore(STORE);
                const payload = { coin: coin, history: Array.isArray(arr) ? arr.slice(-500) : [] };
                const req = store.put(payload);
                req.onsuccess = function () { try { scheduleAutoClearCheck(); } catch(e){} resolve(true); };
                req.onerror = function (ev) { reject(ev.target.error || new Error('save failed')); };
            });
        } catch (e) { return Promise.reject(e); }
    }

    // Debounced auto-clear trigger after saves
    let _autoClearTimer = null;
    function scheduleAutoClearCheck(delay = 1000) {
        try {
            if (_autoClearTimer) clearTimeout(_autoClearTimer);
            _autoClearTimer = setTimeout(() => {
                try { checkAndAutoClearIfNeeded().then(res => { if (res && res.cleared) console.warn('IDB auto-cleared to avoid slowdowns'); }); } catch (e) { }
            }, delay);
        } catch (e) { }
    }

    async function loadCoinHistory(coin) {
        if (!coin) return [];
        try {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readonly');
                const store = tx.objectStore(STORE);
                const req = store.get(coin);
                req.onsuccess = function (ev) {
                    const res = ev.target.result;
                    resolve((res && Array.isArray(res.history)) ? res.history.slice(-500) : []);
                };
                req.onerror = function (ev) { reject(ev.target.error || new Error('load failed')); };
            });
        } catch (e) { return Promise.reject(e); }
    }

    async function loadAllHistories() {
        try {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readonly');
                const store = tx.objectStore(STORE);
                const req = store.openCursor();
                const out = {};
                req.onsuccess = function (ev) {
                    const cursor = ev.target.result;
                    if (!cursor) { resolve(out); return; }
                    const val = cursor.value;
                    if (val && val.coin) out[val.coin] = Array.isArray(val.history) ? val.history.slice(-500) : [];
                    cursor.continue();
                };
                req.onerror = function (ev) { reject(ev.target.error || new Error('loadAll failed')); };
            });
        } catch (e) { return Promise.reject(e); }
    }

    async function deleteCoinHistory(coin) {
        try {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                const store = tx.objectStore(STORE);
                const req = store.delete(coin);
                req.onsuccess = () => resolve(true);
                req.onerror = (ev) => reject(ev.target.error || new Error('delete failed'));
            });
        } catch (e) { return Promise.reject(e); }
    }

    async function clearAllHistories() {
        try {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                const store = tx.objectStore(STORE);
                const req = store.clear();
                req.onsuccess = () => resolve(true);
                req.onerror = (ev) => reject(ev.target.error || new Error('clear failed'));
            });
        } catch (e) { return Promise.reject(e); }
    }

    // Estimate approximate JSON size in bytes for pruning decisions
    function estimateSizeBytes(obj) {
        try {
            const str = JSON.stringify(obj);
            // UTF-16 approx: 2 bytes per char
            return str.length * 2;
        } catch (e) { return 0; }
    }

    // Prune stored histories according to options:
    // { maxCoins: number, perCoinLimit: number, maxTotalBytes: number }
    async function pruneOldHistories(opts) {
        opts = opts || {};
        const maxCoins = typeof opts.maxCoins === 'number' ? opts.maxCoins : 200;
        const perCoinLimit = typeof opts.perCoinLimit === 'number' ? opts.perCoinLimit : 300;
        const maxTotalBytes = typeof opts.maxTotalBytes === 'number' ? opts.maxTotalBytes : 10 * 1024 * 1024; // 10MB

        try {
            const all = await loadAllHistories();
            const entries = Object.keys(all).map(coin => {
                const history = Array.isArray(all[coin]) ? all[coin] : [];
                const lastTs = history.length ? (history[history.length - 1].ts || 0) : 0;
                const size = estimateSizeBytes({ coin, history });
                return { coin, history, lastTs, size };
            });

            // Sort by recency descending (keep newest first) and by size desc for tie-break
            entries.sort((a, b) => (b.lastTs - a.lastTs) || (b.size - a.size));

            // Enforce maxCoins: keep newest maxCoins
            const toKeepByRecency = new Set(entries.slice(0, maxCoins).map(e => e.coin));

            // Compute total size and prune per coin from oldest entries if needed
            let totalBytes = entries.reduce((s, e) => s + e.size, 0);

            const ops = [];

            for (const e of entries) {
                let h = e.history || [];
                // If coin is beyond maxCoins, drop oldest data to perCoinLimit and mark for deletion if still empty
                if (!toKeepByRecency.has(e.coin)) {
                    // prune to small size: keep last Math.min(perCoinLimit, 50)
                    const keep = Math.min(perCoinLimit, 50);
                    if (h.length > keep) h = h.slice(-keep);
                } else if (h.length > perCoinLimit) {
                    // trim to perCoinLimit
                    h = h.slice(-perCoinLimit);
                }

                const newSize = estimateSizeBytes({ coin: e.coin, history: h });
                // If totalBytes exceeds budget, reduce further from largest coins
                if (totalBytes > maxTotalBytes) {
                    // reduce more aggressively for large entries
                    const extraToFree = totalBytes - maxTotalBytes;
                    // heuristics: if coin history large, cut further by half
                    if (h.length > 10) {
                        const newLen = Math.max(10, Math.floor(h.length / 2));
                        h = h.slice(-newLen);
                    }
                }

                const finalSize = estimateSizeBytes({ coin: e.coin, history: h });
                totalBytes = totalBytes - e.size + finalSize;

                // schedule save if history changed
                if (h.length !== (e.history ? e.history.length : 0)) {
                    ops.push({ coin: e.coin, history: h });
                }
            }

            // Apply saves/deletes sequentially to avoid overwhelming IDB
            for (const op of ops) {
                try {
                    if (!op.history || op.history.length === 0) {
                        await deleteCoinHistory(op.coin);
                    } else {
                        await saveCoinHistory(op.coin, op.history);
                    }
                } catch (e) {
                    console.warn('prune: save/delete failed for', op.coin, e);
                }
            }

            return { ok: true, keptCoins: entries.length - ops.length, totalBytes };
        } catch (e) {
            return { ok: false, error: e };
        }
    }

    // Auto-clear / aggressive prune when DB grows too large
    const HARD_LIMIT_BYTES = 20 * 1024 * 1024; // 20MB hard limit
    const AUTO_CLEAR_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between auto-clears
    let _lastAutoClearAt = 0;

    async function computeTotalDbBytes() {
        try {
            const all = await loadAllHistories();
            let total = 0;
            for (const coin of Object.keys(all || {})) {
                total += estimateSizeBytes({ coin, history: all[coin] });
            }
            return total;
        } catch (e) { return 0; }
    }

    async function checkAndAutoClearIfNeeded() {
        try {
            const total = await computeTotalDbBytes();
            if (total <= HARD_LIMIT_BYTES) return { cleared: false, total };

            // Try aggressive prune first
            await pruneOldHistories({ maxCoins: 50, perCoinLimit: 50, maxTotalBytes: Math.floor(HARD_LIMIT_BYTES / 2) });
            const totalAfter = await computeTotalDbBytes();
            if (totalAfter <= HARD_LIMIT_BYTES) return { cleared: false, total: totalAfter };

            const now = Date.now();
            if (now - _lastAutoClearAt < AUTO_CLEAR_COOLDOWN_MS) {
                return { cleared: false, total: totalAfter, reason: 'cooldown' };
            }

            // As last resort, clear everything to avoid slowdowns
            await clearAllHistories();
            _lastAutoClearAt = Date.now();
            // Reset any preloaded caches in app
            try { window._preloadedHistory = {}; } catch (e) { }
            return { cleared: true, total: 0 };
        } catch (e) { return { cleared: false, error: e }; }
    }

    // schedule periodic prune/GC to keep DB size bounded
    try {
        const PRUNE_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
        const DEFAULT_PRUNE_OPTS = { maxCoins: 200, perCoinLimit: 300, maxTotalBytes: 10 * 1024 * 1024 };
        setInterval(() => {
            try { pruneOldHistories(DEFAULT_PRUNE_OPTS).then(res => { if (!res.ok) console.warn('IDB prune failed', res.error); }); } catch (e) { }
        }, PRUNE_INTERVAL_MS);
    } catch (e) { /* ignore timers in constrained environments */ }

    // expose to global
    window.idbHistory = {
        saveCoinHistory,
        loadCoinHistory,
        loadAllHistories,
        deleteCoinHistory,
        clearAllHistories,
        pruneOldHistories
    };

})();
