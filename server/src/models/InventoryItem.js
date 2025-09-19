import mongoose from 'mongoose';
const InventoryItemSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  name: { type: String, required: true },
  unit: { type: String, enum: ['kg','g','l','ml','pcs'], default: 'kg' },
  quantity: { type: Number, default: 0 },
  minQuantity: { type: Number, default: 0 },
  pricePerUnit: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });
InventoryItemSchema.index({ propertyId: 1, name: 1 }, { unique: true });
export const InventoryItem = mongoose.model('InventoryItem', InventoryItemSchema);
