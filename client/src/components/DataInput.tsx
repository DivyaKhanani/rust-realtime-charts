import React, { useRef, useState } from 'react';

interface DataInputProps {
  onDataSubmit: (data: string, type: 'csv' | 'simple') => void;
  isProcessing: boolean;
}

export function DataInput({ onDataSubmit, isProcessing }: DataInputProps) {
  const [inputData, setInputData] = useState('10,20,30,40,50,60,70,80,90,100');
  const [csvData, setCsvData] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
    };
    reader.readAsText(file);
  };

  const handleSubmitSimple = () => {
    onDataSubmit(inputData, 'simple');
  };

  const handleSubmitCsv = () => {
    onDataSubmit(csvData, 'csv');
  };

  const generateSampleCsv = () => {
    const sampleData = Array.from({ length: 100 }, () => 
      Array.from({ length: 5 }, () => Math.floor(Math.random() * 1000))
        .join(',')
    ).join('\n');
    setCsvData(sampleData);
  };

  return (
    <div className="data-input-container">
      <h2>📊 Data Input</h2>
      
      {/* Simple Data Input */}
      <div className="input-section">
        <h3>Simple Data (Comma-separated)</h3>
        <div className="input-group">
          <textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder="Enter comma-separated numbers..."
            rows={3}
            cols={50}
            disabled={isProcessing}
          />
          <button 
            onClick={handleSubmitSimple} 
            disabled={isProcessing || !inputData.trim()}
            className="submit-btn"
          >
            {isProcessing ? '🔄 Processing...' : '🚀 Process Simple Data'}
          </button>
        </div>
      </div>

      {/* CSV File Upload */}
      <div className="input-section">
        <h3>CSV File Upload</h3>
        <div className="input-group">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isProcessing}
          />
          <button 
            onClick={generateSampleCsv}
            disabled={isProcessing}
            className="sample-btn"
          >
            📝 Generate Sample CSV
          </button>
        </div>
        
        {csvData && (
          <div className="csv-preview">
            <h4>CSV Preview:</h4>
            <textarea
              value={csvData.slice(0, 500) + (csvData.length > 500 ? '...' : '')}
              readOnly
              rows={5}
              cols={50}
            />
            <div>
              <small>File size: {csvData.length} characters</small>
            </div>
            <button 
              onClick={handleSubmitCsv} 
              disabled={isProcessing || !csvData.trim()}
              className="submit-btn"
            >
              {isProcessing ? '🔄 Processing...' : '🚀 Process CSV Data'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}