import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * GET /api/messages/[conversationId]
 * Get all messages in a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { conversationId } = await params

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      console.error('Error fetching conversation:', convError)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get participant profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', conversation.participants)

    // Get messages first
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return NextResponse.json(
        { error: msgError.message || 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Enrich messages with sender info
    const messagesWithSender = await Promise.all(
      (messages || []).map(async (message) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', message.sender_id)
          .single()

        return {
          ...message,
          sender: sender || null
        }
      })
    )

    const conversationWithDetails = {
      ...conversation,
      participants_profiles: profiles || []
    }

    return NextResponse.json(
      {
        success: true,
        conversation: conversationWithDetails,
        messages: messagesWithSender
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('GET /api/messages/[conversationId] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/messages/[conversationId]
 * Send a message in an existing conversation
 *
 * Body:
 * - content: string - Message content
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { conversationId } = await params
    const body = await request.json()
    const { content } = body

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim()
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('POST /api/messages/[conversationId] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/messages/[conversationId]
 * Mark all messages in a conversation as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { conversationId } = await params

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking messages as read:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to mark messages as read' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Messages marked as read'
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('PATCH /api/messages/[conversationId] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
