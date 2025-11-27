/**
 * User Management Library
 *
 * Functions for managing users in the application
 * These are client-side functions that call API routes
 */

import { createClient } from '@/lib/supabase';
import type { Profile } from '@/types/database';

/**
 * Fetch all users (profiles) from the database
 * Accessible to all authenticated users (needed for task assignment, etc.)
 *
 * @param roleFilter - Optional role filter ('admin', 'department_head', 'crew', or 'all')
 * @returns Array of user profiles
 */
export async function getAllUsers(roleFilter?: string): Promise<Profile[]> {
  const supabase = createClient();

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply role filter if specified
  if (roleFilter && roleFilter !== 'all') {
    query = query.eq('role', roleFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Fetch a single user by ID
 *
 * @param userId - User ID to fetch
 * @returns User profile or null
 */
export async function getUserById(userId: string): Promise<Profile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

/**
 * Create a new user (admin only)
 * This calls the API route which uses the admin client
 *
 * @param userData - User data to create
 * @returns Created user data or error
 */
export async function createUser(userData: {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'department_head' | 'crew';
}): Promise<{ user: Profile | null; error: string | null }> {
  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    if (!response.ok) {
      return { user: null, error: result.error || 'Failed to create user' };
    }

    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error creating user:', error);
    return { user: null, error: 'Network error. Please try again.' };
  }
}

/**
 * Update user profile (admin only)
 * This calls the API route which uses the admin client
 *
 * @param userId - User ID to update
 * @param updates - Fields to update
 * @returns Updated user data or error
 */
export async function updateUser(
  userId: string,
  updates: {
    full_name?: string;
    role?: string;
    email?: string;
  }
): Promise<{ user: Profile | null; error: string | null }> {
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const result = await response.json();

    if (!response.ok) {
      return { user: null, error: result.error || 'Failed to update user' };
    }

    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error updating user:', error);
    return { user: null, error: 'Network error. Please try again.' };
  }
}

/**
 * Delete user (admin only)
 * This calls the API route which uses the admin client
 *
 * @param userId - User ID to delete
 * @returns Success status or error
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to delete user' };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Get user statistics
 * Counts users by role
 *
 * @returns User statistics
 */
export async function getUserStats(): Promise<{
  total: number;
  admins: number;
  departmentHeads: number;
  crew: number;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.from('profiles').select('role');

  if (error) {
    console.error('Error fetching user stats:', error);
    return { total: 0, admins: 0, departmentHeads: 0, crew: 0 };
  }

  const stats = {
    total: data?.length || 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    admins: data?.filter((u: any) => u.role === 'admin').length || 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    departmentHeads: data?.filter((u: any) => u.role === 'department_head').length || 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    crew: data?.filter((u: any) => u.role === 'crew').length || 0,
  };

  return stats;
}

/**
 * Search users by name or email
 *
 * @param query - Search query
 * @returns Array of matching user profiles
 */
export async function searchUsers(query: string): Promise<Profile[]> {
  if (!query.trim()) {
    return getAllUsers();
  }

  const supabase = createClient();
  const searchTerm = `%${query.toLowerCase()}%`;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return data || [];
}
