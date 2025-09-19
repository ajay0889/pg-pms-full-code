import mongoose from 'mongoose';
const PaymentSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  type: { type: String, enum: ['RENT','FOOD','DEPOSIT','OTHER'], required: true },
  amount: { type: Number, required: true },
  periodMonth: Number, periodYear: Number,
  method: { type: String, enum: ['CASH','UPI','CARD','ONLINE'], default: 'CASH' },
  reference: String,
  // NEW FIELDS FOR PROTOCOL COMPLIANCE
  status: { 
    type: String, 
    enum: ['PAID', 'UNPAID', 'OVERDUE'], 
    default: 'UNPAID' 
  },
  isLocked: { 
    type: Boolean, 
    default: false 
  }, // For security deposit locking
  datePaid: { type: Date } // When payment was marked as paid
}, { timestamps: true });

// Indexes for performance
PaymentSchema.index({ propertyId: 1 });
PaymentSchema.index({ tenantId: 1 });
PaymentSchema.index({ type: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ periodMonth: 1, periodYear: 1 });
PaymentSchema.index({ propertyId: 1, createdAt: -1 }); // Compound index for property-based queries
export const Payment = mongoose.model('Payment', PaymentSchema);
