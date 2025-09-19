import { Router } from 'express';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { MealPlan } from '../models/MealPlan.js';
import { InventoryItem } from '../models/InventoryItem.js';

export const router = Router();

router.get('/', authRequired, async (req, res) => {
  const { propertyId, date } = req.query;
  const q = {};
  if (propertyId) q.propertyId = propertyId;
  if (date) q.date = new Date(date);
  const plans = await MealPlan.find(q).sort({ date: -1 });
  res.json(plans);
});

router.post('/', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN','STAFF'), async (req, res) => {
  const plan = await MealPlan.create(req.body);
  res.status(201).json(plan);
});

router.post('/apply-usage', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN'), async (req, res) => {
  try {
    const { mealPlanId } = req.body;
    const plan = await MealPlan.findById(mealPlanId);
    if (!plan) return res.status(404).json({ error: 'Meal plan not found' });
    
    const insufficientItems = [];
    const missingItems = [];
    
    // First, check if we have enough inventory for all items
    for (const meal of (plan.meals || [])) {
      for (const it of (meal.items || [])) {
        // Try to find inventory item with case-insensitive search
        const inv = await InventoryItem.findOne({ 
          propertyId: plan.propertyId, 
          name: { $regex: new RegExp(`^${it.name}$`, 'i') }
        });
        
        if (!inv) {
          missingItems.push(it.name);
        } else {
          // Convert units if needed (simplified conversion)
          let requiredQuantity = it.quantity || 0;
          let availableQuantity = inv.quantity || 0;
          
          // Simple unit conversion (kg to g, l to ml)
          if (it.unit === 'g' && inv.unit === 'kg') {
            requiredQuantity = requiredQuantity / 1000;
          } else if (it.unit === 'kg' && inv.unit === 'g') {
            requiredQuantity = requiredQuantity * 1000;
          } else if (it.unit === 'ml' && inv.unit === 'l') {
            requiredQuantity = requiredQuantity / 1000;
          } else if (it.unit === 'l' && inv.unit === 'ml') {
            requiredQuantity = requiredQuantity * 1000;
          }
          
          if (availableQuantity < requiredQuantity) {
            insufficientItems.push(`${it.name} (need ${it.quantity}${it.unit}, have ${inv.quantity}${inv.unit})`);
          }
        }
      }
    }
    
    // Check if we should create missing items or return error
    if (missingItems.length > 0) {
      return res.status(400).json({ 
        error: 'Some items not found in inventory. Please add them first.', 
        missingItems: missingItems,
        suggestion: 'Go to Inventory page and add these items before applying meal usage.'
      });
    }
    
    if (insufficientItems.length > 0) {
      return res.status(400).json({ 
        error: 'Insufficient inventory', 
        items: insufficientItems,
        suggestion: 'Please restock these items in your inventory.'
      });
    }
    
    // Apply the usage if all items are available
    let appliedItems = [];
    for (const meal of (plan.meals || [])) {
      for (const it of (meal.items || [])) {
        const inv = await InventoryItem.findOne({ 
          propertyId: plan.propertyId, 
          name: { $regex: new RegExp(`^${it.name}$`, 'i') }
        });
        
        if (inv) {
          // Convert units if needed
          let deductQuantity = it.quantity || 0;
          if (it.unit === 'g' && inv.unit === 'kg') {
            deductQuantity = deductQuantity / 1000;
          } else if (it.unit === 'kg' && inv.unit === 'g') {
            deductQuantity = deductQuantity * 1000;
          } else if (it.unit === 'ml' && inv.unit === 'l') {
            deductQuantity = deductQuantity / 1000;
          } else if (it.unit === 'l' && inv.unit === 'ml') {
            deductQuantity = deductQuantity * 1000;
          }
          
          const oldQuantity = inv.quantity;
          inv.quantity = Math.max(0, (inv.quantity || 0) - deductQuantity);
          inv.lastUpdated = new Date();
          await inv.save();
          
          appliedItems.push(`${it.name}: ${oldQuantity}${inv.unit} → ${inv.quantity}${inv.unit}`);
        }
      }
    }
    
    res.json({ 
      ok: true, 
      message: 'Meal plan usage applied successfully',
      appliedItems: appliedItems
    });
  } catch (error) {
    console.error('Error applying meal usage:', error);
    res.status(500).json({ error: 'Failed to apply meal usage' });
  }
});
