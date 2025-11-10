/**
 * API Route: /api/venues/[id]/favorite
 * Add or remove a venue from favorites
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Add to favorites
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if venue exists
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id')
      .eq('id', venueId)
      .single()

    if (venueError || !venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      )
    }

    // Add to favorites (upsert to handle duplicate key)
    const { error: insertError } = await supabase
      .from('user_favorite_venues')
      .upsert({
        user_id: user.id,
        venue_id: venueId,
      }, {
        onConflict: 'user_id,venue_id',
      })

    if (insertError) {
      console.error('Error adding favorite:', insertError)
      return NextResponse.json(
        { error: 'Failed to add favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Added to favorites',
    })
  } catch (error) {
    console.error('Error in POST /api/venues/[id]/favorite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Remove from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Remove from favorites
    const { error: deleteError } = await supabase
      .from('user_favorite_venues')
      .delete()
      .eq('user_id', user.id)
      .eq('venue_id', venueId)

    if (deleteError) {
      console.error('Error removing favorite:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Removed from favorites',
    })
  } catch (error) {
    console.error('Error in DELETE /api/venues/[id]/favorite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
