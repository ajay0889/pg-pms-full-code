import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Inventory(){
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ propertyId:'', name:'', unit:'kg', quantity:0, minQuantity:0 })
  const [properties, setProperties] = useState([])

  useEffect(()=>{ 
    load()
    loadProperties()
  },[])
  async function load(){ 
    try {
      const { data } = await api.get('/inventory');
      // Handle both paginated and non-paginated responses
      setItems(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Error loading inventory:', error);
      setItems([]);
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

  async function create(e){
    e.preventDefault()
    
    try {
      if (!form.propertyId || !form.name || form.quantity < 0 || form.minQuantity < 0) {
        alert('Please fill in all required fields with valid values')
        return
      }

      await api.post('/inventory', form)
      setForm({ propertyId:'', name:'', unit:'kg', quantity:0, minQuantity:0 })
      await load()
      alert('Inventory item added successfully!')
    } catch (error) {
      console.error('Error creating inventory item:', error)
      const errorMessage = error.response?.data?.error || 'Failed to add inventory item'
      alert(`Error: ${errorMessage}`)
    }
  }

  async function adjust(id, delta){ 
    try {
      await api.patch(`/inventory/${id}/adjust`, { delta })
      await load()
    } catch (error) {
      console.error('Error adjusting inventory:', error)
      const errorMessage = error.response?.data?.error || 'Failed to adjust inventory'
      alert(`Error: ${errorMessage}`)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Inventory</h2>
      <form onSubmit={create} className="card">
        <h3 className="text-lg font-semibold mb-4">Add Inventory Item</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Property *</label>
            <select 
              className="select" 
              value={form.propertyId} 
              onChange={e=>setForm({...form, propertyId:e.target.value})} 
              required
            >
              <option value="">Select property...</option>
              {properties.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Item Name *</label>
            <input 
              className="input" 
              placeholder="e.g., Rice, Oil, Vegetables" 
              value={form.name} 
              onChange={e=>setForm({...form, name:e.target.value})} 
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Unit *</label>
            <select className="select" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})} required>
              <option value="kg">Kilograms (kg)</option>
              <option value="g">Grams (g)</option>
              <option value="l">Liters (l)</option>
              <option value="ml">Milliliters (ml)</option>
              <option value="pcs">Pieces (pcs)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Current Quantity *</label>
            <input 
              type="number" 
              className="input" 
              placeholder="Current stock" 
              value={form.quantity} 
              onChange={e=>setForm({...form, quantity:Number(e.target.value)})} 
              required 
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Minimum Quantity *</label>
            <input 
              type="number" 
              className="input" 
              placeholder="Reorder level" 
              value={form.minQuantity} 
              onChange={e=>setForm({...form, minQuantity:Number(e.target.value)})} 
              required 
              min="0"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="submit" className="btn">Add Item</button>
          <button 
            type="button" 
            onClick={() => setForm({ propertyId:'', name:'', unit:'kg', quantity:0, minQuantity:0 })}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Clear Form
          </button>
        </div>
      </form>

      {/* Inventory Statistics */}
      {items.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{items.length}</div>
                <div className="text-sm opacity-90">Total Items</div>
              </div>
              <div className="text-5xl opacity-20">📦</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{items.filter(i => i.quantity <= i.minQuantity).length}</div>
                <div className="text-sm opacity-90">Low Stock Items</div>
              </div>
              <div className="text-5xl opacity-20">⚠️</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  ₹{items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.pricePerUnit || 0)), 0).toLocaleString()}
                </div>
                <div className="text-sm opacity-90">Total Value</div>
              </div>
              <div className="text-5xl opacity-20">💰</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{items.filter(i => i.quantity > i.minQuantity).length}</div>
                <div className="text-sm opacity-90">Well Stocked</div>
              </div>
              <div className="text-5xl opacity-20">✅</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead><tr className="text-left border-b bg-gray-50">
              <th className="p-3 font-semibold">Item Details</th>
              <th className="p-3 font-semibold">Stock Status</th>
              <th className="p-3 font-semibold">Pricing</th>
              <th className="p-3 font-semibold">Property</th>
              <th className="p-3 font-semibold">Last Updated</th>
              <th className="p-3 font-semibold">Quick Actions</th>
              <th className="p-3 font-semibold">Item ID</th>
            </tr></thead>
            <tbody>
              {Array.isArray(items) && items.length > 0 ? (
                items.map(x => (
                  <tr key={x._id} className="border-b last:border-0 hover:bg-gray-50">
                    {/* Item Details */}
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{x.name}</div>
                        <div className="text-xs text-gray-600">Unit: {x.unit}</div>
                      </div>
                    </td>
                    
                    {/* Stock Status */}
                    <td className="p-3">
                      <div>
                        <div className={`font-semibold ${
                          x.quantity <= x.minQuantity ? 'text-red-600' :
                          x.quantity <= x.minQuantity * 1.5 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {x.quantity} {x.unit}
                        </div>
                        <div className="text-xs text-gray-600">
                          Min: {x.minQuantity} {x.unit}
                        </div>
                        {x.quantity <= x.minQuantity && (
                          <div className="text-xs text-red-600 font-medium">⚠️ Low Stock</div>
                        )}
                      </div>
                    </td>
                    
                    {/* Pricing */}
                    <td className="p-3">
                      <div>
                        {x.pricePerUnit > 0 ? (
                          <>
                            <div className="font-medium">₹{x.pricePerUnit}/{x.unit}</div>
                            <div className="text-xs text-gray-600">
                              Total Value: ₹{(x.quantity * x.pricePerUnit).toFixed(2)}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-500 text-sm">Price not set</span>
                        )}
                      </div>
                    </td>
                    
                    {/* Property */}
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{x.propertyId?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-600">{x.propertyId?.code}</div>
                      </div>
                    </td>
                    
                    {/* Last Updated */}
                    <td className="p-3">
                      <div className="text-sm">
                        <div>{new Date(x.lastUpdated || x.updatedAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-600">
                          {new Date(x.lastUpdated || x.updatedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>
                    
                    {/* Quick Actions */}
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button 
                          className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200" 
                          onClick={()=>adjust(x._id, 1)}
                          title="Add 1"
                        >
                          +1
                        </button>
                        <button 
                          className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200" 
                          onClick={()=>adjust(x._id, -1)}
                          title="Remove 1"
                          disabled={x.quantity <= 0}
                        >
                          -1
                        </button>
                        <button 
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200" 
                          onClick={()=>{
                            const amount = prompt(`Adjust ${x.name} quantity by:`, '0');
                            if (amount && !isNaN(amount)) {
                              adjust(x._id, parseInt(amount));
                            }
                          }}
                          title="Custom adjustment"
                        >
                          ±
                        </button>
                      </div>
                    </td>
                    
                    {/* Item ID */}
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">
                          {x._id.slice(-8)}...
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(x._id);
                            alert('Item ID copied!');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                          title="Copy full Item ID"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    No inventory items found. Add your first item above.
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
