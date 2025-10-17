import serverless from 'serverless-http';
import app from '../server/src/app.js';
import { connectToDatabase } from '../server/src/db.js';

let handler;

export default async function handlerFn(req, res) {
  try {
    await connectToDatabase();
    if (!handler) handler = serverless(app);
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const config = { api: { bodyParser: false } };


