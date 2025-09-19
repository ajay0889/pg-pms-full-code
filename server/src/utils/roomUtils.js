import { Tenant } from '../models/Tenant.js';

// Get room capacity based on type and custom capacity
export function getRoomCapacity(roomType, customCapacity = null) {
  switch(roomType) {
    case 'SINGLE': return 1;
    case 'DOUBLE': return 2;
    case 'TRIPLE': return 3;
    case 'DORM': return customCapacity || 4; // Use custom capacity if provided
    default: return 2;
  }
}

// Get current occupancy of a room
export async function getCurrentOccupancy(roomId) {
  try {
    const tenantsInRoom = await Tenant.countDocuments({ roomId: roomId });
    return tenantsInRoom;
  } catch (error) {
    console.error('Error getting room occupancy:', error);
    return 0;
  }
}

// Check if room has available space
export async function hasAvailableSpace(room) {
  try {
    const currentOccupancy = await getCurrentOccupancy(room._id);
    const maxCapacity = getRoomCapacity(room.type, room.customCapacity);
    return currentOccupancy < maxCapacity && room.status !== 'MAINTENANCE';
  } catch (error) {
    console.error('Error checking room availability:', error);
    return false;
  }
}

// Get room status based on occupancy
export async function getRoomStatus(room) {
  try {
    const currentOccupancy = await getCurrentOccupancy(room._id);
    const maxCapacity = getRoomCapacity(room.type, room.customCapacity);
    
    if (room.status === 'MAINTENANCE') {
      return 'MAINTENANCE';
    }
    
    if (currentOccupancy === 0) {
      return 'VACANT';
    } else if (currentOccupancy >= maxCapacity) {
      return 'FULLY_OCCUPIED';
    } else {
      return 'PARTIALLY_OCCUPIED';
    }
  } catch (error) {
    console.error('Error getting room status:', error);
    return room.status || 'VACANT';
  }
}

// Update room status after tenant changes
export async function updateRoomStatus(roomId) {
  try {
    const { Room } = await import('../models/Room.js');
    const room = await Room.findById(roomId);
    if (!room) return;
    
    const newStatus = await getRoomStatus(room);
    const currentOccupancy = await getCurrentOccupancy(roomId);
    
    await Room.findByIdAndUpdate(roomId, {
      status: newStatus,
      currentOccupancy: currentOccupancy,
      maxCapacity: getRoomCapacity(room.type, room.customCapacity)
    });
    
    return { status: newStatus, occupancy: currentOccupancy };
  } catch (error) {
    console.error('Error updating room status:', error);
    return null;
  }
}
