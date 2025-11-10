/**
 * API Route: /api/venues/[id]
 * Get venue details
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params
    const supabase = await createClient()

    // Get authenticated user (optional)
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch venue details
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single()

    if (venueError || !venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      )
    }

    // Check if user has favorited this venue
    let is_favorite = false
    if (user) {
      const { data: favorite } = await supabase
        .from('user_favorite_venues')
        .select('id')
        .eq('venue_id', venueId)
        .eq('user_id', user.id)
        .single()

      is_favorite = !!favorite
    }

    return NextResponse.json({
      venue,
      is_favorite,
    })
  } catch (error) {
    console.error('Error in GET /api/venues/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
