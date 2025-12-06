use wasm_bindgen::prelude::*;
use js_sys::Float32Array;

#[wasm_bindgen]
pub struct RandomWalkGenerator {
    pub bias: f64,
    volatility: f64,
    pub last: f64,
    pub i: i32,
    seed: i32,
}

#[wasm_bindgen]
impl RandomWalkGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(bias: Option<f64>) -> Self {
        let bias = bias.unwrap_or(0.0001);
        let seed = (js_sys::Date::now() as i32) % 2147483647;
        let seed = if seed <= 0 { seed + 2147483646 } else { seed };

        Self {
            bias,
            volatility: 0.015,
            last: 100.0,
            i: 0,
            seed,
        }
    }

    pub fn set_seed(&mut self, seed: i32) {
        self.seed = seed % 2147483647;
        if self.seed <= 0 {
            self.seed += 2147483646;
        }
    }

    pub fn reset(&mut self) {
        self.i = 0;
        self.last = 100.0;
    }

    pub fn generate_batch(&mut self, count: usize) -> Float32Array {
        let mut points = Vec::with_capacity(count * 2);

        for _ in 0..count {
            let u1 = (self.next_seeded() - 1) as f64 / 2147483646.0;
            let u2 = (self.next_seeded() - 1) as f64 / 2147483646.0;

            let z = ((-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos())
                .max(-3.0)
                .min(3.0);

            let drift_term = self.bias - 0.5 * self.volatility * self.volatility;
            let random_term = self.volatility * z;

            let price_change = (drift_term + random_term).exp();
            let next = (self.last * price_change).max(0.01).min(1_000_000.0);

            points.push(self.i as f32);
            points.push(next as f32);

            self.i += 1;
            self.last = next;
        }

        Float32Array::from(points.as_slice())
    }

    pub fn get_position(&self) -> Float32Array {
        Float32Array::from(&[self.i as f32, self.last as f32][..])
    }

    pub fn set_bias(&mut self, bias: f64) {
        self.bias = bias;
    }

    pub fn set_volatility(&mut self, volatility: f64) {
        self.volatility = volatility;
    }

    pub fn get_bias(&self) -> f64 {
        self.bias
    }

    pub fn get_volatility(&self) -> f64 {
        self.volatility
    }
}

// Private LCG
impl RandomWalkGenerator {
    pub fn next_seeded(&mut self) -> i32 {
        self.seed = ((self.seed as i64 * 16807) % 2147483647) as i32;
        self.seed
    }
}
