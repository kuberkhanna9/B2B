import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.POSTGRES_URL) {
  connectionString = process.env.POSTGRES_URL;
}

const isBuilding = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_PHASE === 'phase-export' || process.env.NEXT_PHASE?.includes('build');

if (!connectionString && !isBuilding) {
  console.warn("WARNING: DATABASE_URL environment variable is missing. Running in OFFLINE local JSON mock database mode.");
}

const client = (isBuilding || !connectionString) ? null : postgres(connectionString, { prepare: false });

export const db = client ? drizzle(client, { schema }) : null;
