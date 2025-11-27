'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SendMessageModal } from '@/components/messages/SendMessageModal'
import { createClient } from '@/lib/supabase'
import type { ConversationWithDetails, MessageWithSender } from '@/types/database'
import { MessageSquare, Send, Loader2, Search, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null)
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  // Get current user
  useEffect(() => {
    async function getCurrentUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  // Load conversations
  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/messages')
      const data = await response.json()

      if (response.ok && data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/${conversationId}`)
      const data = await response.json()

      if (response.ok) {
        setMessages(data.messages || [])
        setSelectedConversation(data.conversation)

        // Mark messages as read
        await fetch(`/api/messages/${conversationId}`, {
          method: 'PATCH',
        })

        // Refresh conversations to update unread count
        loadConversations()
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [loadConversations])

  // Initial load
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Handle conversation selection from URL
  useEffect(() => {
    const conversationId = searchParams.get('conversation')
    if (conversationId && conversations.length > 0) {
      loadMessages(conversationId)
    }
  }, [searchParams, conversations, loadMessages])

  // Real-time subscriptions
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // If message is for current conversation, add it
          if (selectedConversation && payload.new.conversation_id === selectedConversation.id) {
            loadMessages(selectedConversation.id)
          }
          // Refresh conversations list
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
    }
  }, [selectedConversation, loadConversations, loadMessages])

  // Send message
  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return

    setSendingMessage(true)
    try {
      const response = await fetch(`/api/messages/${selectedConversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })

      if (response.ok) {
        setNewMessage('')
        loadMessages(selectedConversation.id)
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to send message',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      })
    } finally {
      setSendingMessage(false)
    }
  }

  // Get conversation display name
  const getConversationName = (conversation: ConversationWithDetails) => {
    if (conversation.subject) return conversation.subject

    const otherParticipants = conversation.participants_profiles?.filter(
      (p) => p.id !== currentUserId
    )

    if (otherParticipants && otherParticipants.length > 0) {
      return otherParticipants.map((p) => p.full_name || p.email).join(', ')
    }

    return 'Conversation'
  }

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) =>
    getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <Button onClick={() => setShowNewMessageModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Conversations</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-340px)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setShowNewMessageModal(true)}
                  >
                    Start a conversation
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversation(conversation)
                        loadMessages(conversation.id)
                        router.push(`/messages?conversation=${conversation.id}`)
                      }}
                      className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getConversationName(conversation).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">
                              {getConversationName(conversation)}
                            </p>
                            {conversation.unread_count! > 0 && (
                              <Badge variant="destructive" className="shrink-0">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          {conversation.last_message && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.last_message.content}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(conversation.updated_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages View */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <CardTitle className="text-lg">
                  {getConversationName(selectedConversation)}
                </CardTitle>
                {selectedConversation.project && (
                  <p className="text-sm text-muted-foreground">
                    Project: {selectedConversation.project.title}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-0 flex flex-col">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4 h-[calc(100vh-420px)]">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwnMessage = message.sender_id === currentUserId
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {!isOwnMessage && message.sender && (
                              <p className="text-xs font-medium mb-1">
                                {message.sender.full_name || message.sender.email}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}
                            >
                              {format(new Date(message.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                {/* Send Message */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      rows={2}
                      className="resize-none"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      size="icon"
                      className="shrink-0"
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Message Modal */}
      <SendMessageModal
        open={showNewMessageModal}
        onOpenChange={setShowNewMessageModal}
      />
    </div>
  )
}
