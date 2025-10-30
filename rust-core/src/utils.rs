use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[allow(unused_macros)]
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// Removed set_panic_hook function as it's not being used
// and console_error_panic_hook feature is not configured

// Advanced mathematical operations for performance testing
pub fn calculate_prime_numbers(limit: u32) -> Vec<u32> {
    let mut primes = Vec::new();
    let mut is_prime = vec![true; (limit + 1) as usize];
    is_prime[0] = false;
    is_prime[1] = false;
    
    for i in 2..=limit {
        if is_prime[i as usize] {
            primes.push(i);
            let mut j = i * i;
            while j <= limit {
                is_prime[j as usize] = false;
                j += i;
            }
        }
    }
    
    primes
}

pub fn matrix_multiply(a: &[Vec<f64>], b: &[Vec<f64>]) -> Vec<Vec<f64>> {
    let rows_a = a.len();
    let cols_a = a[0].len();
    let cols_b = b[0].len();
    
    let mut result = vec![vec![0.0; cols_b]; rows_a];
    
    for i in 0..rows_a {
        for j in 0..cols_b {
            for k in 0..cols_a {
                result[i][j] += a[i][k] * b[k][j];
            }
        }
    }
    
    result
}

pub fn monte_carlo_pi(iterations: u32) -> f64 {
    let mut inside_circle = 0;
    
    for _ in 0..iterations {
        let x = js_sys::Math::random() * 2.0 - 1.0;
        let y = js_sys::Math::random() * 2.0 - 1.0;
        
        if x * x + y * y <= 1.0 {
            inside_circle += 1;
        }
    }
    
    4.0 * (inside_circle as f64) / (iterations as f64)
}