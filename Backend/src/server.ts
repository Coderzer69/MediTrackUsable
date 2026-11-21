import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import patientRoutes from './routes/patientRoutes';
import doctorRoutes from './routes/doctorRoutes';
import prisma from './utils/prisma';
import { getStoredFile } from './utils/fileStore';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Refusing to start without it.');
  process.exit(1);
}

// Browser origins allowed to call the API. CORS_ORIGINS is a comma-separated list
// (e.g. the deployed frontend and admin URLs). Local dev ports are always allowed
// outside production.
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
);
if (!isProduction || allowedOrigins.size === 0) {
  ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'].forEach((o) =>
    allowedOrigins.add(o),
  );
}

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows cross-origin loading of uploaded documents/images
}));
app.set('trust proxy', 1); // behind Render's proxy
app.use(cors({
  origin: (origin, cb) => {
    // Requests without an Origin header (curl, server-to-server, same-origin) are allowed.
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public uploads (doctor verification files and avatars).
// Patient medical records are NOT stored here: they live in private-uploads/
// and are only reachable through the authenticated /api/.../documents routes.
// (The old fallback that returned a different doctor's licence file for any
// missing "license" URL has been removed - it exposed other people's documents.)
// Files are stored in the database (StoredFile); the local folder is only a
// fallback for files that existed before database storage.
app.get('/uploads/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = path.basename(String(req.params.name));
    const stored = await getStoredFile(name);
    if (!stored) return next();
    res.setHeader('Content-Type', stored.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.end(Buffer.from(stored.data));
  } catch (err) {
    return next(err);
  }
});
app.use('/uploads', express.static(uploadsDir));

// Root and Health Endpoints
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'MediTrack Backend API',
    status: 'online',
    message: 'MediTrack API is running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      admin: '/api/admin',
      patient: '/api/patient',
      doctor: '/api/doctor',
      uploads: '/uploads',
    },
  });
});

// Liveness check (used by Render). Does not touch the database, so frequent
// probes don't keep the serverless database awake.
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness check including the database connection.
app.get('/health/db', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable', timestamp: new Date().toISOString() });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    // Don't leak internal error details in production.
    error: status < 500 || !isProduction ? (err.message || 'Internal Server Error') : 'Internal Server Error',
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Start the server for standalone runtimes (local dev, Render, Railway, Docker, etc.)
// When deployed on Vercel, Vercel exports the Express app as a serverless function.
if (!process.env.VERCEL) {
  const server = app.listen(port, host, (err?: Error) => {
    if (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Stop the other process using it (another MediTrack backend?) and try again.`);
      } else {
        console.error('Failed to start server:', err);
      }
      process.exit(1);
    }
    console.log(`Server is running on ${host}:${port}`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error('Server error:', err.code === 'EADDRINUSE' ? `Port ${port} is already in use.` : err);
    process.exit(1);
  });
}

export default app;

