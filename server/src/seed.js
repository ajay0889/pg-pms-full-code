import dotenv from 'dotenv'; dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Property } from './models/Property.js';
import { User } from './models/User.js';
import { Room } from './models/Room.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pg_pms';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Seeding sample data...');
  const prop = await Property.create({
    name: 'FLY PG Sector 61',
    code: 'FLY61',
    address: '51, Block C, Sector 61, Noida, Uttar Pradesh 201301',
    city: 'Noida', state: 'UP', country: 'India', pincode: '201301'
  });
  await User.create({
    name: 'Super Admin',
    email: 'admin@example.com',
    phone: '9999999999',
    passwordHash: await bcrypt.hash('admin123', 10),
    role: 'SUPER_ADMIN',
    propertyIds: [prop._id]
  });
  for (let i=1;i<=16;i++) {
    await Room.create({
      propertyId: prop._id,
      number: String(i).padStart(2,'0'),
      type: i<=4?'SINGLE':(i<=12?'DOUBLE':'DORM'),
      rent: i<=4?12000:(i<=12?9000:7000),
      status: 'VACANT'
    });
  }
  console.log('Seed complete. Admin: admin@example.com / admin123');
  process.exit(0);
}
run().catch(e=>{ console.error(e); process.exit(1); });
