// workers/rust_lttb_worker.ts
// Streaming random walk worker using ChartEngine for state management

let wasm: any = null;
let engine: any = null; // ChartEngine instance
let running = false;
let batchSize = 10000; // Smaller batches for smooth continuous movement
let targetPairs = 2000;
let maxPoints = 1_000_000; // Max points to keep in Rust memory
let intervalMs = 100;
let seed: number | null = 12345;
let drift = 0.005; // 0.5% drift per tick - strong upward trend
let volatility = 0.025; // 2.5% volatility per tick for realistic fluctuations
let totalGenerated = 0; 
let batchCount = 0; 

self.onmessage = async (ev: MessageEvent) => {
  const m = ev.data;
  
  if (m.type === 'init') {
    try {
      console.log('[LTTB Worker] Loading WASM module...');
      const wasmModule = await import('../wasm/package/rw_lttb.js');
      await wasmModule.default();
      wasm = wasmModule;
      
      batchSize = m.batchSize ?? batchSize;
      targetPairs = m.targetPairs ?? targetPairs;
      intervalMs = m.intervalMs ?? intervalMs;
      maxPoints = m.maxPoints ?? maxPoints;
      seed = m.seed ?? seed;
      drift = m.drift ?? drift;
      volatility = m.volatility ?? volatility;
      
      // Initialize ChartEngine
      // new ChartEngine(seed, bias, max_points)
      engine = new wasmModule.ChartEngine(seed, drift, maxPoints);
      
      // Set both drift and volatility with the correct values from init message
      drift = m.drift ?? drift;
      volatility = m.volatility ?? volatility;
      engine.set_params(drift, volatility);
      
      console.log(`[LTTB Worker] ✅ ChartEngine initialized with drift=${drift}, volatility=${volatility}`);
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      console.error('[LTTB Worker] Init failed:', err);
      self.postMessage({ type: 'error', error: err?.message });
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
    if (engine) {
      if (m.drift !== undefined) drift = m.drift;
      if (m.volatility !== undefined) volatility = m.volatility;
      engine.set_params(drift, volatility);
    }
    if (m.intervalMs !== undefined) intervalMs = m.intervalMs;
    return;
  }

  if (m.type === 'reset') {
    if (engine) engine.reset();
    totalGenerated = 0;
    batchCount = 0;
    return;
  }
};

async function produceLoop() {
  while (running) {
    try {
      if (!engine) {
        await sleep(intervalMs);
        continue;
      }
      
      const startTime = performance.now();
      
      // 1. Add data to engine (Rust manages history)
      engine.add_data(batchSize);
      
      // 2. Get downsampled view of WHOLE history
      const view: Float32Array = engine.get_view(targetPairs);
      
      const genTime = performance.now() - startTime;
      const currentTotal = engine.get_total_points();

      totalGenerated += batchSize;
      batchCount++;
      
      // Post the view to main thread
      // We copy the view because it's a view into WASM memory which might be invalidated
      // But Float32Array.from() in Rust already created a copy in JS memory? 
      // Yes, wasm-bindgen returns a new Float32Array.
      
      self.postMessage(
        { 
          type: 'data', 
          buffer: view.buffer, 
          pairs: Math.floor(view.length / 2),
          totalPoints: currentTotal,
          genTime
        },
        { transfer: [view.buffer] }
      );
    } catch (err: any) {
      console.error('[LTTB Worker] Error:', err);
    }
    await sleep(intervalMs);
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
