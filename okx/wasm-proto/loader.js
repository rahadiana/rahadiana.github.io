// Example loader for browser usage (after running `wasm-pack build --target web`)
// Usage (ES module):
// import init, { compute_double } from '/wasm-proto/pkg/wasm_proto.js';
// await init('/wasm-proto/pkg/wasm_proto_bg.wasm');
// const out = compute_double(new Float64Array([1.0,2.0,3.0]));

export async function initWasm(baseUrl = '/wasm-proto/pkg') {
    // The wasm-pack 'web' target exposes a JS glue file named wasm_proto.js
    // which in turn references wasm_proto_bg.wasm. Import it dynamically.
    const scriptUrl = baseUrl + '/wasm_proto.js';
    // dynamic import of glue gives us an init function and exports
    const mod = await import(scriptUrl);
    // Some wasm-pack outputs expose default initializer `init`; return module
    return mod;
}
