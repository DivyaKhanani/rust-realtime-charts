use wasm_bindgen::prelude::*;
use js_sys::Float32Array;

use crate::generator::random_walk::RandomWalkGenerator;
use crate::lttb::lttb_downsample;

#[wasm_bindgen]
pub struct ChartEngine {
    generator: RandomWalkGenerator,
    history: Vec<f32>,
    max_points: usize,
}

#[wasm_bindgen]
impl ChartEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: Option<i32>, bias: f64, max_points: usize) -> Self {
        let mut Random_Walk_Generator = RandomWalkGenerator::new(Some(bias));
        if let Some(s) = seed {
            Random_Walk_Generator.set_seed(s);
        }
        Random_Walk_Generator.set_volatility(0.015);

        Self {
            generator: Random_Walk_Generator,
            history: Vec::with_capacity(max_points * 2),
            max_points,
        }
    }

    pub fn add_data(&mut self, count: usize) {
        let batch = self.generator.generate_batch(count);
        let vec = batch.to_vec();

        self.history.extend_from_slice(&vec);

        let pairs = self.history.len() / 2;
        if pairs > self.max_points {
            let remove = pairs - self.max_points;
            self.history.drain(0..remove * 2);
        }
    }

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
