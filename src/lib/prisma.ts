import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync } from 'fs';

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
  // Configure SSL:
  // - Allow explicit opt-out via `DISABLE_DB_SSL=true`.
  // - Treat Supabase hosts as non-SSL by default to avoid certificate issues.
  const disableSslEnv = String(process.env.DISABLE_DB_SSL || '').toLowerCase() === 'true';
  const isSupabaseHost = /supabase\.co/i.test(connectionString);

  let ssl: Pool['options']['ssl'] = undefined;
  const wantsSsl = /sslmode=require|ssl=true/i.test(connectionString);

  if (!disableSslEnv && !isSupabaseHost && (wantsSsl || process.env.NODE_ENV === 'production')) {
    let caCert = process.env.DATABASE_CA_CERT;
    const caPath = process.env.DATABASE_CA_CERT_PATH;

    // If a path is provided, prefer reading the cert from disk (useful for mounts/secrets).
    if (!caCert && caPath) {
      try {
        caCert = readFileSync(caPath, 'utf8');
      } catch (err) {
        // Log and continue; we'll fall back to insecure if no cert is available.
        // Avoid throwing here to keep local dev flows simple.
        // eslint-disable-next-line no-console
        console.warn(`Failed to read DATABASE_CA_CERT_PATH at ${caPath}:`, err);
      }
    }

    if (caCert) {
      // Support escaped newlines in env var values
      caCert = caCert.replace(/\\n/g, '\n');
    }

    ssl = caCert ? { rejectUnauthorized: true, ca: caCert } : { rejectUnauthorized: false };
  } else if (disableSslEnv || isSupabaseHost) {
    // Explicitly disable SSL on Supabase or when opted out via env var.
    ssl = undefined;
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('Database SSL disabled (DISABLE_DB_SSL=true or Supabase host detected).');
    }
  }

  const pool = new Pool({ connectionString, ssl });
  if (process.env.NODE_ENV !== 'production') globalThis.__pgPool = pool;
  return pool;
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? new PrismaClient({ adapter: new PrismaPg(getPgPool()) });

if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma;
