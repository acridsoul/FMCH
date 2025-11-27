'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getTotalUnreadCount } from '@/lib/messages'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  // Load unread count
  const loadUnreadCount = async () => {
    const count = await getTotalUnreadCount()
    setUnreadCount(count)
  }

  useEffect(() => {
    loadUnreadCount()

    // Set up real-time subscription for new messages and notifications
    const supabase = createClient()

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadUnreadCount()
        }
      )
      .subscribe()

    // Subscribe to new notifications
    const notificationsChannel = supabase
      .channel('notifications-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(notificationsChannel)
    }
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications & Messages</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {unreadCount === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => router.push('/messages')}
              className="cursor-pointer"
            >
              <div className="flex flex-col gap-1">
                <div className="font-medium">View Messages</div>
                <div className="text-xs text-muted-foreground">
                  You have {unreadCount} unread item{unreadCount !== 1 ? 's' : ''}
                </div>
              </div>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/messages')}
          className="cursor-pointer text-center justify-center"
        >
          View All
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
