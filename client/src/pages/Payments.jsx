import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Payments(){
  const [list, setList] = useState([])
  const [form, setForm] = useState({ type:'', amount:'', tenantId:'', propertyId:'', method:'CASH', reference:'' })
  const [reference, setReference] = useState({ properties: [], tenants: [], rooms: [] })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({
    type: '',
    propertyId: '',
    tenantId: '',
    amount: '',
    method: '',
    reference: ''
  })
  const [filteredTenants, setFilteredTenants] = useState([])

  useEffect(()=>{ 
    load()
    loadReference()
  },[])

  // Filter tenants when property changes
  useEffect(() => {
    if (form.propertyId) {
      const filtered = reference.tenants.filter(t => 
        t.propertyId === form.propertyId || t.propertyId?._id === form.propertyId
      )
      setFilteredTenants(filtered)
      setForm(prev => ({ ...prev, tenantId: '', amount: '' }))
    } else {
      setFilteredTenants([])
    }
  }, [form.propertyId, reference.tenants])

  // Auto-populate amount when tenant and payment type are selected
  useEffect(() => {
    if (form.tenantId && form.type) {
      const selectedTenant = filteredTenants.find(t => t._id === form.tenantId)
      if (selectedTenant) {
        let expectedAmount = 0
        
        switch(form.type) {
          case 'RENT':
            // CRITICAL FIX: Calculate rent_per_tenant, don't use total room rent
            if (selectedTenant.roomId) {
              // If tenant has a room, calculate per-tenant rent
              const room = reference.rooms?.find(r => r._id === selectedTenant.roomId?._id || r._id === selectedTenant.roomId)
              if (room) {
                const roomCapacity = room.maxCapacity || room.customCapacity || 
                  (room.type === 'SINGLE' ? 1 :
                   room.type === 'DOUBLE' ? 2 :
                   room.type === 'TRIPLE' ? 3 : 4)
                expectedAmount = Math.round(room.rent / roomCapacity)
                console.log('RENT Payment Auto-Population:', {
                  tenant: selectedTenant.name,
                  roomTotalRent: room.rent,
                  roomCapacity,
                  rentPerTenant: expectedAmount
                })
              } else {
                // Fallback: use tenant's stored monthlyRent (might be incorrect)
                expectedAmount = selectedTenant.monthlyRent || 0
              }
            } else {
              // Tenant has no room assigned, use their stored rent
              expectedAmount = selectedTenant.monthlyRent || 0
            }
            break
          case 'DEPOSIT':
            // For deposit, use the tenant's security deposit amount
            expectedAmount = selectedTenant.securityDeposit || 0
            break
          case 'FOOD':
            expectedAmount = 3000 // Default food payment amount
            break
          case 'OTHER':
            expectedAmount = 0 // Manual entry for other payments
            break
        }
        
        if (expectedAmount > 0) {
          setForm(prev => ({ ...prev, amount: expectedAmount }))
        }
      }
    }
  }, [form.tenantId, form.type, filteredTenants, reference.rooms])
  async function load(){ 
    try {
      const { data } = await api.get('/payments');
      // Handle both paginated and non-paginated responses
      setList(data.data || data);
    } catch (error) {
      console.error('Error loading payments:', error);
      setList([]);
    }
  }

  async function loadReference() {
    try {
      const [propertiesRes, tenantsRes, roomsRes] = await Promise.all([
        api.get('/properties'),
        api.get('/tenants'),
        api.get('/rooms')
      ])
      
      setReference({
        properties: Array.isArray(propertiesRes.data) ? propertiesRes.data : (propertiesRes.data.data || []),
        tenants: Array.isArray(tenantsRes.data) ? tenantsRes.data : (tenantsRes.data.data || []),
        rooms: Array.isArray(roomsRes.data) ? roomsRes.data : (roomsRes.data.data || [])
      })
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  // Clear field errors
  function clearFieldErrors() {
    setFieldErrors({
      type: '',
      propertyId: '',
      tenantId: '',
      amount: '',
      method: '',
      reference: ''
    })
  }

  // Validate individual field
  function validateField(fieldName, value) {
    let errorMsg = ''
    
    switch(fieldName) {
      case 'type':
        if (!value || !value.trim()) {
          errorMsg = 'Payment type is required'
        } else if (!['RENT', 'FOOD', 'DEPOSIT', 'OTHER'].includes(value)) {
          errorMsg = 'Invalid payment type selected'
        }
        break
        
      case 'propertyId':
        if (!value || !value.trim()) {
          errorMsg = 'Property selection is required'
        }
        break
        
      case 'tenantId':
        if (!value || !value.trim()) {
          errorMsg = 'Tenant selection is required'
        }
        break
        
      case 'amount':
        if (!value || value === '' || isNaN(value) || parseFloat(value) <= 0) {
          errorMsg = 'Amount must be a positive number greater than 0'
        } else if (parseFloat(value) > 10000000) {
          errorMsg = 'Amount seems too high (max: ₹1,00,00,000)'
        }
        break
        
      case 'method':
        if (!value || !value.trim()) {
          errorMsg = 'Payment method is required'
        } else if (!['CASH', 'UPI', 'CARD', 'ONLINE'].includes(value)) {
          errorMsg = 'Invalid payment method selected'
        }
        break
        
      case 'reference':
        if (value && value.trim().length > 100) {
          errorMsg = 'Reference must be less than 100 characters'
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
    const isTypeValid = validateField('type', form.type)
    const isPropertyValid = validateField('propertyId', form.propertyId)
    const isTenantValid = validateField('tenantId', form.tenantId)
    const isAmountValid = validateField('amount', form.amount)
    const isMethodValid = validateField('method', form.method)
    const isReferenceValid = validateField('reference', form.reference)
    
    return isTypeValid && isPropertyValid && isTenantValid && isAmountValid && isMethodValid && isReferenceValid
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
      const paymentData = {
        type: form.type,
        propertyId: form.propertyId,
        tenantId: form.tenantId,
        amount: parseFloat(form.amount),
        method: form.method,
        reference: form.reference?.trim() || '',
        status: 'PAID' // Mark as paid when recording
      }
      
      // Add period info for rent payments
      if (form.type === 'RENT') {
        const currentDate = new Date()
        paymentData.periodMonth = currentDate.getMonth() + 1
        paymentData.periodYear = currentDate.getFullYear()
      }

      await api.post('/payments', paymentData)
      setForm({ type:'', amount:'', tenantId:'', propertyId:'', method:'CASH', reference:'' })
      clearFieldErrors()
      await load()
      setError('')
    } catch (error) {
      console.error('Error creating payment:', error)
      
      // Handle validation errors from backend
      if (error?.response?.data?.errors) {
        const backendErrors = error.response.data.errors
        const newFieldErrors = { ...fieldErrors }
        
        backendErrors.forEach(err => {
          if (err.param === 'type') {
            newFieldErrors.type = err.msg
          } else if (err.param === 'propertyId') {
            newFieldErrors.propertyId = err.msg
          } else if (err.param === 'tenantId') {
            newFieldErrors.tenantId = err.msg
          } else if (err.param === 'amount') {
            newFieldErrors.amount = err.msg
          } else if (err.param === 'method') {
            newFieldErrors.method = err.msg
          } else if (err.param === 'reference') {
            newFieldErrors.reference = err.msg
          }
        })
        
        setFieldErrors(newFieldErrors)
      } else {
        const errorMessage = error.response?.data?.error || 'Failed to record payment'
        setError(errorMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Payments</h2>
      <form onSubmit={create} className="card" noValidate>
        <h3 className="text-lg font-semibold mb-4">Record New Payment</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Type *</label>
            <select 
              className={`select ${fieldErrors.type ? 'border-red-500 focus:border-red-500' : ''}`}
              value={form.type} 
              onChange={e => {
                setForm({...form, type:e.target.value})
                validateField('type', e.target.value)
              }}
              disabled={submitting}
            >
              <option value="">Select payment type...</option>
              <option value="RENT">Rent Payment</option>
              <option value="FOOD">Food Payment</option>
              <option value="DEPOSIT">Security Deposit</option>
              <option value="OTHER">Other Payment</option>
            </select>
            {fieldErrors.type && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Property *</label>
            <select 
              className={`select ${fieldErrors.propertyId ? 'border-red-500 focus:border-red-500' : ''}`}
              value={form.propertyId} 
              onChange={e => {
                setForm({...form, propertyId:e.target.value, tenantId: '', amount: ''})
                validateField('propertyId', e.target.value)
              }}
              disabled={submitting}
            >
              <option value="">Select property...</option>
              {reference.properties.map(p => (
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
            <label className="block text-sm font-medium mb-1">Tenant *</label>
            <select 
              className={`select ${fieldErrors.tenantId ? 'border-red-500 focus:border-red-500' : ''}`}
              value={form.tenantId} 
              onChange={e => {
                setForm({...form, tenantId:e.target.value})
                validateField('tenantId', e.target.value)
              }}
              disabled={submitting || !form.propertyId}
            >
              <option value="">Select tenant...</option>
              {filteredTenants.map(t => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.phone}) - Room {t.roomId?.number || 'None'} - ₹{t.monthlyRent}/month
                </option>
              ))}
            </select>
            {fieldErrors.tenantId && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.tenantId}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {form.propertyId ? 
                `${filteredTenants.length} tenants in selected property` : 
                'Select property first to filter tenants'
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Amount * {form.tenantId && form.type ? '(Auto-populated)' : ''}
            </label>
            <input 
              className={`input ${fieldErrors.amount ? 'border-red-500 focus:border-red-500' : ''} ${form.tenantId && form.type ? 'bg-yellow-50 border-yellow-300' : ''}`}
              type="number" 
              placeholder={form.tenantId && form.type ? "Auto-populated based on payment type" : "Amount in ₹"} 
              value={form.amount} 
              onChange={e => {
                setForm({...form, amount:e.target.value})
                validateField('amount', e.target.value)
              }}
              disabled={submitting}
              min="1"
              step="1"
            />
            {fieldErrors.amount && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.amount}</p>
            )}
            {form.tenantId && form.type && form.amount && (
              <div className="text-xs text-yellow-700 mt-1 bg-yellow-50 p-2 rounded">
                <strong>Expected Amount:</strong> {(() => {
                  const selectedTenant = filteredTenants.find(t => t._id === form.tenantId)
                  if (selectedTenant) {
                    switch(form.type) {
                      case 'RENT':
                        if (selectedTenant.roomId) {
                          const room = reference.rooms?.find(r => r._id === selectedTenant.roomId?._id || r._id === selectedTenant.roomId)
                          if (room) {
                            const roomCapacity = room.maxCapacity || room.customCapacity || 
                              (room.type === 'SINGLE' ? 1 :
                               room.type === 'DOUBLE' ? 2 :
                               room.type === 'TRIPLE' ? 3 : 4)
                            const rentPerTenant = Math.round(room.rent / roomCapacity)
                            return `₹${rentPerTenant.toLocaleString()} (rent per tenant: ₹${room.rent.toLocaleString()} ÷ ${roomCapacity})`
                          }
                        }
                        return `₹${selectedTenant.monthlyRent?.toLocaleString() || 0} (stored rent - may need verification)`
                      case 'DEPOSIT':
                        return `₹${(selectedTenant.securityDeposit || 0).toLocaleString()} (security deposit)`
                      case 'FOOD':
                        return `₹3,000 (default food payment)`
                      case 'OTHER':
                        return `Custom amount`
                    }
                  }
                  return ''
                })()}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Method *</label>
            <select 
              className={`select ${fieldErrors.method ? 'border-red-500 focus:border-red-500' : ''}`}
              value={form.method} 
              onChange={e => {
                setForm({...form, method:e.target.value})
                validateField('method', e.target.value)
              }}
              disabled={submitting}
            >
              <option value="CASH">💵 Cash</option>
              <option value="UPI">📱 UPI</option>
              <option value="CARD">💳 Card</option>
              <option value="ONLINE">🌐 Online Transfer</option>
            </select>
            {fieldErrors.method && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.method}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reference (Optional)</label>
            <input 
              className={`input ${fieldErrors.reference ? 'border-red-500 focus:border-red-500' : ''}`}
              placeholder="Transaction ID, receipt number, etc." 
              value={form.reference} 
              onChange={e => {
                setForm({...form, reference:e.target.value})
                validateField('reference', e.target.value)
              }}
              disabled={submitting}
              maxLength={100}
            />
            {fieldErrors.reference && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.reference}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button 
            type="submit" 
            className="btn" 
            disabled={submitting}
          >
            {submitting ? 'Recording Payment...' : 'Record Payment'}
          </button>
          <button 
            type="button" 
            onClick={() => {
              setForm({ type:'', amount:'', tenantId:'', propertyId:'', method:'CASH', reference:'' })
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
          <p><strong>Payment Recording Rules:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Payment Type*:</strong> Must select type (Rent/Food/Deposit/Other) - determines auto-population</li>
            <li><strong>Property*:</strong> Must select existing property - filters tenant list</li>
            <li><strong>Tenant*:</strong> Must select tenant from filtered list - triggers amount auto-population</li>
            <li><strong>Amount*:</strong> Auto-populated based on payment type, editable for partial payments</li>
            <li><strong>Payment Method*:</strong> Cash/UPI/Card/Online Transfer</li>
            <li><strong>Reference:</strong> Optional transaction ID or receipt number</li>
            <li><strong>Auto-Generated:</strong> Payment ID, timestamp, period info (for rent payments)</li>
          </ul>
        </div>
      </form>

      {/* Payment Statistics */}
      {list.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">₹{list.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}</div>
                <div className="text-sm opacity-90">Total Collected</div>
              </div>
              <div className="text-5xl opacity-20">💰</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{list.length}</div>
                <div className="text-sm opacity-90">Total Payments</div>
              </div>
              <div className="text-5xl opacity-20">💳</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  ₹{list.length > 0 ? Math.round(list.reduce((sum, p) => sum + (p.amount || 0), 0) / list.length).toLocaleString() : 0}
                </div>
                <div className="text-sm opacity-90">Avg. Payment</div>
              </div>
              <div className="text-5xl opacity-20">📊</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{list.filter(p => p.type === 'RENT').length}</div>
                <div className="text-sm opacity-90">Rent Payments</div>
              </div>
              <div className="text-5xl opacity-20">🏠</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead><tr className="text-left border-b bg-gray-50">
              <th className="p-3 font-semibold">Payment Type</th>
              <th className="p-3 font-semibold">Amount</th>
              <th className="p-3 font-semibold">Tenant Details</th>
              <th className="p-3 font-semibold">Property</th>
              <th className="p-3 font-semibold">Payment Info</th>
              <th className="p-3 font-semibold">Date & Time</th>
              <th className="p-3 font-semibold">Payment ID</th>
            </tr></thead>
            <tbody>
              {Array.isArray(list) && list.length > 0 ? (
                list.map(p => (<tr key={p._id} className="border-b last:border-0 hover:bg-gray-50">
                  {/* Payment Type */}
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      p.type === 'RENT' ? 'bg-blue-100 text-blue-800' :
                      p.type === 'FOOD' ? 'bg-green-100 text-green-800' :
                      p.type === 'DEPOSIT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {p.type === 'RENT' ? '🏠' : p.type === 'FOOD' ? '🍽️' : p.type === 'DEPOSIT' ? '💰' : '📝'} {p.type}
                    </span>
                  </td>
                  
                  {/* Amount */}
                  <td className="p-3">
                    <div className="font-semibold text-lg text-green-600">₹{p.amount.toLocaleString()}</div>
                  </td>
                  
                  {/* Tenant Details */}
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{p.tenantId?.name || 'Unknown'}</div>
                      {p.tenantId?.phone && (
                        <div className="text-xs text-gray-600">{p.tenantId.phone}</div>
                      )}
                    </div>
                  </td>
                  
                  {/* Property */}
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{p.propertyId?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-600">{p.propertyId?.code}</div>
                    </div>
                  </td>
                  
                  {/* Payment Info */}
                  <td className="p-3">
                    <div className="text-sm">
                      <div>Method: {p.method || 'CASH'}</div>
                      {p.reference && (
                        <div className="text-xs text-gray-600">Ref: {p.reference}</div>
                      )}
                      {p.periodMonth && p.periodYear && (
                        <div className="text-xs text-gray-600">
                          Period: {p.periodMonth}/{p.periodYear}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Date & Time */}
                  <td className="p-3">
                    <div className="text-sm">
                      <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(p.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </td>
                  
                  {/* Payment ID */}
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">
                        {p._id.slice(-8)}...
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(p._id);
                          alert('Payment ID copied!');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                        title="Copy full Payment ID"
                      >
                        📋
                      </button>
                    </div>
                  </td>
                </tr>))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    No payments found. Record your first payment above.
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
