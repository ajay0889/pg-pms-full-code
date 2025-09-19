import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { Room } from '../models/Room.js';
import { Property } from '../models/Property.js';
import { getRoomCapacity, getCurrentOccupancy, getRoomStatus } from '../utils/roomUtils.js';

export const router = Router();

router.get('/', authRequired, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const q = propertyId ? { propertyId } : {};
    const rooms = await Room.find(q).populate('tenantId', 'name phone').populate('propertyId', 'name code city');
    
    // Add capacity information to each room
    const roomsWithCapacity = await Promise.all(
      rooms.map(async (room) => {
        const currentOccupancy = await getCurrentOccupancy(room._id);
        const maxCapacity = getRoomCapacity(room.type, room.customCapacity);
        const actualStatus = await getRoomStatus(room);
        
        return {
          ...room.toObject(),
          currentOccupancy,
          maxCapacity,
          status: actualStatus
        };
      })
    );
    
    res.json(roomsWithCapacity);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.post('/', 
  authRequired, 
  requireRoles('SUPER_ADMIN','PROPERTY_ADMIN'),
  // Validation rules
  body('propertyId')
    .notEmpty()
    .withMessage('Property ID is required')
    .isMongoId()
    .withMessage('Invalid property ID format'),
  
  body('number')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Room number is required and must be less than 20 characters')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Room number can only contain letters, numbers, hyphens, and underscores'),
  
  body('type')
    .notEmpty()
    .withMessage('Room type is required')
    .isIn(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORM'])
    .withMessage('Room type must be SINGLE, DOUBLE, TRIPLE, or DORM'),
  
  body('rent')
    .notEmpty()
    .withMessage('Monthly rent is required')
    .isNumeric()
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Rent must be a positive number between ₹1 and ₹10,00,000'),
  
  body('customCapacity')
    .optional()
    .isInt({ min: 4, max: 20 })
    .withMessage('Custom capacity must be between 4 and 20 people'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { propertyId, number, type, rent, customCapacity } = req.body;

      // Check if property exists
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(400).json({ error: 'Property not found' });
      }

      // Check if room number already exists in this property
      const existingRoom = await Room.findOne({ 
        propertyId, 
        number: number.trim() 
      });
      if (existingRoom) {
        return res.status(400).json({ 
          error: `Room ${number} already exists in ${property.name}` 
        });
      }

      // Create room with proper initialization
      const maxCapacity = type === 'DORM' && customCapacity ? 
        parseInt(customCapacity) : getRoomCapacity(type);
      
      const room = await Room.create({
        propertyId,
        number: number.trim(),
        type,
        rent: parseFloat(rent),
        status: 'VACANT',
        currentOccupancy: 0,
        maxCapacity,
        ...(type === 'DORM' && customCapacity && { customCapacity: parseInt(customCapacity) })
      });

      // Populate the response
      const populatedRoom = await Room.findById(room._id)
        .populate('propertyId', 'name code city');

      res.status(201).json({
        ...populatedRoom.toObject(),
        currentOccupancy: 0,
        maxCapacity,
        rentPerTenant: parseFloat(rent) // Initially full rent since no tenants
      });
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({ error: 'Failed to create room' });
    }
  }
);

// Get rooms for tenant form (lightweight, no population)
router.get('/for-tenant-form', authRequired, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const q = propertyId ? { propertyId } : {};
    const rooms = await Room.find(q).select('_id number type rent status propertyId');
    
    // Add capacity information to each room
    const roomsWithCapacity = await Promise.all(
      rooms.map(async (room) => {
        const currentOccupancy = await getCurrentOccupancy(room._id);
        const maxCapacity = getRoomCapacity(room.type, room.customCapacity);
        const actualStatus = await getRoomStatus(room);
        
        return {
          ...room.toObject(),
          currentOccupancy,
          maxCapacity,
          status: actualStatus
        };
      })
    );
    
    res.json(roomsWithCapacity);
  } catch (error) {
    console.error('Error fetching rooms for tenant form:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.patch('/:id', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN','STAFF'), async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(room);
});
