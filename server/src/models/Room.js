import mongoose from 'mongoose';
const RoomSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  number: { type: String, required: true },
  type: { type: String, enum: ['SINGLE','DOUBLE','TRIPLE','DORM'], default: 'DOUBLE' },
  rent: { type: Number, required: true },
  status: { type: String, enum: ['VACANT','OCCUPIED','PARTIALLY_OCCUPIED','FULLY_OCCUPIED','MAINTENANCE'], default: 'VACANT' },
  // Keep original tenantId for backward compatibility
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  // Add new fields as optional
  currentOccupancy: { type: Number },
  maxCapacity: { type: Number },
  customCapacity: { type: Number } // For DORM type with custom capacity
}, { timestamps: true });

// Add virtual for rent_per_tenant calculation (Protocol Requirement)
RoomSchema.virtual('rentPerTenant').get(function() {
  // CORRECT CALCULATION: divide by room capacity, not current occupancy
  const roomCapacity = this.maxCapacity || this.customCapacity || 
    (this.type === 'SINGLE' ? 1 :
     this.type === 'DOUBLE' ? 2 :
     this.type === 'TRIPLE' ? 3 : 4);
  
  return Math.round(this.rent / roomCapacity);
});

// Ensure virtual fields are serialized
RoomSchema.set('toJSON', { virtuals: true });
RoomSchema.set('toObject', { virtuals: true });

RoomSchema.index({ propertyId: 1, number: 1 }, { unique: true });
export const Room = mongoose.model('Room', RoomSchema);
