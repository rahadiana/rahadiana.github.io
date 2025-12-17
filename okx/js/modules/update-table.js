/**
 * update-table.js
 * Main table update function for the dashboard
 * Dependencies: coinDataMap, getNumeric, calculateRecommendation, computeATR, 
 *               advancedSortState, compareWithComparator, showInsightTab, 
 *               maybeRenderHeavyTab, renderInfoTab, renderSignalLab, etc.
 */
 
(function () {
    'use strict';

    // ===================== DOM refs (will be cached on first call) =====================
    let summaryBody, volBody, volRatioBody, spikeBody, recsBody, microBody;
    let freqBody, freqRatioBody, smartBody; // New tabs
    let priceMovesBody;
    let sortBySelect, recTimeframeSelect;
    let useAtrRecs, tpMinInput, tpMaxInput, slMaxInput, confSensitivity;
    let spikeModeSelect;
    let showAdvancedToggle;

    function cacheDOMRefs() {
        if (summaryBody) return; // already cached
        summaryBody = document.getElementById('summaryBody');
        volBody = document.getElementById('volBody');
        volRatioBody = document.getElementById('volRatioBody');
        spikeBody = document.getElementById('spikeBody');
        recsBody = document.getElementById('recsBody');
        microBody = document.getElementById('microBody');
        freqBody = document.getElementById('freqBody');
        freqRatioBody = document.getElementById('freqRatioBody');
        smartBody = document.getElementById('smartBody');
        priceMovesBody = document.getElementById('priceMovesBody');
        sortBySelect = document.getElementById('sortBy');
        recTimeframeSelect = document.getElementById('recTimeframe');
        useAtrRecs = document.getElementById('useAtrRecs');
        tpMinInput = document.getElementById('tpMin');
        tpMaxInput = document.getElementById('tpMax');
        slMaxInput = document.getElementById('slMax');
        confSensitivity = document.getElementById('confSensitivity');
        spikeModeSelect = document.getElementById('spikeModeSelect');
        showAdvancedToggle = document.getElementById('showAdvancedMetricsToggle');
        try {
                if (spikeModeSelect) {
                try {
                    const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('okx_spikeMode') : null;
                    if (stored) spikeModeSelect.value = stored;
                } catch (e) { }
                spikeModeSelect.addEventListener('change', (ev) => {
                    try {
                        const v = String(ev.target.value || 'all');
                            try {
                                if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_spikeMode', v);
                                else if (typeof localStorage !== 'undefined') localStorage.setItem('okx_spikeMode', v);
                            } catch (e) { }
                    } catch (e) { }
                });
            }
        } catch (e) { }

        try {
            if (showAdvancedToggle) {
                    try {
                        const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('okx_showAdvancedMetrics') : null;
                        const checked = (stored === null) ? '1' : stored;
                        showAdvancedToggle.checked = checked === '1';
                        toggleAdvancedMetrics(showAdvancedToggle.checked);
                    } catch (e) { }
                    showAdvancedToggle.addEventListener('change', (ev) => {
                        try {
                            const v = ev.target.checked ? '1' : '0';
                            try {
                                if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_showAdvancedMetrics', v);
                                else if (typeof localStorage !== 'undefined') localStorage.setItem('okx_showAdvancedMetrics', v);
                            } catch (e) { }
                            toggleAdvancedMetrics(ev.target.checked);
                        } catch (e) { }
                    });
            }
        } catch (e) { }

        // Listen for authoritative row limit changes and trigger an immediate update
        try {
            if (typeof window.addEventListener === 'function') {
                window.addEventListener('rowLimitChanged', function (ev) {
                    try {
                        // Clear micro tab to avoid visual flicker of old rows
                        if (microBody) microBody.innerHTML = '';
                        // Call updateTable directly to re-render using the authoritative limit
                        if (typeof updateTable === 'function') updateTable();
                    } catch (e) { /* ignore */ }
                });
            }
        } catch (e) { /* ignore */ }
    }

    // Preferred runtime metrics core: prefer `window.metricsWrapper` when available
    function getMetricsCore() {
        try {
            if (typeof window !== 'undefined' && window.metricsWrapper) return window.metricsWrapper;
            if (typeof globalThis !== 'undefined' && globalThis.metricsWrapper) return globalThis.metricsWrapper;
        } catch (e) { /* ignore */ }
        try {
            if (typeof globalThis !== 'undefined' && globalThis.AnalyticsCore) return globalThis.AnalyticsCore;
        } catch (e) { /* ignore */ }
        if (typeof AnalyticsCore !== 'undefined') return AnalyticsCore;
        return null;
    }

    function toggleAdvancedMetrics(show) {
        try {
            const tbl = document.getElementById('summaryTable');
            if (!tbl) return;
            if (show) tbl.classList.remove('hide-advanced');
            else tbl.classList.add('hide-advanced');
            try {
                // ensure tbody cells align with header visibility
                syncAdvancedColumnVisibility(tbl, Boolean(show));
            } catch (e) { }
        } catch (e) { }
    }

    // Sync hiding/showing advanced metric TDs by calculating their column indices
    function syncAdvancedColumnVisibility(tableEl, show) {
        try {
            if (!tableEl || !tableEl.tHead || !tableEl.tBodies) return;
            const firstRow = tableEl.tHead.rows[0];
            const secondRow = tableEl.tHead.rows[1];
            if (!firstRow || !secondRow) return;

            // locate the advanced-group cell in the first header row to compute offset
            let offset = 0;
            let found = false;
            for (let i = 0; i < firstRow.cells.length; i++) {
                const cell = firstRow.cells[i];
                if (cell.classList && cell.classList.contains('advanced-group')) { found = true; break; }
                const cs = Number(cell.colSpan) || 1;
                offset += cs;
            }
            if (!found) return; // nothing to sync

            // compute the column indices for each advanced subheader
            const advIndices = [];
            let cur = offset;
            for (let j = 0; j < secondRow.cells.length; j++) {
                const c = secondRow.cells[j];
                const span = Number(c.colSpan) || 1;
                for (let s = 0; s < span; s++) {
                    advIndices.push(cur);
                    cur++;
                }
            }

            // For each tbody row, hide/show the TD at those indices
            for (let bi = 0; bi < tableEl.tBodies.length; bi++) {
                const body = tableEl.tBodies[bi];
                for (let r = 0; r < body.rows.length; r++) {
                    const row = body.rows[r];
                    for (const idx of advIndices) {
                        try {
                            const cell = row.cells[idx];
                            if (!cell) continue;
                            cell.style.display = show ? '' : 'none';
                        } catch (e) { /* ignore per-cell errors */ }
                    }
                }
            }
        } catch (e) { /* swallow */ }
    }

    function renderPriceMovesRow(body, coin, data) {
        const row = body.insertRow();
        row.dataset.coin = coin;
        row.insertCell(0).textContent = coin;
        // Current price column
        const priceCell = row.insertCell(1);
        const lastRaw = (data && Object.prototype.hasOwnProperty.call(data, 'last')) ? data.last : (data && data.last) || null;
        priceCell.textContent = (lastRaw === undefined || lastRaw === null) ? '-' : String(lastRaw);
        if (lastRaw === undefined || lastRaw === null || lastRaw === '') priceCell.className = 'text-muted';

        const tfKeys = [
            'price_move_1MENIT', 'price_move_5MENIT', 'price_move_10MENIT', 'price_move_15MENIT',
            'price_move_20MENIT', 'price_move_30MENIT', 'price_move_1JAM', 'price_move_2JAM', 'price_move_24JAM'
        ];
        // Use current price (`last`) as the denominator for percent calculation
        const currentPrice = (data.last !== undefined && data.last !== null) ? Number(data.last) : null;
        for (let i = 0; i < tfKeys.length; i++) {
            const key = tfKeys[i];
            // shift by 1 to account for the current price column
            const cell = row.insertCell(i + 2);
            const v = (data && data[key] !== undefined) ? Number(data[key]) : null;
            if (!Number.isFinite(v)) { cell.textContent = '-'; cell.className = 'text-muted'; }
            else {
                // Show the raw value as provided in the payload (preserve exact Redis/raw string if present)
                const raw = (data && Object.prototype.hasOwnProperty.call(data, key)) ? data[key] : v;
                cell.textContent = (raw === undefined || raw === null) ? String(v) : String(raw);
                // Interpret `v` as the past price at the timeframe; compute percent change from past -> current
                let pastPrice = Number(v);
                // For 24H timeframe, prefer using `open` as the past price when available
                try {
                    if (/24\s*JAM/i.test(key)) {
                        const openVal = (data.open !== undefined && data.open !== null) ? Number(data.open) : NaN;
                        if (Number.isFinite(openVal) && openVal !== 0) pastPrice = openVal;
                    }
                } catch (e) { /* ignore */ }

                if (currentPrice && currentPrice !== 0 && Number.isFinite(pastPrice) && pastPrice !== 0) {
                    const pctTotal = ((currentPrice - pastPrice) / pastPrice) * 100;
                    const outer = document.createElement('div');
                    outer.className = 'small text-muted';
                    const pctText = document.createElement('span');
                    pctText.className = pctTotal > 0 ? 'text-success' : pctTotal < 0 ? 'text-danger' : 'text-muted';
                    pctText.textContent = `(${pctTotal >= 0 ? '+' : ''}${pctTotal.toFixed(2)}%)`;
                    outer.appendChild(pctText);
                    cell.appendChild(outer);
                    // color cell background/text lightly to indicate sign as well
                    cell.className = pctTotal > 0 ? 'text-success' : pctTotal < 0 ? 'text-danger' : 'text-muted';
                } else {
                    cell.className = 'text-muted';
                }
            }
        }

        const upCell = row.insertCell(tfKeys.length + 2);
        const ut = data && (data.update_time || data.update_time_VOLCOIN) ? (new Date(Number(data.update_time) || Number(data.update_time_VOLCOIN) || Date.now()).toLocaleString()) : '-';
        upCell.textContent = ut;
    }

    

    // ===================== Formatters =====================
    const fmtNum = (val, digits = 2) => {
        const n = Number(val);
        return Number.isFinite(n) ? n.toFixed(digits) : '-';
    };
    // fmtSmart: show `digits` decimals for normal numbers, but for very small
    // absolute values show more precision (up to `maxSmallDigits`) so tiny
    // values like 0.000004253 are displayed meaningfully instead of `0.000`.
    const fmtSmart = (val, digits = 3, maxSmallDigits = 8) => {
        const n = Number(val);
        if (!Number.isFinite(n)) return '-';
        const abs = Math.abs(n);
        if (abs === 0) return '0';
        if (abs < Math.pow(10, -digits)) {
            const needed = Math.min(maxSmallDigits, Math.max(digits, Math.ceil(-Math.log10(abs)) + 2));
            const s = n.toFixed(needed);
            return s.replace(/(\.\d*?)(0+)$/,'$1').replace(/\.$/, '');
        }
        return n.toFixed(digits).replace(/(\.\d*?)(0+)$/,'$1').replace(/\.$/, '');
    };
    const fmtPct = (val, digits = 1) => {
        const n = Number(val);
        return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '-';
    };
    const fmtPctFromUnit = (val, digits = 1) => {
        const n = Number(val);
        return Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : '-';
    };

    // Standardized volume ratio formatter: delegate to global helper if available
    function formatVolRatio(ratio) {
        try {
            if (typeof window.formatVolRatio === 'function') return window.formatVolRatio(ratio);
            if (window.METRICS && typeof window.METRICS.formatVolRatio === 'function') return window.METRICS.formatVolRatio(ratio);
        } catch (e) {
            // fall through to local formatting
        }
        if (ratio === null || ratio === undefined) return '∞';
        const n = Number(ratio);
        if (!Number.isFinite(n)) return '-';
        if (n > 9999) return '∞'; // treat extremely large values as infinite
        return Math.round(n) + '%';
    }

    // ===================== Durability Helpers =====================
    function getVolDurabilityMetric(data, timeframeKey, fallbackKeys = []) {
        const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
        try {
            if (metrics && metrics.volDurabilityByTf && metrics.volDurabilityByTf[timeframeKey] !== undefined && metrics.volDurabilityByTf[timeframeKey] !== null) {
                return Number(metrics.volDurabilityByTf[timeframeKey]) || 0;
            }
            if (timeframeKey === '120m' && metrics && metrics.volDurability2h_percent !== undefined && metrics.volDurability2h_percent !== null) {
                return Number(metrics.volDurability2h_percent) || 0;
            }
            if (timeframeKey === '24h' && metrics && metrics.volDurability24h_percent !== undefined && metrics.volDurability24h_percent !== null) {
                return Number(metrics.volDurability24h_percent) || 0;
            }
        } catch (e) { /* fallback to analytics */ }

        // fallback to raw data aliases
        if (metrics && metrics.volDurabilityByTf && metrics.volDurabilityByTf[timeframeKey] !== undefined && metrics.volDurabilityByTf[timeframeKey] !== null) {
            return Number(metrics.volDurabilityByTf[timeframeKey]) || 0;
        }
        if (timeframeKey === '120m' && metrics.volDurability2h_percent !== undefined && metrics.volDurability2h_percent !== null) {
            return Number(metrics.volDurability2h_percent) || 0;
        }
        if (timeframeKey === '24h' && metrics.volDurability24h_percent !== undefined && metrics.volDurability24h_percent !== null) {
            return Number(metrics.volDurability24h_percent) || 0;
        }
        return (fallbackKeys && fallbackKeys.length) ? (getNumeric(data, ...fallbackKeys) || 0) : 0;
    }

    function getDurabilityClass(value) {
        if (value >= 67) return 'durability-excellent';
        if (value >= 34) return 'durability-good';
        return 'durability-poor';
    }

    // ===================== Sort Value Computation =====================
    function computeHistoryPercentChange(d, lookbackMs) {
        try {
            if (!d || !d._history || !Array.isArray(d._history) || d._history.length === 0) return 0;
            const now = Date.now();
            if (!lookbackMs) {
                const first = d._history[0];
                const last = d._history[d._history.length - 1];
                if (!first || !last || !first.price) return 0;
                const p0 = Number(first.price) || 0;
                const p1 = Number(last.price) || 0;
                return p0 > 0 ? ((p1 - p0) / p0) * 100 : 0;
            }
            const cutoff = now - lookbackMs;
            let point = null;
            for (let i = d._history.length - 1; i >= 0; i--) {
                if (d._history[i].ts <= cutoff) { point = d._history[i]; break; }
            }
            if (!point) point = d._history[0];
            const last = d._history[d._history.length - 1];
            const p0 = Number(point.price) || 0;
            const p1 = Number(last.price) || 0;
            return p0 > 0 ? ((p1 - p0) / p0) * 100 : 0;
        } catch (e) { return 0; }
    }

    function parseLookbackMs(name) {
        try {
            // Use explicit units with priority: longer matches first to avoid ambiguity
            // Order: second|sec|s, minute|min|menit, hour|jam|h, m (fallback for minutes)
            const re = /(\d+)\s*(second|sec|s|minute|menit|min|hour|jam|h|m)(?![a-z])/ig;
            let match, lastMatch = null;
            while ((match = re.exec(name)) !== null) { lastMatch = match; }
            if (!lastMatch) {
                const num = name.match(/(\d+)(?!.*\d)/);
                if (num) return Number(num[0]) * 60 * 1000;
                return null;
            }
            const val = Number(lastMatch[1]);
            const unit = (lastMatch[2] || '').toLowerCase();
            // Seconds: second, sec, s
            if (unit === 'second' || unit === 'sec' || unit === 's') return val * 1000;
            // Hours: hour, jam, h
            if (unit === 'hour' || unit === 'jam' || unit === 'h') return val * 60 * 60 * 1000;
            // Minutes: minute, menit, min, m (default)
            return val * 60 * 1000;
        } catch (e) { return null; }
    }

    function computeVolRatioFor(data, buyAliases = [], sellAliases = [], analyticsBuyKey, analyticsSellKey) {
        const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
        const normalize = (val) => {
            const n = Number(val);
            return Number.isFinite(n) ? n : 0;
        };
        const buyAliasesArr = Array.isArray(buyAliases) ? buyAliases : [buyAliases].filter(Boolean);
        const sellAliasesArr = Array.isArray(sellAliases) ? sellAliases : [sellAliases].filter(Boolean);
        let buy = normalize(getNumeric(data, ...buyAliasesArr));
        let sell = normalize(getNumeric(data, ...sellAliasesArr));
        if (buy === 0 && analyticsBuyKey) buy = normalize(metrics[analyticsBuyKey]);
        if (sell === 0 && analyticsSellKey) sell = normalize(metrics[analyticsSellKey]);
        // Use centralized calculateVolRatio if available, else inline
        if (typeof window.calculateVolRatio === 'function') {
            return window.calculateVolRatio(buy, sell);
        }
        if (sell > 0) return (buy / sell) * 100;
        if (buy > 0) return null; // Infinite ratio (buy only)
        return 0;
    }

    function getSortValue(data, criteria) {
        switch (criteria) {
            // Durability
            case 'vol_durability':
            case 'vol_durability_120m':
            case 'vol_durability_2h':
            case 'vol_dur_2h':
            case 'vol_dur_120m':
                return getVolDurabilityMetric(data, '120m', ['percent_sum_VOL_minute_120_buy', 'percent_vol_buy_120min', 'percent_vol_buy_2jam']);
            case 'activity_dur_2h':
                return getNumeric(data, 'sum_minute_120_buy', 'count_VOL_minute_120_buy') || 0;

            // Price & Change
            case 'change':
                return parseFloat(data.percent_change) || 0;
            case 'price':
                return parseFloat(data.last) || 0;
            case 'price_position':
                const currentPrice = parseFloat(data.last) || 0;
                const highPrice = parseFloat(data.high) || currentPrice;
                const lowPrice = parseFloat(data.low) || currentPrice;
                const priceRange = highPrice - lowPrice;
                return priceRange > 0 ? ((currentPrice - lowPrice) / priceRange) * 100 : 50;
            case 'recommendation':
                try {
                    if (typeof calculateRecommendation === 'function') {
                        const rec = calculateRecommendation(data, 50, null, false);
                        return rec && typeof rec.score === 'number' ? rec.score : 0;
                    }
                } catch (err) {
                    console.error('calculateRecommendation threw when sorting:', err);
                }
                return 0;

            // Volume 24h
            case 'vol_buy_24h':
                return parseFloat(data.count_VOL_minute_1440_buy) || 0;
            case 'vol_sell_24h':
                return parseFloat(data.count_VOL_minute_1440_sell) || 0;
            case 'vol_total_24h':
                return (parseFloat(data.count_VOL_minute_1440_buy) || 0) + (parseFloat(data.count_VOL_minute_1440_sell) || 0);

            // Volume Ratio (all timeframes)
            case 'vol_ratio_1m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1menit', 'vol_buy_1m', 'vol_buy_1min'],
                    ['count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1menit', 'vol_sell_1m', 'vol_sell_1min']
                );
            case 'vol_ratio_5m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5menit', 'vol_buy_5m', 'vol_buy_5min'],
                    ['count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5menit', 'vol_sell_5m', 'vol_sell_5min']
                );
            case 'vol_ratio_10m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10menit', 'vol_buy_10m', 'vol_buy_10min'],
                    ['count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10menit', 'vol_sell_10m', 'vol_sell_10min']
                );
            case 'vol_ratio_15m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'],
                    ['count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m']
                );
            case 'vol_ratio_20m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m'],
                    ['count_VOL_minute_20_sell', 'vol_sell_20MENIT', 'vol_sell_20m']
                );
            case 'vol_ratio_30m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'],
                    ['count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m']
                );
            case 'vol_ratio_1h':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT', 'vol_buy_60menit', 'vol_buy_60m'],
                    ['count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT', 'vol_sell_60menit', 'vol_sell_60m']
                );
            case 'vol_ratio':
            case 'vol_ratio_2h':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT', 'vol_buy_2jam'],
                    ['count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT', 'vol_sell_2jam'],
                    'volBuy2h', 'volSell2h'
                );
            case 'vol_ratio_24h':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24jam', 'vol_buy_24h', 'vol_buy_24H'],
                    ['count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24jam', 'vol_sell_24h', 'vol_sell_24H'],
                    'volBuy24h', 'volSell24h'
                );

            // Phase-2 sortable metrics
            case 'vpin':
                try { return (data && data.analytics && data.analytics.vpin && Number.isFinite(data.analytics.vpin.value)) ? Number(data.analytics.vpin.value) : (data && data.analytics && data.analytics.vpin ? Number(data.analytics.vpin) : 0); } catch (e) { return 0; }
            case 'hurst':
                try { return (data && data.analytics && data.analytics.hurst && Number.isFinite(data.analytics.hurst.value)) ? Number(data.analytics.hurst.value) : (data && data.analytics && data.analytics.hurst ? Number(data.analytics.hurst) : 0); } catch (e) { return 0; }
            case 'poc':
                try { return (data && data.analytics && data.analytics.volumeProfile && Number.isFinite(data.analytics.volumeProfile.poc)) ? Number(data.analytics.volumeProfile.poc) : 0; } catch (e) { return 0; }
            case 'depth_imbalance':
                try { return (data && data.analytics && data.analytics.depthImbalance && Number.isFinite(data.analytics.depthImbalance.value)) ? Number(data.analytics.depthImbalance.value) : 0; } catch (e) { return 0; }

            // Volume timeframes
            case 'vol_buy_1h':
                return parseFloat(data.count_VOL_minute_60_buy) || 0;
            case 'vol_sell_1h':
                return parseFloat(data.count_VOL_minute_60_sell) || 0;
            case 'vol_total_1h':
                return (parseFloat(data.count_VOL_minute_60_buy) || 0) + (parseFloat(data.count_VOL_minute_60_sell) || 0);

            // Volume Durability (per timeframe)
            case 'vol_durability_1m':
            case 'vol_dur_1m':
                return getVolDurabilityMetric(data, '1m', ['percent_sum_VOL_minute1_buy', 'percent_vol_buy_1min', 'percent_vol_buy_1m']);
            case 'vol_durability_5m':
            case 'vol_dur_5m':
                return getVolDurabilityMetric(data, '5m', ['percent_sum_VOL_minute_5_buy', 'percent_vol_buy_5min', 'percent_vol_buy_5m']);
            case 'vol_durability_10m':
            case 'vol_dur_10m':
                return getVolDurabilityMetric(data, '10m', ['percent_sum_VOL_minute_10_buy', 'percent_vol_buy_10min', 'percent_vol_buy_10m']);
            case 'vol_durability_15m':
            case 'vol_dur_15m':
                return getVolDurabilityMetric(data, '15m', ['percent_sum_VOL_minute_15_buy', 'percent_vol_buy_15m']);
            case 'vol_durability_20m':
            case 'vol_dur_20m':
                return getVolDurabilityMetric(data, '20m', ['percent_sum_VOL_minute_20_buy', 'percent_vol_buy_20m']);
            case 'vol_durability_30m':
            case 'vol_dur_30m':
                return getVolDurabilityMetric(data, '30m', ['percent_sum_VOL_minute_30_buy', 'percent_vol_buy_30m']);
            case 'vol_durability_60m':
            case 'vol_dur_60m':
                return getVolDurabilityMetric(data, '60m', ['percent_sum_VOL_minute_60_buy', 'percent_vol_buy_60m', 'percent_vol_buy_1jam']);
            case 'vol_durability_24h':
            case 'vol_dur_overall':
            case 'vol_dur_24h':
                return getVolDurabilityMetric(data, '24h', ['percent_sum_VOL_overall_buy', 'percent_vol_buy_24h']);

            // Change Variations
            case 'change_1min_4':
            case 'change_5min_20':
            case 'change_10sec_1':
            case 'change_10min_2':
            case 'change_10sec_2':
            case 'change_15min_2':
            case 'change_1min_5':
            case 'change_1jam_18':
            case 'change_20min_2':
            case 'change_2jam_10':
            case 'change_30min_1':
            case 'change_5min_25':
                const map = {
                    'change_1min_4': 'percent_change_1Min_4', 'change_5min_20': 'percent_change_5Min_20',
                    'change_10sec_1': 'percent_change_10Second_1', 'change_10min_2': 'percent_change_10Min_2',
                    'change_10sec_2': 'percent_change_10Second_2', 'change_15min_2': 'percent_change_15Min_2',
                    'change_1min_5': 'percent_change_1Min_5', 'change_1jam_18': 'percent_change_1jam_18',
                    'change_20min_2': 'percent_change_20Min_2', 'change_2jam_10': 'percent_change_2jam_10',
                    'change_30min_1': 'percent_change_30Min_1', 'change_5min_25': 'percent_change_5Min_25'
                };
                const key = map[criteria];
                if (key && (data[key] !== undefined && data[key] !== null)) return parseFloat(data[key]) || 0;
                if (key) {
                    const lk = key.toLowerCase();
                    if (data[lk] !== undefined && data[lk] !== null) return parseFloat(data[lk]) || 0;
                }
                const ms = parseLookbackMs(criteria);
                return Number(computeHistoryPercentChange(data, ms || undefined)) || 0;

            // Update Times
            case 'update_activity':
                return parseFloat(data.update_time_FREQ) || 0;
            case 'update_sum':
                return parseFloat(data.sum_update_time) || 0;
            case 'update_general':
                return parseFloat(data.update_time) || 0;

            // Total Volumes
            case 'total_vol_fiat':
            case 'total_vol':
                return parseFloat(data.total_vol) || 0;

            // Delay
            case 'delay_ms':
                return parseFloat(data.delay_ms_aggrade) || 0;

            // Smart Analysis Metrics (prefer AnalyticsCore, fallback to legacy functions)
            case 'smart_money_index': {
                const core = getMetricsCore();
                if (core && typeof core.calculateSmartMoneyIndex === 'function') return core.calculateSmartMoneyIndex(data).value || 0;
                if (typeof calculateSmartMoneyIndex === 'function') return calculateSmartMoneyIndex(data).value || 0;
                return 0;
            }
            case 'trade_intensity':
                {
                    const core = getMetricsCore();
                    if (core && typeof core.calculateTradeIntensity === 'function') return core.calculateTradeIntensity(data).value || 0;
                    if (typeof calculateTradeIntensity === 'function') return calculateTradeIntensity(data).value || 0;
                    return 0;
                }
            case 'accumulation_score':
                {
                    const core = getMetricsCore();
                    if (core && typeof core.calculateAccumulationScore === 'function') return core.calculateAccumulationScore(data).value || 0;
                    if (typeof calculateAccumulationScore === 'function') return calculateAccumulationScore(data).value || 0;
                    return 0;
                }
            case 'whale_activity':
                {
                    const core = getMetricsCore();
                    if (core && typeof core.calculateWhaleActivity === 'function') return core.calculateWhaleActivity(data).value || 0;
                    if (typeof calculateWhaleActivity === 'function') return calculateWhaleActivity(data).value || 0;
                    return 0;
                }
            case 'pressure_index':
                {
                    const core = getMetricsCore();
                    if (core && typeof core.calculatePressureIndex === 'function') return core.calculatePressureIndex(data).value || 0;
                    if (typeof calculatePressureIndex === 'function') return calculatePressureIndex(data).value || 0;
                    return 0;
                }
            case 'trend_strength':
                {
                    const core = getMetricsCore();
                    if (core && typeof core.calculateTrendStrength === 'function') return core.calculateTrendStrength(data).value || 0;
                    if (typeof calculateTrendStrength === 'function') return calculateTrendStrength(data).value || 0;
                    return 0;
                }
            case 'breakout_probability':
                {
                    const core = getMetricsCore();
                    if (core && typeof core.calculateBreakoutProbability === 'function') return core.calculateBreakoutProbability(data).value || 0;
                    return 0;
                }
            case 'liquidity_stress_index':
                {
                    const core = getMetricsCore();
                    if (core && typeof core.calculateLiquidityStressIndex === 'function') return core.calculateLiquidityStressIndex(data).value || 0;
                    return 0;
                }

            default:
                return parseFloat(data.percent_sum_VOL_minute_120_buy) || 0;
        }
    }

    // ===================== Main Update Table Function =====================
    function updateTable() {
        cacheDOMRefs();
        const coinDataMap = (window.__okxShim && typeof window.__okxShim.getCoinDataMap === 'function') ? window.__okxShim.getCoinDataMap() : (window.coinDataMap || {});

        // Clear all table bodies
        if (summaryBody) summaryBody.innerHTML = '';
        if (volBody) volBody.innerHTML = '';
        if (volRatioBody) volRatioBody.innerHTML = '';
        if (recsBody) recsBody.innerHTML = '';
        if (priceMovesBody) priceMovesBody.innerHTML = '';
        const volDurBody = document.getElementById('volDurBody');
        if (volDurBody) volDurBody.innerHTML = '';
        if (spikeBody) spikeBody.innerHTML = '';
        // Dispose existing Bootstrap popovers to avoid stale instances when re-rendering
        try {
            if (window.bootstrap && window.bootstrap.Popover) {
                const els = document.querySelectorAll('[data-bs-toggle="popover"]');
                els.forEach(el => { try { const i = bootstrap.Popover.getInstance(el); if (i) i.dispose(); } catch (e) { } });
            }
        } catch (e) { }
        // DON'T clear microBody here - handled by async renderer to prevent flicker
        if (freqBody) freqBody.innerHTML = '';
        if (freqRatioBody) freqRatioBody.innerHTML = '';
        // DON'T clear smartBody here - handled by async renderer to prevent flicker

        let spikeRows = [];
        // Restore last spike rows from localStorage if available (helps after page refresh)
        try {
            if ((!window._lastSpikeRows || !window._lastSpikeRows.length) && typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem('okx_lastSpikeRows');
                if (raw) {
                    try { window._lastSpikeRows = JSON.parse(raw); } catch (e) { window._lastSpikeRows = window._lastSpikeRows || []; }
                }
            }
        } catch (e) { /* ignore storage errors */ }
        const filterText = typeof getActiveFilterValue === 'function' ? getActiveFilterValue() : '';
        const sortBy = sortBySelect ? sortBySelect.value : 'vol_ratio';
        const sortOrder = typeof getSortOrderValue === 'function' ? getSortOrderValue() : 'desc';
        // Use the authoritative getter if available (defined in websocket-example.js), otherwise fall back to legacy logic
        const rowLimit = (typeof window.getDashboardRowLimit === 'function')
            ? window.getDashboardRowLimit()
            : ((window.__okxShim && typeof window.__okxShim.getScheduleUpdateTable === 'function') ? ((window.__okxShim.getScheduleUpdateTable() && window.__okxShim.getScheduleUpdateTable().rowLimit) || window.rowLimit || 5) : (window.rowLimit !== undefined ? window.rowLimit : 5));

        let rowCount = 0;
        let recsRowCount = 0;

        const advancedSortState = typeof window.getAdvancedSortState === 'function' ? window.getAdvancedSortState() : { enabled: false };
        const advancedSortActive = Boolean(advancedSortState && advancedSortState.enabled);
        const activeFilters = advancedSortActive ? (advancedSortState.filters || {}) : {};
        const sortPipeline = (advancedSortActive && advancedSortState.criteria && advancedSortState.criteria.length)
            ? advancedSortState.criteria
            : [{ metric: sortBy, order: sortOrder }];

        function normalizedNumber(val) {
            const num = Number(val);
            return Number.isFinite(num) ? num : 0;
        }
        
        /**
         * Convert value to sortable key that handles null (infinite) properly
         * For descending: null/infinite should be at top (largest)
         * For ascending: null/infinite should be at bottom (largest)
         */
        function sortKeyFor(val, order = 'desc') {
            if (val === null || val === undefined) {
                // Infinite ratio - for descending sort, treat as largest
                return order === 'desc' ? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
            }
            if (!Number.isFinite(val)) return 0;
            return val;
        }

        function passesAdvancedFiltersWrapper(data) {
            if (!advancedSortActive) return true;
            try {
                if (activeFilters.flow && Number.isFinite(activeFilters.flow.value)) {
                    const flowVal = normalizedNumber(getSortValue(data, activeFilters.flow.metric || 'vol_ratio'));
                    if (!compareWithComparator(flowVal, activeFilters.flow.comparator, activeFilters.flow.value)) return false;
                }
                if (activeFilters.durability && Number.isFinite(activeFilters.durability.value)) {
                    const durVal = normalizedNumber(getSortValue(data, activeFilters.durability.metric || 'vol_dur_2h'));
                    if (!compareWithComparator(durVal, activeFilters.durability.comparator, activeFilters.durability.value)) return false;
                }
                if (activeFilters.priceWindow) {
                    const min = Number.isFinite(activeFilters.priceWindow.min) ? activeFilters.priceWindow.min : 0;
                    const max = Number.isFinite(activeFilters.priceWindow.max) ? activeFilters.priceWindow.max : 100;
                    const pricePos = normalizedNumber(getSortValue(data, 'price_position'));
                    if (pricePos < min || pricePos > max) return false;
                }
            } catch (e) { return false; }
            return true;
        }

        function compareUsingPipeline(dataA, dataB) {
            for (const criterion of sortPipeline) {
                if (!criterion || !criterion.metric) continue;
                const order = criterion.order === 'asc' ? 'asc' : 'desc';
                // Use sortKeyFor to handle null (infinite) values properly in sorting
                const rawA = getSortValue(dataA, criterion.metric);
                const rawB = getSortValue(dataB, criterion.metric);
                const valueA = sortKeyFor(rawA, order);
                const valueB = sortKeyFor(rawB, order);
                const diff = order === 'asc' ? (valueA - valueB) : (valueB - valueA);
                if (diff !== 0 && Number.isFinite(diff)) return diff;
            }
            return 0;
        }

        // Sort coins
        const sortedCoins = Object.entries(coinDataMap)
            .filter(([coinKey, data]) => {
                if (filterText && !coinKey.toLowerCase().includes(filterText)) return false;
                return passesAdvancedFiltersWrapper(data);
            })
            .sort(([coinKeyA, dataA], [coinKeyB, dataB]) => {
                const diff = compareUsingPipeline(dataA, dataB);
                if (diff !== 0) return diff;
                return coinKeyA.localeCompare(coinKeyB);
            });

        // Debug: log row/limit/filter counts when unexpected small result observed
        try {
            const scount = Array.isArray(sortedCoins) ? sortedCoins.length : 0;
            if (scount <= 1 || scount < (window.rowLimit || 5)) {
                // console.debug('[updateTable] debug sortedCoins:', { count: scount, rowLimit: (window.rowLimit !== undefined ? window.rowLimit : 5), filterText });
            }
        } catch (e) { /* swallow */ }

        // Pre-scan all coins for spikes so the Spike tab reflects incoming data immediately
        try {
            spikeRows = [];
            for (const [coinKey, d] of Object.entries(coinDataMap || {})) {
                try {
                    const data = d || {};
                    const currentPrice = parseFloat(data.last) || 0;
                    const highPrice = parseFloat(data.high) || currentPrice;
                    const lowPrice = parseFloat(data.low) || currentPrice;
                    const priceRange = highPrice - lowPrice;
                    const pricePosition = priceRange > 0 ? Math.round(((currentPrice - lowPrice) / priceRange) * 100) : 50;
                    detectSpikes(data, coinKey, spikeRows, pricePosition);
                } catch (e) { /* ignore per-coin errors */ }
            }
            // If user has an active coin filter while on the Spike tab, apply it here
            try {
                const activeNav = document.querySelector('#dataTabs .nav-link.active');
                const activeId = activeNav ? activeNav.id : null;
                const ft = (typeof filterText === 'string') ? filterText.trim().toLowerCase() : '';
                if (activeId === 'spike-tab' && ft) {
                    spikeRows = spikeRows.filter(s => s && s.coin && String(s.coin).toLowerCase().includes(ft));
                }
            } catch (e) { /* ignore filter application errors */ }
        } catch (e) { console.warn('pre-scan spikes error', e); }

        // update visible last-spike-scan indicator so users can see when pre-scan ran
        try {
            const el = document.getElementById('lastSpikeScan');
            if (el) el.textContent = 'Last spike: ' + new Date().toLocaleTimeString();
        } catch (e) { /* ignore DOM errors */ }

        // Push detected spikes into Event Watch and optionally trigger Alerts
        try {
            const eventWatchBuffer = window._eventWatchBuffer || (window._eventWatchBuffer = []);
            if (!window._lastSpikeAlertAt) window._lastSpikeAlertAt = {};
            const nowTs = Date.now();
            for (const s of spikeRows) {
                try {
                    const key = `${s.coin}:${s.timeframe}:${s.side}:${Math.round((s.ratio||0)*100)}`;
                    // throttle identical spike notifications for 30s
                    if (window._lastSpikeAlertAt[key] && (nowTs - window._lastSpikeAlertAt[key] < 30 * 1000)) continue;
                    window._lastSpikeAlertAt[key] = nowTs;

                    // Add to event buffer
                    try {
                        eventWatchBuffer.push({ ts: nowTs, coin: s.coin, type: 'spike', description: `${s.side} ${s.timeframe} vol ${s.vol} (avg ${s.avg}) ratio ${s.ratio.toFixed(2)}x`, spike: s });
                        if (eventWatchBuffer.length > 200) eventWatchBuffer.splice(0, eventWatchBuffer.length - 200);
                    } catch (e) { /* ignore buffer errors */ }

                    // Trigger UI alert/banner and persist to Alerts tab when alerts are enabled
                    try {
                        const title = `${s.coin} — Spike`;
                        const msg = `${s.side} ${s.timeframe} spike: ${s.ratio.toFixed(2)}x (vol ${s.vol})`;
                        if (typeof showAlertBanner === 'function') showAlertBanner(title, msg, 'warning', 8000);
                        if (typeof addAlertToTab === 'function') addAlertToTab(s.coin, msg, 'warning', nowTs);
                        if (typeof sendAlertWebhook === 'function') sendAlertWebhook(s.coin, { spike: s, ts: nowTs });
                    } catch (e) { /* ignore alert trigger errors */ }
                } catch (e) { /* ignore per-spike errors */ }
            }
        } catch (e) { /* ignore event/alert wiring errors */ }

        // Render rows
        for (const [coinKey, data] of sortedCoins) {
            if (rowCount >= rowLimit) break;

            const coin = coinKey;
            const price = fmtSmart(data.last || 0, 4, 8);
            const change = data.percent_change || 0;
            const volBuy = getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT');
            const volSell = getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT');
            const volBuy24h = getNumeric(data, 'count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24jam', 'vol_buy_24h');
            const volSell24h = getNumeric(data, 'count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24jam', 'vol_sell_24h');

            // Volume for various timeframes
            const volBuy1m = getNumeric(data, 'count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1menit', 'vol_buy_1m', 'vol_buy_1min');
            const volSell1m = getNumeric(data, 'count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1menit', 'vol_sell_1m', 'vol_sell_1min');
            const volBuy5m = getNumeric(data, 'count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5menit', 'vol_buy_5m', 'vol_buy_5min');
            const volSell5m = getNumeric(data, 'count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5menit', 'vol_sell_5m', 'vol_sell_5min');
            const volBuy10m = getNumeric(data, 'count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10menit', 'vol_buy_10m', 'vol_buy_10min');
            const volSell10m = getNumeric(data, 'count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10menit', 'vol_sell_10m', 'vol_sell_10min');
            const volBuy15m = getNumeric(data, 'count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m');
            const volSell15m = getNumeric(data, 'count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m');
            const volBuy20m = getNumeric(data, 'count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m');
            const volSell20m = getNumeric(data, 'count_VOL_minute_20_sell', 'vol_sell_20MENIT', 'vol_sell_20m');
            const volBuy30m = getNumeric(data, 'count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m');
            const volSell30m = getNumeric(data, 'count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m');
            const volBuy60m = getNumeric(data, 'count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT', 'vol_buy_60menit', 'vol_buy_60m');
            const volSell60m = getNumeric(data, 'count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT', 'vol_sell_60menit', 'vol_sell_60m');
            const volBuy2h = getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT', 'vol_buy_2jam');
            const volSell2h = getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT', 'vol_sell_2jam');

            // Price position
            const currentPrice = parseFloat(data.last) || 0;
            const highPrice = parseFloat(data.high) || currentPrice;
            const lowPrice = parseFloat(data.low) || currentPrice;
            const priceRange = highPrice - lowPrice;
            const pricePosition = priceRange > 0 ? Math.round(((currentPrice - lowPrice) / priceRange) * 100) : 50;

            // Render Vol Ratio tab
            if (volRatioBody) {
                try {
                    renderVolRatioRow(volRatioBody, coin, data, volBuy1m, volSell1m, volBuy5m, volSell5m,
                        volBuy10m, volSell10m, volBuy15m, volSell15m, volBuy20m, volSell20m,
                        volBuy30m, volSell30m, volBuy60m, volSell60m, volBuy2h, volSell2h, volBuy24h, volSell24h);
                } catch (e) { console.warn('volRatio row insert failed for', coin, e); }
            }

            // Spike detection handled by pre-scan to ensure Spike tab updates regardless of rowLimit

            

            // Summary row
            if (summaryBody) {
                renderSummaryRow(summaryBody, coin, data, price, change, pricePosition,
                    volBuy2h, volSell2h, volBuy24h, volSell24h);
            }

            // Recs tab
            if (recsBody) {
                recsRowCount = renderRecsRow(recsBody, coin, data, pricePosition, recsRowCount, rowLimit);
            }

            // Vol row
            if (volBody) {
                renderVolRow(volBody, coin, data, volBuy1m, volSell1m, volBuy5m, volSell5m,
                    volBuy10m, volSell10m, volBuy15m, volSell15m, volBuy20m, volSell20m,
                    volBuy30m, volSell30m, volBuy60m, volSell60m, volBuy, volSell, volBuy24h, volSell24h);
            }

            // Vol Durability row
            if (volDurBody) {
                renderVolDurRow(volDurBody, coin, data);
            }

            // Micro row - skip here, will be done via worker pool batch
            // (sync fallback handled below)

            // Frequency row
            if (freqBody) {
                renderFreqRow(freqBody, coin, data);
            }

            // Freq Ratio row
            if (freqRatioBody) {
                renderFreqRatioRow(freqRatioBody, coin, data);
            }

            // Price Moves row
            // Price Moves row: only render if payload contains any price_move_* fields
            if (priceMovesBody) {
                try {
                    const hasMoves = Object.keys(data || {}).some(k => /^price_move_/i.test(k));
                    if (hasMoves) renderPriceMovesRow(priceMovesBody, coin, data);
                } catch (e) { console.warn('priceMoves row insert failed for', coin, e); }
            }

            // Smart Analysis row - sync fallback (async batch below)
            // Skip here, will be done via worker pool batch

            rowCount++;
        }

        // Microstructure Tab - use Worker Pool for multicore processing
        const _wp = (window.__okxShim && typeof window.__okxShim.getWorkerPool === 'function') ? window.__okxShim.getWorkerPool() : (window.workerPool || null);
        if (microBody && _wp) {
            try { if (!window.workerPool) window.workerPool = _wp; } catch (e) { }
            try { microBody.innerHTML = ''; } catch (e) { }
            renderMicroTabAsync(microBody, sortedCoins, rowLimit);
        } else if (microBody) {
            // Fallback to sync if no worker pool
            try { microBody.innerHTML = ''; } catch (e) { }
            for (let i = 0; i < sortedCoins.length && i < rowLimit; i++) {
                const [coin, data] = sortedCoins[i];
                renderMicroRow(microBody, coin, data);
            }
        }

        // Smart Analysis - DISABLED Worker Pool, use sync rendering instead
        // Worker Pool has outdated field mappings, sync uses updated smart-formulas.js
        if (smartBody) {
            // Clear old content first
            smartBody.innerHTML = '';
            // Sync rendering with correct formulas
            for (let i = 0; i < sortedCoins.length && i < rowLimit; i++) {
                const [coin, data] = sortedCoins[i];
                renderSmartRow(smartBody, coin, data);
            }
        }

        // If current detection produced no spikes, fall back to recently seen spikes
        try {
            if ((!spikeRows || spikeRows.length === 0) && Array.isArray(window._lastSpikeRows) && window._lastSpikeRows.length > 0) {
                // console.debug('[updateTable] no spikes detected; using cached _lastSpikeRows as fallback');
                spikeRows = window._lastSpikeRows.slice(0, Math.max(5, (rowLimit || 5)));
            }
        } catch (e) { /* ignore fallback errors */ }

        // Spike tab follows the global `rowLimit` control
        renderSpikeTable(spikeBody, spikeRows, rowLimit);

        try {
            window._lastSpikeRows = spikeRows.slice(0, 50);
            // Persist to localStorage so page refresh can restore spike list
            const payload = JSON.stringify(window._lastSpikeRows);
            if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_lastSpikeRows', payload);
            else localStorage.setItem('okx_lastSpikeRows', payload);
        } catch (e) { /* ignore persistence errors */ }

        // No separate spike limit persistence — Spike uses global Limit Rows

        // Update other tabs
        try { if (typeof renderInfoTab === 'function') renderInfoTab(); } catch (e) { console.warn('renderInfoTab failed', e); }
        if (typeof maybeRenderHeavyTab === 'function') {
            maybeRenderHeavyTab('signalLab', renderSignalLab, { interval: 1500 });
            maybeRenderHeavyTab('backtest', renderBacktestTab, { interval: 6000 });
            maybeRenderHeavyTab('risk', renderRiskMonitorTab, { interval: 3000 });
            maybeRenderHeavyTab('events', renderEventWatchTab, { interval: 2500, requireActive: false });
        }

        // Populate Price Moves tab with all coins that contain price_move_* fields (respecting current filter/sort)
        try {
            if (priceMovesBody) {
                priceMovesBody.innerHTML = '';
                let found = 0;
                const examples = [];
                const map = coinDataMap || ((window.__okxShim && typeof window.__okxShim.getCoinDataMap === 'function') ? window.__okxShim.getCoinDataMap() : (window.coinDataMap || {})) || {};
                const mapKeys = Object.keys(map || {});
                // console.debug('[priceMoves] coinDataMap size:', mapKeys.length, 'sample keys:', mapKeys.slice(0, 10));
                // Print sample field keys for the first few coins to inspect payload shape
                for (let i = 0; i < Math.min(5, mapKeys.length); i++) {
                    try {
                        const k = mapKeys[i];
                        const d = map[k] || {};
                        // console.debug('[priceMoves] sample coin fields for', k, Object.keys(d).slice(0, 40));
                    } catch (e) { /* ignore */ }
                }
                for (const [coinKey, data] of Object.entries(map)) {
                    try {
                        if (!data) continue;
                        // apply active filter if present
                        if (filterText && !String(coinKey).toLowerCase().includes(filterText)) continue;
                        if (!passesAdvancedFiltersWrapper(data)) continue;
                        const hasMoves = Object.keys(data || {}).some(k => /^price_move_/i.test(k));
                        if (hasMoves) {
                            renderPriceMovesRow(priceMovesBody, coinKey, data);
                            found++;
                            if (examples.length < 6) {
                                const keys = Object.keys(data).filter(k => /^price_move_/i.test(k));
                                examples.push({ coin: coinKey, keys: keys.slice(0, 5), sample: data[keys[0]] });
                            }
                            if (found >= rowLimit) break;
                        }
                    } catch (e) { /* swallow per-row errors */ }
                }
                // console.debug('[priceMoves] populated rows:', found, 'examples:', examples);
                if (found === 0) {
                    try {
                        const r = priceMovesBody.insertRow();
                        const c = r.insertCell(0);
                        c.colSpan = 11;
                        c.className = 'text-muted small';
                        c.textContent = 'No price_move_* fields found in current data. Paste a sample payload or check console for details.';
                    } catch (e) { /* ignore DOM errors */ }
                }
            }
        } catch (e) { console.warn('populate Price Moves failed', e); }

        // Initialize Bootstrap popovers for Price Moves buttons
        try {
            if (window.bootstrap && window.bootstrap.Popover) {
                const popEls = document.querySelectorAll('.price-move-pop');
                popEls.forEach(el => {
                    try {
                        const existing = bootstrap.Popover.getInstance(el);
                        if (existing) existing.dispose();
                    } catch (e) { }
                    try { new bootstrap.Popover(el); } catch (e) { }
                });
            }
        } catch (e) { /* ignore */ }

        
    }

    // ===================== Row Renderers =====================
    function renderVolRatioRow(body, coin, data, vb1, vs1, vb5, vs5, vb10, vs10, vb15, vs15, vb20, vs20, vb30, vs30, vb60, vs60, vb2h, vs2h, vb24, vs24) {
        const vr = body.insertRow();
        vr.dataset.coin = coin;

        const normalize = (v) => {
            if (v === undefined || v === null) return 0;
            if (typeof v === 'number') return v;
            try {
                const s = String(v).replace(/[^0-9eE+\-.]/g, '');
                const n = parseFloat(s);
                return Number.isFinite(n) ? n : 0;
            } catch (e) { return 0; }
        };

        const fmtRatio = (buy, sell) => {
            const b = normalize(buy);
            const s = normalize(sell);
            if (s > 0) return Math.round((b / s) * 100) + '%';
            if (b > 0) return '∞';
            return '0%';
        };

        vr.insertCell(0).textContent = coin;

        const makeRatio = (buy, sell) => {
            const b = normalize(buy);
            const s = normalize(sell);
            if (s > 0) return Math.round((b / s) * 100);
            if (b > 0) return null; // represent ∞
            return 0;
        };

        const makeCell = (idx, buy, sell) => {
            const pct = makeRatio(buy, sell);
            const text = formatVolRatio(pct);
            const cell = vr.insertCell(idx);
            cell.textContent = text;
            if (pct === null || pct > 200) {
                cell.className = 'text-success fw-bold';
            } else if (pct < 50) {
                cell.className = 'text-danger fw-bold';
            } else {
                cell.className = 'text-warning fw-bold';
            }
            return cell;
        };

        makeCell(1, vb1, vs1);
        makeCell(2, vb5, vs5);
        makeCell(3, vb10, vs10);
        makeCell(4, vb15, vs15);
        makeCell(5, vb20, vs20);
        makeCell(6, vb30, vs30);
        makeCell(7, vb60, vs60);
        makeCell(8, vb2h, vs2h);
        makeCell(9, vb24, vs24);

        // Last Change - use percent_change directly from WebSocket data
        const lastChangeVal = parseFloat(data.percent_change) || 0;

        const lcCell = vr.insertCell(10);
        lcCell.textContent = (lastChangeVal > 0 ? '+' : '') + lastChangeVal.toFixed(2) + '%';
        lcCell.className = lastChangeVal > 0 ? 'text-success' : lastChangeVal < 0 ? 'text-danger' : 'text-muted';
    }

    

    function detectSpikes(data, coin, spikeRows, pricePosition) {
        try {
            const selectedMode = (spikeModeSelect && spikeModeSelect.value) ? String(spikeModeSelect.value) : 'all';
            const spikeThreshold = 2.0;
            const timeframes = [
                { label: '1m', buyVolKeys: ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1min'], buyAvgKeys: ['avg_VOLCOIN_buy_1MENIT'], sellVolKeys: ['count_VOL_minute1_sell','vol_sell_1MENIT','vol_sell_1min'], sellAvgKeys: ['avg_VOLCOIN_sell_1MENIT'] },
                { label: '5m', buyVolKeys: ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5min'], buyAvgKeys: ['avg_VOLCOIN_buy_5MENIT'], sellVolKeys: ['count_VOL_minute_5_sell','vol_sell_5MENIT','vol_sell_5min'], sellAvgKeys: ['avg_VOLCOIN_sell_5MENIT'] },
                { label: '10m', buyVolKeys: ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10min'], buyAvgKeys: ['avg_VOLCOIN_buy_10MENIT'], sellVolKeys: ['count_VOL_minute_10_sell','vol_sell_10MENIT','vol_sell_10min'], sellAvgKeys: ['avg_VOLCOIN_sell_10MENIT'] },
                { label: '15m', buyVolKeys: ['vol_buy_15MENIT'], buyAvgKeys: ['avg_VOLCOIN_buy_15MENIT'], sellVolKeys: ['vol_sell_15MENIT'], sellAvgKeys: ['avg_VOLCOIN_sell_15MENIT'] },
                { label: '20m', buyVolKeys: ['vol_buy_20MENIT'], buyAvgKeys: ['avg_VOLCOIN_buy_20MENIT'], sellVolKeys: ['vol_sell_20MENIT'], sellAvgKeys: ['avg_VOLCOIN_sell_20MENIT'] },
                { label: '30m', buyVolKeys: ['vol_buy_30MENIT'], buyAvgKeys: ['avg_VOLCOIN_buy_30MENIT'], sellVolKeys: ['vol_sell_30MENIT'], sellAvgKeys: ['avg_VOLCOIN_sell_30MENIT'] },
                { label: '60m', buyVolKeys: ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT'], buyAvgKeys: ['avg_VOLCOIN_buy_1JAM'], sellVolKeys: ['count_VOL_minute_60_sell','vol_sell_1JAM','vol_sell_60MENIT'], sellAvgKeys: ['avg_VOLCOIN_sell_1JAM'] },
                { label: '120m', buyVolKeys: ['count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT'], buyAvgKeys: ['avg_VOLCOIN_buy_2JAM'], sellVolKeys: ['count_VOL_minute_120_sell','vol_sell_2JAM','vol_sell_120MENIT'], sellAvgKeys: ['avg_VOLCOIN_sell_2JAM'] },
                { label: '24h', buyVolKeys: ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h'], buyAvgKeys: ['avg_VOLCOIN_buy_24JAM'], sellVolKeys: ['count_VOL_minute_1440_sell','vol_sell_24JAM','vol_sell_24h'], sellAvgKeys: ['avg_VOLCOIN_sell_24JAM'] }
            ];

            const priceChange = parseFloat(data.percent_change) || 0;
            
            // Calculate recommendation for spike
            const selectedTf = (recTimeframeSelect && recTimeframeSelect.value) ? recTimeframeSelect.value : '120m';
            const recResult = typeof calculateRecommendation === 'function' ? calculateRecommendation(data, pricePosition, selectedTf, true) : null;
            const recommendation = recResult ? recResult.recommendation : 'HOLD';
            const recConfidence = recResult ? (recResult.confidence || 0) : 0;
            const recClassName = recResult ? (recResult.className || 'recommendation-hold') : 'recommendation-hold';

            for (const tf of timeframes) {
                // buy-side
                const buyVol = getNumeric(data, ...(tf.buyVolKeys || []));
                const buyAvg = getNumeric(data, ...(tf.buyAvgKeys || []));
                const buyRatio = buyAvg > 0 ? (buyVol / buyAvg) : 0;
                const buyRatioPct = buyAvg > 0 ? ((buyRatio - 1) * 100) : 0;
                if (buyAvg > 0 && (buyRatio >= spikeThreshold || buyRatioPct >= 1.0)) {
                    if (selectedMode === 'all' || selectedMode === 'buy-only') {
                        spikeRows.push({
                            coin,
                            timeframe: tf.label,
                            side: 'BUY',
                            vol: buyVol,
                            avg: buyAvg,
                            ratio: buyRatio,
                            price_change: priceChange,
                            recommendation: 'LONG',
                            recConfidence,
                            recClassName: 'recommendation-buy',
                            update_time: data.update_time || data.update_time_VOLCOIN || 0
                        });
                    }
                }
                // sell-side
                const sellVol = getNumeric(data, ...(tf.sellVolKeys || []));
                const sellAvg = getNumeric(data, ...(tf.sellAvgKeys || []));
                const sellRatio = sellAvg > 0 ? (sellVol / sellAvg) : 0;
                const sellRatioPct = sellAvg > 0 ? ((sellRatio - 1) * 100) : 0;
                if (sellAvg > 0 && (sellRatio >= spikeThreshold || sellRatioPct >= 1.0)) {
                    if (selectedMode === 'all' || selectedMode === 'sell-only') {
                        spikeRows.push({
                            coin,
                            timeframe: tf.label,
                            side: 'SELL',
                            vol: sellVol,
                            avg: sellAvg,
                            ratio: sellRatio,
                            price_change: priceChange,
                            recommendation: 'SHORT',
                            recConfidence,
                            recClassName: 'recommendation-sell',
                            update_time: data.update_time || data.update_time_VOLCOIN || 0
                        });
                    }
                }
                // total volume spike (optionally detect very large total relative to avg)
                try {
                    const totVol = (buyVol || 0) + (sellVol || 0);
                    const totAvg = (buyAvg || 0) + (sellAvg || 0);
                    const totRatio = totAvg > 0 ? (totVol / totAvg) : 0;
                    if (totAvg > 0 && totRatio >= spikeThreshold * 1.5) {
                        if (selectedMode === 'all' || selectedMode === 'total') {
                            spikeRows.push({
                                coin,
                                timeframe: tf.label,
                                side: 'TOTAL',
                                vol: totVol,
                                avg: totAvg,
                                ratio: totRatio,
                                price_change: priceChange,
                                recommendation: (buyVol > sellVol) ? 'LONG' : (sellVol > buyVol ? 'SHORT' : 'HOLD'),
                                recConfidence,
                                recClassName: (buyVol > sellVol) ? 'recommendation-buy' : (sellVol > buyVol ? 'recommendation-sell' : 'recommendation-hold'),
                                update_time: data.update_time || data.update_time_VOLCOIN || 0
                            });
                        }
                    }
                } catch (e) { /* ignore total checks */ }
            }
        } catch (e) { console.error('Spike detection error', e); }
    }

    function renderSummaryRow(body, coin, data, price, change, pricePosition, volBuy2h, volSell2h, volBuy24h, volSell24h) {
        const row = body.insertRow();
        row.classList.add('summary-row');
        row.style.cursor = 'pointer';
        row.dataset.coin = coin;
        row.onclick = () => { if (typeof showInsightTab === 'function') showInsightTab(coin, data); };

        // Columns: Coin, Price, Change %, Price Pos, Recommendation, Risk, VolRatio(2h), VolBuy(2h), VolSell(2h), VolDur(2h), VolBuy(24h), VolSell(24h), Update
        row.insertCell(0).textContent = coin;
        const priceRaw = (data && Object.prototype.hasOwnProperty.call(data, 'last')) ? String(data.last) : String(price);
        row.insertCell(1).textContent = priceRaw;

        const changeVal = (isFinite(change) ? Number(change) : 0);
        const changeCell = row.insertCell(2);
        changeCell.textContent = `${changeVal > 0 ? '+' : ''}${changeVal.toFixed(2)}%`;
        changeCell.className = changeVal > 0 ? 'text-success fw-bold' : changeVal < 0 ? 'text-danger fw-bold' : 'text-muted';

        const posCell = row.insertCell(3);
        posCell.textContent = pricePosition + '%';
        posCell.className = getDurabilityClass(pricePosition);

        // Funding cell (8h): show settFundingRate preferred, fallback to funding_Rate, then funding_premium
        const fundingCell = row.insertCell(4);
        try {
            const sett = getNumeric(data, 'funding_settFundingRate', 'funding_settfundingrate');
            const rate = getNumeric(data, 'funding_Rate', 'funding_rate');
            const premium = getNumeric(data, 'funding_premium', 'fundingpremium');
            let fundingVal = null;
            if (sett) fundingVal = sett;
            else if (rate) fundingVal = rate;
            else if (premium) fundingVal = premium;
            // display as percent
            if (fundingVal === null || fundingVal === 0) {
                fundingCell.textContent = '-';
                fundingCell.className = 'text-muted';
            } else {
                // convert to percent for human view
                const display = (fundingVal * 100).toFixed(Math.abs(fundingVal) < 0.001 ? 3 : 2) + '%';
                const positive = Number(fundingVal) > 0;
                const arrow = positive ? '▲' : '▼';
                fundingCell.innerHTML = `<span class="${positive ? 'text-success' : 'text-danger'} fw-bold">${arrow} ${display}</span>`;
            }
        } catch (e) { fundingCell.textContent = '-'; fundingCell.className = 'text-muted'; }

        // Append derived Funding APR (if available) to the funding cell to avoid adding extra columns
        try {
            const derivedSummary = (typeof getDerivedSummary === 'function') ? getDerivedSummary(data) : (data && data._analytics && data._analytics.derived) ? data._analytics.derived : null;
            const derivedFundingApr = derivedSummary && typeof derivedSummary.fundingApr !== 'undefined' ? derivedSummary.fundingApr : null;
            if (derivedFundingApr !== null && derivedFundingApr !== undefined && !Number.isNaN(Number(derivedFundingApr))) {
                const aprText = `<div class="small text-muted">APR: ${Number(derivedFundingApr).toFixed(2)}%</div>`;
                fundingCell.innerHTML = (fundingCell.innerHTML || '') + aprText;
            }
        } catch (e) { /* non-fatal */ }

        const selectedTf = (recTimeframeSelect && recTimeframeSelect.value) ? recTimeframeSelect.value : '120m';
        const recommendation = typeof calculateRecommendation === 'function' ? calculateRecommendation(data, pricePosition, selectedTf, true) : null;
        // funding-aware position mapping (if available)
        let fundingTailwindBadge = null;
        try {
            const posRec = (typeof calculatePositionRecommendation === 'function') ? calculatePositionRecommendation(data, pricePosition, selectedTf, false) : null;
            const sett = getNumeric(data, 'funding_settFundingRate', 'funding_settfundingrate');
            const rate = getNumeric(data, 'funding_Rate', 'funding_rate');
            const premium = getNumeric(data, 'funding_premium', 'fundingpremium');
            const fundingVal = sett || rate || premium || 0;
            if (posRec && posRec.recommendation === 'LONG' && Number(fundingVal) < 0) fundingTailwindBadge = '<span class="badge bg-success ms-1 small">Funding tailwind</span>';
            if (posRec && posRec.recommendation === 'SHORT' && Number(fundingVal) > 0) fundingTailwindBadge = '<span class="badge bg-danger ms-1 small">Funding tailwind</span>';
        } catch (e) { fundingTailwindBadge = null; }
        const recCell = row.insertCell(5);
        recCell.innerHTML = (recommendation && recommendation.recommendation ? `${recommendation.recommendation} (${recommendation.confidence || 0}%)` : 'HOLD') + (fundingTailwindBadge || '');
        recCell.className = recommendation && recommendation.className ? recommendation.className : 'recommendation-hold';

        const _metricsSummary = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
        const riskScore = Number(data.risk_score || (_metricsSummary && _metricsSummary.riskScore) || 0);
        const riskCell = row.insertCell(6);
        riskCell.textContent = riskScore + '%';
        riskCell.className = riskScore >= 67 ? 'text-danger fw-bold' : riskScore >= 40 ? 'text-warning fw-bold' : 'text-success fw-bold';

        const volumeRatio2h = volSell2h > 0 ? (volBuy2h / volSell2h) * 100 : (volBuy2h > 0 ? null : 0);
        const vrCell = row.insertCell(7);
        try {
            vrCell.textContent = formatVolRatio(volumeRatio2h);
        } catch (e) { vrCell.textContent = formatVolRatio(volumeRatio2h); }
        vrCell.className = (volumeRatio2h === null || volumeRatio2h > 200) ? 'text-success fw-bold' : volumeRatio2h < 50 ? 'text-danger fw-bold' : 'text-warning fw-bold';

        row.insertCell(8).textContent = volBuy2h;
        row.insertCell(9).textContent = volSell2h;

        let volDur2h = (typeof getUnifiedSmartMetrics === 'function' && getUnifiedSmartMetrics(data) && getUnifiedSmartMetrics(data).volDurability2h_percent !== null)
            ? Number(getUnifiedSmartMetrics(data).volDurability2h_percent)
            : getNumeric(data, 'percent_sum_VOL_minute_120_buy', 'percent_vol_buy_120min', 'percent_vol_buy_2jam');
        if ((!volDur2h || volDur2h === 0) && (volBuy2h || volSell2h)) {
            const total2h = (volBuy2h || 0) + (volSell2h || 0);
            volDur2h = total2h > 0 ? Math.round(((volBuy2h || 0) / total2h) * 100) : 0;
        }
        const volDurCell = row.insertCell(10);
        volDurCell.textContent = (isNaN(volDur2h) ? 0 : volDur2h) + '%';
        volDurCell.className = getDurabilityClass(volDur2h);

        row.insertCell(11).textContent = volBuy24h;
        row.insertCell(12).textContent = volSell24h;

        // Tier-1 metrics: Kyle's Lambda, VWAP Bands position, CVD, RVOL
        const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};

        // Kyle's Lambda (prefer structured object with .value)
        let kyleVal = null;
        try {
            if (metrics && metrics.kyleLambda && typeof metrics.kyleLambda === 'object' && metrics.kyleLambda.value !== undefined) kyleVal = Number(metrics.kyleLambda.value);
            else if (metrics && metrics.kyleLambda !== undefined) kyleVal = Number(metrics.kyleLambda);
        } catch (e) { kyleVal = null; }
        const kCell = row.insertCell();
        kCell.classList.add('advanced-metric');

        // Wire the open funding button to focus the Funding tab + set filter
        // Note: per user request, do not open funding detail from Summary tab (no button/handler).
        kCell.textContent = Number.isFinite(Number(kyleVal)) ? fmtSmart(kyleVal, 4) : '-';
        if (Number.isFinite(kyleVal)) kCell.className += ' ' + (kyleVal >= 0.05 ? 'text-danger fw-bold' : kyleVal <= 0.01 ? 'text-success' : 'text-warning');
        try {
            if (metrics && metrics.tier1 && Number.isFinite(metrics.tier1.kyle)) {
                const s = document.createElement('div');
                s.className = 'small text-muted';
                s.textContent = `(${metrics.tier1.kyle}%)`;
                kCell.appendChild(s);
            }
        } catch (e) { }

        // VWAP Bands / position
        let vwapPos = null;
        try {
            if (metrics && metrics.vwapBands && metrics.vwapBands.position) vwapPos = metrics.vwapBands.position;
            else if (metrics && metrics.vwapPosition !== undefined) vwapPos = metrics.vwapPosition;
        } catch (e) { vwapPos = null; }
        const vCell = row.insertCell();
        vCell.classList.add('advanced-metric');
        vCell.textContent = vwapPos ? String(vwapPos) : (metrics && metrics.vwapBands && metrics.vwapBands.currentPosition ? metrics.vwapBands.currentPosition : '-');
        try {
            if (metrics && metrics.tier1 && Number.isFinite(metrics.tier1.vwap)) {
                const s = document.createElement('div'); s.className = 'small text-muted'; s.textContent = `(${metrics.tier1.vwap}% )`;
                vCell.appendChild(s);
            }
        } catch (e) { }

        // CVD (show numeric and/or trend)
        let cvdVal = null;
        try { if (metrics && metrics.cvd && metrics.cvd.value !== undefined) cvdVal = Number(metrics.cvd.value); else if (metrics && metrics.cvd !== undefined) cvdVal = Number(metrics.cvd); } catch (e) { cvdVal = null; }
        const cvdCell = row.insertCell();
        cvdCell.classList.add('advanced-metric');
        if (Number.isFinite(cvdVal)) { cvdCell.textContent = fmtNum(cvdVal, 0); cvdCell.className = cvdVal > 0 ? 'text-success' : (cvdVal < 0 ? 'text-danger' : 'text-muted'); }
        else cvdCell.textContent = (metrics && metrics.cvd && metrics.cvd.trend) ? metrics.cvd.trend : '-';
        try { if (metrics && metrics.tier1 && Number.isFinite(metrics.tier1.cvd)) { const s = document.createElement('div'); s.className='small text-muted'; s.textContent = `(${metrics.tier1.cvd}% )`; cvdCell.appendChild(s); } } catch(e){}

        // RVOL (relative volume) — show multiplier (e.g., 1.23x)
        let rvolVal = null;
        try { if (metrics && metrics.rvol && metrics.rvol.value !== undefined) rvolVal = Number(metrics.rvol.value); else if (metrics && metrics.rvol !== undefined) rvolVal = Number(metrics.rvol); } catch (e) { rvolVal = null; }
        const rCell = row.insertCell();
        rCell.classList.add('advanced-metric');
        rCell.textContent = Number.isFinite(rvolVal) ? `${Number(rvolVal).toFixed(2)}x` : '-';
        if (Number.isFinite(rvolVal)) rCell.className = rvolVal >= 1.5 ? 'text-danger fw-bold' : rvolVal <= 0.8 ? 'text-muted' : 'text-warning';
        try { if (metrics && metrics.tier1 && Number.isFinite(metrics.tier1.rvol)) { const s = document.createElement('div'); s.className='small text-muted'; s.textContent = `(${metrics.tier1.rvol}% )`; rCell.appendChild(s); } } catch(e){}
        // Phase-2: VPIN, Hurst, POC, Depth Imbalance (polished with normalized badges)
        try {
            const makeMuted = (text) => { const d = document.createElement('div'); d.className = 'small text-muted'; d.textContent = text; return d; };

            // Prepare fallback computation helper using AnalyticsCore when available
            const tryPhase2Fallbacks = (data) => {
                const out = {};
                try {
                    const core = (typeof window !== 'undefined' && window.AnalyticsCore) ? window.AnalyticsCore : null;
                    const hist = Array.isArray(data._history) ? data._history : (Array.isArray(data.history) ? data.history : []);
                    if (core) {
                        if ((!data.vpin && !data.vpinValid) && hist && hist.length >= 3 && typeof core.computeVPIN === 'function') {
                            try { out.vpin = core.computeVPIN(hist, { lookbackBars: Math.min(50, hist.length), minSamples: 3 }); } catch(e) { }
                        }
                        if ((!data.hurst && !data.hurstValid) && hist && hist.length >= 20 && typeof core.computeHurstExponent === 'function') {
                            try { out.hurst = core.computeHurstExponent(hist, { minSamples: Math.max(20, Math.min(50, hist.length)) }); } catch(e) { }
                        }
                        if ((!data.volumeProfile || !data.volumeProfile.poc) && hist && hist.length >= 2 && typeof core.computeVolumeProfilePOC === 'function') {
                            try { out.volumeProfile = core.computeVolumeProfilePOC(hist, { bins: 16 }); } catch(e) { }
                        }
                        if ((!data.depthImbalance || !data.depthImbalance.value) && hist && hist.length >= 1 && typeof core.computeDepthImbalance === 'function') {
                            try {
                                // depth snapshot may be present on last history point
                                const last = hist[hist.length - 1] || {};
                                out.depthImbalance = core.computeDepthImbalance(last);
                            } catch(e) { }
                        }
                    }
                } catch (e) { /* swallow fallback errors */ }
                return out;
            };

            const fall = tryPhase2Fallbacks(data || {});

            // VPIN
            const vpinCell = row.insertCell();
            vpinCell.classList.add('advanced-metric');
            const vpinVal = (metrics && metrics.vpin && Number.isFinite(metrics.vpin.value)) ? Number(metrics.vpin.value) : ((metrics && metrics.vpin && Number.isFinite(metrics.vpin)) ? Number(metrics.vpin) : (fall && fall.vpin && typeof fall.vpin.value === 'number' ? Number(fall.vpin.value) : null));
            if (Number.isFinite(vpinVal)) {
                vpinCell.textContent = Math.round(vpinVal * 100) + '%';
                const vpinClass = vpinVal > 0.2 ? 'text-danger' : (vpinVal > 0.1 ? 'text-warning' : 'text-muted');
                try { vpinCell.classList.add(vpinClass); } catch(e) { vpinCell.className = (vpinCell.className || '') + ' ' + vpinClass; }
                try { if (metrics.vpin && Number.isFinite(metrics.vpin.normalized)) vpinCell.appendChild(makeMuted('(' + metrics.vpin.normalized + '%)')); else if (fall.vpin && Number.isFinite(fall.vpin.normalized)) vpinCell.appendChild(makeMuted('(' + fall.vpin.normalized + '%)')); } catch(e){}
            } else if (metrics && metrics.vpin && metrics.vpin.percent) {
                vpinCell.textContent = Math.round(metrics.vpin.percent) + '%';
                try { if (metrics.vpin && Number.isFinite(metrics.vpin.normalized)) vpinCell.appendChild(makeMuted('(' + metrics.vpin.normalized + '%)')); } catch(e){}
            } else vpinCell.textContent = '-';

            // Hurst
            const hurstCell = row.insertCell();
            hurstCell.classList.add('advanced-metric');
            let hurstVal = (metrics && metrics.hurst && Number.isFinite(metrics.hurst.value)) ? Number(metrics.hurst.value) : ((metrics && metrics.hurst && Number.isFinite(metrics.hurst)) ? Number(metrics.hurst) : (fall && fall.hurst && typeof fall.hurst.value === 'number' ? Number(fall.hurst.value) : null));
            if (Number.isFinite(hurstVal)) {
                hurstVal = Math.max(0, Math.min(1, hurstVal)); // clamp
                hurstCell.textContent = hurstVal.toFixed(3);
                try { hurstCell.classList.add(hurstVal > 0.55 ? 'text-success' : (hurstVal < 0.45 ? 'text-danger' : 'text-muted')); } catch(e) { hurstCell.className = (hurstCell.className || '') + ' ' + (hurstVal > 0.55 ? 'text-success' : (hurstVal < 0.45 ? 'text-danger' : 'text-muted')); }
                try { if (metrics.hurst && Number.isFinite(metrics.hurst.normalized)) hurstCell.appendChild(makeMuted('(' + metrics.hurst.normalized + '%)')); else if (fall.hurst && Number.isFinite(fall.hurst.normalized)) hurstCell.appendChild(makeMuted('(' + fall.hurst.normalized + '%)')); } catch(e){}
                try { if (metrics.hurst && metrics.hurst.interpretation) hurstCell.title = metrics.hurst.interpretation; else if (fall.hurst && fall.hurst.interpretation) hurstCell.title = fall.hurst.interpretation; } catch(e){}
            } else hurstCell.textContent = '-';

            // POC (show value + value area range if available)
            const pocCell = row.insertCell();
            pocCell.classList.add('advanced-metric');
            const poc = (metrics && metrics.volumeProfile && Number.isFinite(metrics.volumeProfile.poc)) ? Number(metrics.volumeProfile.poc) : ((metrics && metrics.volumeProfile && metrics.volumeProfile.poc) ? Number(metrics.volumeProfile.poc) : (fall && fall.volumeProfile && Number.isFinite(fall.volumeProfile.poc) ? Number(fall.volumeProfile.poc) : null));
            if (Number.isFinite(poc)) {
                pocCell.textContent = String(Number(poc).toFixed(4));
                try {
                    const low = (metrics.volumeProfile && Number.isFinite(metrics.volumeProfile.valueAreaLow)) ? Number(metrics.volumeProfile.valueAreaLow).toFixed(4) : (fall.volumeProfile && Number.isFinite(fall.volumeProfile.valueAreaLow) ? Number(fall.volumeProfile.valueAreaLow).toFixed(4) : null);
                    const high = (metrics.volumeProfile && Number.isFinite(metrics.volumeProfile.valueAreaHigh)) ? Number(metrics.volumeProfile.valueAreaHigh).toFixed(4) : (fall.volumeProfile && Number.isFinite(fall.volumeProfile.valueAreaHigh) ? Number(fall.volumeProfile.valueAreaHigh).toFixed(4) : null);
                    if (low !== null && high !== null) pocCell.appendChild(makeMuted('VA: ' + low + '\u2013' + high));
                } catch (e) {}
            } else pocCell.textContent = '-';

            // Depth Imbalance
            const depthCell = row.insertCell();
            depthCell.classList.add('advanced-metric');
            const depthVal = (metrics && metrics.depthImbalance && Number.isFinite(metrics.depthImbalance.value)) ? Number(metrics.depthImbalance.value) : ((metrics && metrics.depthImbalance && Number.isFinite(metrics.depthImbalance)) ? Number(metrics.depthImbalance) : null);
            if (Number.isFinite(depthVal)) {
                const pct = (depthVal * 100).toFixed(1);
                depthCell.textContent = (depthVal > 0 ? '+' : '') + pct + '%';
                try { depthCell.classList.add(depthVal > 0 ? 'text-success' : (depthVal < 0 ? 'text-danger' : 'text-muted')); } catch(e) { depthCell.className = (depthCell.className || '') + ' ' + (depthVal > 0 ? 'text-success' : (depthVal < 0 ? 'text-danger' : 'text-muted')); }
                try { if (metrics.depthImbalance && Number.isFinite(metrics.depthImbalance.normalized)) depthCell.appendChild(makeMuted('(' + metrics.depthImbalance.normalized + '%)')); } catch(e){}
            } else depthCell.textContent = '-';
        } catch (e) { /* ignore phase-2 render errors */ }

        // Update timestamp (append last)
        let ts = data.update_time || data.update_time_VOLCOIN || 0;
        if (ts && ts < 1e12) ts = ts * 1000;
        const upCell = row.insertCell();
        upCell.textContent = ts ? new Date(ts).toLocaleString() : '-';
    }

    function renderRecsRow(body, coin, data, pricePosition, recsRowCount, rowLimit) {
        const requestedRecsLimit = isFinite(rowLimit) ? rowLimit : Infinity;
        if (recsRowCount >= requestedRecsLimit) return recsRowCount;

        const selectedTf = (recTimeframeSelect && recTimeframeSelect.value) ? recTimeframeSelect.value : '120m';
        const priceNow = parseFloat(data.last) || 0;
        const recTf = typeof calculateRecommendation === 'function' ? calculateRecommendation(data, pricePosition, selectedTf, true) : { recommendation: 'HOLD', confidence: 0 };
        const conf = (recTf.confidence || 0) / 100;
        const sens = (confSensitivity && Number(confSensitivity.value)) || 1;
        const tpMin = tpMinInput ? Math.max(0, Number(tpMinInput.value) || 2) / 100 : 0.02;
        const tpMax = tpMaxInput ? Math.max(tpMin, Number(tpMaxInput.value) || 0.10) / 100 : 0.10;
        const slMax = slMaxInput ? Math.max(0, Number(slMaxInput.value) || 5) / 100 : 0.05;

        let rangeFactor = Math.min(tpMax, tpMin + conf * (tpMax - tpMin) * sens);
        if (useAtrRecs && useAtrRecs.checked && data._history && typeof computeATR === 'function') {
            const atr = computeATR(data._history, 14);
            if (atr > 0 && priceNow > 0) {
                const atrPct = (atr / priceNow) * sens;
                rangeFactor = Math.min(tpMax, Math.max(tpMin, atrPct));
            }
        }

        let tp = '-', sl = '-';
        if (priceNow > 0 && recTf.recommendation === 'BUY') {
            tp = (priceNow * (1 + rangeFactor)).toFixed(4);
            sl = (priceNow * (1 - Math.min(slMax, Math.max(0.005, rangeFactor / 2)))).toFixed(4);
        } else if (priceNow > 0 && recTf.recommendation === 'SELL') {
            tp = (priceNow * (1 - rangeFactor)).toFixed(4);
            sl = (priceNow * (1 + Math.min(slMax, Math.max(0.005, rangeFactor / 2)))).toFixed(4);
        }

        const r = body.insertRow();
        r.insertCell(0).textContent = coin;
        r.insertCell(1).textContent = selectedTf;

        // Render one row per timeframe (or only the selected timeframe)
        const allTfs = ['1m','5m','10m','30m','60m','120m','24h'];
        const tfsToRender = (selectedTf && String(selectedTf).toLowerCase() !== 'all') ? [selectedTf] : allTfs;

        for (const tf of tfsToRender) {
            if (recsRowCount >= requestedRecsLimit) break;

            const recLocal = (typeof calculateRecommendation === 'function') ? calculateRecommendation(data, pricePosition, tf, true) : { recommendation: 'HOLD', confidence: 0 };
            const confLocal = (recLocal.confidence || 0) / 100;

            let rangeFactorLocal = Math.min(tpMax, tpMin + confLocal * (tpMax - tpMin) * sens);
            if (useAtrRecs && useAtrRecs.checked && data._history && typeof computeATR === 'function') {
                try {
                    const atr = computeATR(data._history, 14);
                    if (atr > 0 && priceNow > 0) {
                        const atrPct = (atr / priceNow) * sens;
                        rangeFactorLocal = Math.min(tpMax, Math.max(tpMin, atrPct));
                    }
                } catch (e) { }
            }

            let tpLocal = '-', slLocal = '-';
            if (priceNow > 0 && recLocal.recommendation === 'BUY') {
                tpLocal = (priceNow * (1 + rangeFactorLocal)).toFixed(4);
                slLocal = (priceNow * (1 - Math.min(slMax, Math.max(0.005, rangeFactorLocal / 2)))).toFixed(4);
            } else if (priceNow > 0 && recLocal.recommendation === 'SELL') {
                tpLocal = (priceNow * (1 - rangeFactorLocal)).toFixed(4);
                slLocal = (priceNow * (1 + Math.min(slMax, Math.max(0.005, rangeFactorLocal / 2)))).toFixed(4);
            }

            const rr = body.insertRow();
            rr.insertCell(0).textContent = coin;
            rr.insertCell(1).textContent = tf;

            const recCell = rr.insertCell(2);
            recCell.textContent = recLocal.recommendation || 'HOLD';
            try {
                const recStr = (recLocal && recLocal.recommendation) ? String(recLocal.recommendation).toUpperCase() : '';
                if (recStr.indexOf('BUY') !== -1) {
                    recCell.className = 'recommendation-buy';
                    recCell.style.color = '#00ff88';
                } else if (recStr.indexOf('SELL') !== -1) {
                    recCell.className = 'recommendation-sell';
                    recCell.style.color = '#ff4757';
                } else {
                    recCell.className = 'recommendation-hold';
                    recCell.style.color = '#ffd700';
                }
            } catch (e) { }

            rr.insertCell(3).textContent = `${recLocal.confidence || 0}%`;
            // Multi-timeframe confluence (polished UI)
            let conflCell = rr.insertCell(4);
            try {
                let confl = null;
                if (typeof calculateMultiTimeframeConfluence === 'function') confl = calculateMultiTimeframeConfluence(data);
                else if (data && data.analytics && data.analytics.multiTfConfluence) confl = data.analytics.multiTfConfluence;
                if (confl && (typeof confl.confluence !== 'undefined' || typeof confl.score !== 'undefined')) {
                    const pct = (typeof confl.confluence !== 'undefined') ? confl.confluence : Math.round(Math.abs((confl.score || 0) * 100));
                    const consensus = confl.consensus || (confl.score > 0 ? 'BUY' : (confl.score < 0 ? 'SELL' : 'MIXED'));
                    conflCell.textContent = pct + '%';
                    conflCell.title = consensus + ' • ' + (confl.breakdown ? confl.breakdown.map(b => `${b.timeframe}:${b.rec}(${Math.round((b.weight||0)*100)}%)`).join(' • ') : '');
                    if (pct >= 60) conflCell.className = 'text-success fw-bold';
                    else if (pct >= 40) conflCell.className = 'text-warning fw-bold';
                    else conflCell.className = 'text-danger fw-bold';
                    if (consensus === 'BUY') conflCell.style.background = 'rgba(0,255,136,0.06)';
                    else if (consensus === 'SELL') conflCell.style.background = 'rgba(255,71,87,0.06)';
                } else {
                    conflCell.textContent = '-';
                }
            } catch (e) { conflCell.textContent = '-'; }

            rr.insertCell(5).textContent = priceNow || '-';
            rr.insertCell(6).textContent = tpLocal;
            rr.insertCell(7).textContent = slLocal;

            recsRowCount++;
        }

        return recsRowCount;
    }

    function renderVolRow(body, coin, data, vb1, vs1, vb5, vs5, vb10, vs10, vb15, vs15, vb20, vs20, vb30, vs30, vb60, vs60, vb2h, vs2h, vb24, vs24) {
        const row = body.insertRow();
        row.insertCell(0).textContent = coin;
        row.insertCell(1).textContent = vb1;
        row.insertCell(2).textContent = vs1;
        row.insertCell(3).textContent = vb5;
        row.insertCell(4).textContent = vs5;
        row.insertCell(5).textContent = vb10;
        row.insertCell(6).textContent = vs10;
        row.insertCell(7).textContent = vb15;
        row.insertCell(8).textContent = vs15;
        row.insertCell(9).textContent = vb20;
        row.insertCell(10).textContent = vs20;
        row.insertCell(11).textContent = vb30;
        row.insertCell(12).textContent = vs30;
        row.insertCell(13).textContent = vb60;
        row.insertCell(14).textContent = vs60;
        row.insertCell(15).textContent = vb2h;
        row.insertCell(16).textContent = vs2h;

        const volRatio2h = vs2h > 0 ? (vb2h / vs2h) * 100 : (vb2h > 0 ? null : 0);
        const cell = row.insertCell(17);
        try {
            cell.textContent = formatVolRatio(volRatio2h);
        } catch (e) { cell.textContent = formatVolRatio(volRatio2h); }
        cell.className = (volRatio2h === null || volRatio2h > 200) ? 'text-success fw-bold' : volRatio2h < 50 ? 'text-danger fw-bold' : 'text-warning fw-bold';

        row.insertCell(18).textContent = vb24;
        row.insertCell(19).textContent = vs24;
        row.insertCell(20).textContent = (vb24 || 0) + (vs24 || 0);
    }

    function renderVolDurRow(body, coin, data) {
        try {
            const vdr = body.insertRow();
            vdr.insertCell(0).textContent = coin;

            // Price change
            const pct = Number(data.percent_change) || 0;
            const ccell = vdr.insertCell(1);
            ccell.textContent = (Math.round(pct * 100) / 100) + '%';
            ccell.className = pct > 0 ? 'text-success fw-bold' : (pct < 0 ? 'text-danger fw-bold' : '');

            function getDurPct(pctKey, buyKeys, sellKeys) {
                let p = getNumeric(data, pctKey);
                if (p && p > 0) return Math.round(p);
                const b = getNumeric(data, ...buyKeys);
                const s = getNumeric(data, ...sellKeys);
                const t = (b || 0) + (s || 0);
                return t > 0 ? Math.round((b / t) * 100) : 0;
            }

            const cells = [
                getDurPct('percent_sum_VOL_minute1_buy', ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1m'], ['count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1m']),
                getDurPct('percent_sum_VOL_minute_5_buy', ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5m'], ['count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5m']),
                getDurPct('percent_sum_VOL_minute_10_buy', ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10m'], ['count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10m']),
                getDurPct('percent_sum_VOL_minute_15_buy', ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'], ['count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m']),
                getDurPct('percent_sum_VOL_minute_20_buy', ['count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m'], ['count_VOL_minute_20_sell', 'vol_sell_20MENIT', 'vol_sell_20m']),
                getDurPct('percent_sum_VOL_minute_30_buy', ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'], ['count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m']),
                getDurPct('percent_sum_VOL_minute_60_buy', ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT'], ['count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT']),
                getDurPct('percent_sum_VOL_overall_buy', ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h'], ['count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24h'])
            ];

            for (const cval of cells) {
                const c = vdr.insertCell(-1);
                c.textContent = (isNaN(cval) ? 0 : cval) + '%';
                c.className = getDurabilityClass(cval);
            }
        } catch (e) { console.warn('volDur row error', e); }
    }

    function renderMicroRow(body, coin, data) {
        // Use pre-computed analytics if available, fallback to raw data
        const a = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
        const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : a;
        const tf = a.timeframes || {};
        
        // Get values from analytics first, then raw data as fallback (correct field names from WebSocket)
        const volBuy2h = a.volBuy2h || Number(data.vol_buy_2JAM) || 0;
        const volSell2h = a.volSell2h || Number(data.vol_sell_2JAM) || 0;
        const freqBuy2h = a.freqBuy2h || Number(data.freq_buy_2JAM) || 0;
        const freqSell2h = a.freqSell2h || Number(data.freq_sell_2JAM) || 0;
        const avgVolBuy = a.avgBuy2h || Number(data.avg_VOLCOIN_buy_2JAM) || 1;
        const avgVolSell = a.avgSell2h || Number(data.avg_VOLCOIN_sell_2JAM) || 1;
        const avgFreqBuy = a.avgFreqBuy2h || Number(data.avg_FREQCOIN_buy_2JAM) || 1;
        
        // Get 1m and 5m data (correct field names from WebSocket)
        const volBuy1m = (tf['1m'] && tf['1m'].volBuy) || Number(data.vol_buy_1MENIT) || 0;
        const volBuy5m = (tf['5m'] && tf['5m'].volBuy) || Number(data.vol_buy_5MENIT) || 0;
        const freqBuy1m = (tf['1m'] && tf['1m'].freqBuy) || Number(data.freq_buy_1MENIT) || 0;
        const freqBuy5m = (tf['5m'] && tf['5m'].freqBuy) || Number(data.freq_buy_5MENIT) || 0;
        
        const totalVol = volBuy2h + volSell2h;
        const totalFreq = freqBuy2h + freqSell2h;
        
        // Helper functions
        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        const safeDiv = (a, b, def = 0) => b > 0 ? a / b : def;
        
        // Cohesion Index
        const volRatio = totalVol > 0 ? volBuy2h / totalVol : 0.5;
        const freqRatio = totalFreq > 0 ? freqBuy2h / totalFreq : 0.5;
        const pricePos = Number(data.price_position) || 50;
        const priceFactor = pricePos / 100;
        const cohesion = clamp(((volRatio + freqRatio + (1 - priceFactor)) / 3) * 100, 0, 100);
        
        // Acc Vol (Volume Acceleration) - use previously defined volBuy1m, volBuy5m
        const avg5m = volBuy5m > 0 ? volBuy5m / 5 : 0;
        const accVol = avg5m > 0 ? (volBuy1m - avg5m) / avg5m : 0;
        
        // FBI (Frequency Burst Index) - use previously defined freqBuy1m, freqBuy5m
        const shortTermFreq = (freqBuy1m * 5 + freqBuy5m) / 6;
        const fbi = safeDiv(shortTermFreq, avgFreqBuy, 1);
        
        // OFSI (Order Flow Stability Index)
        const volDelta = volBuy2h - volSell2h;
        const freqDelta = freqBuy2h - freqSell2h;
        const volNorm = totalVol > 0 ? Math.abs(volDelta) / totalVol : 0;
        const freqNorm = totalFreq > 0 ? Math.abs(freqDelta) / totalFreq : 0;
        const ofsi = clamp((1 - Math.abs(volNorm - freqNorm)) * 100, 0, 100);
        
        // FSI (Flow Strength Index)
        const buyPressure = safeDiv(volBuy2h, avgVolBuy, 1) + safeDiv(freqBuy2h, avgFreqBuy, 1);
        const sellPressure = safeDiv(volSell2h, avgVolSell, 1) + safeDiv(freqSell2h, avgFreqBuy, 1);
        const fsi = clamp(50 + (buyPressure - sellPressure) * 10, 0, 100);
        
        // Z-Press (Z-Weighted Pressure)
        const volZBuy = (volBuy2h - avgVolBuy) / (avgVolBuy || 1);
        const volZSell = (volSell2h - avgVolSell) / (avgVolSell || 1);
        const zPress = clamp((volZBuy - volZSell) * 20, -100, 100);
        
        // TIM (Trade Imbalance Momentum)
        const tim = totalVol > 0 ? ((volBuy2h - volSell2h) / totalVol) * 100 : 0;
        
        // CIS (Composite Institutional Signal)
        const cis = clamp((cohesion * 0.3 + fsi * 0.3 + (fbi > 1 ? 50 : fbi * 50) * 0.2 + ofsi * 0.2), 0, 100);
        
        // LSI (Liquidity Shock Index)
        const volSpike = safeDiv(volBuy2h + volSell2h, avgVolBuy + avgVolSell, 1);
        const lsi = volSpike > 2 ? clamp(volSpike * 20, 0, 100) : 0;
        
        // Range Compression
        const high = Number(data.high) || 0;
        const low = Number(data.low) || 0;
        const last = Number(data.last) || 0;
        const range = high - low;
        const rangeComp = last > 0 && range > 0 ? (range / last) * 100 : 0;
        
        // PFCI (Price-Flow Conflict Index)
        const priceChange = Number(data.percent_change) || 0;
        const flowDirection = volBuy2h > volSell2h ? 1 : -1;
        const priceDirection = priceChange > 0 ? 1 : -1;
        const pfci = priceDirection !== flowDirection ? Math.abs(priceChange) * 10 : 0;
        
        // Render row
        const row = body.insertRow();
        row.insertCell(0).textContent = coin;
        
        // Cohesion
        const cohCell = row.insertCell(1);
        cohCell.textContent = Math.round(cohesion) + '%';
        cohCell.className = cohesion > 60 ? 'text-success' : cohesion < 40 ? 'text-danger' : 'text-warning';
        
        // Acc Vol
        const accCell = row.insertCell(2);
        accCell.textContent = accVol.toFixed(2);
        accCell.className = accVol > 0.5 ? 'text-success' : accVol < -0.5 ? 'text-danger' : 'text-muted';
        
        // FBI
        const fbiCell = row.insertCell(3);
        fbiCell.textContent = fbi.toFixed(2);
        fbiCell.className = fbi > 1.5 ? 'text-success fw-bold' : fbi > 1 ? 'text-warning' : 'text-muted';
        
        // OFSI
        const ofsiCell = row.insertCell(4);
        ofsiCell.textContent = Math.round(ofsi);
        ofsiCell.className = ofsi > 70 ? 'text-success' : ofsi < 30 ? 'text-danger' : 'text-muted';
        
        // FSI
        const fsiCell = row.insertCell(5);
        fsiCell.textContent = Math.round(fsi);
        fsiCell.className = fsi > 60 ? 'text-success' : fsi < 40 ? 'text-danger' : 'text-warning';
        
        // Z-Press
        const zpCell = row.insertCell(6);
        zpCell.textContent = (zPress > 0 ? '+' : '') + zPress.toFixed(1);
        zpCell.className = zPress > 20 ? 'text-success' : zPress < -20 ? 'text-danger' : 'text-muted';
        
        // TIM
        const timCell = row.insertCell(7);
        timCell.textContent = (tim > 0 ? '+' : '') + tim.toFixed(1);
        timCell.className = tim > 20 ? 'text-success' : tim < -20 ? 'text-danger' : 'text-muted';
        
        // CIS
        const cisCell = row.insertCell(8);
        cisCell.textContent = Math.round(cis);
        cisCell.className = cis > 60 ? 'text-success fw-bold' : cis < 40 ? 'text-danger' : 'text-warning';
        
        // LSI
        const lsiCell = row.insertCell(9);
        lsiCell.textContent = Math.round(lsi);
        lsiCell.className = lsi > 50 ? 'text-warning fw-bold' : 'text-muted';
        
        // Range Comp
        row.insertCell(10).textContent = rangeComp.toFixed(3);
        
        // PFCI
        const pfciCell = row.insertCell(11);
        pfciCell.textContent = pfci.toFixed(1);
        pfciCell.className = pfci > 30 ? 'text-warning fw-bold' : 'text-muted';
    }

    function renderSpikeTable(body, spikeRows, rowLimit) {
        if (!body) return;
        spikeRows.sort((a, b) => b.ratio - a.ratio);
        // For the Spike tab, follow the global rowLimit passed into updateTable()
        const isSpikePane = (body && body.id === 'spikeBody');
        const defaultCap = 100;
        const effectiveLimit = isFinite(rowLimit) ? Number(rowLimit) : defaultCap;
        const maxSpikes = isSpikePane ? Math.min(spikeRows.length, effectiveLimit) : (isFinite(rowLimit) ? rowLimit : spikeRows.length);
        const showRows = spikeRows.slice(0, maxSpikes);
        for (const s of showRows) {
            const r = body.insertRow();
            r.insertCell(0).textContent = s.coin;
            // Side (BUY/SELL/TOTAL)
            const sideCell = r.insertCell(1);
            sideCell.textContent = s.side || '';
            sideCell.className = s.side === 'BUY' ? 'text-success fw-bold' : (s.side === 'SELL' ? 'text-danger fw-bold' : 'text-muted');
            r.insertCell(2).textContent = s.timeframe;
            r.insertCell(3).textContent = s.vol;
            r.insertCell(4).textContent = s.avg;
            const ratioCell = r.insertCell(5);
            ratioCell.textContent = s.ratio.toFixed(2) + 'x';
            ratioCell.className = s.ratio >= 4 ? 'text-success fw-bold' : s.ratio >= 2 ? 'text-warning fw-bold' : '';
            
            const priceCell = r.insertCell(6);
            const pc = s.price_change || 0;
            priceCell.textContent = (pc > 0 ? '+' : '') + pc.toFixed(2) + '%';
            priceCell.className = pc > 0 ? 'text-success fw-bold' : pc < 0 ? 'text-danger fw-bold' : 'text-muted';
            
            const recCell = r.insertCell(7);
            recCell.textContent = s.recommendation ? `${s.recommendation} (${s.recConfidence}%)` : 'HOLD';
            recCell.className = s.recClassName || 'recommendation-hold';
            
            const ts = s.update_time && s.update_time < 1e12 ? s.update_time * 1000 : s.update_time;
            const upCell = r.insertCell(8);
            upCell.textContent = ts ? new Date(ts).toLocaleString() : '-';

            // Row styling by recommendation for quick visual cue
            try {
                if (s.recommendation && typeof s.recommendation === 'string') {
                    const rec = String(s.recommendation).toUpperCase();
                    if (rec.indexOf('LONG') !== -1) r.classList.add('recommendation-buy');
                    else if (rec.indexOf('SHORT') !== -1) r.classList.add('recommendation-sell');
                    else r.classList.add('recommendation-hold');
                }
            } catch (e) { }
        }
    }

    // ===================== Frequency Tab Renderer =====================
    function renderFreqRow(body, coin, data) {
        const row = body.insertRow();
        row.dataset.coin = coin;

        // Prefer unified metrics (timeframes.freqBuy/freqSell) when available — fall back to raw fields
        const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
        const tf = (metrics && metrics.timeframes) ? metrics.timeframes : {};

        const safeNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

        const tfValue = (key, propNames = ['freqBuy', 'freqSell']) => {
            const t = tf[key] || {};
            for (const prop of propNames) {
                if (typeof t[prop] !== 'undefined' && t[prop] !== null) return t[prop];
            }
            return undefined;
        };

        const freqBuy1m = safeNum(tfValue('1m', ['freqBuy', 'freq_buy']) ?? getNumeric(data, 'freq_buy_1MENIT', 'count_FREQ_minute1_buy', 'count_FREQ_minute_1_buy'));
        const freqSell1m = safeNum(tfValue('1m', ['freqSell', 'freq_sell']) ?? getNumeric(data, 'freq_sell_1MENIT', 'count_FREQ_minute1_sell', 'count_FREQ_minute_1_sell'));
        const freqBuy5m = safeNum(tfValue('5m', ['freqBuy', 'freq_buy']) ?? getNumeric(data, 'freq_buy_5MENIT', 'count_FREQ_minute_5_buy'));
        const freqSell5m = safeNum(tfValue('5m', ['freqSell', 'freq_sell']) ?? getNumeric(data, 'freq_sell_5MENIT', 'count_FREQ_minute_5_sell'));
        const freqBuy10m = safeNum(tfValue('10m', ['freqBuy', 'freq_buy']) ?? getNumeric(data, 'freq_buy_10MENIT', 'count_FREQ_minute_10_buy'));
        const freqSell10m = safeNum(tfValue('10m', ['freqSell', 'freq_sell']) ?? getNumeric(data, 'freq_sell_10MENIT', 'count_FREQ_minute_10_sell'));
        const freqBuy30m = safeNum(tfValue('30m', ['freqBuy', 'freq_buy']) ?? getNumeric(data, 'freq_buy_30MENIT', 'count_FREQ_minute_30_buy'));
        const freqSell30m = safeNum(tfValue('30m', ['freqSell', 'freq_sell']) ?? getNumeric(data, 'freq_sell_30MENIT', 'count_FREQ_minute_30_sell'));
        const freqBuy1h = safeNum(tfValue('60m', ['freqBuy', 'freq_buy']) ?? getNumeric(data, 'freq_buy_1JAM', 'count_FREQ_minute_60_buy'));
        const freqSell1h = safeNum(tfValue('60m', ['freqSell', 'freq_sell']) ?? getNumeric(data, 'freq_sell_1JAM', 'count_FREQ_minute_60_sell'));
        const freqBuy2h = safeNum(tfValue('120m', ['freqBuy', 'freq_buy']) ?? getNumeric(data, 'freq_buy_2JAM', 'count_FREQ_minute_120_buy', 'count_FREQ_minute_120_buy'));
        const freqSell2h = safeNum(tfValue('120m', ['freqSell', 'freq_sell']) ?? getNumeric(data, 'freq_sell_2JAM', 'count_FREQ_minute_120_sell'));
        const freqBuy24h = safeNum(tfValue('24h', ['freqBuy', 'freq_buy']) ?? getNumeric(data, 'freq_buy_24JAM', 'count_FREQ_minute_1440_buy'));
        const freqSell24h = safeNum(tfValue('24h', ['freqSell', 'freq_sell']) ?? getNumeric(data, 'freq_sell_24JAM', 'count_FREQ_minute_1440_sell'));

        row.insertCell(0).textContent = coin;
        
        const addFreqCell = (buy, sell, idx) => {
            const buyCell = row.insertCell(idx);
            buyCell.textContent = buy;
            buyCell.className = buy > sell ? 'text-success' : 'text-muted';
            
            const sellCell = row.insertCell(idx + 1);
            sellCell.textContent = sell;
            sellCell.className = sell > buy ? 'text-danger' : 'text-muted';
        };

        addFreqCell(freqBuy1m, freqSell1m, 1);
        addFreqCell(freqBuy5m, freqSell5m, 3);
        addFreqCell(freqBuy10m, freqSell10m, 5);
        addFreqCell(freqBuy30m, freqSell30m, 7);
        addFreqCell(freqBuy1h, freqSell1h, 9);
        addFreqCell(freqBuy2h, freqSell2h, 11);
        addFreqCell(freqBuy24h, freqSell24h, 13);
    }

    // ===================== Freq Ratio Tab Renderer =====================
    function renderFreqRatioRow(body, coin, data) {
        const row = body.insertRow();
        row.dataset.coin = coin;

        // Use unified metrics for display values but read raw analytics/timeframes from the original data
        const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
        const rawAnalytics = (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
        const tf = (rawAnalytics && rawAnalytics.timeframes) ? rawAnalytics.timeframes : {};

        // Support various timeframe key aliases: analytics may use '1h'/'2h' while other parts use '60m'/'120m'
        const timeframeCols = [
            { label: '1m', keys: ['1m'] },
            { label: '5m', keys: ['5m'] },
            { label: '10m', keys: ['10m'] },
            { label: '30m', keys: ['30m'] },
            { label: '1h', keys: ['60m', '1h'] },
            { label: '2h', keys: ['120m', '2h'] },
            { label: '24h', keys: ['24h'] }
        ];

        const getFreqRatio = (tfKeys) => {
            // tfKeys can be array of aliases to try
            for (const k of (Array.isArray(tfKeys) ? tfKeys : [tfKeys])) {
                const tfData = tf[k] || {};
                const buy = Number(tfData.freqBuy) || 0;
                const sell = Number(tfData.freqSell) || 0;
                const total = buy + sell;
                if (total > 0) return Math.round((buy / total) * 100);
            }
            return 0;
        };

        const fmtRatio = (ratio) => {
            if (ratio === null) return '∞';
            return ratio + '%';
        };

        const getRatioClass = (ratio) => {
            // ratio is percent [0..100]
            if (ratio >= 66) return 'text-success fw-bold';
            if (ratio >= 55) return 'text-success';
            if (ratio <= 33) return 'text-danger fw-bold';
            if (ratio <= 45) return 'text-danger';
            return 'text-warning';
        };

        row.insertCell(0).textContent = coin;

        timeframeCols.forEach((col, idx) => {
            const ratio = getFreqRatio(col.keys);
            const cell = row.insertCell(idx + 1);
            cell.textContent = fmtRatio(ratio);
            cell.className = getRatioClass(ratio);
        });

        // Freq vs Avg 2h
        const freqVsAvg = rawAnalytics.freqBuy_vs_avg_percent || 0;
        const vsAvgCell = row.insertCell(8);
        vsAvgCell.textContent = Math.round(freqVsAvg) + '%';
        vsAvgCell.className = freqVsAvg > 150 ? 'text-success fw-bold' : freqVsAvg > 100 ? 'text-success' : freqVsAvg < 50 ? 'text-danger' : 'text-warning';

        // Freq Spike (freq vs avg ratio)
        const avgFreqBuy = rawAnalytics.avgFreqBuy2h || 1;
        const freqBuy2h = rawAnalytics.freqBuy2h || 0;
        const freqSpike = avgFreqBuy > 0 ? freqBuy2h / avgFreqBuy : 0;
        const spikeCell = row.insertCell(9);
        spikeCell.textContent = freqSpike.toFixed(2) + 'x';
        spikeCell.className = freqSpike >= 2 ? 'text-success fw-bold' : freqSpike >= 1 ? 'text-warning' : 'text-muted';
    }

    // ===================== Microstructure Tab Async Renderer =====================
    let microRenderPending = false;
    let lastMicroRenderTime = 0;
    let lastMicroLimit = null;
    const MICRO_RENDER_THROTTLE = 1000; // Don't re-render more than once per second
    
    async function renderMicroTabAsync(body, sorted, limit) {
        const now = Date.now();
        
        // Throttle: skip if rendered recently
        if (now - lastMicroRenderTime < MICRO_RENDER_THROTTLE) {
            return;
        }
        
        // If a render is in-flight, only skip if the requested limit is the same
        if (microRenderPending && limit === lastMicroLimit) return;
        microRenderPending = true;
        lastMicroRenderTime = now;
        
        try {
            // Prepare batch data for worker - use structuredClone to prevent race conditions
            const batchData = {};
            for (let i = 0; i < sorted.length && i < limit; i++) {
                const [coin, data] = sorted[i];
                // Clone data to prevent race condition with WebSocket updates
                try {
                    batchData[coin] = typeof structuredClone === 'function' 
                        ? structuredClone(data) 
                        : JSON.parse(JSON.stringify(data));
                } catch (e) {
                    batchData[coin] = data; // fallback if clone fails
                }
            }
            
            // Send to worker pool for parallel processing (use shim-backed workerPool)
            const _wp = (window.__okxShim && typeof window.__okxShim.getWorkerPool === 'function') ? window.__okxShim.getWorkerPool() : (window.workerPool || null);
            let results = null;
            if (_wp && typeof _wp.computeAnalyticsBatch === 'function') {
                try { results = await _wp.computeAnalyticsBatch(batchData); } catch (e) { results = null; }
            } else {
                // fallback: synchronous compute on main thread
                try { results = await (typeof computeAnalyticsBatch === 'function' ? computeAnalyticsBatch(batchData) : null); } catch (e) { results = null; }
            }
            
            // Only clear and render if this is still the most recent request
            if (lastMicroRenderTime === now) {
                body.innerHTML = '';
                
                // Continue iterating until we've rendered `limit` rows or exhausted `sorted`.
                let rendered = 0;
                for (let i = 0; i < sorted.length && rendered < limit; i++) {
                    const [coin] = sorted[i];
                    const metrics = results && results[coin];
                    if (metrics && metrics.micro) {
                        renderMicroRowFromWorker(body, coin, metrics.micro);
                        rendered++;
                    } else if (!results) {
                        // If results not available, fall back to rendering from raw data
                        const data = (window.coinDataMap && window.coinDataMap[coin]) ? window.coinDataMap[coin] : null;
                        if (data) {
                            renderMicroRow(body, coin, data);
                            rendered++;
                        }
                    }
                }
                lastMicroLimit = limit;
            }
        } catch (err) {
            console.warn('[MicroTab] Worker error, fallback to sync:', err);
            body.innerHTML = '';
            for (let i = 0; i < sorted.length && i < limit; i++) {
                const [coin, data] = sorted[i];
                renderMicroRow(body, coin, data);
            }
        } finally {
            microRenderPending = false;
        }
    }
    
    // Render micro row from worker result (pre-computed metrics)
    function renderMicroRowFromWorker(body, coin, m) {
        const row = body.insertRow();
        row.insertCell(0).textContent = coin;
        
        // Cohesion
        const cohCell = row.insertCell(1);
        cohCell.textContent = Math.round(m.cohesion) + '%';
        cohCell.className = m.cohesion > 60 ? 'text-success' : m.cohesion < 40 ? 'text-danger' : 'text-warning';
        
        // Acc Vol (Volume Acceleration)
        const accCell = row.insertCell(2);
        const accVol = m.accVol || 0;
        accCell.textContent = accVol.toFixed(2);
        accCell.className = accVol > 0.5 ? 'text-success' : accVol < -0.5 ? 'text-danger' : 'text-muted';
        
        // FBI
        const fbiCell = row.insertCell(3);
        fbiCell.textContent = m.fbi.toFixed(2);
        fbiCell.className = m.fbi > 1.5 ? 'text-success fw-bold' : m.fbi > 1 ? 'text-warning' : 'text-muted';
        
        // OFSI
        const ofsiCell = row.insertCell(4);
        ofsiCell.textContent = Math.round(m.ofsi);
        ofsiCell.className = m.ofsi > 70 ? 'text-success' : m.ofsi < 30 ? 'text-danger' : 'text-muted';
        
        // FSI
        const fsiCell = row.insertCell(5);
        fsiCell.textContent = Math.round(m.fsi);
        fsiCell.className = m.fsi > 60 ? 'text-success' : m.fsi < 40 ? 'text-danger' : 'text-warning';
        
        // Z-Press
        const zpCell = row.insertCell(6);
        zpCell.textContent = (m.zPress > 0 ? '+' : '') + m.zPress.toFixed(1);
        zpCell.className = m.zPress > 20 ? 'text-success' : m.zPress < -20 ? 'text-danger' : 'text-muted';
        
        // TIM
        const timCell = row.insertCell(7);
        timCell.textContent = (m.tim > 0 ? '+' : '') + m.tim.toFixed(1);
        timCell.className = m.tim > 20 ? 'text-success' : m.tim < -20 ? 'text-danger' : 'text-muted';
        
        // CIS
        const cisCell = row.insertCell(8);
        cisCell.textContent = Math.round(m.cis);
        cisCell.className = m.cis > 60 ? 'text-success fw-bold' : m.cis < 40 ? 'text-danger' : 'text-warning';
        
        // LSI
        const lsiCell = row.insertCell(9);
        lsiCell.textContent = Math.round(m.lsi);
        lsiCell.className = m.lsi > 50 ? 'text-warning fw-bold' : 'text-muted';
        
        // Range Comp
        row.insertCell(10).textContent = m.rangeComp.toFixed(3);
        
        // PFCI
        const pfciCell = row.insertCell(11);
        pfciCell.textContent = m.pfci.toFixed(1);
        pfciCell.className = m.pfci > 30 ? 'text-warning fw-bold' : 'text-muted';
    }

    // ===================== Smart Analysis Tab Renderer =====================
    
    function renderSmartRow(body, coin, data) {
        const row = body.insertRow();
        row.dataset.coin = coin;

        // Check if a preferred metrics core is available (metricsWrapper preferred)
        const core = getMetricsCore();
        const hasAnalyticsCore = !!(core && typeof core.computeAllSmartMetrics === 'function');
        const hasLegacy = typeof computeSmartMetrics === 'function';
        
        if (!hasAnalyticsCore && !hasLegacy) {
            row.insertCell(0).textContent = coin;
                // insert placeholders for all Smart columns (keep layout stable)
                for (let i = 1; i <= 16; i++) {
                    row.insertCell(i).textContent = '-';
                }
            return;
        }

        // Use AnalyticsCore if available, otherwise fall back to legacy
        const metrics = hasAnalyticsCore ? core.computeAllSmartMetrics(data) : computeSmartMetrics(data);

        row.insertCell(0).textContent = coin;

        // SMI (Smart Money Index)
        const smiCell = row.insertCell(1);
        smiCell.textContent = Math.round(metrics.smi.value);
        smiCell.className = metrics.smi.className || '';
        smiCell.title = metrics.smi.interpretation;

        // Trade Intensity
        const intCell = row.insertCell(2);
        intCell.textContent = Math.round(metrics.intensity.value) + '%';
        intCell.className = metrics.intensity.className || '';
        intCell.title = metrics.intensity.level;

        // Momentum Divergence
        const divCell = row.insertCell(3);
        divCell.textContent = metrics.divergence.interpretation;
        divCell.className = metrics.divergence.className || '';

        // Accumulation Score
        const accumCell = row.insertCell(4);
        accumCell.textContent = fmtNum(metrics.accumScore.value, 5);
        accumCell.className = metrics.accumScore.className || '';
        accumCell.title = metrics.accumScore.interpretation;

        // Whale Activity
        const whaleCell = row.insertCell(5);
        whaleCell.textContent = Math.round(metrics.whale.value);
        whaleCell.className = metrics.whale.className || '';
        whaleCell.title = metrics.whale.level;

        // R/I Ratio
        const riCell = row.insertCell(6);
        // R/I ratio may be provided as a number or an object { value: .. }
        const riVal = (metrics.riRatio && typeof metrics.riRatio === 'object') ? (Number(metrics.riRatio.value) || 0) : (Number(metrics.riRatio) || 0);
        riCell.textContent = Math.round(riVal);
        riCell.className = (metrics.riRatio && metrics.riRatio.className) ? metrics.riRatio.className : '';

        // Pressure Index
        const pressCell = row.insertCell(7);
        const pressVal = metrics.pressure.value;
        pressCell.textContent = (pressVal > 0 ? '+' : '') + Math.round(pressVal);
        pressCell.className = metrics.pressure.className || '';
        pressCell.title = metrics.pressure.direction;

        // Trend Strength
        const trendCell = row.insertCell(8);
        trendCell.textContent = fmtNum(metrics.trendStrength.value, 5) + '%';
        trendCell.className = metrics.trendStrength.className || '';
        trendCell.title = metrics.trendStrength.level + ' ' + metrics.trendStrength.direction;

        // Breakout Probability (NEW)
        const breakoutCell = row.insertCell(9);
        if (metrics.breakout) {
            breakoutCell.textContent = fmtNum(metrics.breakout.value, 5) + '%';
            breakoutCell.className = metrics.breakout.className || '';
            breakoutCell.title = 'Direction: ' + metrics.breakout.direction + ' | Confidence: ' + metrics.breakout.confidence;
        } else {
            breakoutCell.textContent = '-';
        }

        // LSI - Liquidity Stress Index (NEW)
        const lsiCell = row.insertCell(10);
        if (metrics.lsi) {
            lsiCell.textContent = metrics.lsi.value.toFixed(1);
            lsiCell.className = metrics.lsi.className || '';
            lsiCell.title = metrics.lsi.level;
        } else {
            lsiCell.textContent = '-';
        }

        // Market Mode (NEW)
        const modeCell = row.insertCell(11);
        if (metrics.marketMode) {
            modeCell.textContent = metrics.marketMode.mode;
            modeCell.className = metrics.marketMode.className || '';
            modeCell.title = 'Confidence: ' + metrics.marketMode.confidence + '%';
        } else {
            modeCell.textContent = '-';
        }

        // Smart Signal + unified recommendation (show calculateRecommendation if available)
        const sigCell = row.insertCell(12);
        try {
            const smartText = (metrics && metrics.smartSignal && metrics.smartSignal.signal ? metrics.smartSignal.signal : 'HOLD') + ' (' + ((metrics && metrics.smartSignal && metrics.smartSignal.confidence) || 0) + '%)';
            const pricePos = (metrics && metrics.pricePosition !== undefined && Number.isFinite(Number(metrics.pricePosition))) ? Math.round(Number(metrics.pricePosition)) : (data && Number.isFinite(Number(data.pricePosition)) ? Math.round(Number(data.pricePosition)) : 50);
            const rec = (typeof calculateRecommendation === 'function') ? calculateRecommendation(data, pricePos, null, false) : null;

            function mapSignalClass(signal) {
                if (!signal) return '';
                const s = String(signal).toUpperCase();
                if (s.indexOf('BUY') !== -1) return 'recommendation-buy';
                if (s.indexOf('SELL') !== -1) return 'recommendation-sell';
                if (s.indexOf('HOLD') !== -1) return 'recommendation-hold';
                return '';
            }

            const mappedSignalClass = mapSignalClass(metrics && metrics.smartSignal && metrics.smartSignal.signal);

            // Render only the smart signal (hide the unified recommendation text per user request)
            sigCell.innerHTML = '';
            const signalSpan = document.createElement('span');
            signalSpan.textContent = (metrics && metrics.smartSignal && metrics.smartSignal.signal ? metrics.smartSignal.signal : 'HOLD') + ' (' + ((metrics && metrics.smartSignal && metrics.smartSignal.confidence) || 0) + '%)';

            // Preserve non-recommendation classes from metrics
            const existing = (metrics.smartSignal && metrics.smartSignal.className) ? String(metrics.smartSignal.className).split(/\s+/) : [];
            existing.filter(c => c && !c.startsWith('recommendation-')).forEach(c => signalSpan.classList.add(c));

            // Apply mapped class + inline styles to signalSpan
            if (mappedSignalClass) signalSpan.classList.add(mappedSignalClass);
            if (mappedSignalClass === 'recommendation-buy') {
                signalSpan.style.color = '#00ff88';
                signalSpan.style.textShadow = '0 0 4px rgba(0, 255, 136, 0.6)';
            } else if (mappedSignalClass === 'recommendation-sell') {
                signalSpan.style.color = '#ff4757';
                signalSpan.style.textShadow = '0 0 4px rgba(255, 71, 87, 0.6)';
            } else if (mappedSignalClass === 'recommendation-hold') {
                signalSpan.style.color = '#ffd700';
                signalSpan.style.textShadow = '0 0 4px rgba(255, 215, 0, 0.6)';
            }

            sigCell.appendChild(signalSpan);
        } catch (e) {
            sigCell.textContent = (metrics.smartSignal && metrics.smartSignal.signal ? metrics.smartSignal.signal : 'HOLD') + ' (' + ((metrics.smartSignal && metrics.smartSignal.confidence) || 0) + '%)';
            const mapCls = (function(s){ if(!s) return ''; s=String(s).toUpperCase(); if(s.indexOf('BUY')!==-1) return 'recommendation-buy'; if(s.indexOf('SELL')!==-1) return 'recommendation-sell'; if(s.indexOf('HOLD')!==-1) return 'recommendation-hold'; return ''; })(metrics.smartSignal && metrics.smartSignal.signal);
            sigCell.className = mapCls || ((metrics.smartSignal && metrics.smartSignal.className) ? metrics.smartSignal.className : '');
        }

        // --- Additional wrapper-derived diagnostics ---
        try {
            const wrapper = (core && typeof core.computeVolumeSpikeQuality === 'function') ? core : (typeof window !== 'undefined' && window.metricsWrapper ? window.metricsWrapper : null);

            // Volume Spike Quality
            const vq = wrapper && typeof wrapper.computeVolumeSpikeQuality === 'function' ? wrapper.computeVolumeSpikeQuality(data, { timeframe: '2JAM' }) : null;
            const vqCell = row.insertCell(13);
            if (vq) {
                vqCell.textContent = `${vq.interpretation} (${(vq.ratio * 100).toFixed(1)}%)`;
                vqCell.title = `vol:${vq.currentVol} avg:${Math.round(vq.avgVol)} priceChange:${vq.priceChange}%`;
                vqCell.className = vq.signal === 'BULLISH' ? 'text-success' : vq.signal === 'VERY_BULLISH' ? 'text-success fw-bold' : vq.signal === 'BEARISH' ? 'text-danger' : 'text-muted';
            } else { vqCell.textContent = '-'; }

            // Funding vs Price Divergence
            const fd = wrapper && typeof wrapper.calculateFundingPriceDivergence === 'function' ? wrapper.calculateFundingPriceDivergence(data) : null;
            const fdCell = row.insertCell(14);
            if (fd) {
                fdCell.textContent = `${fd.divergence}`;
                fdCell.title = `funding:${fd.fundingRate} priceChange:${fd.priceChange}%`;
                fdCell.className = fd.signal === 'VERY_BULLISH' ? 'text-success fw-bold' : fd.signal === 'BUY_DIP' ? 'text-success' : fd.signal === 'TAKE_PROFIT' ? 'text-danger' : 'text-muted';
            } else { fdCell.textContent = '-'; }

            // Liquidity Quality
            const lq = wrapper && typeof wrapper.calculateLiquidityQuality === 'function' ? wrapper.calculateLiquidityQuality(data, { timeframe: '2JAM' }) : null;
            const lqCell = row.insertCell(15);
            if (lq) {
                lqCell.textContent = lq.quality;
                lqCell.title = `freqRatio:${(lq.freqRatio * 100).toFixed(1)}% tradeImbalance:${(lq.tradeSizeImbalance * 100).toFixed(1)}%`;
                lqCell.className = lq.signal === 'CAUTION' ? 'text-warning fw-bold' : lq.signal === 'SAFE_TO_TRADE' ? 'text-success' : 'text-muted';
            } else { lqCell.textContent = '-'; }

            // Momentum Consistency
            const mc = wrapper && typeof wrapper.calculateMomentumConsistency === 'function' ? wrapper.calculateMomentumConsistency(data) : null;
            const mcCell = row.insertCell(16);
            if (mc) {
                mcCell.textContent = `${mc.trend} ${mc.strength}`;
                mcCell.title = `bull:${mc.bullishCount} bear:${mc.bearishCount} consistency:${mc.consistency}%`;
                mcCell.className = mc.trend === 'BULLISH' ? 'text-success' : mc.trend === 'BEARISH' ? 'text-danger' : 'text-muted';
            } else { mcCell.textContent = '-'; }
        } catch (e) {
            // non-fatal
            try { row.insertCell(13).textContent = '-'; row.insertCell(14).textContent = '-'; row.insertCell(15).textContent = '-'; row.insertCell(16).textContent = '-'; } catch (ex) {}
        }
    }

    // ===================== Exports =====================
    window.updateTable = updateTable;
    window.getSortValue = getSortValue;
    window.getVolDurabilityMetric = getVolDurabilityMetric;
    window.getDurabilityClass = getDurabilityClass;
})();
