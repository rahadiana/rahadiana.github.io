import * as Utils from '../utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="h-full grid grid-rows-2 gap-2">
            
            <!-- ROW 1: DATA QUALITY & ALERTS -->
            <div class="flex gap-2">
                
                <!-- LEFT: DATA QUALITY MONITOR -->
                <div class="panel flex-1">
                    <div class="panel-header">DATA FEED STATUS</div>
                    <div class="panel-content grid grid-cols-3 gap-2" id="data-quality">
                        <!-- Injected -->
                    </div>
                </div>

                <!-- RIGHT: ACTIVE ALERTS -->
                <div class="panel w-1/3">
                    <div class="panel-header">ACTIVE ALERTS</div>
                    <div class="panel-content space-y-1 overflow-y-auto scrollbar-thin" id="alerts-panel">
                        <!-- Injected -->
                    </div>
                </div>

            </div>

            <!-- ROW 2: UPDATE TIMESTAMPS & SYSTEM HEALTH -->
            <div class="flex gap-2">
                
                <!-- LEFT: UPDATE TIMESTAMPS -->
                <div class="panel flex-1">
                    <div class="panel-header">LAST UPDATE TIMES</div>
                    <div class="panel-content" id="timestamps">
                        <!-- Injected -->
                    </div>
                </div>

                <!-- RIGHT: WEBSOCKET STATS -->
                <div class="panel w-1/3">
                    <div class="panel-header">CONNECTION HEALTH</div>
                    <div class="panel-content flex flex-col justify-center" id="ws-stats">
                        <!-- Injected -->
                    </div>
                </div>

            </div>

        </div>
    `;
}

export function update(data, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
    const signalsObj = data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.signals || {};
    const analytics = (signalsObj.analytics && Object.keys(signalsObj.analytics).length > 0)
        ? signalsObj.analytics
        : (data.analytics || {});
    const micro = data.microstructure?.[profile] || {};

    updateDataQuality(data, analytics);
    updateAlerts(data, profile, timeframe, signalsObj, analytics, micro);
    updateTimestamps(data, analytics);
    updateWSStats(data);
}

function updateDataQuality(data, analytics) {
    const el = document.getElementById('data-quality');
    if (!el) return;

    // Check availability of each data source
    const sources = [
        { name: 'PRICE', available: !!data.raw?.PRICE, key: 'PRICE' },
        { name: 'VOLUME', available: !!data.raw?.VOL, key: 'VOL' },
        { name: 'FREQUENCY', available: !!data.raw?.FREQ, key: 'FREQ' },
        { name: 'OPEN INTEREST', available: !!data.raw?.OI, key: 'OI' },
        { name: 'ORDER BOOK', available: !!data.raw?.OB, key: 'OB' },
        { name: 'LSR', available: !!data.raw?.LSR, key: 'LSR' },
        { name: 'Funding', available: !!(data.FUNDING || data.raw?.FUNDING), key: 'FUNDING' },
        { name: 'SIGNALS', available: !!data.signals, key: 'SIGNALS' },
        { name: 'ANALYTICS', available: !!analytics, key: 'ANALYTICS' }
    ];

    const totalAvailable = sources.filter(s => s.available).length;
    const qualityScore = (totalAvailable / sources.length) * 100;

    el.innerHTML = sources.map(src => `
        <div class="bg-bb-dark border border-bb-border p-2 flex items-center justify-between">
            <span class="text-xs text-bb-muted">${src.name}</span>
            <span class="${src.available ? 'text-bb-green' : 'text-bb-red'} font-bold">
                ${src.available ? 'OK' : 'MISSING'}
            </span>
        </div>
    `).join('') + `
        <div class="col-span-3 bg-bb-panel border-2 ${qualityScore > 80 ? 'border-bb-green' : qualityScore > 50 ? 'border-bb-gold' : 'border-bb-red'} p-3 text-center">
            <div class="text-[10px] text-bb-muted mb-1 uppercase">OVERALL FEED QUALITY</div>
            <div class="text-3xl font-bold ${qualityScore > 80 ? 'text-bb-green' : qualityScore > 50 ? 'text-bb-gold' : 'text-bb-red'}">${qualityScore.toFixed(0)}%</div>
            <div class="text-xs mt-1 text-bb-muted">${totalAvailable}/${sources.length} feeds active</div>
        </div>
    `;
}

function updateAlerts(data, profile, timeframe, signals, analytics, micro) {
    const el = document.getElementById('alerts-panel');
    if (!el) return;

    // Generate alerts based on data conditions
    const alerts = [];

    // Check intensity
    const intensity = (Math.abs(micro.zPress?.zPress || 0) * 5) || 0;
    if (intensity > 10) {
        alerts.push({ level: 'HIGH', icon: '🔥', msg: `Extreme intensity detected` });
    }

    // Check funding
    const fbi = micro.fbi?.fbi || 0;
    if (Math.abs(fbi) > 80) {
        alerts.push({ level: 'EXTREME', icon: '⚡', msg: `Extreme funding bias: ${fbi.toFixed(0)}` });
    }

    // Check OI change
    const oiChange = data.raw?.OI?.oi_chg_1JAM || 0;
    if (Math.abs(oiChange) > 20) {
        alerts.push({ level: 'HIGH', icon: '📈', msg: `OI spike: ${oiChange > 0 ? '+' : ''}${oiChange.toFixed(1)}%` });
    }

    // Check confluences
    const conf = data.masterSignals?.[timeframe]?.[profile]?.confidence || 0;
    if (conf > 85) {
        alerts.push({ level: 'SIGNAL', icon: '🎯', msg: `High confluence: ${conf}%` });
    }

    // Check WPI
    const wpi = analytics.customMetrics?.WPI || 0;
    if (Math.abs(wpi) > 60) {
        alerts.push({ level: 'WHALE', icon: '🐋', msg: `Whale activity detected` });
    }

    if (alerts.length === 0) {
        el.innerHTML = `
            <div class="text-center text-bb-muted italic py-8">
                No active alerts. Monitoring conditions...
            </div>
        `;
    } else {
        el.innerHTML = alerts.map(alert => `
            <div class="bg-bb-dark border-l-4 ${alert.level === 'EXTREME' ? 'border-bb-red bg-red-900/20' : alert.level === 'HIGH' ? 'border-bb-gold' : 'border-bb-green'} p-2">
                <div class="flex items-center gap-2">
                    <span class="text-lg">${alert.icon}</span>
                    <div class="flex-1">
                        <div class="text-[9px] text-bb-muted uppercase">${alert.level}</div>
                        <div class="text-xs">${alert.msg}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function updateTimestamps(data, analytics) {
    const el = document.getElementById('timestamps');
    if (!el) return;

    // Since this is real-time streaming, show LIVE status instead of timestamps
    const components = [
        { name: 'Order Book', available: !!data.raw?.OB },
        { name: 'Volume', available: !!data.raw?.VOL },
        { name: 'OI', available: !!data.raw?.OI },
        { name: 'Funding', available: !!(data.FUNDING || data.raw?.FUNDING) },
        { name: 'Signals', available: !!data.signals },
        { name: 'Analytics', available: !!analytics },
        { name: 'Microstructure', available: !!data.microstructure }
    ];

    el.innerHTML = `
        <div class="grid grid-cols-2 gap-2">
            ${components.map(comp => {
        const statusColor = comp.available ? 'text-bb-green' : 'text-bb-red';
        const statusText = comp.available ? '● LIVE' : '○ NO DATA';
        return `
                    <div class="flex justify-between items-center text-xs border-b border-bb-border/30 pb-1">
                        <span class="text-bb-muted">${comp.name}</span>
                        <span class="${statusColor} font-bold text-[10px]">${statusText}</span>
                    </div>
                `;
    }).join('')}
        </div>
        
        <div class="mt-2 text-center text-[9px] text-bb-muted italic">
            Real-time streaming • Updates every ${data.raw?.PRICE?.last ? '~1s' : 'N/A'}
        </div>
    `;
}

function updateWSStats(data) {
    const el = document.getElementById('ws-stats');
    if (!el) return;

    // Mocked WS stats (in real implementation, track this in main.js)
    const stats = {
        uptime: '5m 23s',
        messagesReceived: 145,
        lastPing: '2s ago',
        reconnects: 0
    };

    el.innerHTML = `
        <div class="space-y-2">
            <div class="flex justify-between items-center bg-bb-dark border border-bb-green p-2">
                <span class="text-xs text-bb-muted">STATUS</span>
                <span class="text-bb-green font-bold">● CONNECTED</span>
            </div>

            <div class="bg-bb-dark border border-bb-border p-2 space-y-1">
                <div class="flex justify-between text-xs">
                    <span class="text-bb-muted">Uptime</span>
                    <span>${stats.uptime}</span>
                </div>
                <div class="flex justify-between text-xs">
                    <span class="text-bb-muted">Messages</span>
                    <span>${stats.messagesReceived}</span>
                </div>
                <div class="flex justify-between text-xs">
                    <span class="text-bb-muted">Last Ping</span>
                    <span class="text-bb-green">${stats.lastPing}</span>
                </div>
                <div class="flex justify-between text-xs">
                    <span class="text-bb-muted">Reconnects</span>
                    <span>${stats.reconnects}</span>
                </div>
            </div>
        </div>
    `;
}
