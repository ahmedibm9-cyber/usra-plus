import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// POST /api/families/create
// Creates a family and adds the user as owner using the service role key.
// This bypasses RLS restrictions that the anon key + user auth token can't satisfy
// due to a known issue with the Supabase JS client not sending the Authorization
// header with PostgREST requests.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, userId } = body as {
      name: string
      description?: string
      userId: string
    }

    if (!name?.trim() || !userId) {
      return NextResponse.json(
        { error: 'Family name and user ID are required' },
        { status: 400 }
      )
    }

    // Verify the user's auth token from the request
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const userToken = authHeader.replace('Bearer ', '')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 503 }
      )
    }

    // Verify the token is valid by checking the user
    const userClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser(userToken)

    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      )
    }

    // Use service role key to bypass RLS
    const adminClient = getSupabaseAdmin()
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 503 }
      )
    }

    // Create the family
    const { data: family, error: familyError } = await adminClient
      .from('families')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: userId,
      })
      .select()
      .single()

    if (familyError) {
      console.error('[API] Family creation error:', familyError)
      return NextResponse.json(
        { error: familyError.message || 'Failed to create family' },
        { status: 500 }
      )
    }

    if (!family) {
      return NextResponse.json(
        { error: 'Failed to create family' },
        { status: 500 }
      )
    }

    // Add user as owner of the family
    const { error: memberError } = await adminClient
      .from('family_members')
      .insert({
        family_id: family.id,
        user_id: userId,
        role: 'owner',
      })

    if (memberError) {
      console.error('[API] Family member insert error:', memberError)
      // Try to clean up the family if member insert fails
      await adminClient.from('families').delete().eq('id', family.id)
      return NextResponse.json(
        { error: memberError.message || 'Failed to add you as family owner' },
        { status: 500 }
      )
    }

    return NextResponse.json({ family })
  } catch (error) {
    console.error('[API] Family creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
