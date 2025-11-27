import { createClient } from '@/lib/supabase';
import type { Schedule, ScheduleWithProject } from '@/types/database';

/**
 * Get all schedules the user has access to
 * Includes schedules from owned projects and projects they're members of
 */
export async function getUserSchedules(userId: string): Promise<ScheduleWithProject[]> {
  const supabase = createClient();

  // Get projects the user owns
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId);

  // Get projects the user is a member of
  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  // Combine project IDs
  const projectIds = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(ownedProjects?.map((p: any) => p.id) || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(memberProjects?.map((pm: any) => pm.project_id) || []),
  ];

  if (projectIds.length === 0) {
    return [];
  }

  // Get schedules for these projects
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select(`
      *,
      project:projects(id, title, description)
    `)
    .in('project_id', projectIds)
    .order('shoot_date', { ascending: true })
    .order('shoot_time', { ascending: true });

  if (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return schedules as any;
}

/**
 * Get schedules for a specific project
 */
export async function getProjectSchedules(projectId: string): Promise<Schedule[]> {
  const supabase = createClient();

  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('project_id', projectId)
    .order('shoot_date', { ascending: true })
    .order('shoot_time', { ascending: true });

  if (error) {
    console.error('Error fetching project schedules:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return schedules as any;
}

/**
 * Get a single schedule by ID
 */
export async function getScheduleById(scheduleId: string): Promise<ScheduleWithProject | null> {
  const supabase = createClient();

  const { data: schedule, error } = await supabase
    .from('schedules')
    .select(`
      *,
      project:projects(id, title, description)
    `)
    .eq('id', scheduleId)
    .single();

  if (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return schedule as any;
}

/**
 * Create a new schedule
 */
export async function createSchedule(
  schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>,
  userId: string
): Promise<Schedule> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('schedules').insert as any)({
    ...schedule,
    created_by: userId,
  })
    .select()
    .single();

  if (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Update an existing schedule
 */
export async function updateSchedule(
  scheduleId: string,
  updates: Partial<Omit<Schedule, 'id' | 'created_by' | 'created_at' | 'updated_at'>>
): Promise<Schedule> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('schedules').update as any)(updates)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);

  if (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
}

/**
 * Get upcoming schedules (next 30 days)
 */
export async function getUpcomingSchedules(userId: string, days: number = 30): Promise<ScheduleWithProject[]> {
  const supabase = createClient();

  // Get projects the user owns
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId);

  // Get projects the user is a member of
  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  // Combine project IDs
  const projectIds = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(ownedProjects?.map((p: any) => p.id) || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(memberProjects?.map((pm: any) => pm.project_id) || []),
  ];

  if (projectIds.length === 0) {
    return [];
  }

  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const { data: schedules, error } = await supabase
    .from('schedules')
    .select(`
      *,
      project:projects(id, title, description)
    `)
    .in('project_id', projectIds)
    .gte('shoot_date', today)
    .lte('shoot_date', futureDateStr)
    .order('shoot_date', { ascending: true })
    .order('shoot_time', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming schedules:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return schedules as any;
}

