/**
 * TypeScript types for venue discovery feature
 * Corresponds to database schema in migration 005_venue_discovery_schema.sql
 */

export type VenueType =
  | 'park'
  | 'library'
  | 'museum'
  | 'playground'
  | 'community_center'
  | 'indoor_play'
  | 'sports_facility'
  | 'cafe'
  | 'restaurant'
  | 'other'

export type IndoorOutdoor = 'indoor' | 'outdoor' | 'both'

export interface AgeSuitability {
  min: number
  max: number
}

export interface VenueHours {
  monday?: { open: string; close: string }
  tuesday?: { open: string; close: string }
  wednesday?: { open: string; close: string }
  thursday?: { open: string; close: string }
  friday?: { open: string; close: string }
  saturday?: { open: string; close: string }
  sunday?: { open: string; close: string }
}

export interface Venue {
  id: string
  name: string
  venue_type: VenueType
  google_place_id?: string
  formatted_address?: string
  lat: number  // Note: Using 'lat' to match existing schema
  lng: number  // Note: Using 'lng' to match existing schema
  phone_number?: string
  website?: string
  description?: string
  rating: number
  total_reviews: number
  price_level?: number // 0-4 (free to expensive)
  amenities: string[]
  age_suitability: AgeSuitability
  hours?: VenueHours
  photo_urls?: string[]
  accessibility_features?: string[]
  parking_available: boolean
  indoor_outdoor: IndoorOutdoor
  last_synced_at?: string
  created_at: string
  updated_at: string
}

export interface VenueReview {
  id: string
  venue_id: string
  user_id: string
  rating: number // 1-5
  title?: string
  comment?: string
  visit_date?: string
  age_of_children?: number[]
  helpful_count: number
  photos?: string[]
  created_at: string
  updated_at: string
  // Joined fields
  profiles?: {
    display_name?: string
    avatar_url?: string
  }
}

export interface ReviewHelpfulness {
  id: string
  review_id: string
  user_id: string
  is_helpful: boolean
  created_at: string
}

export interface VenuePhoto {
  id: string
  venue_id: string
  user_id: string
  storage_path: string
  caption?: string
  display_order: number
  is_primary: boolean
  created_at: string
}

export interface UserFavoriteVenue {
  id: string
  user_id: string
  venue_id: string
  created_at: string
}

export interface VenueVisit {
  id: string
  venue_id: string
  user_id?: string
  playdate_id?: string
  visit_date: string
  created_at: string
}

// Enhanced venue with additional computed fields
export interface VenueWithDetails extends Venue {
  distance?: number // Distance in miles/km from user location
  is_favorite?: boolean
  user_has_visited?: boolean
  recent_reviews?: VenueReview[]
  primary_photo?: VenuePhoto
}

// Google Places API types
export interface GooglePlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  rating?: number
  user_ratings_total?: number
  price_level?: number
  types: string[]
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
  opening_hours?: {
    open_now: boolean
    weekday_text?: string[]
  }
  business_status?: string
}

export interface GooglePlaceDetails extends GooglePlaceResult {
  formatted_phone_number?: string
  website?: string
  url?: string
  reviews?: Array<{
    author_name: string
    rating: number
    text: string
    time: number
  }>
}

// Search/filter types
export interface VenueSearchParams {
  latitude: number
  longitude: number
  radius?: number // in meters, default 5000 (5km)
  venue_types?: VenueType[]
  min_rating?: number
  age_range?: AgeSuitability
  amenities?: string[]
  indoor_outdoor?: IndoorOutdoor
  parking_required?: boolean
  accessibility_required?: boolean
  limit?: number
  offset?: number
}

export interface VenueSearchResult {
  venues: VenueWithDetails[]
  total: number
  has_more: boolean
}

// Form input types
export interface CreateVenueReviewInput {
  venue_id: string
  rating: number
  title?: string
  comment?: string
  visit_date?: string
  age_of_children?: number[]
  photos?: File[]
}

export interface UpdateVenueReviewInput {
  rating?: number
  title?: string
  comment?: string
  visit_date?: string
  age_of_children?: number[]
}

// Common amenities (for autocomplete/filtering)
export const COMMON_AMENITIES = [
  'playground',
  'swings',
  'slides',
  'climbing_structures',
  'sandbox',
  'splash_pad',
  'sports_fields',
  'basketball_court',
  'tennis_court',
  'picnic_area',
  'restrooms',
  'water_fountain',
  'benches',
  'shade',
  'wifi',
  'cafe',
  'gift_shop',
  'storytime',
  'classes',
  'interactive_exhibits',
  'wheelchair_accessible',
  'stroller_accessible',
  'nursing_room',
  'changing_table',
] as const

export type Amenity = typeof COMMON_AMENITIES[number]

// Venue type labels for UI
export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  park: 'Park',
  library: 'Library',
  museum: 'Museum',
  playground: 'Playground',
  community_center: 'Community Center',
  indoor_play: 'Indoor Play Space',
  sports_facility: 'Sports Facility',
  cafe: 'Café',
  restaurant: 'Restaurant',
  other: 'Other',
}

// Venue type icons (using emoji for simplicity, can be replaced with icon library)
export const VENUE_TYPE_ICONS: Record<VenueType, string> = {
  park: '🌳',
  library: '📚',
  museum: '🏛️',
  playground: '🎠',
  community_center: '🏢',
  indoor_play: '🎪',
  sports_facility: '⚽',
  cafe: '☕',
  restaurant: '🍽️',
  other: '📍',
}
