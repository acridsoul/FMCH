'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  getDashboardStats,
  getUpcomingSchedules,
  getBudgetComparison,
  getExpensesByCategory,
  getTasksByStatus,
  getProjectsByStatus,
  getRecentActivity,
  getAllExpenses,
} from '@/lib/dashboard';
import AIInsightsWidget from '@/components/ai/AIInsightsWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FolderKanban,
  CheckSquare,
  DollarSign,
  Calendar,
  Plus,
  ArrowRight,
  Activity,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalExpenses: number;
}

// Chart colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const permissions = usePermissions();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingSchedules, setUpcomingSchedules] = useState<Array<Record<string, unknown>>>([]);
  const [budgetData, setBudgetData] = useState<Array<Record<string, unknown>>>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<Array<Record<string, unknown>>>([]);
  const [tasksByStatus, setTasksByStatus] = useState<Array<Record<string, unknown>>>([]);
  const [projectsByStatus, setProjectsByStatus] = useState<Array<Record<string, unknown>>>([]);
  const [recentActivity, setRecentActivity] = useState<Array<Record<string, unknown>>>([]);
  const [allExpenses, setAllExpenses] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    console.log('📊 Loading dashboard data for user:', user.id);

    try {
      setLoading(true);

      // Fetch all dashboard data
      const [
        statsData,
        schedulesData,
        budgetComparisonData,
        expensesCategoryData,
        tasksStatusData,
        projectsStatusData,
        activityData,
        allExpensesData,
      ] = await Promise.all([
        getDashboardStats(user.id),
        getUpcomingSchedules(user.id, 5),
        getBudgetComparison(user.id),
        getExpensesByCategory(user.id),
        getTasksByStatus(user.id),
        getProjectsByStatus(user.id),
        getRecentActivity(user.id, 10),
        getAllExpenses(user.id),
      ]);

      console.log('✅ Dashboard data loaded successfully');

      setStats(statsData);
      setUpcomingSchedules(schedulesData);
      setBudgetData(budgetComparisonData);
      setExpensesByCategory(expensesCategoryData);
      setTasksByStatus(tasksStatusData);
      setProjectsByStatus(projectsStatusData);
      setRecentActivity(activityData);
      setAllExpenses(allExpensesData);
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      loadDashboardData();
    }
  }, [authLoading, loadDashboardData]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate task completion percentage
  const taskCompletionPercentage = stats?.totalTasks
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  // Calculate total budget and spent
  const totalBudget = budgetData.reduce((sum, item) => sum + Number(item.budget || 0), 0);
  const totalSpent = budgetData.reduce((sum, item) => sum + Number(item.spent || 0), 0);
  const budgetUsagePercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'expense':
        return <DollarSign className="h-4 w-4" />;
      case 'schedule':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Get activity color
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
      case 'expense':
        return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'schedule':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-950';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name || 'User'}!</h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your film productions
          </p>
        </div>
        {(permissions.canCreateProject || permissions.canCreateTask ||
          permissions.canCreateSchedule || permissions.canCreateExpense) && (
          <div className="flex gap-2">
            {permissions.canCreateProject && (
              <Button asChild size="sm">
                <Link href="/projects">
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Link>
              </Button>
            )}
            {permissions.canCreateTask && (
              <Button variant="outline" asChild size="sm">
                <Link href="/tasks">
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Link>
              </Button>
            )}
            {permissions.canCreateSchedule && (
              <Button variant="outline" asChild size="sm">
                <Link href="/schedule">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Shoot
                </Link>
              </Button>
            )}
            {permissions.canCreateExpense && (
              <Button variant="outline" asChild size="sm">
                <Link href="/budget">
                  <Plus className="mr-2 h-4 w-4" />
                  Log Expense
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Projects */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/projects'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.activeProjects || 0} active
            </p>
            <div className="mt-2 flex items-center text-xs text-blue-600 dark:text-blue-400">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        {/* Task Completion */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/tasks'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Task Progress</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskCompletionPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.completedTasks || 0} of {stats?.totalTasks || 0} completed
            </p>
            <Progress value={taskCompletionPercentage} className="mt-2" />
          </CardContent>
        </Card>

        {/* Budget Usage */}
        <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${budgetUsagePercentage > 90 ? 'border-red-200 dark:border-red-800' : ''}`} onClick={() => window.location.href = '/budget'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {totalSpent.toLocaleString('en-KE')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of KSh {totalBudget.toLocaleString('en-KE')} ({budgetUsagePercentage}%)
            </p>
            {budgetUsagePercentage > 90 && (
              <div className="mt-2 flex items-center text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="mr-1 h-3 w-3" />
                Budget warning
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Shoots */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/schedule'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Shoots</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingSchedules.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Next 30 days</p>
            <div className="mt-2 flex items-center text-xs text-purple-600 dark:text-purple-400">
              View calendar <ArrowRight className="ml-1 h-3 w-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Widget */}
      <AIInsightsWidget 
        budget={totalBudget}
        expenses={allExpenses}
        projectCount={stats?.totalProjects || 0}
        aiProvider="deepseek"
        apiKey={process.env.NEXT_PUBLIC_AI_API_KEY}
      />

      {/* Data Visualization Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Expense by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Budget distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No expenses logged yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.category}: KSh ${Number(entry.amount).toLocaleString('en-KE')}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `KSh ${Number(value).toLocaleString('en-KE')}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Overview</CardTitle>
            <CardDescription>Current task distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            {tasksByStatus.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks created yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tasksByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Status & Budget Comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Project Status */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
            <CardDescription>Projects grouped by production phase</CardDescription>
          </CardHeader>
          <CardContent>
            {projectsByStatus.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No projects created yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={projectsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.status}: ${entry.count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {projectsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Budget Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual Spending</CardTitle>
            <CardDescription>Project-wise budget utilization</CardDescription>
          </CardHeader>
          <CardContent>
            {budgetData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No budget data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="project" />
                  <YAxis />
                  <Tooltip formatter={(value) => `KSh ${Number(value).toLocaleString('en-KE')}`} />
                  <Legend />
                  <Bar dataKey="budget" fill="#10b981" name="Budget" />
                  <Bar dataKey="spent" fill="#ef4444" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Upcoming Schedules */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates across all your projects</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity: Record<string, unknown>) => (
                  <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className={`p-2 rounded-lg ${getActivityColor(activity.type as string)}`}>
                      {getActivityIcon(activity.type as string)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title as string}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.description as string}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{activity.project as string}</span>
                        <span>•</span>
                        <span>{activity.creator as string}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(activity.created_at as string).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Schedules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Shoots
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/schedule">View all</Link>
              </Button>
            </CardTitle>
            <CardDescription>Your next scheduled shoots</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingSchedules.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming shoots</p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link href="/schedule">Schedule a shoot</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSchedules.map((schedule: Record<string, unknown>) => (
                  <div key={schedule.id as string} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {schedule.scene_number ? `Scene ${schedule.scene_number as string}` : 'Shoot'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(schedule.project as Record<string, unknown>)?.title as string || 'No project'}
                      </p>
                      {schedule.location ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {schedule.location as string}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                      <div>{new Date(schedule.shoot_date as string).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}</div>
                      {schedule.shoot_time ? (
                        <div className="text-xs mt-1">{schedule.shoot_time as string}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
