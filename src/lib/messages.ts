import { createClient } from '@/lib/supabase'
import type {
  Conversation,
  Message,
  ConversationWithDetails,
  MessageWithSender,
  Profile
} from '@/types/database'

/**
 * Create a new conversation or find existing one
 * For 1-on-1: Finds existing conversation between two users
 * For broadcast: Always creates new conversation
 */
export async function createOrGetConversation(
  recipients: string[],  // Array of user IDs (not including sender)
  subject?: string,
  projectId?: string
): Promise<{ data: Conversation | null; error: any }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated' }

  // Add current user to participants
  const allParticipants = [...new Set([...recipients, user.id])]

  // For 1-on-1, check if conversation exists
  if (allParticipants.length === 2) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', allParticipants)
      .containedBy('participants', allParticipants)
      .is('project_id', projectId || null)
      .maybeSingle()

    if (existing) return { data: existing, error: null }
  }

  // Create new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participants: allParticipants,
      subject,
      project_id: projectId || null,
      created_by: user.id
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ data: Message | null; error: any }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Get all conversations for current user with details
 */
export async function getConversations(): Promise<{
  data: ConversationWithDetails[] | null;
  error: any;
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated' }

  // Get conversations where user is a participant
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .contains('participants', [user.id])
    .order('updated_at', { ascending: false })

  if (error) return { data: null, error }
  if (!conversations) return { data: [], error: null }

  // Enrich conversations with details
  const conversationsWithDetails = await Promise.all(
    conversations.map(async (conv) => {
      // Get last message
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Get unread count
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', user.id)
        .eq('is_read', false)

      // Get participant profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', conv.participants)

      // Get project if exists
      let project = null
      if (conv.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', conv.project_id)
          .single()
        project = projectData
      }

      return {
        ...conv,
        last_message: lastMessage || undefined,
        unread_count: count || 0,
        participants_profiles: profiles || [],
        project: project || undefined
      } as ConversationWithDetails
    })
  )

  return { data: conversationsWithDetails, error: null }
}

/**
 * Get messages in a conversation with sender details
 */
export async function getMessages(conversationId: string): Promise<{
  data: MessageWithSender[] | null;
  error: any;
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey (*)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error }

  return { data: data as MessageWithSender[], error: null }
}

/**
 * Get a single conversation by ID with details
 */
export async function getConversation(conversationId: string): Promise<{
  data: ConversationWithDetails | null;
  error: any;
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (error) return { data: null, error }
  if (!conversation) return { data: null, error: 'Conversation not found' }

  // Get participant profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', conversation.participants)

  // Get last message
  const { data: lastMessage } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get unread count
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversation.id)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  // Get project if exists
  let project = null
  if (conversation.project_id) {
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', conversation.project_id)
      .single()
    project = projectData
  }

  const conversationWithDetails: ConversationWithDetails = {
    ...conversation,
    participants_profiles: profiles || [],
    last_message: lastMessage || undefined,
    unread_count: count || 0,
    project: project || undefined
  }

  return { data: conversationWithDetails, error: null }
}

/**
 * Mark messages as read in a conversation
 */
export async function markMessagesAsRead(conversationId: string): Promise<{
  success: boolean;
  error: any;
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)  // Don't mark own messages
    .eq('is_read', false)

  return { success: !error, error }
}

/**
 * Get total unread message count for current user
 */
export async function getUnreadMessageCount(): Promise<number> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return 0

  // Get user's conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .contains('participants', [user.id])

  if (!conversations || conversations.length === 0) return 0

  const conversationIds = conversations.map(c => c.id)

  // Count unread messages not sent by user
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', conversationIds)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  return count || 0
}

/**
 * Get unread notification count (from notifications table)
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return 0

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return count || 0
}

/**
 * Get combined unread count (messages + notifications)
 */
export async function getTotalUnreadCount(): Promise<number> {
  const [messageCount, notificationCount] = await Promise.all([
    getUnreadMessageCount(),
    getUnreadNotificationCount()
  ])

  return messageCount + notificationCount
}

/**
 * Get all notifications for current user
 */
export async function getNotifications(): Promise<{
  data: any[] | null;
  error: any;
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      project:projects (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{
  success: boolean;
  error: any;
}> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)

  return { success: !error, error }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  error: any;
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return { success: !error, error }
}

/**
 * Delete a conversation (admin/creator only)
 */
export async function deleteConversation(conversationId: string): Promise<{
  success: boolean;
  error: any;
}> {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  return { success: !error, error }
}

/**
 * Get other participants in a conversation (excluding current user)
 */
export async function getOtherParticipants(
  conversation: Conversation
): Promise<Profile[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const otherParticipantIds = conversation.participants.filter(
    id => id !== user.id
  )

  if (otherParticipantIds.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', otherParticipantIds)

  return profiles || []
}

/**
 * Search conversations by participant name or subject
 */
export async function searchConversations(query: string): Promise<{
  data: ConversationWithDetails[] | null;
  error: any;
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated' }

  // Get all user's conversations
  const { data: allConversations, error } = await getConversations()

  if (error || !allConversations) return { data: null, error }

  // Filter by subject or participant name
  const filtered = allConversations.filter(conv => {
    // Check subject
    if (conv.subject?.toLowerCase().includes(query.toLowerCase())) {
      return true
    }

    // Check participant names
    const hasMatchingParticipant = conv.participants_profiles?.some(
      profile => profile.full_name?.toLowerCase().includes(query.toLowerCase())
    )

    return hasMatchingParticipant
  })

  return { data: filtered, error: null }
}
