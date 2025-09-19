import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { Property } from '../models/Property.js';
import { Room } from '../models/Room.js';
import { Tenant } from '../models/Tenant.js';
import { Payment } from '../models/Payment.js';
import { Complaint } from '../models/Complaint.js';
import { InventoryItem } from '../models/InventoryItem.js';
import cache from '../utils/cache.js';

export const router = Router();

// Dashboard overview analytics
router.get('/dashboard', authRequired, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const cacheKey = `dashboard:${propertyId || 'all'}`;
    
    // Try to get from cache first (cache for 2 minutes)
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const filter = propertyId ? { propertyId } : {};

    // Get current date info
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const startOfLastMonth = new Date(currentYear, currentMonth - 2, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth - 1, 0);

    // Execute all queries in parallel for better performance
    const [
      totalProperties,
      totalRooms,
      occupiedRooms,
      vacantRooms,
      maintenanceRooms,
      totalTenants,
      thisMonthPayments,
      lastMonthPayments,
      pendingComplaints,
      resolvedComplaints,
      lowStockItems
    ] = await Promise.all([
      // Property stats
      propertyId ? 1 : Property.countDocuments(),
      
      // Room stats
      Room.countDocuments(filter),
      Room.countDocuments({ ...filter, status: 'OCCUPIED' }),
      Room.countDocuments({ ...filter, status: 'VACANT' }),
      Room.countDocuments({ ...filter, status: 'MAINTENANCE' }),
      
      // Tenant stats
      Tenant.countDocuments(filter),
      
      // Payment stats
      Payment.aggregate([
        {
          $match: {
            ...filter,
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalCount: { $sum: 1 }
          }
        }
      ]),
      
      Payment.aggregate([
        {
          $match: {
            ...filter,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalCount: { $sum: 1 }
          }
        }
      ]),
      
      // Complaint stats
      Complaint.countDocuments({ ...filter, status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
      Complaint.countDocuments({ ...filter, status: 'RESOLVED' }),
      
      // Inventory stats
      InventoryItem.countDocuments({
        ...filter,
        $expr: { $lte: ['$quantity', '$minQuantity'] }
      })
    ]);

    // Calculate occupancy rate
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Payment comparison
    const thisMonthTotal = thisMonthPayments[0]?.totalAmount || 0;
    const lastMonthTotal = lastMonthPayments[0]?.totalAmount || 0;
    const paymentGrowth = lastMonthTotal > 0 
      ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : 0;

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const [recentPayments, recentComplaints, recentTenants] = await Promise.all([
      Payment.find({ ...filter, createdAt: { $gte: sevenDaysAgo } })
        .populate('tenantId', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
      
      Complaint.find({ ...filter, createdAt: { $gte: sevenDaysAgo } })
        .populate('tenantId', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
      
      Tenant.find({ ...filter, createdAt: { $gte: sevenDaysAgo } })
        .populate('roomId', 'number')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const result = {
      overview: {
        totalProperties,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        maintenanceRooms,
        totalTenants,
        occupancyRate,
        pendingComplaints,
        resolvedComplaints,
        lowStockItems
      },
      revenue: {
        thisMonth: thisMonthTotal,
        lastMonth: lastMonthTotal,
        growth: paymentGrowth,
        thisMonthCount: thisMonthPayments[0]?.totalCount || 0
      },
      recentActivity: {
        payments: recentPayments,
        complaints: recentComplaints,
        tenants: recentTenants
      }
    };

    // Cache the result for 2 minutes
    cache.set(cacheKey, result, 120);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Monthly revenue chart data
router.get('/revenue-chart', authRequired, async (req, res) => {
  try {
    const { propertyId, months = 6 } = req.query;
    const filter = propertyId ? { propertyId } : {};
    
    const monthsBack = parseInt(months);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);

    const revenueData = await Payment.aggregate([
      {
        $match: {
          ...filter,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalRevenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Fill in missing months with zero values
    const chartData = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const existingData = revenueData.find(d => d._id.year === year && d._id.month === month);
      
      chartData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: existingData?.totalRevenue || 0,
        payments: existingData?.paymentCount || 0
      });
    }

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching revenue chart data:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

// Room status distribution
router.get('/room-distribution', authRequired, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const filter = propertyId ? { propertyId } : {};

    const distribution = await Room.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      OCCUPIED: 0,
      VACANT: 0,
      MAINTENANCE: 0
    };

    distribution.forEach(item => {
      result[item._id] = item.count;
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching room distribution:', error);
    res.status(500).json({ error: 'Failed to fetch room distribution' });
  }
});

// Financial report
router.get('/financial-report', authRequired, async (req, res) => {
  try {
    const { propertyId, startDate, endDate, type } = req.query;
    
    const filter = {};
    if (propertyId) filter.propertyId = propertyId;
    if (type) filter.type = type;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [payments, summary] = await Promise.all([
      Payment.find(filter)
        .populate('tenantId', 'name phone')
        .populate('propertyId', 'name code')
        .sort({ createdAt: -1 }),
      
      Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        }
      ])
    ]);

    const totalRevenue = summary.reduce((sum, item) => sum + item.totalAmount, 0);
    
    res.json({
      payments,
      summary: {
        totalRevenue,
        totalTransactions: payments.length,
        byType: summary,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
});

// Occupancy report
router.get('/occupancy-report', authRequired, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const filter = propertyId ? { propertyId } : {};

    const [rooms, tenants] = await Promise.all([
      Room.find(filter).populate('propertyId', 'name code').populate('tenantId', 'name phone leaseStart leaseEnd'),
      Tenant.find(filter).populate('roomId', 'number type').populate('propertyId', 'name code')
    ]);

    // Calculate occupancy statistics
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
    const vacantRooms = rooms.filter(r => r.status === 'VACANT').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Group by room type
    const roomsByType = rooms.reduce((acc, room) => {
      if (!acc[room.type]) {
        acc[room.type] = { total: 0, occupied: 0, vacant: 0, maintenance: 0 };
      }
      acc[room.type].total++;
      acc[room.type][room.status.toLowerCase()]++;
      return acc;
    }, {});

    res.json({
      summary: {
        totalRooms,
        occupiedRooms,
        vacantRooms,
        maintenanceRooms,
        occupancyRate: Math.round(occupancyRate * 100) / 100
      },
      roomsByType,
      rooms: rooms.map(room => ({
        ...room.toObject(),
        tenant: room.tenantId
      })),
      tenants: tenants.filter(t => t.roomId) // Only tenants with assigned rooms
    });
  } catch (error) {
    console.error('Error generating occupancy report:', error);
    res.status(500).json({ error: 'Failed to generate occupancy report' });
  }
});

// Maintenance report
router.get('/maintenance-report', authRequired, async (req, res) => {
  try {
    const { propertyId, status, category } = req.query;
    
    const filter = {};
    if (propertyId) filter.propertyId = propertyId;
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [complaints, summary] = await Promise.all([
      Complaint.find(filter)
        .populate('tenantId', 'name phone')
        .populate('propertyId', 'name code')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 }),
      
      Complaint.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              status: '$status',
              category: '$category'
            },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Process summary data
    const statusSummary = {};
    const categorySummary = {};
    
    summary.forEach(item => {
      // Status summary
      if (!statusSummary[item._id.status]) {
        statusSummary[item._id.status] = 0;
      }
      statusSummary[item._id.status] += item.count;
      
      // Category summary
      if (!categorySummary[item._id.category]) {
        categorySummary[item._id.category] = 0;
      }
      categorySummary[item._id.category] += item.count;
    });

    res.json({
      complaints,
      summary: {
        total: complaints.length,
        byStatus: statusSummary,
        byCategory: categorySummary
      }
    });
  } catch (error) {
    console.error('Error generating maintenance report:', error);
    res.status(500).json({ error: 'Failed to generate maintenance report' });
  }
});
