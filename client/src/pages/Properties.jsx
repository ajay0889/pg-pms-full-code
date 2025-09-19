import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Properties(){
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: ''
  })
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [pincode, setPincode] = useState('')
  
  // Debounce validation to avoid excessive calls
  const [validationTimeouts, setValidationTimeouts] = useState({})

  useEffect(()=>{ load() },[])
  
  // Clear field errors
  function clearFieldErrors() {
    setFieldErrors({
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      pincode: ''
    })
  }
  
  // Debounced validation function
  function debouncedValidateField(fieldName, value) {
    // Clear existing timeout for this field
    if (validationTimeouts[fieldName]) {
      clearTimeout(validationTimeouts[fieldName])
    }
    
    // Set new timeout
    const timeoutId = setTimeout(() => {
      validateField(fieldName, value)
    }, 500) // 500ms delay
    
    setValidationTimeouts(prev => ({
      ...prev,
      [fieldName]: timeoutId
    }))
  }
  
  // Validate individual field
  function validateField(fieldName, value) {
    let errorMsg = ''
    
    switch(fieldName) {
      case 'name':
        if (!value || !value.trim()) {
          errorMsg = 'Property name is required'
        } else if (value.trim().length < 3) {
          errorMsg = 'Must be at least 3 characters long'
        } else if (value.trim().length > 100) {
          errorMsg = 'Must be less than 100 characters'
        } else if (!/^[a-zA-Z0-9\s\-_.]+$/.test(value.trim())) {
          errorMsg = 'Only letters, numbers, spaces, hyphens, underscores, and periods allowed'
        }
        break
        
      case 'address':
        if (!value || !value.trim()) {
          errorMsg = 'Address is required'
        } else if (value.trim().length < 10) {
          errorMsg = 'Must be at least 10 characters long'
        } else if (value.trim().length > 200) {
          errorMsg = 'Must be less than 200 characters'
        } else if (!/^[a-zA-Z0-9\s\-_.,#/()]+$/.test(value.trim())) {
          errorMsg = 'Contains invalid characters'
        }
        break
        
      case 'city':
        if (!value || !value.trim()) {
          errorMsg = 'City is required'
        } else if (value.trim().length > 50) {
          errorMsg = 'Must be less than 50 characters'
        } else if (!/^[a-zA-Z\s\-'.]*$/.test(value.trim())) {
          errorMsg = 'Only letters, spaces, hyphens, apostrophes, and periods allowed'
        }
        break
        
      case 'state':
        if (!value || !value.trim()) {
          errorMsg = 'State is required'
        } else if (value.trim().length > 50) {
          errorMsg = 'Must be less than 50 characters'
        } else if (!/^[a-zA-Z\s\-'.]*$/.test(value.trim())) {
          errorMsg = 'Only letters, spaces, hyphens, apostrophes, and periods allowed'
        }
        break
        
      case 'country':
        if (!value || !value.trim()) {
          errorMsg = 'Country is required'
        } else if (value.trim().length > 50) {
          errorMsg = 'Must be less than 50 characters'
        } else if (!/^[a-zA-Z\s\-'.]*$/.test(value.trim())) {
          errorMsg = 'Only letters, spaces, hyphens, apostrophes, and periods allowed'
        }
        break
        
      case 'pincode':
        if (!value || !value.trim()) {
          errorMsg = 'Pincode is required'
        } else if (!/^[0-9]{6}$/.test(value.trim())) {
          errorMsg = 'Must be exactly 6 digits'
        }
        break
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: errorMsg
    }))
    
    return errorMsg === ''
  }
  
  // Validate all fields (synchronous version for form submission)
  function validateAllFields() {
    // Clear any existing timeouts to ensure immediate validation
    Object.values(validationTimeouts).forEach(timeout => {
      if (timeout) clearTimeout(timeout)
    })
    setValidationTimeouts({})
    
    const isNameValid = validateField('name', name)
    const isAddressValid = validateField('address', address)
    const isCityValid = validateField('city', city)
    const isStateValid = validateField('state', state)
    const isCountryValid = validateField('country', country)
    const isPincodeValid = validateField('pincode', pincode)
    
    return isNameValid && isAddressValid && isCityValid && isStateValid && isCountryValid && isPincodeValid
  }
  
  async function load(){ 
    try {
      setLoading(true)
      setError('')
      const { data } = await api.get('/properties')
      setList(data)
    } catch (err) {
      setError('Failed to load properties')
      console.error('Error loading properties:', err)
    } finally {
      setLoading(false)
    }
  }
  
  async function create(e){
    e.preventDefault()
    setSubmitting(true)
    setError('')
    clearFieldErrors()
    
    // Validate all fields
    const isValid = validateAllFields()
    console.log('Form validation result:', isValid)
    console.log('Current field values:', { name, address, city, state, country, pincode })
    
    if (!isValid) {
      console.log('Form validation failed, preventing submission')
      setError('Please fix the validation errors above before submitting.')
      setSubmitting(false)
      return
    }
    
    console.log('Form validation passed, proceeding with submission')
    
    try {
      await api.post('/properties', { 
        name: name.trim(), 
        address: address.trim(), 
        city: city.trim(), 
        state: state.trim(), 
        country: country.trim(), 
        pincode: pincode.trim() 
      })
      setName('')
      setAddress('')
      setCity('')
      setState('')
      setCountry('')
      setPincode('')
      clearFieldErrors()
      await load()
    } catch (err) {
      // Handle validation errors from backend
      if (err?.response?.data?.errors) {
        // Map backend validation errors to field errors
        const backendErrors = err.response.data.errors
        const newFieldErrors = { ...fieldErrors }
        
        backendErrors.forEach(error => {
          // Map backend field names to frontend field names
          if (error.param === 'name') {
            newFieldErrors.name = error.msg
          } else if (error.param === 'address') {
            newFieldErrors.address = error.msg
          } else if (error.param === 'city') {
            newFieldErrors.city = error.msg
          } else if (error.param === 'state') {
            newFieldErrors.state = error.msg
          } else if (error.param === 'country') {
            newFieldErrors.country = error.msg
          } else if (error.param === 'pincode') {
            newFieldErrors.pincode = error.msg
          }
        })
        
        setFieldErrors(newFieldErrors)
        
        // Also set general error if there are unmapped errors
        const generalErrors = backendErrors.filter(e => !['name', 'address', 'city', 'state', 'country', 'pincode'].includes(e.param))
        if (generalErrors.length > 0) {
          setError(generalErrors.map(e => e.msg).join(', '))
        }
      } else {
        const errorMsg = err?.response?.data?.error || 'Failed to create property'
        setError(errorMsg)
      }
      console.error('Error creating property:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Properties</h2>
      <form onSubmit={create} className="card grid md:grid-cols-3 gap-3" noValidate>
        <div>
          <input 
            className={`input ${fieldErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
            value={name} 
            onChange={e => {
              setName(e.target.value)
              // Real-time validation with debouncing
              debouncedValidateField('name', e.target.value)
            }}
            placeholder="Property Name* (3-100 chars)" 
            disabled={submitting}
            maxLength={100}
          />
          {fieldErrors.name && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.name}</p>
          )}
        </div>
        
        <div>
          <input 
            className={`input ${fieldErrors.address ? 'border-red-500 focus:border-red-500' : ''}`}
            value={address} 
            onChange={e => {
              setAddress(e.target.value)
              // Real-time validation with debouncing
              debouncedValidateField('address', e.target.value)
            }}
            placeholder="Address* (10-200 chars)"
            disabled={submitting}
            maxLength={200}
          />
          {fieldErrors.address && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.address}</p>
          )}
        </div>
        <div>
          <input 
            className={`input ${fieldErrors.city ? 'border-red-500 focus:border-red-500' : ''}`}
            value={city} 
            onChange={e => {
              setCity(e.target.value)
              // Real-time validation with debouncing
              debouncedValidateField('city', e.target.value)
            }}
            placeholder="City* (letters only)"
            disabled={submitting}
            maxLength={50}
          />
          {fieldErrors.city && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.city}</p>
          )}
        </div>
        
        <div>
          <input 
            className={`input ${fieldErrors.state ? 'border-red-500 focus:border-red-500' : ''}`}
            value={state} 
            onChange={e => {
              setState(e.target.value)
              // Real-time validation with debouncing
              debouncedValidateField('state', e.target.value)
            }}
            placeholder="State* (letters only)"
            disabled={submitting}
            maxLength={50}
          />
          {fieldErrors.state && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.state}</p>
          )}
        </div>
        
        <div>
          <input 
            className={`input ${fieldErrors.country ? 'border-red-500 focus:border-red-500' : ''}`}
            value={country} 
            onChange={e => {
              setCountry(e.target.value)
              // Real-time validation with debouncing
              debouncedValidateField('country', e.target.value)
            }}
            placeholder="Country* (letters only)"
            disabled={submitting}
            maxLength={50}
          />
          {fieldErrors.country && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.country}</p>
          )}
        </div>
        
        <div>
          <input 
            className={`input ${fieldErrors.pincode ? 'border-red-500 focus:border-red-500' : ''}`}
            value={pincode} 
            onChange={e => {
              setPincode(e.target.value)
              // Real-time validation with debouncing
              debouncedValidateField('pincode', e.target.value)
            }}
            placeholder="Pincode* (6 digits)"
            disabled={submitting}
            maxLength={6}
            inputMode="numeric"
          />
          {fieldErrors.pincode && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.pincode}</p>
          )}
        </div>
        <button 
          className="btn md:col-span-3" 
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Adding Property...' : 'Add Property'}
        </button>
        {error && <p className="text-red-600 text-sm md:col-span-3">{error}</p>}
        
        {/* Validation Rules Helper */}
        <div className="text-xs text-gray-600 md:col-span-3 space-y-1">
          <p><strong>Validation Rules:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Property Name*:</strong> 3-100 characters, letters/numbers/spaces/hyphens/underscores/periods only</li>
            <li><strong>Address*:</strong> 10-200 characters, must be detailed and complete</li>
            <li><strong>City*:</strong> Letters only, required field</li>
            <li><strong>State*:</strong> Letters only, required field</li>
            <li><strong>Country*:</strong> Letters only, required field</li>
            <li><strong>Pincode*:</strong> Exactly 6 digits (Indian format), required</li>
            <li><strong>Uniqueness:</strong> Property name must be unique across all properties</li>
            <li><strong>Auto-Generated:</strong> Property ID will be created automatically upon successful submission</li>
          </ul>
        </div>
      </form>
      {loading ? (
        <div className="card text-center py-8">
          <p>Loading properties...</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead><tr className="text-left border-b bg-gray-50">
                <th className="p-3 font-semibold">Property Details</th>
                <th className="p-3 font-semibold">Location</th>
                <th className="p-3 font-semibold">Address</th>
                <th className="p-3 font-semibold">Created</th>
                <th className="p-3 font-semibold">Property ID</th>
              </tr></thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                      No properties found. Add your first property above.
                    </td>
                  </tr>
                ) : (
                  list.map(p => (<tr key={p._id} className="border-b last:border-0 hover:bg-gray-50">
                    {/* Property Details */}
                    <td className="p-3">
                      <div>
                        <div className="font-medium text-lg">{p.name}</div>
                        <div className="text-sm text-gray-600">Code: {p.code}</div>
                      </div>
                    </td>
                    
                    {/* Location */}
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{p.city}</div>
                        <div className="text-xs text-gray-600">{p.state}, {p.country}</div>
                        {p.pincode && (
                          <div className="text-xs text-gray-600">PIN: {p.pincode}</div>
                        )}
                      </div>
                    </td>
                    
                    {/* Address */}
                    <td className="p-3">
                      <div className="text-sm max-w-xs">
                        {p.address || 'No address provided'}
                      </div>
                    </td>
                    
                    {/* Created */}
                    <td className="p-3">
                      <div className="text-sm">
                        <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-600">
                          {new Date(p.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>
                    
                    {/* Property ID */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {p._id.slice(-8)}...
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(p._id);
                            alert('Property ID copied!');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                          title="Copy full Property ID"
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
        </div>
      )}
      <p className="text-xs text-gray-600">Use the property ID from here in other screens if needed.</p>
    </div>
  )
}
