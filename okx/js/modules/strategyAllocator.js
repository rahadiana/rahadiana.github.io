/**
 * strategyAllocator.js
 * Dynamic Capital Allocator for WEB_DASHBOARD
 * Ports logic from okx_trade_excecutor/src/engine/allocator.js
 */

import OkxClient from '../okx_client.js';

export const StrategyAllocator = {
    // Default Configuration
    config: {
        baseUsd: 10,
        maxUsd: 200,
        minUsd: 2,
        useATR: false,
        atrPeriod: 14,
        atrBar: '5m',
        atrMultiplier: 1
    },

    /**
     * Update allocator configuration
     * @param {Object} newConfig 
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
    },

    /**
     * Clamp value between min and max
     */
    clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    },

    /**
     * Calculate position size from signal metrics
     * @param {Object} signal - Signal object with metrics
     * @param {Object} currentPositions - Current open positions (count used for crowd penalty)
     * @returns {Promise<number>} Recommended USD size
     */
    async sizeFromSignal(signal, currentPositions = [], opts = {}) {
        const m = signal.metrics || {};
        const cfg = { ...this.config, ...opts };

        const {
            baseUsd = 10,
            maxUsd = 200,
            minUsd = 2,
        } = cfg;

        // 1. Risk Factor: Lower risk = larger size
        // RiskScore 0-100
        const riskScore = Number(m.RiskScore || 0);
        const riskFactor = this.clamp(1 - riskScore / 100, 0.2, 1);

        // 2. Confidence Factor: Higher confidence = larger size
        // SignalConfidence 0-100
        const confidence = Number(m.SignalConfidence || 50);
        const confFactor = this.clamp(confidence / 100, 0.5, 1);

        // 3. Signal Multiplier
        const sizeMultiplier = Number(m.PositionSizeMultiplier || 1);

        // 4. Crowd Penalty: Reduce size when many positions open
        const posCount = currentPositions.length || 0;
        const crowdPenalty = this.clamp(1 - posCount * 0.15, 0.4, 1);

        // 5. Advanced Metrics (LSI, VPIN, Hurst, etc)
        // LSI Stress
        const lsiStress = Number(m.LSIStress || 0);
        const lsiFactor = this.clamp(1 - (lsiStress / 100) * 0.5, 0.5, 1);

        // VPIN (Informed Trading)
        const vpin = Number(m.VPIN?.value ?? m.vpin ?? 0);
        const vpinFactor = this.clamp(1 - vpin * 1.5, 0.5, 1);

        // Hurst (Trend vs Mean Reversion uncertainty)
        const hurst = Number(m.Hurst ?? 0.5);
        const hurstUncertainty = Math.abs(hurst - 0.5) / 0.5;
        const hurstFactor = this.clamp(0.7 + hurstUncertainty * 0.3, 0.7, 1);

        // Combined Advanced Factor
        const advancedFactor = lsiFactor * vpinFactor * hurstFactor;

        // Calculate Initial USD Size
        let finalUsd = baseUsd * riskFactor * confFactor * sizeMultiplier * crowdPenalty * advancedFactor;

        // 6. ATR Volatility Scaling (Optional)
        if (cfg.useATR && signal.instId) {
            try {
                const atr = await this.calculateATR(signal.instId, cfg.atrPeriod, cfg.atrBar);
                const price = Number(m.Price || signal.price || 0);

                if (atr && price > 0) {
                    const volatility = atr / price;
                    const mult = cfg.atrMultiplier || 1;
                    // Higher volatility -> Smaller size
                    const volFactor = this.clamp(1 / (volatility * mult + 1e-9), 0.3, 3);
                    finalUsd *= volFactor;
                }
            } catch (e) {
                console.warn('[Allocator] ATR calculation failed, skipping volatility scaling', e);
            }
        }

        // 7. Total Budget Cap
        const budgetUsd = Number(opts.budgetUsd || 0);
        if (budgetUsd > 0) {
            const totalExposure = currentPositions.reduce((sum, p) => {
                // Use notionalUsd if available, otherwise approximate from pos * markPx
                const notional = Math.abs(Number(p.notionalUsd || 0))
                    || (Math.abs(Number(p.pos || 0)) * Number(p.markPx || p.last || 0));
                return sum + notional;
            }, 0);
            const remaining = Math.max(0, budgetUsd - totalExposure);
            if (remaining < minUsd) {
                console.log(`[Allocator] Budget exhausted: exposure $${totalExposure.toFixed(2)} / budget $${budgetUsd} — remaining $${remaining.toFixed(2)} < minUsd $${minUsd}`);
                return 0; // No budget left
            }
            finalUsd = Math.min(finalUsd, remaining);
        }

        // Final Clamp
        return this.clamp(finalUsd, minUsd, maxUsd);
    },

    /**
     * Calculate ATR for an instrument
     */
    async calculateATR(instId, period = 14, bar = '5m') {
        try {
            const limit = Math.max(period + 5, 20);
            const candles = await OkxClient.getCandles(instId, bar, limit);

            if (!candles || candles.length < period + 1) return null;

            // Candles are usually [ts, open, high, low, close, vol, ...]
            // Map to TRs
            const trs = [];
            // Iterate from oldest to newest (assuming getCandles returns newest first, we reverse or handle index carefully)
            // OkxClient.getCandles usually returns newest first (index 0).
            // Let's reverse to be chronological for TR calculation simplicity if needed, 
            // but standard ATR only needs previous close.

            // Let's sort chronological: Oldest -> Newest
            const sorted = [...candles].sort((a, b) => Number(a[0]) - Number(b[0]));

            for (let i = 1; i < sorted.length; i++) {
                const high = parseFloat(sorted[i][2]);
                const low = parseFloat(sorted[i][3]);
                const prevClose = parseFloat(sorted[i - 1][4]);

                const tr = Math.max(
                    high - low,
                    Math.abs(high - prevClose),
                    Math.abs(low - prevClose)
                );
                trs.push(tr);
            }

            // Simple MA of TRs (Wilder's Smoothing is better but SMA is used in source allocator.js)
            const recentTrs = trs.slice(-period);
            const sum = recentTrs.reduce((a, b) => a + b, 0);
            return sum / recentTrs.length;

        } catch (e) {
            console.error('[Allocator] Error calculating ATR:', e);
            return null;
        }
    },

    /**
     * Convert USD size to contract size (sz)
     * @param {string} instId 
     * @param {number} usdAmount 
     * @param {number} price 
     */
    async usdToContracts(instId, usdAmount, price) {
        if (!price || price <= 0) return 0;

        // We need instrument info for ctVal and lotSz
        // In browser, we can try to get this from OkxClient if cached, or fetch it.
        // For now, assume linear USDT swap where 1 contract ~ 1 unit usually, OR use ctVal.
        // Best effort: Get instrument details

        let lotSz = 1;
        let ctVal = 1;
        let minSz = 1;

        // Try to fetch instrument info dynamically? 
        // Or assume caller passes it? 
        // Let's fetch basic ticker or instrument info if possible, or use defaults.
        // Since this is synchronous-ish in usage in source, but we are async here, we can fetch.

        // TODO: Ideally OkxClient should have an instrument cache. 
        // For now, simpler fallback:
        // Linear: sz = USD / price  (approx)

        const rawSize = usdAmount / price;
        // This is rough. OKX requires integer lots usually or specific increments.
        // Let's assume 1 for now if we can't get better info.
        return Math.max(1, Math.floor(rawSize));

        // Improvement: Implementing a proper fetch would be better but expensive per trade.
        // We will stick to simple division for now as per the "Simple fallback" in allocator.js
    }
};
