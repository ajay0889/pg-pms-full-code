import React, { useState } from 'react'
import api from '../services/api'

export default function Reports() {
  const [activeReport, setActiveReport] = useState('financial')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [error, setError] = useState('')
  
  // Filter states
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [filters, setFilters] = useState({
    propertyId: '',
    type: '',
    status: '',
    category: ''
  })

  async function generateReport() {
    setLoading(true)
    setError('')
    
    try {
      let endpoint = ''
      const params = new URLSearchParams()
      
      // Add common filters
      if (filters.propertyId) params.append('propertyId', filters.propertyId)
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)
      
      switch (activeReport) {
        case 'financial':
          endpoint = '/analytics/financial-report'
          if (filters.type) params.append('type', filters.type)
          break
        case 'occupancy':
          endpoint = '/analytics/occupancy-report'
          break
        case 'maintenance':
          endpoint = '/analytics/maintenance-report'
          if (filters.status) params.append('status', filters.status)
          if (filters.category) params.append('category', filters.category)
          break
        default:
          endpoint = '/analytics/financial-report'
      }
      
      const { data } = await api.get(`${endpoint}?${params.toString()}`)
      setReportData(data)
    } catch (err) {
      setError('Failed to generate report')
      console.error('Report generation error:', err)
    } finally {
      setLoading(false)
    }
  }

  function exportToCSV() {
    if (!reportData) return
    
    let csvContent = ''
    let filename = `${activeReport}_report_${new Date().toISOString().split('T')[0]}.csv`
    
    switch (activeReport) {
      case 'financial':
        csvContent = 'Date,Type,Amount,Tenant,Reference\n'
        reportData.payments.forEach(payment => {
          csvContent += `${new Date(payment.createdAt).toLocaleDateString()},${payment.type},${payment.amount},"${payment.tenantId?.name || 'N/A'}","${payment.reference || 'N/A'}"\n`
        })
        break
      case 'occupancy':
        csvContent = 'Room Number,Type,Status,Tenant,Property\n'
        reportData.rooms.forEach(room => {
          csvContent += `${room.number},${room.type},${room.status},"${room.tenant?.name || 'N/A'}","${room.propertyId?.name || 'N/A'}"\n`
        })
        break
      case 'maintenance':
        csvContent = 'Date,Category,Status,Description,Tenant,Assigned To\n'
        reportData.complaints.forEach(complaint => {
          csvContent += `${new Date(complaint.createdAt).toLocaleDateString()},${complaint.category},${complaint.status},"${complaint.description}","${complaint.tenantId?.name || 'N/A'}","${complaint.assignedTo?.name || 'N/A'}"\n`
        })
        break
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Reports</h2>
      
      {/* Report Type Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Report Type</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setActiveReport('financial')}
            className={`px-4 py-2 rounded ${activeReport === 'financial' ? 'bg-gray-900 text-white' : 'bg-gray-200'}`}
          >
            Financial Report
          </button>
          <button
            onClick={() => setActiveReport('occupancy')}
            className={`px-4 py-2 rounded ${activeReport === 'occupancy' ? 'bg-gray-900 text-white' : 'bg-gray-200'}`}
          >
            Occupancy Report
          </button>
          <button
            onClick={() => setActiveReport('maintenance')}
            className={`px-4 py-2 rounded ${activeReport === 'maintenance' ? 'bg-gray-900 text-white' : 'bg-gray-200'}`}
          >
            Maintenance Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <input
            type="text"
            className="input"
            placeholder="Property ID"
            value={filters.propertyId}
            onChange={e => setFilters({...filters, propertyId: e.target.value})}
          />
          
          {activeReport !== 'occupancy' && (
            <>
              <input
                type="date"
                className="input"
                placeholder="Start Date"
                value={dateRange.startDate}
                onChange={e => setDateRange({...dateRange, startDate: e.target.value})}
              />
              <input
                type="date"
                className="input"
                placeholder="End Date"
                value={dateRange.endDate}
                onChange={e => setDateRange({...dateRange, endDate: e.target.value})}
              />
            </>
          )}
          
          {activeReport === 'financial' && (
            <select
              className="select"
              value={filters.type}
              onChange={e => setFilters({...filters, type: e.target.value})}
            >
              <option value="">All Payment Types</option>
              <option value="RENT">Rent</option>
              <option value="FOOD">Food</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="OTHER">Other</option>
            </select>
          )}
          
          {activeReport === 'maintenance' && (
            <>
              <select
                className="select"
                value={filters.status}
                onChange={e => setFilters({...filters, status: e.target.value})}
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              <select
                className="select"
                value={filters.category}
                onChange={e => setFilters({...filters, category: e.target.value})}
              >
                <option value="">All Categories</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="CLEANING">Cleaning</option>
                <option value="SECURITY">Security</option>
                <option value="OTHER">Other</option>
              </select>
            </>
          )}
        </div>
        
        <div className="mt-4 flex gap-4">
          <button onClick={generateReport} className="btn" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {reportData && (
            <button onClick={exportToCSV} className="px-4 py-2 border rounded hover:bg-gray-50">
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card text-red-600">
          <p>{error}</p>
        </div>
      )}

      {/* Report Results */}
      {reportData && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {activeReport.charAt(0).toUpperCase() + activeReport.slice(1)} Report Results
            </h3>
          </div>
          
          {activeReport === 'financial' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium">Total Revenue</h4>
                  <p className="text-2xl font-bold">₹{reportData.summary.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium">Total Transactions</h4>
                  <p className="text-2xl font-bold">{reportData.summary.totalTransactions}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium">Average Transaction</h4>
                  <p className="text-2xl font-bold">
                    ₹{Math.round(reportData.summary.totalRevenue / reportData.summary.totalTransactions || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Breakdown by Type */}
              <div>
                <h4 className="font-medium mb-3">Revenue by Type</h4>
                <div className="space-y-2">
                  {reportData.summary.byType.map(type => (
                    <div key={type._id} className="flex justify-between">
                      <span>{type._id}</span>
                      <span className="font-medium">₹{type.totalAmount.toLocaleString()} ({type.count} transactions)</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Recent Transactions */}
              <div>
                <h4 className="font-medium mb-3">Recent Transactions</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Tenant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.payments.slice(0, 10).map(payment => (
                        <tr key={payment._id} className="border-b">
                          <td className="p-2">{new Date(payment.createdAt).toLocaleDateString()}</td>
                          <td className="p-2">{payment.type}</td>
                          <td className="p-2">₹{payment.amount}</td>
                          <td className="p-2">{payment.tenantId?.name || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {activeReport === 'occupancy' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium">Total Rooms</h4>
                  <p className="text-2xl font-bold">{reportData.summary.totalRooms}</p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <h4 className="font-medium">Occupied</h4>
                  <p className="text-2xl font-bold text-green-600">{reportData.summary.occupiedRooms}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-medium">Vacant</h4>
                  <p className="text-2xl font-bold text-blue-600">{reportData.summary.vacantRooms}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded">
                  <h4 className="font-medium">Occupancy Rate</h4>
                  <p className="text-2xl font-bold text-yellow-600">{reportData.summary.occupancyRate}%</p>
                </div>
              </div>
              
              {/* Room Details */}
              <div>
                <h4 className="font-medium mb-3">Room Details</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Room</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Tenant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.rooms.map(room => (
                        <tr key={room._id} className="border-b">
                          <td className="p-2">{room.number}</td>
                          <td className="p-2">{room.type}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              room.status === 'OCCUPIED' ? 'bg-green-100 text-green-800' :
                              room.status === 'VACANT' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {room.status}
                            </span>
                          </td>
                          <td className="p-2">{room.tenant?.name || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {activeReport === 'maintenance' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">By Status</h4>
                  <div className="space-y-2">
                    {Object.entries(reportData.summary.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span>{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">By Category</h4>
                  <div className="space-y-2">
                    {Object.entries(reportData.summary.byCategory).map(([category, count]) => (
                      <div key={category} className="flex justify-between">
                        <span>{category}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Complaints List */}
              <div>
                <h4 className="font-medium mb-3">Recent Complaints</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Tenant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.complaints.slice(0, 10).map(complaint => (
                        <tr key={complaint._id} className="border-b">
                          <td className="p-2">{new Date(complaint.createdAt).toLocaleDateString()}</td>
                          <td className="p-2">{complaint.category}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              complaint.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                              complaint.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {complaint.status}
                            </span>
                          </td>
                          <td className="p-2 max-w-xs truncate">{complaint.description}</td>
                          <td className="p-2">{complaint.tenantId?.name || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
