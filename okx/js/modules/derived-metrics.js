// Derived metrics utilities: CVD, VWAP, ATR, avg trade size, funding APR, timeToFunding
// Designed to be lightweight and attach helpers to `window` for easy use in renderers.
(function () {
    function _n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }

    function trueRange({ high, low, previous }) {
        const h = _n(high), l = _n(low), p = _n(previous);
        return Math.max(h - l, Math.abs(h - p), Math.abs(l - p));
    }

    function pricePositionPercent(last, low, high) {
        const l = _n(last), lo = _n(low), hi = _n(high);
        if (hi - lo === 0) return 0;
        return ((l - lo) / (hi - lo)) * 100;
    }

    // history: array of bars with {vol_buy, vol_sell} or {volBuy, volSell}
    function computeCVD(history) {
        if (!Array.isArray(history)) return { valid: false };
        const arr = [];
        let cum = 0;
        for (const h of history) {
            const buy = _n(h.vol_buy ?? h.volBuy ?? h.buy ?? 0);
            const sell = _n(h.vol_sell ?? h.volSell ?? h.sell ?? 0);
            const delta = buy - sell;
            cum += delta;
            arr.push({ delta, cum });
        }
        return { valid: true, cvdArray: arr, cvdFinal: arr.length ? arr[arr.length - 1].cum : 0 };
    }

    // bars: [{price, volume}] or [{close, volume}]
    function computeVWAP(bars) {
        if (!Array.isArray(bars) || bars.length === 0) return { valid: false };
        let pv = 0, vol = 0;
        for (const b of bars) {
            const price = _n(b.price ?? b.close ?? b.p ?? 0);
            const v = _n(b.volume ?? b.v ?? b.vol ?? 0);
            pv += price * v;
            vol += v;
        }
        if (vol === 0) return { valid: false, vwap: 0 };
        return { valid: true, vwap: pv / vol, totalVolume: vol };
    }

    // Compute simple ATR (SMA of True Range) for `period` bars.
    // bars: array of {high, low, close} ordered oldest->newest
    function computeATR(bars, period = 14) {
        if (!Array.isArray(bars) || bars.length === 0) return { valid: false };
        const trs = [];
        for (let i = 0; i < bars.length; i++) {
            const cur = bars[i];
            const prevClose = i > 0 ? _n(bars[i - 1].close ?? bars[i - 1].price) : _n(cur.close ?? cur.price ?? 0);
            const tr = trueRange({ high: cur.high, low: cur.low, previous: prevClose });
            trs.push(tr);
        }
        if (trs.length === 0) return { valid: false };
        const lastN = trs.slice(-period);
        const sum = lastN.reduce((s, x) => s + x, 0);
        const atr = sum / lastN.length;
        return { valid: true, atr, trArray: trs };
    }

    function averageTradeSize(volBuy, freqBuy, volSell, freqSell) {
        const vb = _n(volBuy), fb = _n(freqBuy), vs = _n(volSell), fs = _n(freqSell);
        const avgBuy = fb > 0 ? vb / fb : 0;
        const avgSell = fs > 0 ? vs / fs : 0;
        const ratio = avgSell > 0 ? (avgBuy / avgSell) : (avgBuy > 0 ? Infinity : 0);
        return { avgBuy, avgSell, tradeSizeRatio: ratio };
    }

    // fundingRate is decimal (e.g., 0.00005). intervalsPerDay default 3 (every 8h)
    function fundingAPR(fundingRate, intervalsPerDay = 3) {
        const r = _n(fundingRate);
        return r * intervalsPerDay * 365 * 100;
    }

    // nextFundingTime: ms timestamp
    function timeToFunding(nextFundingTime) {
        const now = Date.now();
        const t = _n(nextFundingTime) - now;
        if (t <= 0) return { ms: 0, seconds: 0, minutes: 0, hours: 0, human: 'now' };
        const seconds = Math.floor(t / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const human = hours > 0 ? `${hours}h ${minutes % 60}m` : (minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`);
        return { ms: t, seconds, minutes, hours, human };
    }

    function computeRVOL(currentVolume, avgVolume) {
        const cur = _n(currentVolume), avg = _n(avgVolume);
        if (avg === 0) return { valid: false, rvol: cur > 0 ? Infinity : 0 };
        return { valid: true, rvol: cur / avg };
    }

    // Expose on window
    const derived = {
        trueRange,
        pricePositionPercent,
        computeCVD,
        computeVWAP,
        computeATR,
        averageTradeSize,
        fundingAPR,
        timeToFunding,
        computeRVOL
    };

    try { if (typeof window !== 'undefined') window.derivedMetrics = derived; } catch (e) { }
    // also support module.exports if present
    try { if (typeof module !== 'undefined' && module.exports) module.exports = derived; } catch (e) { }
})();
