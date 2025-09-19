import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';
import { paginate, parsePaginationParams } from '../utils/pagination.js';

export const router = Router();

// Get notifications for current user
router.get('/', authRequired, async (req, res) => {
  try {
    const { read, type } = req.query;
    const paginationOptions = parsePaginationParams(req.query);
    
    const filter = { userId: req.user.id };
    if (read !== undefined) filter.read = read === 'true';
    if (type) filter.type = type;
    
    const query = Notification.find(filter).sort({ createdAt: -1 });
    const result = await paginate(query, paginationOptions);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', authRequired, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authRequired, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Delete notification
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get notification counts
router.get('/counts', authRequired, async (req, res) => {
  try {
    const [total, unread, byType] = await Promise.all([
      Notification.countDocuments({ userId: req.user.id }),
      Notification.countDocuments({ userId: req.user.id, read: false }),
      Notification.aggregate([
        { $match: { userId: req.user.id } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);
    
    const typeCounts = {};
    byType.forEach(item => {
      typeCounts[item._id] = item.count;
    });
    
    res.json({
      total,
      unread,
      byType: typeCounts
    });
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});
