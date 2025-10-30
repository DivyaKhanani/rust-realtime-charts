// Mock implementation for development
// This will be replaced by the actual WASM module

export interface DataStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  std_dev: number;
  min: number;
  max: number;
}

export interface ProcessResult {
  stats: DataStats;
  processed_data: number[];
  performance_ms: number;
}

export function greet(): void {
  alert("Hello from mock WASM module!");
}

export function process_csv_data(csv_content: string): ProcessResult | null {
  const start = performance.now();
  
  const numbers: number[] = [];
  const lines = csv_content.split('\n');
  
  for (const line of lines) {
    const values = line.split(',');
    for (const value of values) {
      const num = parseFloat(value.trim());
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }
  }
  
  if (numbers.length === 0) return null;
  
  const sum = numbers.reduce((a, b) => a + b, 0);
  const mean = sum / numbers.length;
  const sorted = [...numbers].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0 
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const variance = numbers.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / numbers.length;
  const std_dev = Math.sqrt(variance);
  
  const stats: DataStats = {
    count: numbers.length,
    sum,
    mean,
    median,
    std_dev,
    min: Math.min(...numbers),
    max: Math.max(...numbers)
  };
  
  // Normalize data
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min;
  const processed_data = range === 0 ? numbers : numbers.map(n => (n - min) / range);
  
  return {
    stats,
    processed_data,
    performance_ms: performance.now() - start
  };
}

export function process_simple_data(input: string): ProcessResult | string {
  const numbers = input.split(',')
    .map(s => parseFloat(s.trim()))
    .filter(n => !isNaN(n));
  
  if (numbers.length === 0) {
    return "No valid numbers found";
  }
  
  const csvContent = numbers.join(',');
  const result = process_csv_data(csvContent);
  
  return result || "Error processing data";
}

export function calculate_fibonacci(n: number): number[] {
  const result: number[] = [];
  let a = 0, b = 1;
  
  for (let i = 0; i < n; i++) {
    result.push(a);
    const next = a + b;
    a = b;
    b = next;
  }
  
  return result;
}

export default async function init(): Promise<void> {
  // Mock initialization - in real WASM this would load the module
  console.log("Mock WASM module initialized");
  return Promise.resolve();
}