import React, { useState } from 'react'
import { message } from 'antd'
import { industryService, CSVImportResult } from '../services/industryService'
import { validateCSVFile } from '../utils/validation'

interface CSVImporterProps {
  onImportComplete?: () => void
}

export const CSVImporter: React.FC<CSVImporterProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<CSVImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate CSV file
      const validation = validateCSVFile(selectedFile)
      if (!validation.valid) {
        setError(validation.message || '文件验证失败')
        message.error(validation.message || '文件验证失败')
        setFile(null)
        return
      }
      
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError('请先选择文件')
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const csvContent = await file.text()
      const importResult = await industryService.importCSV(csvContent)
      setResult(importResult)
      
      if (importResult.errorCount === 0) {
        // Clear file selection on success
        setFile(null)
        const fileInput = document.getElementById('csv-file-input') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
      }

      if (onImportComplete) {
        onImportComplete()
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '导入失败，请检查文件格式')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="csv-importer">
      <div className="csv-importer-header">
        <h3>CSV批量导入</h3>
        <p className="csv-importer-description">
          上传CSV文件批量导入行业和子行业数据。文件应包含以下列：
          <br />
          <strong>格式1（英文）：</strong>Tier 1 Industry, Tier 2 Sub Industry, AWS Definition
          <br />
          <strong>格式2（中文）：</strong>行业名称、行业定义、子行业名称、子行业定义、典型全球企业（可选）、典型中国企业（可选）
        </p>
      </div>

      <div className="csv-importer-body">
        <div className="file-input-group">
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={importing}
            className="file-input"
          />
          <label htmlFor="csv-file-input" className="file-input-label">
            {file ? file.name : '选择CSV文件'}
          </label>
        </div>

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="import-button"
        >
          {importing ? '导入中...' : '开始导入'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>错误：</strong> {error}
        </div>
      )}

      {result && (
        <div className="import-result">
          <h4>导入结果</h4>
          <div className="result-summary">
            <div className="result-item success">
              <span className="result-label">成功：</span>
              <span className="result-value">{result.successCount}</span>
            </div>
            <div className="result-item skip">
              <span className="result-label">跳过（重复）：</span>
              <span className="result-value">{result.skipCount}</span>
            </div>
            <div className="result-item error">
              <span className="result-label">错误：</span>
              <span className="result-value">{result.errorCount}</span>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="error-details">
              <h5>错误详情：</h5>
              <ul>
                {result.errors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style>{`
        .csv-importer {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .csv-importer-header h3 {
          margin: 0 0 12px 0;
          color: #1a1a1a;
          font-size: 20px;
        }

        .csv-importer-description {
          color: #666;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
        }

        .csv-importer-body {
          margin-top: 20px;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .file-input-group {
          flex: 1;
        }

        .file-input {
          display: none;
        }

        .file-input-label {
          display: block;
          padding: 10px 16px;
          background: #f5f5f5;
          border: 2px dashed #d0d0d0;
          border-radius: 6px;
          cursor: pointer;
          text-align: center;
          color: #666;
          transition: all 0.2s;
        }

        .file-input-label:hover {
          background: #e8e8e8;
          border-color: #b0b0b0;
        }

        .import-button {
          padding: 10px 24px;
          background: #1890ff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
        }

        .import-button:hover:not(:disabled) {
          background: #40a9ff;
        }

        .import-button:disabled {
          background: #d0d0d0;
          cursor: not-allowed;
        }

        .alert {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 14px;
        }

        .alert-error {
          background: #fff2f0;
          border: 1px solid #ffccc7;
          color: #cf1322;
        }

        .import-result {
          margin-top: 20px;
          padding: 16px;
          background: #f9f9f9;
          border-radius: 6px;
        }

        .import-result h4 {
          margin: 0 0 12px 0;
          color: #1a1a1a;
          font-size: 16px;
        }

        .result-summary {
          display: flex;
          gap: 24px;
          margin-bottom: 16px;
        }

        .result-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .result-label {
          font-weight: 500;
          color: #666;
        }

        .result-value {
          font-size: 20px;
          font-weight: 600;
        }

        .result-item.success .result-value {
          color: #52c41a;
        }

        .result-item.skip .result-value {
          color: #faad14;
        }

        .result-item.error .result-value {
          color: #f5222d;
        }

        .error-details {
          margin-top: 16px;
          padding: 12px;
          background: white;
          border-radius: 4px;
          border: 1px solid #ffccc7;
        }

        .error-details h5 {
          margin: 0 0 8px 0;
          color: #cf1322;
          font-size: 14px;
        }

        .error-details ul {
          margin: 0;
          padding-left: 20px;
          color: #666;
          font-size: 13px;
        }

        .error-details li {
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  )
}
