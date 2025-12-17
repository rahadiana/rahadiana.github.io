use wasm_bindgen::prelude::*;

// Small example prototype: accept a Float64Array, perform a simple heavy-ish
// numeric operation and return a Float64Array. Replace with real analytics
// code when prototyping.

#[wasm_bindgen]
pub fn compute_double(input: &js_sys::Float64Array) -> js_sys::Float64Array {
    let len = input.length() as usize;
    let mut v = vec![0f64; len];
    // copy input into Rust-owned Vec
    input.copy_to(&mut v);
    // cheap CPU-bound work (placeholder for real analytics)
    for x in &mut v {
        // example: some math-heavy ops
        *x = (*x).ln().abs().sqrt() + (*x) * 0.5;
    }
    // convert Vec back to Float64Array
    js_sys::Float64Array::from(v.as_slice())
}

// Example: compute VWAP (single scalar) from prices and volumes arrays
#[wasm_bindgen]
pub fn compute_vwap(prices: &js_sys::Float64Array, vols: &js_sys::Float64Array) -> js_sys::Float64Array {
    let n = prices.length() as usize;
    if vols.length() as usize != n || n == 0 {
        return js_sys::Float64Array::from(&[0.0][..]);
    }
    let mut p = vec![0f64; n];
    let mut v = vec![0f64; n];
    prices.copy_to(&mut p);
    vols.copy_to(&mut v);
    let mut num = 0f64;
    let mut den = 0f64;
    for i in 0..n {
        let pv = p[i];
        let vv = v[i];
        if vv.is_finite() && pv.is_finite() {
            num += pv * vv;
            den += vv;
        }
    }
    let vwap = if den == 0.0 { 0.0 } else { num / den };
    js_sys::Float64Array::from(&[vwap][..])
}
