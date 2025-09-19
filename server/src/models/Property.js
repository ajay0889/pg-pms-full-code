import mongoose from 'mongoose';
const PropertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  city: String, state: String, country: String, pincode: String
}, { timestamps: true });
export const Property = mongoose.model('Property', PropertySchema);
