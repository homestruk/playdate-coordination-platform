/**
 * API Route: /api/venues/search
 * Search for venues with filters, combining database and Google Places results
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { venueSearchSchema } from '@/lib/validations/venue'
import {
  searchFamilyFriendlyVenues,
  getPlaceDetails,
  mapGoogleTypesToVenueType,
  parseOpeningHours,
  estimateAgeSuitability,
  extractAmenities,
  determineIndoorOutdoor,
  getPlacePhotoUrl,
} from '@/lib/services/google-places'
import type { Venue, VenueWithDetails, VenueSearchResult } from '@/lib/types/venue'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user (optional - search works for non-authenticated users too)
    const { data: { user } } = await supabase.auth.getUser()

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const rawParams = {
      latitude: parseFloat(searchParams.get('latitude') || '0'),
      longitude: parseFloat(searchParams.get('longitude') || '0'),
      radius: searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : 5000,
      venue_types: searchParams.get('venue_types')?.split(',').filter(Boolean),
      min_rating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined,
      age_range: searchParams.get('age_range') ? JSON.parse(searchParams.get('age_range')!) : undefined,
      amenities: searchParams.get('amenities')?.split(',').filter(Boolean),
      indoor_outdoor: searchParams.get('indoor_outdoor') as 'indoor' | 'outdoor' | 'both' | undefined,
      parking_required: searchParams.get('parking_required') === 'true',
      accessibility_required: searchParams.get('accessibility_required') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    // Validate input
    const validatedParams = venueSearchSchema.parse(rawParams)

    // STEP 1: Search database for cached venues
    let query = supabase
      .from('venues')
      .select(`
        *,
        user_favorite_venues!left(id, user_id),
        venue_visits!left(id, user_id)
      `, { count: 'exact' })

    // Filter by location using bounding box
    const radiusInDegrees = validatedParams.radius / 111000 // Rough conversion: 1 degree ≈ 111km
    query = query
      .gte('lat', validatedParams.latitude - radiusInDegrees)
      .lte('lat', validatedParams.latitude + radiusInDegrees)
      .gte('lng', validatedParams.longitude - radiusInDegrees)
      .lte('lng', validatedParams.longitude + radiusInDegrees)

    // Apply filters
    if (validatedParams.venue_types && validatedParams.venue_types.length > 0) {
      query = query.in('venue_type', validatedParams.venue_types)
    }

    if (validatedParams.min_rating) {
      query = query.gte('rating', validatedParams.min_rating)
    }

    if (validatedParams.indoor_outdoor) {
      query = query.eq('indoor_outdoor', validatedParams.indoor_outdoor)
    }

    if (validatedParams.parking_required) {
      query = query.eq('parking_available', true)
    }

    // Apply pagination
    query = query
      .range(validatedParams.offset, validatedParams.offset + validatedParams.limit - 1)
      .order('rating', { ascending: false })

    const { data: dbVenues, error: dbError, count } = await query

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to search venues' },
        { status: 500 }
      )
    }

    // STEP 2: Calculate distance and enhance venue data
    const venuesWithDetails: VenueWithDetails[] = (dbVenues || []).map((venue: any) => {
      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        validatedParams.latitude,
        validatedParams.longitude,
        parseFloat(venue.lat),
        parseFloat(venue.lng)
      )

      // Check if user has favorited this venue
      const is_favorite = user
        ? venue.user_favorite_venues?.some((fav: any) => fav.user_id === user.id)
        : false

      // Check if user has visited this venue
      const user_has_visited = user
        ? venue.venue_visits?.some((visit: any) => visit.user_id === user.id)
        : false

      return {
        ...venue,
        distance,
        is_favorite,
        user_has_visited,
      }
    })

    // STEP 3: If we have fewer results than requested, search Google Places
    let googleVenues: VenueWithDetails[] = []
    const needMoreResults = (count || 0) < validatedParams.limit

    if (needMoreResults) {
      try {
        const googleResults = await searchFamilyFriendlyVenues(
          validatedParams.latitude,
          validatedParams.longitude,
          validatedParams.radius
        )

        // Filter out venues already in our database
        const existingPlaceIds = new Set(
          (dbVenues || [])
            .map((v: any) => v.google_place_id)
            .filter(Boolean)
        )

        const newGoogleResults = googleResults.filter(
          (result) => !existingPlaceIds.has(result.place_id)
        )

        // Convert Google results to our Venue format
        // Note: This is a preview - we'll save these to DB when user views details
        googleVenues = await Promise.all(
          newGoogleResults.slice(0, validatedParams.limit - (count || 0)).map(async (result) => {
            const venueType = mapGoogleTypesToVenueType(result.types)
            const ageSuitability = estimateAgeSuitability(venueType, result.types)
            const indoorOutdoor = determineIndoorOutdoor(venueType, result.types)

            // Get photo URL if available
            const photoUrls = result.photos
              ? [getPlacePhotoUrl(result.photos[0].photo_reference)]
              : []

            const distance = calculateDistance(
              validatedParams.latitude,
              validatedParams.longitude,
              result.geometry.location.lat,
              result.geometry.location.lng
            )

            return {
              id: result.place_id, // Use place_id as temporary ID
              name: result.name,
              venue_type: venueType,
              google_place_id: result.place_id,
              formatted_address: result.formatted_address,
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng,
              description: '',
              rating: result.rating || 0,
              total_reviews: result.user_ratings_total || 0,
              price_level: result.price_level,
              amenities: [],
              age_suitability: ageSuitability,
              photo_urls: photoUrls,
              accessibility_features: [],
              parking_available: false,
              indoor_outdoor: indoorOutdoor,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              distance,
              is_favorite: false,
              user_has_visited: false,
            } as VenueWithDetails
          })
        )
      } catch (error) {
        console.error('Error fetching Google Places:', error)
        // Continue with database results only
      }
    }

    // STEP 4: Combine and sort results
    const allVenues = [...venuesWithDetails, ...googleVenues]

    // Apply client-side filters that couldn't be done in DB
    let filteredVenues = allVenues

    if (validatedParams.amenities && validatedParams.amenities.length > 0) {
      filteredVenues = filteredVenues.filter((venue) =>
        validatedParams.amenities!.every((amenity) =>
          venue.amenities.includes(amenity)
        )
      )
    }

    if (validatedParams.accessibility_required) {
      filteredVenues = filteredVenues.filter(
        (venue) => venue.accessibility_features && venue.accessibility_features.length > 0
      )
    }

    if (validatedParams.age_range) {
      filteredVenues = filteredVenues.filter((venue) => {
        const { min, max } = validatedParams.age_range!
        return (
          venue.age_suitability.min <= min &&
          venue.age_suitability.max >= max
        )
      })
    }

    // Sort by distance
    filteredVenues.sort((a, b) => (a.distance || 0) - (b.distance || 0))

    // STEP 5: Return results
    const result: VenueSearchResult = {
      venues: filteredVenues,
      total: filteredVenues.length,
      has_more: false, // TODO: Implement pagination properly
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in venue search:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}
