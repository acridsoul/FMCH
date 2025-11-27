'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { createClient } from '@/lib/supabase';
import { getAllUsers } from '@/lib/users';
import { addProjectMember } from '@/lib/crew';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Plus, FolderKanban, Calendar, DollarSign, Edit, Trash2, Eye, Users } from 'lucide-react';
import type { Project, Profile } from '@/types/database';
import Link from 'next/link';

export default function ProjectsPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pre-production' as 'pre-production' | 'production' | 'post-production' | 'completed',
    budget: '',
    start_date: '',
    end_date: '',
    selectedMembers: [] as string[],
  });

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (createDialogOpen && availableUsers.length === 0) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createDialogOpen]);

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const users = await getAllUsers();
      // Filter out the current user since they'll be auto-added as Project Manager
      setAvailableUsers(users.filter(u => u.id !== user?.id));
    } catch (error) {
      console.error('❌ Error loading users:', error);
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadProjects() {
    if (!user?.id) return;

    console.log('📁 Loading projects for user:', user.id);
    setLoading(true);

    try {
      const supabase = createClient();

      // Fetch projects created by user
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.error('❌ Error loading owned projects:', ownedError);
        throw ownedError;
      }

      // Fetch projects where user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('❌ Error loading member projects:', memberError);
      }

      // Combine owned and member projects
      const allProjects: Project[] = [...(ownedProjects || [])];
      if (memberProjects) {
        memberProjects.forEach((pm: { project_id: string; projects: Project | null }) => {
          if (pm.projects && !allProjects.find((p) => p.id === pm.project_id)) {
            allProjects.push(pm.projects);
          }
        });
      }

      // Sort by created_at descending
      allProjects.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('✅ Projects loaded:', allProjects);
      setProjects(allProjects);
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    console.log('📝 Creating project:', formData);
    setFormLoading(true);

    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('projects').insert as any)([
        {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          created_by: user.id,
        },
      ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating project:', error);
        throw error;
      }

      console.log('✅ Project created:', data);

      // Add project members
      const memberPromises = [];

      // Auto-add creator as "Project Manager"
      memberPromises.push(
        addProjectMember(data.id, user.id, 'Project Manager')
          .catch(err => console.error('Error adding creator as member:', err))
      );

      // Add selected team members as "Team Member"
      formData.selectedMembers.forEach(memberId => {
        memberPromises.push(
          addProjectMember(data.id, memberId, 'Team Member')
            .catch(err => console.error('Error adding team member:', err))
        );
      });

      await Promise.all(memberPromises);
      console.log('✅ Project members added');

      // Add to local state
      setProjects([data, ...projects]);

      // Reset form and close dialog
      setFormData({
        title: '',
        description: '',
        status: 'pre-production',
        budget: '',
        start_date: '',
        end_date: '',
        selectedMembers: [],
      });
      setCreateDialogOpen(false);

      alert(`Project created successfully with ${formData.selectedMembers.length + 1} team member(s)!`);
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    console.log('🗑️ Deleting project:', projectId);

    try {
      const supabase = createClient();
      const { error } = await supabase.from('projects').delete().eq('id', projectId);

      if (error) {
        console.error('❌ Error deleting project:', error);
        throw error;
      }

      console.log('✅ Project deleted');
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Failed to delete project. Please try again.');
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pre-production':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400';
      case 'production':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400';
      case 'post-production':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400';
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

  const toggleMemberSelection = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(userId)
        ? prev.selectedMembers.filter(id => id !== userId)
        : [...prev.selectedMembers, userId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {permissions.isCrew ? 'View your film production projects' : 'Manage your film production projects'}
          </p>
          {permissions.isCrew && (
            <Badge variant="secondary" className="mt-2">
              <Eye className="mr-1 h-3 w-3" />
              Read-Only Access
            </Badge>
          )}
        </div>
        {permissions.canCreateProject && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new film production project to your workspace
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Summer Blockbuster 2025"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the project..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'pre-production' | 'production' | 'post-production' | 'completed') => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-production">Pre-production</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="post-production">Post-production</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (KSH)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Team Members Section */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {formData.selectedMembers.length} selected
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select team members to add to this project. You will be automatically added as Project Manager.
                </p>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading users...</p>
                    </div>
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No other users available to add
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] rounded-md border p-4">
                    <div className="space-y-3">
                      {availableUsers.map((availableUser) => (
                        <label
                          key={availableUser.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                          htmlFor={`member-${availableUser.id}`}
                        >
                          <Checkbox
                            id={`member-${availableUser.id}`}
                            checked={formData.selectedMembers.includes(availableUser.id)}
                            onCheckedChange={() => toggleMemberSelection(availableUser.id)}
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

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {permissions.canCreateProject
                ? 'Get started by creating your first film production project. You can track budget, schedule, and team all in one place.'
                : 'No projects available yet. Contact your admin to be added to a project.'}
            </p>
            {permissions.canCreateProject && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link href={`/projects/${project.id}`}>
                      <CardTitle className="text-lg mb-2 hover:text-primary cursor-pointer">
                        {project.title}
                      </CardTitle>
                    </Link>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {project.status.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {permissions.canEditProject ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/projects/${project.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/projects/${project.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    {permissions.canDeleteProject && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {project.budget && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>KSh ${project.budget.toLocaleString('en-KE')}</span>
                    </div>
                  )}

                  {(project.start_date || project.end_date) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {project.start_date && new Date(project.start_date).toLocaleDateString()}
                        {project.start_date && project.end_date && ' - '}
                        {project.end_date && new Date(project.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
