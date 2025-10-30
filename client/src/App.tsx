import { useState, useCallback, useRef, useEffect } from 'react';
import { DataInput } from './components/DataInput';
import { ResultsDisplay, type ProcessResult } from './components/ResultsDisplay';
import { FibonacciCalculator, FibonacciDisplay } from './components/FibonacciCalculator';
import type { WorkerMessage, WorkerResponse } from './worker/dataWorker';
import './App.css';

interface FibonacciResult {
  numbers: number[];
  count: number;
  last_value: number;
}

function App() {
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [fibonacciResult, setFibonacciResult] = useState<FibonacciResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fibonacciError, setFibonacciError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [fibonacciPerformance, setFibonacciPerformance] = useState<number | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const messageIdRef = useRef(0);
  const pendingMessages = useRef<Map<string, (response: WorkerResponse) => void>>(new Map());

  // Initialize Web Worker
  useEffect(() => {
    try {
      const worker = new Worker(
        new URL('./worker/dataWorker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const resolver = pendingMessages.current.get(response.id);
        if (resolver) {
          resolver(response);
          pendingMessages.current.delete(response.id);
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        setError('Web Worker encountered an error');
        setIsProcessing(false);
      };

      workerRef.current = worker;

      return () => {
        worker.terminate();
      };
    } catch (err) {
      console.error('Failed to create worker:', err);
      setError('Failed to initialize Web Worker. Your browser might not support this feature.');
    }
  }, []);

  const sendWorkerMessage = useCallback((message: Omit<WorkerMessage, 'id'>): Promise<WorkerResponse> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = `msg_${++messageIdRef.current}`;
      const fullMessage: WorkerMessage = { ...message, id };
      
      pendingMessages.current.set(id, resolve);
      
      // Set timeout to reject promise if no response
      setTimeout(() => {
        if (pendingMessages.current.has(id)) {
          pendingMessages.current.delete(id);
          reject(new Error('Worker message timeout'));
        }
      }, 30000);

      workerRef.current.postMessage(fullMessage);
    });
  }, []);

  const handleDataSubmit = useCallback(async (data: string, type: 'csv' | 'simple') => {
    if (!workerRef.current) {
      setError('Web Worker not available');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    const startTime = window.performance.now();

    try {
      const messageType = type === 'csv' ? 'process_csv' : 'process_simple';
      const messageData = type === 'csv' ? { csvContent: data } : { input: data };
      
      const response = await sendWorkerMessage({
        type: messageType,
        data: messageData
      });

      const endTime = window.performance.now();
      setProcessingTime(endTime - startTime);

      if (response.success) {
        setResult(response.result as ProcessResult);
      } else {
        setError(response.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [sendWorkerMessage]);

  const handleFibonacciCalculate = useCallback(async (count: number) => {
    if (!workerRef.current) {
      setFibonacciError('Web Worker not available');
      return;
    }

    setIsProcessing(true);
    setFibonacciError(null);
    setFibonacciResult(null);
    
    const startTime = window.performance.now();

    try {
      const response = await sendWorkerMessage({
        type: 'fibonacci',
        data: { count }
      });

      const endTime = window.performance.now();
      setFibonacciPerformance(endTime - startTime);

      if (response.success) {
        setFibonacciResult(response.result as FibonacciResult);
      } else {
        setFibonacciError(response.error || 'Unknown error occurred');
      }
    } catch (err) {
      setFibonacciError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [sendWorkerMessage]);

  const handleGreeting = useCallback(async () => {
    if (!workerRef.current) {
      setError('Web Worker not available');
      return;
    }

    try {
      await sendWorkerMessage({
        type: 'greet',
        data: {}
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send greeting');
    }
  }, [sendWorkerMessage]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🦀 Rust + WebAssembly + React</h1>
        <p className="subtitle">High-Performance Data Processing with Rust compiled to WebAssembly</p>
        <button onClick={handleGreeting} className="greet-btn">
          👋 Test WASM Module
        </button>
      </header>

      <main className="app-main">
        <div className="section">
          <DataInput 
            onDataSubmit={handleDataSubmit} 
            isProcessing={isProcessing} 
          />
        </div>

        <div className="section">
          <ResultsDisplay 
            result={result} 
            error={error} 
            performance={processingTime} 
          />
        </div>

        <div className="section">
          <FibonacciCalculator 
            onCalculate={handleFibonacciCalculate} 
            isProcessing={isProcessing} 
          />
          <FibonacciDisplay 
            result={fibonacciResult} 
            performance={fibonacciPerformance} 
            error={fibonacciError} 
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Built with ❤️ using <strong>Rust</strong> → <strong>WebAssembly</strong> → <strong>React</strong>
        </p>
        <p>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
