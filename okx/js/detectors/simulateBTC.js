import createHiddenLiquidityDetector from './hiddenLiquidity.js';

// Simple synchronous step simulation that feeds a detector with a crafted BTC scenario
export function runDetailedBTCSimulation() {
  const det = createHiddenLiquidityDetector();
  const inst = 'BTC-USDT-SWAP';
  const now = Date.now();
  const steps = [];

  // 1) Initial book (calm)
  const book0 = { bids: [[42000, 50], [41990, 40], [41980, 30]], asks: [[42010, 45], [42020, 35], [42030, 20]], ts: now };
  det.feedBook(inst, book0);
  steps.push({t: 0, desc: 'Initial book snapshot (calm range 42k)', book: book0, signal: det.getSignal(inst)});

  // 2) Many small market sells hit the 42000 bid repeatedly while book refills
  for (let i = 1; i <= 8; i++) {
    const ts = now + i * 200; // 200ms apart
    // trade: small sell hitting bid
    det.feedTrade(inst, { price: 42000, size: 0.6, side: 'sell', ts });
    // book immediately shows a refill (simulated)
    det.feedBook(inst, { bids: [[42000, 50 + i], [41990, 40]], asks: [[42010, 45], [42020, 35]], ts: ts + 50 });

    steps.push({t: i, desc: `Small sell #${i} hits 42000 and book refills`, trade: {price:42000,size:0.6,side:'sell'}, bookRefill: {level:42000, size:50 + i}, signal: det.getSignal(inst)});
  }

  // 3) Large taker sell burst but price holds
  const burstStart = now + 9 * 200;
  for (let j = 0; j < 6; j++) {
    const ts = burstStart + j * 500;
    det.feedTrade(inst, { price: 42000, size: 5.0, side: 'sell', ts });
    // partial refill
    det.feedBook(inst, { bids: [[42000, 30 + j], [41990, 40]], asks: [[42010, 45], [42020, 35]], ts: ts + 100 });
    steps.push({t: 20 + j, desc: `Burst sell ${j + 1}x 5.0 at 42000`, trade: {price:42000,size:5.0,side:'sell'}, signal: det.getSignal(inst)});
  }

  // 4) On-chain and OI clues (external signals)
  det.feedExternal(inst, { onchain: 0.6, oi: 0.4 });
  steps.push({t: 100, desc: 'On-chain inflow and OI build detected (external feed)', external: {onchain:0.6, oi:0.4}, signal: det.getSignal(inst)});

  // 5) Evaluate final aggregated signal
  const final = det.getSignal(inst);
  steps.push({t: 200, desc: 'Final aggregated signal', signal: final});

  return { steps, final };
}

// Convenience CLI run when loaded as module in browser dev console
export default { runDetailedBTCSimulation };
