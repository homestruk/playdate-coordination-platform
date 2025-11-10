/**
 * API Route: /api/admin/stats
 * Get platform-wide statistics for admin dashboard
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_super_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all stats in parallel
    const [
      circlesResult,
      usersResult,
      playdatesResult,
      upcomingResult,
      venuesResult,
      pendingResult,
    ] = await Promise.all([
      // Total circles
      supabase.from('circles').select('id', { count: 'exact', head: true }),

      // Total users
      supabase.from('users').select('id', { count: 'exact', head: true }),

      // Total playdates
      supabase.from('playdates').select('id', { count: 'exact', head: true }),

      // Upcoming playdates
      supabase
        .from('playdates')
        .select('id', { count: 'exact', head: true })
        .gte('start_time', new Date().toISOString())
        .eq('status', 'published'),

      // Total venues
      supabase.from('venues').select('id', { count: 'exact', head: true }),

      // Pending members
      supabase
        .from('circle_members')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])

    // Get activity today (users who created content today)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [activeUsersResult, messagesTodayResult] = await Promise.all([
      // Active today (users who created playdates or messages today)
      supabase
        .from('playdates')
        .select('created_by')
        .gte('created_at', todayStart.toISOString()),

      // Messages today
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
    ])

    // Count unique active users
    const activeUsers = new Set(
      activeUsersResult.data?.map((p) => p.created_by) || []
    )

    const stats = {
      total_circles: circlesResult.count || 0,
      total_users: usersResult.count || 0,
      total_playdates: playdatesResult.count || 0,
      upcoming_playdates: upcomingResult.count || 0,
      total_venues: venuesResult.count || 0,
      pending_members: pendingResult.count || 0,
      active_today: activeUsers.size,
      messages_today: messagesTodayResult.count || 0,
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
