import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['payment', 'complaint', 'tenant', 'room', 'system', 'reminder'], 
    default: 'system' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  read: { type: Boolean, default: false },
  actionUrl: { type: String }, // Optional URL to navigate to
  metadata: { type: mongoose.Schema.Types.Mixed }, // Additional data
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' }
}, { timestamps: true });

// Indexes for performance
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ read: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ priority: 1 });
NotificationSchema.index({ propertyId: 1 });

export const Notification = mongoose.model('Notification', NotificationSchema);
