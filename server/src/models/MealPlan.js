import mongoose from 'mongoose';
const MealPlanSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  date: { type: Date, required: true },
  meals: [{
    type: { type: String, enum: ['BREAKFAST','LUNCH','DINNER'], required: true },
    items: [{ name: String, quantity: Number, unit: String }]
  }]
}, { timestamps: true });
MealPlanSchema.index({ propertyId: 1, date: 1 }, { unique: true });
export const MealPlan = mongoose.model('MealPlan', MealPlanSchema);
