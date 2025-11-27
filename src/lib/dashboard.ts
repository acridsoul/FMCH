import { createClient } from '@/lib/supabase';
import type { Project } from '@/types/database';

/**
 * Fetch dashboard statistics
 */
export async function getDashboardStats(userId: string) {
  console.log('📊 getDashboardStats called for user:', userId);
  const supabase = createClient();

  // Fetch projects created by user
  const { data: ownedProjects, error: ownedError } = await supabase
    .from('projects')
    .select('*')
    .eq('created_by', userId);

  console.log('✅ Owned projects fetched:', ownedProjects?.length || 0);
  if (ownedError) {
    console.error('❌ Error fetching owned projects:', ownedError);
  }

  // Fetch projects where user is a member
  const { data: memberProjects, error: memberError } = await supabase
    .from('project_members')
    .select('project_id, projects(*)')
    .eq('user_id', userId);

  console.log('✅ Member projects fetched:', memberProjects?.length || 0);
  if (memberError) {
    console.error('❌ Error fetching member projects:', memberError);
  }

  // Combine owned and member projects (remove duplicates)
  const allProjects: Project[] = [...(ownedProjects || [])];
  if (memberProjects) {
    memberProjects.forEach((pm: { project_id: string; projects: Project | null }) => {
      if (pm.projects && !allProjects.find((p) => p.id === pm.project_id)) {
        allProjects.push(pm.projects);
      }
    });
  }

  console.log('📦 Total projects combined:', allProjects.length);

  const projectIds = allProjects.map((p) => p.id);

  // Fetch tasks for user's projects
  const { data: projectTasks, error: projectTasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('project_id', projectIds.length > 0 ? projectIds : ['']);

  if (projectTasksError) {
    console.error('Error fetching project tasks:', projectTasksError);
  }

  // Fetch tasks assigned to user (even if not in their projects)
  const { data: assignedTasks, error: assignedTasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', userId);

  if (assignedTasksError) {
    console.error('Error fetching assigned tasks:', assignedTasksError);
  }

  // Merge and deduplicate tasks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskMap = new Map<string, any>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (projectTasks || []).forEach((task: any) => {
    taskMap.set(task.id, task);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (assignedTasks || []).forEach((task: any) => {
    if (!taskMap.has(task.id)) {
      taskMap.set(task.id, task);
    }
  });

  const allTasks = Array.from(taskMap.values());

  // Fetch expenses for budget calculation
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount')
    .in('project_id', projectIds.length > 0 ? projectIds : ['']);

  if (expensesError) {
    console.error('Error fetching expenses:', expensesError);
  }

  // Calculate stats from merged tasks
  const totalProjects = allProjects.length;
  const activeProjects = allProjects.filter(
    (p) => p.status === 'production' || p.status === 'pre-production'
  ).length;
  const totalTasks = allTasks.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completedTasks = allTasks.filter((t: any) => t.status === 'done').length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inProgressTasks = allTasks.filter((t: any) => t.status === 'in_progress').length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalExpenses = expenses?.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0) || 0;

  console.log('📊 Dashboard stats calculated:', {
    totalProjects,
    activeProjects,
    totalTasks,
    totalExpenses,
  });

  return {
    totalProjects,
    activeProjects,
    totalTasks,
    completedTasks,
    inProgressTasks,
    totalExpenses,
  };
}

/**
 * Fetch recent tasks for the user
 */
export async function getRecentTasks(userId: string, limit = 5) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      *,
      project:projects(title),
      assignee:profiles!tasks_assigned_to_fkey(full_name)
    `
    )
    .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent tasks:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch upcoming schedules
 */
export async function getUpcomingSchedules(userId: string, limit = 5) {
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

  if (uniqueProjectIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('schedules')
    .select(
      `
      *,
      project:projects(title)
    `
    )
    .in('project_id', uniqueProjectIds)
    .gte('shoot_date', new Date().toISOString().split('T')[0])
    .order('shoot_date', { ascending: true })
    .order('shoot_time', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching upcoming schedules:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch budget vs actual data for projects
 */
export async function getBudgetComparison(userId: string) {
  const supabase = createClient();

  // Get user's projects
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id, title, budget')
    .eq('created_by', userId);

  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id, projects(id, title, budget)')
    .eq('user_id', userId);

  // Combine projects
  const allProjects: Project[] = [...(ownedProjects || [])];
  if (memberProjects) {
    memberProjects.forEach((pm: { project_id: string; projects: Project | null }) => {
      if (pm.projects && !allProjects.find((p) => p.id === pm.project_id)) {
        allProjects.push(pm.projects);
      }
    });
  }

  const projectIds = allProjects.map((p) => p.id);

  if (projectIds.length === 0) {
    return [];
  }

  // Get expenses for each project
  const { data: expenses } = await supabase
    .from('expenses')
    .select('project_id, amount')
    .in('project_id', projectIds);

  // Calculate totals per project
  const budgetData = allProjects.map((project) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectExpenses = expenses?.filter((exp: any) => exp.project_id === project.id) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spent = projectExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const budget = Number((project as any)?.budget || 0);

    return {
      project: project.title,
      budget,
      spent,
      remaining: Math.max(0, budget - spent),
    };
  }).filter(item => item.budget > 0); // Only show projects with budgets

  return budgetData;
}

/**
 * Fetch expense breakdown by category
 */
export async function getExpensesByCategory(userId: string) {
  const supabase = createClient();

  // Get user's project IDs
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId);

  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  const projectIds = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(ownedProjects?.map((p: any) => p.id) || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(memberProjects?.map((pm: any) => pm.project_id) || []),
  ];

  const uniqueProjectIds = [...new Set(projectIds)];

  if (uniqueProjectIds.length === 0) {
    return [];
  }

  // Get expenses grouped by category
  const { data: expenses } = await supabase
    .from('expenses')
    .select('category, amount')
    .in('project_id', uniqueProjectIds);

  if (!expenses || expenses.length === 0) {
    return [];
  }

  // Group by category
  const categoryMap = new Map<string, number>();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expenses.forEach((exp: any) => {
    const category = exp.category || 'other';
    const amount = Number(exp.amount || 0);
    categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
  });

  return Array.from(categoryMap.entries()).map(([category, amount]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' '),
    amount,
  }));
}

/**
 * Fetch task progress breakdown by status
 */
export async function getTasksByStatus(userId: string) {
  const supabase = createClient();

  // Get user's project IDs
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId);

  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  const projectIds = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(ownedProjects?.map((p: any) => p.id) || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(memberProjects?.map((pm: any) => pm.project_id) || []),
  ];

  const uniqueProjectIds = [...new Set(projectIds)];

  // Get tasks from user's projects
  const { data: projectTasks } = await supabase
    .from('tasks')
    .select('id, status')
    .in('project_id', uniqueProjectIds.length > 0 ? uniqueProjectIds : ['']);

  // Get tasks assigned to user (even if not in their projects)
  const { data: assignedTasks } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('assigned_to', userId);

  // Merge and deduplicate tasks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskMap = new Map<string, any>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (projectTasks || []).forEach((task: any) => {
    taskMap.set(task.id, task);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (assignedTasks || []).forEach((task: any) => {
    if (!taskMap.has(task.id)) {
      taskMap.set(task.id, task);
    }
  });

  const allTasks = Array.from(taskMap.values());

  if (allTasks.length === 0) {
    return [];
  }

  // Group by status
  const statusMap = new Map<string, number>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allTasks.forEach((task: any) => {
    const status = task.status || 'todo';
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });

  return Array.from(statusMap.entries()).map(([status, count]) => ({
    status: status === 'todo' ? 'To Do' : status === 'in_progress' ? 'In Progress' : 'Done',
    count,
  }));
}

/**
 * Fetch project status distribution
 */
export async function getProjectsByStatus(userId: string) {
  const supabase = createClient();

  // Get projects
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('status')
    .eq('created_by', userId);

  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('projects(status)')
    .eq('user_id', userId);

  const allStatuses: string[] = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(ownedProjects?.map((p: any) => p.status) || []),
  ];

  if (memberProjects) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memberProjects.forEach((pm: any) => {
      if (pm.projects?.status) {
        allStatuses.push(pm.projects.status);
      }
    });
  }

  if (allStatuses.length === 0) {
    return [];
  }

  // Group by status
  const statusMap = new Map<string, number>();
  
  allStatuses.forEach((status: string) => {
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });

  return Array.from(statusMap.entries()).map(([status, count]) => ({
    status: status.split('-').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    count,
  }));
}

/**
 * Fetch recent activity (tasks + expenses + schedules combined)
 */
export async function getRecentActivity(userId: string, limit = 10) {
  const supabase = createClient();

  // Get user's project IDs
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId);

  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  const projectIds = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(ownedProjects?.map((p: any) => p.id) || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(memberProjects?.map((pm: any) => pm.project_id) || []),
  ];

  const uniqueProjectIds = [...new Set(projectIds)];

  if (uniqueProjectIds.length === 0) {
    return [];
  }

  // Fetch recent tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, created_at, project:projects(title), creator:profiles!tasks_created_by_fkey(full_name)')
    .in('project_id', uniqueProjectIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Fetch recent expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, description, amount, created_at, project:projects(title), creator:profiles!expenses_created_by_fkey(full_name)')
    .in('project_id', uniqueProjectIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Fetch recent schedules
  const { data: schedules } = await supabase
    .from('schedules')
    .select('id, scene_number, shoot_date, created_at, project:projects(title), creator:profiles!schedules_created_by_fkey(full_name)')
    .in('project_id', uniqueProjectIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Combine and sort all activities
  const activities = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(tasks?.map((t: any) => ({
      id: t.id,
      type: 'task',
      title: t.title,
      description: 'Task created',
      project: t.project?.title,
      creator: t.creator?.full_name,
      created_at: t.created_at,
    })) || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(expenses?.map((e: any) => ({
      id: e.id,
      type: 'expense',
      title: e.description,
      description: `Expense logged: KSh ${Number(e.amount).toLocaleString('en-KE')}`,
      project: e.project?.title,
      creator: e.creator?.full_name,
      created_at: e.created_at,
    })) || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(schedules?.map((s: any) => ({
      id: s.id,
      type: 'schedule',
      title: s.scene_number ? `Scene ${s.scene_number}` : 'Shoot',
      description: `Scheduled for ${new Date(s.shoot_date).toLocaleDateString()}`,
      project: s.project?.title,
      creator: s.creator?.full_name,
      created_at: s.created_at,
    })) || []),
  ];

  // Sort by created_at and limit
  return activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

/**
 * Fetch all expenses for AI analysis
 */
export async function getAllExpenses(userId: string) {
  const supabase = createClient();

  // Get user's project IDs
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId);

  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  const projectIds = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(ownedProjects?.map((p: any) => p.id) || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(memberProjects?.map((pm: any) => pm.project_id) || []),
  ];

  const uniqueProjectIds = [...new Set(projectIds)];

  if (uniqueProjectIds.length === 0) {
    return [];
  }

  // Get all expenses with category and amount
  const { data: expenses } = await supabase
    .from('expenses')
    .select('category, amount')
    .in('project_id', uniqueProjectIds);

  return expenses || [];
}
