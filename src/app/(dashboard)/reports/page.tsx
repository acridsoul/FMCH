'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getUserReports, getAllReports, createReport, deleteReport, uploadReportAttachment } from '@/lib/reports';
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
import {
  ClipboardList,
  Plus,
  Trash2,
  Calendar,
  Clock,
  FileText,
  Eye,
  Loader2,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import type { Project, Task, ReportWithDetails } from '@/types/database';
import Link from 'next/link';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function ReportsPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Filters (for admin/dept head view)
  const [userFilter, setUserFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    project_id: '',
    task_id: '__none__',
    content: '',
    accomplishment_date: format(new Date(), 'yyyy-MM-dd'),
    accomplishment_time: format(new Date(), 'HH:mm'),
    is_manual: false,
    manual_description: '',
    attachment: null as File | null,
    attachmentPreview: null as string | null,
  });

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && !loading) {
      loadReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFilter, projectFilter, dateFilter]);

  async function loadData() {
    if (!user?.id) return;
    setLoading(true);

    try {
      const supabase = createClient();

      // Load projects user is member of (for crew) or all projects (for admins/dept heads)
      if (permissions.isCrew) {
        const { data: ownedProjects } = await supabase
          .from('projects')
          .select('*')
          .eq('created_by', user.id);

        const { data: memberProjects } = await supabase
          .from('project_members')
          .select('project_id, projects(*)')
          .eq('user_id', user.id);

        const allProjects: Project[] = [...(ownedProjects || [])];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        memberProjects?.forEach((pm: any) => {
          if (pm.projects && !allProjects.find((p) => p.id === pm.project_id)) {
            allProjects.push(pm.projects);
          }
        });
        setProjects(allProjects);
      } else {
        // For admins/dept heads, get all projects
        const { data: allProjects } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        setProjects(allProjects || []);
      }

      await loadReports();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReports() {
    if (!user?.id) return;

    try {
      if (permissions.isCrew) {
        const userReports = await getUserReports(user.id);
        setReports(userReports);
      } else {
        const filters: any = {};
        if (userFilter !== 'all') filters.userId = userFilter;
        if (projectFilter !== 'all') filters.projectId = projectFilter;
        if (dateFilter === 'today') {
          filters.startDate = format(new Date(), 'yyyy-MM-dd');
          filters.endDate = format(new Date(), 'yyyy-MM-dd');
        } else if (dateFilter === 'week') {
          const today = new Date();
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          filters.startDate = format(today, 'yyyy-MM-dd');
          filters.endDate = format(nextWeek, 'yyyy-MM-dd');
        } else if (dateFilter === 'month') {
          const today = new Date();
          const nextMonth = new Date(today);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          filters.startDate = format(today, 'yyyy-MM-dd');
          filters.endDate = format(nextMonth, 'yyyy-MM-dd');
        }
        const allReports = await getAllReports(filters);
        setReports(allReports);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }

  // Load tasks when project is selected
  useEffect(() => {
    if (formData.project_id && formData.project_id !== '') {
      loadTasksForProject(formData.project_id);
    } else {
      setTasks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.project_id]);

  async function loadTasksForProject(projectId: string) {
    if (!user?.id) return;

    try {
      const supabase = createClient();
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      alert('File must be an image (JPEG, PNG, GIF, WebP) or PDF');
      return;
    }

    setFormData(prev => ({
      ...prev,
      attachment: file,
      attachmentPreview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
  }

  function removeAttachment() {
    if (formData.attachmentPreview) {
      URL.revokeObjectURL(formData.attachmentPreview);
    }
    setFormData(prev => ({
      ...prev,
      attachment: null,
      attachmentPreview: null,
    }));
  }

  async function handleCreateReport(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !formData.project_id || !formData.content) return;

    setIsCreating(true);
    setUploadingFile(false);

    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentSize: number | null = null;

      // Upload file if present
      if (formData.attachment) {
        setUploadingFile(true);
        const uploadResult = await uploadReportAttachment(formData.attachment, user.id);
        attachmentUrl = uploadResult.url;
        attachmentName = uploadResult.name;
        attachmentSize = uploadResult.size;
        setUploadingFile(false);
      }

      await createReport(
        {
          project_id: formData.project_id,
          task_id: formData.task_id === '__none__' ? null : formData.task_id,
          content: formData.content,
          accomplishment_date: formData.accomplishment_date,
          accomplishment_time: formData.accomplishment_time,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_size: attachmentSize,
          is_manual: formData.is_manual,
          manual_description: formData.is_manual ? formData.manual_description : null,
          reported_by: user.id,
        },
        user.id
      );

      // Reset form
      setFormData({
        project_id: '',
        task_id: '__none__',
        content: '',
        accomplishment_date: format(new Date(), 'yyyy-MM-dd'),
        accomplishment_time: format(new Date(), 'HH:mm'),
        is_manual: false,
        manual_description: '',
        attachment: null,
        attachmentPreview: null,
      });

      setCreateDialogOpen(false);
      await loadReports();
      alert('Report created successfully!');
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Failed to create report. Please try again.');
    } finally {
      setIsCreating(false);
      setUploadingFile(false);
    }
  }

  async function handleDeleteReport(reportId: string) {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      await deleteReport(reportId);
      await loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  }

  // Filter reports by search query
  const filteredReports = reports.filter((report) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.content?.toLowerCase().includes(query) ||
      report.project?.title.toLowerCase().includes(query) ||
      report.reporter?.full_name?.toLowerCase().includes(query) ||
      report.reporter?.email.toLowerCase().includes(query)
    );
  });

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">
            {permissions.isCrew
              ? 'Submit and manage your daily accomplishment reports'
              : 'View and manage crew member reports'}
          </p>
          {permissions.isCrew && (
            <Badge variant="secondary" className="mt-2">
              <Eye className="mr-1 h-3 w-3" />
              View and edit your reports
            </Badge>
          )}
        </div>
        {permissions.canCreateReport && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Report</DialogTitle>
                <DialogDescription>Submit a daily accomplishment report</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateReport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project_id">Project *</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    required
                  >
                    <SelectTrigger id="project_id">
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

                <div className="space-y-2">
                  <Label htmlFor="task_id">Task (Optional)</Label>
                  <Select
                    value={formData.task_id}
                    onValueChange={(value) => {
                      const isManual = value === '__manual__';
                      setFormData({
                        ...formData,
                        task_id: isManual ? '__none__' : value,
                        is_manual: isManual,
                      });
                    }}
                  >
                    <SelectTrigger id="task_id">
                      <SelectValue placeholder="Select task or choose manual" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      <SelectItem value="__manual__">Manual Entry</SelectItem>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.is_manual && (
                  <div className="space-y-2">
                    <Label htmlFor="manual_description">Manual Description</Label>
                    <Input
                      id="manual_description"
                      value={formData.manual_description}
                      onChange={(e) =>
                        setFormData({ ...formData, manual_description: e.target.value })
                      }
                      placeholder="Describe what you accomplished..."
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="content">Report Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Describe what you accomplished today..."
                    rows={6}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accomplishment_date">Accomplishment Date *</Label>
                    <Input
                      id="accomplishment_date"
                      type="date"
                      value={formData.accomplishment_date}
                      onChange={(e) =>
                        setFormData({ ...formData, accomplishment_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accomplishment_time">Accomplishment Time *</Label>
                    <Input
                      id="accomplishment_time"
                      type="time"
                      value={formData.accomplishment_time}
                      onChange={(e) =>
                        setFormData({ ...formData, accomplishment_time: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attachment">Attachment (Optional)</Label>
                  {!formData.attachment ? (
                    <div className="flex items-center gap-2">
                      <Input
                        id="attachment"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        Images or PDF, max 5MB
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 space-y-2">
                      {formData.attachmentPreview ? (
                        <div className="relative">
                          <img
                            src={formData.attachmentPreview}
                            alt="Preview"
                            className="max-w-full h-48 object-contain rounded"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={removeAttachment}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <FileText className="h-8 w-8" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{formData.attachment.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(formData.attachment.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={removeAttachment}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || uploadingFile}>
                    {uploadingFile ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Report'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters (for admin/dept head view) */}
      {!permissions.isCrew && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
              />
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
                  setUserFilter('all');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No reports found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {permissions.canCreateReport
                ? 'Create your first report to track your daily accomplishments.'
                : 'No reports have been submitted yet.'}
            </p>
            {permissions.canCreateReport && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Report
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      {report.reporter && (
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {getInitials(report.reporter.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/reports/${report.id}`}>
                            <h3 className="font-semibold hover:text-primary cursor-pointer">
                              {report.reporter?.full_name || 'Unknown User'}
                            </h3>
                          </Link>
                          {report.project && (
                            <Badge variant="secondary">{report.project.title}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {report.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(report.accomplishment_date), 'MMM d, yyyy')} at{' '}
                            {report.accomplishment_time}
                          </span>
                          {report.task && (
                            <span className="flex items-center gap-1">
                              <ClipboardList className="h-3 w-3" />
                              {report.task.title}
                            </span>
                          )}
                          {report.attachment_url && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Attachment
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/reports/${report.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    {permissions.isCrew && report.reported_by === user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleDeleteReport(report.id)}
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

