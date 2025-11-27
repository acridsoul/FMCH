import { createClient } from '@/lib/supabase';
import type { Expense, ExpenseWithProject, ExpenseCategory } from '@/types/database';

/**
 * Get all expenses the user has access to
 * Includes expenses from owned projects and projects they're members of
 */
export async function getUserExpenses(userId: string): Promise<ExpenseWithProject[]> {
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

  // Get expenses for these projects
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select(`
      *,
      project:projects(id, title, description, budget)
    `)
    .in('project_id', projectIds)
    .order('expense_date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return expenses as any;
}

/**
 * Get expenses for a specific project
 */
export async function getProjectExpenses(projectId: string): Promise<Expense[]> {
  const supabase = createClient();

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('expense_date', { ascending: false });

  if (error) {
    console.error('Error fetching project expenses:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return expenses as any;
}

/**
 * Get a single expense by ID
 */
export async function getExpenseById(expenseId: string): Promise<ExpenseWithProject | null> {
  const supabase = createClient();

  const { data: expense, error } = await supabase
    .from('expenses')
    .select(`
      *,
      project:projects(id, title, description, budget)
    `)
    .eq('id', expenseId)
    .single();

  if (error) {
    console.error('Error fetching expense:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return expense as any;
}

/**
 * Create a new expense
 */
export async function createExpense(
  expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>,
  userId: string
): Promise<Expense> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('expenses').insert as any)({
    ...expense,
    created_by: userId,
  })
    .select()
    .single();

  if (error) {
    console.error('Error creating expense:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Update an existing expense
 */
export async function updateExpense(
  expenseId: string,
  updates: Partial<Omit<Expense, 'id' | 'created_by' | 'created_at' | 'updated_at'>>
): Promise<Expense> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('expenses').update as any)(updates)
    .eq('id', expenseId)
    .select()
    .single();

  if (error) {
    console.error('Error updating expense:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);

  if (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

/**
 * Get expense summary by category for a project
 */
export async function getProjectExpenseSummary(projectId: string): Promise<{
  totalExpenses: number;
  byCategory: Record<ExpenseCategory, number>;
  expenseCount: number;
}> {
  const expenses = await getProjectExpenses(projectId);

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const expenseCount = expenses.length;

  const byCategory: Record<ExpenseCategory, number> = {
    equipment: 0,
    crew: 0,
    location: 0,
    'post-production': 0,
    other: 0,
  };

  expenses.forEach((exp) => {
    byCategory[exp.category] = (byCategory[exp.category] || 0) + Number(exp.amount);
  });

  return {
    totalExpenses,
    byCategory,
    expenseCount,
  };
}

/**
 * Get budget vs actual comparison for a project
 */
export async function getProjectBudgetComparison(projectId: string): Promise<{
  budget: number | null;
  spent: number;
  remaining: number | null;
  percentageUsed: number | null;
}> {
  const supabase = createClient();

  // Get project budget
  const { data: project } = await supabase
    .from('projects')
    .select('budget')
    .eq('id', projectId)
    .single();

  // Get total expenses
  const expenses = await getProjectExpenses(projectId);
  const spent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budget = (project as any)?.budget ? Number((project as any).budget) : null;
  const remaining = budget !== null ? budget - spent : null;
  const percentageUsed = budget !== null && budget > 0 ? (spent / budget) * 100 : null;

  return {
    budget,
    spent,
    remaining,
    percentageUsed,
  };
}

/**
 * Get expenses grouped by month for analytics
 */
export async function getExpensesByMonth(
  projectId: string,
  months: number = 6
): Promise<Array<{ month: string; total: number; count: number }>> {
  const expenses = await getProjectExpenses(projectId);

  const now = new Date();
  const monthsData: Array<{ month: string; total: number; count: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format

    const monthExpenses = expenses.filter((exp) => {
      return exp.expense_date.startsWith(monthKey);
    });

    monthsData.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      total: monthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
      count: monthExpenses.length,
    });
  }

  return monthsData;
}

