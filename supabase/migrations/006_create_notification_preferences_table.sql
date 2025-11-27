-- ============================================
-- MIGRATION 006: Create Notification Preferences Table
-- ============================================
-- This migration creates the notification preferences table
-- for user control over notification types and methods

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification type toggles
  notify_task_assigned BOOLEAN DEFAULT TRUE,
  notify_task_updated BOOLEAN DEFAULT TRUE,
  notify_schedule_changed BOOLEAN DEFAULT TRUE,
  notify_budget_alert BOOLEAN DEFAULT TRUE,
  notify_equipment_conflict BOOLEAN DEFAULT TRUE,
  notify_location_conflict BOOLEAN DEFAULT TRUE,
  notify_crew_unavailable BOOLEAN DEFAULT TRUE,
  notify_file_shared BOOLEAN DEFAULT TRUE,

  -- Budget alert threshold (percentage, 0-100)
  budget_alert_threshold INT DEFAULT 80 CHECK (budget_alert_threshold >= 0 AND budget_alert_threshold <= 100),

  -- Notification methods
  email_notifications BOOLEAN DEFAULT TRUE,
  in_app_notifications BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create index
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Add comments for documentation
COMMENT ON TABLE public.notification_preferences IS 'Stores user notification preferences and alert thresholds';
COMMENT ON COLUMN public.notification_preferences.budget_alert_threshold IS 'Percentage of budget spent that triggers alert (0-100)';

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy 2: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy 3: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.set_notification_preferences_updated_at();

-- Create function to auto-create default preferences for new users
-- This is called via a trigger on the profiles table
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to profiles table to auto-create preferences
-- Check if trigger already exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'profiles'
    AND trigger_name = 'create_preferences_on_profile_create'
  ) THEN
    CREATE TRIGGER create_preferences_on_profile_create
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_notification_preferences();
  END IF;
END $$;
