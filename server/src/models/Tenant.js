import mongoose from 'mongoose';
const PaymentHistorySchema = new mongoose.Schema({
  date: Date, amount: Number, method: String, reference: String
}, { _id: false });
const TenantSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  idProofType: String,
  idProofUrl: String,
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  leaseStart: Date, leaseEnd: Date,
  securityDeposit: { type: Number, default: 0 },
  monthlyRent: { type: Number, required: true },
  foodPlan: { type: String, enum: ['WEEKDAY_2','WEEKEND_3','NONE'], default: 'WEEKDAY_2' },
  paymentHistory: [PaymentHistorySchema]
}, { timestamps: true });

// Indexes for performance
TenantSchema.index({ propertyId: 1 });
TenantSchema.index({ roomId: 1 });
TenantSchema.index({ phone: 1 });
TenantSchema.index({ email: 1 });
TenantSchema.index({ leaseStart: 1, leaseEnd: 1 });
TenantSchema.index({ createdAt: -1 });
TenantSchema.index({ name: 'text', phone: 'text' }); // Text search index
export const Tenant = mongoose.model('Tenant', TenantSchema);
