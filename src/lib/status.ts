/**
 * Status color mapping utilities for badges
 */

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export type PlaydateStatus = 'published' | 'draft' | 'cancelled'
export type ParticipantStatus = 'confirmed' | 'interested' | 'declined' | 'pending'
export type CircleRole = 'admin' | 'member'

/**
 * Get badge variant for playdate status
 */
export function getPlaydateStatusColor(status: PlaydateStatus): BadgeVariant {
  switch (status) {
    case 'published':
      return 'default'
    case 'draft':
      return 'secondary'
    case 'cancelled':
      return 'destructive'
    default:
      return 'secondary'
  }
}

/**
 * Get badge variant for participant status
 */
export function getParticipantStatusColor(status: ParticipantStatus): BadgeVariant {
  switch (status) {
    case 'confirmed':
      return 'default'
    case 'interested':
      return 'outline'
    case 'declined':
      return 'destructive'
    case 'pending':
      return 'secondary'
    default:
      return 'secondary'
  }
}

/**
 * Get badge variant for circle role
 */
export function getCircleRoleColor(role: CircleRole): BadgeVariant {
  return role === 'admin' ? 'default' : 'secondary'
}
