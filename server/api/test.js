import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI; // Make sure this matches your Vercel variable name

export default async function handler(req, res) {
  console.log('--- Starting /api/test ---');

  if (!MONGODB_URI) {
    console.error('MONGO_URI is not defined.');
    return res.status(500).json({ error: 'Server configuration error: MONGO_URI is missing.' });
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Shorten timeout for faster failure
    });
    console.log('MongoDB connection successful!');
    
    // Disconnect after successful test
    await mongoose.connection.close();

    return res.status(200).json({ message: 'Successfully connected to the database!' });

  } catch (error) {
    console.error('--- MongoDB Connection Error ---', error);
    return res.status(500).json({ 
        error: 'Failed to connect to the database.',
        details: error.message 
    });
  }
}