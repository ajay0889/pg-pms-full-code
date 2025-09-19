import React, { useState } from 'react'
import api from '../services/api'

export default function BulkActions({ 
  selectedItems, 
  onSelectionChange, 
  onActionComplete, 
  entityType = 'items',
  availableActions = []
}) {
  const [showActions, setShowActions] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [actionType, setActionType] = useState('')

  const defaultActions = {
    tenants: [
      { id: 'delete', label: 'Delete Selected', icon: '🗑️', color: 'text-red-600', dangerous: true },
      { id: 'export', label: 'Export Selected', icon: '📤', color: 'text-blue-600' },
      { id: 'updateRent', label: 'Update Rent', icon: '💰', color: 'text-green-600' },
      { id: 'sendReminder', label: 'Send Rent Reminder', icon: '📧', color: 'text-yellow-600' }
    ],
    payments: [
      { id: 'delete', label: 'Delete Selected', icon: '🗑️', color: 'text-red-600', dangerous: true },
      { id: 'export', label: 'Export Selected', icon: '📤', color: 'text-blue-600' },
      { id: 'markPaid', label: 'Mark as Paid', icon: '✅', color: 'text-green-600' }
    ],
    complaints: [
      { id: 'delete', label: 'Delete Selected', icon: '🗑️', color: 'text-red-600', dangerous: true },
      { id: 'updateStatus', label: 'Update Status', icon: '🔄', color: 'text-blue-600' },
      { id: 'assign', label: 'Assign to Staff', icon: '👤', color: 'text-purple-600' }
    ],
    rooms: [
      { id: 'updateStatus', label: 'Update Status', icon: '🔄', color: 'text-blue-600' },
      { id: 'updateRent', label: 'Update Rent', icon: '💰', color: 'text-green-600' },
      { id: 'export', label: 'Export Selected', icon: '📤', color: 'text-blue-600' }
    ]
  }

  const actions = availableActions.length > 0 ? availableActions : (defaultActions[entityType] || [])

  async function handleBulkAction(action) {
    if (selectedItems.length === 0) {
      alert('Please select items first')
      return
    }

    if (action.dangerous) {
      const confirmed = window.confirm(
        `Are you sure you want to ${action.label.toLowerCase()} ${selectedItems.length} ${entityType}? This action cannot be undone.`
      )
      if (!confirmed) return
    }

    setProcessing(true)
    setActionType(action.id)

    try {
      let result
      switch (action.id) {
        case 'delete':
          result = await handleBulkDelete()
          break
        case 'export':
          result = await handleBulkExport()
          break
        case 'updateRent':
          result = await handleBulkUpdateRent()
          break
        case 'updateStatus':
          result = await handleBulkUpdateStatus()
          break
        case 'sendReminder':
          result = await handleSendReminders()
          break
        default:
          result = await handleCustomAction(action)
      }

      if (result.success) {
        alert(`${action.label} completed successfully! ${result.message || ''}`)
        onActionComplete()
        onSelectionChange([])
      } else {
        alert(`${action.label} failed: ${result.error}`)
      }
    } catch (error) {
      console.error(`Error performing ${action.label}:`, error)
      alert(`Error: ${error.message || 'Operation failed'}`)
    } finally {
      setProcessing(false)
      setActionType('')
      setShowActions(false)
    }
  }

  async function handleBulkDelete() {
    const promises = selectedItems.map(id => api.delete(`/${entityType}/${id}`))
    const results = await Promise.allSettled(promises)
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - successful

    return {
      success: failed === 0,
      message: `${successful} deleted${failed > 0 ? `, ${failed} failed` : ''}`
    }
  }

  async function handleBulkExport() {
    try {
      const params = new URLSearchParams()
      selectedItems.forEach(id => params.append('ids', id))
      
      const response = await api.get(`/${entityType}/export?${params.toString()}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${entityType}_selected_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      return { success: true, message: `${selectedItems.length} items exported` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function handleBulkUpdateRent() {
    const newRent = prompt('Enter new rent amount:')
    if (!newRent || isNaN(newRent)) {
      return { success: false, error: 'Invalid rent amount' }
    }

    const promises = selectedItems.map(id => 
      api.patch(`/${entityType}/${id}`, { monthlyRent: parseFloat(newRent) })
    )
    const results = await Promise.allSettled(promises)
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - successful

    return {
      success: failed === 0,
      message: `${successful} updated${failed > 0 ? `, ${failed} failed` : ''}`
    }
  }

  async function handleBulkUpdateStatus() {
    const statusOptions = {
      rooms: ['VACANT', 'OCCUPIED', 'MAINTENANCE'],
      complaints: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
    }

    const options = statusOptions[entityType] || []
    if (options.length === 0) {
      return { success: false, error: 'Status update not available for this entity type' }
    }

    const newStatus = prompt(`Select new status:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nEnter number:`)
    const statusIndex = parseInt(newStatus) - 1
    
    if (statusIndex < 0 || statusIndex >= options.length) {
      return { success: false, error: 'Invalid status selection' }
    }

    const selectedStatus = options[statusIndex]
    const promises = selectedItems.map(id => 
      api.patch(`/${entityType}/${id}`, { status: selectedStatus })
    )
    const results = await Promise.allSettled(promises)
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - successful

    return {
      success: failed === 0,
      message: `${successful} updated to ${selectedStatus}${failed > 0 ? `, ${failed} failed` : ''}`
    }
  }

  async function handleSendReminders() {
    try {
      const { data } = await api.post(`/${entityType}/bulk-reminder`, {
        tenantIds: selectedItems
      })
      
      return {
        success: true,
        message: `Reminders sent to ${data.sent} tenants${data.failed ? `, ${data.failed} failed` : ''}`
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function handleCustomAction(action) {
    // Handle custom actions defined by parent component
    if (typeof action.handler === 'function') {
      return await action.handler(selectedItems)
    }
    
    return { success: false, error: 'Action not implemented' }
  }

  function selectAll() {
    // This would need to be implemented by parent component
    // For now, we'll just show a message
    alert('Select All functionality needs to be implemented by the parent component')
  }

  function clearSelection() {
    onSelectionChange([])
  }

  if (selectedItems.length === 0) {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-blue-800">
            {selectedItems.length} {entityType} selected
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Clear Selection
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActions(!showActions)}
            disabled={processing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {processing ? 'Processing...' : 'Bulk Actions'}
          </button>
        </div>
      </div>

      {/* Actions Dropdown */}
      {showActions && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleBulkAction(action)}
                disabled={processing}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 ${action.color}`}
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
                {processing && actionType === action.id && (
                  <span className="text-xs">...</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
