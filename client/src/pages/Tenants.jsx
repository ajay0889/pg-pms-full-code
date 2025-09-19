import React, { useEffect, useState } from 'react'
import api from '../services/api'
// import AdvancedSearch from '../components/AdvancedSearch' // Temporarily disabled
// import DataExport from '../components/DataExport' // Temporarily disabled

export default function Tenants(){
  const [list, setList] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({})
  const [form, setForm] = useState({ name:'', phone:'', monthlyRent:'', propertyId:'', roomId:'', email:'', securityDeposit: '' })
  const [quickReference, setQuickReference] = useState({ properties: [], rooms: [] })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    phone: '',
    monthlyRent: '',
    propertyId: '',
    roomId: '',
    email: '',
    securityDeposit: ''
  })
  const [availableRooms, setAvailableRooms] = useState([])

  const searchFields = [
    { name: 'search', label: 'Search', type: 'text', placeholder: 'Search by name or phone...', basic: true },
    { name: 'propertyId', label: 'Property ID', type: 'text', placeholder: 'Property ID', basic: true },
    { name: 'roomStatus', label: 'Room Status', type: 'select', basic: true, options: [
      { value: 'with_room', label: 'With Room' },
      { value: 'without_room', label: 'Without Room' }
    ]},
    { name: 'rentRange', label: 'Monthly Rent', type: 'numberRange' },
    { name: 'joinDate', label: 'Join Date', type: 'dateRange' },
    { name: 'foodPlan', label: 'Food Plan', type: 'select', options: [
      { value: 'WEEKDAY_2', label: 'Weekday 2 Meals' },
      { value: 'WEEKEND_3', label: 'Weekend 3 Meals' },
      { value: 'NONE', label: 'No Food Plan' }
    ]}
  ]

  const sampleImportData = [
    {
      'Name': 'John Doe',
      'Phone': '9876543210',
      'Email': 'john@example.com',
      'Property ID': '507f1f77bcf86cd799439011',
      'Room ID': '507f1f77bcf86cd799439012',
      'Monthly Rent': '12000',
      'Security Deposit': '24000',
      'Food Plan': 'WEEKDAY_2'
    },
    {
      'Name': 'Jane Smith',
      'Phone': '9876543211',
      'Email': 'jane@example.com',
      'Property ID': '507f1f77bcf86cd799439011',
      'Room ID': '',
      'Monthly Rent': '10000',
      'Security Deposit': '20000',
      'Food Plan': 'NONE'
    }
  ]

  useEffect(()=>{ 
    load()
    loadQuickReference()
  },[currentPage, filters])

  // Load available rooms when property changes
  useEffect(() => {
    if (form.propertyId) {
      loadAvailableRooms(form.propertyId)
    } else {
      setAvailableRooms([])
      setForm(prev => ({ ...prev, roomId: '', monthlyRent: '' }))
    }
  }, [form.propertyId])

  // Auto-calculate rent when room changes
  useEffect(() => {
    if (form.roomId) {
      const selectedRoom = availableRooms.find(r => r._id === form.roomId)
      if (selectedRoom) {
        // CORRECT CALCULATION: rent_per_tenant = total_room_rent / room_capacity
        const totalRoomRent = selectedRoom.rent
        const roomCapacity = selectedRoom.maxCapacity || selectedRoom.customCapacity || 
          (selectedRoom.type === 'SINGLE' ? 1 :
           selectedRoom.type === 'DOUBLE' ? 2 :
           selectedRoom.type === 'TRIPLE' ? 3 : 4)
        
        const rentPerTenant = Math.round(totalRoomRent / roomCapacity)
        const securityDeposit = rentPerTenant // Security deposit = one month's rent
        
        console.log('CORRECTED Rent Calculation:', {
          roomNumber: selectedRoom.number,
          roomType: selectedRoom.type,
          totalRoomRent,
          roomCapacity,
          rentPerTenant,
          securityDeposit
        })
        
        setForm(prev => ({ 
          ...prev, 
          monthlyRent: rentPerTenant,
          securityDeposit: securityDeposit
        }))
      }
    } else {
      // Clear rent and deposit when no room selected
      setForm(prev => ({ ...prev, monthlyRent: '', securityDeposit: '' }))
    }
  }, [form.roomId, availableRooms])

  // Clear field errors
  function clearFieldErrors() {
    setFieldErrors({
      name: '',
      phone: '',
      monthlyRent: '',
      propertyId: '',
      roomId: '',
      email: '',
      securityDeposit: ''
    })
  }

  // Load available rooms for selected property
  async function loadAvailableRooms(propertyId) {
    try {
      const { data } = await api.get(`/rooms/for-tenant-form?propertyId=${propertyId}`)
      const rooms = Array.isArray(data) ? data : (data.data || [])
      
      // Filter rooms with available capacity
      const available = rooms.filter(r => {
        const currentOccupancy = r.currentOccupancy || 0
        const maxCapacity = r.maxCapacity || 2
        return currentOccupancy < maxCapacity && r.status !== 'MAINTENANCE'
      })
      
      setAvailableRooms(available)
    } catch (error) {
      console.error('Error loading available rooms:', error)
      setAvailableRooms([])
    }
  }

  async function loadQuickReference() {
    try {
      const [propertiesRes, roomsRes] = await Promise.all([
        api.get('/properties'),
        api.get('/rooms')
      ])
      
      const properties = Array.isArray(propertiesRes.data) ? propertiesRes.data : (propertiesRes.data.data || [])
      const rooms = Array.isArray(roomsRes.data) ? roomsRes.data : (roomsRes.data.data || [])
      
      setQuickReference({
        properties,
        rooms
      })
    } catch (error) {
      console.error('Error loading quick reference:', error)
    }
  }
  
  async function load(){ 
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      // Add simple search if available
      if (filters.search) {
        params.append('search', filters.search)
      }
      
      const { data } = await api.get(`/tenants?${params}`)
      
      // Handle both paginated and simple array responses
      if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
          setList(data)
          setPagination(null)
        } else if (data.data && Array.isArray(data.data)) {
          setList(data.data)
          setPagination(data.pagination)
        } else {
          setList([])
          setPagination(null)
        }
      } else {
        setList([])
        setPagination(null)
      }
    } catch (error) {
      console.error('Error loading tenants:', error)
      setList([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(newFilters) {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  function handleClearSearch() {
    setFilters({})
    setCurrentPage(1)
  }

  // Validate individual field
  function validateField(fieldName, value) {
    let errorMsg = ''
    
    switch(fieldName) {
      case 'name':
        if (!value || !value.trim()) {
          errorMsg = 'Tenant name is required'
        } else if (value.trim().length < 2) {
          errorMsg = 'Name must be at least 2 characters long'
        } else if (value.trim().length > 100) {
          errorMsg = 'Name must be less than 100 characters'
        } else if (!/^[a-zA-Z\s\-'.]+$/.test(value.trim())) {
          errorMsg = 'Name can only contain letters, spaces, hyphens, apostrophes, and periods'
        }
        break
        
      case 'phone':
        if (!value || !value.trim()) {
          errorMsg = 'Phone number is required'
        } else if (!/^\d{10,15}$/.test(value.trim())) {
          errorMsg = 'Phone number must be 10-15 digits only'
        }
        break
        
      case 'propertyId':
        if (!value || !value.trim()) {
          errorMsg = 'Property selection is required'
        }
        break
        
      case 'email':
        if (value && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          errorMsg = 'Please enter a valid email address'
        }
        break
        
      case 'monthlyRent':
        if (!form.roomId) {
          // Manual entry when no room assigned - REQUIRED
          if (!value || value === '' || isNaN(value) || parseFloat(value) <= 0) {
            errorMsg = 'Monthly rent is required when no room is assigned'
          } else if (parseFloat(value) > 1000000) {
            errorMsg = 'Rent amount seems too high (max: ₹10,00,000)'
          }
        } else {
          // Room assigned - rent should be auto-calculated, no validation needed
          // This field is read-only in this case
        }
        break
        
      case 'securityDeposit':
        if (value && (isNaN(value) || parseFloat(value) < 0)) {
          errorMsg = 'Security deposit must be a positive number'
        } else if (value && parseFloat(value) > 5000000) {
          errorMsg = 'Security deposit seems too high (max: ₹50,00,000)'
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
    const isNameValid = validateField('name', form.name)
    const isPhoneValid = validateField('phone', form.phone)
    const isPropertyValid = validateField('propertyId', form.propertyId)
    const isEmailValid = validateField('email', form.email)
    const isRentValid = validateField('monthlyRent', form.monthlyRent)
    const isDepositValid = validateField('securityDeposit', form.securityDeposit)
    
    return isNameValid && isPhoneValid && isPropertyValid && isEmailValid && isRentValid && isDepositValid
  }
  async function create(e){
    e.preventDefault()
    setSubmitting(true)
    setError('')
    clearFieldErrors()
    
    // Validate all fields
    if (!validateAllFields()) {
      setError('Please fix the validation errors below.')
      setSubmitting(false)
      return
    }
    
    try {
      const tenantData = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        propertyId: form.propertyId,
        monthlyRent: parseFloat(form.monthlyRent),
        email: form.email?.trim() || '',
        securityDeposit: form.securityDeposit ? parseFloat(form.securityDeposit) : 0
      }
      
      // Add room assignment if selected
      if (form.roomId) {
        tenantData.roomId = form.roomId
      }

      await api.post('/tenants', tenantData)
      setForm({ name:'', phone:'', monthlyRent:'', propertyId:'', roomId:'', email:'', securityDeposit: '' })
      clearFieldErrors()
      await load()
      setError('')
    } catch (error) {
      console.error('Error creating tenant:', error)
      
      // Handle validation errors from backend
      if (error?.response?.data?.errors) {
        const backendErrors = error.response.data.errors
        const newFieldErrors = { ...fieldErrors }
        
        backendErrors.forEach(err => {
          if (err.param === 'name') {
            newFieldErrors.name = err.msg
          } else if (err.param === 'phone') {
            newFieldErrors.phone = err.msg
          } else if (err.param === 'propertyId') {
            newFieldErrors.propertyId = err.msg
          } else if (err.param === 'email') {
            newFieldErrors.email = err.msg
          } else if (err.param === 'monthlyRent') {
            newFieldErrors.monthlyRent = err.msg
          } else if (err.param === 'securityDeposit') {
            newFieldErrors.securityDeposit = err.msg
          }
        })
        
        setFieldErrors(newFieldErrors)
      } else {
        const errorMessage = error.response?.data?.error || 'Failed to create tenant'
        setError(errorMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    setCurrentPage(1)
    setSearchTerm(e.target.search.value)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Tenants</h2>
      
      {/* Advanced Search - Temporarily disabled */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Search Tenants</h3>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch({ search: e.target.search.value }) }} className="flex gap-3">
          <input 
            name="search" 
            className="input flex-1" 
            placeholder="Search by name or phone..." 
          />
          <button type="submit" className="btn">Search</button>
          <button type="button" onClick={handleClearSearch} className="px-4 py-2 border rounded">Clear</button>
        </form>
      </div>

      {/* Tenant Statistics */}
      {list.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{list.length}</div>
                <div className="text-sm opacity-90">Total Tenants</div>
              </div>
              <div className="text-5xl opacity-20">👥</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{list.filter(t => t.roomId).length}</div>
                <div className="text-sm opacity-90">With Rooms</div>
              </div>
              <div className="text-5xl opacity-20">🏠</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  ₹{list.length > 0 ? Math.round(list.reduce((sum, t) => sum + (t.monthlyRent || 0), 0) / list.length).toLocaleString() : 0}
                </div>
                <div className="text-sm opacity-90">Avg. Rent</div>
              </div>
              <div className="text-5xl opacity-20">💰</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  ₹{list.reduce((sum, t) => sum + (t.monthlyRent || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm opacity-90">Total Monthly Revenue</div>
              </div>
              <div className="text-5xl opacity-20">📈</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Tenant Form */}
      <form onSubmit={create} className="card" noValidate>
        <h3 className="text-lg font-semibold mb-4">Add New Tenant</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Property *</label>
            <select 
              className={`select ${fieldErrors.propertyId ? 'border-red-500 focus:border-red-500' : ''}`}
              value={form.propertyId} 
              onChange={e => {
                setForm({...form, propertyId:e.target.value, roomId: '', monthlyRent: ''})
                validateField('propertyId', e.target.value)
              }}
              disabled={submitting}
            >
              <option value="">Select a property...</option>
              {quickReference.properties.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.code}) - {p.city}
                </option>
              ))}
            </select>
            {fieldErrors.propertyId && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.propertyId}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Required: Choose the property for this tenant</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Room Assignment (Optional)</label>
            <select 
              className={`select ${fieldErrors.roomId ? 'border-red-500 focus:border-red-500' : ''}`}
              value={form.roomId} 
              onChange={e => {
                setForm({...form, roomId:e.target.value})
                validateField('roomId', e.target.value)
              }}
              disabled={submitting || !form.propertyId}
            >
              <option value="">No room assignment</option>
              {availableRooms.map(r => {
                const currentOccupancy = r.currentOccupancy || 0;
                const maxCapacity = r.maxCapacity || r.customCapacity || 
                  (r.type === 'SINGLE' ? 1 :
                   r.type === 'DOUBLE' ? 2 :
                   r.type === 'TRIPLE' ? 3 : 4);
                
                // CORRECT CALCULATION: divide by room capacity, not occupancy
                const rentPerTenant = Math.round(r.rent / maxCapacity);
                
                return (
                  <option key={r._id} value={r._id}>
                    Room {r.number} ({r.type}) - ₹{rentPerTenant.toLocaleString()}/person - {currentOccupancy}/{maxCapacity} occupied
                  </option>
                );
              })}
            </select>
            {fieldErrors.roomId && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.roomId}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Optional: {form.propertyId ? 
                `${availableRooms.length} rooms with available space` : 
                'Select property first to see available rooms'
              }
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Tenant Name *</label>
            <input 
              className={`input ${fieldErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
              placeholder="Enter tenant's full name" 
              value={form.name} 
              onChange={e => {
                setForm({...form, name:e.target.value})
                validateField('name', e.target.value)
              }}
              disabled={submitting}
              maxLength={100}
            />
            {fieldErrors.name && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number *</label>
            <input 
              className={`input ${fieldErrors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
              placeholder="10-15 digits only" 
              value={form.phone} 
              onChange={e => {
                setForm({...form, phone:e.target.value})
                validateField('phone', e.target.value)
              }}
              disabled={submitting}
              maxLength={15}
              inputMode="numeric"
            />
            {fieldErrors.phone && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.phone}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Monthly Rent * {form.roomId ? '(Auto-calculated)' : '(Manual Entry)'}
            </label>
            <input 
              type="number" 
              className={`input ${fieldErrors.monthlyRent ? 'border-red-500 focus:border-red-500' : ''} ${form.roomId ? 'bg-green-50 border-green-300' : ''}`}
              placeholder={form.roomId ? "Auto-calculated from room" : "Amount in ₹"} 
              value={form.monthlyRent} 
              onChange={e => {
                if (!form.roomId) {
                  setForm({...form, monthlyRent:e.target.value})
                  validateField('monthlyRent', e.target.value)
                }
              }}
              disabled={submitting || !!form.roomId}
              min="1"
              step="1"
              readOnly={!!form.roomId}
            />
            {fieldErrors.monthlyRent && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.monthlyRent}</p>
            )}
            {form.roomId && availableRooms.length > 0 && (
              <div className="text-xs text-green-700 mt-1 bg-green-50 p-2 rounded">
                <strong>Calculation:</strong> {(() => {
                  const selectedRoom = availableRooms.find(r => r._id === form.roomId)
                  if (selectedRoom) {
                    const totalRoomRent = selectedRoom.rent
                    const roomCapacity = selectedRoom.maxCapacity || selectedRoom.customCapacity || 
                      (selectedRoom.type === 'SINGLE' ? 1 :
                       selectedRoom.type === 'DOUBLE' ? 2 :
                       selectedRoom.type === 'TRIPLE' ? 3 : 4)
                    const rentPerTenant = Math.round(totalRoomRent / roomCapacity)
                    return `₹${totalRoomRent.toLocaleString()} (total room rent) ÷ ${roomCapacity} (room capacity) = ₹${rentPerTenant.toLocaleString()}`
                  }
                  return ''
                })()}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {form.roomId ? 
                'Rent per tenant calculated based on room capacity (total rent ÷ room capacity)' : 
                'Enter manual rent amount (required if no room assigned)'
              }
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email (Optional)</label>
            <input 
              type="email"
              className={`input ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
              placeholder="tenant@example.com" 
              value={form.email || ''} 
              onChange={e => {
                setForm({...form, email:e.target.value})
                validateField('email', e.target.value)
              }}
              disabled={submitting}
            />
            {fieldErrors.email && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Security Deposit {form.roomId ? '(Auto-calculated)' : '(Optional)'}
            </label>
            <input 
              type="number" 
              className={`input ${fieldErrors.securityDeposit ? 'border-red-500 focus:border-red-500' : ''} ${form.roomId ? 'bg-blue-50 border-blue-300' : ''}`}
              placeholder={form.roomId ? "Auto-calculated (1 month's rent)" : "Amount in ₹ (optional)"} 
              value={form.securityDeposit} 
              onChange={e => {
                if (!form.roomId) {
                  setForm({...form, securityDeposit:e.target.value})
                  validateField('securityDeposit', e.target.value)
                }
              }}
              disabled={submitting || !!form.roomId}
              min="0"
              step="1"
              readOnly={!!form.roomId}
            />
            {fieldErrors.securityDeposit && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.securityDeposit}</p>
            )}
            {form.roomId && form.monthlyRent && (
              <div className="text-xs text-blue-700 mt-1 bg-blue-50 p-2 rounded">
                <strong>Calculation:</strong> ₹{Math.round(form.monthlyRent).toLocaleString()} (monthly rent) × 1 = ₹{Math.round(form.monthlyRent).toLocaleString()} (one month's rent)
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {form.roomId ? 
                'Security deposit automatically set to one month\'s rent' : 
                'Enter custom security deposit amount (optional)'
              }
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex gap-3">
          <button 
            type="submit" 
            className="btn" 
            disabled={submitting}
          >
            {submitting ? 'Adding Tenant...' : 'Add Tenant'}
          </button>
          <button 
            type="button" 
            onClick={() => {
              setForm({ name:'', phone:'', monthlyRent:'', propertyId:'', roomId:'', email:'', securityDeposit: '' })
              clearFieldErrors()
              setError('')
            }}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={submitting}
          >
            Clear Form
          </button>
        </div>
        
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        
        {/* Validation Rules Helper */}
        <div className="text-xs text-gray-600 mt-4 space-y-1">
          <p><strong>Tenant Creation Rules:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Property*:</strong> Must select an existing property (required)</li>
            <li><strong>Tenant Name*:</strong> 2-100 characters, letters/spaces/hyphens/apostrophes/periods only (required)</li>
            <li><strong>Phone Number*:</strong> 10-15 digits only, must be unique across all tenants (required)</li>
            <li><strong>Room Assignment:</strong> Optional, shows only available rooms with capacity from selected property</li>
            <li><strong>Monthly Rent*:</strong> 
              <ul className="ml-4 mt-1">
                <li>• <strong>With Room:</strong> Auto-calculated as (Total Room Rent ÷ Room Capacity) - Read-only</li>
                <li>• <strong>No Room:</strong> Manual entry required (₹1 to ₹10,00,000)</li>
                <li>• <strong>Example:</strong> Double room ₹24,000 ÷ 2 = ₹12,000 per tenant</li>
              </ul>
            </li>
            <li><strong>Security Deposit:</strong> 
              <ul className="ml-4 mt-1">
                <li>• <strong>With Room:</strong> Auto-calculated as (1 × Monthly Rent = One Month's Rent) - Read-only</li>
                <li>• <strong>No Room:</strong> Optional manual entry (₹0 to ₹50,00,000)</li>
                <li>• <strong>Example:</strong> ₹12,000 × 1 = ₹12,000 security deposit</li>
              </ul>
            </li>
            <li><strong>Email:</strong> Valid email format, optional field</li>
            <li><strong>Auto-Generated:</strong> Initial payment records (security deposit + first month rent)</li>
          </ul>
        </div>

        {/* Quick ID Reference */}
        {(quickReference.properties.length > 0 || quickReference.rooms.length > 0) && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-semibold mb-3">🔗 Quick ID Reference</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {quickReference.properties.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-600 mb-2">Available Properties:</h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {quickReference.properties.map(p => (
                      <div key={p._id} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                        <span>{p.name} ({p.code})</span>
                        <button
                          type="button"
                          onClick={() => setForm({...form, propertyId: p._id})}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Use This
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {quickReference.rooms.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-600 mb-2">Available Rooms (Vacant):</h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {quickReference.rooms.slice(0, 10).map(r => (
                      <div key={r._id} className="flex items-center justify-between text-xs bg-green-50 p-2 rounded">
                        <span>Room {r.number} ({r.type}) - ₹{r.rent}</span>
                        <button
                          type="button"
                          onClick={() => setForm({...form, roomId: r._id})}
                          className="text-green-600 hover:text-green-800"
                        >
                          Use This
                        </button>
                      </div>
                    ))}
                    {quickReference.rooms.length > 10 && (
                      <p className="text-xs text-gray-500">...and {quickReference.rooms.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
      
      {/* Tenants Table */}
      {loading ? (
        <div className="card text-center py-8">
          <p>Loading tenants...</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead><tr className="text-left border-b bg-gray-50">
                <th className="p-3 font-semibold">Tenant Details</th>
                <th className="p-3 font-semibold">Contact</th>
                <th className="p-3 font-semibold">Room Assignment</th>
                <th className="p-3 font-semibold">Financial</th>
                <th className="p-3 font-semibold">Property</th>
                <th className="p-3 font-semibold">Additional Info</th>
                <th className="p-3 font-semibold">Tenant ID</th>
              </tr></thead>
        <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500">
                      {Object.keys(filters).length > 0 ? 'No tenants found matching your filters.' : 'No tenants found. Add your first tenant above.'}
                    </td>
                  </tr>
                ) : (
                  list.map(t => (<tr key={t._id} className="border-b last:border-0 hover:bg-gray-50">
                    {/* Tenant Details */}
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-gray-500">
                          Joined: {new Date(t.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    
                    {/* Contact */}
                    <td className="p-3">
                      <div>
                        <div className="text-sm">{t.phone}</div>
                        {t.email && <div className="text-xs text-gray-600">{t.email}</div>}
                      </div>
                    </td>
                    
                    {/* Room Assignment */}
                    <td className="p-3">
                      {t.roomId ? (
                        <div>
                          <div className="font-medium">Room {t.roomId.number}</div>
                          <div className="text-xs text-gray-600">{t.roomId.type}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No room assigned</span>
                      )}
                    </td>
                    
                    {/* Financial */}
                    <td className="p-3">
                      <div>
                        <div className="font-medium">₹{t.monthlyRent}/month</div>
                        {t.securityDeposit > 0 && (
                          <div className="text-xs text-gray-600">Deposit: ₹{t.securityDeposit}</div>
                        )}
                      </div>
                    </td>
                    
                    {/* Property */}
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{t.propertyId?.name || '-'}</div>
                        <div className="text-xs text-gray-600">{t.propertyId?.code}</div>
                      </div>
                    </td>
                    
                    {/* Additional Info */}
                    <td className="p-3">
                      <div className="text-sm">
                        <div>Food: {t.foodPlan || 'WEEKDAY_2'}</div>
                        {t.leaseStart && (
                          <div className="text-xs text-gray-600">
                            Lease: {new Date(t.leaseStart).toLocaleDateString()} - {t.leaseEnd ? new Date(t.leaseEnd).toLocaleDateString() : 'Ongoing'}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Tenant ID */}
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">
                          {t._id.slice(-8)}...
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(t._id);
                            alert('Tenant ID copied!');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                          title="Copy full Tenant ID"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                  </tr>))
                )}
        </tbody>
      </table>
          </div>
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} tenants
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Export/Import - Temporarily disabled */}
      {/* 
      <DataExport
        entityType="tenants"
        title="Tenants"
        exportEndpoint="/tenants"
        sampleData={sampleImportData}
      />
      */}
    </div>
  )
}
