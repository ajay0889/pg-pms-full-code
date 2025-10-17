import serverless from 'serverless-http';
import dotenv from 'dotenv'; dotenv.config();
import app from '../src/app.js';
import { connectToDatabase } from '../src/db.js';

let handler;

export default async function vercelHandler(req, res) {
  try {
    await connectToDatabase();
    if (!handler) {
      handler = serverless(app, { requestId: 'x-request-id' });
    }
    return handler(req, res);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};


