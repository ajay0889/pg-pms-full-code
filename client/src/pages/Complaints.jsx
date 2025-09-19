import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Complaints(){
  const [list, setList] = useState([])
  const [form, setForm] = useState({ propertyId:'', description:'', category:'OTHER', tenantId:'' })
  const [reference, setReference] = useState({ properties: [], tenants: [] })

  useEffect(()=>{ 
    load()
    loadReference()
  },[])
  async function load(){ 
    try {
      const { data } = await api.get('/complaints');
      // Handle both paginated and non-paginated responses
      setList(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Error loading complaints:', error);
      setList([]);
    }
  }

  async function loadReference() {
    try {
      const [propertiesRes, tenantsRes] = await Promise.all([
        api.get('/properties'),
        api.get('/tenants')
      ])
      
      setReference({
        properties: Array.isArray(propertiesRes.data) ? propertiesRes.data : (propertiesRes.data.data || []),
        tenants: Array.isArray(tenantsRes.data) ? tenantsRes.data : (tenantsRes.data.data || [])
      })
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  async function create(e){
    e.preventDefault()
    
    try {
      if (!form.propertyId || !form.description || !form.category) {
        alert('Please fill in all required fields: Property, Category, and Description')
        return
      }

      await api.post('/complaints', form)
      setForm({ propertyId:'', description:'', category:'OTHER', tenantId:'' })
      await load()
      alert('Complaint submitted successfully!')
    } catch (error) {
      console.error('Error creating complaint:', error)
      const errorMessage = error.response?.data?.error || 'Failed to submit complaint'
      alert(`Error: ${errorMessage}`)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Complaints</h2>
      <form onSubmit={create} className="card">
        <h3 className="text-lg font-semibold mb-4">Submit New Complaint</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Property *</label>
            <select 
              className="select" 
              value={form.propertyId} 
              onChange={e=>setForm({...form, propertyId:e.target.value})} 
              required
            >
              <option value="">Select property...</option>
              {reference.properties.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select className="select" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} required>
              <option value="ELECTRICAL">🔌 Electrical Issues</option>
              <option value="PLUMBING">🚰 Plumbing Issues</option>
              <option value="CLEANING">🧹 Cleaning Issues</option>
              <option value="SECURITY">🔒 Security Issues</option>
              <option value="OTHER">📝 Other Issues</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tenant (Optional)</label>
            <select 
              className="select" 
              value={form.tenantId} 
              onChange={e=>setForm({...form, tenantId:e.target.value})}
            >
              <option value="">Not related to specific tenant</option>
              {reference.tenants
                .filter(t => !form.propertyId || t.propertyId === form.propertyId || t.propertyId?._id === form.propertyId)
                .map(t => (
                <option key={t._id} value={t._id}>
                  {t.name} - Room {t.roomId?.number || 'None'}
                </option>
              ))}
        </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea 
              className="input min-h-20" 
              placeholder="Describe the issue in detail..." 
              value={form.description} 
              onChange={e=>setForm({...form, description:e.target.value})} 
              required
              rows="3"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="submit" className="btn">Submit Complaint</button>
          <button 
            type="button" 
            onClick={() => setForm({ propertyId:'', description:'', category:'OTHER', tenantId:'' })}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Clear Form
          </button>
        </div>
      </form>

      {/* Complaint Statistics */}
      {list.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{list.length}</div>
                <div className="text-sm opacity-90">Total Complaints</div>
              </div>
              <div className="text-5xl opacity-20">📝</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{list.filter(c => ['OPEN', 'IN_PROGRESS'].includes(c.status)).length}</div>
                <div className="text-sm opacity-90">Pending Issues</div>
              </div>
              <div className="text-5xl opacity-20">🔧</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{list.filter(c => c.status === 'RESOLVED').length}</div>
                <div className="text-sm opacity-90">Resolved</div>
              </div>
              <div className="text-5xl opacity-20">✅</div>
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {list.length > 0 ? Math.round((list.filter(c => c.status === 'RESOLVED').length / list.length) * 100) : 0}%
                </div>
                <div className="text-sm opacity-90">Resolution Rate</div>
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
              <th className="p-3 font-semibold">Category & Priority</th>
              <th className="p-3 font-semibold">Description</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Tenant Info</th>
              <th className="p-3 font-semibold">Property</th>
              <th className="p-3 font-semibold">Assignment</th>
              <th className="p-3 font-semibold">Timeline</th>
            </tr></thead>
        <tbody>
              {Array.isArray(list) && list.length > 0 ? (
                list.map(c => (<tr key={c._id} className="border-b last:border-0 hover:bg-gray-50">
                  {/* Category & Priority */}
                  <td className="p-3">
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        c.category === 'ELECTRICAL' ? 'bg-yellow-100 text-yellow-800' :
                        c.category === 'PLUMBING' ? 'bg-blue-100 text-blue-800' :
                        c.category === 'CLEANING' ? 'bg-green-100 text-green-800' :
                        c.category === 'SECURITY' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {c.category === 'ELECTRICAL' ? '🔌' : 
                         c.category === 'PLUMBING' ? '🚰' :
                         c.category === 'CLEANING' ? '🧹' :
                         c.category === 'SECURITY' ? '🔒' : '📝'} {c.category}
                      </span>
                      {c.priority && (
                        <div className={`text-xs mt-1 ${
                          c.priority === 'high' ? 'text-red-600' :
                          c.priority === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          Priority: {c.priority}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Description */}
                  <td className="p-3">
                    <div className="max-w-xs">
                      <p className="text-sm">{c.description}</p>
                    </div>
                  </td>
                  
                  {/* Status */}
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      c.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                      c.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                      c.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {c.status === 'OPEN' ? '🔴' : 
                       c.status === 'IN_PROGRESS' ? '🟡' :
                       c.status === 'RESOLVED' ? '🟢' : '⚪'} {c.status}
                    </span>
                  </td>
                  
                  {/* Tenant Info */}
                  <td className="p-3">
                    {c.tenantId ? (
                      <div>
                        <div className="font-medium">{c.tenantId.name}</div>
                        <div className="text-xs text-gray-600">{c.tenantId.phone}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">General complaint</span>
                    )}
                  </td>
                  
                  {/* Property */}
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{c.propertyId?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-600">{c.propertyId?.code}</div>
                    </div>
                  </td>
                  
                  {/* Assignment */}
                  <td className="p-3">
                    {c.assignedTo ? (
                      <div>
                        <div className="font-medium">{c.assignedTo.name}</div>
                        <div className="text-xs text-gray-600">Assigned</div>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Unassigned</span>
                    )}
                  </td>
                  
                  {/* Timeline */}
                  <td className="p-3">
                    <div className="text-sm">
                      <div>Created: {new Date(c.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(c.createdAt).toLocaleTimeString()}
                      </div>
                      {c.updatedAt && c.updatedAt !== c.createdAt && (
                        <div className="text-xs text-gray-600">
                          Updated: {new Date(c.updatedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    No complaints found. Submit your first complaint above.
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
