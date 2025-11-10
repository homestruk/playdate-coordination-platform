/**
 * Zod validation schemas for venue-related forms
 */

import { z } from 'zod'

// Venue search schema
export const venueSearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(100).max(50000).optional().default(5000), // 100m to 50km
  venue_types: z.array(z.enum([
    'park',
    'library',
    'museum',
    'playground',
    'community_center',
    'indoor_play',
    'sports_facility',
    'cafe',
    'restaurant',
    'other'
  ])).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  age_range: z.object({
    min: z.number().min(0).max(18),
    max: z.number().min(0).max(18)
  }).optional(),
  amenities: z.array(z.string()).optional(),
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'both']).optional(),
  parking_required: z.boolean().optional(),
  accessibility_required: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0)
})

export type VenueSearchInput = z.infer<typeof venueSearchSchema>

// Create venue review schema
export const createVenueReviewSchema = z.object({
  venue_id: z.string().uuid('Invalid venue ID'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  title: z.string().max(200, 'Title must be less than 200 characters').optional().or(z.literal('')),
  comment: z.string().max(2000, 'Comment must be less than 2000 characters').optional().or(z.literal('')),
  visit_date: z.string().optional(),
  age_of_children: z.array(z.number().min(0).max(18)).optional()
})

export type CreateVenueReviewInput = z.infer<typeof createVenueReviewSchema>

// Update venue review schema (all fields optional except rating)
export const updateVenueReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
  visit_date: z.string().optional(),
  age_of_children: z.array(z.number().min(0).max(18)).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
)

export type UpdateVenueReviewInput = z.infer<typeof updateVenueReviewSchema>

// Review helpfulness schema
export const reviewHelpfulnessSchema = z.object({
  review_id: z.string().uuid('Invalid review ID'),
  is_helpful: z.boolean()
})

export type ReviewHelpfulnessInput = z.infer<typeof reviewHelpfulnessSchema>

// Add/remove favorite venue schema
export const favoriteVenueSchema = z.object({
  venue_id: z.string().uuid('Invalid venue ID')
})

export type FavoriteVenueInput = z.infer<typeof favoriteVenueSchema>

// Log venue visit schema
export const logVenueVisitSchema = z.object({
  venue_id: z.string().uuid('Invalid venue ID'),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  playdate_id: z.string().uuid('Invalid playdate ID').optional()
})

export type LogVenueVisitInput = z.infer<typeof logVenueVisitSchema>

// Create user-submitted venue schema
export const createUserVenueSchema = z.object({
  name: z.string().min(1, 'Venue name is required').max(200, 'Venue name is too long'),
  venue_type: z.enum([
    'park',
    'library',
    'museum',
    'playground',
    'community_center',
    'indoor_play',
    'sports_facility',
    'cafe',
    'restaurant',
    'other'
  ]),
  formatted_address: z.string().min(1, 'Address is required').max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone_number: z.string().max(50).optional().or(z.literal('')),
  website: z.string().url('Invalid URL').max(500).optional().or(z.literal('')),
  description: z.string().max(1000, 'Description is too long').optional().or(z.literal('')),
  amenities: z.array(z.string()).optional().default([]),
  age_suitability: z.object({
    min: z.number().min(0).max(18),
    max: z.number().min(0).max(18)
  }).refine(
    (data) => data.min <= data.max,
    { message: 'Minimum age must be less than or equal to maximum age' }
  ).optional(),
  accessibility_features: z.array(z.string()).optional().default([]),
  parking_available: z.boolean().default(false),
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'both']).default('outdoor')
})

export type CreateUserVenueInput = z.infer<typeof createUserVenueSchema>

// Venue photo upload schema
export const venuePhotoUploadSchema = z.object({
  venue_id: z.string().uuid('Invalid venue ID'),
  caption: z.string().max(500, 'Caption is too long').optional().or(z.literal('')),
  is_primary: z.boolean().optional().default(false)
})

export type VenuePhotoUploadInput = z.infer<typeof venuePhotoUploadSchema>
