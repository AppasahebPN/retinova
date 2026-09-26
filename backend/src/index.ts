import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import apiRoutes from './routes/apiRoutes';
import { errorHandler } from './middleware/errorHandler';
import { ensureDirectoryExists, initializeSampleImages } from './utils/imageGenerator';
import { seedDatabase } from './db/seedData';

const app = express();

// Middleware
// Hardened CORS Configuration:
// - Wildcard '*' is restricted in production
// - credentials: false (Application strictly uses Bearer header tokens, not cookies)
const configuredOrigin = config.corsOrigin;
let corsOrigin: boolean | string | RegExp | (string | RegExp)[] = configuredOrigin;

if (configuredOrigin === '*') {
  if (config.nodeEnv === 'production') {
    console.warn('[SECURITY WARNING] Wildcard CORS (*) disallowed in production. Restricting origin.');
    corsOrigin = false;
  } else {
    corsOrigin = '*';
  }
} else if (configuredOrigin && configuredOrigin.includes(',')) {
  corsOrigin = configuredOrigin.split(',').map(o => o.trim());
}

app.use(cors({
  origin: corsOrigin,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directory exists and sample fundus/GradCAM visual assets are initialized
ensureDirectoryExists(config.storagePath);
initializeSampleImages(config.storagePath);

// Serve static images / uploads
app.use('/uploads', express.static(config.storagePath));

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// -- RETINOVA SPA Frontend Serving --
// Serve the mobile-app production web build (Expo export).
// The path is configurable via RETINOVA_WEB_DIST env var,
const candidateLocalDist = path.resolve(__dirname, '../../mobile-app/dist');
const candidateOldDist = path.resolve(__dirname, '../../../../mobile-app/dist');
const defaultDist = fs.existsSync(candidateLocalDist) ? candidateLocalDist : candidateOldDist;
const webDistPath = process.env.RETINOVA_WEB_DIST || defaultDist;

if (fs.existsSync(webDistPath)) {
  console.log(`[WEB] Serving RETINOVA frontend from: ${webDistPath}`);

  // Serve static assets (JS, CSS, images, fonts, _expo directory)
  app.use(express.static(webDistPath, {
    maxAge: '1d',
    index: false  // We handle index.html via the SPA fallback below
  }));

  // SPA fallback: any GET request that is NOT /api/* or /uploads/*
  // gets the index.html so client-side routing works.
  app.get('*', (req, res, next) => {
    // Never intercept API or upload routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    const indexPath = path.join(webDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return next();
  });

  console.log('[WEB] SPA fallback enabled for client-side routing');
} else {
  console.log(`[WEB] No frontend dist found at: ${webDistPath} (API-only mode)`);
}

// Seed database with realistic rural screening data on startup
seedDatabase(false);

const server = app.listen(config.port, () => {
  console.log(`
  =============================================================
   RETINOVA -- Explainable DR Screening Backend API
  -------------------------------------------------------------
   Status:        Online & Ready
   Port:          ${config.port}
   Database:      PostgreSQL / DataStore Engine Active
   AI Pipeline:   ${config.aiServiceType.toUpperCase()} Engine (${config.aiServiceType === 'matlab' ? config.matlabAiServiceUrl : 'Model-Agnostic Heuristic Mock'})
   Simulink Sim:  ${config.simulationServiceType.toUpperCase()} SimEvents Engine
   File Storage:  ${config.storagePath}
   Web Frontend:  ${fs.existsSync(webDistPath) ? webDistPath : 'Not served (API-only)'}
  =============================================================
  `);
});

export default app;