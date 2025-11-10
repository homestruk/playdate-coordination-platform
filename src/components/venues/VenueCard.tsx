/**
 * VenueCard Component
 * Displays a venue in a card format with image, details, and actions
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, MapPin, Star, Users, Clock, DollarSign } from 'lucide-react'
import type { VenueWithDetails } from '@/lib/types/venue'
import { VENUE_TYPE_LABELS, VENUE_TYPE_ICONS } from '@/lib/types/venue'

interface VenueCardProps {
  venue: VenueWithDetails
  onFavoriteToggle?: (venueId: string, isFavorite: boolean) => Promise<void>
}

export function VenueCard({ venue, onFavoriteToggle }: VenueCardProps) {
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [isFavorite, setIsFavorite] = useState(venue.is_favorite || false)

  const handleFavoriteToggle = async () => {
    if (!onFavoriteToggle) return

    setIsFavoriting(true)
    try {
      await onFavoriteToggle(venue.id, !isFavorite)
      setIsFavorite(!isFavorite)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsFavoriting(false)
    }
  }

  // Get primary photo or use placeholder
  const photoUrl = venue.photo_urls && venue.photo_urls.length > 0
    ? venue.photo_urls[0]
    : '/placeholder-venue.jpg'

  // Format distance
  const distanceText = venue.distance
    ? `${venue.distance.toFixed(1)} mi away`
    : null

  // Price level indicators
  const priceLevel = venue.price_level
    ? '$'.repeat(venue.price_level)
    : null

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Venue Image */}
      <Link href={`/venues/${venue.id}`}>
        <div className="relative h-48 bg-gray-200 overflow-hidden">
          {photoUrl !== '/placeholder-venue.jpg' ? (
            <img
              src={photoUrl}
              alt={venue.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
              <span className="text-6xl">
                {VENUE_TYPE_ICONS[venue.venue_type]}
              </span>
            </div>
          )}

          {/* Venue Type Badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur">
              {VENUE_TYPE_ICONS[venue.venue_type]} {VENUE_TYPE_LABELS[venue.venue_type]}
            </Badge>
          </div>

          {/* Indoor/Outdoor Badge */}
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-white/90 backdrop-blur text-xs">
              {venue.indoor_outdoor === 'indoor' && '🏠 Indoor'}
              {venue.indoor_outdoor === 'outdoor' && '🌳 Outdoor'}
              {venue.indoor_outdoor === 'both' && '🏠🌳 Both'}
            </Badge>
          </div>
        </div>
      </Link>

      <CardContent className="pt-4">
        {/* Venue Name & Rating */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/venues/${venue.id}`}>
            <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors">
              {venue.name}
            </h3>
          </Link>

          {venue.rating > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{venue.rating.toFixed(1)}</span>
              {venue.total_reviews > 0 && (
                <span className="text-xs text-gray-500">({venue.total_reviews})</span>
              )}
            </div>
          )}
        </div>

        {/* Address */}
        {venue.formatted_address && (
          <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{venue.formatted_address}</span>
          </div>
        )}

        {/* Distance & Price */}
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
          {distanceText && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {distanceText}
            </span>
          )}

          {priceLevel && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {priceLevel}
            </span>
          )}
        </div>

        {/* Description */}
        {venue.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {venue.description}
          </p>
        )}

        {/* Age Suitability */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Users className="h-4 w-4" />
          <span>
            Ages {venue.age_suitability.min}-{venue.age_suitability.max}
          </span>
        </div>

        {/* Amenities */}
        {venue.amenities && venue.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {venue.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs">
                {amenity.replace(/_/g, ' ')}
              </Badge>
            ))}
            {venue.amenities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{venue.amenities.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Features */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {venue.parking_available && (
            <span className="flex items-center gap-1">
              🅿️ Parking
            </span>
          )}
          {venue.accessibility_features && venue.accessibility_features.length > 0 && (
            <span className="flex items-center gap-1">
              ♿ Accessible
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        <Button asChild className="flex-1">
          <Link href={`/venues/${venue.id}`}>
            View Details
          </Link>
        </Button>

        {onFavoriteToggle && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleFavoriteToggle}
            disabled={isFavoriting}
          >
            <Heart
              className={`h-4 w-4 ${
                isFavorite ? 'fill-red-500 text-red-500' : ''
              }`}
            />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
