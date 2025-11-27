-- ============================================
-- MIGRATION 008: Create Messaging Tables
-- ============================================
-- This migration creates the messaging system for direct user-to-user
-- communication and admin broadcasts

-- ============================================
-- TABLE 1: Conversations
-- ============================================
-- Stores conversation threads between users
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

-- ============================================
-- TABLE 2: Messages
-- ============================================
-- Stores individual messages within conversations
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Which conversation this message belongs to
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

  -- Who sent this message
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,

  -- Read tracking
  is_read BOOLEAN DEFAULT FALSE,

  -- Timestamp
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
-- Index on participants for fast lookups
CREATE INDEX idx_conversations_participants ON public.conversations USING GIN(participants);

-- Index on conversation_id for message queries
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);

-- Index on conversation updated_at for sorting inbox
CREATE INDEX idx_conversations_updated ON public.conversations(updated_at DESC);

-- Index on sender for filtering
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- Index on is_read for unread counts
CREATE INDEX idx_messages_is_read ON public.messages(is_read);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.conversations IS 'Conversation threads for direct messaging between users';
COMMENT ON COLUMN public.conversations.participants IS 'Array of user IDs participating in this conversation';
COMMENT ON COLUMN public.conversations.subject IS 'Optional subject/title for the conversation';
COMMENT ON COLUMN public.conversations.project_id IS 'Optional reference to related project';

COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON COLUMN public.messages.content IS 'The message text content';
COMMENT ON COLUMN public.messages.is_read IS 'Whether the message has been read by recipients';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on both tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: Conversations
-- ============================================

-- Policy 1: Users can create conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy 2: Users can view conversations they're part of
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = ANY(participants));

-- Policy 3: Users can update conversations they're part of (e.g., updating updated_at)
CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = ANY(participants))
  WITH CHECK (auth.uid() = ANY(participants));

-- ============================================
-- RLS POLICIES: Messages
-- ============================================

-- Policy 1: Users can send messages in conversations they're part of
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

-- Policy 2: Users can view messages in conversations they're part of
CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND auth.uid() = ANY(participants)
    )
  );

-- Policy 3: Users can update their own message read status
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

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

-- Function: Update conversation timestamp when a message is sent
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update conversation on new message
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- Function: Auto-mark messages as read when different user views them
-- (This will be called by the application, not automatically)
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

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Get unread message count for a user
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

-- ============================================
-- END OF MIGRATION
-- ============================================
