import axios from 'axios'

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API,
  timeout: 10000 // 10 second timeout
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token expiration and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    
    // Handle network errors gracefully
    if (!error.response) {
      console.log('Network error - server might be restarting')
      // Don't redirect for network errors, just log them
      return Promise.reject({
        ...error,
        message: 'Network error - please check your connection'
      })
    }
    
    return Promise.reject(error)
  }
)

export default api
