
/**
 * Minimal OKX v5 Private REST API helper
 * - HMAC-SHA256 signing (browser SubtleCrypto + Node `crypto`)
 * - `request` wrapper using provided `fetch` or global `fetch` with Node fallback
 * - Convenience `get`, `post`, `put`, `delete` methods
 *
 * Usage:
 * const api = new PrivateAPI({ apiKey, apiSecret, passphrase, simulatedTrading: true });
 * await api.get('/api/v5/account/balance');
 */

class PrivateAPI {
	constructor(opts = {}) {
		this.apiKey = opts.apiKey;
		this.apiSecret = opts.apiSecret;
		this.passphrase = opts.passphrase;
		this.baseUrl = opts.baseUrl || 'https://www.okx.com';
		// enable demo (simulated) trading mode which requires special header
		this.simulatedTrading = !!(opts.simulatedTrading || opts.demo);
		// allow injection of fetch for testability
		this._fetch = opts.fetch || ((typeof fetch !== 'undefined') ? fetch.bind(globalThis) : null);
		if (!this._fetch) {
			try {
				let nf = require('node-fetch');
				this._fetch = (nf && nf.default) ? nf.default : nf;
			} catch (e) { }
		}
		if (!this._fetch) throw new Error('No fetch available. In Node install node-fetch or pass a fetch option.');
	}

	_timestamp() { return new Date().toISOString(); }

	async _hmacSha256Base64(message) {
		const secret = this.apiSecret || '';
		// Browser
		if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
			const enc = new TextEncoder();
			const keyData = enc.encode(secret);
			const msg = enc.encode(message);
			const key = await globalThis.crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
			const sig = await globalThis.crypto.subtle.sign('HMAC', key, msg);
			return base64FromArrayBuffer(sig);
		}

		// Node
		try {
			const crypto = require('crypto');
			return crypto.createHmac('sha256', secret).update(message).digest('base64');
		} catch (e) {
			throw new Error('No crypto available to sign request');
		}
	}

	async _buildHeaders(method, requestPath, bodyString) {
		const timestamp = this._timestamp();
		const prehash = `${timestamp}${method.toUpperCase()}${requestPath}${bodyString || ''}`;
		const sign = await this._hmacSha256Base64(prehash);
		const headers = {
			'Content-Type': 'application/json',
			'OK-ACCESS-KEY': this.apiKey || '',
			'OK-ACCESS-SIGN': sign || '',
			'OK-ACCESS-TIMESTAMP': timestamp,
			'OK-ACCESS-PASSPHRASE': this.passphrase || ''
		};
		// Always include demo header explicitly: '1' for simulated, '0' for real
		headers['x-simulated-trading'] = this.simulatedTrading ? '1' : '0';
		return headers;
	}

	_buildUrl(path, params) {
		let url;
		if (/^https?:\/\//.test(path)) url = path;
		else url = (this.baseUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, ''));
		if (params && Object.keys(params).length) {
			// filter out null/undefined/empty-string params to avoid sending `param=undefined`
			const entries = Object.keys(params).map(k => [k, params[k]]).filter(([k, v]) => v !== undefined && v !== null && v !== '');
			if (entries.length) {
				const qs = entries.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&');
				url += (url.includes('?') ? '&' : '?') + qs;
			}
		}
		return url;
	}

	async request(method, path, { params = null, body = null, rawPath = false } = {}) {
		const url = this._buildUrl(path, params);
		// requestPath used in signature is the path + query (relative to host), e.g. /api/v5/account/balance?ccy=USDT
		let requestPath;
		try {
			if (/^https?:\/\//.test(path)) {
				const u = new URL(url);
				requestPath = u.pathname + (u.search || '');
			} else {
				const filteredEntries = Object.keys(params).map(k => [k, params[k]]).filter(([, v]) => v !== undefined && v !== null && v !== '');
				requestPath = path + (filteredEntries.length ? ('?' + filteredEntries.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&')) : '');
			}
		} catch (e) {
			requestPath = path;
		}
		const bodyString = body ? JSON.stringify(body) : '';
		const headers = await this._buildHeaders(method, requestPath, bodyString);

		// Optional debug logging: enable by setting localStorage.okx_debug_requests = '1'
		try {
			const dbg = (typeof localStorage !== 'undefined' && localStorage.getItem && localStorage.getItem('okx_debug_requests') === '1');
			if (dbg) {
				const mask = v => { try { v = String(v || ''); return v.length > 8 ? (v.slice(0, 4) + '...' + v.slice(-4)) : (v ? '***' : ''); } catch (e) { return '***'; } };
				const safeHeaders = Object.assign({}, headers);
				if (safeHeaders['OK-ACCESS-KEY']) safeHeaders['OK-ACCESS-KEY'] = mask(safeHeaders['OK-ACCESS-KEY']);
				if (safeHeaders['OK-ACCESS-PASSPHRASE']) safeHeaders['OK-ACCESS-PASSPHRASE'] = mask(safeHeaders['OK-ACCESS-PASSPHRASE']);
				if (safeHeaders['OK-ACCESS-SIGN']) safeHeaders['OK-ACCESS-SIGN'] = mask(safeHeaders['OK-ACCESS-SIGN']);
				console.debug('[PrivateAPI] DEBUG request', { method: method.toUpperCase(), requestPath, url, headers: safeHeaders, body: body ? bodyString : undefined });
			}
		} catch (e) { /* ignore debug errors */ }
		const opts = { method: method.toUpperCase(), headers };
		if (body) opts.body = bodyString;

		const res = await this._fetch(url, opts);
		const text = await (res.text ? res.text() : Promise.resolve(''));
		let data;
		try { data = text ? JSON.parse(text) : {}; } catch (e) { data = text; }
		if (!res.ok) {
			const err = new Error('HTTP error ' + res.status);
			err.status = res.status; err.body = data; throw err;
		}
		return data;
	}

	get(path, params) { return this.request('GET', path, { params }); }
	post(path, body) { return this.request('POST', path, { body }); }
	put(path, body) { return this.request('PUT', path, { body }); }
	delete(path, body) { return this.request('DELETE', path, { body }); }
}

function base64FromArrayBuffer(buf) {
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

// Convenience: get account balance
PrivateAPI.prototype.getBalance = async function (ccy) {
	const params = ccy ? { ccy } : null;
	return this.get('/api/v5/account/balance', params);
};

// Alias with original user spelling
PrivateAPI.prototype.GetBallance = PrivateAPI.prototype.getBalance;

// Get positions. Accepts either a string instId or a params object.
PrivateAPI.prototype.getPositions = async function (instIdOrParams) {
	const params = (typeof instIdOrParams === 'string') ? { instId: instIdOrParams } : (instIdOrParams || null);
	return this.get('/api/v5/account/positions', params);
};
PrivateAPI.prototype.GetPositions = PrivateAPI.prototype.getPositions;

// Get positions history. Accepts either a string instId or a params object.
PrivateAPI.prototype.getPositionsHistory = async function (instIdOrParams) {
	const params = (typeof instIdOrParams === 'string') ? { instId: instIdOrParams } : (instIdOrParams || null);
	return this.get('/api/v5/account/positions-history', params);
};
PrivateAPI.prototype.GetPositionsHistory = PrivateAPI.prototype.getPositionsHistory;

// Set leverage for various instrument/account types.
// Accepts an object body matching OKX API; e.g. { instId:'BTC-USDT', lever:'5', mgnMode:'isolated' }
PrivateAPI.prototype.setLeverage = async function (body) {
	if (!body || typeof body !== 'object') throw new Error('setLeverage requires a body object');
	return this.post('/api/v5/account/set-leverage', body);
};
// await api.setLeverage({ instId: 'BTC-USDT-200802', lever: '5', mgnMode: 'cross' });
PrivateAPI.prototype.SetLeverage = PrivateAPI.prototype.setLeverage;

// Place a trade order
// body should follow OKX API /api/v5/trade/order specification
PrivateAPI.prototype.placeOrder = async function (body) {
	if (!body || typeof body !== 'object') throw new Error('placeOrder requires a body object');
	return this.post('/api/v5/trade/order', body);
};
// tdMode is margin mode, e.g. 'cross' or 'isolated'. For spot trading use 'cash'. See OKX API docs for details.
// await api.placeOrder({ instId: 'BTC-USDT', tdMode: 'cash', side: 'buy', ordType: 'limit', px: '30000', sz: '0.001' });
PrivateAPI.prototype.PlaceOrder = PrivateAPI.prototype.placeOrder;

// Get fills (recent trades)
PrivateAPI.prototype.getFills = async function (params) {
	return this.get('/api/v5/trade/fills', params);
};
PrivateAPI.prototype.GetFills = PrivateAPI.prototype.getFills;

// Get fills history (older trades)
PrivateAPI.prototype.getFillsHistory = async function (params) {
	return this.get('/api/v5/trade/fills-history', params);
};
PrivateAPI.prototype.GetFillsHistory = PrivateAPI.prototype.getFillsHistory;

// Get order history
PrivateAPI.prototype.getOrdersHistory = async function (params) {
	return this.get('/api/v5/trade/orders-history', params);
};
PrivateAPI.prototype.GetOrdersHistory = PrivateAPI.prototype.getOrdersHistory;

// Cancel order
// body should follow OKX API /api/v5/trade/cancel-order specification
PrivateAPI.prototype.cancelOrder = async function (body) {
	if (!body || typeof body !== 'object') throw new Error('cancelOrder requires a body object');
	return this.post('/api/v5/trade/cancel-order', body);
};
PrivateAPI.prototype.CancelOrder = PrivateAPI.prototype.cancelOrder;

// Amend order
// body should follow OKX API /api/v5/trade/amend-order specification
PrivateAPI.prototype.amendOrder = async function (body) {
	if (!body || typeof body !== 'object') throw new Error('amendOrder requires a body object');
	return this.post('/api/v5/trade/amend-order', body);
};
// await api.amendOrder({ instId:'BTC-USDT', ordId:'12345', px:'31000' });
PrivateAPI.prototype.AmendOrder = PrivateAPI.prototype.amendOrder;

// Close position
// body should follow OKX API /api/v5/trade/close-position specification
PrivateAPI.prototype.closePosition = async function (body) {
	if (!body || typeof body !== 'object') throw new Error('closePosition requires a body object');
	return this.post('/api/v5/trade/close-position', body);
};
// await api.closePosition({ instId: 'BTC-USDT', mgnMode: 'isolated', posSide: 'long' });
PrivateAPI.prototype.ClosePosition = PrivateAPI.prototype.closePosition;

// --- ALGO ORDERS (TP/SL) ---

// Place an algo order (TP/SL)
// body should follow OKX API /api/v5/trade/order-algo specification
PrivateAPI.prototype.placeAlgoOrder = async function (body) {
	if (!body || typeof body !== 'object') throw new Error('placeAlgoOrder requires a body object');
	return this.post('/api/v5/trade/order-algo', body);
};

// Cancel algo orders
// body should be an array of objects: [{ instId, algoId }, ...]
PrivateAPI.prototype.cancelAlgoOrders = async function (body) {
	if (!body || !Array.isArray(body)) throw new Error('cancelAlgoOrders requires an array of objects');
	return this.post('/api/v5/trade/cancel-algos', body);
};

// Get pending algo orders
// params: { instId, algoId, instType, algoType, after, before, limit }
PrivateAPI.prototype.getAlgoOrdersPending = async function (params) {
	return this.get('/api/v5/trade/orders-algo-pending', params);
};

export default PrivateAPI;
