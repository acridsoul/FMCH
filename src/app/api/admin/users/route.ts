/**
 * Admin Users API Route
 * POST /api/admin/users - Create new user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((profile as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { email, password, fullName, role } = body;

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, fullName, role' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'department_head', 'crew'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin, department_head, or crew' },
        { status: 400 }
      );
    }

    // Create user using admin client
    const adminClient = createAdminClient();

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        full_name: fullName,
        role: role,
      },
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create profile entry (should be auto-created by trigger, but ensure it exists)
    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: role,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // User created but profile failed - this is not ideal but user exists
      // Return the auth user data
      return NextResponse.json({
        user: {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: role,
          created_at: authData.user.created_at,
        },
      });
    }

    return NextResponse.json({ user: profileData });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
