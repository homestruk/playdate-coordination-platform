/**
 * Google Places API integration service
 * Handles searching for venues and fetching place details
 */

import type { GooglePlaceResult, GooglePlaceDetails, VenueType } from '@/lib/types/venue'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''
const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place'

// Map Google Place types to our venue types
const GOOGLE_TYPE_TO_VENUE_TYPE: Record<string, VenueType> = {
  'park': 'park',
  'playground': 'playground',
  'library': 'library',
  'museum': 'museum',
  'art_gallery': 'museum',
  'aquarium': 'museum',
  'zoo': 'museum',
  'amusement_park': 'indoor_play',
  'bowling_alley': 'sports_facility',
  'gym': 'sports_facility',
  'stadium': 'sports_facility',
  'cafe': 'cafe',
  'restaurant': 'restaurant',
  'community_center': 'community_center',
}

/**
 * Search for nearby venues using Google Places Nearby Search API
 * https://developers.google.com/maps/documentation/places/web-service/search-nearby
 */
export async function searchNearbyVenues(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  types?: string[]
): Promise<GooglePlaceResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not configured')
    return []
  }

  try {
    const params = new URLSearchParams({
      location: `${latitude},${longitude}`,
      radius: radius.toString(),
      key: GOOGLE_PLACES_API_KEY,
    })

    // Add types if specified
    if (types && types.length > 0) {
      params.append('type', types.join('|'))
    }

    const url = `${GOOGLE_PLACES_BASE_URL}/nearbysearch/json?${params.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`)
    }

    return data.results || []
  } catch (error) {
    console.error('Error searching nearby venues:', error)
    throw error
  }
}

/**
 * Get detailed information about a specific place
 * https://developers.google.com/maps/documentation/places/web-service/details
 */
export async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not configured')
    return null
  }

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'formatted_phone_number',
        'website',
        'url',
        'rating',
        'user_ratings_total',
        'price_level',
        'geometry',
        'photos',
        'opening_hours',
        'types',
        'reviews',
        'business_status',
      ].join(','),
      key: GOOGLE_PLACES_API_KEY,
    })

    const url = `${GOOGLE_PLACES_BASE_URL}/details/json?${params.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`)
    }

    return data.result || null
  } catch (error) {
    console.error('Error fetching place details:', error)
    throw error
  }
}

/**
 * Get photo URL from Google Places photo reference
 * https://developers.google.com/maps/documentation/places/web-service/photos
 */
export function getPlacePhotoUrl(
  photoReference: string,
  maxWidth: number = 800
): string {
  if (!GOOGLE_PLACES_API_KEY) {
    return ''
  }

  const params = new URLSearchParams({
    photo_reference: photoReference,
    maxwidth: maxWidth.toString(),
    key: GOOGLE_PLACES_API_KEY,
  })

  return `${GOOGLE_PLACES_BASE_URL}/photo?${params.toString()}`
}

/**
 * Convert Google Place types to our internal VenueType
 */
export function mapGoogleTypesToVenueType(googleTypes: string[]): VenueType {
  for (const type of googleTypes) {
    if (GOOGLE_TYPE_TO_VENUE_TYPE[type]) {
      return GOOGLE_TYPE_TO_VENUE_TYPE[type]
    }
  }
  return 'other'
}

/**
 * Search for family-friendly venues (parks, playgrounds, libraries, museums)
 * This is a convenience function that filters for relevant venue types
 */
export async function searchFamilyFriendlyVenues(
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<GooglePlaceResult[]> {
  const familyFriendlyTypes = [
    'park',
    'playground',
    'library',
    'museum',
    'aquarium',
    'zoo',
    'amusement_park',
  ]

  const allResults: GooglePlaceResult[] = []

  // Google Places API only allows one type per request, so we need multiple requests
  for (const type of familyFriendlyTypes) {
    try {
      const results = await searchNearbyVenues(latitude, longitude, radius, [type])
      allResults.push(...results)
    } catch (error) {
      console.error(`Error searching for type ${type}:`, error)
      // Continue with other types even if one fails
    }
  }

  // Remove duplicates based on place_id
  const uniqueResults = allResults.filter(
    (result, index, self) =>
      index === self.findIndex((r) => r.place_id === result.place_id)
  )

  // Sort by rating (descending)
  return uniqueResults.sort((a, b) => (b.rating || 0) - (a.rating || 0))
}

/**
 * Parse opening hours from Google Places format to our format
 */
export function parseOpeningHours(weekdayText?: string[]) {
  if (!weekdayText || weekdayText.length === 0) {
    return null
  }

  const daysMap: Record<string, string> = {
    'Monday': 'monday',
    'Tuesday': 'tuesday',
    'Wednesday': 'wednesday',
    'Thursday': 'thursday',
    'Friday': 'friday',
    'Saturday': 'saturday',
    'Sunday': 'sunday',
  }

  const hours: Record<string, { open: string; close: string }> = {}

  for (const text of weekdayText) {
    // Format: "Monday: 9:00 AM – 5:00 PM"
    const match = text.match(/^(\w+):\s*([\d:]+\s*[AP]M)\s*–\s*([\d:]+\s*[AP]M)$/)
    if (match) {
      const [, day, open, close] = match
      const dayKey = daysMap[day]
      if (dayKey) {
        hours[dayKey] = { open, close }
      }
    }
  }

  return Object.keys(hours).length > 0 ? hours : null
}

/**
 * Estimate age suitability based on venue type and Google data
 */
export function estimateAgeSuitability(venueType: VenueType, googleTypes: string[]) {
  // Default age ranges by venue type
  const ageRanges: Record<VenueType, { min: number; max: number }> = {
    'playground': { min: 2, max: 12 },
    'park': { min: 0, max: 18 },
    'library': { min: 0, max: 18 },
    'museum': { min: 3, max: 18 },
    'indoor_play': { min: 1, max: 10 },
    'sports_facility': { min: 5, max: 18 },
    'community_center': { min: 0, max: 18 },
    'cafe': { min: 0, max: 18 },
    'restaurant': { min: 0, max: 18 },
    'other': { min: 0, max: 18 },
  }

  return ageRanges[venueType] || { min: 0, max: 18 }
}

/**
 * Extract common amenities from Google Place data
 */
export function extractAmenities(placeDetails: GooglePlaceDetails): string[] {
  const amenities: string[] = []

  // Check types for amenity indicators
  const types = placeDetails.types || []

  if (types.includes('park')) {
    amenities.push('outdoor_space', 'benches')
  }

  if (types.includes('playground')) {
    amenities.push('playground', 'swings', 'slides')
  }

  if (types.includes('library')) {
    amenities.push('books', 'reading_area', 'wifi')
  }

  if (types.includes('museum') || types.includes('art_gallery')) {
    amenities.push('exhibits', 'educational')
  }

  if (types.includes('cafe') || types.includes('restaurant')) {
    amenities.push('food', 'seating')
  }

  // Check for wheelchair accessibility
  if (placeDetails.types?.includes('wheelchair_accessible_entrance')) {
    amenities.push('wheelchair_accessible')
  }

  // Infer restrooms for most public venues
  if (types.some(t => ['library', 'museum', 'restaurant', 'cafe', 'community_center'].includes(t))) {
    amenities.push('restrooms')
  }

  return amenities
}

/**
 * Determine indoor/outdoor classification
 */
export function determineIndoorOutdoor(venueType: VenueType, googleTypes: string[]): 'indoor' | 'outdoor' | 'both' {
  const outdoorTypes = ['park', 'playground']
  const indoorTypes = ['library', 'museum', 'cafe', 'restaurant', 'bowling_alley', 'gym']
  const bothTypes = ['community_center', 'sports_facility', 'amusement_park']

  if (outdoorTypes.includes(venueType)) return 'outdoor'
  if (indoorTypes.includes(venueType)) return 'indoor'
  if (bothTypes.includes(venueType)) return 'both'

  // Check Google types
  const hasOutdoorType = googleTypes.some(t => ['park', 'campground'].includes(t))
  const hasIndoorType = googleTypes.some(t => ['library', 'museum', 'shopping_mall', 'store'].includes(t))

  if (hasOutdoorType && hasIndoorType) return 'both'
  if (hasOutdoorType) return 'outdoor'
  if (hasIndoorType) return 'indoor'

  return 'outdoor' // Default
}
