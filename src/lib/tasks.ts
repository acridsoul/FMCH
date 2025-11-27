import { createClient } from '@/lib/supabase';
import { Task, TaskStatus, TaskPriority } from '@/types/database';

/**
 * Fetch all tasks for user's projects with filters
 */
export async function getUserTasks(
  userId: string,
  statusFilter?: TaskStatus,
  priorityFilter?: TaskPriority,
  assigneeFilter?: string
) {
  console.log('📋 getUserTasks called for user:', userId);
  const supabase = createClient();

  // Get projects created by user
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId);

  // Get projects where user is a member
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

  // Remove duplicates
  const uniqueProjectIds = [...new Set(projectIds)];

  // Query 1: Fetch tasks from user's projects
  let projectTasksQuery = supabase
    .from('tasks')
    .select(
      `
      *,
      project:projects(title, id),
      assignee:profiles!tasks_assigned_to_fkey(full_name, id)
    `
    );

  if (uniqueProjectIds.length > 0) {
    projectTasksQuery = projectTasksQuery.in('project_id', uniqueProjectIds);
  } else {
    // If user has no projects, return empty array for project tasks
    projectTasksQuery = projectTasksQuery.in('project_id', ['']);
  }

  const { data: projectTasks, error: projectTasksError } = await projectTasksQuery;

  if (projectTasksError) {
    console.error('❌ Error fetching project tasks:', projectTasksError);
  }

  // Query 2: Fetch tasks assigned to user (even if not in their projects)
  const { data: assignedTasks, error: assignedTasksError } = await supabase
    .from('tasks')
    .select(
      `
      *,
      project:projects(title, id),
      assignee:profiles!tasks_assigned_to_fkey(full_name, id)
    `
    )
    .eq('assigned_to', userId);

  if (assignedTasksError) {
    console.error('❌ Error fetching assigned tasks:', assignedTasksError);
  }

  // Merge and deduplicate tasks by ID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskMap = new Map<string, any>();

  // Add project-based tasks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (projectTasks || []).forEach((task: any) => {
    taskMap.set(task.id, task);
  });

  // Add assigned tasks (won't overwrite if already exists)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (assignedTasks || []).forEach((task: any) => {
    if (!taskMap.has(task.id)) {
      taskMap.set(task.id, task);
    }
  });

  // Convert map back to array
  let allTasks = Array.from(taskMap.values());

  // Apply filters to merged tasks
  if (statusFilter) {
    allTasks = allTasks.filter((task) => task.status === statusFilter);
  }

  if (priorityFilter) {
    allTasks = allTasks.filter((task) => task.priority === priorityFilter);
  }

  if (assigneeFilter) {
    allTasks = allTasks.filter((task) => task.assigned_to === assigneeFilter);
  }

  // Sort tasks (due_date ascending, priority descending)
  allTasks.sort((a, b) => {
    // Sort by due_date first
    if (a.due_date && b.due_date) {
      const dateComparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (dateComparison !== 0) return dateComparison;
    } else if (a.due_date) {
      return -1; // Tasks with due dates come first
    } else if (b.due_date) {
      return 1;
    }

    // Then sort by priority (high to low)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
           (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
  });

  console.log('✅ Tasks fetched:', allTasks.length, '(Project tasks:', projectTasks?.length || 0, ', Assigned tasks:', assignedTasks?.length || 0, ')');
  return allTasks || [];
}

/**
 * Fetch a single task with all related data
 */
export async function getTaskById(taskId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      *,
      project:projects(title, id, description),
      assignee:profiles!tasks_assigned_to_fkey(full_name, email, id),
      creator:profiles!tasks_created_by_fkey(full_name, email, id)
    `
    )
    .eq('id', taskId)
    .single();

  if (error) {
    console.error('❌ Error fetching task:', error);
    return null;
  }

  return data;
}

/**
 * Create a new task
 */
export async function createTask(
  task: Omit<Task, 'id' | 'created_at' | 'updated_at'>,
  userId: string
) {
  console.log('➕ Creating task:', task.title);
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tasks').insert as any)({
    ...task,
    created_by: userId,
  })
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error creating task:', error);
    throw new Error(error.message);
  }

  console.log('✅ Task created:', data.id);
  return data;
}

/**
 * Update an existing task
 */
export async function updateTask(taskId: string, updates: Partial<Task>) {
  console.log('✏️ Updating task:', taskId);
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tasks').update as any)(updates)
    .eq('id', taskId)
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error updating task:', error);
    throw new Error(error.message);
  }

  console.log('✅ Task updated:', taskId);
  return data;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string) {
  console.log('🗑️ Deleting task:', taskId);
  const supabase = createClient();

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('❌ Error deleting task:', error);
    throw new Error(error.message);
  }

  console.log('✅ Task deleted:', taskId);
}

/**
 * Subscribe to real-time task updates
 */
export function subscribeToTaskUpdates(
  projectId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (payload: any) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel(`tasks:project_id=eq.${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        console.log('🔄 Real-time task update:', payload);
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Get all available users for task assignment
 */
export async function getAvailableUsers() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('❌ Error fetching users:', error);
    return [];
  }

  return data || [];
}
