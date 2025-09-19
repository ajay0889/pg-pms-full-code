import { Router } from 'express';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { Room } from '../models/Room.js';
import { Tenant } from '../models/Tenant.js';
import { Payment } from '../models/Payment.js';

export const router = Router();

// Get monthly rent status for all rooms (Protocol Requirement)
router.get('/monthly-status', authRequired, async (req, res) => {
  try {
    const { propertyId, month, year } = req.query;
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    const currentYear = parseInt(year) || new Date().getFullYear();
    
    const filter = propertyId ? { propertyId } : {};
    const rooms = await Room.find(filter).populate('propertyId', 'name code');
    
    const roomPaymentStatus = [];
    
    for (const room of rooms) {
      const tenants = await Tenant.find({ roomId: room._id });
      const rentPayments = await Payment.find({
        roomId: room._id,
        type: 'RENT',
        periodMonth: currentMonth,
        periodYear: currentYear
      });
      
      const totalExpectedRent = room.rent;
      const totalPaidRent = rentPayments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const paymentPercentage = totalExpectedRent > 0 
        ? (totalPaidRent / totalExpectedRent) * 100 
        : 0;
      
      roomPaymentStatus.push({
        room: {
          id: room._id,
          number: room.number,
          type: room.type,
          totalRent: totalExpectedRent,
          rentPerTenant: room.rentPerTenant,
          currentOccupancy: room.currentOccupancy || 0,
          maxCapacity: room.maxCapacity || 0
        },
        tenants: tenants.map(tenant => {
          const tenantPayment = rentPayments.find(p => 
            p.tenantId.toString() === tenant._id.toString()
          );
          return {
            id: tenant._id,
            name: tenant.name,
            phone: tenant.phone,
            expectedAmount: room.rentPerTenant, // Use calculated rent per tenant
            status: tenantPayment?.status || 'UNPAID',
            paidAmount: tenantPayment?.amount || 0,
            paymentId: tenantPayment?._id,
            datePaid: tenantPayment?.datePaid
          };
        }),
        summary: {
          totalExpected: totalExpectedRent,
          totalPaid: totalPaidRent,
          percentage: Math.round(paymentPercentage),
          status: paymentPercentage === 100 ? 'COMPLETE' : 
                  paymentPercentage > 0 ? 'PARTIAL' : 'UNPAID'
        }
      });
    }
    
    res.json({
      month: currentMonth,
      year: currentYear,
      rooms: roomPaymentStatus,
      summary: {
        totalRooms: roomPaymentStatus.length,
        fullyPaidRooms: roomPaymentStatus.filter(r => r.summary.status === 'COMPLETE').length,
        partiallyPaidRooms: roomPaymentStatus.filter(r => r.summary.status === 'PARTIAL').length,
        unpaidRooms: roomPaymentStatus.filter(r => r.summary.status === 'UNPAID').length
      }
    });
  } catch (error) {
    console.error('Error fetching monthly rent status:', error);
    res.status(500).json({ error: 'Failed to fetch rent status' });
  }
});

// Mark payment as paid (Protocol Requirement)
router.patch('/payment/:paymentId/mark-paid', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN','STAFF'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    if (payment.isLocked) {
      return res.status(400).json({ error: 'Payment is locked and cannot be modified' });
    }
    
    // Update payment status
    payment.status = 'PAID';
    payment.datePaid = new Date();
    
    // Lock security deposit payments once paid (Protocol Requirement)
    if (payment.type === 'DEPOSIT') {
      payment.isLocked = true;
    }
    
    await payment.save();
    res.json(payment);
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Mark payment as unpaid
router.patch('/payment/:paymentId/mark-unpaid', authRequired, requireRoles('SUPER_ADMIN','PROPERTY_ADMIN','STAFF'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    if (payment.isLocked) {
      return res.status(400).json({ error: 'Payment is locked and cannot be modified' });
    }
    
    // Update payment status
    payment.status = 'UNPAID';
    payment.datePaid = null;
    
    await payment.save();
    res.json(payment);
  } catch (error) {
    console.error('Error marking payment as unpaid:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Create initial payments for new tenant (Protocol Requirement)
export async function createInitialPayments(tenant, room) {
  try {
    const payments = [];
    
    // 1. Create Security Deposit payment (unpaid, unlocked)
    if (tenant.securityDeposit > 0) {
      const depositPayment = await Payment.create({
        propertyId: tenant.propertyId,
        tenantId: tenant._id,
        roomId: tenant.roomId,
        type: 'DEPOSIT',
        amount: tenant.securityDeposit,
        status: 'UNPAID',
        isLocked: false
      });
      payments.push(depositPayment);
    }
    
    // 2. Create First Month's Rent payment (unpaid)
    const currentDate = new Date();
    const rentPayment = await Payment.create({
      propertyId: tenant.propertyId,
      tenantId: tenant._id,
      roomId: tenant.roomId,
      type: 'RENT',
      amount: room.rentPerTenant, // Use calculated rent per tenant
      periodMonth: currentDate.getMonth() + 1,
      periodYear: currentDate.getFullYear(),
      status: 'UNPAID'
    });
    payments.push(rentPayment);
    
    return payments;
  } catch (error) {
    console.error('Error creating initial payments:', error);
    throw error;
  }
}
