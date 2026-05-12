#!/usr/bin/env bun
/**
 * USRA PLUS — Database Migration Runner
 *
 * Executes the additional-tables.sql migration against the Supabase database.
 *
 * Usage:
 *   bun run scripts/run-migration.ts
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL    — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — Supabase service role key
 *   SUPABASE_DB_PASSWORD        — Database password (get from Supabase Dashboard > Settings > Database)
 *
 * If SUPABASE_DB_PASSWORD is not set, the script will fall back to
 * the Supabase Management API (requires SUPABASE_ACCESS_TOKEN).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ── Load environment variables ──────────────────────────────────
const envPath = join(import.meta.dir, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const sqlPath = join(import.meta.dir, '..', 'supabase', 'additional-tables.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log(`📋 Migration file: ${sqlPath}`);
console.log(`📋 Project ref: ${projectRef}`);
console.log(`📋 SQL length: ${sql.length} chars\n`);

// ── Method 1: Direct PostgreSQL connection via pooler ──────────
async function executeViaDirectConnection(): Promise<boolean> {
  if (!DB_PASSWORD) {
    console.log('⏭️  SUPABASE_DB_PASSWORD not set, skipping direct connection');
    return false;
  }

  const postgres = await import('postgres');

  const regions = [
    'ap-southeast-1',
    'us-east-1',
    'eu-west-1',
    'us-west-1',
    'ap-northeast-1',
    'ap-south-1',
    'eu-central-1',
  ];

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`🔌 Trying pooler in ${region}...`);

    const sql_conn = postgres.default({
      host,
      port: 6543,
      user: `postgres.${projectRef}`,
      password: DB_PASSWORD,
      database: 'postgres',
      ssl: 'require',
      connect_timeout: 10,
    });

    try {
      await sql_conn`SELECT 1 as test`;
      console.log(`✅ Connected to pooler in ${region}`);

      // Execute the migration SQL
      // Split into individual statements and execute them
      const statements = sql
        .split('\n')
        .filter(line => line.trim() && !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      console.log(`📝 Executing ${statements.length} statements...`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await sql_conn.unsafe(stmt);
          process.stdout.write(`✓`);
        } catch (e: any) {
          // Ignore "already exists" errors
          if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
            process.stdout.write(`~`);
          } else {
            console.error(`\n❌ Statement ${i + 1} failed: ${e.message?.substring(0, 200)}`);
            console.error(`   SQL: ${stmt.substring(0, 200)}...`);
          }
        }
      }

      console.log('\n✅ Migration completed via direct connection');
      await sql_conn.end();
      return true;
    } catch (e: any) {
      console.log(`   ❌ ${e.message?.substring(0, 80)}`);
    } finally {
      try { await sql_conn.end(); } catch {}
    }
  }

  console.log('❌ Could not connect via any pooler region');
  return false;
}

// ── Method 2: Supabase Management API ──────────────────────────
async function executeViaManagementAPI(): Promise<boolean> {
  if (!ACCESS_TOKEN) {
    console.log('⏭️  SUPABASE_ACCESS_TOKEN not set, skipping Management API');
    return false;
  }

  console.log('🔌 Trying Supabase Management API...');

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (response.ok) {
      console.log('✅ Migration completed via Management API');
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Management API error: ${error}`);
      return false;
    }
  } catch (e: any) {
    console.error(`❌ Management API failed: ${e.message}`);
    return false;
  }
}

// ── Method 3: Verify via REST API ──────────────────────────────
async function verifyTables(): Promise<void> {
  const tables = ['budget_months', 'expenses', 'meal_plans', 'chores', 'chore_logs', 'milestones'];
  console.log('\n📊 Verifying tables via REST API...');

  for (const table of tables) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=0`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (response.ok) {
        console.log(`  ✅ ${table} — exists`);
      } else {
        const error = await response.json();
        console.log(`  ❌ ${table} — ${error.message?.substring(0, 80)}`);
      }
    } catch (e: any) {
      console.log(`  ❌ ${table} — ${e.message?.substring(0, 80)}`);
    }
  }
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 USRA PLUS — Database Migration Runner\n');

  // Try each method in order
  let success = false;

  success = await executeViaDirectConnection();
  if (!success) {
    success = await executeViaManagementAPI();
  }

  // Always verify
  await verifyTables();

  if (success) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Automatic migration failed.');
    console.log('   Please run the SQL manually in the Supabase Dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql');
    console.log('   2. Copy the contents of supabase/additional-tables.sql');
    console.log('   3. Paste into the SQL Editor and click Run');
    console.log('   4. Re-run this script to verify: bun run scripts/run-migration.ts');
    process.exit(1);
  }
}

main();
