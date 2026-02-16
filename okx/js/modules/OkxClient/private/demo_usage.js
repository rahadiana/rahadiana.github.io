// Demo usage for PrivateAPI and PrivateWS (not executed automatically)
// Adjust credentials and run in Node or browser environment that supports fetch and WebSocket

const PrivateAPI = require('./privateAPI');
const PrivateWS = require('./privateWS');

async function demo() {
  const cfg = {
    apiKey: 'YOUR_API_KEY',
    apiSecret: 'YOUR_API_SECRET',
    passphrase: 'YOUR_PASSPHRASE',
    simulatedTrading: true // set for demo trading
  };

  const api = new PrivateAPI(cfg);

  try {
    const bal = await api.getBalance();
    console.log('Balance demo:', bal);
  } catch (e) {
    console.error('Balance error:', e && e.message ? e.message : e);
  }

  // WebSocket demo (will attempt to connect)
  const ws = new PrivateWS(Object.assign({}, cfg, { url: 'wss://wspap.okx.com:8443/ws/v5/private' }));

  ws.on('open', () => console.log('WS open'));
  ws.on('login', (m) => console.log('WS login', m));
  ws.on('message', (m) => console.log('WS msg', m));
  ws.on('error', (e) => console.error('WS err', e));

  try {
    await ws.connect();
    const resp = await ws.subscribe([{ channel: 'positions', instType: 'ANY', extraParams: { updateInterval: '0' } }]);
    console.log('Subscribed', resp);
    // hold open for short demo then unsubscribe
    setTimeout(async () => {
      try { await ws.unsubscribe([{ channel: 'positions', instType: 'ANY', extraParams: { updateInterval: '0' } }]); } catch(e){}
      await ws.close();
    }, 5000);
  } catch (e) {
    console.error('WS demo error:', e && e.message ? e.message : e);
  }
}

module.exports = { demo };

// To run manually in Node (uncomment):
// require('./demo_usage').demo();
