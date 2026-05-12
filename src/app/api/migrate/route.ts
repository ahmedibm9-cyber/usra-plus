import { NextRequest, NextResponse } from 'next/server';
import { verifySignedAdminAuth } from '@/lib/admin-session';

/**
 * GET /api/migrate
 *
 * Verifies which additional tables exist in the Supabase database.
 * This endpoint does NOT execute any DDL — it only checks table existence
 * via the PostgREST API using the service role key.
 *
 * Requires admin authentication.
 */
export async function GET(req: NextRequest) {
  // Verify admin authentication
  const adminAuth = verifySignedAdminAuth(req)
  if (!adminAuth.authenticated) {
    return NextResponse.json(
      { error: 'Admin authentication required' },
      { status: 401 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured' },
      { status: 500 }
    );
  }

  const tables = [
    'budget_months',
    'expenses',
    'meal_plans',
    'chores',
    'chore_logs',
    'milestones',
  ];

  const results: Record<string, { exists: boolean; error?: string }> = {};

  await Promise.all(
    tables.map(async (table) => {
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/${table}?select=id&limit=0`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          }
        );

        if (response.ok) {
          results[table] = { exists: true };
        } else {
          const error = await response.json();
          results[table] = {
            exists: false,
            error: error.message?.substring(0, 100),
          };
        }
      } catch (e: any) {
        results[table] = { exists: false, error: e.message?.substring(0, 100) };
      }
    })
  );

  const allExist = Object.values(results).every((r) => r.exists);
  const existingCount = Object.values(results).filter((r) => r.exists).length;

  return NextResponse.json({
    allTablesExist: allExist,
    existingTables: existingCount,
    totalTables: tables.length,
    tables: results,
    instructions: allExist
      ? undefined
      : 'Run the SQL in supabase/additional-tables.sql via the Supabase SQL Editor: https://supabase.com/dashboard/project/' +
        supabaseUrl.replace('https://', '').replace('.supabase.co', '') +
        '/sql',
  });
}
