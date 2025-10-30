import { useState } from 'react';

interface FibonacciCalculatorProps {
  onCalculate: (count: number) => void;
  isProcessing: boolean;
}

interface FibonacciResult {
  numbers: number[];
  count: number;
  last_value: number;
}

interface FibonacciDisplayProps {
  result: FibonacciResult | null;
  performance: number | null;
  error: string | null;
}

export function FibonacciCalculator({ onCalculate, isProcessing }: FibonacciCalculatorProps) {
  const [count, setCount] = useState(10);

  const handleCalculate = () => {
    onCalculate(count);
  };

  return (
    <div className="fibonacci-calculator">
      <h3>🔢 Fibonacci Calculator</h3>
      <div className="input-group">
        <label htmlFor="fibCount">Number of Fibonacci numbers to calculate:</label>
        <input
          id="fibCount"
          type="number"
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
          min="1"
          max="1000"
          disabled={isProcessing}
        />
        <button 
          onClick={handleCalculate}
          disabled={isProcessing}
          className="calculate-btn"
        >
          {isProcessing ? '🔄 Calculating...' : '🚀 Calculate Fibonacci'}
        </button>
      </div>
      <small>Note: Limited to 1000 numbers for performance</small>
    </div>
  );
}

export function FibonacciDisplay({ result, performance, error }: FibonacciDisplayProps) {
  if (error) {
    return (
      <div className="fibonacci-result error">
        <h4>❌ Calculation Error</h4>
        <p>{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="fibonacci-result">
        <h4>🔢 Fibonacci Results</h4>
        <p>Click calculate to see Fibonacci sequence results.</p>
      </div>
    );
  }

  return (
    <div className="fibonacci-result">
      <h4>🔢 Fibonacci Results</h4>
      
      <div className="fibonacci-stats">
        <div className="stat">
          <span className="label">Count:</span>
          <span className="value">{result.count}</span>
        </div>
        <div className="stat">
          <span className="label">Last Value:</span>
          <span className="value">{result.last_value.toLocaleString()}</span>
        </div>
        {performance && (
          <div className="stat">
            <span className="label">Calculation Time:</span>
            <span className="value">{performance.toFixed(2)} ms</span>
          </div>
        )}
      </div>

      <div className="fibonacci-sequence">
        <h5>First 20 numbers:</h5>
        <div className="sequence-display">
          {result.numbers.slice(0, 20).map((num, index) => (
            <span key={index} className="fibonacci-number">
              {num.toLocaleString()}
            </span>
          ))}
          {result.numbers.length > 20 && <span className="more-indicator">...</span>}
        </div>
      </div>

      {result.numbers.length > 20 && (
        <div className="fibonacci-summary">
          <p>
            Calculated {result.count} Fibonacci numbers. 
            The largest value is {result.last_value.toLocaleString()}.
          </p>
        </div>
      )}
    </div>
  );
}