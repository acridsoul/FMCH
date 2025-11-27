import { createClient } from '@/lib/supabase';
import type { File, FileType, Project } from '@/types/database';

/**
 * Extended File type with project information
 */
export interface FileWithProject extends File {
  project?: Project;
  uploader?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

/**
 * Get all files the user has access to
 * Includes files from owned projects and projects they're members of
 */
export async function getUserFiles(userId: string): Promise<FileWithProject[]> {
  const supabase = createClient();

  // Get projects the user owns
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId);

  // Get projects the user is a member of
  const { data: memberProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  // Combine project IDs
  const projectIds = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(ownedProjects?.map((p: any) => p.id) || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(memberProjects?.map((pm: any) => pm.project_id) || []),
  ];

  if (projectIds.length === 0) {
    return [];
  }

  // Get files for these projects
  const { data: files, error } = await supabase
    .from('files')
    .select(`
      *,
      project:projects(id, title, description),
      uploader:profiles!files_uploaded_by_fkey(id, full_name, email)
    `)
    .in('project_id', projectIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching files:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return files as any;
}

/**
 * Get files for a specific project
 */
export async function getProjectFiles(projectId: string): Promise<FileWithProject[]> {
  const supabase = createClient();

  const { data: files, error } = await supabase
    .from('files')
    .select(`
      *,
      project:projects(id, title, description),
      uploader:profiles!files_uploaded_by_fkey(id, full_name, email)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching project files:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return files as any;
}

/**
 * Get a single file by ID
 */
export async function getFileById(fileId: string): Promise<FileWithProject | null> {
  const supabase = createClient();

  const { data: file, error } = await supabase
    .from('files')
    .select(`
      *,
      project:projects(id, title, description),
      uploader:profiles!files_uploaded_by_fkey(id, full_name, email)
    `)
    .eq('id', fileId)
    .single();

  if (error) {
    console.error('Error fetching file:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return file as any;
}

/**
 * Create a new file entry
 */
export async function createFile(
  file: Omit<File, 'id' | 'created_at'>,
  userId: string
): Promise<File> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('files').insert as any)({
    ...file,
    uploaded_by: userId,
  })
    .select()
    .single();

  if (error) {
    console.error('Error creating file:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Update a file entry
 */
export async function updateFile(
  fileId: string,
  updates: Partial<Omit<File, 'id' | 'uploaded_by' | 'created_at'>>
): Promise<File> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('files').update as any)(updates)
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    console.error('Error updating file:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/**
 * Delete a file entry
 */
export async function deleteFile(fileId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('files').delete().eq('id', fileId);

  if (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Get file statistics for a project
 */
export async function getProjectFileStats(projectId: string): Promise<{
  totalFiles: number;
  totalSize: number;
  byType: Record<FileType, number>;
}> {
  const files = await getProjectFiles(projectId);

  const totalFiles = files.length;
  const totalSize = files.reduce((sum, file) => sum + Number(file.file_size || 0), 0);

  const byType: Record<FileType, number> = {
    script: 0,
    contract: 0,
    call_sheet: 0,
    other: 0,
  };

  files.forEach((file) => {
    if (file.file_type) {
      byType[file.file_type] = (byType[file.file_type] || 0) + 1;
    }
  });

  return {
    totalFiles,
    totalSize,
    byType,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get file icon based on type or extension
 */
export function getFileIcon(fileType: FileType | null, fileName: string): string {
  if (fileType === 'script') return '📝';
  if (fileType === 'contract') return '📄';
  if (fileType === 'call_sheet') return '📋';
  
  const ext = getFileExtension(fileName);
  
  // Common file types
  if (['pdf'].includes(ext)) return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return '🎬';
  if (['mp3', 'wav', 'aac'].includes(ext)) return '🎵';
  if (['zip', 'rar', '7z'].includes(ext)) return '📦';
  
  return '📎';
}

