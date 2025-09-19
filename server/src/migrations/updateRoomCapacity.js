import dotenv from 'dotenv'; dotenv.config();
import mongoose from 'mongoose';
import { Room } from '../models/Room.js';
import { Tenant } from '../models/Tenant.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pg_pms';

async function updateRoomCapacity() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all rooms
    const rooms = await Room.find({});
    console.log(`Found ${rooms.length} rooms to update`);

    for (const room of rooms) {
      // Set max capacity based on room type
      const maxCapacity = 
        room.type === 'SINGLE' ? 1 :
        room.type === 'DOUBLE' ? 2 :
        room.type === 'TRIPLE' ? 3 : 4;

      // Count current tenants in this room
      const tenantsInRoom = await Tenant.find({ roomId: room._id });
      const currentOccupancy = tenantsInRoom.length;

      // Determine new status
      let newStatus = 'VACANT';
      if (currentOccupancy >= maxCapacity) {
        newStatus = 'FULLY_OCCUPIED';
      } else if (currentOccupancy > 0) {
        newStatus = 'PARTIALLY_OCCUPIED';
      }

      // Update room with new fields
      await Room.findByIdAndUpdate(room._id, {
        maxCapacity: maxCapacity,
        currentOccupancy: currentOccupancy,
        status: newStatus,
        tenantIds: tenantsInRoom.map(t => t._id)
      });

      console.log(`Updated Room ${room.number}: ${currentOccupancy}/${maxCapacity} - ${newStatus}`);
    }

    console.log('Room capacity update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating room capacity:', error);
    process.exit(1);
  }
}

updateRoomCapacity();
