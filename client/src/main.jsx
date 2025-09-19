import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './utils/errorFilter.js' // Filter out browser extension errors
import App from './pages/App.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Properties from './pages/Properties.jsx'
import Rooms from './pages/Rooms.jsx'
import Tenants from './pages/Tenants.jsx'
import Inventory from './pages/Inventory.jsx'
import Meals from './pages/Meals.jsx'
import Payments from './pages/Payments.jsx'
import Complaints from './pages/Complaints.jsx'
import Reports from './pages/Reports.jsx'
import IDReference from './pages/IDReference.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/" element={<ProtectedRoute><App/></ProtectedRoute>}>
          <Route index element={<Dashboard/>} />
          <Route path="properties" element={<Properties/>} />
          <Route path="rooms" element={<Rooms/>} />
          <Route path="tenants" element={<Tenants/>} />
          <Route path="inventory" element={<Inventory/>} />
          <Route path="meals" element={<Meals/>} />
          <Route path="payments" element={<Payments/>} />
          <Route path="complaints" element={<Complaints/>} />
          <Route path="reports" element={<Reports/>} />
          <Route path="id-reference" element={<IDReference/>} />
        </Route>
        <Route path="*" element={<Navigate to='/'/>}/>
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
)
