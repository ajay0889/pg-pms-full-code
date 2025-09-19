import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/')
    }
  }, [navigate])

  async function onSubmit(e){
    e.preventDefault()
    setErr('')
    setLoading(true)
    
    try{
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      
      // Redirect to the page they were trying to access or dashboard
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    }catch(ex){ 
      setErr(ex?.response?.data?.error || 'Login failed') 
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="h-full grid place-items-center">
      <form onSubmit={onSubmit} className="card w-96 space-y-3">
        <h2 className="text-xl font-semibold">Login</h2>
        <input 
          className="input" 
          type="email" 
          value={email} 
          onChange={e=>setEmail(e.target.value)} 
          placeholder="Email"
          required
          disabled={loading}
        />
        <input 
          className="input" 
          type="password" 
          value={password} 
          onChange={e=>setPassword(e.target.value)} 
          placeholder="Password"
          required
          disabled={loading}
        />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="btn w-full" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <div className="text-xs text-gray-600 text-center">
          Demo: admin@example.com / admin123
        </div>
      </form>
    </div>
  )
}
