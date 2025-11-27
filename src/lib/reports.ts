import { createClient } from '@/lib/supabase';
import { storage } from '@/lib/supabase';
import type { Report, ReportComment, ReportWithDetails, ReportCommentWithProfile } from '@/types/database';

const REPORTS_BUCKET = 'reports';

/**
 * Validate file for upload (images + PDFs, max 5MB)
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File must be an image (JPEG, PNG, GIF, WebP) or PDF' };
  }

  return { valid: true };
}

/**
 * Upload a report attachment to Supabase Storage
 */
export async function uploadReportAttachment(
  file: File,
  userId: string
): Promise<{ url: string; name: string; size: number }> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const supabase = createClient();
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await storage.uploadFile(REPORTS_BUCKET, fileName, file);

  if (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }

  // Use public URL - if bucket is private, we'll generate signed URLs when viewing
  const publicUrl = storage.getPublicUrl(REPORTS_BUCKET, fileName);

  return {
    url: publicUrl,
    name: file.name,
    size: file.size,
  };
}

/**
 * Get signed URL for viewing a report attachment
 */
export async function getReportAttachmentUrl(fileUrl: string): Promise<string> {
  const supabase = createClient();
  
  // Extract path from URL
  // URL format: https://[project].supabase.co/storage/v1/object/public/reports/[userId]/[filename]
  let path = fileUrl;
  
  if (fileUrl.includes('/storage/v1/object/public/')) {
    // Extract everything after /storage/v1/object/public/reports/
    const parts = fileUrl.split('/storage/v1/object/public/');
    if (parts.length > 1) {
      // Remove the bucket name prefix to get just the path
      const fullPath = parts[1];
      if (fullPath.startsWith(`${REPORTS_BUCKET}/`)) {
        path = fullPath.substring(REPORTS_BUCKET.length + 1); // +1 for the slash
      } else {
        path = fullPath;
      }
    }
  } else if (fileUrl.includes(`${REPORTS_BUCKET}/`)) {
    // If it's a partial URL with bucket name
    const index = fileUrl.indexOf(`${REPORTS_BUCKET}/`);
    path = fileUrl.substring(index + REPORTS_BUCKET.length + 1);
  }

  // Try to get signed URL (works for private buckets)
  const { data: signedData, error: signedError } = await storage.getSignedUrl(REPORTS_BUCKET, path, 3600);
  
  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  // Fallback to public URL if signed URL fails
  return fileUrl;
}

/**
 * Delete a report attachment from storage
 */
export async function deleteReportAttachment(fileUrl: string): Promise<void> {
  const supabase = createClient();
  
  // Extract path from full Supabase Storage URL
  // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  let path = fileUrl;
  
  // If it's a full URL, extract the path after the bucket name
  if (fileUrl.includes('/storage/v1/object/public/')) {
    const parts = fileUrl.split('/storage/v1/object/public/');
    if (parts.length > 1) {
      path = parts[1].replace(`${REPORTS_BUCKET}/`, '');
    }
  } else if (fileUrl.includes(`${REPORTS_BUCKET}/`)) {
    // If it's a partial URL with bucket name
    path = fileUrl.split(`${REPORTS_BUCKET}/`)[1];
  }

  const { error } = await storage.deleteFile(REPORTS_BUCKET, path);
  if (error) {
    console.error('Error deleting file:', error);
    // Don't throw - file deletion failure shouldn't block report deletion
    console.warn('Failed to delete attachment file, but continuing with report deletion');
  }
}

/**
 * Get all reports for a specific user (crew member's own reports)
 */
export async function getUserReports(userId: string): Promise<ReportWithDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reported_by_fkey(id, full_name, email, avatar_url, role),
      project:projects(id, title, description),
      task:tasks(id, title)
    `)
    .eq('reported_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user reports:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any;
}

/**
 * Get all reports (for admins and department heads)
 */
export async function getAllReports(filters?: {
  userId?: string;
  projectId?: string;
  taskId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ReportWithDetails[]> {
  const supabase = createClient();

  let query = supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reported_by_fkey(id, full_name, email, avatar_url, role),
      project:projects(id, title, description),
      task:tasks(id, title)
    `);

  if (filters?.userId) {
    query = query.eq('reported_by', filters.userId);
  }

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId);
  }

  if (filters?.taskId) {
    query = query.eq('task_id', filters.taskId);
  }

  if (filters?.startDate) {
    query = query.gte('accomplishment_date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('accomplishment_date', filters.endDate);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all reports:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any;
}

/**
 * Get a single report by ID with all details
 */
export async function getReportById(reportId: string): Promise<ReportWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reported_by_fkey(id, full_name, email, avatar_url, role),
      project:projects(id, title, description),
      task:tasks(id, title)
    `)
    .eq('id', reportId)
    .single();

  if (error) {
    console.error('Error fetching report:', error);
    return null;
  }

  // Get comments for this report
  const comments = await getReportComments(reportId);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...(data as any), comments };
}

/**
 * Create a new report
 */
export async function createReport(
  report: Omit<Report, 'id' | 'created_at' | 'updated_at'>,
  userId: string
): Promise<Report> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('reports').insert as any)({
    ...report,
    reported_by: userId,
  })
    .select()
    .single();

  if (error) {
    console.error('Error creating report:', error);
    throw error;
  }

  // Create notifications for admins, department heads, and project managers
  await createReportNotifications(data.id, report.project_id, userId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Update an existing report
 */
export async function updateReport(
  reportId: string,
  updates: Partial<Omit<Report, 'id' | 'reported_by' | 'created_at' | 'updated_at'>>
): Promise<Report> {
  const supabase = createClient();

  // If updating attachment, delete old one first
  if (updates.attachment_url) {
    const { data: oldReport } = await supabase
      .from('reports')
      .select('attachment_url')
      .eq('id', reportId)
      .single();

    if (oldReport?.attachment_url && oldReport.attachment_url !== updates.attachment_url) {
      try {
        await deleteReportAttachment(oldReport.attachment_url);
      } catch (error) {
        console.error('Error deleting old attachment:', error);
        // Continue even if deletion fails
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('reports').update as any)(updates)
    .eq('id', reportId)
    .select()
    .single();

  if (error) {
    console.error('Error updating report:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string): Promise<void> {
  const supabase = createClient();

  // Get report to delete attachment
  const { data: report } = await supabase
    .from('reports')
    .select('attachment_url')
    .eq('id', reportId)
    .single();

  // Delete attachment if exists
  if (report?.attachment_url) {
    try {
      await deleteReportAttachment(report.attachment_url);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      // Continue even if deletion fails
    }
  }

  // Delete report (comments will be cascade deleted)
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId);

  if (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}

/**
 * Get comments for a report
 */
export async function getReportComments(reportId: string): Promise<ReportCommentWithProfile[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('report_comments')
    .select(`
      *,
      commenter:profiles!report_comments_commenter_id_fkey(id, full_name, email, avatar_url, role)
    `)
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching report comments:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any;
}

/**
 * Add a comment to a report
 */
export async function addReportComment(
  reportId: string,
  content: string,
  userId: string
): Promise<ReportComment> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('report_comments').insert as any)({
    report_id: reportId,
    commenter_id: userId,
    content,
  })
    .select()
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Update a report comment
 */
export async function updateReportComment(
  commentId: string,
  content: string
): Promise<ReportComment> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('report_comments').update as any)({ content })
    .eq('id', commentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating comment:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Delete a report comment
 */
export async function deleteReportComment(commentId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('report_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Create notifications when a report is submitted
 */
async function createReportNotifications(
  reportId: string,
  projectId: string,
  reporterId: string
): Promise<void> {
  const supabase = createClient();

  // Get reporter info
  const { data: reporter } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', reporterId)
    .single();

  // Get project info
  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', projectId)
    .single();

  const reporterName = reporter?.full_name || 'A crew member';
  const projectName = project?.title || 'a project';

  // Get all admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  // Get all department heads
  const { data: deptHeads } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'department_head');

  // Get project managers for this project
  const { data: projectManagers } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('role', 'Project Manager');

  // Combine all user IDs to notify
  const userIdsToNotify = new Set<string>();
  
  admins?.forEach((admin) => userIdsToNotify.add(admin.id));
  deptHeads?.forEach((deptHead) => userIdsToNotify.add(deptHead.id));
  projectManagers?.forEach((pm) => userIdsToNotify.add(pm.user_id));

  // Create notifications
  const notifications = Array.from(userIdsToNotify).map((userId) => ({
    user_id: userId,
    project_id: projectId,
    notification_type: 'report_submitted',
    title: 'New Report Submitted',
    message: `${reporterName} submitted a report for ${projectName}`,
    related_entity_id: reportId,
    related_entity_type: 'report',
    is_read: false,
    severity: 'info',
    action_required: false,
    action_url: `/reports/${reportId}`,
  }));

  if (notifications.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('notifications').insert as any)(notifications);

    if (error) {
      console.error('Error creating notifications:', error);
      // Don't throw - notifications are not critical
    }
  }
}

