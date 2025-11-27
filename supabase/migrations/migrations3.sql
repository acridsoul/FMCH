-- ============================================
-- MIGRATION 010: RLS Policies for Messaging and Issues
-- ============================================

-- =====================================================
-- MESSAGING TABLES RLS POLICIES
-- =====================================================

-- CONVERSATIONS TABLE
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can view conversations they are part of
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    -- Admins can see all
    is_admin(auth.uid()) OR
    -- Project channels: project members can see
    (type = 'project_channel' AND is_project_member(auth.uid(), project_id)) OR
    -- Direct messages: participants can see
    (type = 'direct_message' AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    ))
  );

-- Project members can create project channels
CREATE POLICY "Project members can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR
    (type = 'project_channel' AND is_project_member(auth.uid(), project_id)) OR
    (type = 'direct_message')
  );

-- Participants can update conversation metadata
CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (
    is_admin(auth.uid()) OR
    (type = 'project_channel' AND is_project_member(auth.uid(), project_id)) OR
    (type = 'direct_message' AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    ))
  );

-- CONVERSATION_PARTICIPANTS TABLE
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants of conversations they're in
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_id AND cp2.user_id = auth.uid()
    )
  );

-- Users can add themselves or others to DM conversations
CREATE POLICY "Users can manage conversation participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversation_participants.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Users can update their own participant record
CREATE POLICY "Users can update own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- MESSAGES TABLE
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in conversations they're part of
CREATE POLICY "Users can view conversation messages"
  ON messages FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    -- Project channel messages
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND c.type = 'project_channel'
      AND is_project_member(auth.uid(), c.project_id)
    ) OR
    -- Direct message messages
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Users can send messages to conversations they're part of
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND (
      is_admin(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_id
        AND c.type = 'project_channel'
        AND is_project_member(auth.uid(), c.project_id)
      ) OR
      EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
      )
    )
  );

-- Users can update their own messages (for editing)
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Users can soft delete their own messages
CREATE POLICY "Users can delete own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- MESSAGE_READS TABLE
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Users can view read receipts for messages they can see
CREATE POLICY "Users can view message reads"
  ON message_reads FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_id
      AND (
        (c.type = 'project_channel' AND is_project_member(auth.uid(), c.project_id)) OR
        (c.type = 'direct_message' AND EXISTS (
          SELECT 1 FROM conversation_participants
          WHERE conversation_id = c.id AND user_id = auth.uid()
        ))
      )
    )
  );

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- USER_PRESENCE TABLE
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view presence
CREATE POLICY "Users can view presence"
  ON user_presence FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can update their own presence
CREATE POLICY "Users can update own presence"
  ON user_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presence record"
  ON user_presence FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- ISSUE TABLES RLS POLICIES
-- =====================================================

-- ISSUES TABLE
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Users can view issues in their projects
CREATE POLICY "Users can view project issues"
  ON issues FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id) OR
    reported_by = auth.uid() OR
    assigned_to = auth.uid()
  );

-- Project members can create issues
CREATE POLICY "Project members can create issues"
  ON issues FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR
    is_project_member(auth.uid(), project_id)
  );

-- Admins, reporters, and assignees can update issues
CREATE POLICY "Users can update issues"
  ON issues FOR UPDATE
  USING (
    is_admin(auth.uid()) OR
    reported_by = auth.uid() OR
    assigned_to = auth.uid() OR
    is_project_creator(auth.uid(), project_id)
  );

-- Admins and reporters can delete issues
CREATE POLICY "Admins and reporters can delete issues"
  ON issues FOR DELETE
  USING (
    is_admin(auth.uid()) OR
    reported_by = auth.uid()
  );

-- ISSUE_COMMENTS TABLE
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on issues they can see
CREATE POLICY "Users can view issue comments"
  ON issue_comments FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND (
        is_project_member(auth.uid(), i.project_id) OR
        i.reported_by = auth.uid() OR
        i.assigned_to = auth.uid()
      )
    )
  );

-- Users can comment on issues they can see
CREATE POLICY "Users can create issue comments"
  ON issue_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      is_admin(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM issues i
        WHERE i.id = issue_id
        AND (
          is_project_member(auth.uid(), i.project_id) OR
          i.reported_by = auth.uid() OR
          i.assigned_to = auth.uid()
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON issue_comments FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON issue_comments FOR DELETE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- ISSUE_ATTACHMENTS TABLE
ALTER TABLE issue_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments on issues they can see
CREATE POLICY "Users can view issue attachments"
  ON issue_attachments FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND (
        is_project_member(auth.uid(), i.project_id) OR
        i.reported_by = auth.uid() OR
        i.assigned_to = auth.uid()
      )
    )
  );

-- Users can upload attachments to issues they can see
CREATE POLICY "Users can upload issue attachments"
  ON issue_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND (
      is_admin(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM issues i
        WHERE i.id = issue_id
        AND (
          is_project_member(auth.uid(), i.project_id) OR
          i.reported_by = auth.uid() OR
          i.assigned_to = auth.uid()
        )
      )
    )
  );

-- Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON issue_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR is_admin(auth.uid()));

-- ISSUE_WATCHERS TABLE
ALTER TABLE issue_watchers ENABLE ROW LEVEL SECURITY;

-- Users can view watchers of issues they can see
CREATE POLICY "Users can view issue watchers"
  ON issue_watchers FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND (
        is_project_member(auth.uid(), i.project_id) OR
        i.reported_by = auth.uid() OR
        i.assigned_to = auth.uid()
      )
    )
  );

-- Users can watch issues they can see
CREATE POLICY "Users can watch issues"
  ON issue_watchers FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      is_admin(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM issues i
        WHERE i.id = issue_id
        AND (
          is_project_member(auth.uid(), i.project_id) OR
          i.reported_by = auth.uid() OR
          i.assigned_to = auth.uid()
        )
      )
    )
  );

-- Users can update their own watch preferences
CREATE POLICY "Users can update own watch preferences"
  ON issue_watchers FOR UPDATE
  USING (user_id = auth.uid());

-- Users can unwatch issues
CREATE POLICY "Users can unwatch issues"
  ON issue_watchers FOR DELETE
  USING (user_id = auth.uid());
