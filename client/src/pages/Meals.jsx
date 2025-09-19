import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Meals(){
  const [plans, setPlans] = useState([])
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [meal, setMeal] = useState({ type:'BREAKFAST', name:'', quantity:1, unit:'kg' })
  const [propertyId, setPropertyId] = useState('')
  const [properties, setProperties] = useState([])

  useEffect(()=>{ 
    load()
    loadProperties()
  },[])
  async function load(){ 
    try {
      const { data } = await api.get('/meals');
      // Handle both paginated and non-paginated responses
      setPlans(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Error loading meal plans:', error);
      setPlans([]);
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
      if (!propertyId || !date || !meal.name || !meal.quantity) {
        alert('Please fill in all required fields')
        return
      }

      const payload = { 
        propertyId, 
        date, 
        meals:[{ 
          type: meal.type, 
          items:[{ 
            name: meal.name, 
            quantity: meal.quantity, 
            unit: meal.unit 
          }] 
        }] 
      }
      
      await api.post('/meals', payload)
      setMeal({ type:'BREAKFAST', name:'', quantity:1, unit:'kg' })
      await load()
      alert('Meal plan created successfully!')
    } catch (error) {
      console.error('Error creating meal plan:', error)
      const errorMessage = error.response?.data?.error || 'Failed to create meal plan'
      alert(`Error: ${errorMessage}`)
    }
  }

  async function apply(id){ 
    try {
      const response = await api.post('/meals/apply-usage', { mealPlanId: id })
      
      if (response.data.appliedItems) {
        const itemsList = response.data.appliedItems.join('\n')
        alert(`✅ Inventory updated successfully!\n\nChanges made:\n${itemsList}`)
      } else {
        alert('✅ Inventory adjusted from meal plan successfully!')
      }
      
      // Optionally reload the page to refresh data
      await load()
    } catch (error) {
      console.error('Error applying meal usage:', error)
      const errorData = error.response?.data
      
      if (errorData) {
        let message = `❌ ${errorData.error}`
        
        if (errorData.missingItems) {
          message += `\n\nMissing items:\n• ${errorData.missingItems.join('\n• ')}`
        }
        
        if (errorData.items) {
          message += `\n\nInsufficient items:\n• ${errorData.items.join('\n• ')}`
        }
        
        if (errorData.suggestion) {
          message += `\n\n💡 ${errorData.suggestion}`
        }
        
        alert(message)
      } else {
        alert('❌ Failed to apply meal usage. Please check your connection and try again.')
      }
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Meal Plans</h2>
      <form onSubmit={create} className="card">
        <h3 className="text-lg font-semibold mb-4">Create Meal Plan</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Property *</label>
            <select 
              className="select" 
              value={propertyId} 
              onChange={e=>setPropertyId(e.target.value)} 
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
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input 
              className="input" 
              type="date" 
              value={date} 
              onChange={e=>setDate(e.target.value)} 
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Meal Type *</label>
            <select className="select" value={meal.type} onChange={e=>setMeal({...meal, type:e.target.value})} required>
              <option value="BREAKFAST">🌅 Breakfast</option>
              <option value="LUNCH">☀️ Lunch</option>
              <option value="DINNER">🌙 Dinner</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Food Item *</label>
            <input 
              className="input" 
              placeholder="e.g., Poha, Dal Rice, etc." 
              value={meal.name} 
              onChange={e=>setMeal({...meal, name:e.target.value})} 
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantity *</label>
            <input 
              type="number" 
              className="input" 
              placeholder="Amount needed" 
              value={meal.quantity} 
              onChange={e=>setMeal({...meal, quantity:Number(e.target.value)})} 
              required 
              min="0"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Unit *</label>
            <select className="select" value={meal.unit} onChange={e=>setMeal({...meal, unit:e.target.value})} required>
              <option value="kg">Kilograms (kg)</option>
              <option value="g">Grams (g)</option>
              <option value="l">Liters (l)</option>
              <option value="ml">Milliliters (ml)</option>
              <option value="pcs">Pieces (pcs)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="submit" className="btn">Create Meal Plan</button>
          <button 
            type="button" 
            onClick={() => {
              setMeal({ type:'BREAKFAST', name:'', quantity:1, unit:'kg' })
              setPropertyId('')
              setDate(new Date().toISOString().slice(0,10))
            }}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Clear Form
          </button>
        </div>
      </form>

      <div className="grid gap-3">
        {Array.isArray(plans) && plans.length > 0 ? (
          plans.map(p => (
            <div key={p._id} className="card">
              <div className="font-semibold">{new Date(p.date).toDateString()}</div>
              <ul className="list-disc pl-6">
                {p.meals?.map((m, idx) => (
                  <li key={idx}><span className="font-medium">{m.type}</span>: {m.items?.map(i => `${i.name} (${i.quantity}${i.unit})`).join(', ')}</li>
                ))}
              </ul>
              <button onClick={()=>apply(p._id)} className="btn mt-3">Apply Usage</button>
            </div>
          ))
        ) : (
          <div className="card text-center py-8 text-gray-500">
            No meal plans found. Add your first meal plan above.
          </div>
        )}
      </div>
    </div>
  )
}
