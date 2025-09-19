import React, { useState, useEffect } from 'react'
import api from '../services/api'

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadNotifications() {
    try {
      const { data } = await api.get('/notifications?limit=20')
      setNotifications(data.data || data)
      const unread = (data.data || data).filter(n => !n.read).length
      setUnreadCount(unread)
    } catch (error) {
      console.error('Error loading notifications:', error)
      // Gracefully handle API errors - don't break the UI
      setNotifications([])
      setUnreadCount(0)
    }
  }

  async function markAsRead(notificationId) {
    try {
      await api.patch(`/notifications/${notificationId}/read`)
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  async function markAllAsRead() {
    try {
      setLoading(true)
      await api.patch('/notifications/mark-all-read')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteNotification(notificationId) {
    try {
      await api.delete(`/notifications/${notificationId}`)
      setNotifications(prev => prev.filter(n => n._id !== notificationId))
      setUnreadCount(prev => {
        const notification = notifications.find(n => n._id === notificationId)
        return notification && !notification.read ? Math.max(0, prev - 1) : prev
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'payment': return '💳'
      case 'complaint': return '🔧'
      case 'tenant': return '👥'
      case 'room': return '🏠'
      case 'system': return '⚙️'
      case 'reminder': return '⏰'
      default: return '📢'
    }
  }

  function getNotificationColor(type, priority) {
    if (priority === 'high') return 'text-red-600 bg-red-50'
    if (priority === 'medium') return 'text-yellow-600 bg-yellow-50'
    switch (type) {
      case 'payment': return 'text-green-600 bg-green-50'
      case 'complaint': return 'text-red-600 bg-red-50'
      case 'tenant': return 'text-blue-600 bg-blue-50'
      case 'room': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
      >
        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">🔔</div>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 border-b hover:bg-gray-50 transition-colors duration-200 ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        getNotificationColor(notification.type, notification.priority)
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="flex gap-1 ml-2">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification._id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                                title="Mark as read"
                              >
                                ✓
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification._id)}
                              className="text-xs text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        
                        {notification.actionUrl && (
                          <button
                            onClick={() => {
                              window.location.href = notification.actionUrl
                              markAsRead(notification._id)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                          >
                            View Details →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    // Navigate to full notifications page if implemented
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
