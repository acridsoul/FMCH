-- Film Production Command Hub - Updated RLS Policies for Role-Based Access
-- This migration adds department_head role support and enforces strict role-based permissions
-- Date: 2025-10-30

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is department head
CREATE OR REPLACE FUNCTION is_department_head(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'department_head'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is admin or department head (managers)
CREATE OR REPLACE FUNCTION is_admin_or_dept_head(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role IN ('admin', 'department_head')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- DROP OLD PERMISSIVE POLICIES
-- =====================================================

-- Tasks table
DROP POLICY IF EXISTS "Project members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;

-- Schedules table
DROP POLICY IF EXISTS "Project members can create schedules" ON schedules;
DROP POLICY IF EXISTS "Project members can update schedules" ON schedules;

-- Expenses table
DROP POLICY IF EXISTS "Project members can create expenses" ON expenses;
DROP POLICY IF EXISTS "Admins and creators can update expenses" ON expenses;

-- Files table
DROP POLICY IF EXISTS "Project members can upload files" ON files;

-- =====================================================
-- TASKS TABLE - STRICT ROLE-BASED POLICIES
-- =====================================================

-- Only admins and department heads can create tasks
CREATE POLICY "Admins and dept heads can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (is_admin_or_dept_head(auth.uid()));

-- Admins and dept heads can update any task
-- Crew members can only update status of tasks assigned to them
CREATE POLICY "Users can update tasks based on role"
  ON tasks FOR UPDATE
  USING (
    is_admin(auth.uid()) OR
    is_department_head(auth.uid()) OR
    (assigned_to = auth.uid() AND created_by != auth.uid())
  );

-- =====================================================
-- SCHEDULES TABLE - STRICT ROLE-BASED POLICIES
-- =====================================================

-- Only admins and department heads can create schedules
CREATE POLICY "Admins and dept heads can create schedules"
  ON schedules FOR INSERT
  WITH CHECK (is_admin_or_dept_head(auth.uid()));

-- Only admins and department heads can update schedules
CREATE POLICY "Admins and dept heads can update schedules"
  ON schedules FOR UPDATE
  USING (is_admin_or_dept_head(auth.uid()));

-- =====================================================
-- EXPENSES TABLE - STRICT ROLE-BASED POLICIES
-- =====================================================

-- Only admins and department heads can create expenses
CREATE POLICY "Admins and dept heads can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (is_admin_or_dept_head(auth.uid()));

-- Only admins and department heads can update expenses
CREATE POLICY "Admins and dept heads can update expenses"
  ON expenses FOR UPDATE
  USING (is_admin_or_dept_head(auth.uid()));

-- =====================================================
-- FILES TABLE - STRICT ROLE-BASED POLICIES
-- =====================================================

-- Only admins and department heads can upload files
CREATE POLICY "Admins and dept heads can upload files"
  ON files FOR INSERT
  WITH CHECK (is_admin_or_dept_head(auth.uid()));

-- =====================================================
-- VERIFICATION QUERIES (Comment out for production)
-- =====================================================

-- Uncomment to verify policies are created correctly
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Uncomment to verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
