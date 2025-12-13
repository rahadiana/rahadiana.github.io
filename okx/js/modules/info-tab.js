/**
 * info-tab.js
 * Renders the Info/Runtime tab with system status, last raw JSON, analytics snapshot, and Smart Metrics
 * Dependencies: coinDataMap, ws, AnalyticsCore, getNumeric, calculateRecommendation, etc.
 */

(function () {
    'use strict';

    // ===================== Formatters =====================
    const fmtNum = (val, digits = 2) => {
        const n = Number(val);
        return Number.isFinite(n) ? n.toFixed(digits) : '-';
    };
    const fmtPct = (val, digits = 1) => {
        const n = Number(val);
        return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '-';
    };
    const fmtInt = (val) => {
        const n = Number(val);
        return Number.isFinite(n) ? Math.round(n).toLocaleString() : '-';
    };
    const fmtSign = (val, digits = 1) => {
        const n = Number(val);
        if (!Number.isFinite(n)) return '-';
        return (n > 0 ? '+' : '') + n.toFixed(digits);
    };

    // ===================== Helpers (delegate to AnalyticsCore when available) =====================
    function getCore() {
        return typeof AnalyticsCore !== 'undefined' ? AnalyticsCore : null;
    }
    
    function meanStd(arr) {
        const core = getCore();
        if (core && core.meanStd) return core.meanStd(arr);
        // Fallback
        if (!arr || !arr.length) return { mean: 0, std: 0 };
        const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
        const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
        return { mean, std: Math.sqrt(variance) };
    }

    function calcHistoryReturn(history, ms) {
        if (!history.length || !ms) return 0;
        const cutoff = Date.now() - ms;
        let older = history[0];
        for (let i = history.length - 1; i >= 0; i--) {
            if ((history[i].ts || 0) <= cutoff) {
                older = history[i];
                break;
            }
        }
        const olderPrice = Number(older && older.price) || 0;
        const latestPrice = Number(history[history.length - 1] && history[history.length - 1].price) || 0;
        if (!olderPrice || !latestPrice) return 0;
        return ((latestPrice - olderPrice) / olderPrice) * 100;
    }

    function computeOBVProxy(history) {
        // OBV Proxy using buy/sell volume difference
        if (history.length < 2) return 0;
        let obv = 0;
        for (let i = 1; i < history.length; i++) {
            const prevPrice = Number(history[i - 1].price) || 0;
            const currPrice = Number(history[i].price) || 0;
            if (!prevPrice || !currPrice) continue;
            const buyVol = Number(history[i].volBuy2h) || 0;
            const sellVol = Number(history[i].volSell2h) || 0;
            const delta = Math.abs(buyVol - sellVol);
            if (currPrice > prevPrice) obv += delta;
            else if (currPrice < prevPrice) obv -= delta;
        }
        return obv;
    }

    function computeVWAP(history) {
        // Volume Weighted Average Price
        if (!history.length) return 0;
        let num = 0;
        let den = 0;
        for (const point of history) {
            const price = Number(point.price) || 0;
            const vol = (Number(point.volBuy2h) || 0) + (Number(point.volSell2h) || 0);
            if (price && vol) {
                num += price * vol;
                den += vol;
            }
        }
        return den > 0 ? num / den : 0;
    }
    
    function computeATR(history, periods = 14) {
        const core = getCore();
        if (core && core.computeATR) return core.computeATR(history, periods);
        if (typeof window.computeATR === 'function') return window.computeATR(history, periods);
        return 0;
    }
    
    // Compute all Smart Metrics using AnalyticsCore
    function computeSmartMetricsForInfo(data) {
        const core = getCore();
        if (core && core.computeAllSmartMetrics) {
            return core.computeAllSmartMetrics(data);
        }
        // Prefer unified helper if present (synthesizes from data._analytics or worker results)
        if (typeof getUnifiedSmartMetrics === 'function') {
            const unified = getUnifiedSmartMetrics(data);
            if (unified) return unified;
        }
        // Fallback to legacy computeSmartMetrics if available
        if (typeof computeSmartMetrics === 'function') {
            return computeSmartMetrics(data);
        }
        // Final fallback empty metrics
        return {
            smi: { value: 0, interpretation: 'N/A', className: 'text-muted' },
            intensity: { value: 0, level: 'N/A', className: 'text-muted' },
            divergence: { interpretation: 'N/A', className: 'text-muted' },
            accumScore: { value: 50, interpretation: 'N/A', className: 'text-muted' },
            whale: { value: 0, level: 'N/A', className: 'text-muted' },
            riRatio: { value: 100, type: 'N/A', className: 'text-muted' },
            pressure: { value: 0, direction: 'N/A', className: 'text-muted' },
            trendStrength: { value: 50, level: 'N/A', direction: 'N/A', className: 'text-muted' },
            breakout: { value: 0, direction: 'N/A', confidence: 'N/A', className: 'text-muted' },
            lsi: { value: 50, level: 'N/A', className: 'text-muted' },
            marketMode: { mode: 'N/A', confidence: 0, className: 'text-muted' },
            smartSignal: { signal: 'HOLD', confidence: 0, className: 'text-muted' }
        };
    }

    // ===================== Render Documentation from JSON =====================
    function renderInfoDocs() {
        const docs = window.INFO_DOCS;
        if (!docs) return '';
        
        // Features section
        const featuresHtml = docs.features.map(f => 
            `<li><span class="me-1">${f.icon}</span><strong>${f.name}:</strong> ${f.desc}</li>`
        ).join('');
        
        // Smart Metrics section
        const smartHtml = docs.smartMetrics.map(m => `
            <div class="col-md-4 col-sm-6 mb-2">
                <div class="p-2 rounded" style="background:rgba(0,0,0,0.3)">
                    <div class="fw-bold text-warning">${m.icon} ${m.name}</div>
                    <div class="small text-muted">${m.fullName}</div>
                    <div class="small">${m.desc}</div>
                    <div class="small text-info">${m.range || m.values || ''}</div>
                </div>
            </div>
        `).join('');
        
        // Microstructure section
        const microHtml = docs.microMetrics.map(m => `
            <div class="col-md-4 col-sm-6 mb-2">
                <div class="p-2 rounded" style="background:rgba(0,0,0,0.3)">
                    <div class="fw-bold text-info">${m.icon} ${m.name}</div>
                    <div class="small text-muted">${m.fullName}</div>
                    <div class="small">${m.desc}</div>
                    <div class="small text-warning">${m.range || ''}</div>
                </div>
            </div>
        `).join('');
        
        // Durability levels
        const durabilityHtml = docs.durabilityLevels.map(d => 
            `<span class="badge ${d.class} me-1">${d.range}</span><small>${d.label} - ${d.desc}</small><br>`
        ).join('');
        
        // Recommendations
        const rec = docs.recommendations;
        const recHtml = ['buy', 'sell', 'hold'].map(type => {
            const r = rec[type];
            return `
                <div class="col-md-4">
                    <h6 class="${r.class}">${r.icon} ${r.label} (${r.confidence})</h6>
                    <ul class="small mb-0">${r.conditions.map(c => `<li>${c}</li>`).join('')}</ul>
                </div>
            `;
        }).join('');
        
        // Tips
        const tipsHtml = docs.tips.map(t => 
            `<li><strong>${t.category}:</strong> ${t.tip}</li>`
        ).join('');

        // Per-tab descriptions (explicit breakdown of each UI tab)
        const tabsHtml = (docs.tabs && docs.tabs.length) ? docs.tabs.map(tab => {
            const contents = (tab.contents || []).map(c => {
                const items = (c.items || []).map(i => `<li>${i}</li>`).join('');
                return `<div class="mb-2"><strong>${c.title}:</strong><ul class="mb-0 small">${items}</ul></div>`;
            }).join('');
            return `
                <div class="col-md-6 mb-2">
                    <div class="p-2 rounded" style="background:rgba(0,0,0,0.25)">
                        <div class="fw-bold text-info">${tab.icon} ${tab.name}</div>
                        <div class="small text-muted mb-2">${tab.desc}</div>
                        ${contents}
                    </div>
                </div>
            `;
        }).join('') : '';
        
        return `
            <div class="card bg-dark text-light mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 class="text-info mb-0">✨ Fitur Dashboard v${docs.version}</h5>
                        <small class="text-muted">Updated: ${docs.lastUpdated}</small>
                    </div>
                    <ul class="small mb-0">${featuresHtml}</ul>
                </div>
            </div>
            
            ${ tabsHtml ? `
            <div class="card bg-dark text-light mb-3">
                <div class="card-body">
                    <h5 class="text-info mb-3">📁 Tab Details</h5>
                    <div class="row g-2">${tabsHtml}</div>
                </div>
            </div>
            ` : '' }
            
            <div class="card bg-dark text-light mb-3">
                <div class="card-body">
                    <h5 class="text-info mb-3">🧠 Smart Analysis Metrics</h5>
                    <div class="row g-2">${smartHtml}</div>
                </div>
            </div>
            
            <div class="card bg-dark text-light mb-3">
                <div class="card-body">
                    <h5 class="text-info mb-3">🔬 Microstructure Metrics</h5>
                    <div class="row g-2">${microHtml}</div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="card bg-dark text-light mb-3">
                        <div class="card-body">
                            <h5 class="text-info mb-2">⚖️ Volume Durability Levels</h5>
                            <div class="small">${durabilityHtml}</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card bg-dark text-light mb-3">
                        <div class="card-body">
                            <h5 class="text-info mb-2">💡 Pro Tips</h5>
                            <ul class="small mb-0">${tipsHtml}</ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card bg-dark text-light mb-3">
                <div class="card-body">
                    <h5 class="text-info mb-3">🎯 Recommendation Algorithm</h5>
                    <div class="row">${recHtml}</div>
                </div>
            </div>
        `;
    }

    // ===================== Main Render Function =====================
    function renderInfoTab() {
        try {
            const container = document.getElementById('info');
            if (!container) return;
            
            // Prefer a dedicated runtime container so we don't overwrite static Info content
            let pane = document.getElementById('infoRuntime');
            if (!pane) {
                pane = document.createElement('div');
                pane.id = 'infoRuntime';
                pane.className = 'mb-3';
                container.insertBefore(pane, container.firstElementChild);
            }

            const coinDataMap = window.coinDataMap || {};
            const PERSIST_KEY = window.PERSIST_KEY || 'okx_calc_persist_history';

            const wsStateMap = { 0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSING', 3: 'CLOSED' };
            const wsObj = window.ws;
            const wsState = (wsObj && wsObj.readyState !== undefined) 
                ? wsStateMap[wsObj.readyState] || wsObj.readyState 
                : 'N/A';
            const coinCount = Object.keys(coinDataMap || {}).length;

            const alerts = typeof loadAlertsFromStore === 'function' ? loadAlertsFromStore() : [];
            const persistStore = (function () { 
                try { return JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}'); } 
                catch (e) { return {}; } 
            })();
            const persistedCoins = Object.keys(persistStore || {}).length;
            const lsKeys = Object.keys(localStorage).filter(k => 
                k.toString().toLowerCase().indexOf('okx_calc') === 0 || k.toString().toLowerCase().includes('okx')
            );

            // Find last update across coins
            let lastTs = 0;
            for (const c of Object.values(coinDataMap)) {
                try {
                    if (c && c._history && c._history.length) {
                        const t = c._history[c._history.length - 1].ts || 0;
                        if (t > lastTs) lastTs = t;
                    }
                } catch (e) { }
            }

            // Prepare last raw JSON and summary info
            const lastRaw = window._lastWsRaw || null;
            const lastCoin = window._lastReceivedCoin || null;
            const lastData = lastRaw || (lastCoin ? (coinDataMap[lastCoin] || null) : null);
            const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(lastData) : (lastData && (lastData.analytics || lastData._analytics)) ? (lastData.analytics || lastData._analytics) : {};
            const analytics = metrics;
            const history = (lastData && Array.isArray(lastData._history)) ? lastData._history.slice(-120) : [];
            const priceNow = Number(lastData && lastData.last) || 0;
            const priceHigh = Number(lastData && lastData.high) || priceNow;
            const priceLow = Number(lastData && lastData.low) || priceNow;
            const priceRange = priceHigh - priceLow;
            const pricePosition = priceRange > 0 ? ((priceNow - priceLow) / priceRange) * 100 : 50;

            const histPrices = history.map(h => Number(h.price) || 0).filter(v => v > 0);
            const priceStats = meanStd(histPrices);
            const priceZScore = (histPrices.length >= 6 && priceStats.std > 0 && priceNow)
                ? (priceNow - priceStats.mean) / priceStats.std
                : 0;

            const obvProxy = computeOBVProxy(history);
            const vwapValue = computeVWAP(history);
            const priceVsVwapPct = (vwapValue > 0 && priceNow > 0) ? ((priceNow - vwapValue) / vwapValue) * 100 : 0;
            const atr14 = (history.length && typeof computeATR === 'function') ? computeATR(history, 14) : 0;

            const safeGetLastNumeric = (...keys) => lastData && typeof getNumeric === 'function' 
                ? (getNumeric(lastData, ...keys) || 0) 
                : 0;

            const freqBuy = (() => {
                const analyticsVal = Number(analytics.freqBuy2h);
                if (Number.isFinite(analyticsVal) && analyticsVal > 0) return analyticsVal;
                return safeGetLastNumeric('count_FREQ_minute_120_buy', 'sum_minute_120_buy', 'freq_buy_2JAM', 'freq_buy_120MENIT');
            })();
            const freqSell = (() => {
                const analyticsVal = Number(analytics.freqSell2h);
                if (Number.isFinite(analyticsVal) && analyticsVal > 0) return analyticsVal;
                return safeGetLastNumeric('count_FREQ_minute_120_sell', 'sum_minute_120_sell', 'freq_sell_2JAM', 'freq_sell_120MENIT');
            })();
            const freqTotal = freqBuy + freqSell;
            const freqRatio = freqTotal > 0 ? (freqBuy / freqTotal) * 100 : 0;
            const freqMomentum = Number((Number(analytics.zScoreFreqBuy2h) || 0) - (Number(analytics.zScoreFreqSell2h) || 0));
            const volMomentum = Number((Number(analytics.zScoreBuy2h) || 0) - (Number(analytics.zScoreSell2h) || 0));
            const change5m = calcHistoryReturn(history, 5 * 60 * 1000);
            const change15m = calcHistoryReturn(history, 15 * 60 * 1000);
            const sharpInsights = (analytics.sharpInsights && analytics.sharpInsights.length) 
                ? analytics.sharpInsights.join(' • ') 
                : 'No sharp anomalies detected';
            const persistenceVol = analytics.persistenceBuy3 !== undefined ? analytics.persistenceBuy3 : '-';
            const persistenceFreq = analytics.persistenceFreqBuy3 !== undefined ? analytics.persistenceFreqBuy3 : '-';

            let recSnapshot = null;
            try {
                const recTimeframeSelect = document.getElementById('recTimeframe');
                const tf = (recTimeframeSelect && recTimeframeSelect.value) ? recTimeframeSelect.value : '120m';
                recSnapshot = typeof calculateRecommendation === 'function' && lastData 
                    ? calculateRecommendation(lastData, Math.round(pricePosition), tf, false) 
                    : null;
            } catch (e) { recSnapshot = null; }

            // Build per-timeframe recommendation snapshot (include TP/SL computed from UI settings)
            let perTfHtml = '';
            try {
                if (lastData && typeof calculateRecommendation === 'function') {
                    const perTfs = ['1m','5m','10m','30m','60m','120m','24h'];
                    const tpMinEl = document.getElementById('tpMin');
                    const tpMaxEl = document.getElementById('tpMax');
                    const slMaxEl = document.getElementById('slMax');
                    const sensEl = document.getElementById('confSensitivity');
                    const useAtrEl = document.getElementById('useAtrRecs');
                    const tpMin = tpMinEl ? Math.max(0, Number(tpMinEl.value) || 2) / 100 : 0.02;
                    const tpMax = tpMaxEl ? Math.max(tpMin, Number(tpMaxEl.value) || 10) / 100 : 0.10;
                    const slMax = slMaxEl ? Math.max(0, Number(slMaxEl.value) || 5) / 100 : 0.05;
                    const sens = sensEl ? Number(sensEl.value) || 1 : 1;
                    const useAtr = useAtrEl ? !!useAtrEl.checked : false;

                    for (const tf of perTfs) {
                        try {
                            const rec = calculateRecommendation(lastData, Math.round(pricePosition), tf, false) || { recommendation: 'HOLD', confidence: 0 };
                            const conf = (rec.confidence || 0) / 100;
                            let rangeFactor = Math.min(tpMax, tpMin + conf * (tpMax - tpMin) * sens);
                            if (useAtr && lastData._history && typeof computeATR === 'function') {
                                const atr = computeATR(lastData._history, 14);
                                if (atr > 0 && priceNow > 0) {
                                    const atrPct = (atr / priceNow) * sens;
                                    rangeFactor = Math.min(tpMax, Math.max(tpMin, atrPct));
                                }
                            }
                            let tp = '-';
                            let sl = '-';
                                if (priceNow > 0 && rec.recommendation === 'BUY') {
                                tp = (priceNow * (1 + rangeFactor)).toFixed(4);
                                sl = (priceNow * (1 - Math.min(slMax, Math.max(0.005, rangeFactor / 2)))).toFixed(4);
                            } else if (priceNow > 0 && rec.recommendation === 'SELL') {
                                tp = (priceNow * (1 - rangeFactor)).toFixed(4);
                                sl = (priceNow * (1 + Math.min(slMax, Math.max(0.005, rangeFactor / 2)))).toFixed(4);
                            }
                            const cls = rec.recommendation === 'BUY' ? 'recommendation-buy' : (rec.recommendation === 'SELL' ? 'recommendation-sell' : 'recommendation-hold');
                            perTfHtml += `<tr><td>${tf}</td><td class="${cls}">${rec.recommendation}</td><td>${rec.confidence || 0}%</td><td>${tp}</td><td>${sl}</td></tr>`;
                        } catch (e) { perTfHtml += `<tr><td>${tf}</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`; }
                    }
                }
            } catch (e) { perTfHtml = ''; }

            // Compute Smart Metrics using AnalyticsCore
            const smartMetrics = lastData ? computeSmartMetricsForInfo(lastData) : null;

            const analyticsSnapshot = {
                pricePosition: fmtPct(pricePosition, 1),
                priceZ: fmtNum(priceZScore, 2),
                vwap: fmtNum(vwapValue, 4),
                priceVsVwap: fmtPct(priceVsVwapPct, 2),
                obv: fmtInt(obvProxy),
                atr: fmtNum(atr14, 6),
                freqRatio: fmtPct(freqRatio, 1),
                freqVsAvg: fmtPct(analytics.freqBuy_vs_avg_percent, 1),
                volVsAvg: fmtPct(analytics.volBuy_vs_avg_percent, 1),
                freqMomentum: fmtNum(freqMomentum, 2),
                volMomentum: fmtNum(volMomentum, 2),
                change5m: fmtPct(change5m, 2),
                change15m: fmtPct(change15m, 2)
            };

            // Price Move breakdown: show any price_move_* fields present in the payload
            const priceMoveKeys = lastData ? Object.keys(lastData).filter(k => k && k.toString().toLowerCase().indexOf('price_move_') === 0) : [];
            let priceMoveHtml = '';
            if (priceMoveKeys.length) {
                priceMoveKeys.sort().forEach(k => {
                    const tf = k.replace(/^price_move_/i, '').replace(/_/g, ' ');
                    const v = lastData[k];
                    priceMoveHtml += `<div class="small text-muted">${tf}: <strong>${(v !== undefined && v !== null) ? fmtNum(v, 3) : '-'}</strong></div>`;
                });
            }

            let rawStr = '-';
            try { rawStr = lastRaw ? JSON.stringify(lastRaw, null, 2) : '-'; } catch (e) { rawStr = '-'; }
            const lastUpdateHuman = (lastData && (lastData.update_time || lastData.update_time_VOLCOIN)) 
                ? (new Date(Number(lastData.update_time) || Number(lastData.update_time_VOLCOIN) || Date.now()).toLocaleString()) 
                : '-';

            const persistHistoryEnabled = window.persistHistoryEnabled !== undefined ? window.persistHistoryEnabled : false;

            // Worker Pool Stats
            const wpStats = window.workerPool ? window.workerPool.getStats() : null;
            const wpStatus = wpStats 
                ? `${wpStats.workers} workers (${wpStats.busy} busy, ${wpStats.queued} queued)` 
                : 'Not initialized';
            const wpTasks = wpStats ? wpStats.tasksCompleted : 0;
            const wpAvgTime = wpStats ? wpStats.avgProcessTime.toFixed(1) : 0;

            // WebSocket Heartbeat Status
            const wsHeartbeatStatus = (function() {
                if (typeof window.getWsHeartbeatStatus === 'function') {
                    const hb = window.getWsHeartbeatStatus();
                    if (hb.status === 'healthy') return '💚 Healthy';
                    if (hb.status === 'delayed') return '💛 Delayed (' + Math.round(hb.elapsed/1000) + 's)';
                    return '❤️ Stale (' + Math.round(hb.elapsed/1000) + 's)';
                }
                return '⚪ N/A';
            })();
            
            // Message rate
            const msgRate = typeof window.getWsMessageRate === 'function' 
                ? fmtNum(window.getWsMessageRate(), 1) + '/s'
                : '-';

            // Build Smart Metrics HTML section
            const smartHtml = smartMetrics ? `
                <div class="col-12 mt-3">
                    <h6 class="mb-2 text-info">🧠 Smart Metrics (Last Coin)</h6>
                    <div class="row g-2 small">
                        <div class="col-md-4">
                            <div class="p-2 rounded" style="background:rgba(0,0,0,0.4)">
                                <div><strong>SMI:</strong> <span class="${smartMetrics.smi.className || ''}">${fmtNum(smartMetrics.smi.value, 0)}</span> <small class="text-muted">${smartMetrics.smi.interpretation}</small></div>
                                <div><strong>Intensity:</strong> <span class="${smartMetrics.intensity.className || ''}">${fmtPct(smartMetrics.intensity.value, 0)}</span> <small class="text-muted">${smartMetrics.intensity.level}</small></div>
                                <div><strong>Divergence:</strong> <span class="${smartMetrics.divergence.className || ''}" title="Divergence = flowBias - priceDir*0.5 (flowBias from volDurability2h_percent; priceDir from percent_change)">${smartMetrics.divergence.interpretation}${(smartMetrics.divergence && smartMetrics.divergence.value !== undefined) ? ` (${fmtNum(smartMetrics.divergence.value, 3)})` : ''}</span></div>
                                <div><strong>Accum Score:</strong> <span class="${smartMetrics.accumScore.className || ''}">${fmtNum(smartMetrics.accumScore.value, 0)}</span> <small class="text-muted">${smartMetrics.accumScore.interpretation}</small></div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-2 rounded" style="background:rgba(0,0,0,0.4)">
                                <div><strong>Whale:</strong> <span class="${smartMetrics.whale.className || ''}">${fmtNum(smartMetrics.whale.value, 0)}</span> <small class="text-muted">${smartMetrics.whale.level}</small></div>
                                <div><strong>R/I Ratio:</strong> <span class="${(smartMetrics.riRatio && smartMetrics.riRatio.className) ? smartMetrics.riRatio.className : ''}">${(smartMetrics.riRatio && typeof smartMetrics.riRatio === 'object') ? Math.round(smartMetrics.riRatio.value) : Math.round(smartMetrics.riRatio || 0)}</span></div>
                                <div><strong>Pressure:</strong> <span class="${smartMetrics.pressure.className || ''}">${fmtSign(smartMetrics.pressure.value, 0)}</span> <small class="text-muted">${smartMetrics.pressure.direction}</small></div>
                                <div><strong>Trend:</strong> <span class="${smartMetrics.trendStrength.className || ''}">${fmtPct(smartMetrics.trendStrength.value, 0)}</span> <small class="text-muted">${smartMetrics.trendStrength.level} ${smartMetrics.trendStrength.direction}</small></div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-2 rounded" style="background:rgba(0,0,0,0.4)">
                                <div><strong>Breakout%:</strong> <span class="${smartMetrics.breakout.className || ''}">${fmtPct(smartMetrics.breakout.value, 0)}</span> <small class="text-muted">${smartMetrics.breakout.direction}</small></div>
                                <div><strong>LSI:</strong> <span class="${smartMetrics.lsi.className || ''}">${fmtNum(smartMetrics.lsi.value, 1)}</span> <small class="text-muted">${smartMetrics.lsi.level}</small></div>
                                <div><strong>Mode:</strong> <span class="${smartMetrics.marketMode.className || ''}">${smartMetrics.marketMode.mode}</span> <small class="text-muted">(${fmtNum(smartMetrics.marketMode.confidence, 0)}%)</small></div>
                                <div><strong>Signal:</strong> <span class="${(smartMetrics.smartSignal && smartMetrics.smartSignal.className) ? smartMetrics.smartSignal.className : ''}">${(smartMetrics.smartSignal && smartMetrics.smartSignal.signal) ? smartMetrics.smartSignal.signal : 'HOLD'}</span> <small class="text-muted">(${(smartMetrics.smartSignal && smartMetrics.smartSignal.confidence) || 0}%)</small></div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : '';

            const html = `
                <div class="card bg-dark text-light mb-2 p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Runtime:</strong>
                            <span class="ms-2">WS: <span class="fw-bold">${wsState}</span></span>
                            <span class="ms-2">${wsHeartbeatStatus}</span>
                            <span class="ms-2">Msgs: <span class="fw-bold">${msgRate}</span></span>
                            <span class="ms-2">Coins: <span class="fw-bold">${coinCount}</span></span>
                            <span class="ms-2">Workers: <span class="fw-bold">${wpStats ? wpStats.workers : 'N/A'}</span></span>
                        </div>
                        <div class="text-end small text-muted">
                            <div>Last update: <strong>${lastTs ? new Date(lastTs).toLocaleString() : '-'}</strong></div>
                        </div>
                    </div>
                    <hr class="my-2"/>
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="mb-1">📄 Last Raw JSON</h6>
                            <pre id="lastRawJson" style="max-height:200px;overflow:auto;background:rgba(0,0,0,0.6);padding:10px;border-radius:6px;color:#cbd5e1;font-size:11px;">${rawStr}</pre>
                        </div>
                        <div class="col-md-6">
                            <h6 class="mb-1">Last Summary</h6>
                            <div class="small text-muted">Coin: <strong>${lastData && lastData.coin ? lastData.coin : '-'}</strong></div>
                            <div class="small text-muted">Last Price: <strong>${lastData && (lastData.last !== undefined) ? lastData.last : '-'}</strong></div>
                            <div class="small text-muted">Change %: <strong>${lastData && (lastData.percent_change !== undefined) ? lastData.percent_change : '-'}</strong></div>
                            ${priceMoveHtml ? `<div class="small text-muted mt-1"><strong>Price Moves:</strong>${priceMoveHtml}</div>` : ''}
                            <div class="small text-muted">Total Vol: <strong>${lastData && (lastData.total_vol !== undefined) ? lastData.total_vol : '-'}</strong></div>
                            <div class="small text-muted">Update Time: <strong>${lastUpdateHuman}</strong></div>
                            <hr class="my-2"/>
                            <h6 class="mb-1">Analytics Snapshot</h6>
                            <div class="small text-muted row g-2">
                                <div class="col-sm-6">
                                    <div>Price Position: <strong>${analyticsSnapshot.pricePosition}</strong></div>
                                    <div>Price Z-Score: <strong>${analyticsSnapshot.priceZ}</strong></div>
                                    <div>VWAP (hist): <strong>${analyticsSnapshot.vwap}</strong></div>
                                    <div>Price vs VWAP: <strong>${analyticsSnapshot.priceVsVwap}</strong></div>
                                    <div>ATR(14): <strong>${analyticsSnapshot.atr}</strong></div>
                                    <div>OBV Proxy: <strong>${analyticsSnapshot.obv}</strong></div>
                                    <div>Delta Price 5m: <strong>${analyticsSnapshot.change5m}</strong></div>
                                    <div>Delta Price 15m: <strong>${analyticsSnapshot.change15m}</strong></div>
                                </div>
                                <div class="col-sm-6">
                                    <div>Vol Buy (2h): <strong>${fmtInt(analytics.volBuy2h)}</strong></div>
                                    <div>Vol Sell (2h): <strong>${fmtInt(analytics.volSell2h)}</strong></div>
                                    <div>Vol Ratio (2h): <strong>${fmtPct(analytics.volRatioBuySell_percent, 1)}</strong></div>
                                    <div>Vol vs Avg (Buy): <strong>${analyticsSnapshot.volVsAvg}</strong></div>
                                    <div>Freq Ratio (2h): <strong>${analyticsSnapshot.freqRatio}</strong></div>
                                    <div>Freq vs Avg (Buy): <strong>${analyticsSnapshot.freqVsAvg}</strong></div>
                                    <div>Vol Momentum (z): <strong>${analyticsSnapshot.volMomentum}</strong></div>
                                    <div>Freq Momentum (z): <strong>${analyticsSnapshot.freqMomentum}</strong></div>
                                </div>
                            </div>
                            <div class="small text-muted mt-2">
                                <div>Persistence (Vol): <strong>${persistenceVol}</strong></div>
                                <div>Persistence (Freq): <strong>${persistenceFreq}</strong></div>
                                <div>Risk Score: <strong>${analytics && analytics.riskScore !== undefined ? analytics.riskScore + '%' : '-'}</strong></div>
                                <div>Sharp Insights: <strong>${sharpInsights}</strong></div>
                                <div class="mt-2"><strong>Recommendation snapshot (per timeframe):</strong></div>
                                <div class="table-responsive small mt-1" style="max-height:180px;overflow:auto;">
                                    <table class="table table-sm table-dark table-striped mb-0">
                                        <thead><tr><th>TF</th><th>Rec</th><th>Conf</th><th>TP</th><th>SL</th></tr></thead>
                                        <tbody>
                                            ${perTfHtml || '<tr><td colspan="5">No data</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        ${smartHtml}
                    </div>
                    <hr/>
                    <div class="d-flex flex-wrap gap-2 mt-2">
                        <button id="exportPersistBtn" class="btn btn-sm btn-outline-primary">📥 Export History</button>
                        <button id="clearPersistBtn" class="btn btn-sm btn-outline-danger">🗑️ Clear History</button>
                        <button id="exportLSBtn" class="btn btn-sm btn-outline-secondary">📦 Export LocalStorage</button>
                        <button id="clearLSBtn" class="btn btn-sm btn-outline-dark">🧹 Clear LocalStorage</button>
                        <button id="openRunJsonBtn" class="btn btn-sm btn-outline-success">▶️ Run JSON (Paste)</button>
                        <button id="refreshInfoBtn" class="btn btn-sm btn-outline-info">🔄 Refresh</button>
                    </div>
                    <div class="mt-2 small text-muted">LocalStorage keys: <strong>${lsKeys.length}</strong> (showing keys starting with 'okx_calc' or containing 'okx')</div>
                </div>`;

            pane.innerHTML = html;

            // Render documentation from JSON (only once, or update if needed)
            let docsPane = document.getElementById('infoDocsContainer');
            if (!docsPane) {
                docsPane = document.createElement('div');
                docsPane.id = 'infoDocsContainer';
                docsPane.className = 'mt-3';
                const container = document.getElementById('info');
                if (container) {
                    // Insert after infoRuntime, before any existing static content
                    const existingStatic = container.querySelector('.card:not(#infoRuntime .card)');
                    if (existingStatic) {
                        container.insertBefore(docsPane, existingStatic);
                    } else {
                        container.appendChild(docsPane);
                    }
                }
            }
            // Render docs from JSON
            const docsHtml = renderInfoDocs();
            if (docsHtml && docsPane.innerHTML !== docsHtml) {
                docsPane.innerHTML = docsHtml;
            }

            // Wire buttons
            wireInfoTabButtons(persistStore, lsKeys);

        } catch (e) { console.warn('renderInfoTab error', e); }
    }

    function wireInfoTabButtons(persistStore, lsKeys) {
        const PERSIST_KEY = window.PERSIST_KEY || 'okx_calc_persist_history';
        
        const expBtn = document.getElementById('exportPersistBtn');
        const clrBtn = document.getElementById('clearPersistBtn');
        const expLS = document.getElementById('exportLSBtn');
        const clrLS = document.getElementById('clearLSBtn');
        const refreshBtn = document.getElementById('refreshInfoBtn');

        // Refresh button - re-render the info tab
        if (refreshBtn) refreshBtn.onclick = function () {
            try {
                renderInfoTab();
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Refreshed', 'Info tab updated', 'success', 1500);
                }
            } catch (e) {
                console.warn('refreshInfo failed', e);
            }
        };

        if (expBtn) expBtn.onclick = function () {
            try {
                const blob = new Blob([JSON.stringify(persistStore || {}, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); 
                a.href = url; 
                a.download = `persisted-history-${Date.now()}.json`; 
                document.body.appendChild(a); 
                a.click(); 
                a.remove(); 
                URL.revokeObjectURL(url);
            } catch (e) { 
                console.warn('exportPersist failed', e); 
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Export failed', 'Could not export persisted history', 'danger', 4000); 
                }
            }
        };

        if (clrBtn) clrBtn.onclick = function () {
            try {
                if (!confirm('Clear all persisted history? This will remove per-coin stored histories.')) return;
                localStorage.setItem(PERSIST_KEY, JSON.stringify({}));
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Persist cleared', 'Persisted history removed', 'info', 3000);
                }
            } catch (e) { 
                console.warn('clearPersist failed', e); 
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Clear failed', 'Could not clear persisted history', 'danger', 4000); 
                }
            }
        };

        if (expLS) expLS.onclick = function () {
            try {
                const dump = {};
                for (const k of lsKeys) dump[k] = localStorage.getItem(k);
                const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); 
                a.href = url; 
                a.download = `okx-calc-localstorage-${Date.now()}.json`; 
                document.body.appendChild(a); 
                a.click(); 
                a.remove(); 
                URL.revokeObjectURL(url);
            } catch (e) { 
                console.warn('exportLS failed', e); 
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Export failed', 'Could not export localStorage', 'danger', 4000); 
                }
            }
        };

        if (clrLS) clrLS.onclick = function () {
            try {
                if (!confirm('Clear all okx_calc related LocalStorage keys?')) return;
                for (const k of lsKeys) localStorage.removeItem(k);
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('LocalStorage cleared', 'Removed okx_calc keys', 'info', 3000);
                }
                if (typeof renderAlertsList === 'function') {
                    renderAlertsList();
                }
            } catch (e) { 
                console.warn('clearLS failed', e); 
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Clear failed', 'Could not clear localStorage', 'danger', 4000); 
                }
            }
        };

        // Wire Run JSON (Paste) button to open test modal
        try {
            const runBtn = document.getElementById('openRunJsonBtn');
            if (runBtn) {
                runBtn.addEventListener('click', () => {
                    try {
                        if (typeof ensureTestJsonModal === 'function') {
                            ensureTestJsonModal();
                        }
                        const modalEl = document.getElementById('testJsonModal');
                        if (!modalEl) return;
                        const bs = new bootstrap.Modal(modalEl);
                        
                        setTimeout(() => {
                            const run = document.getElementById('testJsonRunBtn');
                            const ta = document.getElementById('testJsonTextarea');
                            const err = document.getElementById('testJsonError');
                            if (run && ta) {
                                run.onclick = () => {
                                    try {
                                        const txt = ta.value || '';
                                        if (!txt) { 
                                            if (err) { err.style.display = 'block'; err.textContent = 'Please paste JSON payload.'; } 
                                            return; 
                                        }
                                        let obj = null;
                                        try { 
                                            obj = JSON.parse(txt); 
                                        } catch (parseErr) { 
                                            if (err) { err.style.display = 'block'; err.textContent = 'Invalid JSON: ' + parseErr.message; } 
                                            return; 
                                        }
                                        if (err) { err.style.display = 'none'; err.textContent = ''; }
                                        if (typeof onWsMessage === 'function') {
                                            onWsMessage({ data: JSON.stringify(obj) });
                                            bs.hide();
                                        } else {
                                            if (err) { err.style.display = 'block'; err.textContent = 'Handler not available.'; }
                                        }
                                    } catch (e) { console.warn('testJson run failed', e); }
                                };
                            }
                        }, 10);
                        bs.show();
                    } catch (e) { console.warn('openRunJson failed', e); }
                });
            }
        } catch (e) { console.warn('wiring openRunJsonBtn failed', e); }
    }

    // ===================== Exports =====================
    window.renderInfoTab = renderInfoTab;
})();
