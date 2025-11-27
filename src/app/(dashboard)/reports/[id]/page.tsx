'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePermissions, canEditReport, canCommentOnReport } from '@/hooks/usePermissions';
import {
  getReportById,
  updateReport,
  deleteReport,
  getReportComments,
  addReportComment,
  updateReportComment,
  deleteReportComment,
  uploadReportAttachment,
  getReportAttachmentUrl,
} from '@/lib/reports';
import { getProjectMembers } from '@/lib/crew';
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
  ArrowLeft,
  Save,
  Trash2,
  Calendar,
  Clock,
  FileText,
  Loader2,
  Edit,
  Send,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import type { ReportWithDetails, ReportCommentWithProfile, Project, Task } from '@/types/database';
import Link from 'next/link';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const permissions = usePermissions();
  const reportId = params.id as string;

  const [report, setReport] = useState<ReportWithDetails | null>(null);
  const [comments, setComments] = useState<ReportCommentWithProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isProjectManager, setIsProjectManager] = useState(false);

  const [formData, setFormData] = useState({
    project_id: '',
    task_id: '__none__',
    content: '',
    accomplishment_date: '',
    accomplishment_time: '',
    is_manual: false,
    manual_description: '',
    attachment: null as File | null,
    attachmentPreview: null as string | null,
  });

  const [commentContent, setCommentContent] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [attachmentViewUrl, setAttachmentViewUrl] = useState<string | null>(null);
  const [loadingAttachmentUrl, setLoadingAttachmentUrl] = useState(false);

  useEffect(() => {
    if (reportId && user?.id) {
      loadReport();
      loadComments();
      checkProjectManager();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, user?.id]);

  async function loadReport() {
    try {
      const reportData = await getReportById(reportId);
      if (reportData) {
        setReport(reportData);
        setFormData({
          project_id: reportData.project_id,
          task_id: reportData.task_id || '__none__',
          content: reportData.content,
          accomplishment_date: reportData.accomplishment_date,
          accomplishment_time: reportData.accomplishment_time,
          is_manual: reportData.is_manual,
          manual_description: reportData.manual_description || '',
          attachment: null,
          attachmentPreview: reportData.attachment_url || null,
        });

        // Generate signed URL for attachment if it exists
        if (reportData.attachment_url) {
          await loadAttachmentUrl(reportData.attachment_url);
        }

        // Load projects and tasks
        await loadProjects();
        if (reportData.project_id) {
          await loadTasksForProject(reportData.project_id);
        }
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAttachmentUrl(fileUrl: string) {
    setLoadingAttachmentUrl(true);
    try {
      const signedUrl = await getReportAttachmentUrl(fileUrl);
      setAttachmentViewUrl(signedUrl);
    } catch (error) {
      console.error('Error loading attachment URL:', error);
      // Fallback to original URL
      setAttachmentViewUrl(fileUrl);
    } finally {
      setLoadingAttachmentUrl(false);
    }
  }

  async function loadComments() {
    try {
      const commentsData = await getReportComments(reportId);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  async function loadProjects() {
    try {
      const supabase = createClient();
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  async function loadTasksForProject(projectId: string) {
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

  async function checkProjectManager() {
    if (!user?.id || !report) return;

    try {
      const members = await getProjectMembers(report.project_id);
      const isPM = members.some(
        (m) => m.user_id === user.id && m.role === 'Project Manager'
      );
      setIsProjectManager(isPM);
    } catch (error) {
      console.error('Error checking project manager:', error);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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
    if (formData.attachmentPreview && formData.attachment) {
      URL.revokeObjectURL(formData.attachmentPreview);
    }
    setFormData(prev => ({
      ...prev,
      attachment: null,
      attachmentPreview: prev.attachmentPreview && !prev.attachment ? null : prev.attachmentPreview,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!report) return;

    setIsSaving(true);
    setUploadingFile(false);

    try {
      let attachmentUrl = report.attachment_url;
      let attachmentName = report.attachment_name;
      let attachmentSize = report.attachment_size;

      // Upload new file if present
      if (formData.attachment && user?.id) {
        setUploadingFile(true);
        const uploadResult = await uploadReportAttachment(formData.attachment, user.id);
        attachmentUrl = uploadResult.url;
        attachmentName = uploadResult.name;
        attachmentSize = uploadResult.size;
        setUploadingFile(false);
      }

      await updateReport(report.id, {
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
      });

      await loadReport();
      setIsEditing(false);
      alert('Report updated successfully!');
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    } finally {
      setIsSaving(false);
      setUploadingFile(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteReport(reportId);
      router.push('/reports');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
      setIsDeleting(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !commentContent.trim()) return;

    setIsAddingComment(true);
    try {
      await addReportComment(reportId, commentContent, user.id);
      setCommentContent('');
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  }

  async function handleUpdateComment(commentId: string) {
    if (!editingCommentContent.trim()) return;

    try {
      await updateReportComment(commentId, editingCommentContent);
      setEditingCommentId(null);
      setEditingCommentContent('');
      await loadComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteReportComment(commentId);
      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canComment = canCommentOnReport(
    permissions.isAdmin,
    permissions.isDepartmentHead,
    isProjectManager
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Report not found</p>
        <Button asChild className="mt-4">
          <Link href="/reports">Back to Reports</Link>
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
            <Link href="/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Report Details</h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Edit report' : 'View report and comments'}
            </p>
          </div>
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            {canEditReport(report.reported_by, user?.id) && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
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
                        This action cannot be undone. This will permanently delete the report and all its comments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
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
            )}
          </div>
        )}
      </div>

      {/* Report Form/Details */}
      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project_id">Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, project_id: value });
                    loadTasksForProject(value);
                  }}
                  required
                >
                  <SelectTrigger id="project_id">
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
                    <SelectValue />
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
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="content">Report Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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
                {!formData.attachment && !formData.attachmentPreview ? (
                  <div className="flex items-center gap-2">
                    <Input
                      id="attachment"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">Images or PDF, max 5MB</p>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 space-y-2">
                    {formData.attachmentPreview && !formData.attachment ? (
                      <div className="relative">
                        <img
                          src={formData.attachmentPreview}
                          alt="Current attachment"
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
                    ) : formData.attachment ? (
                      <div className="flex items-center gap-2">
                        {formData.attachmentPreview ? (
                          <img
                            src={formData.attachmentPreview}
                            alt="Preview"
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <FileText className="h-12 w-12" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{formData.attachment.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(formData.attachment.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={removeAttachment}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    loadReport();
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving || uploadingFile}>
                  {uploadingFile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : isSaving ? (
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
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {report.reporter && (
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(report.reporter.full_name)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">
                      {report.reporter?.full_name || 'Unknown User'}
                    </h3>
                    {report.project && (
                      <Badge variant="secondary">{report.project.title}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{report.content}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Accomplishment Date & Time</Label>
                  <p className="mt-1">
                    {format(new Date(report.accomplishment_date), 'MMM d, yyyy')} at{' '}
                    {report.accomplishment_time}
                  </p>
                </div>

                {report.task && (
                  <div>
                    <Label className="text-muted-foreground">Related Task</Label>
                    <p className="mt-1">{report.task.title}</p>
                  </div>
                )}

                {report.is_manual && report.manual_description && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Manual Description</Label>
                    <p className="mt-1">{report.manual_description}</p>
                  </div>
                )}

                {report.attachment_url && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Attachment</Label>
                    <div className="mt-2">
                      {loadingAttachmentUrl ? (
                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading attachment...</span>
                        </div>
                      ) : attachmentViewUrl ? (
                        <a
                          href={attachmentViewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          {report.attachment_name?.includes('.pdf') || report.attachment_url.includes('.pdf') ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )}
                          <span>{report.attachment_name || 'View Attachment'}</span>
                          {report.attachment_size && (
                            <span className="text-xs text-muted-foreground">
                              ({(report.attachment_size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          )}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">Attachment unavailable</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="col-span-2 pt-4 border-t">
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="mt-1 text-sm">
                    {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Comments ({comments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-0">
                {comment.commenter && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(comment.commenter.full_name)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium">
                        {comment.commenter?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {comment.commenter_id === user?.id && editingCommentId !== comment.id && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingCommentContent(comment.content);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingCommentContent}
                        onChange={(e) => setEditingCommentContent(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateComment(comment.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingCommentContent('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm">{comment.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment Form */}
          {canComment && (
            <form onSubmit={handleAddComment} className="pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="comment">Add Comment</Label>
                <Textarea
                  id="comment"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button type="submit" disabled={isAddingComment || !commentContent.trim()}>
                  {isAddingComment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Add Comment
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

