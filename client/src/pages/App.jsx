import React, { useState } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
// import NotificationCenter from '../components/NotificationCenter' // Temporarily disabled

export default function App(){
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  function logout(){ 
    localStorage.removeItem('token')
    navigate('/login', { replace: true })
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/properties', label: 'Properties', icon: '🏢' },
    { path: '/rooms', label: 'Rooms', icon: '🏠' },
    { path: '/tenants', label: 'Tenants', icon: '👥' },
    { path: '/inventory', label: 'Inventory', icon: '📦' },
    { path: '/meals', label: 'Meals', icon: '🍽️' },
    { path: '/payments', label: 'Payments', icon: '💳' },
    { path: '/complaints', label: 'Complaints', icon: '🔧' },
    { path: '/reports', label: 'Reports', icon: '📈' },
    { path: '/id-reference', label: 'ID Reference', icon: '📋' }
  ]

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg">PG/Hostel PMS</h1>
        <div className="flex items-center gap-2">
          {/* <NotificationCenter /> */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        lg:w-64 bg-white shadow-lg lg:shadow
        ${sidebarOpen ? 'block' : 'hidden'} lg:block
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-0
        transform lg:transform-none transition-transform duration-300 ease-in-out
      `}>
        <div className="p-4 space-y-3 h-full flex flex-col">
          <div className="hidden lg:flex items-center justify-between">
            <h1 className="font-bold text-xl">PG/Hostel PMS</h1>
            {/* <NotificationCenter /> */}
          </div>
          
          <nav className="flex-1 flex flex-col gap-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-md transition-colors duration-200 ${
                  location.pathname === item.path
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          
          <button 
            onClick={logout} 
            className="flex items-center gap-3 p-3 text-left text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 mt-4"
          >
            <span className="text-lg">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50 min-h-0">
        <Outlet/>
      </main>
    </div>
  )
}
