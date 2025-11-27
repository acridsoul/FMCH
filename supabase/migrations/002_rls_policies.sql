-- Film Production Command Hub - Row Level Security Policies
-- This migration configures RLS policies for all tables

-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(user_id UUID, proj_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = proj_id AND user_id = user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user created the project
CREATE OR REPLACE FUNCTION is_project_creator(user_id UUID, proj_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = proj_id AND created_by = user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can view all profiles (needed for assigning tasks, etc.)
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but allow for manual creation)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin(auth.uid()));

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- PROJECTS TABLE POLICIES
-- =====================================================

-- Users can view projects they are members of
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), id) OR
    created_by = auth.uid()
  );

-- Admins can create projects
CREATE POLICY "Admins can create projects"
  ON projects FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Admins and project creators can update projects
CREATE POLICY "Admins and creators can update projects"
  ON projects FOR UPDATE
  USING (
    is_admin(auth.uid()) OR
    created_by = auth.uid()
  );

-- Only admins can delete projects
CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- PROJECT_MEMBERS TABLE POLICIES
-- =====================================================

-- Users can view members of projects they belong to
CREATE POLICY "Users can view project members"
  ON project_members FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id)
  );

-- Admins and project creators can add members
CREATE POLICY "Admins and creators can add members"
  ON project_members FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR
    is_project_creator(auth.uid(), project_id)
  );

-- Admins and project creators can update member roles
CREATE POLICY "Admins and creators can update members"
  ON project_members FOR UPDATE
  USING (
    is_admin(auth.uid()) OR
    is_project_creator(auth.uid(), project_id)
  );

-- Admins and project creators can remove members
CREATE POLICY "Admins and creators can remove members"
  ON project_members FOR DELETE
  USING (
    is_admin(auth.uid()) OR
    is_project_creator(auth.uid(), project_id)
  );

-- =====================================================
-- TASKS TABLE POLICIES
-- =====================================================

-- Users can view tasks in their projects
CREATE POLICY "Users can view project tasks"
  ON tasks FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id) OR
    assigned_to = auth.uid()
  );

-- Project members can create tasks
CREATE POLICY "Project members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id)
  );

-- Task creators and assignees can update tasks
CREATE POLICY "Users can update tasks"
  ON tasks FOR UPDATE
  USING (
    is_admin(auth.uid()) OR
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    is_project_member(auth.uid(), project_id)
  );

-- Admins and task creators can delete tasks
CREATE POLICY "Admins and creators can delete tasks"
  ON tasks FOR DELETE
  USING (
    is_admin(auth.uid()) OR
    created_by = auth.uid()
  );

-- =====================================================
-- SCHEDULES TABLE POLICIES
-- =====================================================

-- Users can view schedules for their projects
CREATE POLICY "Users can view project schedules"
  ON schedules FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id)
  );

-- Project members can create schedules
CREATE POLICY "Project members can create schedules"
  ON schedules FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id)
  );

-- Project members can update schedules
CREATE POLICY "Project members can update schedules"
  ON schedules FOR UPDATE
  USING (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id)
  );

-- Admins and schedule creators can delete schedules
CREATE POLICY "Admins and creators can delete schedules"
  ON schedules FOR DELETE
  USING (
    is_admin(auth.uid()) OR
    created_by = auth.uid()
  );

-- =====================================================
-- EXPENSES TABLE POLICIES
-- =====================================================

-- Users can view expenses for their projects
CREATE POLICY "Users can view project expenses"
  ON expenses FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id)
  );

-- Project members can create expenses
CREATE POLICY "Project members can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id)
  );

-- Admins and expense creators can update expenses
CREATE POLICY "Admins and creators can update expenses"
  ON expenses FOR UPDATE
  USING (
    is_admin(auth.uid()) OR
    created_by = auth.uid()
  );

-- Admins and expense creators can delete expenses
CREATE POLICY "Admins and creators can delete expenses"
  ON expenses FOR DELETE
  USING (
    is_admin(auth.uid()) OR
    created_by = auth.uid()
  );

-- =====================================================
-- FILES TABLE POLICIES
-- =====================================================

-- Users can view files for their projects
CREATE POLICY "Users can view project files"
  ON files FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id)
  );

-- Project members can upload files
CREATE POLICY "Project members can upload files"
  ON files FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id)
  );

-- Admins and file uploaders can delete files
CREATE POLICY "Admins and uploaders can delete files"
  ON files FOR DELETE
  USING (
    is_admin(auth.uid()) OR
    uploaded_by = auth.uid()
  );

-- =====================================================
-- STORAGE POLICIES (for Supabase Storage buckets)
-- =====================================================
-- Note: These need to be applied separately in Supabase Storage settings
-- or via the Supabase dashboard after creating buckets

-- Policy for project-files bucket:
-- - Project members can upload files to their project folders
-- - Project members can view files in their project folders
-- - Uploaders and admins can delete files

-- Policy for receipts bucket:
-- - Project members can upload receipts
-- - Project members can view receipts for their projects

-- Policy for avatars bucket:
-- - Users can upload their own avatar
-- - All authenticated users can view avatars
-- - Users can delete their own avatar
