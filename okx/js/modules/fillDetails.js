
export function open(fill) {
    if (!fill) return;

    // Remove existing modal if any
    const existing = document.getElementById('fill-details-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'fill-details-modal';
    backdrop.className = 'modal-backdrop'; // Uses existing naming or standard glassmorphism
    backdrop.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
    `;

    const sideColor = (fill.side || '').toUpperCase() === 'BUY' ? '#4ade80' : '#f87171';
    const ts = fill.fillTime ? new Date(parseInt(fill.fillTime)).toLocaleString() : (fill.ts ? new Date(fill.ts).toLocaleString() : '-');

    const modal = document.createElement('div');
    modal.className = 'glass-panel';
    modal.style = `
        width: 400px; padding: 24px; border-radius: 16px; 
        background: linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(15,15,15,0.98) 100%);
        border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        color: #fff; font-family: 'Inter', sans-serif;
    `;

    modal.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:12px">
            <h3 style="margin:0; font-size:18px; font-weight:800; color:var(--bb-gold, #fde047)">Trade Details</h3>
            <button id="close-fill-details" style="background:none; border:none; color:#777; cursor:pointer; font-size:20px; padding:4px">&times;</button>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; font-size:13px">
            <div>
                <div style="color:#777; margin-bottom:4px">Symbol</div>
                <div style="font-weight:700; font-size:15px">${fill.instId || '-'}</div>
            </div>
            <div style="text-align:right">
                <div style="color:#777; margin-bottom:4px">Side</div>
                <div style="font-weight:800; font-size:15px; color:${sideColor}">${(fill.side || '').toUpperCase()}</div>
            </div>

            <div>
                <div style="color:#777; margin-bottom:4px">Price</div>
                <div style="font-weight:700; color:#eee">${fill.fillPx || fill.px || '-'}</div>
            </div>
            <div style="text-align:right">
                <div style="color:#777; margin-bottom:4px">Size</div>
                <div style="font-weight:700; color:#eee">${fill.fillSz || fill.sz || '-'}</div>
            </div>

            <div>
                <div style="color:#777; margin-bottom:4px">Fee</div>
                <div style="font-weight:700; color:#f87171">${fill.fee || fill.feeUsdt || '0'} <span style="font-size:10px; color:#555">${fill.feeCcy || 'USDT'}</span></div>
            </div>
            <div style="text-align:right">
                <div style="color:#777; margin-bottom:4px">Realized PnL</div>
                <div style="font-weight:800; color:${Number(fill.pnl || 0) >= 0 ? '#4ade80' : '#f87171'}">$${Number(fill.pnl || 0).toFixed(4)}</div>
            </div>

            <div style="grid-column: span 2; border-top:1px solid rgba(255,255,255,0.05); padding-top:16px; margin-top:8px">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                    <span style="color:#777">Execution</span>
                    <span style="font-weight:600; color:${fill.execType === 'm' ? '#bb9af7' : '#eee'}">${fill.execType === 'm' ? 'Maker (Limit)' : 'Taker (Market)'}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                    <span style="color:#777">Trade ID</span>
                    <span style="font-family:monospace; font-size:11px; color:#aaa">${fill.tradeId || '-'}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                    <span style="color:#777">Order ID</span>
                    <span style="font-family:monospace; font-size:11px; color:#aaa">${fill.ordId || '-'}</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="color:#777">Time</span>
                    <span style="font-size:12px; color:#aaa">${ts}</span>
                </div>
            </div>
        </div>

        <button id="close-fill-details-btn" class="action-btn" style="width:100%; margin-top:24px; background: rgba(255,255,255,0.05); color:#ccc; border: 1px solid rgba(255,255,255,0.1)">Close</button>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    document.getElementById('close-fill-details').onclick = close;
    document.getElementById('close-fill-details-btn').onclick = close;
    backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
}

export default { open };
