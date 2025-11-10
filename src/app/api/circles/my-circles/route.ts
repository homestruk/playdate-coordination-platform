/**
 * API Route: /api/circles/my-circles
 * Get all circles the current user is a member of
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get all circles user is a member of
    const { data: memberships, error: membershipError } = await supabase
      .from('circle_members')
      .select(`
        id,
        role,
        status,
        circles:circle_id (
          id,
          name,
          description,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (membershipError) {
      console.error('Error fetching memberships:', membershipError)
      return NextResponse.json(
        { error: 'Failed to fetch circles' },
        { status: 500 }
      )
    }

    // Transform and enrich circle data
    const circles = await Promise.all(
      (memberships || []).map(async (membership: any) => {
        const circle = membership.circles

        if (!circle) return null

        // Get member count
        const { count: memberCount } = await supabase
          .from('circle_members')
          .select('id', { count: 'exact', head: true })
          .eq('circle_id', circle.id)
          .eq('status', 'approved')

        // Get unread message count (last 24 hours for simplicity)
        const oneDayAgo = new Date()
        oneDayAgo.setHours(oneDayAgo.getHours() - 24)

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('circle_id', circle.id)
          .gte('created_at', oneDayAgo.toISOString())

        return {
          id: circle.id,
          name: circle.name,
          description: circle.description,
          member_count: memberCount || 0,
          unread_count: unreadCount || 0,
          role: membership.role,
          status: membership.status,
        }
      })
    )

    // Filter out null values
    const validCircles = circles.filter((c) => c !== null)

    return NextResponse.json({ circles: validCircles })
  } catch (error: any) {
    console.error('Error in my-circles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
