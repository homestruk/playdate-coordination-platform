/**
 * API Route: /api/admin/circles
 * Get all circles with stats for admin dashboard
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

    // Get all circles
    const { data: circles, error: circlesError } = await supabase
      .from('circles')
      .select(`
        id,
        name,
        description,
        created_at
      `)
      .order('name', { ascending: true })

    if (circlesError) {
      console.error('Error fetching circles:', circlesError)
      return NextResponse.json(
        { error: 'Failed to fetch circles' },
        { status: 500 }
      )
    }

    // For each circle, get member stats and admin names
    const circlesWithStats = await Promise.all(
      (circles || []).map(async (circle) => {
        // Get member counts
        const [memberCountResult, pendingCountResult, adminResult, upcomingResult] =
          await Promise.all([
            // Total approved members
            supabase
              .from('circle_members')
              .select('id', { count: 'exact', head: true })
              .eq('circle_id', circle.id)
              .eq('status', 'approved'),

            // Pending members
            supabase
              .from('circle_members')
              .select('id', { count: 'exact', head: true })
              .eq('circle_id', circle.id)
              .eq('status', 'pending'),

            // Admin names
            supabase
              .from('circle_members')
              .select(`
                users:user_id (
                  full_name,
                  email
                )
              `)
              .eq('circle_id', circle.id)
              .eq('role', 'admin')
              .eq('status', 'approved'),

            // Upcoming playdates
            supabase
              .from('playdates')
              .select('id', { count: 'exact', head: true })
              .eq('circle_id', circle.id)
              .gte('start_time', new Date().toISOString())
              .eq('status', 'published'),
          ])

        // Extract admin names
        const adminNames = (adminResult.data || [])
          .map((member: any) => member.users?.full_name || member.users?.email || 'Unknown')
          .filter(Boolean)

        return {
          ...circle,
          member_count: memberCountResult.count || 0,
          pending_count: pendingCountResult.count || 0,
          admin_names: adminNames,
          upcoming_playdates: upcomingResult.count || 0,
        }
      })
    )

    return NextResponse.json({ circles: circlesWithStats })
  } catch (error: any) {
    console.error('Error in admin circles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
