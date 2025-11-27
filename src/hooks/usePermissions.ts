import { useAuth } from '@/context/AuthContext';

/**
 * Custom hook for checking user permissions based on role
 *
 * Role hierarchy:
 * - admin: Full access to everything
 * - department_head: Can manage projects, tasks, schedules, budgets, files
 * - crew: Read-only access, can only update status of assigned tasks
 */
export function usePermissions() {
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';
  const isDepartmentHead = profile?.role === 'department_head';
  const isCrew = profile?.role === 'crew';
  const canManage = isAdmin || isDepartmentHead;

  return {
    // Role checks
    isAdmin,
    isDepartmentHead,
    isCrew,
    canManage, // Shorthand for isAdmin || isDepartmentHead

    // Project permissions
    canCreateProject: isAdmin, // Only admins can create projects
    canEditProject: canManage, // Admins and dept heads can edit
    canDeleteProject: isAdmin, // Only admins can delete projects

    // Task permissions
    canCreateTask: canManage, // Admins and dept heads can create tasks
    canEditTask: true, // All users can edit tasks (RLS enforces assigned-only for crew)
    canDeleteTask: canManage, // Admins and dept heads can delete tasks
    canAssignTask: canManage, // Only managers can assign tasks

    // Schedule permissions
    canCreateSchedule: canManage, // Admins and dept heads can create schedules
    canEditSchedule: canManage, // Admins and dept heads can edit schedules
    canDeleteSchedule: canManage, // Admins and dept heads can delete schedules

    // Expense/Budget permissions
    canCreateExpense: canManage, // Admins and dept heads can create expenses
    canEditExpense: canManage, // Admins and dept heads can edit expenses
    canDeleteExpense: isAdmin, // Only admins can delete expenses

    // File permissions
    canUploadFile: canManage, // Admins and dept heads can upload files
    canDeleteFile: canManage, // Admins and dept heads can delete files

    // Project member permissions
    canManageTeam: canManage, // Admins and dept heads can manage team members

    // Report permissions
    canCreateReport: isCrew, // Only crew can create reports
    canViewAllReports: canManage, // Admins and dept heads can view all reports
    canCommentOnReports: canManage, // Admins and dept heads can comment (project managers checked separately via helper function)

    // General permissions
    canViewAnalytics: true, // Everyone can view analytics
    canExportData: canManage, // Only managers can export data
  };
}

/**
 * Check if user can edit a specific report
 */
export function canEditReport(reportUserId: string, currentUserId: string | undefined): boolean {
  return reportUserId === currentUserId;
}

/**
 * Check if user can comment on a report (includes project managers)
 * Note: This requires checking project membership, so it's a separate function
 */
export function canCommentOnReport(
  isAdmin: boolean,
  isDepartmentHead: boolean,
  isProjectManager: boolean
): boolean {
  return isAdmin || isDepartmentHead || isProjectManager;
}
