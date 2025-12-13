/**
 * info-docs.js
 * Documentation content for the Info tab - rendered dynamically
 * This file contains all feature descriptions, column explanations, and metrics documentation
 */

(function() {
    'use strict';

    window.INFO_DOCS = {
        version: '2.1.0',
        lastUpdated: '2025-12-11',
        
        // ===================== Available Features =====================
        features: [
            { name: 'Price Moves', icon: '⚡', desc: 'Per-timeframe price move table (1m–24h) showing Past, Current and normalized percent change. Includes per-row Insight and quick-alert shortcuts.' },
            { name: 'Live Feed', icon: '📡', desc: 'Real-time WebSocket feed with heartbeat monitoring, exponential backoff reconnect, and adaptive throttling.' },
            { name: 'Summary Tab', icon: '📊', desc: 'Per-coin summary table with multi-criteria sorting. Click a row to open the Insight modal.' },
            { name: 'Smart Analysis', icon: '🧠', desc: 'Smart tab containing 12 metrics: SMI, Intensity, Divergence, Accumulation Score, Whale Activity, Retail/Institutional Ratio, Pressure, Trend, Breakout Probability, LSI, Market Mode, Smart Signal.' },
            { name: 'Recommendations', icon: '🎯', desc: 'Per-timeframe recommendations (1m–24h) plus an "All" consensus. Includes ATR-based TP/SL options.' },
            { name: 'Microstructure', icon: '🔬', desc: 'Order-flow metrics: Cohesion, Acc Vol, FBI, OFSI, FSI, Z-Press, TIM, CIS, LSI, Range Compression, PFCI.' },
            { name: 'Worker Pool', icon: '🧵', desc: 'Multi-threaded worker pool for heavy analytics to avoid blocking the UI.' },
            { name: 'Alerts System', icon: '🔔', desc: 'Banner alerts with sound, webhook integration, compact mode and an alert buffer limit (default max 200).' },
            { name: 'Data Persistence', icon: '💾', desc: 'Per-coin history (max 300 points) persisted to localStorage with basic quota management.' },
            { name: 'Advanced Sort', icon: '🔀', desc: 'Multi-criteria sorting with min/max filters and durability thresholds.' },
            { name: 'Export/Import', icon: '📦', desc: 'Export/import settings, history, and alerts as JSON; import via the Run JSON modal.' }
        ],

        // Additional feature details (implementation notes)
        details: {
            priceMoves: {
                title: 'Price Moves — Current & Percent Calculations',
                desc: 'The Price Moves table shows a `Current` column (latest trade price) and percent change for each timeframe. Percent is computed relative to the timeframe-specific past price using this formula: `percent = ((current - past) / past) * 100`.',
                notes: [
                    'If a timeframe metric is `price_move_5m`, the renderer expects that metric to contain the past price (price 5 minutes ago). The percent shown = ((last - price_5m) / price_5m) * 100.',
                    'Special case 24H: when available, the 24H past price is taken from `data.open` (the session open price) and the percent shown = ((last - open) / open) * 100.',
                    'Coloring: positive percents use the success color, negative use danger, neutral use warning. Non-semantic text remains white for readability.'
                ],
                example: 'Example: past=100, current=105 → percent = ((105-100)/100)*100 = 5.00%. For larger timeframes percent will typically shrink relative to shorter timeframes when moves are transient.'
            },
            tpSlControls: {
                title: 'TP/SL Controls',
                desc: 'Take-Profit / Stop-Loss controls allow setting global and per-coin TP% min/max, SL% max, and sensitivity sliders. Includes ATR-based TP/SL and an adaptive mode that widens TP/SL in volatile markets. Settings persist to localStorage and are included in exports.'
            },
            insightExport: {
                title: 'Insight Export / Import',
                desc: 'Export an Insight snapshot (history points, analytics, metadata) to JSON or CSV. Import restores snapshots via the Run JSON modal. Exports include timestamps and version data for compatibility checks.'
            },
            webhookTest: {
                title: 'Webhook Test',
                desc: 'The Alerts system supports webhook endpoints. The webhook test sends a representative payload (coin, metric, recommendation) for integrations (automation, notification bridges). Delivery failures surface in the Alerts UI.'
            },
            alertsRuleEditor: {
                title: 'Alerts & Rule Editor',
                desc: 'Create, edit and delete per-coin or global alert rules from the Alerts tab. Rules persist to localStorage and optionally deliver via webhook. Default price rules for common timeframes are created on first run (e.g. price drop/up across 1m–24h).',
                howItWorks: [
                    'Rules evaluate incoming payloads in real-time. For metrics prefixed with `price_move_` the engine computes a percent change using the same formula described in Price Moves before applying the rule comparator (>, <, >=, <=, =).',
                    '24H rules use `open` as the past reference when available.',
                    'Rules can be scoped to a single coin (symbol) or left blank to match all coins.',
                    'Rule storage keys: `okx_calc_alert_rules_v1` (rules) and `okx_calc_alerts_v1` (alert history).'
                ],
                example: 'Example rule: coin=BTC, metric=price_move_1m, op=<, threshold=-5 → fires when BTC drops more than 5% vs 1 minute ago.'
            },
            soundToggle: {
                title: 'Sound Toggle',
                desc: 'Per-alert sound toggle and a master mute option. Audio playback is non-blocking and respects browser autoplay policies; user interaction enables sound. Preferences persist across sessions.'
            },
            compactAlerts: {
                title: 'Compact Alerts Mode',
                desc: 'Compact mode limits visible banner alerts and moves older ones to a hidden list accessible via "Show hidden". This reduces UI noise while preserving alert history.'
            },
            debouncedUpdates: {
                title: 'UI Throttling / Debounce',
                desc: 'Heavy DOM updates are debounced (default 300ms) to avoid layout thrashing. The Microstructure tab uses a 1s throttle to balance responsiveness and CPU usage.'
            },
            cloneBeforeWorker: {
                title: 'Clone Before Worker',
                desc: 'Data sent to the worker pool is cloned (using `structuredClone` when available, otherwise JSON deep clone) to avoid race conditions between live WebSocket updates and worker computation.'
            },
            websocketHeartbeat: {
                title: 'WebSocket Heartbeat',
                desc: 'Client sends periodic pings and expects pongs; heartbeat thresholds (Healthy/Delayed/Stale) influence reconnect/backoff logic. Heartbeat status is displayed in the Info tab.'
            },
            alertBufferLimit: {
                title: 'Alert Buffer Limit',
                desc: 'Banner alerts are bounded (default max 200) to avoid memory growth. Older alerts move to a persisted history for export/pruning.'
            },
            createAndAttachCleanup: {
                title: 'createAndAttach Cleanup',
                desc: 'Dynamically created UI components register cleanup hooks that remove event listeners and DOM nodes to prevent memory leaks when tabs re-render.'
            },
            deterministicRecommendations: {
                title: 'Deterministic Recommendations',
                desc: 'Recommendation logic is pure and side-effect-free; UI interactions (sorting/preview) do not mutate computation inputs, ensuring reproducible results.'
            }
        },

        // ===================== Summary Tab Columns =====================
        summaryColumns: [
            { name: 'Coin', icon: '🪙', desc: 'Cryptocurrency symbol (BTC, ETH, etc.)' },
            { name: 'Price', icon: '💰', desc: 'Last trade price in USD' },
            { name: 'Change %', icon: '📈', desc: 'Percentage price change over the recent period' },
            { name: 'Price Pos', icon: '📍', desc: 'Price position within the High-Low range (0-100). 0 = Low, 100 = High' },
            { name: 'Recommendation', icon: '🎯', desc: 'Recommendation (BUY/SELL/HOLD) with a confidence percentage' },
            { name: 'Vol Dur', icon: '⚖️', desc: 'Volume Durability — buyer dominance within a timeframe' },
            { name: 'Risk', icon: '⚠️', desc: 'Risk score based on volatility and detected anomalies' }
        ],

        // ===================== Per-Tab Descriptions =====================
        tabs: [
            {
                name: 'Summary',
                icon: '📊',
                desc: 'High-level per-coin overview. Use this tab to quickly scan and sort markets by price, momentum, and recommendation.',
                contents: [
                    { title: 'What you see', items: [ 'Coin: symbol (e.g., BTC)', 'Price: last trade price', 'Change %: recent percent change', 'Price Pos: position within high-low range (0–100)', 'Recommendation: BUY/HOLD/SELL with confidence', 'Vol Dur: volume durability (buyer dominance)', 'Risk: volatility/anomaly score' ] },
                    { title: 'Interactions', items: [ 'Click a row to open the Insight modal for that coin', 'Sort by any column; multi-criteria advanced sort is available', 'Right-click or actions menu: pin, watch, export snapshot' ] }
                ]
            },
            {
                name: 'Price Moves',
                icon: '⚡',
                desc: 'Per-timeframe table showing past vs current prices and percent moves (1m → 24h). Designed to spot fast momentum and regime changes.',
                contents: [
                    { title: 'Columns', items: [ 'Timeframe: e.g., 1m, 5m, 15m, 1h, 4h, 24h', 'Past: the stored price at timeframe start (for 24h uses `open` when available)', 'Current: latest trade price (`data.last`)', 'Percent: ((current - past) / past) * 100 — colored by sign' ] },
                    { title: 'Quick actions', items: [ 'Open Insight for the coin', 'Create a quick alert for that timeframe (drop or rise)', 'Sort/filter by percent or absolute move' ] }
                ]
            },
            {
                name: 'Smart',
                icon: '🧠',
                desc: 'Composite analytics and smart-money signals. Combines order-flow and price metrics to surface regime-aware signals.',
                contents: [
                    { title: 'Key metrics', items: [ 'SMI (Smart Money Index): whale vs retail bias', 'Intensity: trade intensity vs baseline', 'Divergence: price vs flow divergence (interpretation + numeric value)', 'Accumulation Score, Whale Activity, R/I Ratio, Pressure, Trend, Breakout% and Smart Signal' ] },
                    { title: 'Use', items: [ 'Use Smart tab to prioritize coins with institutional flow or unusual activity', 'Combine SMI + Divergence + Accum Score to detect accumulation/distribution' ] }
                ]
            },
            {
                name: 'Microstructure',
                icon: '🔬',
                desc: 'Low-level order-flow and execution metrics useful for timing and micro-regime detection.',
                contents: [
                    { title: 'Metrics', items: [ 'Cohesion, Acc Vol, FBI, OFSI, FSI, Z-Press, TIM, CIS, LSI, Range Comp, PFCI' ] },
                    { title: 'When to consult', items: [ 'Short-term entries/exits, squeeze detection, and confirming breakouts', 'Use alongside Smart metrics for higher-confidence signals' ] }
                ]
            },
            {
                name: 'Insight',
                icon: '🔍',
                desc: 'Per-coin deep-dive modal: history, analytics, charts, and divergence interpretation.',
                contents: [
                    { title: 'Includes', items: [ 'Historical price series (persisted points)', 'Computed analytics over selected windows (flowBias, priceDir, divergence)', 'Interpretation string for divergence (e.g., BULL DIV) and numeric value; tooltip explains formula: divergence = flowBias - priceDir*0.5', 'Export snapshot to JSON/CSV' ] },
                    { title: 'Actions', items: [ 'Run scenario (replay recent points)', 'Export/Import snapshot', 'Open Alerts editor scoped to this coin' ] }
                ]
            },
            {
                name: 'Alerts',
                icon: '🔔',
                desc: 'Create and manage alert rules (global or per-coin). Rules evaluate live payloads and can trigger banners, sounds, and webhooks.',
                contents: [
                    { title: 'Rule fields', items: [ 'Coin (optional): scope to a single symbol', 'Metric: e.g., price_move_1m, SMI, Divergence, custom metrics', 'Operator: >, <, >=, <=, =', 'Threshold: numeric value (percent or metric unit)', 'Severity / Message: for banner and notification' ] },
                    { title: 'Behavior', items: [ 'For `price_move_*` metrics the engine computes percent vs current/past (24H uses `open`), then evaluates the comparator', 'Rules persist to `okx_calc_alert_rules_v1` and alerts to `okx_calc_alerts_v1`', 'Webhooks and sound can be enabled per alert' ] }
                ]
            },
            {
                name: 'Export / Import',
                icon: '📦',
                desc: 'Save and restore settings, history, and alerts as JSON. Useful for backups or sharing workspace state.',
                contents: [
                    { title: 'What is exported', items: [ 'UI settings, TP/SL preferences, alert rules, persisted history (limited size), and recent snapshots' ] },
                    { title: 'Notes', items: [ 'Imports validate version metadata where present', 'Large histories may be truncated; check import warnings' ] }
                ]
            },
            {
                name: 'Worker Pool & Settings',
                icon: '⚙️',
                desc: 'Background workers compute heavy analytics; settings control debounce, history length, and persistence.',
                contents: [
                    { title: 'Worker pool', items: [ 'Offloads analytics to web workers to keep UI responsive', 'Clones data before sending to workers to avoid races' ] },
                    { title: 'Settings', items: [ 'Adjust debounce/throttle, history length (default 300), alert buffer limit, and sound/webhook preferences' ] }
                ]
            }
        ],
        // ===================== Smart Tab Metrics =====================
        smartMetrics: [
            { name: 'SMI', fullName: 'Smart Money Index', icon: '💎', desc: 'Detects whale vs retail dominance. >150 = WHALE, 100-150 = MIXED, <100 = RETAIL.', range: '0-500' },
            { name: 'Intensity', fullName: 'Trade Intensity', icon: '⚡', desc: 'Trading intensity vs historical average. HIGH >70%, EXTREME >100%.', range: '0-200%' },
            { name: 'Divergence', fullName: 'Momentum Divergence', icon: '🔀', desc: 'Detects divergence between price and order flow. BULL DIV = flow bullish while price falls.', values: 'BULL DIV, BEAR DIV, BULLISH, BEARISH, NEUTRAL' },
            { name: 'Accum Score', fullName: 'Accumulation Score', icon: '📥', desc: 'Accumulation/distribution score. >70 = ACCUMULATION, <30 = DISTRIBUTION.', range: '0-100' },
            { name: 'Whale', fullName: 'Whale Activity', icon: '🐋', desc: 'Whale activity index derived from SMI, volume vs avg, and durability. HIGH >70.', range: '0-100' },
            { name: 'R/I Ratio', fullName: 'Retail/Institutional Ratio', icon: '👥', desc: 'Ratio of institutional (whale) to retail activity. Outputs: INST, INST+, MIXED, RETAIL+, RETAIL.', values: 'INST, INST+, MIXED, RETAIL+, RETAIL' },
            { name: 'Pressure', fullName: 'Pressure Index', icon: '📊', desc: 'Buy/sell pressure. Positive = BUY pressure, Negative = SELL pressure.', range: '-100 to +100' },
            { name: 'Trend', fullName: 'Trend Strength', icon: '📈', desc: 'Trend strength and direction. STRONG >70%, directions: UP/DOWN/SIDEWAYS.', range: '0-100%' },
            { name: 'Breakout%', fullName: 'Breakout Probability', icon: '💥', desc: 'Probability of breakout based on ATR compression, intensity spikes, and imbalance.', range: '0-100%' },
            { name: 'LSI', fullName: 'Liquidity Stress Index', icon: '💧', desc: 'Liquidity stress. HIGH = illiquid (large trades move market), LOW = liquid.', range: '0-100' },
            { name: 'Mode', fullName: 'Market Mode', icon: '🎭', desc: 'Market regime classification based on volatility and bias.', values: 'TREND, TREND_UP, TREND_DOWN, RANGE, SQUEEZE' },
            { name: 'Signal', fullName: 'Smart Signal', icon: '🚦', desc: 'Combined trading signal from all smart metrics.', values: 'BUY, HOLD, SELL' }
        ],

        // ===================== Microstructure Metrics =====================
        microMetrics: [
            { name: 'Cohesion', fullName: 'Cohesion Index', icon: '🔗', desc: 'Score of alignment between price, volume, and frequency. High = consistent buyer dominance.', range: '0-100' },
            { name: 'Acc Vol', fullName: 'Aggressive Volume', icon: '📊', desc: 'Accumulated aggressive delta volume (market buys vs sells).', unit: 'normalized' },
            { name: 'FBI', fullName: 'Frequency Burst Index', icon: '💨', desc: 'Short-term frequency ratio (1m/5m) vs 2h baseline. >1.0 = transaction burst.', range: '0-5+' },
            { name: 'OFSI', fullName: 'Order Flow Stability', icon: '📏', desc: 'Order flow stability. High = low noise and regular participation.', range: '0-100' },
            { name: 'FSI', fullName: 'Flow Strength Index', icon: '💪', desc: 'Flow strength across timeframes. >70 = buyer dominant.', range: '0-100' },
            { name: 'Z-Press', fullName: 'Z-Weighted Pressure', icon: '📐', desc: 'Z-score of volume and frequency pressure for identifying significant moves.', range: '-3 to +3' },
            { name: 'TIM', fullName: 'Trade Imbalance Momentum', icon: '⚖️', desc: 'Momentum of imbalance changes. Positive = buyers taking over.', range: '-100 to +100' },
            { name: 'CIS', fullName: 'Composite Institutional Signal', icon: '🏛️', desc: 'Composite institutional positioning score derived from Cohesion, FSI, FBI, TIM, LSI.', range: '0-100' },
            { name: 'LSI', fullName: 'Liquidity Shock Index', icon: '⚡', desc: 'Detects spikes or losses of liquidity. Extremes indicate potential breakout/slippage.', range: '0-100' },
            { name: 'Range Comp', fullName: 'Range Compression', icon: '🗜️', desc: 'ATR vs price range. Low = squeeze (breakout potential).', range: '0-100' },
            { name: 'PFCI', fullName: 'Price-Flow Conflict', icon: '⚔️', desc: 'Conflict between price and order flow. High = potential reversal.', range: '-100 to +100' }
        ],

        // ===================== Volume Durability =====================
        durabilityLevels: [
            { range: '67-100%', label: 'Excellent', class: 'bg-success', desc: 'Buyers strongly dominant' },
            { range: '50-66%', label: 'Good', class: 'bg-info', desc: 'Buyers slightly dominant' },
            { range: '34-49%', label: 'Neutral', class: 'bg-warning', desc: 'Balanced or sellers slightly dominant' },
            { range: '0-33%', label: 'Poor', class: 'bg-danger', desc: 'Sellers strongly dominant' }
        ],

        // ===================== Recommendation Algorithm =====================
        recommendations: {
            buy: {
                label: 'BUY',
                icon: '🟢',
                class: 'text-success',
                confidence: '≥60%',
                conditions: [
                    'Price Position ≤33% (near Low)',
                    'Volume Durability ≥67%',
                    'Buy/Sell Ratio >2.0',
                    'Smart Signal = BUY',
                    'Accumulation Score >60'
                ]
            },
            sell: {
                label: 'SELL',
                icon: '🔴',
                class: 'text-danger',
                confidence: '≥60%',
                conditions: [
                    'Price Position ≥67% (near High)',
                    'Volume Durability ≤33%',
                    'Buy/Sell Ratio <0.5',
                    'Smart Signal = SELL',
                    'Accumulation Score <40'
                ]
            },
            hold: {
                label: 'HOLD',
                icon: '🟡',
                class: 'text-warning',
                confidence: '<60%',
                conditions: [
                    'Market conditions neutral/mixed',
                    'No strong signals',
                    'Smart Signal = HOLD',
                    'Requires further monitoring'
                ]
            }
        },

        // ===================== Tips =====================
        tips: [
            { category: 'Screening', tip: 'Use Cohesion + CIS for quick screening of institutional positioning.' },
            { category: 'Timing', tip: 'Check LSI and Range Comp for entry timing. Squeeze = breakout potential.' },
            { category: 'Risk', tip: 'Use PFCI as a counter-trend risk filter.' },
            { category: 'Smart', tip: 'Combine SMI + Whale + Accum Score to detect whale accumulation.' },
            { category: 'Divergence', tip: 'BULL DIV when price falls = potential bullish reversal.' },
            { category: 'Mode', tip: 'SQUEEZE mode = low volatility, prepare for a potential large breakout.' }
        ],

        // ===================== WebSocket Status =====================
        wsStatus: {
            connected: { icon: '🟢', label: 'Connected', desc: 'WebSocket active and receiving data' },
            connecting: { icon: '🟡', label: 'Connecting', desc: 'Attempting to connect...' },
            disconnected: { icon: '🔴', label: 'Disconnected', desc: 'Connection lost; will attempt automatic reconnect' },
            heartbeat: {
                healthy: { icon: '💚', label: 'Healthy', desc: 'Activity <20s' },
                delayed: { icon: '💛', label: 'Delayed', desc: 'Activity 20–40s' },
                stale: { icon: '❤️', label: 'Stale', desc: 'No activity >40s' }
            }
        }
    };

    console.log('[INFO_DOCS] Loaded v' + window.INFO_DOCS.version);
})();
