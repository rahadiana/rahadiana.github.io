// Centralized OkxClient that delegates all REST work to privateAPI.js
// This file intentionally does NOT implement signing/fetch fallbacks;
// it expects `js/modules/OkxClient/private/privateAPI.js` to be present
// and export a usable constructor (default export or module object).

const STORAGE_KEY = 'okx_api_config_v1';
const DEFAULT_BASE = 'https://www.okx.com';

function _readConfig() {
	try {
		// If the app is running in SIM mode, prefer the demo config if present.
		// This centralizes the demo-vs-real selection so callers don't need to
		// remember to set the `simulated` flag or swap storage keys.
		try {
			const appMode = (typeof window !== 'undefined') ? (localStorage.getItem('os_mode') || 'SIM') : 'SIM';
			if (String(appMode).toUpperCase() === 'SIM') {
				const demoRaw = localStorage.getItem(STORAGE_KEY + '_demo') || localStorage.getItem('okx_api_config_v1_demo');
				if (demoRaw) {
					try {
						const parsed = JSON.parse(demoRaw);
						// ensure the demo marker is present so downstream behavior (x-simulated-trading) is correct
						parsed.simulated = true;
						console.debug('[OkxClient] using demo API config because app mode=SIM');
						return parsed;
					} catch (e) {
						console.warn('[OkxClient] failed to parse demo config, falling back to primary config', e);
					}
				}
			}
		} catch (e) { /* non-fatal, fall through to primary config */ }

		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch (e) {
		return {};
	}
}

function _writeConfig(cfg) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg || {})); } catch (e) { } }

let _apiInstance = null;
let _posCache = null;
const POS_CACHE_TTL = 5000; // 5s throttle for global position fetches
let _posModeCache = null;
let _posModeCacheTime = 0;
const POS_MODE_CACHE_TTL = 60000; // 1 min cache for account config
async function _ensureApi() {
	const cfg = _readConfig();

	// Normalize common key field variants so demo configs using different
	// property names still work (e.g. { apiKey, apiSecret } vs { key, secret }).
	function _normalizeCfg(raw) {
		if (!raw || typeof raw !== 'object') return { key: '', secret: '', passphrase: '', simulated: !!raw };
		const key = raw.key || raw.apiKey || raw.api_key || raw.accessKey || raw['OK-ACCESS-KEY'] || raw.keyName || '';
		const secret = raw.secret || raw.apiSecret || raw.api_secret || raw.secretKey || raw['OK-ACCESS-SIGN'] || '';
		const passphrase = raw.passphrase || raw.passPhrase || raw.pass_word || raw.pass || raw.password || '';
		const simulated = !!(raw.simulated || raw.demo || raw.simulatedTrading || raw.simulated === '1' || raw.demo === true);
		return { key: String(key || ''), secret: String(secret || ''), passphrase: String(passphrase || ''), simulated };
	}
	const norm = _normalizeCfg(cfg || {});

	// If an instance exists and it matches the current stored credentials + simulated flag,
	// reuse it. Otherwise recreate so changes to demo/real selection take effect immediately.
	if (_apiInstance) {
		try {
			const sameKey = String(_apiInstance.apiKey || '') === norm.key;
			const sameSecret = String(_apiInstance.apiSecret || '') === norm.secret;
			const samePass = String(_apiInstance.passphrase || '') === norm.passphrase;
			const sameSim = !!_apiInstance.simulatedTrading === !!norm.simulated;
			if (sameKey && sameSecret && samePass && sameSim) return _apiInstance;
			_apiInstance = null;
		} catch (e) {
			_apiInstance = null;
		}
	}

	try {
		const mod = await import('./modules/OkxClient/private/privateAPI.js');
		const PrivateAPI = (mod && (mod.default || mod)) ? (mod.default || mod) : null;
		if (!PrivateAPI) throw new Error('privateAPI did not export a constructor');
		const boundFetch = (typeof window !== 'undefined' && window.fetch) ? window.fetch.bind(window) : undefined;
		// Small helper to mask long secrets in logs
		const mask = s => { try { s = String(s || ''); return s.length > 8 ? (s.slice(0, 4) + '...' + s.slice(-4)) : (s ? '***' : ''); } catch (e) { return '***'; } };
		console.debug('[OkxClient] initializing PrivateAPI with', { key: mask(norm.key), passphrase: mask(norm.passphrase), simulated: !!norm.simulated });
		_apiInstance = new PrivateAPI({ apiKey: norm.key, apiSecret: norm.secret, passphrase: norm.passphrase, simulatedTrading: !!norm.simulated, fetch: boundFetch });

		// Quick auth check: if the provided credentials return 401, and a demo config
		// exists in storage, switch to the demo config automatically and recreate the API instance.
		// [2026-02-16] Disabled eager check to prevent 429 loops. Validation should happen on 'Test' button or lazily.
		/*
		try {
			// perform a lightweight call to validate credentials
			await _apiInstance.get('/api/v5/account/balance');
			return _apiInstance;
		} catch (authErr) {
			// ... (auto-fallback logic removed for stability) ...
			throw authErr;
		}
		*/

		return _apiInstance;
	} catch (e) {
		console.error('[OkxClient] Failed to load privateAPI.js — ensure file exists and exports the API constructor.', e);
		throw e;
	}
}

const OkxClient = {
	configure(cfg = {}) {
		const cur = _readConfig();
		const merged = Object.assign({}, cur, cfg);
		_writeConfig(merged);
		// force re-init of API instance so new credentials are used
		_apiInstance = null;
		window.dispatchEvent(new Event('okx-config-changed'));
		return merged;
	},
	getConfig() { return _readConfig(); },
	isConfigured() { const c = _readConfig(); return !!(c && c.key && c.secret && c.passphrase); },
	clearConfig() { localStorage.removeItem(STORAGE_KEY); _apiInstance = null; window.dispatchEvent(new Event('okx-config-changed')); },

	// REST delegations — always use privateAPI.js instance
	async request(method, path, opts = {}) {
		const api = await _ensureApi();
		if (!api || typeof api.request !== 'function') throw new Error('PrivateAPI instance does not implement request()');
		this.clearCache(); // Any generic request might change state
		return api.request(method, path, opts);
	},
	clearCache() {
		_posCache = null;
		_posCacheTime = 0;
		// console.debug('[OkxClient] position cache cleared');
	},
	async get(path, params) { const api = await _ensureApi(); return api.get(path, params); },
	async post(path, body) { const api = await _ensureApi(); return api.post(path, body); },

	// Convenience wrappers
	async testCredentials() {
		try {
			const api = await _ensureApi();
			const r = await api.get('/api/v5/account/balance');
			const ok = !!(r && (r.code === '0' || r.code === 0));
			const cfg = _readConfig();
			const simulated = !!(cfg && cfg.simulated);
			return { ok, simulated, res: r };
		} catch (e) {
			return { ok: false, error: e };
		}
	},
	async getBalance(ccy) { const api = await _ensureApi(); return api.get('/api/v5/account/balance', ccy ? { ccy } : null); },
	async getPositions(instId) {
		const api = await _ensureApi();
		// If instId is provided, bypass cache for specific precision
		if (instId) return api.get('/api/v5/account/positions', { instId });

		// Check global cache
		const now = Date.now();
		if (_posCache && (now - _posCacheTime < POS_CACHE_TTL)) {
			return _posCache;
		}

		const res = await api.get('/api/v5/account/positions');
		if (res && (res.code === '0' || res.code === 0)) {
			_posCache = res;
			_posCacheTime = now;
		}
		return res;
	},
	async getPositionsHistory(instId) { const api = await _ensureApi(); return api.get('/api/v5/account/positions-history', instId ? { instId } : null); },
	// Backwards-compatible aliases expected by UI
	async fetchPositions(instId) { return this.getPositions(instId); },
	// Default `fetchFills` returns recent fills (preferred). Use `fetchFillsHistory` for older records.
	async fetchFills(params) {
		const api = await _ensureApi();
		const p = Object.assign({}, params || {});
		if (!p.limit) p.limit = 100;
		if (typeof api.getFills === 'function') return api.getFills(p);
		return api.get('/api/v5/trade/fills', p);
	},
	async fetchFillsHistory(params) { const api = await _ensureApi(); if (typeof api.getFillsHistory === 'function') return api.getFillsHistory(params || null); return api.get('/api/v5/trade/fills-history', params || null); },
	// Convenience wrapper for recent fills endpoint ( /api/v5/trade/fills )
	async fetchRecentFills(params) {
		const api = await _ensureApi();
		const p = Object.assign({}, params || {});
		if (!p.limit) p.limit = 100;
		if (typeof api.getFills === 'function') return api.getFills(p);
		return api.get('/api/v5/trade/fills', p);
	},
	async setLeverage(body) { const api = await _ensureApi(); return api.post('/api/v5/account/set-leverage', body); },
	async placeOrder(body) {
		const api = await _ensureApi();
		try {
			const savedMode = localStorage.getItem('okx_margin_mode');
			if (savedMode) {
				body.tdMode = savedMode;
				// also set compatibility field
				body.mgnMode = savedMode;
			}
		} catch (e) { /* ignore */ }
		// debug: log effective payload and saved mode
		try { console.debug('[OkxClient] placeOrder payload:', { savedMode: localStorage.getItem('okx_margin_mode'), body }); } catch (e) { }
		// Auto-adjust size to instrument lot step if provided
		try {
			if (body && body.instId && body.sz) {
				const adj = await OkxClient.adjustSize(body.instId, body.sz);
				if (adj !== String(body.sz)) {
					console.debug('[OkxClient] adjusted sz from', body.sz, 'to', adj, 'for', body.instId);
				}
				body.sz = String(adj);
				if (parseFloat(body.sz) === 0) throw new Error('Adjusted order size is 0 — requested size too small for instrument lot step');
			}
		} catch (e) { console.warn('[OkxClient] adjustSize failed or produced zero size', e); }
		// Determine whether `posSide` is required by account config (long_short vs net)
		try {
			let m = body && (body.tdMode || body.mgnMode || localStorage.getItem('okx_margin_mode'));
			m = (m === undefined || m === null) ? '' : String(m).toLowerCase();

			// Try to detect account position mode from OKX: posMode = 'net' | 'long_short'
			let posMode = null;
			try {
				const cfg = await this.get('/api/v5/account/config');
				if (cfg && cfg.data && Array.isArray(cfg.data) && cfg.data[0] && cfg.data[0].posMode) {
					posMode = String(cfg.data[0].posMode).toLowerCase();
					console.debug('[OkxClient] account posMode detected:', posMode);
				}
			} catch (e) {
				console.debug('[OkxClient] account posMode detection failed, falling back to previous behavior');
			}

			const posSideRequired = (posMode === 'long_short');

			// If we successfully detected posMode and account is NOT in long_short (hedge) mode,
			// remove any posSide the UI may have set to avoid OKX 51000 errors.
			if (posMode !== null && !posSideRequired && body && body.posSide) {
				console.debug('[OkxClient] account posMode is not long_short; removing posSide from payload to avoid errors');
				try { delete body.posSide; } catch (e) { body.posSide = undefined; }
			}

			// If account uses long_short (hedge) and margin mode is isolated and posSide not provided, set posSide from side
			if (m === 'isolated' && body && !body.posSide && body.side && posSideRequired) {
				const s = (body.side === undefined || body.side === null) ? '' : String(body.side).toLowerCase();
				if (s === 'buy' || s === 'b') body.posSide = 'long';
				else if (s === 'sell' || s === 's') body.posSide = 'short';
				if (body.posSide) console.debug('[OkxClient] inferred posSide for isolated mode:', body.posSide);
			}

			// If posMode detection failed (null), preserve backward-compatible behavior: infer posSide for isolated
			if (posMode === null && m === 'isolated' && body && !body.posSide && body.side) {
				const s = (body.side === undefined || body.side === null) ? '' : String(body.side).toLowerCase();
				if (s === 'buy' || s === 'b') body.posSide = 'long';
				else if (s === 'sell' || s === 's') body.posSide = 'short';
				if (body.posSide) console.debug('[OkxClient] fallback-inferred posSide for isolated mode:', body.posSide);
			}
		} catch (e) { }

		// Sanitize size: OKX expects positive `sz` (side determines direction). Convert negative sizes to positive.
		try {
			if (body && body.sz !== undefined && body.sz !== null) {
				const n = parseFloat(body.sz);
				if (!isNaN(n) && n < 0) {
					console.warn('[OkxClient] detected negative sz, converting to positive', body.sz);
					body.sz = String(Math.abs(n));
				}
			}
		} catch (e) { console.warn('[OkxClient] sz sanitization failed', e); }

		// Pre-flight balance check for REAL orders to avoid obvious insufficient-funds rejections
		try {
			const appMode = (typeof window !== 'undefined') ? (localStorage.getItem('os_mode') || 'SIM') : 'SIM';
			if (appMode === 'REAL') {
				try {
					const balRes = await this.get('/api/v5/account/balance');
					let availUSDT = 0;
					if (balRes && balRes.data && Array.isArray(balRes.data)) {
						for (const a of balRes.data) {
							if (!a || !a.details) continue;
							const d = a.details.find(x => x.ccy === 'USDT');
							if (d) { availUSDT = parseFloat(d.avail || d.availBal || d.availEq || d.balance || 0); break; }
						}
					}
					console.debug('[OkxClient] pre-flight USDT available:', availUSDT);
					if (availUSDT <= 0) throw new Error('Insufficient USDT available: ' + availUSDT);
				} catch (e) {
					console.warn('[OkxClient] pre-flight balance check failed or insufficient', e && e.message ? e.message : e);
					throw e;
				}
			}
		} catch (e) { /* allow outer caller to handle */ }
		// Ensure leverage is applied before placing the order when possible
		try {
			if (body && (body.instId || body.instId === 0) && (body.tdMode || body.mgnMode)) {
				const effTd = body.tdMode || body.mgnMode;
				const effLev = body.lever || localStorage.getItem('okx_default_leverage') || null;
				if (effLev) {
					try {
						console.debug('[OkxClient] applying leverage before order', { instId: body.instId, mgnMode: effTd, lever: String(effLev) });
						await this.setLeverageFor({ instId: body.instId, tdMode: effTd, lever: String(effLev), ...(body.posSide ? { posSide: body.posSide } : {}) });
					} catch (e) { console.warn('[OkxClient] setLeverageFor before order failed', e); }
				}
			}
		} catch (e) { /* non-fatal */ }

		// send with retry logic for posSide issues

		// Enforce max open positions for REAL mode: block creating a new distinct open position
		try {
			const appMode = (typeof window !== 'undefined') ? (localStorage.getItem('os_mode') || 'SIM') : 'SIM';
			if (appMode === 'REAL') {
				const maxReal = parseInt(localStorage.getItem('os_max_positions') || localStorage.getItem('os_max_real_positions') || localStorage.getItem('os_alloc_max') || '0', 10) || 0;
				// only enforce if configured and order is not explicitly reduceOnly
				if (maxReal > 0 && !(body && (body.reduceOnly === true || String(body.reduceOnly) === 'true'))) {
					try {
						const posRes = await this.get('/api/v5/account/positions');
						const list = (posRes && posRes.data && Array.isArray(posRes.data)) ? posRes.data : [];
						const openList = list.filter(p => {
							const qty = Number(p.pos || p.posSize || p.qty || p.size || 0);
							return !isNaN(qty) && Math.abs(qty) > 0;
						});
						const instUpper = (body && body.instId) ? String(body.instId).toUpperCase() : null;
						const exists = instUpper ? openList.find(p => (p.instId || '').toUpperCase() === instUpper) : null;
						if (!exists && openList.length >= maxReal) {
							throw new Error(`Max real positions reached (${openList.length}/${maxReal})`);
						}
					} catch (e) {
						console.warn('[OkxClient] max-open-positions check failed or blocked order', e && e.message ? e.message : e);
						throw e;
					}
				}
			}
		} catch (e) { /* allow outer caller to handle */ }
		try {
			const res = await api.post('/api/v5/trade/order', body);
			this.clearCache();
			return res;
		} catch (err) {
			// Inspect OKX error for posSide parameter issue (51000)
			try {
				const data = err && err.body ? err.body : null;
				const first = data && data.data && Array.isArray(data.data) && data.data[0] ? data.data[0] : null;
				if (first && (String(first.sCode) === '51000' || (first.sMsg || '').toLowerCase().includes('posside'))) {
					console.warn('[OkxClient] placeOrder got posSide error, attempting fallbacks', first.sMsg || first);
					// Normalize posSide if present
					if (body && body.posSide) {
						body.posSide = String(body.posSide).trim().toLowerCase();
						try {
							console.debug('[OkxClient] retrying with normalized posSide', body.posSide);
							const r2 = await api.post('/api/v5/trade/order', body);
							return r2;
						} catch (e2) {
							console.warn('[OkxClient] retry normalized posSide failed', e2 && e2.body ? e2.body : e2);
						}
					}
					// Last resort: remove posSide and retry
					if (body && body.posSide) {
						const clone = Object.assign({}, body);
						delete clone.posSide;
						console.debug('[OkxClient] retrying without posSide');
						try {
							const r3 = await api.post('/api/v5/trade/order', clone);
							return r3;
						} catch (e3) {
							console.warn('[OkxClient] retry without posSide failed', e3 && e3.body ? e3.body : e3);
						}
					}
				}
			} catch (e) { /* ignore parsing errors */ }
			// rethrow original error if fallbacks failed
			throw err;
		}
	},
	async cancelOrder(body) {
		const api = await _ensureApi();
		this.clearCache();
		return api.post('/api/v5/trade/cancel-order', body);
	},
	async fetchOpenOrders(instId) {
		const api = await _ensureApi();
		try {
			// Fetch standard and algo orders in parallel
			const [stdRes, ocoRes, condRes] = await Promise.all([
				api.get('/api/v5/trade/orders-pending', instId ? { instId } : null).catch(e => ({ data: [] })),
				api.get('/api/v5/trade/orders-algo-pending', instId ? { instId, ordType: 'oco' } : { ordType: 'oco' }).catch(e => ({ data: [] })),
				api.get('/api/v5/trade/orders-algo-pending', instId ? { instId, ordType: 'conditional' } : { ordType: 'conditional' }).catch(e => ({ data: [] }))
			]);
			const list = [...(stdRes.data || []), ...(ocoRes.data || []), ...(condRes.data || [])];
			return { code: '0', data: list };
		} catch (e) {
			console.warn('[OkxClient] fetchOpenOrders combined error', e);
			return { code: '1', data: [], msg: e.message };
		}
	},
	async amendOrder(body) {
		const api = await _ensureApi();
		this.clearCache();
		return api.post('/api/v5/trade/amend-order', body);
	},
	async closePosition(body) {
		const api = await _ensureApi();
		try {
			const savedMode = localStorage.getItem('okx_margin_mode');
			if (savedMode) {
				body.tdMode = savedMode;
				body.mgnMode = savedMode;
			}
		} catch (e) { /* ignore */ }
		try { console.debug('[OkxClient] closePosition payload:', { savedMode: localStorage.getItem('okx_margin_mode'), body }); } catch (e) { }
		this.clearCache();
		return api.post('/api/v5/trade/close-position', body);
	}
};

// Higher-level helpers (convenience wrappers similar to server reference)
function assertTdMode(tdMode) {
	if (!tdMode) throw new Error('tdMode is required: cross | isolated');
}

// attach helper functions to the OkxClient facade
OkxClient.openLong = async function ({ instId, sz, ordType = 'market', px, tdMode } = {}) {
	assertTdMode(tdMode);
	return this.placeOrder({ instId, tdMode, side: 'buy', ordType, sz: String(sz), ...(px ? { px: String(px) } : {}) });
};

OkxClient.openShort = async function ({ instId, sz, ordType = 'market', px, tdMode } = {}) {
	assertTdMode(tdMode);
	return this.placeOrder({ instId, tdMode, side: 'sell', ordType, sz: String(sz), ...(px ? { px: String(px) } : {}) });
};

OkxClient.openLongHedge = async function ({ instId, sz, ordType = 'market', px, tdMode } = {}) {
	assertTdMode(tdMode);
	return this.placeOrder({ instId, tdMode, side: 'buy', posSide: 'long', ordType, sz: String(sz), ...(px ? { px: String(px) } : {}) });
};

OkxClient.openShortHedge = async function ({ instId, sz, ordType = 'market', px, tdMode } = {}) {
	assertTdMode(tdMode);
	return this.placeOrder({ instId, tdMode, side: 'sell', posSide: 'short', ordType, sz: String(sz), ...(px ? { px: String(px) } : {}) });
};

// Place an order by USD notional: convert USD -> contracts using ctVal or price, adjust to lot step, then place
OkxClient.placeOrderByUsd = async function ({ instId, usd, side = 'buy', ordType = 'market', tdMode = null, px = null, posSide = null } = {}) {
	if (!instId) throw new Error('instId is required');
	if (!usd && usd !== 0) throw new Error('usd amount is required');
	const usdNum = parseFloat(usd);
	if (!isFinite(usdNum) || usdNum <= 0) throw new Error('usd must be a positive number');

	// attempt to find instrument ctVal
	let ctVal = null;
	let price = null;
	try {
		const instType = instId.includes('-SWAP') ? 'SWAP' : 'SPOT';
		const infoRes = await this.get('/api/v5/public/instruments', { instType, instId });
		const info = infoRes && infoRes.data && infoRes.data[0] ? infoRes.data[0] : null;
		if (info) ctVal = parseFloat(info.ctVal || info.contractVal || info.contractValUSD || 0) || null;
	} catch (e) { /* ignore */ }

	// fallback to ticker price if ctVal unavailable
	if (!ctVal) {
		try {
			const tk = await this.get('/api/v5/market/ticker', { instId });
			const t = tk && tk.data && tk.data[0] ? tk.data[0] : null;
			price = parseFloat(t && (t.last || t.lastPx || t.px) ? (t.last || t.lastPx || t.px) : NaN) || null;
		} catch (e) { /* ignore */ }
	}

	let contracts = 0;
	if (ctVal && ctVal > 0) contracts = usdNum / ctVal;
	else if (price && price > 0) contracts = usdNum / price;
	else throw new Error('Unable to determine conversion (no ctVal and no market price)');

	// use adjustSize to round to instrument lot step
	const adjusted = await this.adjustSize(instId, String(contracts));
	if (!adjusted || parseFloat(adjusted) <= 0) throw new Error('Converted size too small after adjusting to lot step');

	const payload = { instId, side, ordType, sz: String(adjusted) };
	// include price if provided (for limit orders)
	if (px) payload.px = String(px);
	// include tdMode if provided; otherwise placeOrder will inject saved mode
	if (tdMode) { payload.tdMode = tdMode; payload.mgnMode = tdMode; }
	if (posSide) payload.posSide = posSide;

	// delegate to placeOrder which already does pre-flight leverage application, checks and retries
	return this.placeOrder(payload);
};

OkxClient.setLeverageFor = async function ({ instId, lever, tdMode, posSide } = {}) {
	if (!lever) throw new Error('lever is required');
	if (!tdMode) throw new Error('tdMode is required');
	return this.setLeverage({ instId, lever: String(lever), mgnMode: tdMode, ...(posSide ? { posSide } : {}) });
};

OkxClient.placeTPSL = async function (opts = {}) {
	const { instId, tdMode, side, posSide, sz, slTriggerPx, slOrdPx, tpTriggerPx, tpOrdPx } = opts;
	if (!instId) throw new Error('instId is required');
	if (!tdMode) throw new Error('tdMode is required');
	if (!side) throw new Error('side is required');
	if (!slTriggerPx && !tpTriggerPx) throw new Error('slTriggerPx or tpTriggerPx required');

	const hasTP = !!tpTriggerPx;
	const hasSL = !!slTriggerPx;

	const payload = { instId, tdMode, side, ordType: 'conditional', reduceOnly: true };
	if (posSide) payload.posSide = posSide;
	if (sz) payload.sz = String(sz);

	if (hasTP && hasSL) {
		payload.slTriggerPx = String(slTriggerPx);
		payload.slOrdPx = slOrdPx ? String(slOrdPx) : '-1';
		payload.tpTriggerPx = String(tpTriggerPx);
		payload.tpOrdPx = tpOrdPx ? String(tpOrdPx) : '-1';
		payload.ordType = 'oco';
	} else if (hasSL) {
		payload.slTriggerPx = String(slTriggerPx);
		payload.slOrdPx = slOrdPx ? String(slOrdPx) : '-1';
	} else if (hasTP) {
		payload.tpTriggerPx = String(tpTriggerPx);
		payload.tpOrdPx = tpOrdPx ? String(tpOrdPx) : '-1';
	}

	// include both names for compatibility
	payload.tdMode = tdMode;
	payload.mgnMode = tdMode;

	return this.post('/api/v5/trade/order-algo', payload);
};

OkxClient.getPosition = async function (instId, instType = 'SWAP') {
	const params = {};
	if (instType) params.instType = instType;
	if (instId) params.instId = instId;
	return this.get('/api/v5/account/positions', params);
};

OkxClient.closePositionBy = async function ({ instId, tdMode, posSide = 'net', sz } = {}) {
	if (!instId) throw new Error('instId is required');
	if (!tdMode) throw new Error('tdMode is required');

	// ⚡ Helper to perform an attempt and throw a retryable error on business failure
	const attempt = async (p) => {
		const res = await this.post('/api/v5/trade/close-position', p);
		if (res && res.code === '0') return res;
		const msg = res.msg || res.message || `OKX Error ${res.code}`;
		const err = new Error(msg);
		err.code = res.code;
		err.body = res; // Attach response for retry detection
		throw err;
	};

	// ⚡ 1. Initial Detection & Payload Prep
	let detectedPosSide = undefined;
	try {
		const now = Date.now();
		let posMode = _posModeCache;
		if (!posMode || (now - _posModeCacheTime > POS_MODE_CACHE_TTL)) {
			const acfg = await this.get('/api/v5/account/config');
			posMode = (acfg?.data?.[0]?.posMode || 'net').toLowerCase();
			_posModeCache = posMode;
			_posModeCacheTime = now;
			console.debug('[OkxClient] detected posMode:', posMode);
		}

		if (posMode === 'long_short') {
			const s = String(posSide || '').toLowerCase();
			detectedPosSide = (s === 'long' || s === 'buy' || s === 'b' || s.includes('long')) ? 'long' : 'short';
		}
	} catch (e) {
		console.warn('[OkxClient] posMode detection failed, proceeding with inference', e);
	}

	const payload = { instId, mgnMode: tdMode };
	if (detectedPosSide) payload.posSide = detectedPosSide;
	if (sz) payload.sz = String(sz);

	try {
		const res = await this.post('/api/v5/trade/close-position', payload);
		this.clearCache();

		if (res && res.code !== '0') {
			// Check for posSide error even in success-envelope
			if (res.code === '51000' || (res.msg || '').toLowerCase().includes('posside')) {
				throw { body: res };
			}
			const msg = res.msg || res.message || `OKX Error ${res.code}`;
			const err = new Error(msg);
			err.code = res.code;
			err.body = res; // ⚡ Attach body for retry logic
			err.data = res.data;
			throw err;
		}
		return res;
	} catch (err) {
		// ⚡ ROBUST RETRY LOGIC for posSide parameter issue (51000)
		try {
			const data = err && err.body ? err.body : null;
			const code = data ? String(data.code || (data.data && data.data[0] ? data.data[0].sCode : '')) : '';
			const msg = data ? String(data.msg || (data.data && data.data[0] ? data.data[0].sMsg : '')) : '';

			if (code === '51000' || msg.toLowerCase().includes('posside')) {
				console.warn('[OkxClient] closePositionBy got posSide error, attempting fallbacks', msg);
				_posModeCache = null; // Invalidate cache on posSide error

				// Fallback 1: If posSide was missing, add it
				if (!payload.posSide) {
					const s = String(posSide || '').toLowerCase();
					payload.posSide = (s === 'long' || s === 'buy' || s === 'b' || s.includes('long')) ? 'long' : 'short';
					console.debug('[OkxClient] retrying close-position with added posSide:', payload.posSide);
					const r2 = await this.post('/api/v5/trade/close-position', payload);
					if (r2 && r2.code === '0') return r2;

					// If it still failed, try the OTHER side just in case detection was inverted
					const other = (payload.posSide === 'long') ? 'short' : 'long';
					console.debug('[OkxClient] retry 1 failed, trying opposite posSide:', other);
					payload.posSide = other;
					const r3 = await this.post('/api/v5/trade/close-position', payload);
					if (r3 && r3.code === '0') return r3;
				}
				// Fallback 2: If posSide was present, remove it
				else {
					const clone = Object.assign({}, payload);
					delete clone.posSide;
					console.debug('[OkxClient] retrying close-position without posSide');
					const r4 = await this.post('/api/v5/trade/close-position', clone);
					if (r4 && r4.code === '0') return r4;
				}
			}
		} catch (e) { console.warn('[OkxClient] closePositionBy retry logic failed', e); }

		throw err;
	}
};

// Fetch positions history over a recent time window (months). Returns entries
// in reverse chronological order (newest first) using `uTime` as the timestamp.
// This helper will page through `/api/v5/account/positions-history` until it
// reaches records older than `months` or no more pages.
OkxClient.fetchPositionsHistoryRange = async function ({ months = 3, instId = null, instType = null, mgnMode = null, limitPerPage = 100 } = {}) {
	const now = Date.now();
	const sinceMs = now - Math.max(1, months) * 30 * 24 * 60 * 60 * 1000; // approximate months -> ms
	const results = [];
	let after = null; // used to page earlier records
	const pageLimit = Math.min(100, Math.max(1, parseInt(limitPerPage, 10) || 100));
	while (true) {
		const params = { limit: pageLimit };
		if (instId) params.instId = instId;
		if (instType) params.instType = instType;
		if (mgnMode) params.mgnMode = mgnMode;
		if (after) params.after = String(after);
		let page;
		try {
			const res = await this.get('/api/v5/account/positions-history', params);
			page = (res && res.data && Array.isArray(res.data)) ? res.data : [];
		} catch (e) {
			throw e;
		}
		if (!page || page.length === 0) break;
		// append
		for (const p of page) results.push(p);
		// determine oldest uTime in this page (smallest)
		const times = page.map(d => Number(d.uTime || d.cTime || 0)).filter(Boolean);
		if (!times.length) break;
		const minTime = Math.min(...times);
		// stop if we've reached records older than the requested window
		if (minTime <= sinceMs) break;
		// set after to minTime to fetch earlier records next iteration
		after = String(minTime);
		// be polite with rate limits
		await new Promise(r => setTimeout(r, 220));
		// safety guard
		if (results.length > 20000) break;
	}
	// filter records to window and sort reverse-chronological by uTime
	const filtered = results.filter(d => Number(d.uTime || d.cTime || 0) >= sinceMs);
	filtered.sort((a, b) => Number(b.uTime || b.cTime || 0) - Number(a.uTime || a.cTime || 0));
	return { code: '0', data: filtered };
};

// Adjust an order size to instrument lot step (returns string)
OkxClient.adjustSize = async function (instId, requestedSz) {
	if (!instId) throw new Error('instId is required');
	if (!requestedSz) return String(requestedSz || '0');
	try {
		let info = null;
		// Primary: query specific instrument
		try {
			const instType = instId.includes('-SWAP') ? 'SWAP' : 'SPOT';
			const res = await this.get('/api/v5/public/instruments', { instType, instId });
			info = (res && res.data && Array.isArray(res.data) && res.data[0]) ? res.data[0] : (res && res.data ? res.data : null);
		} catch (err) {
			console.debug('[OkxClient] adjustSize primary instrument lookup failed', err && err.message ? err.message : err);
		}
		// Fallback: fetch list of SWAP instruments and try to find a matching instId
		if (!info) {
			try {
				const all = await this.get('/api/v5/public/instruments', { instType: 'SWAP' });
				const list = (all && all.data && Array.isArray(all.data)) ? all.data : [];
				info = list.find(i => (i.instId && i.instId.toUpperCase() === String(instId).toUpperCase()) || (i.instId && String(i.instId).toUpperCase().includes(String(instId).toUpperCase())) || (i.symbol && String(i.symbol).toUpperCase() === String(instId).toUpperCase()));
				if (info) console.debug('[OkxClient] adjustSize found instrument in fallback list', info.instId || info.symbol);
			} catch (err) {
				console.debug('[OkxClient] adjustSize fallback instrument list lookup failed', err && err.message ? err.message : err);
			}
		}
		// Prefer common OKX fields for lot/step
		let step = null;
		if (info) {
			step = info.lotSz || info.minSz || info.stepSize || info.sizeIncrement || info.sz || info.tickSz || info.minSize;
		}
		console.debug('[OkxClient] adjustSize instrument info:', instId, info ? { lotSz: info.lotSz, minSz: info.minSz, ctVal: info.ctVal, contractVal: info.contractVal, tickSz: info.tickSz, instType: info.instType } : null);
		if (!step) return String(requestedSz);
		const sStep = parseFloat(step);
		const sReq = parseFloat(requestedSz);
		if (!isFinite(sStep) || !isFinite(sReq) || sStep <= 0) return String(requestedSz);
		// calculate decimals from step string where possible
		const decimals = (String(step).split('.')[1] || '').length;
		// Try interpreting the requested size directly (user provided contracts/coins matching API expectations)
		const tryDirect = () => {
			const adjustedNum = Math.floor(sReq / sStep) * sStep;
			const final = adjustedNum <= 0 ? 0 : Number(adjustedNum.toFixed(decimals));
			return { value: final, usedConversion: false };
		};
		// If instrument provides contract value (ctVal/contractVal), try converting user-provided size -> contracts
		const tryWithCt = () => {
			const ct = info && (info.ctVal || info.contractVal || info.contractValUSD);
			if (!ct) return { value: 0, usedConversion: false };
			const ctNum = parseFloat(ct);
			if (!isFinite(ctNum) || ctNum <= 0) return { value: 0, usedConversion: false };
			// interpret requestedSz as base-asset amount; compute number of contracts
			const asContracts = sReq / ctNum;
			if (!isFinite(asContracts) || asContracts <= 0) return { value: 0, usedConversion: true };
			const adjustedContracts = Math.floor(asContracts / sStep) * sStep;
			const final = adjustedContracts <= 0 ? 0 : Number(adjustedContracts.toFixed(decimals));
			return { value: final, usedConversion: true, ct: ctNum, asContracts };
		};

		const direct = tryDirect();
		const viaCt = tryWithCt();

		const instType = (info && info.instType) ? info.instType : (instId.includes('-SWAP') ? 'SWAP' : 'SPOT');

		// ⚡ PRIORITY: If SWAP/FUTURE and contract value is present, prioritized viaCt (conversion)
		if (instType === 'SWAP' || instType === 'FUTURES') {
			if (viaCt.value > 0) {
				console.debug('[OkxClient] adjustSize (SWAP) chose viaCt', { requested: sReq, ctVal: viaCt.ct, asContracts: viaCt.asContracts, adjusted: viaCt.value });
				return String(viaCt.value.toFixed(decimals));
			}
			// If conversion was attempted but resulted in 0 (too small), return 0 to explicitly block invalid orders
			if (viaCt.usedConversion && sReq > 0) {
				console.debug('[OkxClient] adjustSize (SWAP) result too small; returning 0');
				return "0";
			}
		}

		if (direct.value > 0) {
			console.debug('[OkxClient] adjustSize chosen direct', { requested: sReq, step: sStep, adjusted: direct.value });
			return String(direct.value.toFixed(decimals));
		}

		// nothing valid — return original request if we can't adjust
		console.debug('[OkxClient] adjustSize produced zero/invalid; fallback to original requested value', { requested: sReq, instType });
		return String(requestedSz);
	} catch (e) {
		console.warn('[OkxClient] adjustSize error', e && e.message ? e.message : e);
		return String(requestedSz);
	}
};

// --- ALGO ORDERS (TP/SL) ---

OkxClient.placeAlgoOrder = async function (body) {
	const api = await _ensureApi();
	this.clearCache();
	return api.placeAlgoOrder(body);
};

OkxClient.cancelAlgoOrders = async function (orders) {
	const api = await _ensureApi();
	this.clearCache();
	return api.cancelAlgoOrders(orders);
};

OkxClient.getAlgoOrdersPending = async function (params) {
	const api = await _ensureApi();
	return api.getAlgoOrdersPending(params);
};

/**
 * Dynamic TP/SL Sync:
 * 1. Cancel existing TP/SL algo orders for instId
 * 2. Fetch current position to get avgPx and pos
 * 3. Place new TP/SL algo order if tpPct or slPct provided
 */
OkxClient.syncTpSl = async function (instId, tpPct, slPct) {
	if (!instId) throw new Error('instId is required for syncTpSl');

	console.log(`[OkxClient] Syncing TP/SL for ${instId} (TP:${tpPct}%, SL:${slPct}%)`);

	// 1. Fetch and Cancel Existing TP/SL Algos
	try {
		// Use ordType: 'oco' or 'conditional' for pending orders check. 
		// For thoroughness, we check both or just 'oco,conditional' if API supports comma-separated (usually it doesn't).
		// Better: Fetch specifically 'oco' then 'conditional' or just use 'conditional' if that covers basic TP/SL.
		// Actually, OKX pending algo usually takes one ordType. We'll try 'oco' first then 'conditional'.
		const fetchPending = async (ot) => {
			const res = await this.getAlgoOrdersPending({ instId, ordType: ot });
			return (res && res.data) ? res.data : [];
		};
		const pendingOco = await fetchPending('oco');
		const pendingCond = await fetchPending('conditional');
		const pending = [...pendingOco, ...pendingCond];

		if (pending.length > 0) {
			console.log(`[OkxClient] Found ${pending.length} existing TP/SL orders for ${instId}. Canceling...`);
			const toCancel = pending.map(o => ({ instId: o.instId, algoId: o.algoId }));
			await this.cancelAlgoOrders(toCancel);
		}
	} catch (e) {
		console.warn('[OkxClient] Failed to cleanup old TP/SL orders:', e.message);
	}

	if (!tpPct && !slPct) return { success: true, msg: 'No TP/SL values provided, cleanup only.' };

	// 2. Fetch Current Position
	let posInfo = null;
	try {
		const posRes = await this.fetchPositions();
		const positions = (posRes && posRes.data) ? posRes.data : [];
		posInfo = positions.find(p => p.instId === instId);
	} catch (e) {
		throw new Error(`Failed to fetch position for ${instId}: ${e.message}`);
	}

	if (!posInfo || Math.abs(Number(posInfo.pos || 0)) === 0) {
		console.log(`[OkxClient] No active position found for ${instId}. Skipping TP/SL placement.`);
		return { success: false, msg: 'No active position' };
	}

	const avgPx = parseFloat(posInfo.avgPx);
	const posSize = Math.abs(parseFloat(posInfo.pos));
	// posSide can be 'long', 'short', or 'net'
	const posSide = posInfo.posSide || 'net';
	const tdMode = posInfo.mgnMode || localStorage.getItem('okx_margin_mode') || 'cross';

	if (!isFinite(avgPx) || avgPx <= 0) throw new Error('Invalid average price for position');

	// 3. Calculate Trigger Prices
	let tpTriggerPx = null;
	let slTriggerPx = null;

	if (tpPct > 0) {
		const move = avgPx * (tpPct / 100);
		const isPosLong = (posSide === 'long') || (posSide === 'net' && parseFloat(posInfo.pos) > 0);
		tpTriggerPx = isPosLong ? (avgPx + move) : (avgPx - move);
	}
	if (slPct > 0) {
		const move = avgPx * (slPct / 100);
		const isPosLong = (posSide === 'long') || (posSide === 'net' && parseFloat(posInfo.pos) > 0);
		slTriggerPx = isPosLong ? (avgPx - move) : (avgPx + move);
	}

	// Calculate Side to Close
	// If Hedge mode: side is opposite of posSide.
	// If Net mode: side is opposite of position sign (pos > 0 => long => side=sell)
	const isLong = (posSide === 'long') || (posSide === 'net' && parseFloat(posInfo.pos) > 0);
	const side = isLong ? 'sell' : 'buy';

	// OKX algo orders expect 'oco' for combined TP/SL or 'conditional' for single ones.
	const ordType = (tpTriggerPx && slTriggerPx) ? 'oco' : 'conditional';

	const payload = {
		instId,
		tdMode,
		side: side,
		posSide: posSide,
		ordType: ordType,
		sz: String(posSize),
		tpTriggerPx: tpTriggerPx ? String(tpTriggerPx.toFixed(8)) : undefined,
		tpOrdPx: tpTriggerPx ? '-1' : undefined, // -1 means market
		slTriggerPx: slTriggerPx ? String(slTriggerPx.toFixed(8)) : undefined,
		slOrdPx: slTriggerPx ? '-1' : undefined
	};

	// Remove undefined fields
	Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

	console.log(`[OkxClient] Placing new TP/SL for ${instId}:`, payload);
	try {
		const res = await this.placeAlgoOrder(payload);
		if (res && res.code === '0') {
			console.log(`[OkxClient] TP/SL placed successfully for ${instId}`);
			return { success: true, data: res.data };
		} else {
			throw new Error(res.msg || 'Unknown error placing algo order');
		}
	} catch (e) {
		console.error(`[OkxClient] Failed to place TP/SL for ${instId}:`, e.message);
		throw e;
	}
};

export default OkxClient;

// Expose for debugging in browser console
try {
	if (typeof window !== 'undefined' && !window.OkxClient) {
		window.OkxClient = OkxClient;
		console.debug('[OkxClient] exposed on window.OkxClient for debugging');
	}
} catch (e) { }

