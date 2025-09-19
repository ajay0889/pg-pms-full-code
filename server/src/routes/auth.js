import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Property } from '../models/Property.js';

export const router = Router();

router.post('/register',
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, password, role='SUPER_ADMIN', propertyCode } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    let propertyIds = [];
    if (propertyCode) {
      const prop = await Property.findOne({ code: propertyCode });
      if (!prop) return res.status(400).json({ error: 'Invalid property code' });
      propertyIds = [prop._id];
    }
    const user = await User.create({ name, email, passwordHash, role, propertyIds });
    res.json({ id: user._id, email: user.email });
  }
);

router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role, propertyIds: user.propertyIds }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role, name: user.name });
  }
);
