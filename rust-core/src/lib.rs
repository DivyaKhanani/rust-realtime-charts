mod utils;
mod generator;
mod lttb;
mod engine;

use wasm_bindgen::prelude::*;
use js_sys::Float32Array;

use generator::random_walk::RandomWalkGenerator;
use generator::simple_walk::gen_random_walk_vec;
use lttb::lttb_downsample;
use engine::chart_engine::ChartEngine;

#[wasm_bindgen]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// -------- Public WASM exports -------- //

#[wasm_bindgen]
pub fn generate_and_downsample(
    total_pairs: usize,
    target_pairs: usize,
    seed: Option<i32>,
    bias: f64,
) -> Float32Array {
    let data = gen_random_walk_vec(total_pairs, seed, bias);
    let down = lttb_downsample(&data, target_pairs);
    Float32Array::from(down.as_slice())
}

#[wasm_bindgen]
pub fn create_generator(seed: Option<i32>, bias: f64) -> RandomWalkGenerator {
    let mut gen = RandomWalkGenerator::new(Some(bias));
    if let Some(s) = seed {
        gen.set_seed(s);
    }
    gen
}

#[wasm_bindgen]
pub fn generate_batch_and_downsample(
    generator: &mut RandomWalkGenerator,
    batch_size: usize,
    target_pairs: usize,
) -> Float32Array {
    let batch = generator.generate_batch(batch_size);
    let batch_vec = batch.to_vec();
    let down = lttb_downsample(&batch_vec, target_pairs);
    Float32Array::from(down.as_slice())
}

#[wasm_bindgen]
pub fn create_engine(seed: Option<i32>, bias: f64, max_points: usize) -> ChartEngine {
    ChartEngine::new(seed, bias, max_points)
}
