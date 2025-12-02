/**
 * RandomWalkStream - Streams random walk data from WASM generator
 * 
 * Features:
 * - Async iterator interface for easy consumption
 * - Sliding window to prevent memory leaks
 * - Configurable batch size and window size
 * - Clean start/stop lifecycle
 */

export interface RandomWalkStreamConfig {
  seed?: number;
  drift: number;
  volatility: number;
  batchSize: number;
  updateIntervalMs: number;
  maxWindowSize: number; // Maximum points to keep in memory
  downsampleTarget?: number; // Optional downsampling
}

export interface StreamBatch {
  data: Float32Array; // [x0, y0, x1, y1, ...]
  timestamp: number;
  batchIndex: number;
}

export class RandomWalkStream {
  private generator: any = null;
  private wasm: any = null;
  private config: RandomWalkStreamConfig;
  private running = false;
  private batchIndex = 0;
  private windowData: Float32Array = new Float32Array(0);
  private listeners: ((batch: StreamBatch) => void)[] = [];
  private intervalId: any = null;

  constructor(config: RandomWalkStreamConfig) {
    this.config = config;
  }

  /**
   * Initialize WASM module and generator
   */
  async initialize(wasmModule: any): Promise<void> {
    try {
      // Initialize WASM if needed
      if (typeof wasmModule.default === 'function') {
        await wasmModule.default();
      }
      this.wasm = wasmModule;

      // Create generator instance
      const seed = this.config.seed !== undefined ? BigInt(this.config.seed) : undefined;
      this.generator = new wasmModule.RandomWalkGenerator(
        seed,
        this.config.drift,
        this.config.volatility,
        -100.0, // lower bound
        100.0   // upper bound
      );

      console.log('[RandomWalkStream] Initialized with config:', this.config);
    } catch (err) {
      console.error('[RandomWalkStream] Initialization failed:', err);
      throw err;
    }
  }

  /**
   * Start streaming data
   */
  start(): void {
    if (this.running || !this.generator) {
      console.warn('[RandomWalkStream] Already running or not initialized');
      return;
    }

    this.running = true;
    this.batchIndex = 0;

    // Start generation loop
    this.intervalId = setInterval(() => {
      this.generateBatch();
    }, this.config.updateIntervalMs);

    console.log('[RandomWalkStream] Started');
  }

  /**
   * Stop streaming
   */
  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[RandomWalkStream] Stopped');
  }

  /**
   * Reset generator to initial state
   */
  reset(): void {
    if (this.generator) {
      this.generator.reset(0.0, 0.0);
      this.batchIndex = 0;
      this.windowData = new Float32Array(0);
      console.log('[RandomWalkStream] Reset');
    }
  }

  /**
   * Update parameters dynamically
   */
  updateParams(params: Partial<Pick<RandomWalkStreamConfig, 'drift' | 'volatility' | 'updateIntervalMs'>>): void {
    if (params.drift !== undefined) {
      this.config.drift = params.drift;
      if (this.generator) this.generator.set_drift(params.drift);
    }
    if (params.volatility !== undefined) {
      this.config.volatility = params.volatility;
      if (this.generator) this.generator.set_volatility(params.volatility);
    }
    if (params.updateIntervalMs !== undefined) {
      this.config.updateIntervalMs = params.updateIntervalMs;
      // Restart interval if running
      if (this.running && this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
          this.generateBatch();
        }, this.config.updateIntervalMs);
      }
    }
  }

  /**
   * Subscribe to data updates
   */
  subscribe(listener: (batch: StreamBatch) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current window of data
   */
  getWindow(): Float32Array {
    return this.windowData;
  }

  /**
   * Generate a batch of data
   */
  private generateBatch(): void {
    if (!this.generator || !this.running) return;

    try {
      // Generate batch
      const batch = this.generator.generate_batch(this.config.batchSize);

      // Apply downsampling if configured
      let finalData: Float32Array;
      if (this.config.downsampleTarget && this.config.downsampleTarget < this.config.batchSize) {
        const batchVec = Array.from(batch);
        const downsampled = this.lttbDownsample(batchVec, this.config.downsampleTarget);
        finalData = new Float32Array(downsampled);
      } else {
        finalData = batch;
      }

      // Update sliding window
      this.updateWindow(finalData);

      // Notify listeners
      const streamBatch: StreamBatch = {
        data: finalData,
        timestamp: performance.now(),
        batchIndex: this.batchIndex++,
      };

      for (const listener of this.listeners) {
        listener(streamBatch);
      }
    } catch (err) {
      console.error('[RandomWalkStream] Error generating batch:', err);
    }
  }

  /**
   * Update sliding window with new data
   */
  private updateWindow(newData: Float32Array): void {
    const newPairs = Math.floor(newData.length / 2);
    const currentPairs = Math.floor(this.windowData.length / 2);
    const totalPairs = currentPairs + newPairs;

    // Create new window
    if (totalPairs * 2 <= this.config.maxWindowSize * 2) {
      // Append to existing window
      const combined = new Float32Array(totalPairs * 2);
      combined.set(this.windowData);
      combined.set(newData, this.windowData.length);
      this.windowData = combined;
    } else {
      // Sliding window: remove old data from front
      const maxPairs = Math.floor(this.config.maxWindowSize);
      const keepPairs = maxPairs - newPairs;
      
      if (keepPairs > 0) {
        const offset = (currentPairs - keepPairs) * 2;
        const combined = new Float32Array(maxPairs * 2);
        combined.set(this.windowData.subarray(offset));
        combined.set(newData, keepPairs * 2);
        this.windowData = combined;
      } else {
        // New data fills entire window
        this.windowData = newData.slice(0, maxPairs * 2);
      }
    }
  }

  /**
   * Simple LTTB downsampling (JavaScript implementation)
   */
  private lttbDownsample(data: number[], threshold: usize): number[] {
    const pairCount = Math.floor(data.length / 2);
    if (threshold >= pairCount || threshold <= 2) {
      return data;
    }

    const sampled: number[] = [];
    sampled.push(data[0], data[1]); // First point

    const bucketSize = (pairCount - 2) / (threshold - 2);
    let a = 0;

    for (let i = 0; i < threshold - 2; i++) {
      const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
      const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
      const avgRangeEndClamped = Math.min(avgRangeEnd, pairCount);

      let avgX = 0;
      let avgY = 0;
      let avgRangeLength = 0;

      for (let j = avgRangeStart; j < avgRangeEndClamped; j++) {
        avgX += data[j * 2];
        avgY += data[j * 2 + 1];
        avgRangeLength++;
      }

      if (avgRangeLength > 0) {
        avgX /= avgRangeLength;
        avgY /= avgRangeLength;
      }

      const rangeOffs = Math.floor(i * bucketSize) + 1;
      const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

      const pointAX = data[a * 2];
      const pointAY = data[a * 2 + 1];

      let maxArea = -1;
      let maxAreaPoint = rangeOffs;

      for (let j = rangeOffs; j < rangeTo; j++) {
        const pointBX = data[j * 2];
        const pointBY = data[j * 2 + 1];

        const area = Math.abs(
          (pointAX - avgX) * (pointBY - avgY) -
          (pointAY - avgY) * (pointBX - avgX)
        ) * 0.5;

        if (area > maxArea) {
          maxArea = area;
          maxAreaPoint = j;
        }
      }

      sampled.push(data[maxAreaPoint * 2], data[maxAreaPoint * 2 + 1]);
      a = maxAreaPoint;
    }

    // Last point
    sampled.push(data[(pairCount - 1) * 2], data[(pairCount - 1) * 2 + 1]);

    return sampled;
  }

  /**
   * Async iterator interface
   */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<StreamBatch> {
    let resolveNext: ((value: StreamBatch) => void) | null = null;
    let queue: StreamBatch[] = [];

    const unsubscribe = this.subscribe((batch) => {
      if (resolveNext) {
        resolveNext(batch);
        resolveNext = null;
      } else {
        queue.push(batch);
      }
    });

    try {
      while (this.running) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          const batch = await new Promise<StreamBatch>((resolve) => {
            resolveNext = resolve;
          });
          yield batch;
        }
      }
    } finally {
      unsubscribe();
    }
  }
}
