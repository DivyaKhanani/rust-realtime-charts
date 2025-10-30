use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use js_sys::Array;

mod utils;
use utils::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[derive(Serialize, Deserialize)]
pub struct DataStats {
    pub count: usize,
    pub sum: f64,
    pub mean: f64,
    pub median: f64,
    pub std_dev: f64,
    pub min: f64,
    pub max: f64,
}

#[derive(Serialize, Deserialize)]
pub struct ProcessResult {
    pub stats: DataStats,
    pub processed_data: Vec<f64>,
    pub performance_ms: f64,
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, rust-hackathon-2025!");
}

#[wasm_bindgen]
pub fn process_csv_data(csv_content: &str) -> JsValue {
    let start_time = js_sys::Date::now();
    
    console_log!("Processing CSV data with {} characters", csv_content.len());
    
    let mut all_numbers = Vec::new();
    
    // Parse CSV content - handle both comma and newline separators
    for line in csv_content.lines() {
        for value in line.split(',') {
            if let Ok(num) = value.trim().parse::<f64>() {
                all_numbers.push(num);
            }
        }
    }
    
    if all_numbers.is_empty() {
        console_log!("No valid numbers found in CSV");
        return JsValue::NULL;
    }
    
    let stats = calculate_statistics(&all_numbers);
    let processed_data = process_numbers(&all_numbers);
    let end_time = js_sys::Date::now();
    
    let result = ProcessResult {
        stats,
        processed_data,
        performance_ms: end_time - start_time,
    };
    
    console_log!("Processing completed in {:.2}ms", result.performance_ms);
    
    serde_wasm_bindgen::to_value(&result).unwrap()
}

#[wasm_bindgen]
pub fn process_simple_data(input: &str) -> JsValue {
    let start_time = js_sys::Date::now();
    
    let parsed: Vec<f64> = input
        .split(',')
        .filter_map(|s| s.trim().parse::<f64>().ok())
        .collect();
    
    if parsed.is_empty() {
        return JsValue::from_str("No valid numbers found");
    }
    
    let stats = calculate_statistics(&parsed);
    let processed_data = process_numbers(&parsed);
    let end_time = js_sys::Date::now();
    
    let result = ProcessResult {
        stats,
        processed_data,
        performance_ms: end_time - start_time,
    };
    
    serde_wasm_bindgen::to_value(&result).unwrap()
}

#[wasm_bindgen]
pub fn calculate_fibonacci(n: u32) -> JsValue {
    let start_time = js_sys::Date::now();
    
    let mut results = Vec::new();
    let mut a = 0u64;
    let mut b = 1u64;
    
    for i in 0..n {
        results.push(a as f64);
        let next = a + b;
        a = b;
        b = next;
        
        if i % 1000 == 0 {
            console_log!("Calculated {} Fibonacci numbers", i);
        }
    }
    
    let end_time = js_sys::Date::now();
    console_log!("Fibonacci calculation completed in {:.2}ms", end_time - start_time);
    
    let array = Array::new();
    for num in results {
        array.push(&JsValue::from_f64(num));
    }
    
    array.into()
}

fn calculate_statistics(data: &[f64]) -> DataStats {
    let count = data.len();
    let sum: f64 = data.iter().sum();
    let mean = sum / count as f64;
    
    let mut sorted_data = data.to_vec();
    sorted_data.sort_by(|a, b| a.partial_cmp(b).unwrap());
    
    let median = if count % 2 == 0 {
        (sorted_data[count / 2 - 1] + sorted_data[count / 2]) / 2.0
    } else {
        sorted_data[count / 2]
    };
    
    let variance: f64 = data.iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>() / count as f64;
    
    let std_dev = variance.sqrt();
    
    let min = *sorted_data.first().unwrap();
    let max = *sorted_data.last().unwrap();
    
    DataStats {
        count,
        sum,
        mean,
        median,
        std_dev,
        min,
        max,
    }
}

fn process_numbers(data: &[f64]) -> Vec<f64> {
    // Apply some processing - normalize to 0-1 range
    let min = data.iter().fold(f64::INFINITY, |a, &b| a.min(b));
    let max = data.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b));
    let range = max - min;
    
    if range == 0.0 {
        return data.to_vec();
    }
    
    data.iter()
        .map(|&x| (x - min) / range)
        .collect()
}