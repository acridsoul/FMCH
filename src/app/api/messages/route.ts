import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/messages
 * Create a new conversation and send the first message
 *
 * Body:
 * - recipients: string[] - Array of user IDs to send message to
 * - content: string - Message content
 * - subject?: string - Optional conversation subject
 * - projectId?: string - Optional project context
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { recipients, subject, content, projectId } = body

    // Validate recipients
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients are required and must be an array' },
        { status: 400 }
      )
    }

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Add current user to participants
    const allParticipants = [...new Set([...recipients, user.id])]

    // Check if 1-on-1 conversation exists
    let conversation = null
    if (allParticipants.length === 2) {
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', allParticipants)
        .containedBy('participants', allParticipants)
        .is('project_id', projectId || null)
        .maybeSingle()

      conversation = existing
    }

    // Create new conversation if doesn't exist
    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          participants: allParticipants,
          subject,
          project_id: projectId || null,
          created_by: user.id
        })
        .select()
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        return NextResponse.json(
          { error: convError.message || 'Failed to create conversation' },
          { status: 500 }
        )
      }

      conversation = newConv
    }

    // Send message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: content.trim()
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error sending message:', msgError)
      return NextResponse.json(
        { error: msgError.message || 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        conversation,
        message
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('POST /api/messages error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/messages
 * Get all conversations for the current user
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get conversations where user is a participant
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [user.id])
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    if (!conversations) {
      return NextResponse.json({ success: true, conversations: [] }, { status: 200 })
    }

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
        }
      })
    )

    return NextResponse.json(
      {
        success: true,
        conversations: conversationsWithDetails
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('GET /api/messages error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
