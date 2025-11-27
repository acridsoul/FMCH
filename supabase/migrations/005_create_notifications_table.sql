-- ============================================
-- MIGRATION 005: Create Notifications Table
-- ============================================
-- This migration creates the core notifications table
-- for the notification system implementation (Gap #1)

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Notification metadata
  notification_type VARCHAR NOT NULL,
  -- Types: task_assigned, task_updated, schedule_changed, budget_alert,
  --        equipment_conflict, location_conflict, crew_unavailable, file_shared
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,

  -- Related entity info
  related_entity_id UUID,
  related_entity_type VARCHAR,
  -- Types: task, schedule, expense, project, file, equipment

  -- Read status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  -- Metadata
  severity VARCHAR DEFAULT 'medium',
  -- Severities: low, medium, high, critical
  action_required BOOLEAN DEFAULT FALSE,
  action_url VARCHAR,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_project_id ON public.notifications(project_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON public.notifications(notification_type);

-- Add comments for documentation
COMMENT ON TABLE public.notifications IS 'Stores all notifications for users with read status and metadata';
COMMENT ON COLUMN public.notifications.notification_type IS 'Type of notification: task_assigned, task_updated, schedule_changed, budget_alert, equipment_conflict, location_conflict, crew_unavailable, file_shared';
COMMENT ON COLUMN public.notifications.severity IS 'Notification severity level: low, medium, high, critical';

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy 2: System can create notifications via triggers
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- RLS Policy 3: Users can update their own notifications (mark read/unread)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy 4: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_notifications_updated_at();
