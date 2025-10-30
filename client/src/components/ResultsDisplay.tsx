
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

interface ResultsDisplayProps {
  result: ProcessResult | null;
  error: string | null;
  performance: number | null;
}

export function ResultsDisplay({ result, error, performance }: ResultsDisplayProps) {
  if (error) {
    return (
      <div className="results-container error">
        <h2>❌ Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="results-container">
        <h2>📈 Results</h2>
        <p>No data processed yet. Upload some data to see results!</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: result.processed_data.map((_, index) => index + 1),
    datasets: [
      {
        label: 'Original Data',
        data: result.processed_data.map((_, index) => {
          // Reverse normalize to show original values approximately
          const { min, max } = result.stats;
          const range = max - min;
          return range === 0 ? min : result.processed_data[index] * range + min;
        }),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
      },
      {
        label: 'Normalized Data (0-1)',
        data: result.processed_data,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Data Visualization',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="results-container">
      <h2>📈 Processing Results</h2>
      
      {/* Performance Metrics */}
      <div className="performance-section">
        <h3>⚡ Performance</h3>
        <div className="metrics-grid">
          <div className="metric">
            <span className="label">Rust/WASM Processing:</span>
            <span className="value">{result.performance_ms.toFixed(2)} ms</span>
          </div>
          {performance && (
            <div className="metric">
              <span className="label">Total Processing:</span>
              <span className="value">{performance.toFixed(2)} ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-section">
        <h3>📊 Statistics</h3>
        <div className="stats-grid">
          <div className="stat">
            <span className="label">Count:</span>
            <span className="value">{result.stats.count}</span>
          </div>
          <div className="stat">
            <span className="label">Sum:</span>
            <span className="value">{result.stats.sum.toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="label">Mean:</span>
            <span className="value">{result.stats.mean.toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="label">Median:</span>
            <span className="value">{result.stats.median.toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="label">Std Dev:</span>
            <span className="value">{result.stats.std_dev.toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="label">Min:</span>
            <span className="value">{result.stats.min.toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="label">Max:</span>
            <span className="value">{result.stats.max.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Data Visualization */}
      <div className="chart-section">
        <h3>📉 Data Visualization</h3>
        {result.processed_data.length > 0 && (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>

      {/* Raw Data Preview */}
      <div className="raw-data-section">
        <h3>🔢 Processed Data (First 20 values)</h3>
        <div className="data-preview">
          <code>
            {result.processed_data.slice(0, 20).map(n => n.toFixed(4)).join(', ')}
            {result.processed_data.length > 20 && '...'}
          </code>
        </div>
      </div>
    </div>
  );
}