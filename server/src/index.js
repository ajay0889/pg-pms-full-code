import dotenv from 'dotenv'; dotenv.config();
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { router as authRoutes } from './routes/auth.js';
import { router as propertyRoutes } from './routes/properties.js';
import { router as roomRoutes } from './routes/rooms.js';
import { router as tenantRoutes } from './routes/tenants.js';
import { router as inventoryRoutes } from './routes/inventory.js';
import { router as mealRoutes } from './routes/meals.js';
import { router as paymentRoutes } from './routes/payments.js';
import { router as complaintRoutes } from './routes/complaints.js';
import { router as analyticsRoutes } from './routes/analytics.js';
import { router as rentTrackingRoutes } from './routes/rent-tracking.js';
// import { router as notificationRoutes } from './routes/notifications.js'; // Temporarily disabled

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// API root endpoint - shows available routes
app.get('/api', (_req, res) => {
  res.json({
    message: 'PG/Hostel Property Management System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      authentication: [
        'POST /api/auth/login - User login',
        'POST /api/auth/register - User registration'
      ],
      properties: [
        'GET /api/properties - List all properties',
        'POST /api/properties - Create new property'
      ],
      rooms: [
        'GET /api/rooms - List rooms (optional: ?propertyId=ID)',
        'POST /api/rooms - Create new room',
        'PATCH /api/rooms/:id - Update room'
      ],
      tenants: [
        'GET /api/tenants - List tenants (optional: ?propertyId=ID&search=term)',
        'POST /api/tenants - Create new tenant',
        'PATCH /api/tenants/:id - Update tenant',
        'DELETE /api/tenants/:id - Delete tenant'
      ],
      payments: [
        'GET /api/payments - List payments (optional: ?propertyId=ID&tenantId=ID&type=TYPE)',
        'POST /api/payments - Record new payment'
      ],
      complaints: [
        'GET /api/complaints - List complaints (optional: ?propertyId=ID&status=STATUS)',
        'POST /api/complaints - Submit new complaint',
        'PATCH /api/complaints/:id - Update complaint status'
      ],
      inventory: [
        'GET /api/inventory - List inventory items (optional: ?propertyId=ID)',
        'POST /api/inventory - Add inventory item',
        'PATCH /api/inventory/:id/adjust - Adjust inventory quantity'
      ],
      meals: [
        'GET /api/meals - List meal plans (optional: ?propertyId=ID&date=YYYY-MM-DD)',
        'POST /api/meals - Create meal plan',
        'POST /api/meals/apply-usage - Apply meal usage to inventory'
      ],
      analytics: [
        'GET /api/analytics/dashboard - Dashboard overview (optional: ?propertyId=ID)',
        'GET /api/analytics/revenue-chart - Revenue chart data',
        'GET /api/analytics/financial-report - Financial report',
        'GET /api/analytics/occupancy-report - Occupancy report',
        'GET /api/analytics/maintenance-report - Maintenance report'
      ],
      rentTracking: [
        'GET /api/rent-tracking/monthly-status - Monthly rent status by room (optional: ?propertyId=ID&month=MM&year=YYYY)',
        'PATCH /api/rent-tracking/payment/:paymentId/mark-paid - Mark payment as paid',
        'PATCH /api/rent-tracking/payment/:paymentId/mark-unpaid - Mark payment as unpaid'
      ],
      utility: [
        'GET /api/health - Health check',
        'GET /api - This endpoint (API documentation)'
      ]
    },
    notes: [
      'All endpoints except /auth/* require Authorization: Bearer <token>',
      'Use POST /api/auth/login to get authentication token',
      'Default admin credentials: admin@example.com / admin123',
      'Replace :id with actual MongoDB ObjectId',
      'Optional query parameters are shown in parentheses'
    ]
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/rent-tracking', rentTrackingRoutes);
// app.use('/api/notifications', notificationRoutes); // Temporarily disabled

// Global error handler middleware
app.use((error, req, res, next) => {
  console.error('Express Error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pg_pms').then(() => {
  console.log('MongoDB connected');
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

}).catch(err => { 
  console.error('MongoDB connection error:', err); 
  process.exit(1); 
});
