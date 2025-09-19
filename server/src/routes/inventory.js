import { Router } from 'express';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { InventoryItem } from '../models/InventoryItem.js';

export const router = Router();

router.get('/', authRequired, async (req, res) => {
  const { propertyId } = req.query;
  const q = propertyId ? { propertyId } : {};
  const items = await InventoryItem.find(q).sort({ name: 1 });
  res.json(items);
});

router.post('/', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN','STAFF'), async (req, res) => {
  const item = await InventoryItem.create(req.body);
  res.status(201).json(item);
});

router.patch('/:id/adjust', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN','STAFF'), async (req, res) => {
  try {
    const { delta } = req.body;
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    const newQuantity = (item.quantity || 0) + Number(delta || 0);
    
    // Prevent negative quantities
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Cannot reduce quantity below zero' });
    }
    
    item.quantity = newQuantity;
    item.lastUpdated = new Date();
    await item.save();
    res.json(item);
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});
