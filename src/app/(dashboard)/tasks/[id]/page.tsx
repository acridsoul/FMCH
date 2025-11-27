'use client';

import { useEffect, useState } from 'react';
import { getTaskById, updateTask } from '@/lib/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Save, Calendar, User, AlertCircle } from 'lucide-react';
import type { TaskStatus, TaskPriority, Profile } from '@/types/database';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<{
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
    project?: { id: string; title: string; description: string | null };
    assignee?: Profile;
    creator?: Profile;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    due_date: '',
  });

  useEffect(() => {
    if (taskId) {
      loadTask();
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Real-time updates for this specific task
  useEffect(() => {
    if (!taskId) return;

    const supabase = createClient();

    // Subscribe to changes for this specific task
    const channel = supabase
      .channel(`task-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          console.log('🔄 Real-time task update detected:', payload);
          loadTask();
        }
      )
      .subscribe();

    console.log(`✅ Subscribed to real-time updates for task ${taskId}`);

    return () => {
      console.log(`🔌 Unsubscribing from task ${taskId} updates`);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function loadTask() {
    try {
      const taskData = await getTaskById(taskId);
      if (taskData) {
        // Type assertion - getTaskById returns proper task data or null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typedTaskData = taskData as any;
        setTask(typedTaskData);
        setFormData({
          title: typedTaskData.title,
          description: typedTaskData.description || '',
          assigned_to: typedTaskData.assigned_to || 'unassigned',
          status: typedTaskData.status,
          priority: typedTaskData.priority,
          due_date: typedTaskData.due_date ? typedTaskData.due_date.split('T')[0] : '',
        });
      }
    } catch (error) {
      console.error('❌ Error loading task:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name', { ascending: true });

      setUsers(data || []);
    } catch (error) {
      console.error('❌ Error loading users:', error);
    }
  }

  async function handleSave() {
    if (!taskId) return;

    setSaving(true);
    try {
      const updatedTask = await updateTask(taskId, {
        title: formData.title,
        description: formData.description || null,
        assigned_to: formData.assigned_to && formData.assigned_to !== 'unassigned' ? formData.assigned_to : null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      });

      setTask(updatedTask);
      setEditing(false);
      console.log('✅ Task updated successfully');
    } catch (error) {
      console.error('❌ Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-16 w-16 text-red-600 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Task not found</h3>
            <p className="text-muted-foreground text-center mb-6">
              The task you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
            <Button asChild>
              <Link href="/tasks">Back to Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignee = users.find((u) => u.id === (editing ? formData.assigned_to : task.assigned_to));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Task Details</h1>
          <p className="text-muted-foreground mt-1">View and edit task information</p>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editing ? (
                <div className="space-y-4">
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Task title"
                    className="text-2xl font-bold h-auto py-2"
                  />
                </div>
              ) : (
                <CardTitle className="text-2xl">{task.title}</CardTitle>
              )}
            </div>

            <Button
              variant={editing ? 'default' : 'outline'}
              onClick={() => {
                if (editing) {
                  handleSave();
                } else {
                  setEditing(true);
                }
              }}
              disabled={saving}
            >
              {editing ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </>
              ) : (
                'Edit'
              )}
            </Button>

            {editing && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setFormData({
                    title: task.title,
                    description: task.description || '',
                    assigned_to: task.assigned_to || '',
                    status: task.status,
                    priority: task.priority,
                    due_date: task.due_date ? task.due_date.split('T')[0] : '',
                  });
                }}
                disabled={saving}
                className="ml-2"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status and Priority Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(editing ? formData.status : task.status)}`}>
              {(editing ? formData.status : task.status).replace('_', ' ')}
            </span>
            <span className={`text-sm font-medium flex items-center gap-1 ${getPriorityColor(editing ? formData.priority : task.priority)}`}>
              <AlertCircle className="h-4 w-4" />
              {editing ? formData.priority : task.priority}
            </span>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            {editing ? (
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Task description..."
                rows={4}
              />
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {task.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* Project */}
          {task.project && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Link href={`/projects/${task.project.id}`} className="text-primary hover:underline">
                {task.project.title}
              </Link>
            </div>
          )}

          {/* Grid Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              {editing ? (
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as TaskStatus })
                  }
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
              ) : (
                <p className="text-muted-foreground">{task.status.replace('_', ' ')}</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              {editing ? (
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
              ) : (
                <p className="text-muted-foreground">{task.priority}</p>
              )}
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assigned">
                <User className="h-4 w-4 inline mr-2" />
                Assigned To
              </Label>
              {editing ? (
                <Select
                  value={formData.assigned_to || 'unassigned'}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-muted-foreground">
                  {assignee ? assignee.full_name || assignee.email : 'Unassigned'}
                </p>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due_date">
                <Calendar className="h-4 w-4 inline mr-2" />
                Due Date
              </Label>
              {editing ? (
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              ) : (
                <p className="text-muted-foreground">
                  {task.due_date
                    ? `${new Date(task.due_date).toLocaleDateString()} (${formatDistanceToNow(new Date(task.due_date), { addSuffix: true })})`
                    : 'No due date'}
                </p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
            <p>Created: {new Date(task.created_at).toLocaleString()}</p>
            <p>Last updated: {new Date(task.updated_at).toLocaleString()}</p>
            {task.creator && <p>Created by: {task.creator.full_name || task.creator.email}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
