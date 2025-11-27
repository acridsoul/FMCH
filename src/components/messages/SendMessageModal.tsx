'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { Send, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SendMessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedRecipient?: string // User ID to pre-select
  projectId?: string // Optional project context
}

export function SendMessageModal({
  open,
  onOpenChange,
  preselectedRecipient,
  projectId,
}: SendMessageModalProps) {
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // Load users
  useEffect(() => {
    async function loadUsers() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id) // Exclude current user
        .order('full_name')

      if (!error && data) {
        setUsers(data)
      }

      setLoadingUsers(false)
    }

    if (open) {
      loadUsers()
    }
  }, [open])

  // Pre-select recipient if provided
  useEffect(() => {
    if (preselectedRecipient && !selectedRecipients.includes(preselectedRecipient)) {
      setSelectedRecipients([preselectedRecipient])
    }
  }, [preselectedRecipient])

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one recipient',
        variant: 'destructive',
      })
      return
    }

    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: selectedRecipients,
          content: content.trim(),
          subject: subject.trim() || undefined,
          projectId: projectId || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      toast({
        title: 'Success',
        description: 'Message sent successfully',
      })

      // Reset form
      setSelectedRecipients([])
      setSubject('')
      setContent('')
      onOpenChange(false)

      // Navigate to the conversation
      router.push(`/messages?conversation=${data.conversation.id}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
          <DialogDescription>
            Send a direct message to team members
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Recipients */}
          <div className="grid gap-2">
            <Label htmlFor="recipients">To *</Label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : (
              <Select
                value={selectedRecipients[0] || ''}
                onValueChange={(value) => setSelectedRecipients([value])}
              >
                <SelectTrigger id="recipients">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Show selected recipients for multi-select (future) */}
            {selectedRecipients.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedRecipients.map((recipientId) => {
                  const user = users.find((u) => u.id === recipientId)
                  return user ? (
                    <Badge
                      key={recipientId}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleRecipient(recipientId)}
                    >
                      {user.full_name || user.email} ✕
                    </Badge>
                  ) : null
                })}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Input
              id="subject"
              placeholder="Brief subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div className="grid gap-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Type your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSend} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
