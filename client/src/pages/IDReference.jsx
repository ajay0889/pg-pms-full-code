import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function IDReference() {
  const [data, setData] = useState({
    properties: [],
    rooms: [],
    tenants: [],
    loading: true
  })

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    try {
      const [propertiesRes, roomsRes, tenantsRes] = await Promise.all([
        api.get('/properties'),
        api.get('/rooms'),
        api.get('/tenants')
      ])

      setData({
        properties: Array.isArray(propertiesRes.data) ? propertiesRes.data : (propertiesRes.data.data || []),
        rooms: Array.isArray(roomsRes.data) ? roomsRes.data : (roomsRes.data.data || []),
        tenants: Array.isArray(tenantsRes.data) ? tenantsRes.data : (tenantsRes.data.data || []),
        loading: false
      })
    } catch (error) {
      console.error('Error loading reference data:', error)
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  function copyToClipboard(id, type) {
    navigator.clipboard.writeText(id)
    alert(`${type} ID copied to clipboard!`)
  }

  function copyAllIDs(type) {
    const ids = data[type].map(item => item._id).join('\n')
    navigator.clipboard.writeText(ids)
    alert(`All ${type} IDs copied to clipboard!`)
  }

  if (data.loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">ID Reference</h2>
        <div className="card text-center py-8">
          <p>Loading reference data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">ID Reference</h2>
        <button
          onClick={loadAllData}
          className="btn"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 Quick Reference Guide</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Property ID</strong> - Required when creating rooms, tenants, payments, complaints</p>
          <p>• <strong>Room ID</strong> - Optional when creating tenants (assigns room)</p>
          <p>• <strong>Tenant ID</strong> - Required when recording payments</p>
          <p>• <strong>Click the 📋 button</strong> to copy any ID to clipboard</p>
        </div>
      </div>

      {/* Properties */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">🏢 Properties ({data.properties.length})</h3>
          {data.properties.length > 0 && (
            <button
              onClick={() => copyAllIDs('properties')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Copy All IDs
            </button>
          )}
        </div>
        
        {data.properties.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No properties found. Add properties first.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {data.properties.map(property => (
              <div key={property._id} className="border rounded p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{property.name}</div>
                    <div className="text-sm text-gray-600">{property.code} • {property.city}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(property._id, 'Property')}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                  >
                    📋 Copy ID
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono block">
                    {property._id}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rooms */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">🏠 Rooms ({data.rooms.length})</h3>
          {data.rooms.length > 0 && (
            <button
              onClick={() => copyAllIDs('rooms')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Copy All IDs
            </button>
          )}
        </div>
        
        {data.rooms.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No rooms found. Add rooms first.</p>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.rooms.map(room => (
              <div key={room._id} className="border rounded p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">Room {room.number}</div>
                    <div className="text-xs text-gray-600">{room.type} • ₹{room.rent}</div>
                    <div className={`text-xs mt-1 ${room.status === 'VACANT' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {room.status}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(room._id, 'Room')}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Copy Room ID"
                  >
                    📋
                  </button>
                </div>
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono block">
                  {room._id}
                </code>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tenants */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">👥 Tenants ({data.tenants.length})</h3>
          {data.tenants.length > 0 && (
            <button
              onClick={() => copyAllIDs('tenants')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Copy All IDs
            </button>
          )}
        </div>
        
        {data.tenants.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No tenants found. Add tenants first.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {data.tenants.map(tenant => (
              <div key={tenant._id} className="border rounded p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{tenant.name}</div>
                    <div className="text-sm text-gray-600">{tenant.phone}</div>
                    <div className="text-xs text-gray-500">
                      Room: {tenant.roomId?.number || 'Not assigned'} • Rent: ₹{tenant.monthlyRent}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(tenant._id, 'Tenant')}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                  >
                    📋 Copy ID
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono block">
                    {tenant._id}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="card bg-green-50 border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-3">💡 How to Use IDs</h3>
        <div className="text-sm text-green-700 space-y-2">
          <div><strong>Creating a Tenant:</strong></div>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Copy a <strong>Property ID</strong> from above and paste in "Property ID" field</li>
            <li>Optionally copy a <strong>Room ID</strong> to assign a specific room</li>
            <li>Fill in tenant details and submit</li>
          </ul>
          
          <div className="mt-3"><strong>Recording a Payment:</strong></div>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Copy a <strong>Tenant ID</strong> from above and paste in "Tenant ID" field</li>
            <li>Copy the corresponding <strong>Property ID</strong></li>
            <li>Enter payment details and submit</li>
          </ul>
          
          <div className="mt-3"><strong>Creating Rooms:</strong></div>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Copy a <strong>Property ID</strong> from the Properties section</li>
            <li>Use it when creating new rooms</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
