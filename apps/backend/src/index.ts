import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import teamRoutes from './routes/teams';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const DEV_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1):(\d{2,5})$/;
const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const isConfiguredOrigin = typeof origin === 'string' && configuredOrigins.includes(origin);

    // Allow non-browser clients (no Origin), local dev frontends, and configured deployed frontends.
    if (!origin || DEV_ORIGIN_RE.test(origin) || isConfiguredOrigin) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'Server is running' });
});

// Database connection test
app.get('/api/db-test', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ 
      status: 'Database connected', 
      userCount 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Task routes
app.use('/api/tasks', taskRoutes);

// Team routes
app.use('/api/teams', teamRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
