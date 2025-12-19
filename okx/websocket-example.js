        const limitInput = document.getElementById('limitInput');
        const sortBySelect = document.getElementById('sortBy');
        // radio buttons for sort order
        const sortOrderRadios = document.getElementsByName('sortOrderRad');
        function getSortOrderValue() {
            try { for (const r of sortOrderRadios) if (r.checked) return r.value; } catch (e) { }
            return 'desc';
        }
        let rowLimit = 5; // default rows to display (changed from 20)

        // Per-tab filter inputs
        const filterInputs = {
            summary: document.getElementById('coinFilter_summary'),
            volume: document.getElementById('coinFilter_volume'),
            volDur: document.getElementById('coinFilter_volDur'),
            spikes: document.getElementById('coinFilter_spikes'),
            recs: document.getElementById('coinFilter_recs'),
            alerts: document.getElementById('coinFilter_alerts'),
            micro: document.getElementById('coinFilter_micro'),
            frequency: document.getElementById('coinFilter_frequency'),
            freqRatio: document.getElementById('coinFilter_freqRatio'),
            smart: document.getElementById('coinFilter_smart'),
            funding: document.getElementById('coinFilter_funding')
        };
// If ws-client buffered messages, flush them now that handler exists
try {
    if (typeof window._flushWsBuffer === 'function') {
        const flushed = window._flushWsBuffer();
        if (flushed) console.info('[ws-client] Flushed', flushed, 'buffered messages');
    }
} catch (e) { }

        // debounce is in js/modules/helpers.js

        // Real-time mode: when enabled, reduce debounce and avoid dropping updates
        let REALTIME_MODE = (typeof window !== 'undefined' && typeof window.REALTIME_MODE === 'boolean') ? window.REALTIME_MODE : true;
        // Schedule updates to the table (debounced). Use shorter debounce in REALTIME_MODE.
        const scheduleUpdateTable = debounce(function () {
            try { 
                if (typeof updateTable === 'function') {
                    updateTable();
                } else if (typeof window.updateTable === 'function') {
                    window.updateTable();
                } else {
                    console.warn('[scheduleUpdateTable] updateTable not defined yet');
                }
            }
            catch (e) { console.error('[scheduleUpdateTable] error:', e); }
        }, REALTIME_MODE ? 50 : 300);
        // Expose globally so other modules can schedule updates
        try { window.scheduleUpdateTable = scheduleUpdateTable; } catch (e) { }
        try { window.REALTIME_MODE = REALTIME_MODE; } catch (e) { }

        // Local shim reference (if available) to centralize global accesses
        const __okxShim = (typeof window !== 'undefined' && window.__okxShim) ? window.__okxShim : null;
        
        // Throttle per-coin updates to avoid processing same coin too frequently
        const lastCoinUpdate = {};
        const COIN_THROTTLE_MS_MIN = 50; // Min 50ms between same coin updates
        const COIN_THROTTLE_MS_MAX = 500; // Max 500ms during high load
        let adaptiveThrottleMs = COIN_THROTTLE_MS_MIN;
        
        // Track message rate for adaptive throttling
        let _msgCount = 0;
        let _msgRatePerSec = 0;
        setInterval(() => {
            _msgRatePerSec = _msgCount;
            _msgCount = 0;
            // Adaptive throttle based on message rate
            if (!REALTIME_MODE) {
                if (_msgRatePerSec > 500) {
                    adaptiveThrottleMs = COIN_THROTTLE_MS_MAX;
                } else if (_msgRatePerSec > 200) {
                    adaptiveThrottleMs = 300;
                } else if (_msgRatePerSec < 100) {
                    adaptiveThrottleMs = COIN_THROTTLE_MS_MIN;
                }
            } else {
                // In realtime mode keep throttle minimal
                adaptiveThrottleMs = COIN_THROTTLE_MS_MIN;
            }
        }, 1000);
        
        function getAdaptiveThrottle() {
            return REALTIME_MODE ? 0 : adaptiveThrottleMs;
        }
        
        let activeFilterTab = 'summary';

        function setActiveFilterTab(tab) {
            activeFilterTab = tab || 'summary';
            for (const k in filterInputs) {
                try {
                    const el = filterInputs[k];
                    if (!el) continue;
                    if (k === activeFilterTab) el.classList.remove('d-none'); else el.classList.add('d-none');
                } catch (e) { }
            }
            try {
                // Refresh tables promptly when switching tabs so content appears immediately
                if (typeof scheduleUpdateTable === 'function') scheduleUpdateTable();
                else if (typeof updateTable === 'function') updateTable();
            } catch (e) { console.warn('refresh on tab switch failed', e); }
        }

        function getActiveFilterValue() {
            try {
                const el = filterInputs[activeFilterTab];
                if (!el) return '';
                return (el.value || '').toLowerCase();
            } catch (e) { return ''; }
        }

        // Recommendation UI controls
        const useAtrRecs = document.getElementById('useAtrRecs');
        const tpMinInput = document.getElementById('tpMin');
        const tpMaxInput = document.getElementById('tpMax');
        const slMaxInput = document.getElementById('slMax');
        const confSensitivity = document.getElementById('confSensitivity');

        // Listen for changes to the limit
        limitInput.addEventListener('input', (event) => {
            rowLimit = parseInt(event.target.value, 10) || Infinity;
            try { window.rowLimit = rowLimit; } catch (e) { }
            scheduleUpdateTable(); // Update table when limit changes (debounced)
        });

        // Wire recommendation controls to refresh table when changed
        try {
            if (useAtrRecs) useAtrRecs.addEventListener('change', () => scheduleUpdateTable());
            if (tpMinInput) tpMinInput.addEventListener('input', () => scheduleUpdateTable());
            if (tpMaxInput) tpMaxInput.addEventListener('input', () => scheduleUpdateTable());
            if (slMaxInput) slMaxInput.addEventListener('input', () => scheduleUpdateTable());
            if (confSensitivity) confSensitivity.addEventListener('input', () => scheduleUpdateTable());
        } catch (e) { console.warn('wiring rec controls failed', e); }

        // Listen for changes in each per-tab filter input
        try {
            for (const k in filterInputs) {
                const el = filterInputs[k];
                if (!el) continue;
                el.addEventListener('input', () => scheduleUpdateTable());
            }
        } catch (e) { console.warn('wiring per-tab filters failed', e); }

        // Populate coin autocomplete datalist when coin map updates
        function updateCoinDatalist() {
            try {
                const dl = document.getElementById('coinOptions');
                if (!dl) return;
                const map = (window.__okxShim && typeof window.__okxShim.getCoinDataMap === 'function') ? window.__okxShim.getCoinDataMap() : (window.coinDataMap || {});
                const keys = Object.keys(map || {}).sort((a,b) => a.localeCompare(b));
                // reuse existing nodes if possible
                dl.innerHTML = '';
                for (const k of keys) {
                    const opt = document.createElement('option');
                    opt.value = k;
                    dl.appendChild(opt);
                }
            } catch (e) { /* ignore */ }
        }

        // Tab click handlers to switch active filter
        try {
            const tabMap = {
                'summary-tab': 'summary',
                'volume-tab': 'volume',
                'vol-dur-tab': 'volDur',
                'spike-tab': 'spikes',
                'recs-tab': 'recs',
                'alerts-tab': 'alerts',
                    'insight-tab': 'summary',
                    'funding-tab': 'funding',
                'info-tab': 'summary',
                'micro-tab': 'micro',
                'freq-tab': 'frequency',
                'freqratio-tab': 'freqRatio',
                'smart-tab': 'smart'
            };
            for (const tid in tabMap) {
                const btn = document.getElementById(tid);
                if (!btn) continue;
                btn.addEventListener('click', () => setActiveFilterTab(tabMap[tid]));
            }
        } catch (e) { console.warn('wiring tab filter toggles failed', e); }

        // show default filter
        setActiveFilterTab('summary');

        // Wire compact alert controls
        try {
            if (compactAlertsToggle) compactAlertsToggle.addEventListener('change', (ev) => {
                try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_compact_alerts', ev.target.checked ? 'true' : 'false'); else localStorage.setItem('okx_compact_alerts', ev.target.checked ? 'true' : 'false'); } catch (e) { }
            });
            if (maxAlertBannersInput) maxAlertBannersInput.addEventListener('input', (ev) => {
                try { if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('okx_max_alert_banners', String(parseInt(ev.target.value, 10) || 0)); else localStorage.setItem('okx_max_alert_banners', String(parseInt(ev.target.value, 10) || 0)); } catch (e) { }
            });
            if (showHiddenAlertsBtn) showHiddenAlertsBtn.addEventListener('click', (ev) => {
                try {
                    // populate modal with hidden alerts
                    const modalBody = document.getElementById('hiddenAlertsModalBody');
                    if (!modalBody) return;
                    modalBody.innerHTML = '';
                    if (!hiddenAlertBuffer || hiddenAlertBuffer.length === 0) {
                        modalBody.innerHTML = '<div class="small text-muted">No hidden alerts</div>';
                    } else {
                        for (const a of hiddenAlertBuffer) {
                            const div = document.createElement('div');
                            div.className = 'mb-2 p-2 bg-dark text-light';
                            div.innerHTML = `<strong>${a.title}</strong><div style="font-size:0.9em;">${a.message}</div><div class="text-muted small">${new Date(a.ts).toLocaleString()}</div>`;
                            modalBody.appendChild(div);
                        }
                    }
                    const bs = new bootstrap.Modal(document.getElementById('hiddenAlertsModal'));
                    bs.show();
                } catch (e) { console.warn('showHiddenAlerts failed', e); }
            });
        } catch (e) { console.warn('wiring compact alert controls failed', e); }

        // Listen for changes in sort criteria
        sortBySelect.addEventListener('change', () => {
            scheduleUpdateTable(); // Update table when sort criteria is changed (debounced)
        });

        // Listen for changes in sort order (radio buttons)
        try {
            for (const r of sortOrderRadios) { if (r) r.addEventListener('change', () => scheduleUpdateTable()); }
        } catch (e) { console.warn('wiring sort order radios failed', e); }

        const summaryBody = document.getElementById('summaryBody');
        const volBody = document.getElementById('volBody');
        const volRatioBody = document.getElementById('volRatioBody');
        const spikeBody = document.getElementById('spikeBody');
        const recsBody = document.getElementById('recsBody');
        const microBody = document.getElementById('microBody');
        const recTimeframeSelect = document.getElementById('recTimeframe');
        const openRecsBtn = document.getElementById('openRecsBtn');
        const advancedSortStatus = document.getElementById('advancedSortStatus');
        const advancedSortHint = document.getElementById('advancedSortHint');
        const disableAdvancedSortBtn = document.getElementById('disableAdvancedSortBtn');
        const advancedSortModalEl = document.getElementById('advancedSortModal');
        const advancedSortCriteriaContainer = document.getElementById('advancedSortCriteriaContainer');
        const addAdvancedSortRowBtn = document.getElementById('addAdvancedSortRow');
        const applyAdvancedSortBtn = document.getElementById('applyAdvancedSort');
        const clearAdvancedSortBtn = document.getElementById('clearAdvancedSortBtn');
        const advFilterFlowToggle = document.getElementById('advFilterFlowToggle');
        const advFilterFlowControls = document.getElementById('advFilterFlowControls');
        const advFilterFlowMetric = document.getElementById('advFilterFlowMetric');
        const advFilterFlowComparator = document.getElementById('advFilterFlowComparator');
        const advFilterFlowValue = document.getElementById('advFilterFlowValue');
        const advFilterDurToggle = document.getElementById('advFilterDurToggle');
        const advFilterDurControls = document.getElementById('advFilterDurControls');
        const advFilterDurMetric = document.getElementById('advFilterDurMetric');
        const advFilterDurComparator = document.getElementById('advFilterDurComparator');
        const advFilterDurValue = document.getElementById('advFilterDurValue');
        const advFilterPriceToggle = document.getElementById('advFilterPriceToggle');
        const advFilterPriceControls = document.getElementById('advFilterPriceControls');
        const advFilterPriceMin = document.getElementById('advFilterPriceMin');
        const advFilterPriceMax = document.getElementById('advFilterPriceMax');

        if (openRecsBtn) {
            openRecsBtn.addEventListener('click', () => {
                try { const tab = document.getElementById('recs-tab'); if (tab) tab.click(); } catch (e) { console.warn('openRecs click failed', e); }
            });
        }
        if (recTimeframeSelect) recTimeframeSelect.addEventListener('change', () => scheduleUpdateTable());
        // ws-client is in js/modules/ws-client.js

        // --- Insight modal helpers (ensure global functions available) ---
        function ensureInsightModal() {
            if (document.getElementById('insightModal')) return;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `
                        <div class="modal fade" id="insightModal" tabindex="-1" aria-hidden="true">
                            <div class="modal-dialog modal-lg modal-dialog-centered">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title" id="insightModalLabel">Insight</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div class="modal-body" id="insightModalBody">
                                        <!-- populated dynamically -->
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                        <button type="button" class="btn btn-outline-primary" id="insightExportJson">Export JSON</button>
                                        <button type="button" class="btn btn-outline-success" id="insightExportCsv">Export CSV</button>
                                    </div>
                                </div>
                            </div>
                        </div>`;
            document.body.appendChild(wrapper.firstElementChild);
        }

        // --- Test JSON modal helper ---
        function ensureTestJsonModal() {
            if (document.getElementById('testJsonModal')) return;
            const w = document.createElement('div');
            w.innerHTML = `
                                        <div class="modal fade" id="testJsonModal" tabindex="-1" aria-hidden="true">
                                            <div class="modal-dialog modal-lg modal-dialog-centered">
                                                <div class="modal-content">
                                                    <div class="modal-header">
                                                        <h5 class="modal-title">Run JSON (Paste & Run)</h5>
                                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                                    </div>
                                                    <div class="modal-body">
                                                        <p class="small text-muted">Paste a single JSON payload here and click <strong>Run</strong> to simulate receiving it from WebSocket.</p>
                                                        <textarea id="testJsonTextarea" class="form-control" rows="8" placeholder='Paste JSON here'></textarea>
                                                        <div id="testJsonError" class="text-danger small mt-2" style="display:none"></div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                                        <button type="button" class="btn btn-primary" id="testJsonRunBtn">Run</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`;
            document.body.appendChild(w.firstElementChild);
        }

        // drawSparkline is in js/modules/helpers.js

        // Global error display for debugging (shows last uncaught error on page)
        window.__displayError = function (err) {
            try {
                console.error('Captured Error:', err);
                let el = document.getElementById('lastError');
                if (!el) {
                    el = document.createElement('div');
                    el.id = 'lastError';
                    el.style.position = 'fixed';
                    el.style.right = '12px';
                    el.style.bottom = '12px';
                    el.style.zIndex = 2000;
                    el.style.background = 'rgba(220,53,69,0.95)';
                    el.style.color = '#fff';
                    el.style.padding = '8px 12px';
                    el.style.borderRadius = '6px';
                    el.style.fontSize = '12px';
                    document.body.appendChild(el);
                }
                el.textContent = typeof err === 'string' ? err : (err && err.stack) ? err.stack.split('\n')[0] : String(err);
            } catch (e) { console.error('Error displaying error', e); }
        };

        window.addEventListener('error', function (ev) { window.__displayError(ev.error || ev.message || 'Unknown error'); });
        window.addEventListener('unhandledrejection', function (ev) { window.__displayError(ev.reason || ev.reason && ev.reason.message || 'Unhandled rejection'); });

        window.exportInsightJSON = function (coin, data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${coin}-insight.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        };

        window.exportInsightCSV = function (coin, data) {
            // export history points and a few summary fields
            const rows = [];
            const _metricsCSV = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
            rows.push(['coin', coin]);
            rows.push(['risk_score', data.risk_score || _metricsCSV.riskScore || 0]);
            rows.push([]);
            rows.push(['ts', 'price', 'volBuy2h', 'volSell2h']);
            const hist = data._history || [];
            for (const h of hist) rows.push([h.ts || '', h.price || '', h.volBuy2h || '', h.volSell2h || '']);
            const csv = rows.map(r => r.map(c => String(c).replace(/"/g, '""')).map(c => `"${c}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${coin}-insight.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        };

        window.showInsightModal = function (coin, data) {
            ensureInsightModal();
            const modalEl = document.getElementById('insightModal');
            const body = document.getElementById('insightModalBody');
            const title = document.getElementById('insightModalLabel');
            title.textContent = `Insights — ${coin}`;

            const hist = data._history || [];
            const _metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
            const risk = data.risk_score || _metrics.riskScore || 0;
            const comp = _metrics.components || {};
            // prepare z-score / persistence diagnostics
            const buySeries = hist.map(h => Number(h.volBuy2h || 0));
            const sellSeries = hist.map(h => Number(h.volSell2h || 0));
            const buyStat = meanStd(buySeries);
            const sellStat = meanStd(sellSeries);
            const currBuy = Number((_metrics && _metrics.volBuy2h) || getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM') || 0);
            const currSell = Number((_metrics && _metrics.volSell2h) || getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM') || 0);
            const zBuy = (buySeries.length >= 6 && buyStat.std > 0) ? ((currBuy - buyStat.mean) / buyStat.std) : null;
            const zSell = (sellSeries.length >= 6 && sellStat.std > 0) ? ((currSell - sellStat.mean) / sellStat.std) : null;
            // persistence: last 3 buys > mean+std
            let persistBuy = null;
            if (buySeries.length >= 3 && buyStat.std > 0) {
                const recent = buySeries.slice(Math.max(0, buySeries.length - 3));
                persistBuy = recent.filter(v => v > (buyStat.mean + buyStat.std)).length;
            }

            body.innerHTML = `
                                <div class="mb-3">
                                    <strong>Risk Score:</strong> <span class="fw-bold">${risk}%</span>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-12">${drawSparkline(hist, 560, 90)}</div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Components</h6>
                                        <ul>
                                            <li>Imbalance: ${Number(comp.imbalance || 0).toFixed(2)}</li>
                                            <li>Deviation: ${Number(comp.deviation || 0).toFixed(2)}</li>
                                            <li>Price Move: ${Number(comp.priceMove || 0).toFixed(2)}</li>
                                            <li>Liquidity: ${Number(comp.liquidity || 0).toFixed(2)}</li>
                                        </ul>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Summary</h6>
                                        <table class="table table-sm">
                                            <tr><td>Vol Buy (2h)</td><td>${getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM') || 0}</td></tr>
                                            <tr><td>Vol Sell (2h)</td><td>${getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM') || 0}</td></tr>
                                            <tr><td>Vol Dur (2h)</td><td>${getNumeric(data, 'percent_sum_VOL_minute_120_buy') || data.percent_sum_VOL_minute_120_buy || 0}%</td></tr>
                                            <tr><td>Price</td><td>${data.last || 0}</td></tr>
                                        </table>
                                        <div class="small text-muted mt-2">
                                            <strong>Buy z-score (2h):</strong> ${zBuy === null ? 'N/A' : Number(zBuy.toFixed(2))}
                                            <br><small>Samples: ${buySeries.length} | mean: ${Number(buyStat.mean.toFixed(2))} | std: ${Number(buyStat.std.toFixed(2))}</small>
                                            <br><strong>Sell z-score (2h):</strong> ${zSell === null ? 'N/A' : Number(zSell.toFixed(2))}
                                            <br><small>Samples: ${sellSeries.length} | mean: ${Number(sellStat.mean.toFixed(2))} | std: ${Number(sellStat.std.toFixed(2))}</small>
                                            <br><strong>Persistence (last3 buys > mean+std):</strong> ${persistBuy === null ? '-' : persistBuy}
                                        </div>
                                    </div>
                                </div>`;

            // wire export buttons
            const btnJson = document.getElementById('insightExportJson');
            const btnCsv = document.getElementById('insightExportCsv');
            btnJson.onclick = () => window.exportInsightJSON(coin, data);
            btnCsv.onclick = () => window.exportInsightCSV(coin, data);

            // show modal using Bootstrap
            try {
                const bsModal = new bootstrap.Modal(modalEl);
                bsModal.show();
            } catch (e) {
                console.warn('Bootstrap modal not available, falling back to alert', e);
                alert(`${coin} — Risk: ${risk}%`);
            }
        };

        // Show insight in the Insight tab (populate the insight pane and activate the tab)
        window.showInsightTab = function (coin, data) {
            try {
                const pane = document.getElementById('insightPaneBody');
                if (!pane) return showInsightModal(coin, data);
                const hist = data._history || [];
                const _metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
                const risk = data.risk_score || _metrics.riskScore || 0;
                const comp = _metrics.components || {};
                // compute price position
                const currentPrice = parseFloat(data.last) || 0;
                const highPrice = parseFloat(data.high) || currentPrice;
                const lowPrice = parseFloat(data.low) || currentPrice;
                const priceRange = highPrice - lowPrice;
                const pricePos = priceRange > 0 ? Math.round(((currentPrice - lowPrice) / priceRange) * 100) : 50;

                // recommendation breakdown
                const rec = (typeof calculateRecommendation === 'function') ? calculateRecommendation(data, pricePos, null, false) : { recommendation: 'N/A', className: '', score: 0, confidence: 0 };

                // timeframes to show
                const tfs = [
                    { k: '1m', buyKeys: ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1m'], sellKeys: ['count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1m'], avgKeys: ['avg_VOLCOIN_buy_1MENIT'] },
                    { k: '5m', buyKeys: ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5m'], sellKeys: ['count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5m'], avgKeys: ['avg_VOLCOIN_buy_5MENIT'] },
                    { k: '10m', buyKeys: ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10m'], sellKeys: ['count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10m'], avgKeys: ['avg_VOLCOIN_buy_10MENIT'] },
                    { k: '15m', buyKeys: ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'], sellKeys: ['count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m'], avgKeys: ['avg_VOLCOIN_buy_15MENIT'] },
                    { k: '30m', buyKeys: ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'], sellKeys: ['count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m'], avgKeys: ['avg_VOLCOIN_buy_30MENIT'] },
                    { k: '60m', buyKeys: ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT'], sellKeys: ['count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT'], avgKeys: ['avg_VOLCOIN_buy_1JAM'] },
                    { k: '120m', buyKeys: ['count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT'], sellKeys: ['count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT'], avgKeys: ['avg_VOLCOIN_buy_2JAM'] },
                    { k: '24h', buyKeys: ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h'], sellKeys: ['count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24h'], avgKeys: ['avg_VOLCOIN_buy_24JAM'] }
                ];

                const tfRows = [];
                const spikes = [];
                for (const t of tfs) {
                    const b = getNumeric(data, ...t.buyKeys);
                    const s = getNumeric(data, ...t.sellKeys);
                    let a = getNumeric(data, ...t.avgKeys);
                    // Fallback: when avg is missing (0), estimate per-timeframe average
                    // using 2-hour or 24-hour aggregates to avoid missing spikes intermittently.
                    if (!a) {
                        const volBuy2h = (_metrics && Number(_metrics.volBuy2h)) || getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM') || 0;
                        const volBuy24h = (_metrics && Number(_metrics.volBuy24h)) || getNumeric(data, 'count_VOL_minute_1440_buy', 'vol_buy_24JAM') || 0;
                        const divisors = { '1m': 120, '5m': 24, '10m': 12, '15m': 8, '30m': 4, '60m': 2, '120m': 1 };
                        if (t.k === '24h') {
                            a = volBuy24h || a;
                        } else {
                            const div = divisors[t.k] || 1;
                            a = volBuy2h > 0 ? Math.max(0, Math.round(volBuy2h / div)) : a;
                        }
                    }
                    const ratio = a > 0 ? (b / a) : (s > 0 ? (b / (s || 1)) : 0);
                    const buyShare = (b + s) > 0 ? Math.round((b / (b + s)) * 100) : 0;
                    tfRows.push({ k: t.k, buy: b, sell: s, avg: a, buyShare, ratio });
                    if (a > 0 && ratio >= 2) spikes.push({ k: t.k, ratio: ratio, buy: b, avg: a });
                }
                spikes.sort((x, y) => y.ratio - x.ratio);

                // build HTML
                let tfTable = '<table class="table table-sm text-light"><thead><tr><th>TF</th><th>Buy</th><th>Sell</th><th>Avg</th><th>Buy %</th><th>Vol/Avg</th></tr></thead><tbody>';
                for (const r of tfRows) tfTable += `<tr><td>${r.k}</td><td>${r.buy}</td><td>${r.sell}</td><td>${r.avg}</td><td>${r.buyShare}%</td><td>${r.avg > 0 ? (r.buy / r.avg).toFixed(2) + 'x' : '-'}</td></tr>`;
                tfTable += '</tbody></table>';

                const topSpikeHtml = spikes.length > 0 ? `<div class="mb-2"><strong>Top Spike:</strong> ${spikes[0].k} — ${spikes[0].ratio.toFixed(2)}x (buy ${spikes[0].buy} vs avg ${spikes[0].avg})</div>` : '<div class="mb-2 text-muted">No significant spikes (vol >= 2x avg)</div>';

                // Build a sectioned insight view covering requested areas (summary, volume, vol ratio, microstructure, funding, alerts, recs, signal lab, backtest, risk, spikes, frequency, freq ratio, price moves, smart)
                const fundingHtml = `
                    <div><strong>Funding premium:</strong> ${data.funding_premium !== undefined ? Number(data.funding_premium).toFixed(6) : (data.funding_Rate !== undefined ? Number(data.funding_Rate).toFixed(6) : '-')}<br>
                    <strong>Sett rate:</strong> ${data.funding_settFundingRate !== undefined ? Number(data.funding_settFundingRate).toFixed(6) : '-'}<br>
                    <strong>Next funding:</strong> <span class="insight-next-funding-time">${data.funding_nextFundingTime ? new Date(Number(data.funding_nextFundingTime)).toLocaleString() : '-'}</span> <small class="text-muted">(<span class="insight-funding-countdown" data-next="${data.funding_nextFundingTime ? Number(data.funding_nextFundingTime) : ''}">${data.funding_nextFundingTime ? (function(){const d=Number(data.funding_nextFundingTime)-Date.now(); if(!d||isNaN(d)) return '-'; const s=Math.max(0,Math.floor(d/1000)); const hh=Math.floor(s/3600); const mm=Math.floor((s%3600)/60); const ss=s%60; return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`})() : '-'}</span>)</small></div>
                `;

                // alerts: try to find recent eventWatchBuffer items for this coin
                const recentAlerts = (window.eventWatchBuffer || []).filter(a => a.coin === coin).slice(-5).map(a => ({ts: a.ts, messages: a.messages || []}));
                const recentAlertsHtml = recentAlerts.length ? recentAlerts.map(a => `<div class="small text-muted">${new Date(a.ts).toLocaleString()}: ${a.messages.join(' • ')}</div>`).join('') : '<div class="small text-muted">No recent alerts</div>';

                pane.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div><h4 class="mb-0">🔍 ${coin} — Insight</h4><small class="text-muted">Last update: ${data.update_time || data.update_time_VOLCOIN || '-'}</small></div>
                        <div class="text-end"><small>Price: ${data.last || 0} • Change: ${data.percent_change || 0}%${(data.funding_premium !== undefined || data.funding_Rate !== undefined) ? ' • Funding: ' + (data.funding_premium !== undefined ? Number(data.funding_premium).toFixed(6) : Number(data.funding_Rate).toFixed(6)) : ''}${data.funding_nextFundingTime ? ' • Next: ' + new Date(Number(data.funding_nextFundingTime)).toLocaleString() : ''}</small><div class="mt-1"><strong>Recommendation:</strong> ${rec.recommendation || 'N/A'} (${rec.confidence || 0}%)</div></div>
                    </div>
                    <div class="mb-3">${drawSparkline(hist, 760, 100)}</div>

                    <div class="row g-3">
                        <div class="col-md-4">
                            <h6>📊 Summary</h6>
                            <p><strong>Price:</strong> ${data.last || '-'} • <strong>Change:</strong> ${data.percent_change || '-'}%</p>
                            <p><strong>High / Low:</strong> ${data.high || '-'} / ${data.low || '-'}</p>
                            <p><strong>Update:</strong> ${data.update_time || '-'}</p>
                            <p><strong>Risk:</strong> ${risk}%</p>
                        </div>

                        <div class="col-md-4">
                            <h6>📊 Volume</h6>
                            <p><strong>Vol Buy (2h):</strong> ${getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM') || 0}</p>
                            <p><strong>Vol Sell (2h):</strong> ${getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM') || 0}</p>
                            <p><strong>Total 24h:</strong> ${localGetNumeric(data, 'vol_buy_24JAM') + localGetNumeric(data, 'vol_sell_24JAM') || '-'}</p>
                        </div>

                        <div class="col-md-4">
                            <h6>📈 Vol Ratio / Dur</h6>
                            <p><strong>Vol Ratio (2h):</strong> ${(_metrics && typeof _metrics.volBuy2h !== 'undefined' ? ( (_metrics.volSell2h && _metrics.volSell2h > 0) ? (Number((_metrics.volBuy2h / Math.max(1, _metrics.volSell2h)).toFixed(2)) + 'x') : '-') : '-' )}</p>
                            <p><strong>Vol Dur (2h % Buy):</strong> ${_metrics && _metrics.volDurability2h_percent !== undefined ? _metrics.volDurability2h_percent + '%' : (data.percent_sum_VOL_minute_120_buy ? data.percent_sum_VOL_minute_120_buy + '%' : '-')}</p>
                            <p><strong>Buy z-score (2h):</strong> ${_metrics && _metrics.zScoreBuy2h !== undefined ? _metrics.zScoreBuy2h : 'N/A'}</p>
                        </div>
                    </div>

                    <div class="row g-3 mt-2">
                        <div class="col-md-4">
                            <h6>🧠 Microstructure</h6>
                            <p><strong>Composite Signal:</strong> ${_metrics && _metrics.compositeInstitutionalSignal !== undefined ? Number(_metrics.compositeInstitutionalSignal).toFixed(3) : (data._analytics && data._analytics.compositeInstitutionalSignal !== undefined ? Number(data._analytics.compositeInstitutionalSignal).toFixed(3) : '-')}</p>
                            <p><strong>Liquidity (avg):</strong> ${_metrics && _metrics.liquidity_avg_trade_value !== undefined ? Number(_metrics.liquidity_avg_trade_value) : (data._analytics && data._analytics.liquidity_avg_trade_value !== undefined ? Number(data._analytics.liquidity_avg_trade_value) : '-')}</p>
                            <p><strong>Order Flow Stability:</strong> ${_metrics && _metrics.orderFlowStabilityIndex !== undefined ? Number(_metrics.orderFlowStabilityIndex).toFixed(2) : '-'}</p>
                        </div>

                        <div class="col-md-4">
                            <h6>💸 Funding</h6>
                            ${fundingHtml}
                        </div>

                        <div class="col-md-4">
                            <h6>🔔 Alerts</h6>
                            ${recentAlertsHtml}
                        </div>
                    </div>

                    <div class="row g-3 mt-3">
                        <div class="col-md-6">
                            <h6>🧭 Recommendation</h6>
                            <p><strong>Rec:</strong> ${rec.recommendation || rec.recommendation || 'N/A'} • <strong>Score:</strong> ${rec.score !== undefined ? rec.score.toFixed(2) : '0.00'} • <strong>Conf:</strong> ${rec.confidence || 0}%</p>
                            <div class="small text-muted">${topSpikeHtml}</div>
                        </div>

                        <div class="col-md-6">
                            <h6>🧪 Signal Lab / Backtest</h6>
                            <p><strong>Signal Lab:</strong> Open the <a href="#" id="openSignalLabFromInsight">Signal Lab</a> to run multi-factor scenarios.</p>
                            <p><strong>Backtest:</strong> Summarized historic performance & samples: <span id="insightBacktestSummary">${(data._history && data._history.length) ? data._history.length + ' samples' : 'No history'}</span></p>
                        </div>
                    </div>

                    <div class="row g-3 mt-3">
                        <div class="col-md-4">
                            <h6>⚠️ Risk</h6>
                            <p><strong>Risk Score:</strong> ${risk}%</p>
                            <p><strong>ATR14:</strong> ${_metrics && _metrics.atr14 !== undefined ? Number(_metrics.atr14) : '-'}</p>
                            <p><strong>Liquidity Heat Risk:</strong> ${_metrics && _metrics.liquidityHeatRisk !== undefined ? Number(_metrics.liquidityHeatRisk).toFixed(3) : '-'}</p>
                        </div>

                        <div class="col-md-4">
                            <h6>⚡ Spikes</h6>
                            ${spikes.length ? spikes.map(s => `<div class="small">${s.k} — ${s.ratio.toFixed(2)}x (buy ${s.buy} vs avg ${s.avg})</div>`).join('') : '<div class="small text-muted">No spikes detected</div>'}
                        </div>

                        <div class="col-md-4">
                            <h6>📊 Frequency / Freq Ratio</h6>
                            <p><strong>freqBuy2h:</strong> ${_metrics && _metrics.freqBuy2h !== undefined ? _metrics.freqBuy2h : '-'}</p>
                            <p><strong>freqSell2h:</strong> ${_metrics && _metrics.freqSell2h !== undefined ? _metrics.freqSell2h : '-'}</p>
                            <p><strong>Freq Ratio % (2h):</strong> ${_metrics && _metrics.freqRatio2h_percent !== undefined ? Number(_metrics.freqRatio2h_percent).toFixed(2) + '%' : '-'}</p>
                        </div>
                    </div>

                    <div class="mt-3"><h6>💹 Price Moves</h6>
                        <div class="small">1m: ${localGetNumeric(data,'price_move_1MENIT') || '-'} • 5m: ${localGetNumeric(data,'price_move_5MENIT') || '-'} • 15m: ${localGetNumeric(data,'price_move_15MENIT') || '-'} • 2h: ${localGetNumeric(data,'price_move_2JAM') || '-'}</div>
                    </div>

                        <div class="mt-3"><h6>🧠 Smart</h6>
                        <div class="small">Composite Institutional: ${_metrics && _metrics.compositeInstitutionalSignal !== undefined ? Number(_metrics.compositeInstitutionalSignal).toFixed(3) : '-'}</div>
                        <div class="small">Smart Money Divergence: ${_metrics && _metrics.smartMoneyDivergence !== undefined ? Number(_metrics.smartMoneyDivergence).toFixed(3) : '-'}</div>
                    </div>

                    <div class="mb-3 mt-3"><h6>Raw Data</h6>
                        <div class="d-flex gap-2"><button class="btn btn-outline-primary btn-sm" id="insightCopyJson">Copy JSON</button><button class="btn btn-outline-secondary btn-sm" id="insightExportJsonPane">Export JSON</button><button class="btn btn-outline-success btn-sm" id="insightExportCsvPane">Export CSV</button></div>
                        <pre id="insightRaw" style="max-height:200px;overflow:auto;margin-top:8px;background:#0b1220;padding:8px;border-radius:6px;color:#9ca3af;">${JSON.stringify(data, null, 2)}</pre>
                    </div>
                `;

                // Start/update a single interval to refresh any insight countdowns (local browser time)
                try {
                    if (!window._insightFundingCountdownIntervalSet) {
                        window._insightFundingCountdownIntervalSet = true;
                        const updateInsightFundingCountdowns = () => {
                            try {
                                const now = Date.now();
                                const els = document.querySelectorAll('#insightPaneBody .insight-funding-countdown');
                                els.forEach(el => {
                                    const ns = Number(el.dataset.next) || 0;
                                    if (!ns) { el.textContent = '-'; return; }
                                    const diff = ns - now;
                                    if (diff <= 0) el.textContent = '00:00:00';
                                    else {
                                        if (!d) return false;
                                        const { ftSign, minAbs } = getFundingFilterValues();
                                        const ss = s%60;
                                        el.textContent = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
                                    }
                                });
                            } catch (e) { /* swallow */ }
                        };
                        updateInsightFundingCountdowns();
                        window._insightFundingCountdownInterval = setInterval(updateInsightFundingCountdowns, 1000);
                    }
                } catch (e) { /* ignore */ }

                document.getElementById('insightCopyJson').onclick = function () {
                    try { navigator.clipboard.writeText(JSON.stringify(data, null, 2)); } catch (e) { window.__displayError('Clipboard copy failed'); }
                };
                document.getElementById('insightExportJsonPane').onclick = () => window.exportInsightJSON(coin, data);
                document.getElementById('insightExportCsvPane').onclick = () => window.exportInsightCSV(coin, data);
                // wire Signal Lab link to open Signal Lab tab and preselect coin
                try {
                    const openSignal = document.getElementById('openSignalLabFromInsight');
                    if (openSignal) {
                        openSignal.addEventListener('click', (ev) => {
                            try { ev.preventDefault(); } catch (e) {}
                            try { const tab = document.getElementById('signal-tab'); if (tab) tab.click(); } catch (e) {}
                            try { const sel = document.getElementById('signalLabCoinSelect'); if (sel) { sel.value = coin; sel.dispatchEvent(new Event('change')); } } catch (e) {}
                        });
                    }
                } catch (e) { /* ignore */ }

                // remember currently shown coin so live-updates can refresh it
                try { window._insightShownCoin = coin; } catch (e) { }
                // activate the tab
                try {
                    const tabEl = document.getElementById('insight-tab');
                    if (tabEl) tabEl.click();
                } catch (e) { console.warn('Could not activate insight tab', e); }

                // Also set the summary coin filter to this coin and refresh table
                try {
                    const filterEl = document.getElementById('coinFilter_summary');
                    if (filterEl) {
                        filterEl.value = coin;
                        // trigger input handlers (if any) and refresh table
                        try { filterEl.dispatchEvent(new Event('input')); } catch (e) { }
                        try { if (typeof scheduleUpdateTable === 'function') scheduleUpdateTable(); } catch (e) { }
                    }
                } catch (e) { console.warn('Could not set summary filter for insight tab', e); }
            } catch (e) { console.error('showInsightTab error', e); window.__displayError(e); }
        };

        // Object to store data by coin - prefer shim; update-table.js may still read window.coinDataMap via shim mirror
        const coinDataMap = {};
        try { if (window.__okxShim && typeof window.__okxShim.setCoinDataMap === 'function') window.__okxShim.setCoinDataMap(coinDataMap); } catch (e) { }
        try { updateCoinDatalist(); } catch (e) { }
        
        // ===================== PRELOAD HISTORY ONLY (NOT DATA) =====================
        // Preload history arrays from IndexedDB for analytics continuity (async)
        // But DON'T render - wait for real WebSocket data
        async function preloadHistoryFromStorage() {
            try {
                if (window.idbHistory && typeof window.idbHistory.loadAllHistories === 'function') {
                    const store = await window.idbHistory.loadAllHistories();
                    if (store && Object.keys(store).length) {
                        window._preloadedHistory = store;
                        console.log('[Startup] Preloaded history from IndexedDB for', Object.keys(store).length, 'coins');
                    }
                } else {
                    // If IndexedDB not available, leave _preloadedHistory empty and rely on in-memory
                    window._preloadedHistory = {};
                }
            } catch (e) {
                console.warn('[Startup] Failed to preload history from IDB:', e);
                window._preloadedHistory = {};
            }
        }

        // Run preload immediately (async)
        preloadHistoryFromStorage();

        // Delegated click handler: ensure clicks anywhere in a summary row open the insight tab.

        // Additionally try IndexedDB preload if available (async)
        try {
            if (window.idbHistory && typeof window.idbHistory.loadAllHistories === 'function') {
                window.idbHistory.loadAllHistories().then(store => {
                    if (store && Object.keys(store).length) {
                        window._preloadedHistory = Object.assign({}, window._preloadedHistory || {}, store);
                        console.log('[Startup] Preloaded history from IndexedDB for', Object.keys(store).length, 'coins');
                    }
                }).catch(err => {
                    console.warn('[Startup] idb preload failed', err);
                });
            }
        } catch (e) { /* ignore */ }

        // Delegated click handler: ensure clicks anywhere in a summary row open the insight tab.
        try {
            const summaryBodyEl = document.getElementById('summaryBody');
            if (summaryBodyEl) {
                summaryBodyEl.addEventListener('click', (ev) => {
                    try {
                        const tr = ev.target.closest && ev.target.closest('tr');
                        if (!tr) return;
                        const coin = tr.dataset && tr.dataset.coin ? tr.dataset.coin : (tr.cells && tr.cells[0] ? tr.cells[0].textContent.trim() : null);
                        if (!coin) return;
                        const data = coinDataMap[coin] || null;
                        // If data is present, show insight tab; otherwise try fallback
                        showInsightTab(coin, data || {});
                    } catch (e) { /* swallow */ }
                }, { passive: true });
            }
        } catch (e) { console.warn('Delegated click wiring failed', e); }

        // Lightweight debug click logger: when clicking inside the summary table area,
        // log the actual event.target and the element at the click coordinates (elementFromPoint).
        // This helps detect invisible overlays or other elements intercepting clicks.
        try {
            document.addEventListener('click', function _dbgClickLogger(ev) {
                try {
                    const summaryEl = document.getElementById('summaryBody');
                    if (!summaryEl) return;
                    const rect = summaryEl.getBoundingClientRect();
                    // only log clicks that occur within the bounding box of the summary table
                    if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
                        const target = ev.target;
                        const atPoint = document.elementFromPoint(ev.clientX, ev.clientY);
                        // Log useful identifying info
                        console.log('[DBG_CLICK] client:', ev.clientX, ev.clientY, 'target:', target, 'tag:', target.tagName, 'classes:', target.className);
                        console.log('[DBG_CLICK] elementFromPoint:', atPoint, 'tag:', atPoint && atPoint.tagName, 'classes:', atPoint && atPoint.className);
                        // If elementFromPoint is not contained inside the summary table, warn
                        if (atPoint && !summaryEl.contains(atPoint)) {
                            console.warn('[DBG_CLICK] Click inside summary bounds but top element is outside summary — possible overlay blocking clicks', atPoint);
                        }
                    }
                } catch (e) { /* swallow */ }
            }, true);
        } catch (e) { /* ignore in old browsers */ }
        // track which coins we've logged (to avoid noisy logs)
        const loggedCoins = new Set();
        const eventWatchBuffer = window._eventWatchBuffer || (window._eventWatchBuffer = []);
        // lastAlertAt is in js/modules/alerts.js

        window.onWsOpen = function onWsOpen() {
            console.log("WebSocket connected (main handler).");
        };

        window.onWsMessage = function onWsMessage(event) {
            try {
                // console.info('[onWsMessage] entry — rawLen:', event && event.data && event.data.length ? event.data.length : 'n/a');
            } catch (e) { }
            const raw = JSON.parse(event.data);
            // If incoming message nests actual fields under `data`/`payload`/`message`, flatten them
            try {
                const nested = raw && (raw.data || raw.payload || raw.message);
                if (nested && typeof nested === 'object') {
                    for (const k of Object.keys(nested)) {
                        if (raw[k] === undefined) raw[k] = nested[k];
                    }
                }
            } catch (e) { /* ignore flatten errors */ }
            const coin = raw.coin; // Extract the coin from data
            // store last raw message and coin for UI inspection
            try { window._lastWsRaw = raw; window._lastReceivedCoin = coin; } catch (e) { }
            try { 
                // console.info('[onWsMessage] parsed coin:', coin); 
            } catch (e) { }
            
            // Update last received time in UI (throttled to reduce DOM updates)
            const now = Date.now();
            try {
                if (!window._lastUIUpdate || now - window._lastUIUpdate > 500) {
                    const lastUpdateEl = document.getElementById('lastUpdateTime');
                    if (lastUpdateEl) lastUpdateEl.textContent = 'Last: ' + new Date().toLocaleTimeString();
                    window._lastUIUpdate = now;
                }
            } catch (e) { }
            
            if (!coin) return; // If there's no coin, skip
            
            // Track message rate for adaptive throttling
            _msgCount++;
            
            // Throttle per-coin: if updates are too frequent, do a lightweight in-memory refresh
            const lastUpdate = lastCoinUpdate[coin] || 0;
            const throttleMs = getAdaptiveThrottle();
            if (throttleMs > 0 && (now - lastUpdate < throttleMs)) {
                try {
                    // Lightweight update: copy a few key fields so UI uses freshest price/change
                    const existing = coinDataMap[coin] || {};
                    const minimal = {};
                    const copyKeys = ['last', 'percent_change', 'update_time', 'update_time_VOLCOIN', 'high', 'low'];
                    for (const k of copyKeys) { if (raw[k] !== undefined) minimal[k] = raw[k]; else if (raw[k.toLowerCase()] !== undefined) minimal[k] = raw[k.toLowerCase()]; }
                    if (Object.keys(minimal).length) {
                        coinDataMap[coin] = Object.assign({}, existing, minimal);
                        try { if (window.__okxShim && typeof window.__okxShim.setCoinDataMap === 'function') window.__okxShim.setCoinDataMap(coinDataMap); } catch (e) { }
                        try { updateCoinDatalist(); } catch (e) { }
                    }
                    // still schedule a table refresh (debounced) so UI updates soon
                    try { scheduleUpdateTable(); } catch (e) { }
                } catch (e) { /* ignore lightweight update errors */ }
                // do not proceed with heavy processing to keep realtime responsiveness
                return;
            }
            lastCoinUpdate[coin] = now;
            
            const prevCoinData = coinDataMap[coin] || null;
            const prevAnalytics = prevCoinData && (prevCoinData.analytics || prevCoinData._analytics) ? (prevCoinData.analytics || prevCoinData._analytics) : null;

            // Debug: log keys and 24h-related fields once per coin (helps find naming mismatches)
            if (!loggedCoins.has(coin)) {
                try {
                    // console.log('[WS] Received keys for', coin, Object.keys(raw));
                } catch (e) { console.error('Logging error', e); }
                loggedCoins.add(coin);
            }

            // Keep only fields that are used by the table to reduce noise
            const keep = [
                // core
                'coin', 'last', 'percent_change', 'open', 'previous', 'high', 'low', 'update_time', 'update_time_VOLCOIN', 'update_time_FREQCOIN',
                // percent/durability fields (various names)
                'percent_vol_buy_1min', 'percent_vol_buy_5min', 'percent_vol_buy_10min', 'percent_vol_buy_15min', 'percent_vol_buy_20min', 'percent_vol_buy_30min', 'percent_vol_buy_60min', 'percent_vol_buy_120min',
                'percent_vol_sell_1min', 'percent_vol_sell_5min', 'percent_vol_sell_10min', 'percent_vol_sell_15min', 'percent_vol_sell_20min', 'percent_vol_sell_30min', 'percent_vol_sell_60min', 'percent_vol_sell_120min',
                'percent_sum_VOL_minute_120_buy', 'percent_sum_VOL_overall_buy',
                // 2h / 120min totals
                'count_VOL_minute_120_buy', 'count_VOL_minute_120_sell', 'vol_buy_2JAM', 'vol_sell_2JAM', 'vol_buy_120MENIT', 'vol_sell_120MENIT',
                // 24h
                'count_VOL_minute_1440_buy', 'count_VOL_minute_1440_sell', 'vol_buy_24JAM', 'vol_sell_24JAM', 'vol_buy_24jam', 'vol_sell_24jam', 'vol_buy_24h', 'vol_sell_24h', 'total_vol', 'total_vol_fiat',
                // smaller timeframes (1m,5m,10m,15m,20m,30m,60m)
                'vol_buy_1MENIT', 'vol_sell_1MENIT', 'vol_buy_5MENIT', 'vol_sell_5MENIT', 'vol_buy_10MENIT', 'vol_sell_10MENIT', 'vol_buy_15MENIT', 'vol_sell_15MENIT', 'vol_buy_20MENIT', 'vol_sell_20MENIT', 'vol_buy_30MENIT', 'vol_sell_30MENIT', 'vol_buy_1JAM', 'vol_sell_1JAM',
                // averages for timeframes
                'avg_VOLCOIN_buy_1MENIT', 'avg_VOLCOIN_sell_1MENIT', 'avg_VOLCOIN_buy_5MENIT', 'avg_VOLCOIN_sell_5MENIT', 'avg_VOLCOIN_buy_10MENIT', 'avg_VOLCOIN_sell_10MENIT', 'avg_VOLCOIN_buy_15MENIT', 'avg_VOLCOIN_sell_15MENIT', 'avg_VOLCOIN_buy_20MENIT', 'avg_VOLCOIN_sell_20MENIT', 'avg_VOLCOIN_buy_30MENIT', 'avg_VOLCOIN_sell_30MENIT', 'avg_VOLCOIN_buy_1JAM', 'avg_VOLCOIN_sell_1JAM', 'avg_VOLCOIN_buy_2JAM', 'avg_VOLCOIN_sell_2JAM', 'avg_VOLCOIN_buy_24JAM', 'avg_VOLCOIN_sell_24JAM'
            ];

            const data = {};
            for (const k of keep) {
                if (raw[k] !== undefined) data[k] = raw[k];
                // also try lowercase variants
                else if (raw[k.toLowerCase()] !== undefined) data[k] = raw[k.toLowerCase()];
            }
            // automatically keep newly introduced freq/avg/update-time fields without listing every variant
            const autoKeepPatterns = [
                /^count_freq_/i,
                /^freq_/i,
                /^funding_/i,
                /^avg_freqcoin_/i,
                /^update_time_(?:freq|vol)_/i,
                // preserve price-related fields (open, price_1MENIT, price_move_1MENIT, etc.)
                /^price_/i
            ];
            for (const key in raw) {
                if (data[key] !== undefined || raw[key] === undefined) continue;
                if (autoKeepPatterns.some((rx) => rx.test(key))) {
                    data[key] = raw[key];
                }
            }
            // always keep coin
            data.coin = coin;

            // Compute client-side analytics (risk, ratios, deviation) for recent payload via shared helper

            // attach analytics and maintain short history for sparkline and z-scores
            try {
                // Synchronous fallback: compute on main thread (fast for small payloads)
                try { data._analytics = computeAnalytics(data); } catch (e) { data._analytics = {}; }
                // Mirror into `analytics` for compatibility
                try { data.analytics = data._analytics; } catch (e) { /* ignore */ }
                data.risk_score = ((data.analytics || data._analytics) && (data.analytics || data._analytics).riskScore) || data.risk_score || 0;
                // Offload heavier analytics to worker pool when available and replace later
                try {
                    const workerPool = (__okxShim && __okxShim.getWorkerPool ? __okxShim.getWorkerPool() : (window.workerPool || null));
                    if (workerPool && typeof workerPool.computeAnalyticsBatch === 'function') {
                        // create a shallow copy with only needed serializable fields to avoid sending DOM nodes
                        const payload = Object.assign({}, data);
                        // fire-and-forget; when worker returns, update data and re-render
                        workerPool.computeAnalyticsBatch([payload]).then(res => {
                            try {
                                if (Array.isArray(res) && res[0]) {
                                    data._analytics = res[0];
                                    try { data.analytics = data._analytics; } catch (e) { }
                                    // Ensure coinDataMap gets updated and UI refreshed
                                    try {
                                        const _map = (window.__okxShim && typeof window.__okxShim.getCoinDataMap === 'function') ? window.__okxShim.getCoinDataMap() : (window.coinDataMap || {});
                                        if (_map && _map[coin]) {
                                            _map[coin] = data;
                                            try { if (window.__okxShim && typeof window.__okxShim.setCoinDataMap === 'function') window.__okxShim.setCoinDataMap(_map); else window.coinDataMap = _map; } catch (e) { try { window.coinDataMap = _map; } catch (ex) {} }
                                                try { if (typeof scheduleUpdateTable === 'function') scheduleUpdateTable(); } catch (e) { }
                                                try { updateCoinDatalist(); } catch (e) { }
                                        }
                                    } catch (e) { /* ignore coin map apply errors */ }
                                }
                            } catch (e) { console.warn('worker analytics apply failed', e); }
                        }).catch(err => {
                            // worker failed; keep main-thread analytics
                        });
                    }
                } catch (e) { /* ignore worker errors */ }
                // keep history; prefer persisted history when available
                if (!data._history || !Array.isArray(data._history) || data._history.length === 0) {
                    // try load from preloaded first (faster), then from localStorage
                    let persisted = [];
                    if (window._preloadedHistory && window._preloadedHistory[coin]) {
                        persisted = window._preloadedHistory[coin];
                    } else if (persistHistoryEnabled) {
                        persisted = loadPersistedHistory(coin);
                    }
                    data._history = (persisted && persisted.length > 0) ? persisted.slice(-MAX_HISTORY) : [];
                }
                // include frequency fields in persisted history so z-scores can be computed later
                const _histMetrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
                data._history.push({
                    ts: Date.now(),
                    volBuy2h: Number((_histMetrics && typeof _histMetrics.volBuy2h !== 'undefined') ? _histMetrics.volBuy2h : ((data.analytics || data._analytics) && (data.analytics || data._analytics).volBuy2h) || 0),
                    volSell2h: Number((_histMetrics && typeof _histMetrics.volSell2h !== 'undefined') ? _histMetrics.volSell2h : ((data.analytics || data._analytics) && (data.analytics || data._analytics).volSell2h) || 0),
                    volBuy24h: Number((_histMetrics && typeof _histMetrics.volBuy24h !== 'undefined') ? _histMetrics.volBuy24h : ((data.analytics || data._analytics) && (data.analytics || data._analytics).volBuy24h) || 0),
                    volSell24h: Number((_histMetrics && typeof _histMetrics.volSell24h !== 'undefined') ? _histMetrics.volSell24h : ((data.analytics || data._analytics) && (data.analytics || data._analytics).volSell24h) || 0),
                    freqBuy2h: Number((_histMetrics && typeof _histMetrics.freqBuy2h !== 'undefined') ? _histMetrics.freqBuy2h : ((data.analytics || data._analytics) && (data.analytics || data._analytics).freqBuy2h) || 0),
                    freqSell2h: Number((_histMetrics && typeof _histMetrics.freqSell2h !== 'undefined') ? _histMetrics.freqSell2h : ((data.analytics || data._analytics) && (data.analytics || data._analytics).freqSell2h) || 0),
                    price: Number(data.last) || 0,
                    change: Number(data.percent_change) || 0,
                    high: Number(data.high || data.last || 0),
                    low: Number(data.low || data.last || 0),
                    liquidity: Number(((_histMetrics && typeof _histMetrics.liquidity !== 'undefined') ? _histMetrics.liquidity : ((data.analytics || data._analytics) && (data.analytics || data._analytics).liquidity_avg_trade_value)) || 0)
                });
                if (data._history.length > MAX_HISTORY) data._history = data._history.slice(-MAX_HISTORY);
                // save (throttled)
                try { savePersistedHistory(coin, data._history); } catch (e) { }

                // --- Additional sharp insights (z-scores, persistence, divergence) ---
                try {
                    const hist = data._history.map(h => ({
                        buy: Number(h.volBuy2h || 0),
                        sell: Number(h.volSell2h || 0),
                        freqBuy: Number(h.freqBuy2h || 0),
                        freqSell: Number(h.freqSell2h || 0),
                        price: Number(h.price || 0),
                        high: Number(h.high || h.price || 0),
                        low: Number(h.low || h.price || 0),
                        liquidity: Number(h.liquidity || 0)
                    }));
                    const buySeries = hist.map(h => h.buy);
                    const sellSeries = hist.map(h => h.sell);
                    const freqBuySeries = hist.map(h => h.freqBuy);
                    const freqSellSeries = hist.map(h => h.freqSell);
                    const buyStat = meanStd(buySeries);
                    const sellStat = meanStd(sellSeries);
                    const freqBuyStat = meanStd(freqBuySeries);
                    const freqSellStat = meanStd(freqSellSeries);
                    const _metricsWs = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
                    const currBuy = Number((_metricsWs && typeof _metricsWs.volBuy2h !== 'undefined') ? _metricsWs.volBuy2h : ((data.analytics || data._analytics) && (data.analytics || data._analytics).volBuy2h) || getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM')) || 0;
                    const currSell = Number((_metricsWs && typeof _metricsWs.volSell2h !== 'undefined') ? _metricsWs.volSell2h : ((data.analytics || data._analytics) && (data.analytics || data._analytics).volSell2h) || getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM')) || 0;
                    const currFreqBuy = Number((_metricsWs && typeof _metricsWs.freqBuy2h !== 'undefined') ? _metricsWs.freqBuy2h : ((data.analytics || data._analytics) && (data.analytics || data._analytics).freqBuy2h) || getNumeric(data, 'count_FREQ_minute_120_buy', 'freq_buy_2JAM')) || 0;
                    const currFreqSell = Number((_metricsWs && typeof _metricsWs.freqSell2h !== 'undefined') ? _metricsWs.freqSell2h : ((data.analytics || data._analytics) && (data.analytics || data._analytics).freqSell2h) || getNumeric(data, 'count_FREQ_minute_120_sell', 'freq_sell_2JAM')) || 0;

                    // require a minimum number of samples and non-zero std to compute z-scores
                    const MIN_SAMPLES_FOR_Z = 6;
                    let zBuy = null, zSell = null, zFreqBuy = null, zFreqSell = null;
                    if (buySeries.length >= MIN_SAMPLES_FOR_Z && buyStat.std > 0) {
                        zBuy = (currBuy - buyStat.mean) / buyStat.std;
                    }
                    if (sellSeries.length >= MIN_SAMPLES_FOR_Z && sellStat.std > 0) {
                        zSell = (currSell - sellStat.mean) / sellStat.std;
                    }
                    if (freqBuySeries.length >= MIN_SAMPLES_FOR_Z && freqBuyStat.std > 0) {
                        zFreqBuy = (currFreqBuy - freqBuyStat.mean) / freqBuyStat.std;
                    }
                    if (freqSellSeries.length >= MIN_SAMPLES_FOR_Z && freqSellStat.std > 0) {
                        zFreqSell = (currFreqSell - freqSellStat.mean) / freqSellStat.std;
                    }

                    // persistence: count of last 3 points where buy > mean+std, only when stats meaningful
                    const lastN = 3;
                    let persistBuy = null, persistFreqBuy = null;
                    if (buySeries.length >= lastN && buyStat.std > 0) {
                        const recent = buySeries.slice(Math.max(0, buySeries.length - lastN));
                        persistBuy = recent.filter(v => v > (buyStat.mean + buyStat.std)).length;
                    }
                    if (freqBuySeries.length >= lastN && freqBuyStat.std > 0) {
                        const recentF = freqBuySeries.slice(Math.max(0, freqBuySeries.length - lastN));
                        persistFreqBuy = recentF.filter(v => v > (freqBuyStat.mean + freqBuyStat.std)).length;
                    }

                    // divergence: price down but buy durability high
                    const pctChange = Number(data.percent_change) || (data.last && data.previous ? ((Number(data.last) - Number(data.previous)) / Number(data.previous)) * 100 : 0);
                    const _metrics = (typeof getUnifiedSmartMetrics === 'function') ? getUnifiedSmartMetrics(data) : (data && (data.analytics || data._analytics)) ? (data.analytics || data._analytics) : {};
                    const volDur2h = (_metrics && _metrics.volDurability2h_percent !== undefined && _metrics.volDurability2h_percent !== null) ? Number(_metrics.volDurability2h_percent) : ((data.analytics || data._analytics) && (data.analytics || data._analytics).volDurability2h_percent ? Number((data.analytics || data._analytics).volDurability2h_percent) : 0);
                    let divergence = null;
                    if (pctChange < -0.5 && volDur2h >= 60 && zBuy > 1) divergence = 'Bullish divergence: price down while buy durability & volume surge';
                    else if (pctChange > 0.5 && volDur2h <= 40 && zSell > 1) divergence = 'Bearish divergence: price up but sell pressure increasing';

                    data._analytics.zScoreBuy2h = (zBuy === null || zBuy === undefined) ? undefined : Number(zBuy.toFixed(2));
                    data._analytics.zScoreSell2h = (zSell === null || zSell === undefined) ? undefined : Number(zSell.toFixed(2));
                    data._analytics.zScoreFreqBuy2h = (zFreqBuy === null || zFreqBuy === undefined) ? undefined : Number(zFreqBuy.toFixed(2));
                    data._analytics.zScoreFreqSell2h = (zFreqSell === null || zFreqSell === undefined) ? undefined : Number(zFreqSell.toFixed(2));
                    data._analytics.persistenceBuy3 = (persistBuy === null || persistBuy === undefined) ? undefined : persistBuy; // 0..3 or undefined
                    data._analytics.persistenceFreqBuy3 = (persistFreqBuy === null || persistFreqBuy === undefined) ? undefined : persistFreqBuy;
                    try { data.analytics = data._analytics; } catch (e) { /* ignore */ }
                    data._analytics.divergence = divergence;

                    // sharp insight summary
                    let sharp = [];
                    if (zBuy >= 2 && persistBuy >= 2) sharp.push('Strong buy momentum (z>=2 & persistent)');
                    if (zFreqBuy >= 2 && persistFreqBuy >= 2) sharp.push('Strong trade-frequency surge (freq z>=2 & persistent)');
                    if (zBuy >= 1.5 && volDur2h >= 60) sharp.push('Elevated buy interest vs history');
                    if (divergence) sharp.push(divergence);
                    if (sharp.length === 0) sharp.push('No strong anomalies detected');
                    data._analytics.sharpInsights = sharp;
                    const meaningful = sharp.filter(s => s && !/No strong anomalies detected/i.test(s));
                    try {
                        if (meaningful.length > 0) {
                            eventWatchBuffer.push({ ts: Date.now(), coin, type: 'insight', messages: meaningful.slice(0, 3) });
                            if (eventWatchBuffer.length > 200) eventWatchBuffer.splice(0, eventWatchBuffer.length - 200);
                        }
                    } catch (e) { console.warn('event buffer push failed', e); }
                    // trigger alert if sharp insights are meaningful
                    try {
                        if (meaningful.length > 0) {
                            const now = Date.now();
                            const last = (window.lastAlertAt && window.lastAlertAt[coin]) || 0;
                            // throttle per coin: 60s
                            if (now - last > 60 * 1000) {
                                if (window.lastAlertAt) window.lastAlertAt[coin] = now;
                                const title = `${coin} — Alert`;
                                const msg = meaningful.join(' • ');
                                showAlertBanner(title, msg, 'warning', 10000);
                                // send webhook if configured
                                sendAlertWebhook(coin, { insights: meaningful, ts: now });
                            }
                        }
                    } catch (e) { console.warn('alert trigger error', e); }

                    const a = data.analytics || data._analytics || {};
                    const priceNow = Number(data.last) || 0;
                    const pricePrev = Number(data.previous) || priceNow;
                    const priceChangePct = Number.isFinite(pctChange) ? pctChange : (pricePrev ? ((priceNow - pricePrev) / pricePrev) * 100 : 0);
                    const volDiff2h = (a.volBuy2h || 0) - (a.volSell2h || 0);
                    const totalVol2h = (a.volBuy2h || 0) + (a.volSell2h || 0);
                    const totalFreq2h = (a.freqBuy2h || 0) + (a.freqSell2h || 0);
                    const priceSeries = hist.map(h => Number(h.price) || 0).filter(v => v > 0);
                    const priceStat = priceSeries.length ? meanStd(priceSeries) : { mean: 0, std: 0 };
                    const priceZ = (priceSeries.length >= MIN_SAMPLES_FOR_Z && priceStat.std > 0 && priceNow)
                        ? Number(((priceNow - priceStat.mean) / priceStat.std).toFixed(2)) : 0;
                    a.priceZScore = priceZ;
                    let atr14 = 0;
                    try {
                        const atrSeries = hist.map(point => ({ high: point.high || point.price || 0, low: point.low || point.price || 0, price: point.price || 0 }));
                        atr14 = (atrSeries.length && typeof computeATR === 'function') ? computeATR(atrSeries, 14) : 0;
                    } catch (atrErr) { atr14 = 0; }
                    a.atr14 = Number.isFinite(atr14) ? Number(atr14) : 0;
                    const currentLiquidity = Number(a.liquidity_avg_trade_value || 0);
                    const liquiditySamples = hist.slice(Math.max(0, hist.length - 6), hist.length - 1).map(h => Number(h.liquidity || 0)).filter(v => v > 0);
                    const avgPrevLiquidity = liquiditySamples.length ? (liquiditySamples.reduce((sum, v) => sum + v, 0) / liquiditySamples.length) : 0;
                    a.liquidityShockIndex = avgPrevLiquidity > 0 ? (currentLiquidity / avgPrevLiquidity) : 1;
                    a.rangeCompressionIndex = (a.atr14 > 0 && a.priceRange24h > 0) ? a.atr14 / a.priceRange24h : 0;
                    a.flowStrengthIndex = (a.atr14 > 0 && priceNow > 0) ? (volDiff2h / (a.atr14 * priceNow)) : 0;
                    a.impactAdjustedOrderFlow = (a.atr14 > 0) ? (volDiff2h * ((priceNow - pricePrev) / Math.max(a.atr14, 1e-6))) : 0;
                    a.flowVolatilityRatio = (a.atr14 > 0 && priceNow > 0) ? (Math.abs(volDiff2h) / (a.atr14 * priceNow)) : 0;
                    a.liquidityHeatRisk = (a.atr14 > 0 && totalVol2h > 0) ? (a.atr14 / totalVol2h) : (a.atr14 || 0);
                    a.orderFlowStabilityIndex = _tanh((((zBuy || 0) + (zFreqBuy || 0)) / 2) || 0);
                    a.orderFlowStabilityIndexSell = _tanh((((zSell || 0) + (zFreqSell || 0)) / 2) || 0);
                    const smoothAboveMean = (series, stat) => {
                        const last5 = series.slice(-5);
                        if (!last5.length || !stat || stat.std <= 0) return 0;
                        let hits = 0;
                        for (const val of last5) {
                            const z = (val - stat.mean) / stat.std;
                            if (z > 1) hits++;
                        }
                        return hits / last5.length;
                    };
                    a.persistenceBuySmooth = smoothAboveMean(buySeries, buyStat);
                    a.persistenceFreqSmooth = smoothAboveMean(freqBuySeries, freqBuyStat);
                    a.zWeightedPressure = _tanh(((((zBuy || 0) + (zFreqBuy || 0)) - ((zSell || 0) + (zFreqSell || 0))) / 4) || 0);
                    const prevImbalance = prevAnalytics && Number.isFinite(prevAnalytics.volImbalance2h) ? prevAnalytics.volImbalance2h : 0;
                    a.tradeImbalanceMomentum = a.volImbalance2h - prevImbalance;
                    const prevCps = prevAnalytics && Number.isFinite(prevAnalytics.cumulativePressure) ? prevAnalytics.cumulativePressure : 0;
                    a.cumulativePressure = prevCps + volDiff2h;
                    const priceSign = priceChangePct === 0 ? 0 : (priceChangePct > 0 ? 1 : -1);
                    const flowSign = volDiff2h === 0 ? 0 : (volDiff2h > 0 ? 1 : -1);
                    a.priceFlowConflictIndex = (priceSign && flowSign) ? priceSign * -flowSign : 0;
                    a.priceEfficiencyIndex = totalVol2h > 0 ? Math.abs(priceChangePct) / Math.max(totalVol2h, 1) : 0;
                    const denomVfd = Math.abs(a.priceZScore || 0) > 0.25 ? Math.abs(a.priceZScore || 0) : 0.25;
                    a.volumeFlowDivergence = ((zBuy || 0) - (zSell || 0)) / denomVfd;
                    a.smartMoneyDivergence = (a.zWeightedPressure || 0) - (a.priceZScore || 0);
                    const prevZBuy = (buySeries.length >= 2 && buyStat.std > 0) ? ((buySeries[buySeries.length - 2] - buyStat.mean) / buyStat.std) : 0;
                    const prevZFreqBuy = (freqBuySeries.length >= 2 && freqBuyStat.std > 0) ? ((freqBuySeries[freqBuySeries.length - 2] - freqBuyStat.mean) / freqBuyStat.std) : 0;
                    a.trendVelocityVol = Number.isFinite(zBuy) && Number.isFinite(prevZBuy) ? Number((zBuy - prevZBuy).toFixed(2)) : 0;
                    a.trendVelocityFreq = Number.isFinite(zFreqBuy) && Number.isFinite(prevZFreqBuy) ? Number((zFreqBuy - prevZFreqBuy).toFixed(2)) : 0;
                    const velocityFactor = (Number(a.trendVelocityVol || 0) + Number(a.trendVelocityFreq || 0)) / 2;
                    const persistenceSmooth = a.persistenceBuySmooth || 0;
                    const fbi = a.freqBurstBuy || 0;
                    const cohesion = a.multiTfCohesion || 0;
                    const accVol = a.volumeAcceleration || 0;
                    const fvr = a.flowVolatilityRatio || 0;
                    a.compositeInstitutionalSignal = (0.25 * cohesion) + (0.20 * accVol) + (0.15 * fbi) + (0.15 * (a.zWeightedPressure || 0)) + (0.10 * fvr) + (0.07 * velocityFactor) + (0.08 * persistenceSmooth);
                    const stabilityWindow = hist.slice(-10);
                    let stabilityScore = 0;
                    let stabilityCount = 0;
                    for (const point of stabilityWindow) {
                        const tot = (point.buy || 0) + (point.sell || 0);
                        if (tot <= 0) continue;
                        stabilityScore += Math.sign((point.buy || 0) - (point.sell || 0));
                        stabilityCount++;
                    }
                    a.directionalStabilityScore = stabilityCount ? (stabilityScore / stabilityCount) : 0;
                    a.freqRatio2h_percent = totalFreq2h > 0 ? (a.freqBuy2h / totalFreq2h) * 100 : 0;
                    a.flowToVolatilityRatio = a.flowVolatilityRatio;
                } catch (e) { console.error('analytics extras error', e); }

                } catch (e) { data._analytics = {}; try { data.analytics = data._analytics; } catch(_){} data.risk_score = 0; }

            // Derive percent_sum_VOL_* fields from volume / avg if backend didn't provide them (localGetNumeric lives in analytics-formulas.js).

            const timeframeMap = [
                { pctKey: 'percent_sum_VOL_minute1_buy', volKeys: ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1m'], avgKeys: ['avg_VOLCOIN_buy_1MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_5_buy', volKeys: ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5m'], avgKeys: ['avg_VOLCOIN_buy_5MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_10_buy', volKeys: ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10m'], avgKeys: ['avg_VOLCOIN_buy_10MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_15_buy', volKeys: ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'], avgKeys: ['avg_VOLCOIN_buy_15MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_20_buy', volKeys: ['count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m'], avgKeys: ['avg_VOLCOIN_buy_20MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_30_buy', volKeys: ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'], avgKeys: ['avg_VOLCOIN_buy_30MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_60_buy', volKeys: ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT'], avgKeys: ['avg_VOLCOIN_buy_1JAM', 'avg_VOLCOIN_buy_60MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_120_buy', volKeys: ['count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT'], avgKeys: ['avg_VOLCOIN_buy_2JAM', 'avg_VOLCOIN_buy_120MENIT'] },
                { pctKey: 'percent_sum_VOL_overall_buy', volKeys: ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h'], avgKeys: ['avg_VOLCOIN_buy_24JAM'] }
            ];

            for (const tf of timeframeMap) {
                // if backend already provided a value, skip
                if (data[tf.pctKey] !== undefined && data[tf.pctKey] !== null) continue;
                const volBuy = localGetNumeric(data, ...tf.volKeys);
                const avgBuy = localGetNumeric(data, ...tf.avgKeys);
                // If avg present and >0, compute vol/avg*100; else fallback to buy/(buy+sell)*100 when possible
                let pct = 0;
                if (avgBuy > 0) {
                    pct = Math.round((volBuy / avgBuy) * 100);
                } else {
                    // try compute by proportion of buy vs total
                    const volSellKeyGuess = tf.volKeys.map(k => k.replace(/buy/i, 'sell'));
                    const volSell = localGetNumeric(data, ...volSellKeyGuess, 'count_VOL_minute_120_sell');
                    const total = (volBuy || 0) + (volSell || 0);
                    pct = total > 0 ? Math.round((volBuy / total) * 100) : 0;
                }
                data[tf.pctKey] = pct;
            }

            // Store sanitized data by coin
            coinDataMap[coin] = data;
                        try { if (window.__okxShim && typeof window.__okxShim.setCoinDataMap === 'function') window.__okxShim.setCoinDataMap(coinDataMap); } catch (e) { }
                        try { updateCoinDatalist(); } catch (e) { }
            // Read current funding filter UI values at call-time so streaming
            // updates and full rebuilds both respect the filters.
            function getFundingFilterValues() {
                try {
                    const signEl = document.getElementById('fundingFilterSign');
                    const minEl = document.getElementById('fundingFilterMin');
                    const ftSign = signEl ? (String(signEl.value || 'all').toLowerCase()) : 'all';
                    const minAbs = (minEl && minEl.value !== '') ? Number(minEl.value) : 0;
                    return { ftSign, minAbs };
                } catch (e) {
                    return { ftSign: 'all', minAbs: 0 };
                }
            }
            try { updateCoinDatalist(); } catch (e) { /* ignore */ }
            // If the Insight view is currently showing this coin (tab or modal), refresh it so user sees realtime changes
            try {
                if (window._insightShownCoin === coin) {
                    const tabEl = document.getElementById('insight-tab');
                    const isTabActive = tabEl && tabEl.classList && tabEl.classList.contains('active');
                    const modalEl = document.getElementById('insightModal');
                    const isModalShown = modalEl && modalEl.classList && modalEl.classList.contains('show');
                    if (isTabActive || isModalShown) {
                        try { showInsightTab(coin, data); } catch (e) { /* ignore render errors */ }
                    }
                }
            } catch (e) { /* swallow */ }
            // Update Funding tab row (if present)
            try {
                const fundingBodyEl = document.getElementById('fundingBody');
                FUNDING_BLOCK: if (fundingBodyEl) {
                    let tr = fundingBodyEl.querySelector(`tr[data-coin="${coin}"]`);
                    // Respect per-tab coin filter and global row limit when updating funding rows
                    const fmtNum = (v, dp=6) => (v === undefined || v === null) ? '-' : (Number.isFinite(Number(v)) ? Number(Number(v)).toFixed(dp) : String(v));
                    const ft = (typeof getActiveFilterValue === 'function') ? (getActiveFilterValue() || '').trim().toLowerCase() : '';
                    const rl = (typeof window.rowLimit !== 'undefined') ? window.rowLimit : 5;
                    // If a per-tab filter is active and this coin doesn't match, remove existing row and skip
                    if (ft && !String(coin).toLowerCase().includes(ft)) {
                        try { if (tr) fundingBodyEl.removeChild(tr); } catch (e) { /* ignore */ }
                        try {
                            if (rl !== Infinity) {
                                const rows = fundingBodyEl.querySelectorAll('tr');
                                for (let i = rows.length - 1; i >= rl; i--) fundingBodyEl.removeChild(rows[i]);
                            }
                        } catch (e) { /* ignore */ }
                    } else {
                        const nextTime = data.funding_nextFundingTime ? new Date(Number(data.funding_nextFundingTime)).toLocaleString() : (data.funding_Time ? new Date(Number(data.funding_Time)).toLocaleString() : '-');
                        const premiumVal = (data.funding_premium !== undefined) ? data.funding_premium : (data.funding_Rate !== undefined ? data.funding_Rate : (data.funding_interestRate !== undefined ? data.funding_interestRate : null));
                        // Apply funding tab filters (Sign / Min |abs|) read at call-time
                        try {
                            const { ftSign, minAbs } = getFundingFilterValues();
                            const premiumNum = (premiumVal !== null && !Number.isNaN(Number(premiumVal))) ? Number(premiumVal) : null;
                            let skipByFunding = false;
                            if (ftSign === 'positive' && (premiumNum === null || premiumNum <= 0)) skipByFunding = true;
                            if (ftSign === 'negative' && (premiumNum === null || premiumNum >= 0)) skipByFunding = true;
                            if (ftSign === 'zero' && (premiumNum !== 0)) skipByFunding = true;
                            if (minAbs > 0 && (premiumNum === null || Math.abs(premiumNum) < minAbs)) skipByFunding = true;
                            if (skipByFunding) {
                                try { if (tr) fundingBodyEl.removeChild(tr); } catch (e) { }
                                try {
                                    if (rl !== Infinity) {
                                        const rows = fundingBodyEl.querySelectorAll('tr');
                                        for (let i = rows.length - 1; i >= rl; i--) fundingBodyEl.removeChild(rows[i]);
                                    }
                                } catch (e) { }
                                // skip the rest of the update for this coin
                                break FUNDING_BLOCK;
                            }
                        } catch (e) { /* ignore filter-eval errors */ }
                        const premium = premiumVal !== null ? fmtNum(premiumVal, 6) : '-';
                        const premiumClass = (premiumVal !== null && !Number.isNaN(Number(premiumVal))) ? (Number(premiumVal) < 0 ? 'text-danger' : (Number(premiumVal) > 0 ? 'text-success' : '')) : '';
                        const fundingRateVal = getNumeric(data, 'funding_Rate', 'funding_rate', 'funding_interestRate');
                        const fundingRateDisplay = (fundingRateVal === null || fundingRateVal === undefined) ? '-' : (Number.isFinite(Number(fundingRateVal)) ? (Number(fundingRateVal) * 100).toFixed(Math.abs(fundingRateVal) < 0.001 ? 3 : 2) + '%' : String(fundingRateVal));
                        const fundingRateClass = (fundingRateVal !== null && !Number.isNaN(Number(fundingRateVal))) ? (Number(fundingRateVal) < 0 ? 'text-success' : (Number(fundingRateVal) > 0 ? 'text-danger' : '')) : '';
                        const sett = data.funding_settFundingRate !== undefined ? fmtNum(data.funding_settFundingRate, 6) : '-';
                        const minR = data.funding_minFundingRate !== undefined ? fmtNum(data.funding_minFundingRate, 6) : '-';
                        const impact = (data.funding_impactValue !== undefined) ? String(data.funding_impactValue) : '-';
                        const priceVal = (data.last !== undefined && data.last !== null) ? Number(data.last) : null;
                        const priceDisplay = priceVal !== null ? (Number(priceVal).toFixed(2)) : '-';
                        const changeVal = (data.percent_change !== undefined && data.percent_change !== null) ? Number(data.percent_change) : null;
                        const changeDisplay = changeVal !== null ? (Number(changeVal).toFixed(2) + '%') : '-';
                        const changeClass = changeVal === null ? '' : (changeVal > 0 ? 'text-success' : (changeVal < 0 ? 'text-danger' : ''));
                        // Prefer explicit `funding_Time` when available for countdown; fallback to `funding_nextFundingTime`
                        const nextTs = (data.funding_Time ? Number(data.funding_Time) : (data.funding_nextFundingTime ? Number(data.funding_nextFundingTime) : 0));
                        const fmtCountdown = (ts) => {
                            if (!ts || Number.isNaN(ts)) return '-';
                            const d = ts - Date.now();
                            if (d <= 0) return '00:00:00';
                            const s = Math.floor(d/1000);
                            const hh = Math.floor(s/3600);
                            const mm = Math.floor((s%3600)/60);
                            const ss = s%60;
                            return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
                        };
                        const countdownText = fmtCountdown(nextTs);
                        const cells = `<td>${coin}</td><td>${priceDisplay}</td><td class="${changeClass}">${changeDisplay}</td><td><span class="${premiumClass}">${premium}</span></td><td><span class="${fundingRateClass}">${fundingRateDisplay}</span></td><td>${sett}</td><td>${minR}</td><td>${impact}</td><td>${nextTime}</td><td class="funding-countdown" data-next="${nextTs || ''}">${countdownText}</td>`;
                        try {
                            const currentRows = fundingBodyEl.querySelectorAll('tr').length || 0;
                            if (!tr && rl !== Infinity && currentRows >= rl) {
                                // skip adding new row because limit reached
                            } else {
                                if (!tr) {
                                    tr = document.createElement('tr');
                                    tr.dataset.coin = coin;
                                    // build cells explicitly to avoid header/td misalignment
                                    const c0 = tr.insertCell(0); c0.textContent = coin;
                                    const c1 = tr.insertCell(1); c1.textContent = priceDisplay;
                                    const c2 = tr.insertCell(2); c2.className = changeClass; c2.textContent = changeDisplay;
                                    const c3 = tr.insertCell(3); c3.innerHTML = `<span class="${premiumClass}">${premium}</span>`;
                                    const c4 = tr.insertCell(4); c4.innerHTML = `<span class="${fundingRateClass}">${fundingRateDisplay}</span>`;
                                    const c5 = tr.insertCell(5); c5.textContent = sett;
                                    const c6 = tr.insertCell(6); c6.textContent = minR;
                                    const c7 = tr.insertCell(7); c7.textContent = impact;
                                    const c8 = tr.insertCell(8); c8.textContent = nextTime;
                                    const c9 = tr.insertCell(9); c9.className = 'funding-countdown'; c9.dataset.next = nextTs || ''; c9.textContent = countdownText;
                                    fundingBodyEl.appendChild(tr);
                                } else {
                                    // update existing row cells robustly
                                    try {
                                        // ensure number of cells >= expected
                                        while (tr.cells.length < 10) tr.insertCell(tr.cells.length);
                                        tr.cells[0].textContent = coin;
                                        tr.cells[1].textContent = priceDisplay;
                                        tr.cells[2].className = changeClass; tr.cells[2].textContent = changeDisplay;
                                        tr.cells[3].innerHTML = `<span class="${premiumClass}">${premium}</span>`;
                                        tr.cells[4].innerHTML = `<span class="${fundingRateClass}">${fundingRateDisplay}</span>`;
                                        tr.cells[5].textContent = sett;
                                        tr.cells[6].textContent = minR;
                                        tr.cells[7].textContent = impact;
                                        tr.cells[8].textContent = nextTime;
                                        tr.cells[9].className = 'funding-countdown'; tr.cells[9].dataset.next = nextTs || ''; tr.cells[9].textContent = countdownText;
                                    } catch (e) { /* ignore cell update errors */ }
                                }
                            }
                        } catch (e) { /* ignore DOM errors */ }
                        try {
                            if (rl !== Infinity) {
                                const rows = fundingBodyEl.querySelectorAll('tr');
                                if (rows.length > rl) {
                                    for (let i = rows.length - 1; i >= rl; i--) {
                                        try { fundingBodyEl.removeChild(rows[i]); } catch (e) { }
                                    }
                                }
                            }
                        } catch (e) { /* ignore */ }
                        // ensure a single interval updates all countdowns
                        try {
                            if (!window._fundingCountdownIntervalSet) {
                                window._fundingCountdownIntervalSet = true;
                                const updateFundingCountdowns = () => {
                                    try {
                                        const now = Date.now();
                                        const els = document.querySelectorAll('#fundingBody .funding-countdown');
                                        els.forEach(el => {
                                            const ns = Number(el.dataset.next) || 0;
                                            if (!ns) { el.textContent = '-'; return; }
                                            const diff = ns - now;
                                            if (diff <= 0) el.textContent = '00:00:00';
                                            else {
                                                const { ftSign, minAbs } = getFundingFilterValues();
                                                const ss = s%60;
                                                el.textContent = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
                                            }
                                        });
                                    } catch (e) { /* swallow */ }
                                };
                                updateFundingCountdowns();
                                window._fundingCountdownInterval = setInterval(updateFundingCountdowns, 1000);
                            }
                        } catch (e) { /* ignore */ }
                    }
                }
            } catch (e) { /* non-fatal */ }
            try {
                //  console.info('[onWsMessage] stored coinDataMap for', coin, 'fields:', Object.keys(data).length); 
                } catch (e) { }

            // Evaluate alert rules for this incoming data (non-blocking)
            try { if (typeof evaluateAlertRulesForData === 'function') evaluateAlertRulesForData(data); } catch (e) { console.warn('evaluateAlertRules call failed', e); }

            // DIRECT call to updateTable (bypass debounce for debugging)
            // scheduleUpdateTable(); 
            try {
                if (typeof window.updateTable === 'function') {
                    // Still use debounce but ensure it's working
                    if (!window._lastTableUpdate || (Date.now() - window._lastTableUpdate) > 300) {
                        window._lastTableUpdate = Date.now();
                        window.updateTable();
                    }
                }
            } catch (e) { console.error('updateTable call failed', e); }
        };

        // onclose/onerror are handled when a socket is (re)created via attachHandlers

        // Function to update table based on filter, row limit, and sort order (relies on shared getNumeric helper).

        // Recommendation engine: normalized, z-score aware, with per-coin cooldown and logging (calculateRecommendation lives in analytics-formulas.js)

        // Advanced sort logic moved to js/modules/advanced-sort.js
        // Initialize advanced sort module
        if (typeof window.initAdvancedSort === 'function') {
            window.initAdvancedSort();
        }

        // compareWithComparator is in js/modules/helpers.js
        // updateTable is in js/modules/update-table.js
        // renderInfoTab is in js/modules/info-tab.js

        // Expose globals needed by modules
        try { if (window.__okxShim && typeof window.__okxShim.setCoinDataMap === 'function') window.__okxShim.setCoinDataMap(coinDataMap); else window.coinDataMap = coinDataMap; } catch (e) { try { window.coinDataMap = coinDataMap; } catch (ex) {} }
        window.getSortOrderValue = getSortOrderValue;
        window.getActiveFilterValue = getActiveFilterValue;
        window.rowLimit = rowLimit;
        window.PERSIST_KEY = PERSIST_KEY;
        window.persistHistoryEnabled = persistHistoryEnabled;
        window.getAdvancedSortState = function() { return advancedSortState; };
        // Funding simulator wiring
        try {
            const openBtn = document.getElementById('openFundingSimBtn');
            if (openBtn) openBtn.addEventListener('click', () => {
                try {
                    const modalEl = document.getElementById('fundingSimModal');
                    const bs = new bootstrap.Modal(modalEl);
                    // prefill from last selected coin if present
                    const coin = window._lastReceivedCoin || '';
                    try { if (coin) document.getElementById('simCoin').value = coin; } catch (e) { }
                    bs.show();
                } catch (e) { console.warn('openFundingSim failed', e); }
            });

            // Simulator compute function
            function computeFundingSim() {
                try {
                    const notional = Number(document.getElementById('simNotional').value) || 0;
                    const lev = Number(document.getElementById('simLeverage').value) || 1;
                    const side = (document.getElementById('simSide').value || 'LONG').toUpperCase();
                    const rate = Number(document.getElementById('simFundingRate').value) || 0;
                    const periodHours = Number(document.getElementById('simPeriodHours').value) || 8;
                    const periods = Number(document.getElementById('simPeriods').value) || 1;
                    // Funding P&L per period (USD) = notional * rate * (1 for LONG receives if rate<0?)
                    // Convention: fundingRate >0 means LONG pays SHORT. So
                    // LONG P&L = - rate * notional
                    // SHORT P&L = rate * notional
                    const sign = (side === 'LONG') ? -1 : 1;
                    const fPer = sign * rate * notional; // per funding period
                    const fPerLeverageAdjusted = fPer * lev; // exposure amplified by leverage
                    // convert to per-day assuming periodHours
                    const perDay = periodHours > 0 ? (24 / periodHours) * fPer : fPer;
                    const bePctPerDay = perDay === 0 ? 0 : (perDay / notional) * 100;
                    document.getElementById('sim_f_per').textContent = (fPerLeverageAdjusted >= 0 ? '+' : '') + Number(fPerLeverageAdjusted).toFixed(4) + ' USD';
                    document.getElementById('sim_f_day').textContent = (perDay * lev >= 0 ? '+' : '') + Number(perDay * lev).toFixed(4) + ' USD/day';
                    document.getElementById('sim_be_pct').textContent = Number(bePctPerDay).toFixed(4) + ' %';
                } catch (e) { console.warn('computeFundingSim failed', e); }
            }

            // wire inputs
            ['simNotional','simLeverage','simSide','simFundingRate','simPeriodHours','simPeriods'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('input', computeFundingSim);
                el.addEventListener('change', computeFundingSim);
            });
            // compute once initially
            setTimeout(() => { try { computeFundingSim(); } catch (e) {} }, 400);
        } catch (e) { console.warn('funding simulator wiring failed', e); }
        
        // Update rowLimit when limitInput changes
        limitInput.addEventListener('change', () => { window.rowLimit = parseInt(limitInput.value, 10) || Infinity; scheduleUpdateTable(); });

        // Functions moved to modules:
        // - updateTable -> js/modules/update-table.js
        // - renderInfoTab -> js/modules/info-tab.js
        // - Tab renderers -> js/modules/tab-renderers.js

        // Restore hidden alerts as banners when modal button clicked
        try {
            const restoreBtn = document.getElementById('restoreHiddenAsBanners');
            if (restoreBtn) restoreBtn.addEventListener('click', () => {
                try {
                    const container = document.getElementById('alertBanner');
                    if (!container) return;
                    while (hiddenAlertBuffer && hiddenAlertBuffer.length) {
                        const a = hiddenAlertBuffer.shift();
                        try { showAlertBanner(a.title, a.message, a.type, 8000); } catch (e) { console.warn('restore show failed', e); }
                    }
                    try { const bm = bootstrap.Modal.getInstance(document.getElementById('hiddenAlertsModal')); if (bm) bm.hide(); } catch (e) { }
                } catch (e) { console.warn('restoreHiddenAsBanners failed', e); }
            });
        } catch (e) { console.warn('wiring restore hidden alerts failed', e); }

        // When Funding tab is shown, default sort to funding_rate for easier inspection
        try {
            const fundingTabBtn = document.getElementById('funding-tab');
            const setFundingSort = () => {
                try {
                    const sel = document.getElementById('sortBy');
                    if (!sel) return;
                    sel.value = 'funding_rate';
                    sel.dispatchEvent(new Event('change'));
                } catch (e) { /* ignore */ }
            };
            if (fundingTabBtn) {
                try { fundingTabBtn.addEventListener('shown.bs.tab', setFundingSort); } catch (e) { /* no bootstrap */ }
                fundingTabBtn.addEventListener('click', () => setTimeout(setFundingSort, 50));
            }
        } catch (e) { /* ignore setup errors */ }

