/*
 WebGPU configuration flags.
 Toggle which functions may use WebGPU when available.
 Loaded into worker and main thread as `globalThis.WEBGPU_CONFIG`.
*/
(function(global){
    'use strict';

    const DEFAULT = {
        // master switch: allow usage of WebGPU if available
        enabled: true,

        // per-function overrides (true = prefer GPU when available)
        enabledFunctions: {
            computeMultiply: true,
            computeSum: true,
            computeElementwiseMul: true,
            // Add app-specific function names here if you implement GPU versions:
            computeVWAPBands: true,
            computeCVD: true,
            computeRVOL: true,
            // computeAllSmartMetrics: false,
            // calculateVolDurability: false,
            // calculateVolRatio: false,
        }
    };

    global.WEBGPU_CONFIG = global.WEBGPU_CONFIG || DEFAULT;

})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this));
