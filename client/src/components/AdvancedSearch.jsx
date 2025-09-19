import React, { useState } from 'react'

export default function AdvancedSearch({ onSearch, onClear, fields = [] }) {
  const [filters, setFilters] = useState({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value && value.toString().trim()) {
        acc[key] = value
      }
      return acc
    }, {})
    onSearch(activeFilters)
  }

  function handleClear() {
    setFilters({})
    onClear()
  }

  function updateFilter(field, value) {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const basicFields = fields.filter(f => f.basic)
  const advancedFields = fields.filter(f => !f.basic)

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Search & Filter</h3>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:underline"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Filters */}
        <div className="grid md:grid-cols-3 gap-4">
          {basicFields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  className="select"
                  value={filters[field.name] || ''}
                  onChange={e => updateFilter(field.name, e.target.value)}
                >
                  <option value="">All {field.label}</option>
                  {field.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === 'date' ? (
                <input
                  type="date"
                  className="input"
                  value={filters[field.name] || ''}
                  onChange={e => updateFilter(field.name, e.target.value)}
                />
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  className="input"
                  placeholder={field.placeholder}
                  value={filters[field.name] || ''}
                  onChange={e => updateFilter(field.name, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className="input"
                  placeholder={field.placeholder}
                  value={filters[field.name] || ''}
                  onChange={e => updateFilter(field.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && advancedFields.length > 0 && (
          <div className="border-t pt-4">
            <div className="grid md:grid-cols-3 gap-4">
              {advancedFields.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium mb-1">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      className="select"
                      value={filters[field.name] || ''}
                      onChange={e => updateFilter(field.name, e.target.value)}
                    >
                      <option value="">All {field.label}</option>
                      {field.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'dateRange' ? (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        className="input"
                        placeholder="From"
                        value={filters[`${field.name}_from`] || ''}
                        onChange={e => updateFilter(`${field.name}_from`, e.target.value)}
                      />
                      <input
                        type="date"
                        className="input"
                        placeholder="To"
                        value={filters[`${field.name}_to`] || ''}
                        onChange={e => updateFilter(`${field.name}_to`, e.target.value)}
                      />
                    </div>
                  ) : field.type === 'numberRange' ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="input"
                        placeholder="Min"
                        value={filters[`${field.name}_min`] || ''}
                        onChange={e => updateFilter(`${field.name}_min`, e.target.value)}
                      />
                      <input
                        type="number"
                        className="input"
                        placeholder="Max"
                        value={filters[`${field.name}_max`] || ''}
                        onChange={e => updateFilter(`${field.name}_max`, e.target.value)}
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="input"
                      placeholder={field.placeholder}
                      value={filters[field.name] || ''}
                      onChange={e => updateFilter(field.name, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button type="submit" className="btn">
            Apply Filters
          </button>
          <button type="button" onClick={handleClear} className="px-4 py-2 border rounded hover:bg-gray-50">
            Clear All
          </button>
        </div>

        {/* Active Filters Display */}
        {Object.keys(filters).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <span className="text-sm font-medium">Active filters:</span>
            {Object.entries(filters).map(([key, value]) => {
              if (!value || !value.toString().trim()) return null
              const field = fields.find(f => f.name === key || key.startsWith(f.name))
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                >
                  {field?.label || key}: {value}
                  <button
                    type="button"
                    onClick={() => updateFilter(key, '')}
                    className="ml-1 hover:text-blue-600"
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </form>
    </div>
  )
}
