import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { Property } from '../models/Property.js';
import slugify from 'slugify';

export const router = Router();

router.get('/', authRequired, async (_req, res) => {
  const list = await Property.find({}).sort({ createdAt: -1 });
  res.json(list);
});

router.post('/', 
  authRequired, 
  requireRoles('SUPER_ADMIN','PROPERTY_ADMIN'),
  // 1. Required Field Validation
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Property name is required and must be between 3-100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.]+$/)
    .withMessage('Property name can only contain letters, numbers, spaces, hyphens, underscores, and periods'),
  
  body('address')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address is required and must be between 10-200 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,#/()]+$/)
    .withMessage('Address contains invalid characters'),
  
  // 2. Data Format and Type Validation
  body('city')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('City is required and must be less than 50 characters')
    .matches(/^[a-zA-Z\s\-'.]+$/)
    .withMessage('City can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  body('state')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('State is required and must be less than 50 characters')
    .matches(/^[a-zA-Z\s\-'.]+$/)
    .withMessage('State can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  body('country')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Country is required and must be less than 50 characters')
    .matches(/^[a-zA-Z\s\-'.]+$/)
    .withMessage('Country can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  // 3. Pincode Validation (Indian format - 6 digits)
  body('pincode')
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('Pincode is required and must be exactly 6 digits'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, address, city, state, country, pincode } = req.body;
      const code = slugify(name, { lower: true, strict: true }).slice(0, 8).toUpperCase();
      
      // 3. Logical and Uniqueness Validation
      // Check if property with same name already exists
      const existingByName = await Property.findOne({ name: name.trim() });
      if (existingByName) {
        return res.status(400).json({ error: 'A property with this name already exists' });
      }
      
      // Check if property with same name AND address combination exists (Data Consistency)
      const existingByNameAndAddress = await Property.findOne({ 
        name: name.trim(),
        address: address.trim()
      });
      if (existingByNameAndAddress) {
        return res.status(400).json({ error: 'A property with this name and address combination already exists' });
      }
      
      // Check if property code already exists (should be rare but possible)
      const existingByCode = await Property.findOne({ code });
      if (existingByCode) {
        // Generate alternative code if collision occurs
        const timestamp = Date.now().toString().slice(-4);
        const alternativeCode = slugify(name, { lower: true, strict: true }).slice(0, 4).toUpperCase() + timestamp;
        return res.status(400).json({ 
          error: 'Property code collision detected. Please try with a slightly different name.',
          suggestedCode: alternativeCode 
        });
      }

      const p = await Property.create({ 
        name: name.trim(), 
        code, 
        address: address?.trim(), 
        city: city?.trim(), 
        state: state?.trim(), 
        country: country?.trim(), 
        pincode: pincode?.trim() 
      });
      res.status(201).json(p);
    } catch (error) {
      console.error('Error creating property:', error);
      res.status(500).json({ error: 'Failed to create property' });
    }
  }
);
