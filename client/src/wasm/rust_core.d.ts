// Mock TypeScript declarations for the WASM module
// This will be replaced by the actual generated types from wasm-pack

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

// Mock functions - will be replaced by actual WASM functions
export function greet(): void;
export function process_csv_data(csv_content: string): ProcessResult | null;
export function process_simple_data(input: string): ProcessResult | string;
export function calculate_fibonacci(n: number): number[];

export default function init(input?: string | URL | Request): Promise<void>;