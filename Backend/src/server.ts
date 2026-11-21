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

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows cross-origin loading of uploaded documents/images
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public uploads (doctor verification files and avatars).
// Patient medical records are NOT stored here: they live in private-uploads/
// and are only reachable through the authenticated /api/.../documents routes.
// (The old fallback that returned a different doctor's licence file for any
// missing "license" URL has been removed - it exposed other people's documents.)
app.use('/uploads', express.static(uploadsDir));

// Root and Health Endpoints
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'MediTrack Backend API',
    status: 'online',
    port: Number(port),
    message: 'Backend is working finely on localhost:' + port,
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

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
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
  const server = app.listen(port, (err?: Error) => {
    if (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Stop the other process using it (another MediTrack backend?) and try again.`);
      } else {
        console.error('Failed to start server:', err);
      }
      process.exit(1);
    }
    console.log(`Server is running on port ${port} (http://localhost:${port})`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error('Server error:', err.code === 'EADDRINUSE' ? `Port ${port} is already in use.` : err);
    process.exit(1);
  });
}

export default app;

