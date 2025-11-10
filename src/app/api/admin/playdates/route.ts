/**
 * API Route: /api/admin/playdates
 * Get all playdates for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // 'upcoming', 'past', 'all'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build query
    let query = supabase
      .from('playdates')
      .select(`
        id,
        title,
        description,
        location_name,
        start_time,
        end_time,
        capacity,
        status,
        circle_id,
        created_by,
        circles:circle_id (
          id,
          name
        ),
        users:created_by (
          id,
          full_name,
          email
        )
      `)
      .order('start_time', { ascending: false })
      .limit(limit)

    // Apply status filter
    if (status === 'upcoming') {
      query = query
        .gte('start_time', new Date().toISOString())
        .eq('status', 'published')
        .order('start_time', { ascending: true })
    } else if (status === 'past') {
      query = query
        .lt('start_time', new Date().toISOString())
    }

    const { data: playdates, error: playdatesError } = await query

    if (playdatesError) {
      console.error('Error fetching playdates:', playdatesError)
      return NextResponse.json(
        { error: 'Failed to fetch playdates' },
        { status: 500 }
      )
    }

    // For each playdate, get participant count
    const playdatesWithStats = await Promise.all(
      (playdates || []).map(async (playdate) => {
        const { count } = await supabase
          .from('playdate_participants')
          .select('id', { count: 'exact', head: true })
          .eq('playdate_id', playdate.id)
          .in('status', ['interested', 'confirmed'])

        return {
          id: playdate.id,
          title: playdate.title,
          circle_name: (playdate.circles as any)?.name || 'Unknown Circle',
          circle_id: playdate.circle_id,
          start_time: playdate.start_time,
          end_time: playdate.end_time,
          location_name: playdate.location_name,
          capacity: playdate.capacity,
          status: playdate.status,
          participant_count: count || 0,
          created_by_name:
            (playdate.users as any)?.full_name ||
            (playdate.users as any)?.email ||
            'Unknown',
        }
      })
    )

    return NextResponse.json({ playdates: playdatesWithStats })
  } catch (error: any) {
    console.error('Error in admin playdates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
