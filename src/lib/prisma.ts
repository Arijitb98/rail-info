import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

declare global {
  var __prisma: PrismaClient | undefined;
  var __pgPool: Pool | undefined;
}

function getPgPool(): Pool {
  if (globalThis.__pgPool) return globalThis.__pgPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Check your .env file.');
  }

  // Configure SSL for production with CA certificate
  let ssl: Pool['options']['ssl'] = undefined;
  if (process.env.NODE_ENV === 'production') {
    const caCert = process.env.DATABASE_CA_CERT;
    ssl = caCert
      ? { rejectUnauthorized: true, ca: caCert }
      : { rejectUnauthorized: false };
  }

  const pool = new Pool({ connectionString, ssl });
  if (process.env.NODE_ENV !== 'production') globalThis.__pgPool = pool;
  return pool;
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? new PrismaClient({ adapter: new PrismaPg(getPgPool()) });

if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma;
