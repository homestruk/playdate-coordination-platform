/**
 * API Route: /api/venues/[id]/reviews
 * Manage venue reviews (GET, POST)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createVenueReviewSchema } from '@/lib/validations/venue'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params
    const supabase = await createClient()

    // Get reviews for the venue
    const { data: reviews, error } = await supabase
      .from('venue_reviews')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar_url
        )
      `)
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reviews:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Error in GET /api/venues/[id]/reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Parse and validate request body
    const body = await request.json()
    const reviewData = createVenueReviewSchema.parse({
      ...body,
      venue_id: venueId,
    })

    // Check if user has already reviewed this venue
    const { data: existingReview } = await supabase
      .from('venue_reviews')
      .select('id')
      .eq('venue_id', venueId)
      .eq('user_id', user.id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this venue' },
        { status: 400 }
      )
    }

    // Create the review
    const { data: review, error: insertError } = await supabase
      .from('venue_reviews')
      .insert([{
        venue_id: reviewData.venue_id,
        user_id: user.id,
        rating: reviewData.rating,
        title: reviewData.title || null,
        comment: reviewData.comment || null,
        visit_date: reviewData.visit_date || null,
        age_of_children: reviewData.age_of_children || null,
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating review:', insertError)
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      )
    }

    // The trigger will automatically update the venue's rating
    // Fetch the updated review with user profile
    const { data: reviewWithProfile } = await supabase
      .from('venue_reviews')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar_url
        )
      `)
      .eq('id', review.id)
      .single()

    return NextResponse.json({
      review: reviewWithProfile,
      message: 'Review created successfully',
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/venues/[id]/reviews:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid review data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a review
export async function PATCH(
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

    // Parse request body
    const body = await request.json()
    const { review_id, ...updateData } = body

    if (!review_id) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      )
    }

    // Verify the review belongs to the user
    const { data: existingReview, error: fetchError } = await supabase
      .from('venue_reviews')
      .select('id, user_id')
      .eq('id', review_id)
      .eq('venue_id', venueId)
      .single()

    if (fetchError || !existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    if (existingReview.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only update your own reviews' },
        { status: 403 }
      )
    }

    // Update the review
    const { data: updatedReview, error: updateError } = await supabase
      .from('venue_reviews')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', review_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating review:', updateError)
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      review: updatedReview,
      message: 'Review updated successfully',
    })
  } catch (error) {
    console.error('Error in PATCH /api/venues/[id]/reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a review
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

    // Get review ID from query params
    const reviewId = request.nextUrl.searchParams.get('review_id')

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      )
    }

    // Verify the review belongs to the user
    const { data: existingReview, error: fetchError } = await supabase
      .from('venue_reviews')
      .select('id, user_id')
      .eq('id', reviewId)
      .eq('venue_id', venueId)
      .single()

    if (fetchError || !existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    if (existingReview.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own reviews' },
        { status: 403 }
      )
    }

    // Delete the review
    const { error: deleteError } = await supabase
      .from('venue_reviews')
      .delete()
      .eq('id', reviewId)

    if (deleteError) {
      console.error('Error deleting review:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete review' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Review deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/venues/[id]/reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
