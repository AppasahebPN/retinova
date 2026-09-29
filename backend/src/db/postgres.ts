import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

let pool: Pool | null = null;
let isConnected = false;

export async function initPostgres(): Promise<Pool | null> {
  const dbUrl = config.databaseUrl;
  if (!dbUrl) {
    console.log('[RETINOVA] Database running in embedded DataStore mode (DATABASE_URL not configured)');
    return null;
  }

  try {
    const isCloudDb = dbUrl.includes('render.com') || dbUrl.includes('rds.amazonaws.com') || config.nodeEnv === 'production';
    
    pool = new Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 7000,
      ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
    });

    pool.on('error', (err) => {
      console.error('[RETINOVA] Unexpected error on idle PostgreSQL client:', err.message);
    });

    // Test connection
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time');
    client.release();

    isConnected = true;
    console.log(`[RETINOVA] Database connected successfully to PostgreSQL (Server time: ${res.rows[0]?.current_time})`);
    return pool;
  } catch (err: any) {
    isConnected = false;
    console.warn(`[RETINOVA] PostgreSQL connection warning: ${err.message}. Retaining resilient file-backed DataStore fallback.`);
    return null;
  }
}

export function getPgPool(): Pool | null {
  return pool;
}

export function isPostgresConnected(): boolean {
  return isConnected;
}

export async function queryPg<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T> | null> {
  if (!pool || !isConnected) {
    return null;
  }
  return pool.query<T>(text, params);
}
