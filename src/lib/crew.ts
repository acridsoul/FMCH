import { createClient } from '@/lib/supabase';
import type { Profile, ProjectMember } from '@/types/database';

/**
 * Extended ProjectMember type with profile information
 */
export interface ProjectMemberWithProfile extends ProjectMember {
  profile?: Profile;
}

/**
 * Get all team members (profiles) in the system
 * Admin/Department heads can see all crew
 */
export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = createClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return profiles as any;
}

/**
 * Get project members for a specific project
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMemberWithProfile[]> {
  const supabase = createClient();

  const { data: members, error } = await supabase
    .from('project_members')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching project members:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return members as any;
}

/**
 * Get all projects a user is a member of
 */
export async function getUserProjects(userId: string): Promise<ProjectMemberWithProfile[]> {
  const supabase = createClient();

  const { data: memberships, error } = await supabase
    .from('project_members')
    .select(`
      *,
      project:projects(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user projects:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return memberships as any;
}

/**
 * Add a member to a project
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: string
): Promise<ProjectMember> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('project_members').insert as any)({
    project_id: projectId,
    user_id: userId,
    role: role,
  })
    .select()
    .single();

  if (error) {
    console.error('Error adding project member:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Update a project member's role
 */
export async function updateProjectMemberRole(
  memberId: string,
  role: string
): Promise<ProjectMember> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('project_members').update as any)({ role })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project member:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Remove a member from a project
 */
export async function removeProjectMember(memberId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error removing project member:', error);
    throw error;
  }
}

/**
 * Get a user's profile by ID
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const supabase = createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return profile as any;
}

/**
 * Update a user's profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('profiles').update as any)(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Search profiles by name or email
 */
export async function searchProfiles(query: string): Promise<Profile[]> {
  const supabase = createClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('full_name', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Error searching profiles:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return profiles as any;
}

/**
 * Get crew statistics for a project
 */
export async function getProjectCrewStats(projectId: string): Promise<{
  totalMembers: number;
  byRole: Record<string, number>;
}> {
  const members = await getProjectMembers(projectId);

  const totalMembers = members.length;
  const byRole: Record<string, number> = {};

  members.forEach((member) => {
    const role = member.role || 'Unassigned';
    byRole[role] = (byRole[role] || 0) + 1;
  });

  return {
    totalMembers,
    byRole,
  };
}

