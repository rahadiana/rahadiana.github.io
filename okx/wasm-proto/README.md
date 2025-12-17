# wasm-proto

Prototype WASM module (Rust) for heavy numeric computation used in the dashboard.

Build (requires Rust + wasm-pack):

1. Install Rust (https://www.rust-lang.org/tools/install)
2. Install `wasm-pack`: `cargo install wasm-pack`
3. From this folder, run:

```bash
wasm-pack build --target web --out-dir pkg
```

This emits `pkg/wasm_proto.js` and `pkg/wasm_proto_bg.wasm` which can be loaded
from the web worker or main thread. Example loader shown in `loader.js`.

Notes:
- For zero-copy SharedArrayBuffer usage you'll need to enable COOP/COEP headers
  on your server (cross-origin isolation). Otherwise data crossing JS<->WASM
  requires copying into the WASM linear memory (via typed arrays).
