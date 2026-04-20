import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let pool: Pool | undefined;
let client: PrismaClient | undefined;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const disableSsl = String(process.env.DISABLE_DB_SSL || '').toLowerCase() === 'true';
  const isSupabase = /supabase\.co/i.test(connectionString);
  const wantsSsl = /sslmode=require|ssl=true/i.test(connectionString);

  let ssl: Pool['options']['ssl'] = undefined;

  if (!disableSsl && !isSupabase && (wantsSsl || process.env.NODE_ENV === 'production')) {
    ssl = { rejectUnauthorized: false };
  }

  pool = new Pool({ connectionString, ssl });
  return pool;
}

export function getPrisma(): PrismaClient {
  if (client) return client;
  client = new PrismaClient({ adapter: new PrismaPg(getPool()) });
  return client;
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
