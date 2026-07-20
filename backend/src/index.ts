import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import authRouter from './routes/auth.js';
import catalogRouter from './routes/catalog.js';
import categoriesRouter from './routes/categories.js';
import productsRouter from './routes/products.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';
import timeslotsRouter from './routes/timeslots.js';
import batchesRouter from './routes/batches.js';
import settingsRouter from './routes/settings.js';
import notificationsRouter from './routes/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to verify token
app.get('/api/debug/token', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json({ error: 'No Authorization header', headers: Object.keys(req.headers) });
  }
  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'empanadas-jireh-secreto-2024';
    const decoded = jwt.verify(token, secret);
    return res.json({ valid: true, decoded, secret_source: process.env.JWT_SECRET ? 'env' : 'fallback' });
  } catch (err: any) {
    return res.json({ valid: false, error: err.message, secret_source: process.env.JWT_SECRET ? 'env' : 'fallback' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin/time-slots', timeslotsRouter);
app.use('/api/admin/batches', batchesRouter);
app.use('/api/admin/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);

// In production, serve the frontend SPA from /public
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

export { app };

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
