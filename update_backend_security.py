config_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\config\index.ts"
index_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\index.ts"

new_config_code = """import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

// In production, JWT_SECRET must be explicitly provided in environment and meet minimum entropy
if (nodeEnv === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('netra-ai-rural-dr-secret-key-2026') || process.env.JWT_SECRET.length < 32) {
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
"""

with open(config_path, "w", encoding="utf-8") as f:
    f.write(new_config_code)
print("Updated config/index.ts successfully.")

with open(index_path, "r", encoding="utf-8") as f:
    index_content = f.read()

old_cors = "app.use(cors({ origin: config.corsOrigin, credentials: true }));"

new_cors = """// Hardened CORS Configuration:
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
}));"""

if old_cors in index_content:
    index_content = index_content.replace(old_cors, new_cors)
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_content)
    print("Updated index.ts CORS successfully.")
else:
    print("WARNING: old_cors not found in index.ts")
