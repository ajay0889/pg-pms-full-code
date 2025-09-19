import { Router } from 'express';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { Complaint } from '../models/Complaint.js';
// import notificationService from '../services/notificationService.js'; // Temporarily disabled

export const router = Router();

router.get('/', authRequired, async (req, res) => {
  const { propertyId, status } = req.query;
  const q = {};
  if (propertyId) q.propertyId = propertyId;
  if (status) q.status = status;
  const list = await Complaint.find(q).sort({ createdAt: -1 });
  res.json(list);
});

router.post('/', authRequired, async (req, res) => {
  try {
    const c = await Complaint.create(req.body);
    
    // Send notification about new complaint (temporarily disabled)
    // try {
    //   await notificationService.notifyNewComplaint(c);
    // } catch (notificationError) {
    //   console.error('Error sending notification:', notificationError);
    // }
    
    res.status(201).json(c);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

router.patch('/:id', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN','STAFF'), async (req, res) => {
  const c = await Complaint.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(c);
});
