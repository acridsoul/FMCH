'use client';

// @ts-nocheck

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { createClient } from '@/lib/supabase';
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
import { ArrowLeft, Save } from 'lucide-react';
import type { Project } from '@/types/database';
import Link from 'next/link';
import TeamManagement from '@/components/project/TeamManagement';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pre-production' as 'pre-production' | 'production' | 'post-production' | 'completed',
    budget: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  async function loadProject() {
    if (!user?.id) return;

    console.log('📁 Loading project:', id);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error loading project:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Project not found');
      }

      const projectData: Project = data;

      console.log('✅ Project loaded:', projectData);
      setProject(projectData);
      setFormData({
        title: projectData.title,
        description: projectData.description || '',
        status: projectData.status,
        budget: projectData.budget?.toString() || '',
        start_date: projectData.start_date || '',
        end_date: projectData.end_date || '',
      });
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Failed to load project');
      router.push('/projects');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !project) return;

    console.log('💾 Saving project:', formData);
    setSaving(true);

    try {
      const supabase = createClient();

      // Type assertion needed for Supabase update - updates work correctly at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('projects').update as any)({
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving project:', error);
        throw error;
      }

      console.log('✅ Project saved:', data);
      setProject(data);
      setIsEditing(false);
      alert('Project updated successfully!');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Failed to save project. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Project not found</p>
        <Button asChild className="mt-4">
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? 'Edit Project' : project.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Update project details' : 'Project details and settings'}
            </p>
          </div>
        </div>
        {permissions.canEditProject && (
          <>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>Edit Project</Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      title: project.title,
                      description: project.description || '',
                      status: project.status,
                      budget: project.budget?.toString() || '',
                      start_date: project.start_date || '',
                      end_date: project.end_date || '',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Project Form/Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing && permissions.canEditProject ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
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
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1">{project.description || 'No description provided'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="mt-1 capitalize">{project.status.replace('-', ' ')}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Budget</Label>
                  <p className="mt-1">
                    {project.budget ? `KSh ${project.budget.toLocaleString('en-KE')}` : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p className="mt-1">
                    {project.start_date
                      ? new Date(project.start_date).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p className="mt-1">
                    {project.end_date
                      ? new Date(project.end_date).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-muted-foreground">Created</Label>
                <p className="mt-1 text-sm">
                  {new Date(project.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Management Section */}
      <TeamManagement
        projectId={id}
        projectOwnerId={project.created_by}
        currentUserId={user!.id}
      />

      {/* Future sections */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">View all tasks in the Tasks tab</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Files</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming in Phase 9</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
