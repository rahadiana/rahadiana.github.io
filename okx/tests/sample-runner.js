const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadScript(relPath) {
  const p = path.join(__dirname, '..', relPath);
  return fs.readFileSync(p, 'utf8');
}

// Load math helpers first (provides _tanh)
const mathCode = loadScript('js/formulas/math-formulas.js');
const analyticsCode = loadScript('js/formulas/analytics-formulas.js');

// Prepare sandbox with minimal globals expected by the browser code
const sandbox = {
  console: console,
  window: {},
  navigator: { hardwareConcurrency: 4 },
  Date: Date
};
vm.createContext(sandbox);

try {
  vm.runInContext(mathCode, sandbox, { filename: 'math-formulas.js' });
  vm.runInContext(analyticsCode, sandbox, { filename: 'analytics-formulas.js' });
} catch (e) {
  console.error('Failed to load formula scripts into sandbox:', e);
  process.exit(2);
}

const payloads = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-payloads.json'), 'utf8'));

let failed = 0;
for (const p of payloads) {
  // compute analytics and mirror to both shapes
  try {
    const analytics = sandbox.computeAnalytics ? sandbox.computeAnalytics(p) : (p._analytics || {});
    p._analytics = analytics;
    p.analytics = analytics;
  } catch (e) {
    console.error('computeAnalytics failed for', p.coin, e);
    failed++;
    continue;
  }

  const pricePos = (() => {
    const hi = Number(p.high) || Number(p.last) || 0;
    const lo = Number(p.low) || Number(p.last) || 0;
    const last = Number(p.last) || 0;
    if (hi - lo <= 0) return 50;
    return Math.round(((last - lo) / (hi - lo)) * 100);
  })();

  const rec = sandbox.calculateRecommendation ? sandbox.calculateRecommendation(p, pricePos, '120m', false) : null;
  console.log(`${p.coin}: got=${rec && rec.recommendation} expected=${p.expectedRecommendation} score=${rec && rec.score}`);
  if (!rec || rec.recommendation !== p.expectedRecommendation) {
    console.error('Mismatch for', p.coin, '->', rec);
    failed++;
  }
}

if (failed > 0) {
  console.error(`TESTS FAILED: ${failed} mismatches`);
  process.exit(1);
} else {
  console.log('All sample recommendations matched expected values.');
  process.exit(0);
}
