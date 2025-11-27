-- ============================================
-- MIGRATION 009: Drop Old Messaging Tables & Recreate Simple Version
-- ============================================
-- This migration removes the complex messaging schema from earlier_migrations.sql
-- and replaces it with a simpler, cleaner implementation

-- =====================================================
-- STEP 1: DROP OLD TABLES (if they exist)
-- =====================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS notify_new_message_trigger ON messages;
DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON messages;
DROP TRIGGER IF EXISTS create_project_conversation_trigger ON projects;

-- Drop functions
DROP FUNCTION IF EXISTS notify_new_message();
DROP FUNCTION IF EXISTS update_conversation_last_message();
DROP FUNCTION IF EXISTS create_project_conversation();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS user_presence CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- =====================================================
-- STEP 2: CREATE SIMPLE MESSAGING TABLES
-- =====================================================

-- TABLE 1: Conversations (simple thread container)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Participants in this conversation (array of user IDs)
  participants UUID[] NOT NULL,

  -- Optional subject/title for the conversation
  subject VARCHAR(255),

  -- Optional project context
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Creator of the conversation
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- TABLE 2: Messages (individual messages within conversations)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Which conversation this message belongs to
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

  -- Who sent this message
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,

  -- Read tracking (simplified - just a boolean)
  is_read BOOLEAN DEFAULT FALSE,

  -- Timestamp
  created_at TIMESTAMP DEFAULT now()
);

-- =====================================================
-- STEP 3: CREATE INDEXES
-- =====================================================

-- Conversations indexes
CREATE INDEX idx_conversations_participants ON public.conversations USING GIN(participants);
CREATE INDEX idx_conversations_updated ON public.conversations(updated_at DESC);
CREATE INDEX idx_conversations_project ON public.conversations(project_id);

-- Messages indexes
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_is_read ON public.messages(is_read);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- =====================================================
-- STEP 4: ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = ANY(participants))
  WITH CHECK (auth.uid() = ANY(participants));

-- Messages policies
CREATE POLICY "Users can send messages in own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can update message read status"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND auth.uid() = ANY(participants)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND auth.uid() = ANY(participants)
    )
  );

-- =====================================================
-- STEP 5: TRIGGER FUNCTIONS
-- =====================================================

-- Update conversation timestamp when a message is sent
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- =====================================================
-- STEP 6: HELPER FUNCTIONS
-- =====================================================

-- Mark messages as read in a conversation
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread message count for a user
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.messages m
  INNER JOIN public.conversations c ON m.conversation_id = c.id
  WHERE p_user_id = ANY(c.participants)
    AND m.sender_id != p_user_id
    AND m.is_read = FALSE;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: COMMENTS
-- =====================================================

COMMENT ON TABLE public.conversations IS 'Conversation threads for direct messaging between users';
COMMENT ON COLUMN public.conversations.participants IS 'Array of user IDs participating in this conversation';
COMMENT ON COLUMN public.conversations.subject IS 'Optional subject/title for the conversation';
COMMENT ON COLUMN public.conversations.project_id IS 'Optional reference to related project';

COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON COLUMN public.messages.content IS 'The message text content';
COMMENT ON COLUMN public.messages.is_read IS 'Whether the message has been read by recipients';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
