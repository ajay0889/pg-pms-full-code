import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { Tenant } from '../models/Tenant.js';
import { Room } from '../models/Room.js';
import { paginate, parsePaginationParams } from '../utils/pagination.js';
import cache from '../utils/cache.js';
import { getRoomCapacity, getCurrentOccupancy, hasAvailableSpace, updateRoomStatus } from '../utils/roomUtils.js';
import { createInitialPayments } from './rent-tracking.js';
// import notificationService from '../services/notificationService.js'; // Temporarily disabled
import mongoose from 'mongoose';
// import multer from 'multer'; // Temporarily disabled for stability

// Configure multer for file uploads (disabled)
// const upload = multer({ 
//   dest: 'uploads/',
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === 'text/csv' || file.mimetype === 'application/json') {
//       cb(null, true);
//     } else {
//       cb(new Error('Only CSV and JSON files are allowed'));
//     }
//   },
//   limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
// });

export const router = Router();

router.get('/', authRequired, async (req, res) => {
  try {
    const { propertyId, search } = req.query;
    
    // Build simple query
    const q = {};
    if (propertyId) q.propertyId = propertyId;
    
    // Simple text search (without full-text index for now)
    if (search) {
      q.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const tenants = await Tenant.find(q)
      .populate('roomId', 'number')
      .populate('propertyId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100); // Simple limit instead of pagination
    
  res.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

router.post('/', 
  authRequired, 
  requireRoles('SUPER_ADMIN','PROPERTY_ADMIN'),
  body('propertyId')
    .notEmpty()
    .withMessage('Property ID is required')
    .isMongoId()
    .withMessage('Invalid property ID format'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name is required and must be between 2-100 characters')
    .matches(/^[a-zA-Z\s\-'.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  body('phone')
    .trim()
    .matches(/^\d{10,15}$/)
    .withMessage('Phone number must be 10-15 digits only'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  
  body('monthlyRent')
    .isNumeric()
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Monthly rent must be a positive number between ₹1 and ₹10,00,000'),
  body('roomId').optional().notEmpty().withMessage('Room ID must not be empty if provided'),
  body('securityDeposit').optional().isNumeric().isFloat({ min: 0 }).withMessage('Security deposit must be a positive number'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { propertyId, roomId, phone, name } = req.body;

      // Check for phone number uniqueness (Critical Validation Rule)
      const existingTenant = await Tenant.findOne({ phone: phone.trim() });
      if (existingTenant) {
        return res.status(400).json({ 
          error: `A tenant with phone number ${phone} already exists (${existingTenant.name})` 
        });
      }

      // Validate property exists
      const { Property } = await import('../models/Property.js');
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(400).json({ error: 'Property not found' });
      }

      // Validate room availability if roomId provided
      if (roomId && roomId.trim()) {
        try {
          const room = await Room.findById(roomId);
          if (!room) {
            return res.status(400).json({ error: 'Room not found' });
          }
          
          // Check if room has capacity for another tenant
          const currentOccupancy = await getCurrentOccupancy(roomId);
          const maxCapacity = getRoomCapacity(room.type, room.customCapacity);
          
          if (currentOccupancy >= maxCapacity) {
            return res.status(400).json({ 
              error: `Room is at full capacity (${currentOccupancy}/${maxCapacity} tenants)` 
            });
          }
          
          if (room.status === 'MAINTENANCE') {
            return res.status(400).json({ error: 'Room is under maintenance' });
          }
        } catch (roomError) {
          return res.status(400).json({ error: 'Invalid room ID format' });
        }
      }

  const t = await Tenant.create(req.body);
      
      // Update room status and link tenant to room if room assigned
      if (t.roomId) {
        const room = await Room.findById(t.roomId);
        await updateRoomStatus(t.roomId);
        // Also update the room to reference this tenant
        await Room.findByIdAndUpdate(t.roomId, { tenantId: t._id });
        
        // PROTOCOL REQUIREMENT: Create initial payments (security deposit + first month rent)
        try {
          await createInitialPayments(t, room);
        } catch (paymentError) {
          console.error('Error creating initial payments:', paymentError);
          // Don't fail tenant creation if payment creation fails
        }
      }
      
      // Invalidate dashboard cache
      cache.invalidatePattern('dashboard');
      
      // Send notification about new tenant (temporarily disabled)
      // try {
      //   await notificationService.notifyNewTenant(t);
      // } catch (notificationError) {
      //   console.error('Error sending notification:', notificationError);
      // }
      
  res.status(201).json(t);
    } catch (error) {
      console.error('Error creating tenant:', error);
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  }
);

router.patch('/:id', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN','STAFF'), async (req, res) => {
  try {
    const { roomId: newRoomId } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const oldRoomId = tenant.roomId;

    // If room is changing, update room statuses
    if (oldRoomId && oldRoomId.toString() !== newRoomId) {
      // Free up old room and remove tenant reference
      await updateRoomStatus(oldRoomId);
      await Room.findByIdAndUpdate(oldRoomId, { tenantId: null });
    }

    if (newRoomId && newRoomId !== oldRoomId?.toString()) {
      // Check if new room is available
      const newRoom = await Room.findById(newRoomId);
      if (!newRoom) {
        return res.status(400).json({ error: 'New room not found' });
      }
      
      // Check room capacity instead of just status
      const currentOccupancy = await getCurrentOccupancy(newRoomId);
      const maxCapacity = getRoomCapacity(newRoom.type);
      
      if (currentOccupancy >= maxCapacity) {
        return res.status(400).json({ 
          error: `New room is at full capacity (${currentOccupancy}/${maxCapacity} tenants)` 
        });
      }
      
      // Update new room status and link tenant
      await updateRoomStatus(newRoomId);
      await Room.findByIdAndUpdate(newRoomId, { tenantId: req.params.id });
    }

  const t = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Invalidate dashboard cache
    cache.invalidatePattern('dashboard');
    
  res.json(t);
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

router.delete('/:id', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN'), async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Update room status and remove tenant reference if tenant was occupying one
    if (tenant.roomId) {
      await updateRoomStatus(tenant.roomId);
      await Room.findByIdAndUpdate(tenant.roomId, { tenantId: null });
    }

    await Tenant.findByIdAndDelete(req.params.id);
    
    // Invalidate dashboard cache
    cache.invalidatePattern('dashboard');
    
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// Export tenants data (temporarily disabled for stability)
/*
router.get('/export', authRequired, async (req, res) => {
  try {
    const { format = 'csv', propertyId } = req.query;
    const filter = propertyId ? { propertyId } : {};
    
    const tenants = await Tenant.find(filter)
      .populate('roomId', 'number')
      .populate('propertyId', 'name code')
      .lean();

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=tenants.json');
      return res.json(tenants);
    }

    // CSV format
    const csvHeaders = ['Name', 'Phone', 'Email', 'Property', 'Room', 'Monthly Rent', 'Security Deposit', 'Food Plan', 'Created At'];
    const csvRows = tenants.map(tenant => [
      tenant.name,
      tenant.phone,
      tenant.email || '',
      tenant.propertyId?.name || '',
      tenant.roomId?.number || '',
      tenant.monthlyRent,
      tenant.securityDeposit || 0,
      tenant.foodPlan,
      tenant.createdAt
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tenants.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting tenants:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Import tenants data
router.post('/import', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fs = await import('fs');
    const path = await import('path');
    
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    let tenantData = [];

    if (req.file.mimetype === 'application/json') {
      tenantData = JSON.parse(fileContent);
    } else {
      // Parse CSV
      const lines = fileContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: 'CSV file must have headers and at least one data row' });
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      tenantData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        const tenant = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            switch (header.toLowerCase()) {
              case 'name': tenant.name = values[index]; break;
              case 'phone': tenant.phone = values[index]; break;
              case 'email': tenant.email = values[index]; break;
              case 'monthly rent': tenant.monthlyRent = parseFloat(values[index]) || 0; break;
              case 'security deposit': tenant.securityDeposit = parseFloat(values[index]) || 0; break;
              case 'food plan': tenant.foodPlan = values[index]; break;
              case 'property id': tenant.propertyId = values[index]; break;
              case 'room id': tenant.roomId = values[index]; break;
            }
          }
        });
        return tenant;
      });
    }

    let imported = 0;
    let errors = 0;
    const results = [];

    for (const tenantInfo of tenantData) {
      try {
        if (!tenantInfo.name || !tenantInfo.phone || !tenantInfo.propertyId) {
          errors++;
          results.push({ error: 'Missing required fields: name, phone, propertyId', data: tenantInfo });
          continue;
        }

        // Check if tenant already exists
        const existing = await Tenant.findOne({ 
          phone: tenantInfo.phone, 
          propertyId: tenantInfo.propertyId 
        });

        if (existing) {
          // Update existing tenant
          await Tenant.findByIdAndUpdate(existing._id, tenantInfo);
        } else {
          // Create new tenant
          await Tenant.create(tenantInfo);
        }

        imported++;
      } catch (error) {
        errors++;
        results.push({ error: error.message, data: tenantInfo });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Invalidate cache
    cache.invalidatePattern('dashboard');

    res.json({
      imported,
      errors,
      details: results.slice(0, 10) // Return first 10 errors for debugging
    });
  } catch (error) {
    console.error('Error importing tenants:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});
*/
