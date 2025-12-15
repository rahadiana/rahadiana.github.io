// WebGPU weight helper for simple element-wise and reduction ops
// Exposes `WebGPUWeight` on the worker global. If WebGPU isn't available
// the functions fall back to CPU implementations.
'use strict';

(function(global){
    async function isWebGPUAvailable() {
        return !!(global.navigator && global.navigator.gpu) && (global.WEBGPU_CONFIG ? !!global.WEBGPU_CONFIG.enabled : true);
    }

        // Internal cached GPU state to avoid re-requesting adapter/device and recompiling pipelines
        const _gpuState = {
                initPromise: null,
                adapter: null,
                device: null,
                pipelines: {
                        mul: null,
                        sumPartial: null
                }
        };

        async function initGPU() {
                if (_gpuState.initPromise) return _gpuState.initPromise;
                _gpuState.initPromise = (async () => {
                        try {
                                if (!global.navigator || !global.navigator.gpu) return null;
                                const adapter = await global.navigator.gpu.requestAdapter();
                                if (!adapter) return null;
                                const device = await adapter.requestDevice();

                                // Elementwise multiply shader module
                                const mulShader = `
@group(0) @binding(0) var<storage, read> a : array<f32>;
@group(0) @binding(1) var<storage, read> b : array<f32>;
@group(0) @binding(2) var<storage, read_write> out : array<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let i = gid.x;
    out[i] = a[i] * b[i];
}
`;

                                // Partial-sum reduction shader: each workgroup reduces into a single float
                                const sumShader = `
struct Params { len: u32; padding: vec3<u32>; };
@group(0) @binding(0) var<storage, read> input : array<f32>;
@group(0) @binding(1) var<storage, read_write> partial : array<f32>;
@group(0) @binding(2) var<uniform> params : Params;
@workgroup_size(256)
var<workgroup> localSums : array<f32, 256>;
@compute
fn main(@builtin(local_invocation_id) local_id : vec3<u32>, @builtin(workgroup_id) wg : vec3<u32>, @builtin(global_invocation_id) gid : vec3<u32>) {
    let idx = gid.x;
    var v: f32 = 0.0;
    if (idx < params.len) { v = input[idx]; }
    localSums[local_id.x] = v;
    workgroupBarrier();
    var stride = 256u / 2u;
    while (stride > 0u) {
        if (local_id.x < stride) {
            localSums[local_id.x] = localSums[local_id.x] + localSums[local_id.x + stride];
        }
        workgroupBarrier();
        stride = stride / 2u;
    }
    if (local_id.x == 0u) {
        partial[wg.x] = localSums[0];
    }
}
`;

                                const mulModule = device.createShaderModule({ code: mulShader });
                                const sumModule = device.createShaderModule({ code: sumShader });

                                const mulPipeline = device.createComputePipeline({ layout: 'auto', compute: { module: mulModule, entryPoint: 'main' } });
                                const sumPipeline = device.createComputePipeline({ layout: 'auto', compute: { module: sumModule, entryPoint: 'main' } });

                                _gpuState.adapter = adapter;
                                _gpuState.device = device;
                                _gpuState.pipelines.mul = mulPipeline;
                                _gpuState.pipelines.sumPartial = sumPipeline;
                                return _gpuState;
                        } catch (e) {
                                return null;
                        }
                })();
                return _gpuState.initPromise;
        }

    function cpuMultiply(input, scalar) {
        const out = new Float32Array(input.length);
        for (let i = 0; i < input.length; i++) out[i] = input[i] * scalar;
        return out;
    }

    async function computeMultiply(inputArray, scalar) {
        if (!inputArray || inputArray.length === 0) return new Float32Array(0);
        let input = inputArray instanceof Float32Array ? inputArray : new Float32Array(inputArray);

        // Check global config: if WebGPU disabled globally or for this function, fallback to CPU
        const cfg = global.WEBGPU_CONFIG || { enabled: true, enabledFunctions: {} };
        if (!cfg.enabled || cfg.enabledFunctions && cfg.enabledFunctions.computeMultiply === false) {
            return cpuMultiply(input, scalar);
        }
        if (!global.navigator || !global.navigator.gpu) return cpuMultiply(input, scalar);

        const adapter = await global.navigator.gpu.requestAdapter();
        if (!adapter) return cpuMultiply(input, scalar);
        const device = await adapter.requestDevice();

        const bufSize = input.byteLength;

        const inputBuf = device.createBuffer({
            size: bufSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const outputBuf = device.createBuffer({
            size: bufSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        const uniformBuf = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer(inputBuf, 0, input.buffer, input.byteOffset, bufSize);
        const dv = new DataView(new ArrayBuffer(16));
        dv.setFloat32(0, scalar, true);
        dv.setUint32(4, input.length, true);
        device.queue.writeBuffer(uniformBuf, 0, dv.buffer);

        const shaderCode = `
struct Params { scalar: f32; len: u32; padding: vec2<u32>; };
@group(0) @binding(0) var<storage, read> input : array<f32>;
@group(0) @binding(1) var<storage, read_write> output : array<f32>;
@group(0) @binding(2) var<uniform> params : Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let i = gid.x;
  if (i < params.len) {
    output[i] = input[i] * params.scalar;
  }
}
`;

        const module = device.createShaderModule({code: shaderCode});
        const pipeline = device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });

        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: inputBuf } },
                { binding: 1, resource: { buffer: outputBuf } },
                { binding: 2, resource: { buffer: uniformBuf } }
            ]
        });

        const commandEncoder = device.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        const workgroups = Math.ceil(input.length / 64);
        pass.dispatchWorkgroups(workgroups);
        pass.end();

        const readBuf = device.createBuffer({ size: bufSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        commandEncoder.copyBufferToBuffer(outputBuf, 0, readBuf, 0, bufSize);
        device.queue.submit([commandEncoder.finish()]);

        await readBuf.mapAsync(GPUMapMode.READ);
        const copy = readBuf.getMappedRange();
        const result = new Float32Array(copy.slice(0));
        readBuf.unmap();
        return result;
    }

    // Element-wise multiply of two Float32Array inputs, returns Float32Array products
    async function computeElementwiseMul(aArray, bArray) {
        if (!aArray || !bArray || aArray.length === 0) return new Float32Array(0);
        const a = aArray instanceof Float32Array ? aArray : new Float32Array(aArray);
        const b = bArray instanceof Float32Array ? bArray : new Float32Array(bArray);
        const len = Math.min(a.length, b.length);
        if (len === 0) return new Float32Array(0);

        const cfg = global.WEBGPU_CONFIG || { enabled: true, enabledFunctions: {} };
        if (!cfg.enabled || cfg.enabledFunctions && cfg.enabledFunctions.computeElementwiseMul === false) {
            const out = new Float32Array(len);
            for (let i = 0; i < len; i++) out[i] = a[i] * b[i];
            return out;
        }

        // Try to use cached GPU pipelines
        const state = await initGPU();
        if (!state || !state.device || !state.pipelines.mul) {
            const out = new Float32Array(len);
            for (let i = 0; i < len; i++) out[i] = a[i] * b[i];
            return out;
        }

        const device = state.device;
        const pipeline = state.pipelines.mul;
        const bufSize = len * 4;
        const aBuf = device.createBuffer({ size: bufSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        const bBuf = device.createBuffer({ size: bufSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        const outBuf = device.createBuffer({ size: bufSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });

        device.queue.writeBuffer(aBuf, 0, a.buffer, a.byteOffset, bufSize);
        device.queue.writeBuffer(bBuf, 0, b.buffer, b.byteOffset, bufSize);

        const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: aBuf } },
            { binding: 1, resource: { buffer: bBuf } },
            { binding: 2, resource: { buffer: outBuf } }
        ]});

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        const workgroups = Math.ceil(len / 64);
        pass.dispatchWorkgroups(workgroups);
        pass.end();

        const readBuf = device.createBuffer({ size: bufSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        encoder.copyBufferToBuffer(outBuf, 0, readBuf, 0, bufSize);
        device.queue.submit([encoder.finish()]);
        await readBuf.mapAsync(GPUMapMode.READ);
        const copy = readBuf.getMappedRange();
        const result = new Float32Array(copy.slice(0));
        readBuf.unmap();
        return result;
    }

    // Compute dot product (sum of element-wise multiplies)
    async function computeDot(aArray, bArray) {
        const prod = await computeElementwiseMul(aArray, bArray);
        return cpuSum(prod);
    }


    function cpuSum(input) {
        let s = 0.0;
        for (let i = 0; i < input.length; i++) s += input[i];
        return s;
    }

    async function computeSum(inputArray) {
        if (!inputArray || inputArray.length === 0) return 0.0;
        const input = inputArray instanceof Float32Array ? inputArray : new Float32Array(inputArray);

        const cfg = global.WEBGPU_CONFIG || { enabled: true, enabledFunctions: {} };
        if (!cfg.enabled || cfg.enabledFunctions && cfg.enabledFunctions.computeSum === false) {
            return cpuSum(input);
        }
        if (!global.navigator || !global.navigator.gpu) return cpuSum(input);

        // Use cached GPU reduction pipeline to compute partial sums per workgroup,
        // read back the partial sums and finalize the sum on CPU. Falls back to CPU.
        const state = await initGPU();
        if (!state || !state.device || !state.pipelines.sumPartial) {
            // fallback: map via computeMultiply path
            const out = await computeMultiply(input, 1.0);
            return cpuSum(out);
        }

        const device = state.device;
        const workgroupSize = 256;
        const len = input.length;
        const numWorkgroups = Math.max(1, Math.ceil(len / workgroupSize));
        const bufSize = len * 4;

        const inputBuf = device.createBuffer({ size: bufSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        const partialBuf = device.createBuffer({ size: numWorkgroups * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
        const uniformBuf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

        device.queue.writeBuffer(inputBuf, 0, input.buffer, input.byteOffset, bufSize);
        const dv = new DataView(new ArrayBuffer(16));
        dv.setUint32(0, len, true);
        device.queue.writeBuffer(uniformBuf, 0, dv.buffer);

        const pipeline = state.pipelines.sumPartial;
        const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: inputBuf } },
            { binding: 1, resource: { buffer: partialBuf } },
            { binding: 2, resource: { buffer: uniformBuf } }
        ]});

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(numWorkgroups);
        pass.end();

        const readBuf = device.createBuffer({ size: numWorkgroups * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        encoder.copyBufferToBuffer(partialBuf, 0, readBuf, 0, numWorkgroups * 4);
        device.queue.submit([encoder.finish()]);

        await readBuf.mapAsync(GPUMapMode.READ);
        const copy = readBuf.getMappedRange();
        const partials = new Float32Array(copy.slice(0));
        readBuf.unmap();

        let s = 0.0;
        for (let i = 0; i < partials.length; i++) s += partials[i];
        // If GPU returned an all-zero result (possible on some drivers/compat paths),
        // fall back to CPU reduction to ensure correctness.
        if (s === 0 && input.length > 0) {
            try {
                const cpu = cpuSum(input);
                if (Math.abs(cpu) > 1e-12) {
                    console.warn('[WebGPUWeight] GPU reduction returned zero; falling back to CPU sum');
                    return cpu;
                }
            } catch (e) {
                // ignore and return s
            }
        }
        return s;
    }

    global.WebGPUWeight = {
        isAvailable: isWebGPUAvailable,
        computeMultiply,
        computeSum,
        computeElementwiseMul,
        computeDot
    };

})(typeof self !== 'undefined' ? self : this);
