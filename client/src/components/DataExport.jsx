import React, { useState } from 'react'
import api from '../services/api'

export default function DataExport({ entityType, title, exportEndpoint, sampleData = [] }) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [showSample, setShowSample] = useState(false)

  async function handleExport(format = 'csv') {
    try {
      setExporting(true)
      const response = await api.get(`${exportEndpoint}/export?format=${format}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${entityType}_export_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  async function handleImport() {
    if (!importFile) return

    try {
      setImporting(true)
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await api.post(`${exportEndpoint}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      alert(`Import successful! ${response.data.imported} records imported, ${response.data.errors || 0} errors.`)
      setImportFile(null)
      
      // Refresh the page to show new data
      window.location.reload()
    } catch (error) {
      console.error('Import failed:', error)
      alert(`Import failed: ${error.response?.data?.error || 'Please try again.'}`)
    } finally {
      setImporting(false)
    }
  }

  function generateSampleCSV() {
    if (sampleData.length === 0) return

    const headers = Object.keys(sampleData[0])
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => 
        headers.map(header => {
          const value = row[header]
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${entityType}_sample.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">{title} - Data Import/Export</h3>
      
      {/* Export Section */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Export Data</h4>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="btn"
          >
            {exporting ? 'Exporting...' : 'Export as CSV'}
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Export as JSON
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="border-t pt-6">
        <h4 className="font-medium mb-3">Import Data</h4>
        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => setImportFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={!importFile || importing}
              className="btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : 'Import Data'}
            </button>
            
            {sampleData.length > 0 && (
              <>
                <button
                  onClick={() => setShowSample(!showSample)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  {showSample ? 'Hide' : 'Show'} Sample Format
                </button>
                
                <button
                  onClick={generateSampleCSV}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Download Sample CSV
                </button>
              </>
            )}
          </div>

          {/* Sample Data Preview */}
          {showSample && sampleData.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h5 className="font-medium mb-2">Sample CSV Format:</h5>
              <pre className="text-xs overflow-x-auto">
                {Object.keys(sampleData[0]).join(',')}
                {'\n'}
                {sampleData.slice(0, 2).map(row => 
                  Object.values(row).join(',')
                ).join('\n')}
              </pre>
            </div>
          )}

          {/* Import Instructions */}
          <div className="text-sm text-gray-600">
            <p className="font-medium">Import Instructions:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Supported formats: CSV, JSON</li>
              <li>CSV files should have headers in the first row</li>
              <li>Required fields must be provided</li>
              <li>Existing records with matching IDs will be updated</li>
              <li>Invalid records will be skipped and reported</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
