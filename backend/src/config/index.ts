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

// Upstream MATLAB / Python AI Inference Service URL
// In development: defaults to local bridge at http://127.0.0.1:8000
// In production: MUST be an explicit secure HTTPS URL (e.g. secure tunnel or dedicated GPU instance); never defaults to localhost
const rawMatlabUrl = (process.env.MATLAB_SERVICE_URL || '').trim().replace(/\/+$/, '');
const rawSimulinkUrl = (process.env.MATLAB_SIMULINK_URL || '').trim().replace(/\/+$/, '');

const matlabAiServiceUrl = rawMatlabUrl
  ? rawMatlabUrl
  : (nodeEnv === 'production' ? '' : 'http://127.0.0.1:8000');

const matlabSimulinkServiceUrl = rawSimulinkUrl
  ? rawSimulinkUrl
  : (nodeEnv === 'production' ? '' : 'http://127.0.0.1:8000');

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  jwtSecret: process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'dev-insecure-secret-for-local-testing-only'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || '',
  aiServiceType: (process.env.AI_SERVICE_TYPE || 'matlab') as 'mock' | 'matlab',
  matlabAiServiceUrl,
  simulationServiceType: (process.env.SIMULATION_SERVICE_TYPE || 'matlab') as 'mock' | 'matlab',
  matlabSimulinkServiceUrl,
  storagePath: process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads'),
  corsOrigin: process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '*',
  awsRegion: process.env.AWS_REGION || 'ap-south-1',
  awsS3Bucket: process.env.AWS_S3_BUCKET || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsDynamoTable: process.env.AWS_DYNAMODB_TABLE || 'RetinovaDetectionEvents',
  awsSnsTopicArn: process.env.AWS_SNS_TOPIC_ARN || ''
};
