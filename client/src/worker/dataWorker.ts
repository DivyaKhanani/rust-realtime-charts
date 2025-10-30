import init, { 
  process_csv_data, 
  process_simple_data, 
  calculate_fibonacci,
  greet
} from '../wasm/rust_core';

interface WorkerData {
  csvContent?: string;
  input?: string;
  count?: number;
}

export interface WorkerMessage {
  id: string;
  type: 'process_csv' | 'process_simple' | 'fibonacci' | 'greet';
  data: WorkerData;
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
  performance?: number;
}

let isInitialized = false;

// Initialize WASM module
async function initializeWasm(): Promise<void> {
  if (!isInitialized) {
    try {
      await init();
      isInitialized = true;
      console.log('WASM module initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WASM module:', error);
      throw error;
    }
  }
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data;
  const startTime = performance.now();

  try {
    // Ensure WASM is initialized
    await initializeWasm();

    let result: unknown;

    switch (type) {
      case 'greet': {
        greet();
        result = 'Greeting sent!';
        break;
      }

      case 'process_csv': {
        if (!data.csvContent) {
          throw new Error('CSV content is required');
        }
        result = process_csv_data(data.csvContent);
        if (!result) {
          throw new Error('No valid data found in CSV');
        }
        break;
      }

      case 'process_simple': {
        if (!data.input) {
          throw new Error('Input data is required');
        }
        result = process_simple_data(data.input);
        if (typeof result === 'string') {
          throw new Error(result);
        }
        break;
      }

      case 'fibonacci': {
        if (data.count === undefined) {
          throw new Error('Count is required for fibonacci calculation');
        }
        const fibNumbers = calculate_fibonacci(data.count);
        result = {
          numbers: fibNumbers,
          count: data.count,
          last_value: fibNumbers[fibNumbers.length - 1]
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