import mongoose from 'mongoose';
const ComplaintSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  category: { type: String, enum: ['ELECTRICAL','PLUMBING','CLEANING','SECURITY','OTHER'], default: 'OTHER' },
  description: { type: String, required: true },
  status: { type: String, enum: ['OPEN','IN_PROGRESS','RESOLVED','CLOSED'], default: 'OPEN' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes for performance
ComplaintSchema.index({ propertyId: 1 });
ComplaintSchema.index({ tenantId: 1 });
ComplaintSchema.index({ status: 1 });
ComplaintSchema.index({ category: 1 });
ComplaintSchema.index({ createdAt: -1 });
ComplaintSchema.index({ propertyId: 1, status: 1 }); // Compound index for property-status queries
export const Complaint = mongoose.model('Complaint', ComplaintSchema);
