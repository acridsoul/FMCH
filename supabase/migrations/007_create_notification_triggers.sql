-- ============================================
-- MIGRATION 007: Create Notification Trigger Functions
-- ============================================
-- This migration creates triggers that automatically generate
-- notifications when key events occur in the system

-- ============================================
-- TRIGGER 1: Task Assignment Notification
-- ============================================
-- Creates notification when a task is assigned to a user
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_preferences notification_preferences%ROWTYPE;
  v_task_title VARCHAR;
  v_assigned_by_name VARCHAR;
BEGIN
  -- Only trigger if assigned_to changed and is not null
  IF NEW.assigned_to IS NOT NULL
     AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN

    -- Check if user has this notification type enabled
    SELECT * INTO v_preferences
    FROM notification_preferences
    WHERE user_id = NEW.assigned_to;

    IF v_preferences IS NULL THEN
      -- Create default preferences
      INSERT INTO notification_preferences (user_id)
      VALUES (NEW.assigned_to)
      ON CONFLICT (user_id) DO NOTHING;

      SELECT * INTO v_preferences
      FROM notification_preferences
      WHERE user_id = NEW.assigned_to;
    END IF;

    IF v_preferences IS NULL OR v_preferences.notify_task_assigned THEN
      -- Get assigned by user's name
      SELECT full_name INTO v_assigned_by_name
      FROM profiles
      WHERE id = NEW.created_by;

      INSERT INTO notifications (
        user_id, project_id, notification_type, title, message,
        related_entity_id, related_entity_type, severity, action_required, action_url
      ) VALUES (
        NEW.assigned_to,
        NEW.project_id,
        'task_assigned',
        'New Task Assignment',
        'You have been assigned to task: ' || NEW.title ||
        COALESCE(' by ' || v_assigned_by_name, ''),
        NEW.id,
        'task',
        'high',
        TRUE,
        '/tasks/' || NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS task_assignment_trigger ON tasks;

-- Create trigger
CREATE TRIGGER task_assignment_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assigned();


-- ============================================
-- TRIGGER 2: Task Update Notification
-- ============================================
-- Creates notification when a task status or priority changes
CREATE OR REPLACE FUNCTION public.notify_task_updated()
RETURNS TRIGGER AS $$
DECLARE
  v_preferences notification_preferences%ROWTYPE;
  v_change_message VARCHAR;
BEGIN
  -- Only trigger if status or priority changed
  IF (NEW.status != OLD.status OR NEW.priority != OLD.priority) THEN
    -- Notify the assigned person
    IF NEW.assigned_to IS NOT NULL THEN
      SELECT * INTO v_preferences
      FROM notification_preferences
      WHERE user_id = NEW.assigned_to;

      IF v_preferences IS NULL THEN
        INSERT INTO notification_preferences (user_id) VALUES (NEW.assigned_to)
        ON CONFLICT (user_id) DO NOTHING;
        SELECT * INTO v_preferences FROM notification_preferences WHERE user_id = NEW.assigned_to;
      END IF;

      IF v_preferences IS NULL OR v_preferences.notify_task_updated THEN
        v_change_message := 'Task updated: ';
        IF NEW.status != OLD.status THEN
          v_change_message := v_change_message || 'Status changed to ' || NEW.status;
        END IF;
        IF NEW.priority != OLD.priority THEN
          v_change_message := v_change_message || ' Priority: ' || NEW.priority;
        END IF;

        INSERT INTO notifications (
          user_id, project_id, notification_type, title, message,
          related_entity_id, related_entity_type, severity, action_url
        ) VALUES (
          NEW.assigned_to,
          NEW.project_id,
          'task_updated',
          'Task Update: ' || NEW.title,
          v_change_message,
          NEW.id,
          'task',
          CASE WHEN NEW.priority = 'high' THEN 'high' ELSE 'medium' END,
          '/tasks/' || NEW.id
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_update_trigger ON tasks;

CREATE TRIGGER task_update_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_updated();


-- ============================================
-- TRIGGER 3: Schedule Change Notification
-- ============================================
-- Creates notification when a schedule is created or modified
CREATE OR REPLACE FUNCTION public.notify_schedule_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_crew_id UUID;
  v_preferences notification_preferences%ROWTYPE;
  v_crew_array UUID[];
  i INT;
BEGIN
  -- Notify all required crew
  IF NEW.required_crew IS NOT NULL AND array_length(NEW.required_crew, 1) > 0 THEN
    v_crew_array := NEW.required_crew;

    FOR i IN 1..array_length(v_crew_array, 1) LOOP
      v_crew_id := v_crew_array[i];

      -- Check preferences
      SELECT * INTO v_preferences
      FROM notification_preferences
      WHERE user_id = v_crew_id;

      IF v_preferences IS NULL THEN
        INSERT INTO notification_preferences (user_id) VALUES (v_crew_id)
        ON CONFLICT (user_id) DO NOTHING;
        SELECT * INTO v_preferences FROM notification_preferences WHERE user_id = v_crew_id;
      END IF;

      IF v_preferences IS NULL OR v_preferences.notify_schedule_changed THEN
        INSERT INTO notifications (
          user_id, project_id, notification_type, title, message,
          related_entity_id, related_entity_type, severity, action_required, action_url
        ) VALUES (
          v_crew_id,
          NEW.project_id,
          'schedule_changed',
          CASE
            WHEN TG_OP = 'INSERT' THEN 'New Schedule Assignment'
            ELSE 'Schedule Updated'
          END,
          COALESCE('Scene ' || NEW.scene_number || ': ', '') ||
          COALESCE(NEW.scene_description, 'Shoot') ||
          ' on ' || NEW.shoot_date,
          NEW.id,
          'schedule',
          'high',
          TRUE,
          '/schedule/' || NEW.id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schedule_change_trigger ON schedules;

CREATE TRIGGER schedule_change_trigger
AFTER INSERT OR UPDATE ON schedules
FOR EACH ROW
EXECUTE FUNCTION public.notify_schedule_changed();


-- ============================================
-- TRIGGER 4: File Shared Notification
-- ============================================
-- Creates notification when a file is uploaded to a project
CREATE OR REPLACE FUNCTION public.notify_file_shared()
RETURNS TRIGGER AS $$
DECLARE
  v_project_members UUID[];
  v_member_id UUID;
  v_preferences notification_preferences%ROWTYPE;
  i INT;
BEGIN
  -- Get all project members except the uploader
  SELECT array_agg(user_id)
  INTO v_project_members
  FROM project_members
  WHERE project_id = NEW.project_id
  AND user_id != NEW.uploaded_by;

  -- Notify each member
  IF v_project_members IS NOT NULL AND array_length(v_project_members, 1) > 0 THEN
    FOR i IN 1..array_length(v_project_members, 1) LOOP
      v_member_id := v_project_members[i];

      SELECT * INTO v_preferences
      FROM notification_preferences
      WHERE user_id = v_member_id;

      IF v_preferences IS NULL THEN
        INSERT INTO notification_preferences (user_id) VALUES (v_member_id)
        ON CONFLICT (user_id) DO NOTHING;
        SELECT * INTO v_preferences FROM notification_preferences WHERE user_id = v_member_id;
      END IF;

      IF v_preferences IS NULL OR v_preferences.notify_file_shared THEN
        INSERT INTO notifications (
          user_id, project_id, notification_type, title, message,
          related_entity_id, related_entity_type, severity, action_url
        ) VALUES (
          v_member_id,
          NEW.project_id,
          'file_shared',
          'New File: ' || NEW.file_name,
          'A file has been shared: ' || NEW.file_name,
          NEW.id,
          'file',
          'low',
          '/files'
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS file_shared_trigger ON files;

CREATE TRIGGER file_shared_trigger
AFTER INSERT ON files
FOR EACH ROW
EXECUTE FUNCTION public.notify_file_shared();


-- ============================================
-- END OF TRIGGERS
-- ============================================
-- Additional triggers for budget alerts and expense tracking
-- will be implemented in Phase 4 of the backend utilities
-- as they require custom business logic
