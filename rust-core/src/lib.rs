use js_sys::Float32Array;
use wasm_bindgen::prelude::*;

// Enable console logging from wasm
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// Random walk generator using LCG (Linear Congruential Generator)
/// Matches the TypeScript implementation for consistent behavior
#[wasm_bindgen]
pub struct RandomWalkGenerator {
    bias: f64,
    volatility: f64,
    last: f64,
    i: i32,
    seed: i32,
}

#[wasm_bindgen]
impl RandomWalkGenerator {
    /// Create a new random walk generator with specified bias
    #[wasm_bindgen(constructor)]
    pub fn new(bias: Option<f64>) -> Self {
        let bias = bias.unwrap_or(0.0001); // Small drift for realistic finance (0.01% per tick)
        let seed = (js_sys::Date::now() as i32) % 2147483647;
        let seed = if seed <= 0 { seed + 2147483646 } else { seed };

        Self {
            bias,
            volatility: 0.015, // ~1.5% volatility per tick (realistic for minute data)
            last: 100.0,       // Start at price 100
            i: 0,
            seed,
        }
    }

    /// Set the seed for deterministic random generation
    pub fn set_seed(&mut self, seed: i32) {
        self.seed = seed % 2147483647;
        if self.seed <= 0 {
            self.seed += 2147483646;
        }
    }

    /// Reset the generator to initial state
    pub fn reset(&mut self) {
        self.i = 0;
        self.last = 100.0; // Reset to starting price
    }

    /// Generate a batch of points as [x0, y0, x1, y1, ...]
    /// Uses geometric Brownian motion for realistic financial price movement
    pub fn generate_batch(&mut self, count: usize) -> Float32Array {
        let mut points = Vec::with_capacity(count * 2);

        for _ in 0..count {
            // Generate standard normal random value (Box-Muller transform)
            let u1 = (self.next_seeded() - 1) as f64 / 2147483646.0;
            let u2 = (self.next_seeded() - 1) as f64 / 2147483646.0;
            let z = ((-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos())
                .max(-3.0)
                .min(3.0);

            // Geometric Brownian Motion: S(t+1) = S(t) * exp((drift - 0.5*vol^2) + vol*Z)
            let drift_term = self.bias - 0.5 * self.volatility * self.volatility;
            let random_term = self.volatility * z;
            let price_change = (drift_term + random_term).exp();

            let next = self.last * price_change;
            // Ensure price stays positive and reasonable
            let next = next.max(0.01).min(1_000_000.0);

            points.push(self.i as f32);
            points.push(next as f32);

            self.i += 1;
            self.last = next;
        }

        Float32Array::from(points.as_slice())
    }

    /// Get current position
    pub fn get_position(&self) -> Float32Array {
        Float32Array::from(&[self.i as f32, self.last as f32][..])
    }

    /// Update bias dynamically (drift)
    pub fn set_bias(&mut self, bias: f64) {
        self.bias = bias;
    }

    /// Update volatility dynamically
    pub fn set_volatility(&mut self, volatility: f64) {
        self.volatility = volatility;
    }

    /// Get current bias
    pub fn get_bias(&self) -> f64 {
        self.bias
    }

    /// Get current volatility
    pub fn get_volatility(&self) -> f64 {
        self.volatility
    }
}

// Private implementation (not exposed to WASM)
impl RandomWalkGenerator {
    /// LCG implementation matching TypeScript version
    fn next_seeded(&mut self) -> i32 {
        self.seed = ((self.seed as i64 * 16807) % 2147483647) as i32;
        self.seed
    }
}

/// Simple standalone function to generate random walk without maintaining state
/// (kept for backward compatibility)
fn gen_random_walk_vec(pairs: usize, seed_opt: Option<i32>, bias: f64) -> Vec<f32> {
    let mut gen = RandomWalkGenerator::new(Some(bias));
    if let Some(s) = seed_opt {
        gen.set_seed(s);
    }
    let mut out = Vec::with_capacity(pairs * 2);

    for _ in 0..pairs {
        let random_value = (gen.next_seeded() - 1) as f64 / 2147483646.0;
        let next = gen.last + (random_value - 0.5 + gen.bias);

        out.push(gen.i as f32);
        out.push(next as f32);

        gen.i += 1;
        gen.last = next;
    }

    out
}

/// LTTB downsampling implementation for points given as [x,y,...].
/// in: data length must be even (pairs). out_count = target pairs (including first+last).
fn lttb_downsample(data: &[f32], threshold: usize) -> Vec<f32> {
    let pair_count = data.len() / 2;
    if threshold >= pair_count || threshold == 0 || pair_count <= 3 {
        // return original (clone)
        return data.to_vec();
    }

    let mut sampled: Vec<f32> = Vec::with_capacity(threshold * 2);
    // Always include first point
    sampled.push(data[0]);
    sampled.push(data[1]);

    let bucket_size = (pair_count - 2) as f32 / (threshold as f32 - 2.0);

    let mut a = 0usize; // a is index of previously selected point (pair index)
    for i in 0..(threshold - 2) {
        // bucket range for this i
        let start = ((i as f32 * bucket_size).floor() as usize) + 1;
        let end = (((i + 1) as f32 * bucket_size).floor() as usize) + 1;
        let end = end.min(pair_count - 1);

        // next bucket for computing avg
        let next_bucket_start = end + 1;
        let next_bucket_end = (((i + 2) as f32 * bucket_size).floor() as usize) + 1;
        let next_bucket_end = next_bucket_end.min(pair_count);

        // compute average for next bucket
        let mut avg_x = 0.0_f32;
        let mut avg_y = 0.0_f32;
        let mut avg_count = 0usize;
        for b in next_bucket_start..next_bucket_end {
            avg_x += data[b * 2];
            avg_y += data[b * 2 + 1];
            avg_count += 1;
        }
        if avg_count > 0 {
            avg_x /= avg_count as f32;
            avg_y /= avg_count as f32;
        } else {
            avg_x = data[end * 2];
            avg_y = data[end * 2 + 1];
        }

        // point a coords
        let ax = data[a * 2];
        let ay = data[a * 2 + 1];

        // choose point in current bucket that maximizes triangle area with avg point
        let mut max_area = -1.0_f32;
        let mut max_idx = start;
        for j in start..=end {
            let bx = data[j * 2];
            let by = data[j * 2 + 1];

            // area of triangle a-b-avg: abs((ax - avg_x)*(by - avg_y) - (ay - avg_y)*(bx - avg_x))/2
            let area = ((ax - avg_x) * (by - avg_y) - (ay - avg_y) * (bx - avg_x)).abs() * 0.5_f32;
            if area > max_area {
                max_area = area;
                max_idx = j;
            }
        }

        // push chosen point
        sampled.push(data[max_idx * 2]);
        sampled.push(data[max_idx * 2 + 1]);
        a = max_idx;
    }

    // always include last point
    sampled.push(data[(pair_count - 1) * 2]);
    sampled.push(data[(pair_count - 1) * 2 + 1]);
    sampled
}

/// Exposed API: generate N pairs (e.g. 1_000_000), downsample to target pairs (e.g. 2000),
/// returns Float32Array [x0,y0,...] (downsampled).
#[wasm_bindgen]
pub fn generate_and_downsample(
    total_pairs: usize,
    target_pairs: usize,
    seed: Option<i32>,
    bias: f64,
) -> Float32Array {
    // generate (this will allocate a Vec of 2*total_pairs floats)
    let data = gen_random_walk_vec(total_pairs, seed, bias);

    // downsample in wasm
    let down = lttb_downsample(&data, target_pairs);

    // convert to Float32Array (copies Vec -> JS managed buffer)
    Float32Array::from(down.as_slice())
}

/// Create a streaming random walk generator that maintains state
#[wasm_bindgen]
pub fn create_generator(seed: Option<i32>, bias: f64) -> RandomWalkGenerator {
    let mut gen = RandomWalkGenerator::new(Some(bias));
    if let Some(s) = seed {
        gen.set_seed(s);
    }
    gen
}

/// Generate and downsample in one call (streaming-friendly)
#[wasm_bindgen]
pub fn generate_batch_and_downsample(
    generator: &mut RandomWalkGenerator,
    batch_size: usize,
    target_pairs: usize,
) -> Float32Array {
    let batch = generator.generate_batch(batch_size);
    let data: Vec<f32> = batch.to_vec();
    let down = lttb_downsample(&data, target_pairs);
    Float32Array::from(down.as_slice())
}

/// State manager for the chart that holds history and handles downsampling
#[wasm_bindgen]
pub struct ChartEngine {
    generator: RandomWalkGenerator,
    history: Vec<f32>, // [x0, y0, x1, y1, ...]
    max_points: usize,
}

#[wasm_bindgen]
impl ChartEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: Option<i32>, bias: f64, max_points: usize) -> Self {
        let mut gen = RandomWalkGenerator::new(Some(bias));
        if let Some(s) = seed {
            gen.set_seed(s);
        }
        // Set realistic financial parameters
        gen.set_volatility(0.015); // ~1.5% per tick
        Self {
            generator: gen,
            history: Vec::with_capacity(max_points * 2),
            max_points,
        }
    }

    /// Add new data points to the history
    pub fn add_data(&mut self, count: usize) {
        let batch = self.generator.generate_batch(count);
        let batch_vec = batch.to_vec();

        // Append new data
        self.history.extend_from_slice(&batch_vec);

        // Trim if exceeding max_points (keep latest)
        let current_pairs = self.history.len() / 2;
        if current_pairs > self.max_points {
            let remove_pairs = current_pairs - self.max_points;
            self.history.drain(0..remove_pairs * 2);
        }
    }

    /// Get a downsampled view of the entire history
    pub fn get_view(&self, target_pairs: usize) -> Float32Array {
        let down = lttb_downsample(&self.history, target_pairs);
        Float32Array::from(down.as_slice())
    }

    pub fn reset(&mut self) {
        self.generator.reset();
        self.history.clear();
    }

    pub fn set_params(&mut self, bias: f64, volatility: f64) {
        self.generator.set_bias(bias);
        self.generator.set_volatility(volatility);
    }

    pub fn get_total_points(&self) -> usize {
        self.history.len() / 2
    }
}
