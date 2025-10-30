import { useState, useCallback } from 'react';
import { DataInput } from './components/DataInput';
import { ResultsDisplay, type ProcessResult } from './components/ResultsDisplay';
import { FibonacciCalculator, FibonacciDisplay } from './components/FibonacciCalculator';
import MathDemo from './components/MathDemo';
import { sendWorkerMessage } from './worker/workerManager';
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

  const handleDataSubmit = useCallback(async (data: string, type: 'csv' | 'simple') => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    const startTime = window.performance.now();

    try {
      const messageType = type === 'csv' ? 'process_csv' : 'process_simple' as const;
      const messageData = type === 'csv' ? { csvContent: data } : { input: data };
      
      const response = await sendWorkerMessage(messageType, messageData);

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
  }, []);

  const handleFibonacciCalculate = useCallback(async (count: number) => {
    setIsProcessing(true);
    setFibonacciError(null);
    setFibonacciResult(null);
    
    const startTime = window.performance.now();

    try {
      const response = await sendWorkerMessage('fibonacci', { count });

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
  }, []);

  const handleGreeting = useCallback(async () => {
    try {
      await sendWorkerMessage('greet', {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send greeting');
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🦀 Rust + WebAssembly + React</h1>
        <p className="subtitle">High-Performance Data Processing with Rust + WebAssembly</p>
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

        <div className="section">
          <MathDemo />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Built with ❤️ using <strong>Rust</strong> → <strong>WebAssembly</strong> → <strong>React</strong>
        </p>
        <p>
          <a href="https://github.com/ThayalanGR/rustify-hackathon-2025" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
