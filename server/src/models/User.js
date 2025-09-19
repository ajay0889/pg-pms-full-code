import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['SUPER_ADMIN','PROPERTY_ADMIN','STAFF','TENANT'], default: 'TENANT' },
  propertyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }
}, { timestamps: true });

// Indexes for performance (email already indexed via unique: true)
UserSchema.index({ role: 1 });
UserSchema.index({ propertyIds: 1 });
UserSchema.index({ createdAt: -1 });

export const User = mongoose.model('User', UserSchema);
