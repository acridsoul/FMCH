-- Film Production Command Hub - Reports Feature
-- This migration creates reports and report_comments tables

-- =====================================================
-- REPORTS TABLE
-- =====================================================
-- Stores daily accomplishment reports from crew members
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  accomplishment_date DATE NOT NULL,
  accomplishment_time TIME NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size BIGINT,
  is_manual BOOLEAN DEFAULT false,
  manual_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX idx_reports_project ON reports(project_id);
CREATE INDEX idx_reports_reported_by ON reports(reported_by);
CREATE INDEX idx_reports_date ON reports(accomplishment_date);
CREATE INDEX idx_reports_task ON reports(task_id);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- =====================================================
-- REPORT_COMMENTS TABLE
-- =====================================================
-- Stores comments on reports from admins, dept heads, and project managers
CREATE TABLE report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  commenter_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_report_comments_report ON report_comments(report_id);
CREATE INDEX idx_report_comments_commenter ON report_comments(commenter_id);
CREATE INDEX idx_report_comments_created_at ON report_comments(created_at);

-- =====================================================
-- TRIGGER FOR UPDATED_AT
-- =====================================================
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_comments_updated_at
  BEFORE UPDATE ON report_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- =====================================================

-- Function to check if user is department head
CREATE OR REPLACE FUNCTION is_department_head(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'department_head'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is project manager for a project
CREATE OR REPLACE FUNCTION is_project_manager(user_id UUID, proj_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = proj_id 
      AND user_id = user_id 
      AND role = 'Project Manager'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- REPORTS TABLE POLICIES
-- =====================================================

-- Crew members can view their own reports
CREATE POLICY "Crew can view own reports"
  ON reports FOR SELECT
  USING (reported_by = auth.uid());

-- Admins and department heads can view all reports
CREATE POLICY "Admins and dept heads can view all reports"
  ON reports FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    is_department_head(auth.uid())
  );

-- Project managers can view reports for their projects
CREATE POLICY "Project managers can view project reports"
  ON reports FOR SELECT
  USING (
    is_project_manager(auth.uid(), project_id)
  );

-- Crew members can create reports for projects they're members of
CREATE POLICY "Crew can create reports"
  ON reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'crew'
    ) AND
    is_project_member(auth.uid(), project_id)
  );

-- Crew members can update their own reports
CREATE POLICY "Crew can update own reports"
  ON reports FOR UPDATE
  USING (reported_by = auth.uid())
  WITH CHECK (reported_by = auth.uid());

-- Crew members can delete their own reports
CREATE POLICY "Crew can delete own reports"
  ON reports FOR DELETE
  USING (reported_by = auth.uid());

-- =====================================================
-- REPORT_COMMENTS TABLE POLICIES
-- =====================================================

-- Users can view comments on reports they can view
CREATE POLICY "Users can view report comments"
  ON report_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE id = report_id AND (
        reported_by = auth.uid() OR
        is_admin(auth.uid()) OR
        is_department_head(auth.uid()) OR
        is_project_manager(auth.uid(), (SELECT project_id FROM reports WHERE id = report_id))
      )
    )
  );

-- Admins, department heads, and project managers can create comments
CREATE POLICY "Managers can create comments"
  ON report_comments FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR
    is_department_head(auth.uid()) OR
    is_project_manager(auth.uid(), (SELECT project_id FROM reports WHERE id = report_id))
  );

-- Commenters can update their own comments
CREATE POLICY "Commenters can update own comments"
  ON report_comments FOR UPDATE
  USING (commenter_id = auth.uid())
  WITH CHECK (commenter_id = auth.uid());

-- Commenters can delete their own comments
CREATE POLICY "Commenters can delete own comments"
  ON report_comments FOR DELETE
  USING (commenter_id = auth.uid());

