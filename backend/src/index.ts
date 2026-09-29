import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import apiRoutes from './routes/apiRoutes';
import { errorHandler } from './middleware/errorHandler';
import { ensureDirectoryExists, initializeSampleImages } from './utils/imageGenerator';
import { seedDatabase } from './db/seedData';
import { initPostgres } from './db/postgres';

const app = express();

// Middleware
// Hardened CORS Configuration:
// - Explicit origins supported via CORS_ORIGINS or CORS_ORIGIN
// - Mobile APKs / curl without Origin header are explicitly allowed
// - credentials: false (Application strictly uses Bearer header tokens, not cookies)
const rawOrigins = config.corsOrigin;
let allowedOrigins: string[] = [];
let allowAll = false;

if (rawOrigins === '*') {
  if (config.nodeEnv === 'production') {
    console.warn('[SECURITY WARNING] Wildcard CORS (*) specified in production environment. For maximum security, configure explicit CORS_ORIGINS.');
  }
  allowAll = true;
} else if (rawOrigins) {
  allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);
}

app.use(cors({
  origin: (origin, callback) => {
    // Mobile applications (Android/iOS APK fetch), curl, and server-to-server requests don't send an Origin header
    if (!origin) return callback(null, true);
    if (allowAll) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow localhost in non-production
    if (config.nodeEnv !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
    return callback(new Error(`Origin ${origin} not permitted by RETINOVA CORS policy`));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id', 'x-organization-id']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directory exists and sample fundus/GradCAM visual assets are initialized
ensureDirectoryExists(config.storagePath);
initializeSampleImages(config.storagePath);

// Serve static images / uploads
app.use('/uploads', express.static(config.storagePath));

// Root health check endpoint for Render and mobile sync manager
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'retinova-backend',
    timestamp: new Date().toISOString(),
    platform: 'Retinova Edge AI Cloud Gateway',
    version: '1.0.4',
  });
});

import { getDashboardHtml } from './dashboard/dashboardHtml';
import { getInstallHtml } from './dashboard/installHtml';
import { getLandingHtml } from './dashboard/landingHtml';

// Public Commercial Landing Page & Product Pitch Portal
app.get(['/', '/landing', '/pitch'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getLandingHtml());
});

// Serve installable Android APK directly for instant over-the-air installation
function getResolvedApkPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'NetraAI_ASHA.apk'),
    path.resolve(process.cwd(), '../mobile-app/NetraAI_ASHA.apk'),
    path.resolve(process.cwd(), 'mobile-app/NetraAI_ASHA.apk'),
    path.resolve(__dirname, './NetraAI_ASHA.apk'),
    path.resolve(__dirname, '../NetraAI_ASHA.apk'),
    path.resolve(__dirname, '../../mobile-app/NetraAI_ASHA.apk'),
    path.resolve(__dirname, '../../../mobile-app/NetraAI_ASHA.apk'),
  ];
  return candidates.find(p => fs.existsSync(p)) || '';
}

app.get(['/download/apk', '/mobile-app/NetraAI_ASHA.apk', '/apk'], (_req, res) => {
  const resolvedApk = getResolvedApkPath();
  if (resolvedApk && fs.existsSync(resolvedApk)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="NetraAI_ASHA_Edge.apk"');
    return res.sendFile(resolvedApk);
  }
  return res.status(404).json({ error: 'APK package not found on server.' });
});

// Installation & Sideloading Portal (with QR Code)
app.get(['/install', '/download'], (req, res) => {
  const host = req.headers.host || req.hostname || 'localhost:5000';
  res.setHeader('Content-Type', 'text/html');
  res.send(getInstallHtml(host, config.port));
});

// Backward-compatible redirect: /app -> /install
app.get('/app', (_req, res) => {
  res.redirect(302, '/install');
});

// Real-Time Cloud Surveillance & Triage Command Center Dashboard
app.get(['/dashboard', '/command-center'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getDashboardHtml());
});

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// -- RETINOVA SPA Frontend Serving --
// Serve the mobile-app production web build (Expo export).
// The path is configurable via RETINOVA_WEB_DIST env var,
const candidatePaths = [
  process.env.RETINOVA_WEB_DIST ? path.resolve(process.cwd(), process.env.RETINOVA_WEB_DIST) : '',
  path.resolve(process.cwd(), '../mobile-app/dist'),
  path.resolve(process.cwd(), 'mobile-app/dist'),
  path.resolve(__dirname, '../../mobile-app/dist'),
  path.resolve(__dirname, '../../../mobile-app/dist'),
].filter(Boolean);
const webDistPath = candidatePaths.find(p => fs.existsSync(p)) || '';

if (webDistPath && fs.existsSync(webDistPath)) {
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

// Initialize PostgreSQL connection pool if configured in environment
initPostgres().catch((err) => {
  console.warn('[RETINOVA] PostgreSQL init error:', err.message);
});

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[RETINOVA] Server started on 0.0.0.0:${config.port}`);
  console.log(`
  =============================================================
   RETINOVA -- Explainable DR Screening Backend API
  -------------------------------------------------------------
   Status:        Online & Ready
   Listen Host:   0.0.0.0 (Render Web Service Compatible)
   Port:          ${config.port}
   Environment:   ${config.nodeEnv}
   Database:      PostgreSQL / DataStore Engine Active
   AI Pipeline:   ${config.aiServiceType.toUpperCase()} Engine (${config.aiServiceType === 'matlab' ? config.matlabAiServiceUrl : 'Model-Agnostic Heuristic Mock'})
   Simulink Sim:  ${config.simulationServiceType.toUpperCase()} SimEvents Engine
   File Storage:  ${config.storagePath}
   Web Frontend:  ${fs.existsSync(webDistPath) ? webDistPath : 'Not served (API-only)'}
  =============================================================
  `);
});

export default app;