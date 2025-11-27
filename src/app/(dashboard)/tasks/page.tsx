'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getUserTasks, createTask, deleteTask, getAvailableUsers } from '@/lib/tasks';
import { createClient } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, CheckSquare, Trash2, Calendar, AlertCircle, Eye, Users } from 'lucide-react';
import type { TaskStatus, TaskPriority, Project, Profile } from '@/types/database';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function TasksPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [tasks, setTasks] = useState<Array<{
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    project?: Project;
    assignee?: Profile;
  }>>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    selectedAssignees: [] as string[],
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    due_date: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (createDialogOpen && users.length === 0) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createDialogOpen]);

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const availableUsers = await getAvailableUsers();
      setUsers(availableUsers);
    } catch (error) {
      console.error('❌ Error loading users:', error);
    } finally {
      setUsersLoading(false);
    }
  }

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    // Subscribe to all task changes
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('🔄 Real-time task update:', payload.eventType);

          // Reload tasks when changes occur
          loadTasks();
        }
      )
      .subscribe();

    console.log('✅ Subscribed to real-time task updates');

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Unsubscribing from task updates');
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Reload tasks when filters change
  useEffect(() => {
    if (user?.id && !loading) {
      loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, assigneeFilter]);

  async function loadData() {
    if (!user?.id) return;
    setLoading(true);

    try {
      const supabase = createClient();

      // Load projects
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .eq('user_id', user.id);

      const allProjects: Project[] = [...(ownedProjects || [])];
      if (memberProjects) {
        memberProjects.forEach((pm: { project_id: string; projects: Project | null }) => {
          if (pm.projects && !allProjects.find((p) => p.id === pm.project_id)) {
            allProjects.push(pm.projects);
          }
        });
      }

      setProjects(allProjects);

      // Load available users
      const availableUsers = await getAvailableUsers();
      setUsers(availableUsers);

      // Load tasks
      await loadTasks();
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks() {
    if (!user?.id) return;

    try {
      const data = await getUserTasks(
        user.id,
        statusFilter === 'all' ? undefined : statusFilter,
        priorityFilter === 'all' ? undefined : priorityFilter,
        assigneeFilter === 'all' ? undefined : assigneeFilter
      );

      setTasks(data);
      console.log('✅ Tasks loaded:', data.length);
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !formData.project_id || !formData.title) return;

    console.log('📝 Creating task(s):', formData);
    setFormLoading(true);

    try {
      const taskPromises = [];

      // If no assignees selected, create one unassigned task
      if (formData.selectedAssignees.length === 0) {
        taskPromises.push(
          createTask(
            {
              project_id: formData.project_id,
              title: formData.title,
              description: formData.description || null,
              assigned_to: null,
              status: formData.status,
              priority: formData.priority,
              due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
              created_by: user.id,
            },
            user.id
          )
        );
      } else {
        // Create one task per selected assignee
        formData.selectedAssignees.forEach((assigneeId) => {
          taskPromises.push(
            createTask(
              {
                project_id: formData.project_id,
                title: formData.title,
                description: formData.description || null,
                assigned_to: assigneeId,
                status: formData.status,
                priority: formData.priority,
                due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
                created_by: user.id,
              },
              user.id
            )
          );
        });
      }

      await Promise.all(taskPromises);
      console.log(`✅ Created ${taskPromises.length} task(s)`);

      // Reset form and reload tasks
      setFormData({
        title: '',
        description: '',
        project_id: '',
        selectedAssignees: [],
        status: 'todo',
        priority: 'medium',
        due_date: '',
      });
      setCreateDialogOpen(false);
      await loadTasks();
      
      alert(`Task${taskPromises.length > 1 ? 's' : ''} created successfully! ${taskPromises.length > 1 ? `(${taskPromises.length} tasks created)` : ''}`);
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Failed to create task(s). Please try again.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Failed to delete task. Please try again.');
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400';
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'low':
        return 'text-blue-600 dark:text-blue-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'high':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="text-xs">Admin</Badge>;
      case 'department_head':
        return <Badge variant="secondary" className="text-xs">Dept. Head</Badge>;
      case 'crew':
        return <Badge variant="outline" className="text-xs">Crew</Badge>;
      default:
        return <Badge className="text-xs">{role}</Badge>;
    }
  };

  const toggleAssigneeSelection = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAssignees: prev.selectedAssignees.includes(userId)
        ? prev.selectedAssignees.filter(id => id !== userId)
        : [...prev.selectedAssignees, userId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {permissions.isCrew ? 'View and update your assigned tasks' : 'Manage production tasks and assignments'}
          </p>
          {permissions.isCrew && (
            <Badge variant="secondary" className="mt-2">
              <Eye className="mr-1 h-3 w-3" />
              Limited Access - Can update assigned tasks only
            </Badge>
          )}
        </div>
        {permissions.canCreateTask && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to your production project
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Film lighting setup"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task details and instructions..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value as TaskPriority })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as TaskStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assign To Section - Multi-select */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Assign To
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {formData.selectedAssignees.length} selected
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select team members to assign this task to. One task will be created for each selected member. Leave empty to create an unassigned task.
                </p>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading users...</p>
                    </div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No users available
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] rounded-md border p-4">
                    <div className="space-y-3">
                      {users.map((availableUser) => (
                        <label
                          key={availableUser.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                          htmlFor={`assignee-${availableUser.id}`}
                        >
                          <Checkbox
                            id={`assignee-${availableUser.id}`}
                            checked={formData.selectedAssignees.includes(availableUser.id)}
                            onCheckedChange={() => toggleAssigneeSelection(availableUser.id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(availableUser.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {availableUser.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {availableUser.email}
                            </p>
                          </div>
                          {getRoleBadge(availableUser.role)}
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading || !formData.title || !formData.project_id}>
                  {formLoading ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TaskPriority | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setAssigneeFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {permissions.canCreateTask
                ? 'Create a new task to get started. You can assign tasks to team members and track progress.'
                : 'No tasks assigned to you yet. Your project manager will assign tasks as the production progresses.'}
            </p>
            {permissions.canCreateTask && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <Link href={`/tasks/${task.id}`}>
                          <h3 className="font-semibold hover:text-primary cursor-pointer">
                            {task.title}
                          </h3>
                        </Link>

                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          {/* Status Badge */}
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              task.status
                            )}`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>

                          {/* Priority Badge */}
                          <span className={`text-xs font-medium flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                            <AlertCircle className="h-3 w-3" />
                            {task.priority}
                          </span>

                          {/* Project */}
                          {task.project && (
                            <Link href={`/projects/${task.project.id}`}>
                              <span className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted-foreground/20 cursor-pointer">
                                {task.project.title}
                              </span>
                            </Link>
                          )}

                          {/* Assignee */}
                          {task.assignee && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              👤 {task.assignee.full_name || 'Assigned'}
                            </span>
                          )}

                          {/* Due Date */}
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/tasks/${task.id}`}>
                        <span>✎</span>
                      </Link>
                    </Button>
                    {permissions.canDeleteTask && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
