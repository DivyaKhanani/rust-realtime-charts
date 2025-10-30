import React, { useState } from 'react';
import { sendWorkerMessage } from '../worker/workerManager';

interface PrimesResult {
  primes: number[];
  count: number;
  limit: number;
  largest_prime: number;
}

interface PIResult {
  pi_estimate: number;
  iterations: number;
  accuracy: number;
  error_percentage: number;
}

interface MatrixResult {
  result_matrix: number[][];
  dimensions: string;
  operation: string;
}

const MathDemo: React.FC = () => {
  const [primeLimit, setPrimeLimit] = useState<number>(100);
  const [piIterations, setPiIterations] = useState<number>(10000);
  const [primesResult, setPrimesResult] = useState<PrimesResult | null>(null);
  const [piResult, setPiResult] = useState<PIResult | null>(null);
  const [matrixResult, setMatrixResult] = useState<MatrixResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string>('');

  // Using shared worker manager

  const calculatePrimes = async () => {
    setIsCalculating(prev => ({ ...prev, primes: true }));
    setError('');
    
    try {
      const result = await sendWorkerMessage('calculate_primes', { limit: primeLimit });
      
      if (result.success) {
        setPrimesResult(result.result as PrimesResult);
      } else {
        setError(result.error || 'Failed to calculate primes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCalculating(prev => ({ ...prev, primes: false }));
    }
  };

  const calculatePI = async () => {
    setIsCalculating(prev => ({ ...prev, pi: true }));
    setError('');
    
    try {
      const result = await sendWorkerMessage('monte_carlo_pi', { iterations: piIterations });
      
      if (result.success) {
        setPiResult(result.result as PIResult);
      } else {
        setError(result.error || 'Failed to calculate PI');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCalculating(prev => ({ ...prev, pi: false }));
    }
  };

  const multiplyMatrices = async () => {
    setIsCalculating(prev => ({ ...prev, matrix: true }));
    setError('');
    
    try {
      const result = await sendWorkerMessage('matrix_multiply', {});
      
      if (result.success) {
        setMatrixResult(result.result as MatrixResult);
      } else {
        setError(result.error || 'Failed to multiply matrices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCalculating(prev => ({ ...prev, matrix: false }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">🧮 Mathematical Operations</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Prime Numbers Calculator */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">🔢 Prime Numbers</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Calculate primes up to:
            </label>
            <input
              type="number"
              value={primeLimit}
              onChange={(e) => setPrimeLimit(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              min="2"
              max="10000"
            />
          </div>
          <button
            onClick={calculatePrimes}
            disabled={isCalculating.primes}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
          >
            {isCalculating.primes ? '🔄 Calculating...' : '▶️ Calculate Primes'}
          </button>
          
          {primesResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm"><strong>Count:</strong> {primesResult.count}</p>
              <p className="text-sm"><strong>Largest:</strong> {primesResult.largest_prime}</p>
              <p className="text-sm"><strong>First 10:</strong></p>
              <p className="text-xs text-gray-600 break-words">
                {primesResult.primes.slice(0, 10).join(', ')}
                {primesResult.count > 10 && '...'}
              </p>
            </div>
          )}
        </div>

        {/* Monte Carlo PI Calculator */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">🥧 Monte Carlo π</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Iterations:
            </label>
            <input
              type="number"
              value={piIterations}
              onChange={(e) => setPiIterations(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              min="1000"
              max="1000000"
              step="1000"
            />
          </div>
          <button
            onClick={calculatePI}
            disabled={isCalculating.pi}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
          >
            {isCalculating.pi ? '🔄 Calculating...' : '▶️ Calculate π'}
          </button>
          
          {piResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm"><strong>Estimate:</strong> {piResult.pi_estimate.toFixed(6)}</p>
              <p className="text-sm"><strong>Actual π:</strong> {Math.PI.toFixed(6)}</p>
              <p className="text-sm"><strong>Error:</strong> {piResult.error_percentage.toFixed(3)}%</p>
              <p className="text-sm"><strong>Iterations:</strong> {piResult.iterations.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Matrix Multiplication */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">🔢 Matrix Multiply</h3>
          <p className="text-sm text-gray-600 mb-3">
            Demonstrates matrix multiplication with sample 2×3 and 3×2 matrices.
          </p>
          <button
            onClick={multiplyMatrices}
            disabled={isCalculating.matrix}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
          >
            {isCalculating.matrix ? '🔄 Calculating...' : '▶️ Multiply Matrices'}
          </button>
          
          {matrixResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm"><strong>Operation:</strong> {matrixResult.operation}</p>
              <p className="text-sm"><strong>Result Size:</strong> {matrixResult.dimensions}</p>
              <p className="text-sm"><strong>Result Matrix:</strong></p>
              <div className="text-xs font-mono mt-2">
                {matrixResult.result_matrix.map((row, i) => (
                  <div key={i}>
                    [{row.map(val => val.toFixed(1)).join(', ')}]
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">🚀 Performance Note</h4>
        <p className="text-sm text-blue-700">
          All calculations are performed using compiled Rust WebAssembly code running in a Web Worker 
          for optimal performance without blocking the UI. The WASM module provides significant speed 
          advantages for computationally intensive operations.
        </p>
      </div>
    </div>
  );
};

export default MathDemo;