import { NextRequest, NextResponse } from 'next/server'
import { getNotifications, markAllNotificationsAsRead } from '@/lib/messages'

/**
 * GET /api/notifications
 * Get all notifications for the current user
 */
export async function GET() {
  try {
    const { data, error } = await getNotifications()

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        notifications: data || []
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read
 */
export async function PATCH() {
  try {
    const { success, error } = await markAllNotificationsAsRead()

    if (error || !success) {
      console.error('Error marking notifications as read:', error)
      return NextResponse.json(
        { error: error?.message || 'Failed to mark notifications as read' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'All notifications marked as read'
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('PATCH /api/notifications error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
