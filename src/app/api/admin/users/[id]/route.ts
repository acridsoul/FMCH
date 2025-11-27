/**
 * Admin Users API Route - Single User Operations
 * PATCH /api/admin/users/[id] - Update user
 * DELETE /api/admin/users/[id] - Delete user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * PATCH /api/admin/users/[id]
 * Update a user (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

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
    const { full_name, role, email } = body;

    // Validate at least one field to update
    if (!full_name && !role && !email) {
      return NextResponse.json(
        { error: 'At least one field must be provided: full_name, role, or email' },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role && !['admin', 'department_head', 'crew'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin, department_head, or crew' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Update profile
    const updates: {
      full_name?: string;
      role?: string;
      email?: string;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (full_name) updates.full_name = full_name;
    if (role) updates.role = role;
    if (email) updates.email = email;

    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // If email is being updated, also update it in auth.users
    if (email) {
      const { error: emailError } = await adminClient.auth.admin.updateUserById(userId, {
        email: email,
      });

      if (emailError) {
        console.error('Error updating user email:', emailError);
        // Profile updated but email update failed
        return NextResponse.json(
          {
            user: profileData,
            warning: 'Profile updated but email change failed. User may need to re-verify.',
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ user: profileData });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

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

    // Prevent admin from deleting themselves
    if (user.id === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account. Please have another admin remove your account.' },
        { status: 400 }
      );
    }

    // Check if this is the last admin
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (admins && admins.length === 1 && (admins[0] as any).id === userId) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin account. Please promote another user to admin first.' },
        { status: 400 }
      );
    }

    // Delete user using admin client (will cascade to profiles table)
    const adminClient = createAdminClient();

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
