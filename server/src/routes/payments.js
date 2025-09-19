import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { Payment } from '../models/Payment.js';
import { Tenant } from '../models/Tenant.js';
import { Property } from '../models/Property.js';
import { paginate, parsePaginationParams } from '../utils/pagination.js';
import cache from '../utils/cache.js';
// import notificationService from '../services/notificationService.js'; // Temporarily disabled

export const router = Router();

router.get('/', authRequired, async (req, res) => {
  try {
    const { propertyId, tenantId, type } = req.query;
    
    const q = {};
    if (propertyId) q.propertyId = propertyId;
    if (tenantId) q.tenantId = tenantId;
    if (type) q.type = type;
    
    const payments = await Payment.find(q)
      .populate('tenantId', 'name phone')
      .populate('propertyId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100); // Simple limit
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/', 
  authRequired, 
  requireRoles('SUPER_ADMIN','PROPERTY_ADMIN','STAFF'),
  // Validation rules
  body('type')
    .notEmpty()
    .withMessage('Payment type is required')
    .isIn(['RENT', 'FOOD', 'DEPOSIT', 'OTHER'])
    .withMessage('Payment type must be RENT, FOOD, DEPOSIT, or OTHER'),
  
  body('propertyId')
    .notEmpty()
    .withMessage('Property ID is required')
    .isMongoId()
    .withMessage('Invalid property ID format'),
  
  body('tenantId')
    .notEmpty()
    .withMessage('Tenant ID is required')
    .isMongoId()
    .withMessage('Invalid tenant ID format'),
  
  body('amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isNumeric()
    .isFloat({ min: 0.01, max: 10000000 })
    .withMessage('Amount must be a positive number between ₹0.01 and ₹1,00,00,000'),
  
  body('method')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['CASH', 'UPI', 'CARD', 'ONLINE'])
    .withMessage('Payment method must be CASH, UPI, CARD, or ONLINE'),
  
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference must be less than 100 characters'),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { propertyId, tenantId, type, amount, method, reference } = req.body;

      // Validate property exists
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(400).json({ error: 'Property not found' });
      }

      // Validate tenant exists and belongs to the property
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant not found' });
      }

      if (tenant.propertyId.toString() !== propertyId) {
        return res.status(400).json({ error: 'Tenant does not belong to the selected property' });
      }

      // Create payment with proper data
      const paymentData = {
        propertyId,
        tenantId,
        roomId: tenant.roomId, // Link to tenant's room if assigned
        type,
        amount: parseFloat(amount),
        method,
        reference: reference?.trim() || '',
        status: 'PAID'
      };

      // Add period info for rent payments
      if (type === 'RENT') {
        const currentDate = new Date();
        paymentData.periodMonth = currentDate.getMonth() + 1;
        paymentData.periodYear = currentDate.getFullYear();
      }

      const payment = await Payment.create(paymentData);
      
      // Populate the response
      const populatedPayment = await Payment.findById(payment._id)
        .populate('tenantId', 'name phone')
        .populate('propertyId', 'name code');
      
      // Invalidate dashboard cache
      cache.invalidatePattern('dashboard');
      
      // Send notification about payment received (temporarily disabled)
      // try {
      //   await notificationService.notifyPaymentReceived(payment);
      // } catch (notificationError) {
      //   console.error('Error sending notification:', notificationError);
      // }
      
      res.status(201).json(populatedPayment);
    } catch (error) {
      console.error('Error creating payment:', error);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  }
);
