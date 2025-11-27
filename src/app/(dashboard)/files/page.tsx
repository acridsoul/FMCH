'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { createClient } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Plus,
  Search,
  Loader2,
  ExternalLink,
  Trash2,
  FolderOpen,
  Eye,
} from 'lucide-react';
import type { Project, FileType } from '@/types/database';
import {
  getUserFiles,
  createFile,
  deleteFile,
  formatFileSize,
  getFileIcon,
  type FileWithProject,
} from '@/lib/files';

const FILE_TYPE_LABELS: Record<FileType, string> = {
  script: 'Script',
  contract: 'Contract',
  call_sheet: 'Call Sheet',
  other: 'Other',
};

const FILE_TYPE_COLORS: Record<FileType, string> = {
  script: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  contract: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  call_sheet: 'bg-green-500/10 text-green-700 dark:text-green-400',
  other: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
};

export default function FilesPage() {
  const permissions = usePermissions();
  const [files, setFiles] = useState<FileWithProject[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Form data
  const [formData, setFormData] = useState({
    project_id: '',
    file_name: '',
    file_type: '' as FileType | '',
    file_url: '',
    file_size: '',
  });

  // Calculate totals
  const totalFiles = filteredFiles.length;
  const totalSize = filteredFiles.reduce((sum, file) => sum + Number(file.file_size || 0), 0);

  useEffect(() => {
    fetchData();
  }, []);

  const filterFiles = useCallback(() => {
    let filtered = [...files];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (file) =>
          file.file_name.toLowerCase().includes(query) ||
          file.project?.title.toLowerCase().includes(query) ||
          FILE_TYPE_LABELS[file.file_type as FileType]?.toLowerCase().includes(query)
      );
    }

    // Project filter
    if (projectFilter && projectFilter !== 'all') {
      filtered = filtered.filter((file) => file.project_id === projectFilter);
    }

    // Type filter
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter((file) => file.file_type === typeFilter);
    }

    setFilteredFiles(filtered);
  }, [files, searchQuery, projectFilter, typeFilter]);

  useEffect(() => {
    filterFiles();
  }, [filterFiles]);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch files
      const filesData = await getUserFiles(user.id);
      setFiles(filesData);

      // Fetch projects for the filter and create dialog
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

      // Subscribe to real-time updates
      const channel = supabase
        .channel('files-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'files',
          },
          async () => {
            const updatedFiles = await getUserFiles(user.id);
            setFiles(updatedFiles);
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

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');

      await createFile(
        {
          project_id: formData.project_id,
          file_name: formData.file_name,
          file_type: formData.file_type as FileType,
          file_url: formData.file_url,
          file_size: formData.file_size ? parseInt(formData.file_size) : null,
          uploaded_by: user.id,
        },
        user.id
      );

      // Reset form
      setFormData({
        project_id: '',
        file_name: '',
        file_type: '',
        file_url: '',
        file_size: '',
      });

      setIsAddDialogOpen(false);

      // Refresh files
      const updatedFiles = await getUserFiles(user.id);
      setFiles(updatedFiles);
    } catch (error) {
      console.error('Error adding file:', error);
      alert('Failed to add file');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFile(fileId);

      // Refresh files
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const updatedFiles = await getUserFiles(user.id);
        setFiles(updatedFiles);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-muted-foreground mt-1">
            {permissions.isCrew ? 'View scripts, contracts, and documents' : 'Manage scripts, contracts, and documents'}
          </p>
          {permissions.isCrew && (
            <Badge variant="secondary" className="mt-2">
              <Eye className="mr-1 h-3 w-3" />
              Read-Only Access
            </Badge>
          )}
        </div>
        {permissions.canUploadFile && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add File
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New File</DialogTitle>
              <DialogDescription>Add a file link to your project</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddFile} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="file_name">File Name *</Label>
                <Input
                  id="file_name"
                  value={formData.file_name}
                  onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                  placeholder="e.g., Final Draft Script.pdf"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file_type">File Type *</Label>
                <Select
                  value={formData.file_type}
                  onValueChange={(value) => setFormData({ ...formData, file_type: value as FileType })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="script">Script</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="call_sheet">Call Sheet</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file_url">File URL *</Label>
                <Input
                  id="file_url"
                  type="url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  placeholder="https://..."
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Link to file on Google Drive, Dropbox, or other cloud storage
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file_size">File Size (bytes, optional)</Label>
                <Input
                  id="file_size"
                  type="number"
                  value={formData.file_size}
                  onChange={(e) => setFormData({ ...formData, file_size: e.target.value })}
                  placeholder="e.g., 1048576 for 1MB"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add File'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(totalSize)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">With file access</p>
          </CardContent>
        </Card>
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
                placeholder="Search files..."
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
            <Label htmlFor="type-filter">File Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="script">Scripts</SelectItem>
                <SelectItem value="contract">Contracts</SelectItem>
                <SelectItem value="call_sheet">Call Sheets</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setProjectFilter('all');
                setTypeFilter('all');
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {files.length === 0 ? 'No files yet' : 'No files match your filters'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {files.length === 0
                ? permissions.canUploadFile
                  ? 'Start organizing your production documents by adding your first file.'
                  : 'No files available yet. Production files like scripts and call sheets will appear here when uploaded.'
                : 'Try adjusting your filters to see more files.'}
            </p>
            {files.length === 0 && permissions.canUploadFile && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add File
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getFileIcon(file.file_type, file.file_name)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium">{file.file_name}</h3>
                            <Badge
                              variant="secondary"
                              className={FILE_TYPE_COLORS[file.file_type as FileType]}
                            >
                              {FILE_TYPE_LABELS[file.file_type as FileType]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{file.project?.title}</span>
                            <span>•</span>
                            <span>{formatDate(file.created_at)}</span>
                            {file.file_size && (
                              <>
                                <span>•</span>
                                <span>{formatFileSize(file.file_size)}</span>
                              </>
                            )}
                          </div>
                          {file.uploader && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Uploaded by {file.uploader.full_name || file.uploader.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                      {permissions.canDeleteFile && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete file?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{file.file_name}&quot;? This will only remove
                                the file link from the system. The actual file on your storage will not be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteFile(file.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
