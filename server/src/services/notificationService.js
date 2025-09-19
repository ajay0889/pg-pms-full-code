import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import emailService from './emailService.js';

class NotificationService {
  
  // Create a notification for specific users
  async createNotification(data) {
    try {
      const notification = await Notification.create(data);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create notifications for multiple users
  async createBulkNotifications(users, notificationData) {
    try {
      const notifications = users.map(userId => ({
        ...notificationData,
        userId
      }));
      
      const result = await Notification.insertMany(notifications);
      return result;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Get all admins and property managers for a property
  async getPropertyManagers(propertyId) {
    try {
      const users = await User.find({
        $or: [
          { role: 'SUPER_ADMIN' },
          { role: 'PROPERTY_ADMIN', propertyIds: propertyId }
        ]
      }).select('_id email name');
      
      return users;
    } catch (error) {
      console.error('Error fetching property managers:', error);
      return [];
    }
  }

  // Send both in-app and email notifications
  async sendNotificationWithEmail(users, notificationData, emailType, emailData) {
    try {
      // Create in-app notifications
      const userIds = users.map(user => user._id);
      await this.createBulkNotifications(userIds, notificationData);

      // Send email notifications
      for (const user of users) {
        if (user.email) {
          await emailService.sendNotificationEmail(user.email, emailType, emailData);
        }
      }
    } catch (error) {
      console.error('Error sending notifications with email:', error);
    }
  }

  // Notification templates for different events
  async notifyNewTenant(tenantData) {
    const managers = await this.getPropertyManagers(tenantData.propertyId);
    
    const notificationData = {
      title: 'New Tenant Added',
      message: `${tenantData.name} has been added as a new tenant`,
      type: 'tenant',
      priority: 'medium',
      actionUrl: '/tenants',
      propertyId: tenantData.propertyId,
      metadata: { tenantId: tenantData._id }
    };

    const emailData = {
      tenantName: tenantData.name,
      phone: tenantData.phone,
      propertyName: tenantData.propertyId?.name || 'Property',
      roomNumber: tenantData.roomId?.number,
      monthlyRent: tenantData.monthlyRent,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tenants`
    };

    await this.sendNotificationWithEmail(managers, notificationData, 'newTenant', emailData);
  }

  async notifyPaymentReceived(paymentData) {
    const managers = await this.getPropertyManagers(paymentData.propertyId);
    
    await this.createBulkNotifications(managers, {
      title: 'Payment Received',
      message: `Payment of ₹${paymentData.amount} received for ${paymentData.type}`,
      type: 'payment',
      priority: 'low',
      actionUrl: '/payments',
      propertyId: paymentData.propertyId,
      metadata: { paymentId: paymentData._id }
    });
  }

  async notifyNewComplaint(complaintData) {
    const managers = await this.getPropertyManagers(complaintData.propertyId);
    
    await this.createBulkNotifications(managers, {
      title: 'New Complaint Submitted',
      message: `${complaintData.category} complaint: ${complaintData.description.substring(0, 50)}...`,
      type: 'complaint',
      priority: 'high',
      actionUrl: '/complaints',
      propertyId: complaintData.propertyId,
      metadata: { complaintId: complaintData._id }
    });
  }

  async notifyRoomStatusChange(roomData, oldStatus, newStatus) {
    const managers = await this.getPropertyManagers(roomData.propertyId);
    
    await this.createBulkNotifications(managers, {
      title: 'Room Status Changed',
      message: `Room ${roomData.number} status changed from ${oldStatus} to ${newStatus}`,
      type: 'room',
      priority: 'medium',
      actionUrl: '/rooms',
      propertyId: roomData.propertyId,
      metadata: { roomId: roomData._id }
    });
  }

  async notifyLowInventory(inventoryData) {
    const managers = await this.getPropertyManagers(inventoryData.propertyId);
    
    await this.createBulkNotifications(managers, {
      title: 'Low Inventory Alert',
      message: `${inventoryData.name} is running low (${inventoryData.quantity} ${inventoryData.unit} remaining)`,
      type: 'system',
      priority: 'medium',
      actionUrl: '/inventory',
      propertyId: inventoryData.propertyId,
      metadata: { inventoryId: inventoryData._id }
    });
  }

  async notifyRentDue(tenantData, daysOverdue) {
    const managers = await this.getPropertyManagers(tenantData.propertyId);
    
    await this.createBulkNotifications(managers, {
      title: 'Rent Overdue',
      message: `${tenantData.name}'s rent is ${daysOverdue} days overdue (₹${tenantData.monthlyRent})`,
      type: 'payment',
      priority: 'high',
      actionUrl: '/tenants',
      propertyId: tenantData.propertyId,
      metadata: { tenantId: tenantData._id, daysOverdue }
    });
  }

  async notifyLeaseExpiry(tenantData, daysUntilExpiry) {
    const managers = await this.getPropertyManagers(tenantData.propertyId);
    
    await this.createBulkNotifications(managers, {
      title: 'Lease Expiring Soon',
      message: `${tenantData.name}'s lease expires in ${daysUntilExpiry} days`,
      type: 'reminder',
      priority: 'medium',
      actionUrl: '/tenants',
      propertyId: tenantData.propertyId,
      metadata: { tenantId: tenantData._id, daysUntilExpiry }
    });
  }

  async notifyMaintenanceScheduled(roomData, scheduledDate) {
    const managers = await this.getPropertyManagers(roomData.propertyId);
    
    await this.createBulkNotifications(managers, {
      title: 'Maintenance Scheduled',
      message: `Maintenance scheduled for Room ${roomData.number} on ${scheduledDate}`,
      type: 'system',
      priority: 'medium',
      actionUrl: '/rooms',
      propertyId: roomData.propertyId,
      metadata: { roomId: roomData._id, scheduledDate }
    });
  }

  // Clean up old notifications (older than 30 days)
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        read: true
      });
      
      console.log(`Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      return 0;
    }
  }

  // Get notification statistics
  async getNotificationStats(propertyId) {
    try {
      const filter = propertyId ? { propertyId } : {};
      
      const [totalCount, unreadCount, typeStats, priorityStats] = await Promise.all([
        Notification.countDocuments(filter),
        Notification.countDocuments({ ...filter, read: false }),
        Notification.aggregate([
          { $match: filter },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Notification.aggregate([
          { $match: filter },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ])
      ]);

      return {
        totalCount,
        unreadCount,
        byType: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPriority: priorityStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return null;
    }
  }
}

export default new NotificationService();
