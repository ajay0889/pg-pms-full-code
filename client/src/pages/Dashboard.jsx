import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Dashboard(){
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadAnalytics() }, [])

  async function loadAnalytics() {
    try {
      setLoading(true)
      setError('')
      const { data } = await api.get('/analytics/dashboard')
      setAnalytics(data)
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Error loading analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="card text-center py-8">
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="card text-center py-8 text-red-600">
          <p>{error}</p>
          <button onClick={loadAnalytics} className="btn mt-3">Retry</button>
        </div>
      </div>
    )
  }

  const { overview, revenue, recentActivity } = analytics

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      
      {/* Enhanced KPI Cards */}
      <div className="dashboard-grid">
        <div className="dashboard-card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Total Rooms</h3>
              <p className="text-3xl font-bold">{overview.totalRooms}</p>
              <p className="text-sm opacity-75">{overview.occupancyRate}% Occupied</p>
            </div>
            <div className="text-4xl opacity-20">🏠</div>
          </div>
        </div>
        
        <div className="dashboard-card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Active Tenants</h3>
              <p className="text-3xl font-bold">{overview.totalTenants}</p>
              <p className="text-sm opacity-75">{overview.occupiedRooms} rooms occupied</p>
            </div>
            <div className="text-4xl opacity-20">👥</div>
          </div>
        </div>
        
        <div className="dashboard-card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">This Month Revenue</h3>
              <p className="text-3xl font-bold">₹{revenue.thisMonth.toLocaleString()}</p>
              <p className="text-sm opacity-75">
                {revenue.growth >= 0 ? '↗️' : '↘️'} {Math.abs(revenue.growth)}% from last month
              </p>
            </div>
            <div className="text-4xl opacity-20">💰</div>
          </div>
        </div>
        
        <div className={`dashboard-card ${overview.pendingComplaints > 0 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-gray-500 to-gray-600'} text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Pending Issues</h3>
              <p className="text-3xl font-bold">{overview.pendingComplaints}</p>
              <p className="text-sm opacity-75">{overview.resolvedComplaints} resolved</p>
            </div>
            <div className="text-4xl opacity-20">🔧</div>
          </div>
        </div>
      </div>

      {/* Room Status */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Room Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Occupied</span>
              <span className="font-medium text-green-600">{overview.occupiedRooms}</span>
            </div>
            <div className="flex justify-between">
              <span>Vacant</span>
              <span className="font-medium text-blue-600">{overview.vacantRooms}</span>
            </div>
            <div className="flex justify-between">
              <span>Maintenance</span>
              <span className="font-medium text-yellow-600">{overview.maintenanceRooms}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Alerts</h3>
          <div className="space-y-3">
            {overview.lowStockItems > 0 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <span>⚠️</span>
                <span>{overview.lowStockItems} items low in stock</span>
              </div>
            )}
            {overview.pendingComplaints > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <span>🔧</span>
                <span>{overview.pendingComplaints} pending complaints</span>
              </div>
            )}
            {overview.vacantRooms > 0 && (
              <div className="flex items-center gap-2 text-blue-600">
                <span>🏠</span>
                <span>{overview.vacantRooms} vacant rooms available</span>
              </div>
            )}
            {overview.lowStockItems === 0 && overview.pendingComplaints === 0 && (
              <div className="text-green-600">✅ All systems running smoothly</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
          <div className="space-y-2">
            {recentActivity.payments.length > 0 ? (
              recentActivity.payments.map(payment => (
                <div key={payment._id} className="flex justify-between text-sm">
                  <span>{payment.tenantId?.name || 'Unknown'}</span>
                  <span className="font-medium">₹{payment.amount}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No recent payments</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Complaints</h3>
          <div className="space-y-2">
            {recentActivity.complaints.length > 0 ? (
              recentActivity.complaints.map(complaint => (
                <div key={complaint._id} className="text-sm">
                  <div className="font-medium">{complaint.category}</div>
                  <div className="text-gray-600 truncate">{complaint.description}</div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No recent complaints</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">New Tenants</h3>
          <div className="space-y-2">
            {recentActivity.tenants.length > 0 ? (
              recentActivity.tenants.map(tenant => (
                <div key={tenant._id} className="flex justify-between text-sm">
                  <span>{tenant.name}</span>
                  <span className="text-gray-600">Room {tenant.roomId?.number || 'TBD'}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No new tenants</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
