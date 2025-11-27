import { NextRequest, NextResponse } from 'next/server'
import { markNotificationAsRead } from '@/lib/messages'

/**
 * PATCH /api/notifications/[id]
 * Mark a single notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    const { success, error } = await markNotificationAsRead(id)

    if (error || !success) {
      console.error('Error marking notification as read:', error)
      return NextResponse.json(
        { error: error?.message || 'Failed to mark notification as read' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Notification marked as read'
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('PATCH /api/notifications/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
