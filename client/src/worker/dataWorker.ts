import { 
  initWasm,
  wasmProcessCsvData,
  wasmProcessSimpleData,
  wasmCalculateFibonacci,
  wasmCalculatePrimes,
  wasmMonteCarloPI,
  wasmMatrixMultiplyDemo,
  wasmGreet
} from '../wasm/index';

interface WorkerData {
  csvContent?: string;
  input?: string;
  count?: number;
  limit?: number;
  iterations?: number;
}

export interface WorkerMessage {
  id: string;
  type: 'process_csv' | 'process_simple' | 'fibonacci' | 'greet' | 'calculate_primes' | 'monte_carlo_pi' | 'matrix_multiply';
  data: WorkerData;
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
  performance?: number;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data;
  const startTime = performance.now();

  try {
    // Ensure WASM is initialized (using singleton pattern from index.ts)
    await initWasm();

    let result: unknown;

    switch (type) {
      case 'greet': {
        await wasmGreet();
        result = 'Greeting sent from WASM!';
        break;
      }

      case 'process_csv': {
        if (!data.csvContent) {
          throw new Error('CSV content is required');
        }
        result = await wasmProcessCsvData(data.csvContent);
        if (!result) {
          throw new Error('No valid data found in CSV');
        }
        break;
      }

      case 'process_simple': {
        if (!data.input) {
          throw new Error('Input data is required');
        }
        result = await wasmProcessSimpleData(data.input);
        if (typeof result === 'string') {
          throw new Error(result);
        }
        break;
      }

      case 'fibonacci': {
        if (data.count === undefined) {
          throw new Error('Count is required for fibonacci calculation');
        }
        const fibNumbers = await wasmCalculateFibonacci(data.count);
        result = {
          numbers: fibNumbers,
          count: data.count,
          last_value: fibNumbers[fibNumbers.length - 1]
        };
        break;
      }

      case 'calculate_primes': {
        if (data.limit === undefined) {
          throw new Error('Limit is required for prime number calculation');
        }
        const primes = await wasmCalculatePrimes(data.limit);
        result = {
          primes: primes,
          count: primes.length,
          limit: data.limit,
          largest_prime: primes[primes.length - 1]
        };
        break;
      }

      case 'monte_carlo_pi': {
        if (data.iterations === undefined) {
          throw new Error('Iterations count is required for Monte Carlo PI calculation');
        }
        const piEstimate = await wasmMonteCarloPI(data.iterations);
        result = {
          pi_estimate: piEstimate,
          iterations: data.iterations,
          accuracy: Math.abs(piEstimate - Math.PI),
          error_percentage: (Math.abs(piEstimate - Math.PI) / Math.PI) * 100
        };
        break;
      }

      case 'matrix_multiply': {
        const matrixResult = await wasmMatrixMultiplyDemo();
        result = {
          result_matrix: matrixResult,
          dimensions: `${matrixResult.length}x${matrixResult[0]?.length || 0}`,
          operation: '2x3 matrix × 3x2 matrix'
        };
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    const endTime = performance.now();

    const response: WorkerResponse = {
      id,
      success: true,
      result,
      performance: endTime - startTime
    };

    self.postMessage(response);

  } catch (error) {
    const endTime = performance.now();
    
    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      performance: endTime - startTime
    };

    self.postMessage(response);
  }
};

// Handle worker errors
self.onerror = (error) => {
  console.error('Worker error:', error);
};

self.onunhandledrejection = (event) => {
  console.error('Worker unhandled rejection:', event.reason);
};