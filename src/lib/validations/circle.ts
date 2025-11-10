/**
 * Circle form validation schemas
 */

import { z } from 'zod'

export const createCircleSchema = z.object({
  name: z.string().min(1, 'Circle name is required').max(100, 'Circle name is too long'),
  description: z.string().max(500, 'Description is too long').optional().or(z.literal(''))
})

export const joinCircleSchema = z.object({
  inviteCode: z.string()
    .min(8, 'Invalid invite code')
    .max(8, 'Invalid invite code')
    .regex(/^[A-Z0-9]+$/, 'Invalid invite code format')
})

export type CreateCircleInput = z.infer<typeof createCircleSchema>
export type JoinCircleInput = z.infer<typeof joinCircleSchema>
