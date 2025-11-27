import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import type { Profile } from '@/types/database';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

// Create a browser client for client-side operations
// This properly handles cookies and sessions in the browser
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// For backwards compatibility, export a default client instance
export const supabase = createClient();

// Export helper functions for common operations

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const client = createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    console.error('Error fetching user:', error.message);
    return null;
  }

  return user;
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();

  if (!user) return null;

  const client = createClient();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error.message);
    return null;
  }

  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const client = createClient();
  const { error } = await client.auth.signOut();

  if (error) {
    console.error('Error signing out:', error.message);
    throw error;
  }
}

/**
 * Check if user is admin
 */
export async function isAdmin() {
  const profile = await getCurrentProfile();
  return profile?.role === 'admin';
}

/**
 * Check if user is department head
 */
export async function isDepartmentHead() {
  const profile = await getCurrentProfile();
  return profile?.role === 'department_head';
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, redirectTo?: string) {
  const client = createClient();
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${window.location.origin}/reset-password`,
  });

  if (error) {
    console.error('Error sending password reset email:', error.message);
    throw error;
  }

  return data;
}

/**
 * Update user password (used during password reset flow)
 */
export async function updatePassword(newPassword: string) {
  const client = createClient();
  const { data, error } = await client.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Error updating password:', error.message);
    throw error;
  }

  return data;
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken() {
  const client = createClient();
  const { data: { session }, error } = await client.auth.getSession();

  if (error) {
    console.error('Error verifying reset token:', error.message);
    return false;
  }

  return !!session;
}

/**
 * Storage helper functions
 */
export const storage = {
  /**
   * Upload a file to a storage bucket
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File
  ): Promise<{ data: { path: string } | null; error: Error | null }> {
    const client = createClient();
    const { data, error } = await client.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    return { data, error };
  },

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const client = createClient();
    const {
      data: { publicUrl },
    } = client.storage.from(bucket).getPublicUrl(path);

    return publicUrl;
  },

  /**
   * Get signed URL for a file (works with private buckets)
   */
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
    const client = createClient();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    return { data, error };
  },

  /**
   * Delete a file from storage
   */
  async deleteFile(
    bucket: string,
    path: string
  ): Promise<{ error: Error | null }> {
    const client = createClient();
    const { error } = await client.storage.from(bucket).remove([path]);

    return { error };
  },

  /**
   * List files in a bucket
   */
  async listFiles(bucket: string, folder: string = '') {
    const client = createClient();
    const { data, error } = await client.storage.from(bucket).list(folder);

    return { data, error };
  },
};
