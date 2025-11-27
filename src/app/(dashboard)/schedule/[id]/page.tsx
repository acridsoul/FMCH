'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Package,
  FileText,
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  Film,
} from 'lucide-react';
import type { Project } from '@/types/database';
import { getScheduleById, updateSchedule, deleteSchedule } from '@/lib/schedules';
import Link from 'next/link';

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;

  const [schedule, setSchedule] = useState<{
    id: string;
    project_id: string;
    scene_number: string | null;
    scene_description: string | null;
    shoot_date: string;
    shoot_time: string | null;
    location: string | null;
    required_crew: string[] | null;
    equipment_needed: string[] | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    project?: { id: string; title: string; description: string | null };
  } | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    project_id: '',
    scene_number: '',
    scene_description: '',
    shoot_date: '',
    shoot_time: '',
    location: '',
    required_crew: '',
    equipment_needed: '',
    notes: '',
  });

  const fetchSchedule = useCallback(async () => {
    try {
      const scheduleData = await getScheduleById(scheduleId);
      
      if (scheduleData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typedSchedule = scheduleData as any;
        setSchedule(typedSchedule);
        setFormData({
          project_id: typedSchedule.project_id,
          scene_number: typedSchedule.scene_number || '',
          scene_description: typedSchedule.scene_description || '',
          shoot_date: typedSchedule.shoot_date,
          shoot_time: typedSchedule.shoot_time || '',
          location: typedSchedule.location || '',
          required_crew: typedSchedule.required_crew ? typedSchedule.required_crew.join(', ') : '',
          equipment_needed: typedSchedule.equipment_needed ? typedSchedule.equipment_needed.join(', ') : '',
          notes: typedSchedule.notes || '',
        });
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      alert('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  const fetchProjects = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get user's profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Fetch projects for the filter and create dialog
      let allProjects: Project[] = [];

      // If user is admin, get projects they created
      if (profile?.role === 'admin') {
        const { data: ownedProjects } = await supabase
          .from('projects')
          .select('*')
          .eq('created_by', user.id);
        allProjects = [...(ownedProjects || [])];
      }

      // If user is department head, get all projects created by admins
      if (profile?.role === 'department_head') {
        // Get all projects and filter by creator role
        const { data: allProjectsData } = await supabase
          .from('projects')
          .select(`
            *,
            creator:profiles!projects_created_by_fkey(role)
          `);

        // Filter to only include projects created by admins
        const adminCreatedProjects = (allProjectsData || []).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => p.creator?.role === 'admin'
        );
        allProjects = adminCreatedProjects;
      }

      // Crew members will only see projects they're members of (handled below)

      // Get projects where user is a member (for all roles)
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .eq('user_id', user.id);

      // Add member projects, avoiding duplicates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberProjects?.forEach((pm: any) => {
        if (pm.projects && !allProjects.find((p) => p.id === pm.project_id)) {
          allProjects.push(pm.projects);
        }
      });

      setProjects(allProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
    fetchProjects();
  }, [fetchSchedule, fetchProjects]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await updateSchedule(scheduleId, {
        project_id: formData.project_id,
        scene_number: formData.scene_number || null,
        scene_description: formData.scene_description || null,
        shoot_date: formData.shoot_date,
        shoot_time: formData.shoot_time || null,
        location: formData.location || null,
        required_crew: formData.required_crew ? formData.required_crew.split(',').map((c) => c.trim()) : null,
        equipment_needed: formData.equipment_needed ? formData.equipment_needed.split(',').map((e) => e.trim()) : null,
        notes: formData.notes || null,
      });

      setIsEditing(false);
      
      // Refetch to get updated data
      await fetchSchedule();
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteSchedule(scheduleId);
      router.push('/schedule');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'Time TBD';
    return timeStr;
  };

  const isUpcoming = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/schedule">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Schedule Not Found</h1>
          </div>
        </div>
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Schedule not found</h3>
            <p className="text-muted-foreground mb-6">
              The schedule you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Link href="/schedule">
              <Button>Back to Schedules</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/schedule">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {schedule.scene_number ? `Scene ${schedule.scene_number}` : 'Schedule Details'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {schedule.project?.title} • {formatDate(schedule.shoot_date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this schedule entry. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Badge */}
      {!isUpcoming(schedule.shoot_date) && (
        <div>
          <Badge variant="secondary" className="bg-muted">
            Past Schedule
          </Badge>
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
                <Label htmlFor="scene_number">Scene Number</Label>
                <Input
                  id="scene_number"
                  value={formData.scene_number}
                  onChange={(e) => setFormData({ ...formData, scene_number: e.target.value })}
                  placeholder="e.g., 1A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Studio A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scene_description">Scene Description</Label>
              <Textarea
                id="scene_description"
                value={formData.scene_description}
                onChange={(e) => setFormData({ ...formData, scene_description: e.target.value })}
                placeholder="Describe the scene..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shoot_date">Shoot Date *</Label>
                <Input
                  id="shoot_date"
                  type="date"
                  value={formData.shoot_date}
                  onChange={(e) => setFormData({ ...formData, shoot_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shoot_time">Shoot Time</Label>
                <Input
                  id="shoot_time"
                  type="time"
                  value={formData.shoot_time}
                  onChange={(e) => setFormData({ ...formData, shoot_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="required_crew">Required Crew</Label>
              <Input
                id="required_crew"
                value={formData.required_crew}
                onChange={(e) => setFormData({ ...formData, required_crew: e.target.value })}
                placeholder="e.g., Director, DP, Sound Engineer (comma-separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment_needed">Equipment Needed</Label>
              <Input
                id="equipment_needed"
                value={formData.equipment_needed}
                onChange={(e) => setFormData({ ...formData, equipment_needed: e.target.value })}
                placeholder="e.g., Camera, Lights, Boom Mic (comma-separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Main Details */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              {schedule.scene_description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Scene Description</h3>
                  <p className="text-base">{schedule.scene_description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Shoot Date</p>
                      <p className="text-base">{formatDate(schedule.shoot_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Shoot Time</p>
                      <p className="text-base">{formatTime(schedule.shoot_time)}</p>
                    </div>
                  </div>

                  {schedule.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Location</p>
                        <p className="text-base">{schedule.location}</p>
                      </div>
                    </div>
                  )}

                  {schedule.scene_number && (
                    <div className="flex items-start gap-3">
                      <Film className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Scene Number</p>
                        <p className="text-base">{schedule.scene_number}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {schedule.required_crew && schedule.required_crew.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Required Crew</p>
                        <div className="flex flex-wrap gap-2">
                          {schedule.required_crew.map((crew, idx) => (
                            <Badge key={idx} variant="secondary">
                              {crew}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {schedule.equipment_needed && schedule.equipment_needed.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Equipment Needed</p>
                        <div className="flex flex-wrap gap-2">
                          {schedule.equipment_needed.map((item, idx) => (
                            <Badge key={idx} variant="outline">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {schedule.notes && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                      <p className="text-base whitespace-pre-wrap">{schedule.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Info */}
          {schedule.project && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Project Information</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Project</p>
                    <Link href={`/projects/${schedule.project.id}`}>
                      <p className="text-base font-medium hover:underline">{schedule.project.title}</p>
                    </Link>
                  </div>
                  {schedule.project.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-base">{schedule.project.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

