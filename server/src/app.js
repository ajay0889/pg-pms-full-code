import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
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

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api', (_req, res) => {
  res.json({ message: 'PG/Hostel Property Management System API', status: 'running' });
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

app.use((error, req, res, next) => {
  console.error('Express Error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;


