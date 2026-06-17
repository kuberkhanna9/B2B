const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

// 1. Read .env.local to get database credentials
const envPath = path.join(__dirname, '.env.local');
let dbUrl = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      dbUrl = trimmed.split('DATABASE_URL=')[1].trim().replace(/['"]/g, '').replace(/\r/g, '');
    } else if (!dbUrl && trimmed.startsWith('POSTGRES_URL=')) {
      dbUrl = trimmed.split('POSTGRES_URL=')[1].trim().replace(/['"]/g, '').replace(/\r/g, '');
    }
  }
}

if (!dbUrl) {
  console.error('CRITICAL: DATABASE_URL not found in .env.local');
  process.exit(1);
}

// Convert pooler URL (port 6543) to direct connection URL (port 5432) for DDL execution
let directDbUrl = dbUrl;
if (dbUrl.includes(':6543')) {
  directDbUrl = dbUrl.replace(':6543', ':5432').replace('pgbouncer=true', 'sslmode=require');
}

console.log('Parsed DATABASE_URL (masked password):', dbUrl.replace(/:[^:@/]+@/, ':****@'));
console.log('Constructed directDbUrl (masked password):', directDbUrl.replace(/:[^:@/]+@/, ':****@'));

// 2. Read the migration SQL file
const sqlPath = path.join(__dirname, 'b2b_migration.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('CRITICAL: b2b_migration.sql not found');
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf8');

async function run() {
  console.log('Connecting to database...');
  // Use prepare: false since PgBouncer doesn't support prepared statements
  const sql = postgres(directDbUrl, { prepare: false });

  try {
    console.log('Executing migration script (creating tables, enums, indexes, and RLS)...');
    await sql.unsafe(sqlContent);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

run();
