// workers/rust_sab_worker.ts
// SharedArrayBuffer streaming worker: writes into SAB, main thread reads via RAF

let wasm: any = null;
let generator: any = null;
let running = false;
let batchSize = 1000;
let targetPairs = 2000;
let intervalMs = 100;
let seed: number | null = 12345;
let drift = 0.0;
let volatility = 1.0;

// references to SharedArrayBuffers passed from main
let sharedData: Float32Array | null = null;
let sharedMeta: Int32Array | null = null;

self.onmessage = async (ev: MessageEvent) => {
  const m = ev.data;

  if (m.type === 'init') {
    try {
      console.log('[SAB Worker] Loading WASM module...');
      // Import from bundled package in src, not from public folder
      const wasmModule = await import('../wasm/package/rw_lttb.js');
      
      // Initialize WASM (critical!)
      await wasmModule.default();
      wasm = wasmModule;
      
      batchSize = m.batchSize ?? batchSize;
      targetPairs = m.targetPairs ?? targetPairs;
      intervalMs = m.intervalMs ?? intervalMs;
      seed = m.seed ?? seed;
      drift = m.drift ?? drift;
      volatility = m.volatility ?? volatility;

      // Create generator instance with drift as bias
      generator = new wasmModule.RandomWalkGenerator(drift);
      
      if (seed !== null) {
        generator.set_seed(seed);
      }
      
      // Set volatility separately
      if (generator.set_volatility) {
        generator.set_volatility(volatility);
      }

      // Attach to provided SharedArrayBuffers
      sharedData = new Float32Array(m.sab);
      sharedMeta = new Int32Array(m.meta);
      
      console.log('[SAB Worker] WASM initialized, SAB attached');
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      console.error('[SAB Worker] Init failed:', err);
      self.postMessage({ 
        type: 'error', 
        error: err?.message || String(err),
        details: 'Check COOP/COEP headers and WASM files'
      });
    }
    return;
  }

  if (m.type === 'start') {
    running = true;
    produceLoop();
    return;
  }

  if (m.type === 'stop') {
    running = false;
    return;
  }

  if (m.type === 'updateParams') {
    if (generator) {
      if (m.drift !== undefined) {
        drift = m.drift;
        generator.set_bias(drift);
      }
      if (m.volatility !== undefined) {
        volatility = m.volatility;
        if (generator.set_volatility) {
          generator.set_volatility(volatility);
        }
      }
    }
    if (m.intervalMs !== undefined) {
      intervalMs = m.intervalMs;
    }
    return;
  }

  if (m.type === 'reset') {
    if (generator) {
      generator.reset();
    }
    return;
  }
};

async function produceLoop() {
  while (running) {
    try {
      if (!generator) {
        console.warn('[SAB Worker] Generator not ready');
        await sleep(intervalMs);
        continue;
      }
      
      if (!sharedData || !sharedMeta) {
        console.warn('[SAB Worker] SharedArrayBuffers not attached');
        await sleep(intervalMs);
        continue;
      }

      // Generate & downsample in WASM using streaming generator
      const fa: Float32Array = wasm.generate_batch_and_downsample(
        generator,
        batchSize,
        targetPairs
      );

      if (!fa || fa.length === 0) {
        console.error('[SAB Worker] Empty result from WASM');
        await sleep(intervalMs);
        continue;
      }

      // Write result into SharedArrayBuffer (zero-copy on main thread side)
      const pairs = Math.min(targetPairs, Math.floor(fa.length / 2));
      for (let i = 0; i < pairs * 2; i++) {
        sharedData[i] = fa[i];
      }

      // Update metadata atomically for thread-safe read on main thread
      Atomics.store(sharedMeta, 0, pairs);
      
      // Optional: notify waiting thread (not needed with RAF polling)
      // Atomics.notify(sharedMeta, 0, 1);
    } catch (err: any) {
      console.error('[SAB Worker] Produce error:', err);
      self.postMessage({ 
        type: 'error', 
        error: err?.message || String(err) 
      });
      // Continue despite errors
    }
    await sleep(intervalMs);
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
