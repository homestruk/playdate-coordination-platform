/**
 * Playdate form validation schemas
 */

import { z } from 'zod'

export const createPlaydateSchema = z.object({
  circleId: z.string().uuid('Invalid circle'),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(1000, 'Description is too long').optional().or(z.literal('')),
  locationName: z.string().max(200, 'Location name is too long').optional().or(z.literal('')),
  locationAddress: z.string().max(500, 'Address is too long').optional().or(z.literal('')),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100, 'Capacity is too large'),
  status: z.enum(['published', 'draft'])
}).refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  { message: 'End time must be after start time', path: ['endTime'] }
)

export const rsvpSchema = z.object({
  status: z.enum(['confirmed', 'interested', 'declined']),
  numChildren: z.number().int().min(0).max(10)
})

export type CreatePlaydateInput = z.infer<typeof createPlaydateSchema>
export type RsvpInput = z.infer<typeof rsvpSchema>
