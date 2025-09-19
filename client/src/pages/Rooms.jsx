import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Rooms(){
  const [rooms, setRooms] = useState([])
  const [form, setForm] = useState({ number:'', type:'', rent:'', propertyId:'', dormCapacity: 4 })
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({
    propertyId: '',
    number: '',
    type: '',
    rent: '',
    dormCapacity: ''
  })

  useEffect(()=>{ 
    load()
    loadProperties()
  },[])
  async function load(){ 
    try {
      const { data } = await api.get('/rooms');
      // Handle both paginated and non-paginated responses
      setRooms(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Error loading rooms:', error);
      setRooms([]);
    }
  }

  async function loadProperties() {
    try {
      const { data } = await api.get('/properties')
      setProperties(Array.isArray(data) ? data : (data.data || []))
    } catch (error) {
      console.error('Error loading properties:', error)
    }
  }

  // Clear field errors
  function clearFieldErrors() {
    setFieldErrors({
      propertyId: '',
      number: '',
      type: '',
      rent: '',
      dormCapacity: ''
    })
  }

  // Validate individual field
  function validateField(fieldName, value) {
    let errorMsg = ''
    
    switch(fieldName) {
      case 'propertyId':
        if (!value || !value.trim()) {
          errorMsg = 'Property selection is required'
        }
        break
        
      case 'number':
        if (!value || !value.trim()) {
          errorMsg = 'Room number is required'
        } else if (value.trim().length > 20) {
          errorMsg = 'Room number must be less than 20 characters'
        } else if (!/^[a-zA-Z0-9\-_]+$/.test(value.trim())) {
          errorMsg = 'Room number can only contain letters, numbers, hyphens, and underscores'
        }
        break
        
      case 'type':
        if (!value || !value.trim()) {
          errorMsg = 'Room type selection is required'
        } else if (!['SINGLE', 'DOUBLE', 'TRIPLE', 'DORM'].includes(value)) {
          errorMsg = 'Invalid room type selected'
        }
        break
        
      case 'rent':
        if (!value || value === '' || value === null || value === undefined) {
          errorMsg = 'Monthly rent is required'
        } else if (isNaN(value) || parseFloat(value) <= 0) {
          errorMsg = 'Rent must be a positive number greater than 0'
        } else if (parseFloat(value) > 1000000) {
          errorMsg = 'Rent amount seems too high (max: ₹10,00,000)'
        }
        break
        
      case 'dormCapacity':
        if (form.type === 'DORM') {
          if (!value || isNaN(value) || parseInt(value) < 4) {
            errorMsg = 'Dorm capacity must be at least 4 people'
          } else if (parseInt(value) > 20) {
            errorMsg = 'Dorm capacity cannot exceed 20 people'
          }
        }
        break
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: errorMsg
    }))
    
    return errorMsg === ''
  }

  // Validate all fields
  function validateAllFields() {
    const isPropertyValid = validateField('propertyId', form.propertyId)
    const isNumberValid = validateField('number', form.number)
    const isTypeValid = validateField('type', form.type)
    const isRentValid = validateField('rent', form.rent)
    const isDormCapacityValid = form.type === 'DORM' ? validateField('dormCapacity', form.dormCapacity) : true
    
    return isPropertyValid && isNumberValid && isTypeValid && isRentValid && isDormCapacityValid
  }

  async function create(e){
    e.preventDefault()
    setLoading(true)
    setError('')
    clearFieldErrors()
    
    // Validate all fields
    if (!validateAllFields()) {
      setError('Please fix the validation errors below.')
      setLoading(false)
      return
    }
    
    try {
      const roomData = {
        ...form,
        number: form.number.trim(),
        rent: parseFloat(form.rent)
      }
      
      // Add custom capacity for DORM type
      if (form.type === 'DORM') {
        roomData.customCapacity = parseInt(form.dormCapacity)
      }
      
      await api.post('/rooms', roomData)
      setForm({ number:'', type:'', rent:'', propertyId:'', dormCapacity: 4 })
      clearFieldErrors()
      await load()
      setError('')
    } catch (error) {
      console.error('Error creating room:', error)
      
      // Handle validation errors from backend
      if (error?.response?.data?.errors) {
        const backendErrors = error.response.data.errors
        const newFieldErrors = { ...fieldErrors }
        
        backendErrors.forEach(err => {
          if (err.param === 'propertyId') {
            newFieldErrors.propertyId = err.msg
          } else if (err.param === 'number') {
            newFieldErrors.number = err.msg
          } else if (err.param === 'type') {
            newFieldErrors.type = err.msg
          } else if (err.param === 'rent') {
            newFieldErrors.rent = err.msg
          }
        })
        
        setFieldErrors(newFieldErrors)
      } else {
        const errorMessage = error.response?.data?.error || 'Failed to create room'
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Rooms</h2>
      <form onSubmit={create} className="card" noValidate>
        <h3 className="text-lg font-semibold mb-4">Add New Room</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Property *</label>
            <select 
              className={`select ${fieldErrors.propertyId ? 'border-red-500 focus:border-red-500' : ''}`}
              value={form.propertyId} 
              onChange={e => {
                setForm({...form, propertyId:e.target.value})
                validateField('propertyId', e.target.value)
              }}
              disabled={loading}
            >
              <option value="">Select property...</option>
              {properties.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.code}) - {p.city}
                </option>
              ))}
            </select>
            {fieldErrors.propertyId && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.propertyId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Room Number *</label>
            <input 
              className={`input ${fieldErrors.number ? 'border-red-500 focus:border-red-500' : ''}`}
              placeholder="e.g., 101, A1, etc." 
              value={form.number} 
              onChange={e => {
                setForm({...form, number:e.target.value})
                validateField('number', e.target.value)
              }}
              disabled={loading}
              maxLength={20}
            />
            {fieldErrors.number && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.number}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Room Type *</label>
            <select 
              className={`select ${fieldErrors.type ? 'border-red-500 focus:border-red-500' : ''}`}
              value={form.type} 
              onChange={e => {
                setForm({...form, type:e.target.value})
                validateField('type', e.target.value)
              }}
              disabled={loading}
            >
              <option value="">Select room type...</option>
              <option value="SINGLE">Single Occupancy (1 person)</option>
              <option value="DOUBLE">Double Occupancy (2 people)</option>
              <option value="TRIPLE">Triple Occupancy (3 people)</option>
              <option value="DORM">Dormitory (4+ people)</option>
            </select>
            {fieldErrors.type && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Monthly Rent *</label>
            <input 
              type="number" 
              className={`input ${fieldErrors.rent ? 'border-red-500 focus:border-red-500' : ''}`}
              placeholder="Amount in ₹" 
              value={form.rent} 
              onChange={e => {
                setForm({...form, rent:e.target.value})
                validateField('rent', e.target.value)
              }}
              disabled={loading}
              min="1"
              step="1"
            />
            {fieldErrors.rent && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.rent}</p>
            )}
          </div>

          {/* Dynamic Dorm Capacity Input */}
          {form.type === 'DORM' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Dorm Capacity *</label>
              <input 
                type="number" 
                className={`input ${fieldErrors.dormCapacity ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="Number of people (minimum 4)" 
                value={form.dormCapacity} 
                onChange={e => {
                  setForm({...form, dormCapacity: e.target.value})
                  validateField('dormCapacity', e.target.value)
                }}
                disabled={loading}
                min="4"
                max="20"
                step="1"
              />
              {fieldErrors.dormCapacity && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.dormCapacity}</p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                Specify exact capacity for dormitory (4-20 people)
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button 
            type="submit" 
            className="btn" 
            disabled={loading}
          >
            {loading ? 'Adding Room...' : 'Add Room'}
          </button>
          <button 
            type="button" 
            onClick={() => {
              setForm({ number:'', type:'', rent:'', propertyId:'', dormCapacity: 4 })
              clearFieldErrors()
              setError('')
            }}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={loading}
          >
            Clear Form
          </button>
        </div>
        
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        
        {/* Validation Rules Helper */}
        <div className="text-xs text-gray-600 mt-4 space-y-1">
          <p><strong>Room Creation Rules:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Property*:</strong> Must select an existing property (required)</li>
            <li><strong>Room Number*:</strong> 1-20 characters, letters/numbers/hyphens/underscores only, unique per property (required)</li>
            <li><strong>Room Type*:</strong> Must select type - determines capacity (Single=1, Double=2, Triple=3, Dorm=4+) (required)</li>
            <li><strong>Monthly Rent*:</strong> Must be a positive number between ₹1 and ₹10,00,000 (required)</li>
            <li><strong>Dorm Capacity*:</strong> When Dorm is selected, specify exact capacity (4-20 people) (conditional)</li>
            <li><strong>Real-time Validation:</strong> Instant feedback as you type, with duplicate room number detection</li>
            <li><strong>Auto-Generated:</strong> Room ID, occupancy status, and capacity calculations</li>
          </ul>
        </div>
      </form>

      {/* Room Statistics */}
      {rooms.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{rooms.length}</div>
                <div className="text-sm opacity-90">Total Rooms</div>
              </div>
              <div className="text-5xl opacity-20">🏠</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{rooms.filter(r => r.status === 'VACANT').length}</div>
                <div className="text-sm opacity-90">Completely Available</div>
              </div>
              <div className="text-5xl opacity-20">✅</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{rooms.filter(r => r.status === 'PARTIALLY_OCCUPIED').length}</div>
                <div className="text-sm opacity-90">Partially Occupied</div>
              </div>
              <div className="text-5xl opacity-20">🟡</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{rooms.filter(r => r.status === 'FULLY_OCCUPIED' || r.status === 'OCCUPIED').length}</div>
                <div className="text-sm opacity-90">Fully Occupied</div>
              </div>
              <div className="text-5xl opacity-20">👥</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {rooms.length > 0 ? Math.round((
                    rooms.reduce((sum, r) => {
                      const occupancy = r.currentOccupancy || (r.tenantId ? 1 : 0);
                      const capacity = r.maxCapacity || r.customCapacity || (r.type === 'SINGLE' ? 1 : r.type === 'DOUBLE' ? 2 : r.type === 'TRIPLE' ? 3 : 4);
                      return sum + (occupancy / capacity);
                    }, 0) / rooms.length
                  ) * 100) : 0}%
                </div>
                <div className="text-sm opacity-90">Capacity Utilization</div>
              </div>
              <div className="text-5xl opacity-20">📊</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead><tr className="text-left border-b bg-gray-50">
              <th className="p-3 font-semibold">Room Details</th>
              <th className="p-3 font-semibold">Type & Capacity</th>
              <th className="p-3 font-semibold">Rental Info</th>
              <th className="p-3 font-semibold">Occupancy Status</th>
              <th className="p-3 font-semibold">Tenant Information</th>
              <th className="p-3 font-semibold">Property</th>
              <th className="p-3 font-semibold">Timeline</th>
              <th className="p-3 font-semibold">Room ID</th>
            </tr></thead>
            <tbody>
              {Array.isArray(rooms) && rooms.length > 0 ? (
                rooms.map(r => (
                  <tr key={r._id} className="border-b last:border-0 hover:bg-gray-50">
                    {/* Room Details */}
                    <td className="p-3">
                      <div>
                        <div className="font-semibold text-lg">Room {r.number}</div>
                        <div className="text-xs text-gray-600">
                          Created: {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    
                    {/* Type & Capacity */}
                    <td className="p-3">
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          r.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' :
                          r.type === 'DOUBLE' ? 'bg-green-100 text-green-800' :
                          r.type === 'TRIPLE' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {r.type === 'SINGLE' ? '👤' : 
                           r.type === 'DOUBLE' ? '👥' :
                           r.type === 'TRIPLE' ? '👨‍👩‍👧' : '🏠'} {r.type}
                        </span>
                        <div className="text-xs text-gray-600 mt-1">
                          {r.type === 'SINGLE' ? '1 Person' :
                           r.type === 'DOUBLE' ? '2 People' :
                           r.type === 'TRIPLE' ? '3 People' :
                           '4+ People'}
                        </div>
                      </div>
                    </td>
                    
                    {/* Rental Info */}
                    <td className="p-3">
                      <div>
                        <div className="font-semibold text-lg text-green-600">₹{r.rent.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">per month</div>
                        <div className="text-xs text-gray-600">
                          Per person: ₹{Math.round(r.rent / (r.maxCapacity || r.customCapacity || (r.type === 'SINGLE' ? 1 : r.type === 'DOUBLE' ? 2 : r.type === 'TRIPLE' ? 3 : 4))).toLocaleString()}
                        </div>
                      </div>
                    </td>
                    
                    {/* Occupancy Status */}
                    <td className="p-3">
                      <div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          r.status === 'VACANT' ? 'bg-green-100 text-green-800' :
                          r.status === 'PARTIALLY_OCCUPIED' ? 'bg-yellow-100 text-yellow-800' :
                          r.status === 'FULLY_OCCUPIED' ? 'bg-red-100 text-red-800' :
                          r.status === 'OCCUPIED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {r.status === 'VACANT' ? '✅' : 
                           r.status === 'PARTIALLY_OCCUPIED' ? '🟡' :
                           (r.status === 'FULLY_OCCUPIED' || r.status === 'OCCUPIED') ? '🔴' : '🔧'} 
                          {r.status === 'OCCUPIED' ? 'FULLY_OCCUPIED' : r.status}
                        </span>
                        <div className="text-xs text-gray-600 mt-1">
                          {r.currentOccupancy || (r.tenantId ? 1 : 0)}/{r.maxCapacity || r.customCapacity || (
                            r.type === 'SINGLE' ? 1 :
                            r.type === 'DOUBLE' ? 2 :
                            r.type === 'TRIPLE' ? 3 : 4
                          )} occupied
                        </div>
                      </div>
                    </td>
                    
                    {/* Tenant Information */}
                    <td className="p-3">
                      {r.tenantId ? (
                        <div>
                          <div className="font-medium">{r.tenantId.name}</div>
                          <div className="text-xs text-gray-600">{r.tenantId.phone}</div>
                          <div className="text-xs text-gray-600">
                            Since: {new Date(r.tenantId.createdAt || r.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">
                          {r.status === 'VACANT' ? '🏠 Available for rent' : 
                           r.status === 'MAINTENANCE' ? '🔧 Under maintenance' : 
                           'No tenant assigned'}
                        </div>
                      )}
                    </td>
                    
                    {/* Property */}
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{r.propertyId?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-600">{r.propertyId?.code}</div>
                        <div className="text-xs text-gray-600">{r.propertyId?.city}</div>
                      </div>
                    </td>
                    
                    {/* Timeline */}
                    <td className="p-3">
                      <div className="text-sm">
                        <div>Created: {new Date(r.createdAt).toLocaleDateString()}</div>
                        {r.updatedAt && r.updatedAt !== r.createdAt && (
                          <div className="text-xs text-gray-600">
                            Updated: {new Date(r.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                        {r.status === 'OCCUPIED' && r.tenantId && (
                          <div className="text-xs text-green-600">
                            Occupied since: {new Date(r.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Room ID */}
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">
                          {r._id.slice(-8)}...
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(r._id);
                            alert('Room ID copied!');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                          title="Copy full Room ID"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">
                    No rooms found. Add your first room above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
