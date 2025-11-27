'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelectEquipment } from '@/components/ui/multi-select-equipment';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Package,
  Plus,
  Search,
  Film,
  Loader2,
  Eye,
} from 'lucide-react';
import type { ScheduleWithProject, Project, Profile } from '@/types/database';
import { getUserSchedules, createSchedule } from '@/lib/schedules';
import { getAvailableUsers } from '@/lib/tasks';
import { SCENE_NUMBERS, FILM_LOCATIONS } from '@/constants/schedule';
import Link from 'next/link';

export default function SchedulePage() {
  const permissions = usePermissions();
  const [schedules, setSchedules] = useState<ScheduleWithProject[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<ScheduleWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // Form data
  const [formData, setFormData] = useState({
    project_id: '',
    scene_number: '',
    scene_description: '',
    shoot_date: '',
    shoot_time: '',
    location: '',
    selectedCrew: [] as string[],
    equipment_needed: [] as string[],
    notes: '',
  });

  const filterSchedules = useCallback(() => {
    let filtered = [...schedules];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (schedule) =>
          schedule.scene_number?.toLowerCase().includes(query) ||
          schedule.scene_description?.toLowerCase().includes(query) ||
          schedule.location?.toLowerCase().includes(query) ||
          schedule.project?.title.toLowerCase().includes(query)
      );
    }

    // Project filter
    if (projectFilter && projectFilter !== 'all') {
      filtered = filtered.filter((schedule) => schedule.project_id === projectFilter);
    }

    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFilter === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      filtered = filtered.filter((schedule) => schedule.shoot_date === todayStr);
    } else if (dateFilter === 'week') {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      filtered = filtered.filter(
        (schedule) => schedule.shoot_date >= todayStr && schedule.shoot_date <= nextWeekStr
      );
    } else if (dateFilter === 'month') {
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      filtered = filtered.filter(
        (schedule) => schedule.shoot_date >= todayStr && schedule.shoot_date <= nextMonthStr
      );
    } else if (dateFilter === 'past') {
      const todayStr = today.toISOString().split('T')[0];
      filtered = filtered.filter((schedule) => schedule.shoot_date < todayStr);
    }

    setFilteredSchedules(filtered);
  }, [schedules, searchQuery, projectFilter, dateFilter]);

  useEffect(() => {
    filterSchedules();
  }, [filterSchedules]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isCreateDialogOpen && availableUsers.length === 0) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateDialogOpen]);

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const users = await getAvailableUsers();
      setAvailableUsers(users);
    } catch (error) {
      console.error('❌ Error loading users:', error);
    } finally {
      setUsersLoading(false);
    }
  }

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch schedules
      const schedulesData = await getUserSchedules(user.id);
      setSchedules(schedulesData);

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

      // Subscribe to real-time updates
      const channel = supabase
        .channel('schedules-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'schedules',
          },
          async () => {
            // Refetch schedules when changes occur
            const updatedSchedules = await getUserSchedules(user.id);
            setSchedules(updatedSchedules);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');

      await createSchedule(
        {
          project_id: formData.project_id,
          scene_number: formData.scene_number || null,
          scene_description: formData.scene_description || null,
          shoot_date: formData.shoot_date,
          shoot_time: formData.shoot_time || null,
          location: formData.location || null,
          required_crew: formData.selectedCrew.length > 0 ? formData.selectedCrew : null,
          equipment_needed: formData.equipment_needed.length > 0 ? formData.equipment_needed : null,
          notes: formData.notes || null,
          created_by: user.id,
        },
        user.id
      );

      // Reset form
      setFormData({
        project_id: '',
        scene_number: '',
        scene_description: '',
        shoot_date: '',
        shoot_time: '',
        location: '',
        selectedCrew: [],
        equipment_needed: [],
        notes: '',
      });

      setIsCreateDialogOpen(false);
      
      // Refresh schedules
      const updatedSchedules = await getUserSchedules(user.id);
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Failed to create schedule');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  const toggleCrewSelection = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCrew: prev.selectedCrew.includes(userId)
        ? prev.selectedCrew.filter(id => id !== userId)
        : [...prev.selectedCrew, userId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground mt-1">
            {permissions.isCrew ? 'View shooting schedules and call sheets' : 'Plan shooting schedules and call sheets'}
          </p>
          {permissions.isCrew && (
            <Badge variant="secondary" className="mt-2">
              <Eye className="mr-1 h-3 w-3" />
              Read-Only Access
            </Badge>
          )}
        </div>
        {permissions.canCreateSchedule && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Schedule</DialogTitle>
              <DialogDescription>Add a new shooting schedule entry</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project_id">Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
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
                  <Select
                    value={formData.scene_number || '__none__'}
                    onValueChange={(value) => setFormData({ ...formData, scene_number: value === '__none__' ? '' : value })}
                  >
                    <SelectTrigger id="scene_number">
                      <SelectValue placeholder="Select scene number (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {SCENE_NUMBERS.map((scene) => (
                        <SelectItem key={scene} value={scene}>
                          {scene}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={formData.location || '__none__'}
                    onValueChange={(value) => setFormData({ ...formData, location: value === '__none__' ? '' : value })}
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select location (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {FILM_LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    required
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

              {/* Required Crew Section - Multi-select */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Required Crew
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {formData.selectedCrew.length} selected
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select team members required for this shoot.
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
                    No users available
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] rounded-md border p-4">
                    <div className="space-y-3">
                      {availableUsers.map((availableUser) => (
                        <label
                          key={availableUser.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                          htmlFor={`crew-${availableUser.id}`}
                        >
                          <Checkbox
                            id={`crew-${availableUser.id}`}
                            checked={formData.selectedCrew.includes(availableUser.id)}
                            onCheckedChange={() => toggleCrewSelection(availableUser.id)}
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
                <Label htmlFor="equipment_needed">Equipment Needed</Label>
                <MultiSelectEquipment
                  selected={formData.equipment_needed}
                  onChange={(equipment) => setFormData({ ...formData, equipment_needed: equipment })}
                  placeholder="Select equipment from list..."
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Schedule'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schedules..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-filter">Project</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger id="project-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-filter">Date Range</Label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger id="date-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Next 7 Days</SelectItem>
                <SelectItem value="month">Next 30 Days</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setProjectFilter('all');
                setDateFilter('all');
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Schedules List */}
      {filteredSchedules.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {schedules.length === 0 ? 'No schedules yet' : 'No schedules match your filters'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {schedules.length === 0
                ? permissions.canCreateSchedule
                  ? 'Create your first shooting schedule to start planning your production.'
                  : 'No shooting schedules available yet. Check back here for call sheets and production schedules.'
                : 'Try adjusting your filters to see more schedules.'}
            </p>
            {schedules.length === 0 && permissions.canCreateSchedule && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Schedule
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSchedules.map((schedule) => (
            <Link key={schedule.id} href={`/schedule/${schedule.id}`}>
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {schedule.scene_number && (
                            <Badge variant="outline" className="font-mono">
                              <Film className="h-3 w-3 mr-1" />
                              Scene {schedule.scene_number}
                            </Badge>
                          )}
                          <Badge variant="secondary">{schedule.project?.title}</Badge>
                          {!isUpcoming(schedule.shoot_date) && (
                            <Badge variant="secondary" className="bg-muted">
                              Past
                            </Badge>
                          )}
                        </div>
                        {schedule.scene_description && (
                          <p className="text-sm font-medium mb-2">{schedule.scene_description}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(schedule.shoot_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(schedule.shoot_time)}</span>
                      </div>
                      {schedule.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{schedule.location}</span>
                        </div>
                      )}
                      {schedule.required_crew && schedule.required_crew.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{schedule.required_crew.length} crew</span>
                        </div>
                      )}
                    </div>

                    {schedule.equipment_needed && schedule.equipment_needed.length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {schedule.equipment_needed.slice(0, 3).map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                          {schedule.equipment_needed.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{schedule.equipment_needed.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
