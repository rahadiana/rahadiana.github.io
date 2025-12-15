/**
 * tab-renderers.js
 * Rendering functions for specialized dashboard tabs
 * Dependencies: coinDataMap, calculateRecommendation, AnalyticsCore, showAlertBanner, etc.
 */

(function () {
    'use strict';

    // ===================== Formatters (local) =====================
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
    // Local delegating wrapper to centralized vol-ratio formatter
    function formatVolRatioLocal(val) {
        try {
            if (typeof window.formatVolRatio === 'function') return window.formatVolRatio(val);
            if (window.METRICS && typeof window.METRICS.formatVolRatio === 'function') return window.METRICS.formatVolRatio(val);
        } catch (e) { /* fallthrough to fallback */ }
        return fmtPct(val, 1);
    }
    
    // ===================== Helpers (delegate to AnalyticsCore) =====================
    function computeATR(history, periods = 14) {
        if (typeof AnalyticsCore !== 'undefined' && AnalyticsCore.computeATR) {
            return AnalyticsCore.computeATR(history, periods);
        }
        if (typeof window.computeATR === 'function') {
            return window.computeATR(history, periods);
        }
        return 0;
    }
    
    function getSmartMetrics(data) {
        if (typeof AnalyticsCore !== 'undefined' && AnalyticsCore.computeAllSmartMetrics) {
            return AnalyticsCore.computeAllSmartMetrics(data);
        }
        if (typeof computeSmartMetrics === 'function') {
            return computeSmartMetrics(data);
        }
        return null;
    }

    // ===================== Tab Render Throttling =====================
    const TAB_RENDER_INTERVALS = {
        signalLab: 1500,
        backtest: 6000,
        risk: 3000,
        events: 2500
    };
    const lastTabRenderAt = {};

    function maybeRenderHeavyTab(tabId, renderer, options = {}) {
        try {
            const pane = document.getElementById(tabId);
            if (!pane || typeof renderer !== 'function') return;
            const requireActive = options.requireActive !== false;
            const isActive = pane.classList.contains('active') || pane.classList.contains('show');
            if (requireActive && !isActive) return;
            const interval = options.interval || TAB_RENDER_INTERVALS[tabId] || 1500;
            const now = Date.now();
            const last = lastTabRenderAt[tabId] || 0;
            if (now - last < interval) return;
            lastTabRenderAt[tabId] = now;
            renderer();
        } catch (e) { console.warn('maybeRenderHeavyTab error', e); }
    }

    // ===================== Signal Lab Tab =====================
    function renderSignalLab() {
        try {
            const coinDataMap = window.coinDataMap || {};
            const pane = document.getElementById('signalLabPane');
            const coinSelect = document.getElementById('signalLabCoinSelect');
            const tfSelect = document.getElementById('signalLabTfSelect');
            const statusEl = document.getElementById('signalLabStatus');
            if (!pane || !coinSelect || !tfSelect) return;
            const coins = Object.keys(coinDataMap);
            if (!coins.length) {
                coinSelect.innerHTML = '';
                pane.innerHTML = '<p class="mb-0 text-muted">Waiting for data…</p>';
                if (statusEl) statusEl.textContent = '-';
                return;
            }
            if (!coinSelect.dataset.bound) {
                coinSelect.addEventListener('change', () => {
                    window._signalLabCoin = coinSelect.value;
                    renderSignalLab();
                });
                coinSelect.dataset.bound = '1';
            }
            if (!tfSelect.dataset.bound) {
                tfSelect.addEventListener('change', () => renderSignalLab());
                tfSelect.dataset.bound = '1';
            }
            const prevCoin = window._signalLabCoin || coinSelect.value || coins[0];
            const currentCoin = coins.includes(prevCoin) ? prevCoin : coins[0];
            coinSelect.innerHTML = coins.map(c => `<option value="${c}" ${c === currentCoin ? 'selected' : ''}>${c}</option>`).join('');
            window._signalLabCoin = currentCoin;
            const data = coinDataMap[currentCoin];
            if (!data) {
                pane.innerHTML = '<p class="mb-0 text-muted">No data for selected coin.</p>';
                if (statusEl) statusEl.textContent = '-';
                return;
            }
            const timeframe = tfSelect.value || '120m';
            const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
            const analytics = metrics;
            // Prepare safe displays for RVOL to avoid showing 'NaNx' when analytics.rvol is an object without .value
            let rvolDisplay = '-';
            try {
                if (analytics && analytics.rvol) {
                    if (analytics.rvol.value !== undefined) {
                        const v = Number(analytics.rvol.value);
                        if (Number.isFinite(v)) rvolDisplay = `${v.toFixed(2)}x${analytics.rvol.provisional ? '*' : ''}`;
                    } else if (typeof analytics.rvol === 'number' && Number.isFinite(analytics.rvol)) {
                        rvolDisplay = `${analytics.rvol.toFixed(2)}x`;
                    }
                }
            } catch (e) { rvolDisplay = '-'; }
            // If certain advanced metrics are missing, try to compute them on-demand from AnalyticsCore using available history
            try {
                const core = (typeof globalThis !== 'undefined' && globalThis.AnalyticsCore) ? globalThis.AnalyticsCore : (typeof AnalyticsCore !== 'undefined' ? AnalyticsCore : null);
                const history = Array.isArray(data._history) ? data._history.slice().sort((a,b)=> (a.ts||0)-(b.ts||0)) : (Array.isArray(data.history) ? data.history.slice().sort((a,b)=>(a.ts||0)-(b.ts||0)) : []);
                if (core) {
                    if ((!analytics || !analytics.kyleLambda || analytics.kyleLambda.valid === false) && typeof core.computeKyleLambda === 'function') {
                        try { analytics.kyleLambda = core.computeKyleLambda(history, { lookbackPeriods: 20, minSamples: 10, smoothingWindow: 5 }); } catch(e){}
                    }
                    if ((!analytics || !analytics.vwapBands || analytics.vwapBands.valid === false) && typeof core.computeVWAPBands === 'function') {
                        try { analytics.vwapBands = core.computeVWAPBands(history, { lookbackPeriods: 120, stdMultiplier: 2.0, adaptiveMultiplier: true }); } catch(e){}
                    }
                    if ((!analytics || !analytics.cvd || analytics.cvd.valid === false) && typeof core.computeCVD === 'function') {
                        try { analytics.cvd = core.computeCVD(history, { window: 'all', normalizationMethod: 'total', smoothingPeriod: 3 }); } catch(e){}
                    }
                    if ((!analytics || !analytics.rvol || analytics.rvol.valid === false) && typeof core.computeRVOL === 'function') {
                        try {
                            analytics.rvol = core.computeRVOL(history, { baselinePeriods: 14, minSamplesRequired: 10 });
                        } catch(e){}
                        // If still invalid but we have a small amount of history, compute a provisional RVOL with lower sample requirement
                        try {
                            if (analytics && analytics.rvol && analytics.rvol.valid === false && Array.isArray(history) && history.length >= 3) {
                                const prov = core.computeRVOL(history, { baselinePeriods: 14, minSamplesRequired: 3 });
                                if (prov && prov.value !== undefined && Number.isFinite(Number(prov.value))) {
                                    prov.provisional = true;
                                    analytics.rvol = prov;
                                }
                            }
                        } catch(e){}
                    }
                    if ((!analytics || !analytics.vpin) && typeof core.computeVPIN === 'function') {
                        try { analytics.vpin = core.computeVPIN(history, { lookbackBars: 50, minSamples: 10 }); } catch(e){}
                    }
                    if ((!analytics || !analytics.hurst) && typeof core.computeHurstExponent === 'function') {
                        try { analytics.hurst = core.computeHurstExponent(history, { minSamples: 50 }); } catch(e){}
                    }
                    if ((!analytics || !analytics.volumeProfile) && typeof core.computeVolumeProfilePOC === 'function') {
                        try { analytics.volumeProfile = core.computeVolumeProfilePOC(history, { bins: 24 }); } catch(e){}
                    }
                    if ((!analytics || !analytics.depthImbalance) && typeof core.computeDepthImbalance === 'function') {
                        try { analytics.depthImbalance = core.computeDepthImbalance((Array.isArray(data._history) ? data._history.slice(-1)[0] : data) || data); } catch(e){}
                    }
                }
            } catch (e) { /* best-effort only */ }
            const price = Number(data.last) || 0;
            const high = Number(data.high) || price;
            const low = Number(data.low) || price;
            const range = high - low;
            const pricePos = range > 0 ? Math.round(((price - low) / range) * 100) : 50;
            const rec = (typeof calculateRecommendation === 'function') ? calculateRecommendation(data, pricePos, timeframe, false) : null;
            const factors = (rec && rec.factors) ? rec.factors : {};
            const _vrVal = (metrics && metrics.volRatioBuySell_percent !== undefined && metrics.volRatioBuySell_percent !== null) ? metrics.volRatioBuySell_percent : (analytics.volRatioBuySell_percent !== undefined ? analytics.volRatioBuySell_percent : null);
            const volRatio = (_vrVal !== null && _vrVal !== undefined)
                ? formatVolRatioLocal(_vrVal)
                : '-';
            const durability = (metrics && metrics.volDurability2h_percent !== undefined && metrics.volDurability2h_percent !== null) ? fmtPct(metrics.volDurability2h_percent, 1) : (analytics.volDurability2h_percent !== undefined ? fmtPct(analytics.volDurability2h_percent, 1) : '-');
            const freqRatio = (() => {
                const b = Number(analytics.freqBuy2h) || 0;
                const s = Number(analytics.freqSell2h) || 0;
                const tot = b + s;
                return tot > 0 ? fmtPct((b / tot) * 100, 1) : '-';
            })();
            const insights = (analytics.sharpInsights && analytics.sharpInsights.length)
                ? analytics.sharpInsights.join(' • ')
                : 'No sharp anomalies';
            const factorDefs = [
                { key: 'priceBias', label: 'Price Bias', desc: 'Location within recent range' },
                { key: 'volDurNorm', label: 'Vol Durability (2h)', desc: 'Buy % dominance in 2h' },
                { key: 'vol24Norm', label: 'Vol Durability (24h)', desc: 'Daily buy % tilt' },
                { key: 'zImbalance', label: 'Volume Z-Imbalance', desc: 'z-score buy minus sell' },
                { key: 'freqImbalance', label: 'Frequency Imbalance', desc: 'Trade count skew' },
                { key: 'persistenceNorm', label: 'Persistence', desc: 'Streak of buy pressure' },
                { key: 'divergenceNorm', label: 'Divergence', desc: 'Flow vs price tension' },
                { key: 'riskPenalty', label: 'Risk Penalty', desc: 'Liquidity/volatility drag', invert: true }
            ];
            const factorHtml = factorDefs.map(def => {
                const raw = Number(factors[def.key]);
                const val = Number.isFinite(raw) ? raw : 0;
                const pct = Math.max(0, Math.min(100, Math.round((val + 1) * 50)));
                const good = def.invert ? val <= 0 : val >= 0;
                const barClass = good ? 'bg-success' : 'bg-danger';
                return `
                    <div class="mb-2">
                        <div class="d-flex justify-content-between">
                            <span>${def.label}</span>
                            <span>${fmtNum(val, 2)}</span>
                        </div>
                        <div class="progress" style="height:6px;">
                            <div class="progress-bar ${barClass}" role="progressbar" style="width:${pct}%"></div>
                        </div>
                        <div class="text-muted">${def.desc}</div>
                    </div>`;
            }).join('');
            if (statusEl) {
                const text = rec ? `${rec.recommendation} (${rec.confidence || 0}%)` : 'HOLD';
                statusEl.textContent = text;
                statusEl.className = `fw-bold ${rec && rec.className ? rec.className : 'text-info'}`;
            }
            pane.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="mb-0">${currentCoin}</h5>
                        <small class="text-muted">${timeframe} · Price ${price ? price.toFixed(4) : '-'}</small>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold ${rec && rec.className ? rec.className : 'text-info'}">${rec ? rec.recommendation : 'HOLD'} (${rec ? rec.confidence : 0}%)</div>
                        <small class="text-muted">Score ${rec && Number.isFinite(rec.score) ? rec.score.toFixed(2) : '0.00'}</small>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-lg-7">
                        ${factorHtml || '<p class="text-muted">No factor data yet.</p>'}
                    </div>
                    <div class="col-lg-5">
                        <h6 class="small text-muted">Flow Snapshot</h6>
                        <ul class="list-unstyled small mb-2">
                            <li>Price Position: <strong>${fmtPct(pricePos, 1)}</strong></li>
                            <li>Vol Ratio (2h): <strong>${volRatio}</strong></li>
                            <li>Vol Durability (2h): <strong>${durability}</strong></li>
                            <li>Freq Ratio (2h): <strong>${freqRatio}</strong></li>
                            <li>λ (Kyle): <strong>${(analytics && (analytics.kyleLambda && analytics.kyleLambda.value !== undefined)) ? fmtNum(analytics.kyleLambda.value,4) : (analytics && analytics.kyleLambda !== undefined ? fmtNum(analytics.kyleLambda,4) : '-')}</strong>${(analytics && analytics.tier1 && analytics.tier1.kyle) ? ` <small class="text-muted">(${analytics.tier1.kyle}%)</small>` : ''}</li>
                            <li>VWAP: <strong>${(analytics && analytics.vwapBands && analytics.vwapBands.position) ? analytics.vwapBands.position : (analytics && analytics.vwapPosition !== undefined ? analytics.vwapPosition : '-')}</strong>${(analytics && analytics.tier1 && analytics.tier1.vwap) ? ` <small class="text-muted">(${analytics.tier1.vwap}%)</small>` : ''}</li>
                            <li>CVD: <strong>${(analytics && analytics.cvd && analytics.cvd.trend) ? analytics.cvd.trend : ((analytics && analytics.cvd && analytics.cvd.value !== undefined) ? fmtNum(analytics.cvd.value,0) : '-')}</strong>${(analytics && analytics.tier1 && analytics.tier1.cvd) ? ` <small class="text-muted">(${analytics.tier1.cvd}%)</small>` : ''}</li>
                            <li>RVOL: <strong>${rvolDisplay}</strong>${(analytics && analytics.tier1 && Number.isFinite(Number(analytics.tier1.rvol))) ? ` <small class="text-muted">(${analytics.tier1.rvol}%)</small>` : ''}</li>
                            <li>VPIN: <strong>${(analytics && analytics.vpin && analytics.vpin.percent) ? analytics.vpin.percent.toFixed(1) + '%' : ((analytics && analytics.vpin && analytics.vpin.value) ? Math.round(analytics.vpin.value*100) + '%' : '-')}</strong>${(analytics && analytics.vpin && Number.isFinite(analytics.vpin.normalized)) ? ` <small class="text-muted">(${analytics.vpin.normalized}%)</small>` : ''}</li>
                            <li>Hurst: <strong>${(analytics && analytics.hurst && analytics.hurst.value !== undefined) ? Number(analytics.hurst.value).toFixed(3) : '-'}</strong>${(analytics && analytics.hurst && Number.isFinite(analytics.hurst.normalized)) ? ` <small class="text-muted">(${analytics.hurst.normalized}%)</small>` : ''}</li>
                            <li>POC: <strong>${(analytics && analytics.volumeProfile && analytics.volumeProfile.poc) ? Number(analytics.volumeProfile.poc).toFixed(4) : '-'}</strong>${(analytics && analytics.volumeProfile && Number.isFinite(analytics.volumeProfile.valueAreaLow) && Number.isFinite(analytics.volumeProfile.valueAreaHigh)) ? ` <small class="text-muted">(VA ${Number(analytics.volumeProfile.valueAreaLow).toFixed(4)}–${Number(analytics.volumeProfile.valueAreaHigh).toFixed(4)})</small>` : ''}</li>
                            <li>Depth Imb: <strong>${(analytics && analytics.depthImbalance && analytics.depthImbalance.value !== undefined) ? ((analytics.depthImbalance.value>0?'+':'') + (analytics.depthImbalance.value*100).toFixed(1) + '%') : '-'}</strong>${(analytics && analytics.depthImbalance && Number.isFinite(analytics.depthImbalance.normalized)) ? ` <small class="text-muted">(${analytics.depthImbalance.normalized}%)</small>` : ''}</li>
                            <li>Risk Score: <strong>${analytics && analytics.riskScore !== undefined ? analytics.riskScore + '%' : '-'}</strong></li>
                        </ul>
                        <div class="small text-muted">Insights: <strong>${insights}</strong></div>
                    </div>
                </div>`;
        } catch (e) { console.warn('renderSignalLab error', e); }
    }

    // ===================== Backtest Tab =====================
    function renderBacktestTab() {
        try {
            const coinDataMap = window.coinDataMap || {};
            const pane = document.getElementById('backtestPane');
            const coinSelect = document.getElementById('backtestCoinSelect');
            const sampleEl = document.getElementById('backtestSampleCount');
            if (!pane || !coinSelect) return;
            const coins = Object.keys(coinDataMap);
            if (!coins.length) {
                coinSelect.innerHTML = '';
                pane.innerHTML = '<p class="mb-0 text-muted">Waiting for recommendations…</p>';
                if (sampleEl) sampleEl.textContent = '0';
                return;
            }
            if (!coinSelect.dataset.bound) {
                coinSelect.addEventListener('change', () => {
                    window._backtestCoin = coinSelect.value;
                    renderBacktestTab();
                });
                coinSelect.dataset.bound = '1';
            }
            const prevCoin = window._backtestCoin || coinSelect.value || coins[0];
            const currentCoin = coins.includes(prevCoin) ? prevCoin : coins[0];
            coinSelect.innerHTML = coins.map(c => `<option value="${c}" ${c === currentCoin ? 'selected' : ''}>${c}</option>`).join('');
            window._backtestCoin = currentCoin;
            const data = coinDataMap[currentCoin];
            const history = (data && Array.isArray(data._history)) ? data._history.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0)) : [];
            const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
            const log = (metrics && Array.isArray(metrics.recommendationLog)) ? metrics.recommendationLog.slice(-200) : [];
            if (sampleEl) sampleEl.textContent = String(log.length || 0);
            if (!log.length || history.length < 2) {
                pane.innerHTML = '<p class="mb-0 text-muted">Need more recommendations and history to run backtests.</p>';
                return;
            }
            const findPriceAt = (targetTs) => {
                for (let i = 0; i < history.length; i++) {
                    const point = history[i];
                    if ((point.ts || 0) >= targetTs) return Number(point.price) || 0;
                }
                return Number(history.length ? history[history.length - 1].price : 0) || 0;
            };
            const horizons = [
                { label: '5m', ms: 5 * 60 * 1000 },
                { label: '15m', ms: 15 * 60 * 1000 },
                { label: '60m', ms: 60 * 60 * 1000 },
                { label: '120m', ms: 120 * 60 * 1000 }
            ];
            const computeStats = (horizon) => {
                const details = [];
                let wins = 0;
                const deltas = [];
                for (const entry of log) {
                    if (!entry || entry.recommendation === 'HOLD') continue;
                    const entryPrice = Number(entry.price) || findPriceAt(entry.ts);
                    if (!entryPrice) continue;
                    const futurePrice = findPriceAt(entry.ts + horizon.ms);
                    if (!futurePrice) continue;
                    const rawChange = ((futurePrice - entryPrice) / entryPrice) * 100;
                    const directional = entry.recommendation === 'SELL' ? -rawChange : rawChange;
                    deltas.push(directional);
                    if (directional >= 0) wins++;
                    details.push({ ts: entry.ts, recommendation: entry.recommendation, confidence: entry.confidence, score: entry.score, outcome: directional, horizonMs: horizon.ms });
                }
                const avg = deltas.length ? (deltas.reduce((sum, v) => sum + v, 0) / deltas.length) : 0;
                const sorted = deltas.slice().sort((a, b) => a - b);
                const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
                const worst = sorted.length ? sorted[0] : 0;
                const winRate = deltas.length ? (wins / deltas.length) * 100 : 0;
                return { label: horizon.label, samples: deltas.length, winRate, avg, median, worst, details };
            };
            const stats = horizons.map(computeStats);
            const rows = stats.map(s => `
                <tr>
                    <td>${s.label}</td>
                    <td>${s.samples}</td>
                    <td>${fmtPct(s.winRate, 1)}</td>
                    <td>${fmtPct(s.avg, 2)}</td>
                    <td>${fmtPct(s.median, 2)}</td>
                    <td>${fmtPct(s.worst, 2)}</td>
                </tr>`).join('');
            const primaryDetails = stats.length ? stats[0].details.slice(-5).reverse() : [];
            const recentHtml = primaryDetails.length ? primaryDetails.map(item => {
                const time = item.ts ? new Date(item.ts).toLocaleTimeString() : '-';
                return `<li class="list-group-item bg-dark text-light border-secondary">
                    <div class="d-flex justify-content-between">
                        <span>${time}</span>
                        <span>${item.recommendation} · ${item.confidence || 0}%</span>
                    </div>
                    <div>Outcome after 5m: <strong class="${item.outcome >= 0 ? 'text-success' : 'text-danger'}">${fmtPct(item.outcome, 2)}</strong> (score ${fmtNum(item.score, 2)})</div>
                </li>`;
            }).join('') : '<li class="list-group-item bg-dark text-light border-secondary">No realized trades yet.</li>';
            pane.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-dark table-striped table-sm mb-0">
                        <thead>
                            <tr>
                                <th>Horizon</th>
                                <th>Samples</th>
                                <th>Win %</th>
                                <th>Avg Change</th>
                                <th>Median</th>
                                <th>Worst</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="mt-3">
                    <h6 class="text-info">Recent Outcomes (5m horizon)</h6>
                    <ul class="list-group list-group-flush">${recentHtml}</ul>
                </div>`;
        } catch (e) { console.warn('renderBacktestTab error', e); }
    }

    // ===================== Risk Monitor Tab =====================
    function renderRiskMonitorTab() {
        try {
            const coinDataMap = window.coinDataMap || {};
            const pane = document.getElementById('riskPane');
            const coinSelect = document.getElementById('riskCoinSelect');
            const lookbackSelect = document.getElementById('riskLookbackSelect');
            if (!pane || !coinSelect || !lookbackSelect) return;
            const coins = Object.keys(coinDataMap);
            if (!coins.length) {
                coinSelect.innerHTML = '';
                pane.innerHTML = '<p class="mb-0 text-muted">Waiting for data…</p>';
                return;
            }
            if (!coinSelect.dataset.bound) {
                coinSelect.addEventListener('change', () => {
                    window._riskCoin = coinSelect.value;
                    renderRiskMonitorTab();
                });
                coinSelect.dataset.bound = '1';
            }
            if (!lookbackSelect.dataset.bound) {
                lookbackSelect.addEventListener('change', () => renderRiskMonitorTab());
                lookbackSelect.dataset.bound = '1';
            }
            const prevCoin = window._riskCoin || coinSelect.value || coins[0];
            const currentCoin = coins.includes(prevCoin) ? prevCoin : coins[0];
            coinSelect.innerHTML = coins.map(c => `<option value="${c}" ${c === currentCoin ? 'selected' : ''}>${c}</option>`).join('');
            window._riskCoin = currentCoin;
            const lookback = Number(lookbackSelect.value) || 100;
            const data = coinDataMap[currentCoin];
            const metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
            const analytics = metrics;
            const history = (data && Array.isArray(data._history)) ? data._history.slice(-Math.max(20, lookback)) : [];
            if (history.length < 2) {
                pane.innerHTML = '<p class="mb-0 text-muted">Not enough history to compute risk metrics.</p>';
                return;
            }
            const prices = history.map(h => Number(h.price) || 0).filter(v => v > 0);
            if (prices.length < 2) {
                pane.innerHTML = '<p class="mb-0 text-muted">Price history missing.</p>';
                return;
            }
            const returns = [];
            for (let i = 1; i < prices.length; i++) {
                const prev = prices[i - 1];
                const curr = prices[i];
                if (prev) returns.push(((curr - prev) / prev) * 100);
            }
            const meanReturn = returns.length ? returns.reduce((s, v) => s + v, 0) / returns.length : 0;
            const variance = returns.length ? returns.reduce((s, v) => s + Math.pow(v - meanReturn, 2), 0) / returns.length : 0;
            const returnStd = Math.sqrt(Math.max(variance, 0));
            const realizedVol = returnStd * Math.sqrt(60);
            const sortedReturns = returns.slice().sort((a, b) => a - b);
            const tailIdx = sortedReturns.length ? Math.max(0, Math.floor(sortedReturns.length * 0.05) - 1) : 0;
            const tailRisk = sortedReturns.length ? sortedReturns[tailIdx] : 0;
            let peak = prices[0];
            let maxDD = 0;
            for (const price of prices) {
                if (price > peak) peak = price;
                if (peak > 0) {
                    const dd = ((price - peak) / peak) * 100;
                    if (dd < maxDD) maxDD = dd;
                }
            }
            const drawdown = Math.abs(maxDD);
            const atr = typeof computeATR === 'function' ? computeATR(history, 14) : 0;
            const riskScore = Number(data.risk_score || analytics.riskScore) || 0;
            const stressIndex = Math.round(Math.min(100, (Math.abs(tailRisk) * 1.5) + (realizedVol * 0.8) + (riskScore * 0.5)));
            // Robust fallbacks for analytics fields -> raw WS field names
            const pickNumber = (...keys) => {
                for (const k of keys) {
                    try {
                        const v = (analytics && analytics[k] !== undefined && analytics[k] !== null) ? analytics[k] : (data && data[k] !== undefined ? data[k] : undefined);
                        const n = Number(v);
                        if (Number.isFinite(n)) return n;
                    } catch (e) { }
                }
                return 0;
            };

            const freqBuy = pickNumber('freqBuy2h', 'count_FREQ_minute_120_buy', 'freq_buy_2JAM', 'freq_buy_120MENIT');
            const freqSell = pickNumber('freqSell2h', 'count_FREQ_minute_120_sell', 'freq_sell_2JAM', 'freq_sell_120MENIT');
            const freqTotal = freqBuy + freqSell;
            const freqRatio = freqTotal > 0 ? (freqBuy / freqTotal) * 100 : 0;

            const volBuy = pickNumber('volBuy2h', 'sum_min_120_buy', 'vol_buy_2JAM', 'count_VOL_minute_120_buy');
            const volSell = pickNumber('volSell2h', 'sum_min_120_sell', 'vol_sell_2JAM', 'count_VOL_minute_120_sell');
            const volRatio = volSell > 0 ? (volBuy / volSell) * 100 : (volBuy > 0 ? null : 0);
            const volRatioDisplay = formatVolRatioLocal(volRatio);
            const stressClass = stressIndex >= 70 ? 'alert-danger' : stressIndex >= 50 ? 'alert-warning' : 'alert-success';
            pane.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <h6 class="text-info">Volatility & Drawdown</h6>
                        <ul class="list-unstyled small mb-0">
                            <li>ATR (14): <strong>${fmtNum(atr, 6)}</strong></li>
                            <li>Realized Vol (hourly): <strong>${fmtPct(realizedVol, 2)}</strong></li>
                            <li>Tail Risk (5th pct): <strong>${fmtPct(tailRisk, 2)}</strong></li>
                            <li>Max Drawdown: <strong>${fmtPct(drawdown, 2)}</strong></li>
                            <li>Mean Return: <strong>${fmtPct(meanReturn, 2)}</strong></li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-info">Flow & Liquidity</h6>
                        <ul class="list-unstyled small mb-0">
                            <li>Vol Ratio (2h): <strong>${volRatioDisplay}</strong></li>
                            <li>Freq Ratio (2h): <strong>${fmtPct(freqRatio, 1)}</strong></li>
                            <li>Risk Score: <strong>${riskScore}%</strong></li>
                            <li>Liquidity Proxy: <strong>${fmtNum((analytics && analytics.liquidity_avg_trade_value) || data.liquidity_avg_trade_value || (volTotal && freqTotal ? (volTotal / Math.max(1,freqTotal)) : 0), 2)}</strong></li>
                            <li>Sharp Insights: <strong>${(analytics.sharpInsights && analytics.sharpInsights[0]) || 'None'}</strong></li>
                        </ul>
                        <div class="${stressClass} mt-2 py-2 px-3 small">
                            Market Stress Index: <strong>${stressIndex}</strong>/100
                        </div>
                    </div>
                </div>`;
        } catch (e) { console.warn('renderRiskMonitorTab error', e); }
    }

    // ===================== Event Watch Tab =====================
    function renderEventWatchTab() {
        try {
            const pane = document.getElementById('eventPane');
            if (!pane) return;
            const alerts = typeof loadAlertsFromStore === 'function' ? loadAlertsFromStore().slice(-10).reverse() : [];
            const events = (window._eventWatchBuffer || []).slice(-10).reverse();
            const spikeRows = (window._lastSpikeRows || []).slice(0, 5);
            const esc = (s) => {
                try { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); } catch (e) { return '' + s; }
            };

            const alertHtml = alerts.length
                ? alerts.map(a => {
                    const badge = `bg-${(a.type && String(a.type).replace(/[^a-z0-9\-]/gi,'') ) || 'secondary'}`;
                    const coin = a && a.coin ? esc(a.coin) : '';
                    const when = a && a.ts ? `<div class="text-muted small">${new Date(a.ts).toLocaleString()}</div>` : '';
                    return `<div class="mb-2"><div><span class="badge ${badge} me-1">${coin ? coin + ' — ' : ''}${(a.type === 'danger' ? 'Alert' : 'Alert')}</span> <strong class="text-light">${coin || ''}</strong></div><div class="small text-light d-inline">${esc(a.message || '')}</div>${when}</div>`;
                }).join('')
                : '<div class="text-muted small">No recent alerts.</div>';

            const eventHtml = events.length
                ? events.map(e => {
                    const type = esc(e.type || 'Event');
                    const coin = esc(e.coin || '');
                    const desc = e.description ? esc(e.description) : (e.messages ? esc(String(e.messages).replace(/\n/g,' • ')) : '');
                    const pretty = esc(JSON.stringify(e, null, 2));
                    return `
                        <div class="mb-2">
                            <div><span class="badge bg-info me-1">${type}</span> <strong class="text-light">${coin}</strong></div>
                            <div class="small text-light" style="opacity:0.95;">${desc}</div>
                            <details class="mt-1">
                                <summary class="text-muted small">View JSON</summary>
                                <pre class="bg-dark text-light p-2 rounded small" style="max-height:200px;overflow:auto;white-space:pre-wrap;">${pretty}</pre>
                            </details>
                        </div>`;
                }).join('')
                : '<div class="text-muted small">No recent events.</div>';
            const spikeHtml = spikeRows.length
                ? spikeRows.map(s => {
                    try {
                        const coin = esc(s.coin || '');
                        const tf = esc(s.timeframe || '');
                        const side = esc(s.side || '');
                        const rec = esc(s.recommendation || '');
                        const conf = (s.recConfidence || s.recConfidence === 0) ? String(s.recConfidence) : '';
                        const ratio = (s && typeof s.ratio === 'number') ? s.ratio.toFixed(2) + 'x' : (s && s.ratio ? String(s.ratio) : '-');
                        const recClass = rec && /LONG|BUY/i.test(rec) ? 'text-success' : (rec && /SHORT|SELL/i.test(rec) ? 'text-danger' : 'text-muted');
                        return `<div class="mb-1">${coin} ${tf} <small class="text-muted">(${side})</small>: <strong>${ratio}</strong> <span class="${recClass}" style="margin-left:8px;">${rec}${conf ? ' ('+conf+'%)' : ''}</span></div>`;
                    } catch (e) { return `<div class="mb-1">${esc(String(s.coin||''))} ${esc(String(s.timeframe||''))}: <strong>${esc(String((s&&s.ratio)||'-'))}</strong></div>`; }
                }).join('')
                : '<div class="text-muted small">No spike data.</div>';
            pane.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-4">
                        <h6 class="text-warning">Recent Alerts</h6>
                        <div class="small">${alertHtml}</div>
                    </div>
                    <div class="col-md-4">
                        <h6 class="text-primary">Recent Events</h6>
                        <div class="small">${eventHtml}</div>
                    </div>
                    <div class="col-md-4">
                        <h6 class="text-info">Recent Spikes</h6>
                        <div class="small">${spikeHtml}</div>
                    </div>
                </div>`;
        } catch (e) { console.warn('renderEventWatchTab error', e); }
    }

    // ===================== Show Vol Ratio Info =====================
    function showVolRatioInfo() {
        try {
            const tab = document.getElementById('info-tab');
            if (tab) tab.click();
            setTimeout(() => {
                const el = document.getElementById('volRatioSection');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const orig = el.style.boxShadow;
                    el.style.boxShadow = '0 0 12px rgba(255,235,59,0.9)';
                    setTimeout(() => { el.style.boxShadow = orig; }, 1600);
                }
            }, 180);
        } catch (e) { console.warn('showVolRatioInfo failed', e); }
    }

    // ===================== Exports =====================
    window.maybeRenderHeavyTab = maybeRenderHeavyTab;
    window.renderSignalLab = renderSignalLab;
    window.renderBacktestTab = renderBacktestTab;
    window.renderRiskMonitorTab = renderRiskMonitorTab;
    window.renderEventWatchTab = renderEventWatchTab;
    window.showVolRatioInfo = showVolRatioInfo;
})();
