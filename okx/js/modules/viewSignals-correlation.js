
function updateCorrelation(signals) {
    const el = document.getElementById('correlation-matrix');
    if (!el || !signals) return;

    // Flatten signals
    let items = [];
    Object.keys(signals).forEach(key => {
        const s = signals[key];
        if (s.direction) items.push({ id: key, dir: s.direction });
        else if (typeof s === 'object') {
            Object.keys(s).forEach(k => {
                if (s[k]?.direction) items.push({ id: `${key}.${k}`, dir: s[k].direction });
            });
        }
    });

    // Count by direction - support both BUY/SELL (legacy) and LONG/SHORT (new)
    const buyCount = items.filter(i => i.dir === 'BUY' || i.dir === 'LONG').length;
    const sellCount = items.filter(i => i.dir === 'SELL' || i.dir === 'SHORT').length;
    const neutralCount = items.filter(i => i.dir === 'NEUTRAL' || i.dir === 'NO_TRADE').length;
    const total = items.length;

    // Calculate correlation strength (simplified)
    const dominantCount = Math.max(buyCount, sellCount);
    const correlation = total > 0 ? (dominantCount / total) : 0;
    const noise = 1 - correlation;

    // Determine quality
    let quality = 'GOOD';
    let qualityColor = 'text-bb-green';
    if (noise > 0.5) {
        quality = 'NOISY';
        qualityColor = 'text-bb-red';
    } else if (noise > 0.3) {
        quality = 'MODERATE';
        qualityColor = 'text-bb-gold';
    }

    el.innerHTML = `
        <div class="grid grid-cols-3 gap-1 mb-2">
            <div class="text-center bg-bb-dark border border-bb-border p-1">
                <div class="text-[8px] text-bb-muted">BUY</div>
                <div class="text-lg font-bold text-bb-green">${buyCount}</div>
            </div>
            <div class="text-center bg-bb-dark border border-bb-border p-1">
                <div class="text-[8px] text-bb-muted">SELL</div>
                <div class="text-lg font-bold text-bb-red">${sellCount}</div>
            </div>
            <div class="text-center bg-bb-dark border border-bb-border p-1">
                <div class="text-[8px] text-bb-muted">NEUTRAL</div>
                <div class="text-lg font-bold text-bb-muted">${neutralCount}</div>
            </div>
        </div>

        <div class="space-y-1">
            <div class="flex justify-between items-center text-xs">
                <span class="text-bb-muted">Correlation</span>
                <span class="font-bold">${(correlation * 100).toFixed(0)}%</span>
            </div>
            <div class="w-full h-2 bg-bb-dark rounded overflow-hidden">
                <div class="bg-bb-green h-full" style="width: ${correlation * 100}%"></div>
            </div>

            <div class="flex justify-between items-center text-xs mt-1">
                <span class="text-bb-muted">Signal Noise</span>
                <span class="${qualityColor} font-bold">${quality}</span>
            </div>
        </div>
    `;
}
