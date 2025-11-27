-- ============================================
-- MIGRATION 008: Create Messaging System Tables
-- ============================================
-- This migration creates tables for team messaging and communication

-- =====================================================
-- 1. CONVERSATIONS TABLE
-- =====================================================
-- Stores conversation metadata (both project channels and DMs)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation type: 'project_channel' or 'direct_message'
  type TEXT CHECK (type IN ('project_channel', 'direct_message')) NOT NULL,

  -- For project channels, reference to project
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Conversation metadata
  name TEXT, -- Custom name for DMs, auto-generated for project channels
  description TEXT,

  -- For DMs, we store participants in a separate table
  -- For project channels, participants are determined by project_members

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT project_channel_has_project CHECK (
    (type = 'project_channel' AND project_id IS NOT NULL) OR
    (type = 'direct_message' AND project_id IS NULL)
  )
);

-- Add indexes
CREATE INDEX idx_conversations_project ON conversations(project_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- =====================================================
-- 2. CONVERSATION_PARTICIPANTS TABLE
-- =====================================================
-- Stores participants for direct messages
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Last read message tracking
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_message_id UUID,

  -- Mute/Archive functionality
  is_muted BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,

  -- Timestamps
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: user can only be added once per conversation
  UNIQUE(conversation_id, user_id)
);

-- Add indexes
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_user_active ON conversation_participants(user_id)
  WHERE is_archived = FALSE;

-- =====================================================
-- 3. MESSAGES TABLE
-- =====================================================
-- Stores all messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Message content
  content TEXT NOT NULL,

  -- Optional: Reply to another message (threading)
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- Message metadata
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,

  -- Message type: 'text', 'system', 'file'
  message_type TEXT CHECK (message_type IN ('text', 'system', 'file')) DEFAULT 'text',

  -- For file messages, store file metadata
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id);

-- =====================================================
-- 4. MESSAGE_READS TABLE
-- =====================================================
-- Tracks read receipts for messages
CREATE TABLE message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: user can only read a message once
  UNIQUE(message_id, user_id)
);

-- Add indexes
CREATE INDEX idx_message_reads_message ON message_reads(message_id);
CREATE INDEX idx_message_reads_user ON message_reads(user_id);

-- =====================================================
-- 5. USER_PRESENCE TABLE
-- =====================================================
-- Tracks online/offline status
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('online', 'away', 'offline')) DEFAULT 'offline',
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_user_presence_last_seen ON user_presence(last_seen_at DESC);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating conversation timestamp
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to auto-create conversation for project
CREATE OR REPLACE FUNCTION create_project_conversation()
RETURNS TRIGGER AS $$
BEGIN
  -- Create project channel conversation
  INSERT INTO conversations (type, project_id, name, description)
  VALUES (
    'project_channel',
    NEW.id,
    NEW.title || ' - Team Chat',
    'Team discussion for ' || NEW.title
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create conversation when project is created
CREATE TRIGGER create_project_conversation_trigger
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_project_conversation();

-- Function to send new message notifications
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation conversations%ROWTYPE;
  v_participant UUID;
  v_sender_name TEXT;
BEGIN
  -- Skip if system message or deleted
  IF NEW.message_type = 'system' OR NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  -- Get conversation info
  SELECT * INTO v_conversation FROM conversations WHERE id = NEW.conversation_id;

  -- Get sender name
  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  -- Notify participants
  IF v_conversation.type = 'project_channel' THEN
    -- For project channels, notify all project members except sender
    FOR v_participant IN
      SELECT user_id FROM project_members
      WHERE project_id = v_conversation.project_id
      AND user_id != NEW.sender_id
    LOOP
      -- Check if user has muted this conversation
      IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = NEW.conversation_id
        AND user_id = v_participant
        AND is_muted = TRUE
      ) THEN
        INSERT INTO notifications (
          user_id, project_id, notification_type, title, message,
          related_entity_id, related_entity_type, severity, action_url
        ) VALUES (
          v_participant,
          v_conversation.project_id,
          'new_message',
          'New message from ' || COALESCE(v_sender_name, 'Team member'),
          LEFT(NEW.content, 100),
          NEW.conversation_id,
          'conversation',
          'low',
          '/messages/' || NEW.conversation_id
        );
      END IF;
    END LOOP;
  ELSE
    -- For DMs, notify the other participant
    FOR v_participant IN
      SELECT user_id FROM conversation_participants
      WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
      AND is_muted = FALSE
    LOOP
      INSERT INTO notifications (
        user_id, project_id, notification_type, title, message,
        related_entity_id, related_entity_type, severity, action_url
      ) VALUES (
        v_participant,
        NULL,
        'new_message',
        'New message from ' || COALESCE(v_sender_name, 'User'),
        LEFT(NEW.content, 100),
        NEW.conversation_id,
        'conversation',
        'low',
        '/messages/' || NEW.conversation_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new message notifications
CREATE TRIGGER notify_new_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE conversations IS 'Stores conversation metadata for project channels and direct messages';
COMMENT ON TABLE conversation_participants IS 'Tracks participants in direct message conversations';
COMMENT ON TABLE messages IS 'Stores all messages across all conversations';
COMMENT ON TABLE message_reads IS 'Tracks read receipts for messages';
COMMENT ON TABLE user_presence IS 'Tracks user online/offline status';
