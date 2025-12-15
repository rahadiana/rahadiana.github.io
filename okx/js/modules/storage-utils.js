(function(){
    'use strict';

    function safeLocalStorageSet(key, value) {
        try {
            const v = (typeof value === 'string') ? value : JSON.stringify(value);
            localStorage.setItem(key, v);
            return true;
        } catch (e) {
            try {
                // If storing a large persisted history key, try pruning its contents first
                const KEEP_PER_COIN = 20; // keep last N points per coin when pruning (more aggressive)
                const isPersistKey = typeof key === 'string' && key.toLowerCase().indexOf('okx_calc_history') === 0;
                if (isPersistKey) {
                    try {
                        const existing = localStorage.getItem(key);
                        if (existing) {
                            try {
                                let parsed = JSON.parse(existing);
                                if (parsed && typeof parsed === 'object') {
                                    // First pass: trim arrays per coin to KEEP_PER_COIN
                                    for (const coin in parsed) {
                                        try {
                                            if (Array.isArray(parsed[coin]) && parsed[coin].length > KEEP_PER_COIN) {
                                                parsed[coin] = parsed[coin].slice(-KEEP_PER_COIN);
                                            }
                                        } catch (inner) { }
                                    }
                                    try {
                                        localStorage.setItem(key, JSON.stringify(parsed));
                                        // success after light prune
                                    } catch (innerSet) {
                                        // Second pass: drop oldest coins until fits (keep most recent coins)
                                        try {
                                            const coins = Object.keys(parsed).map(c => ({ coin: c, lastTs: (Array.isArray(parsed[c]) && parsed[c].length) ? (parsed[c][parsed[c].length-1].ts || 0) : 0 }));
                                            coins.sort((a,b) => b.lastTs - a.lastTs);
                                            const MAX_COINS_KEEP = 20; // keep fewer coins when pruning (more aggressive)
                                            const coinsToKeep = coins.slice(0, MAX_COINS_KEEP).map(x => x.coin);
                                            const pruned = {};
                                            const perCoinKeep = Math.max(10, Math.floor(KEEP_PER_COIN/2));
                                            for (const c of coinsToKeep) {
                                                try { pruned[c] = Array.isArray(parsed[c]) ? parsed[c].slice(-perCoinKeep) : parsed[c]; } catch(_) { }
                                            }
                                            try {
                                                localStorage.setItem(key, JSON.stringify(pruned));
                                            } catch (finalErr) {
                                                // If still failing, fall back to removing the key entirely below
                                            }
                                        } catch (dropErr) { }
                                    }
                                }
                            } catch (parseErr) { }
                        }
                    } catch (ex) { }
                }

                // Try freeing some less-critical keys to make space
                const fallbackKeys = ['okx_calc_history', 'okx_calc_history_v1', 'okx_calc_webhook', 'okx_calc_persist', 'okx_compact_alerts'];
                for (const k of fallbackKeys) {
                    try { localStorage.removeItem(k); } catch (_) { }
                }
                const v2 = (typeof value === 'string') ? value : JSON.stringify(value);
                // If this is a persisted history key, attempt aggressive pruning on the value
                if (isPersistKey) {
                    try {
                        let parsedNew = (typeof value === 'string') ? JSON.parse(value) : (typeof value === 'object' ? value : JSON.parse(v2));
                        const TARGET_BYTES = 256 * 1024; // aim to keep per-key under ~256KB
                        const sizeOf = (s) => {
                            try { return new Blob([s]).size; } catch (e) { return s.length * 2; }
                        };
                        let ser = JSON.stringify(parsedNew);
                        let sz = sizeOf(ser);
                        if (sz > TARGET_BYTES) {
                            // Reduce per-coin keep aggressively
                            const perCoinKeep = Math.max(3, Math.floor(KEEP_PER_COIN / 4));
                            try {
                                for (const c in parsedNew) {
                                    if (Array.isArray(parsedNew[c]) && parsedNew[c].length > perCoinKeep) {
                                        parsedNew[c] = parsedNew[c].slice(-perCoinKeep);
                                    }
                                }
                            } catch (_) { }
                            // Remove oldest coins until under target
                            try {
                                const coins = Object.keys(parsedNew).map(c => ({ coin: c, lastTs: (Array.isArray(parsedNew[c]) && parsedNew[c].length) ? (parsedNew[c][parsedNew[c].length-1].ts || 0) : 0 }));
                                coins.sort((a,b) => a.lastTs - b.lastTs); // oldest first
                                while (coins.length && sizeOf(JSON.stringify(parsedNew)) > TARGET_BYTES) {
                                    const rem = coins.shift().coin;
                                    try { delete parsedNew[rem]; } catch (_) { }
                                }
                            } catch (_) { }
                            try {
                                localStorage.setItem(key, JSON.stringify(parsedNew));
                                return true;
                            } catch (_) { /* fall through to other fallbacks */ }
                        }
                    } catch (_) { /* ignore aggressive prune errors */ }
                }

                try {
                    localStorage.setItem(key, v2);
                    return true;
                } catch (innerFail) {
                    // If quota still exceeded, try sessionStorage as a best-effort fallback
                    try {
                        if (typeof sessionStorage !== 'undefined') {
                            sessionStorage.setItem(key, v2);
                            console.warn('safeLocalStorageSet: wrote to sessionStorage fallback for', key);
                            return true;
                        }
                    } catch (sessErr) { /* ignore sessionStorage errors */ }

                    // Final fallback: keep in-memory cache so app can continue using value
                        try {
                            if (!window._localStorageFallback) window._localStorageFallback = {};
                            window._localStorageFallback[key] = value;
                            // Schedule an async retry so UI isn't blocked by synchronous storage ops
                            try {
                                const ASYNC_RETRY_DELAY = 2000; // ms
                                const lastAttempt = (window._lastLocalStorageWriteAttemptAt && window._lastLocalStorageWriteAttemptAt[key]) || 0;
                                const now = Date.now();
                                if (now - lastAttempt > ASYNC_RETRY_DELAY) {
                                    window._lastLocalStorageWriteAttemptAt = window._lastLocalStorageWriteAttemptAt || {};
                                    window._lastLocalStorageWriteAttemptAt[key] = now;
                                    setTimeout(() => {
                                        try {
                                            const payload = (typeof value === 'string') ? value : JSON.stringify(value);
                                            try { localStorage.setItem(key, payload); delete window._localStorageFallback[key]; return; } catch (e) { }
                                            try { sessionStorage.setItem(key, payload); return; } catch (e2) { }
                                        } catch (inner) { }
                                    }, ASYNC_RETRY_DELAY);
                                }
                            } catch (schedErr) { }

                            // Throttle repeated console warnings to avoid spamming the console
                            const lastWarnAt = (window._lastLocalStorageWarnAt && window._lastLocalStorageWarnAt[key]) || 0;
                            const now2 = Date.now();
                            if (now2 - lastWarnAt > 60 * 1000) {
                                console.warn('safeLocalStorageSet failed to persist to localStorage (quota). Stored in-memory fallback for', key);
                                window._lastLocalStorageWarnAt = window._lastLocalStorageWarnAt || {};
                                window._lastLocalStorageWarnAt[key] = now2;
                            }
                            return true;
                        } catch (memErr) {
                            // fall through to outer error
                        }
                }
            } catch (e2) {
                console.warn('safeLocalStorageSet failed for', key, e2);
                return false;
            }
        }
    }

    function safeLocalStorageGet(key, defaultVal) {
        try {
            // Try persistent localStorage first
            try {
                const v = localStorage.getItem(key);
                if (v !== null) {
                    try { return JSON.parse(v); } catch (e) { return v; }
                }
            } catch (e) { /* ignore localStorage read errors */ }
            // Then try sessionStorage fallback
            try {
                if (typeof sessionStorage !== 'undefined') {
                    const sv = sessionStorage.getItem(key);
                    if (sv !== null) {
                        try { return JSON.parse(sv); } catch (ee) { return sv; }
                    }
                }
            } catch (e) { /* ignore */ }
            // Finally, check in-memory fallback
            try {
                if (window._localStorageFallback && Object.prototype.hasOwnProperty.call(window._localStorageFallback, key)) return window._localStorageFallback[key];
            } catch (e) { /* ignore */ }
            return defaultVal;
        } catch (e) { return defaultVal; }
    }

    window.safeLocalStorageSet = safeLocalStorageSet;
    window.safeLocalStorageGet = safeLocalStorageGet;
})();
