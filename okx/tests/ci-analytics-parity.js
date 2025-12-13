const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadScript(relPath) {
  const p = path.join(__dirname, '..', relPath);
  return fs.readFileSync(p, 'utf8');
}

const mathCode = loadScript('js/formulas/math-formulas.js');
const analyticsCode = loadScript('js/formulas/analytics-formulas.js');

const sandbox = { console: console, window: {}, Date: Date };
vm.createContext(sandbox);
vm.runInContext(mathCode, sandbox, { filename: 'math-formulas.js' });
vm.runInContext(analyticsCode, sandbox, { filename: 'analytics-formulas.js' });

const payloads = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-payloads.json'), 'utf8'));
let failures = 0;
for (const p of payloads) {
  const analytics = sandbox.computeAnalytics ? sandbox.computeAnalytics(p) : (p._analytics || {});
  p._analytics = analytics;
  p.analytics = analytics;

  // sanity parity checks
  const a = p.analytics || {};
  const legacy = p._analytics || {};

  const keysToCheck = [
    'timeframes',
    'summary',
    'freqBuyTotal',
    'freqSellTotal',
  ];

  for (const k of keysToCheck) {
    const av = a[k];
    const lv = legacy[k];
    const equal = JSON.stringify(av) === JSON.stringify(lv);
    if (!equal) {
      console.error(`Parity mismatch for ${p.coin} key=${k}\n  analytics=${JSON.stringify(av)}\n  _analytics=${JSON.stringify(lv)}`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`Parity test failed: ${failures} mismatches`);
  process.exit(1);
} else {
  console.log('Parity test passed: analytics and _analytics match for sample payloads');
  process.exit(0);
}
