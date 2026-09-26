import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

// In production, JWT_SECRET must be explicitly provided in environment and meet minimum entropy
if (nodeEnv === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('[FATAL SECURITY] Production deployment requires a secure, cryptographically random JWT_SECRET configured in environment variables.');
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  jwtSecret: process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'dev-insecure-secret-for-local-testing-only'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || '',
  aiServiceType: (process.env.AI_SERVICE_TYPE || 'matlab') as 'mock' | 'matlab',
  matlabAiServiceUrl: process.env.MATLAB_SERVICE_URL || 'http://127.0.0.1:8000',
  simulationServiceType: (process.env.SIMULATION_SERVICE_TYPE || 'matlab') as 'mock' | 'matlab',
  matlabSimulinkServiceUrl: process.env.MATLAB_SIMULINK_URL || 'http://127.0.0.1:8000',
  storagePath: process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads'),
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
