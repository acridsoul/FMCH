'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Plus, Loader2, UserX, Users } from 'lucide-react';
import type { Profile } from '@/types/database';
import {
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  getAllProfiles,
  updateProjectMemberRole,
  type ProjectMemberWithProfile,
} from '@/lib/crew';

interface TeamManagementProps {
  projectId: string;
  projectOwnerId: string;
  currentUserId: string;
}

export default function TeamManagement({
  projectId,
  projectOwnerId,
  currentUserId,
}: TeamManagementProps) {
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Add member form
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const isOwner = currentUserId === projectOwnerId;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [membersData, profilesData] = await Promise.all([
        getProjectMembers(projectId),
        getAllProfiles(),
      ]);

      setMembers(membersData);
      setAllProfiles(profilesData);

      // Subscribe to real-time updates
      const supabase = createClient();
      const channel = supabase
        .channel('project-members-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_members',
            filter: `project_id=eq.${projectId}`,
          },
          async () => {
            const updatedMembers = await getProjectMembers(projectId);
            setMembers(updatedMembers);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedRole) return;

    setIsAdding(true);
    try {
      await addProjectMember(projectId, selectedUserId, selectedRole);
      
      // Reset form
      setSelectedUserId('');
      setSelectedRole('');
      setIsAddDialogOpen(false);

      // Refresh members
      const updatedMembers = await getProjectMembers(projectId);
      setMembers(updatedMembers);
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add team member. They may already be on this project.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeProjectMember(memberId);
      
      // Refresh members
      const updatedMembers = await getProjectMembers(projectId);
      setMembers(updatedMembers);
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove team member');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    setIsUpdating(memberId);
    try {
      await updateProjectMemberRole(memberId, newRole);
      
      // Refresh members
      const updatedMembers = await getProjectMembers(projectId);
      setMembers(updatedMembers);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    } finally {
      setIsUpdating(null);
    }
  };

  // Get available users (not already in project)
  const availableUsers = allProfiles.filter(
    (profile) =>
      !members.find((member) => member.user_id === profile.id) &&
      profile.id !== projectOwnerId
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Team Members</CardTitle>
        {isOwner && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add a crew member to this project
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Team Member *</Label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a person" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          All users are already on this project
                        </div>
                      ) : (
                        availableUsers.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name || profile.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Input
                    id="role"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    placeholder="e.g., Director, Cinematographer, Editor"
                    required
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
                  <Button type="submit" disabled={isAdding || availableUsers.length === 0}>
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Member'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? 'No team members yet. Add someone to get started.'
                : 'No team members on this project yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {member.profile?.full_name || member.profile?.email || 'Unknown User'}
                    </p>
                    {member.user_id === projectOwnerId && (
                      <Badge variant="secondary" className="text-xs">
                        Owner
                      </Badge>
                    )}
                  </div>
                  {isOwner && member.user_id !== projectOwnerId ? (
                    <div className="mt-1">
                      <Input
                        value={member.role || ''}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                        placeholder="Role"
                        className="h-7 text-xs max-w-[200px]"
                        disabled={isUpdating === member.id}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      {member.role || 'No role assigned'}
                    </p>
                  )}
                </div>
                {isOwner && member.user_id !== projectOwnerId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <UserX className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {member.profile?.full_name || 'this person'} from the
                          project? They will lose access to project resources.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveMember(member.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

