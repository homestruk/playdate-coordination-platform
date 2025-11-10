/**
 * Venue Detail Page
 * Shows detailed information about a venue including reviews, photos, and amenities
 */

'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  Users,
  Heart,
  Share2,
  ArrowLeft,
  ParkingCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Venue, VenueReview } from '@/lib/types/venue'
import { VENUE_TYPE_LABELS, VENUE_TYPE_ICONS } from '@/lib/types/venue'
import { formatDate } from '@/lib/format'

interface VenueDetailPageProps {
  params: Promise<{ id: string }>
}

export default function VenueDetailPage({ params }: VenueDetailPageProps) {
  const { id } = use(params)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [reviews, setReviews] = useState<VenueReview[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)

  useEffect(() => {
    fetchVenueDetails()
    fetchReviews()
  }, [id])

  const fetchVenueDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/venues/${id}`)

      if (!response.ok) {
        throw new Error('Failed to fetch venue details')
      }

      const data = await response.json()
      setVenue(data.venue)
      setIsFavorite(data.is_favorite || false)
    } catch (error) {
      console.error('Error fetching venue:', error)
      toast.error('Failed to load venue details')
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/venues/${id}/reviews`)

      if (!response.ok) {
        throw new Error('Failed to fetch reviews')
      }

      const data = await response.json()
      setReviews(data.reviews || [])
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }

  const handleFavoriteToggle = async () => {
    try {
      const method = isFavorite ? 'DELETE' : 'POST'
      const response = await fetch(`/api/venues/${id}/favorite`, { method })

      if (!response.ok) {
        throw new Error('Failed to toggle favorite')
      }

      setIsFavorite(!isFavorite)
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites')
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite')
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({
          title: venue?.name,
          text: `Check out ${venue?.name} on Playdate Platform!`,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading venue details..." />
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Venue not found
            </h3>
            <p className="text-gray-600 mb-4">
              The venue you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/venues">Back to Venues</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const photoUrl = venue.photo_urls && venue.photo_urls.length > 0
    ? venue.photo_urls[0]
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/venues">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Venues
            </Link>
          </Button>

          {/* Header Image */}
          {photoUrl ? (
            <div className="relative h-64 md:h-96 rounded-lg overflow-hidden mb-6">
              <img
                src={photoUrl}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="relative h-64 md:h-96 rounded-lg overflow-hidden mb-6 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
              <span className="text-9xl">
                {VENUE_TYPE_ICONS[venue.venue_type]}
              </span>
            </div>
          )}

          {/* Venue Title & Actions */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="text-sm">
                  {VENUE_TYPE_ICONS[venue.venue_type]} {VENUE_TYPE_LABELS[venue.venue_type]}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {venue.indoor_outdoor === 'indoor' && '🏠 Indoor'}
                  {venue.indoor_outdoor === 'outdoor' && '🌳 Outdoor'}
                  {venue.indoor_outdoor === 'both' && '🏠🌳 Both'}
                </Badge>
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {venue.name}
              </h1>

              {/* Rating */}
              {venue.rating > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= venue.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-medium">{venue.rating.toFixed(1)}</span>
                  <span className="text-gray-600">
                    ({venue.total_reviews} review{venue.total_reviews !== 1 ? 's' : ''})
                  </span>
                </div>
              )}

              {/* Address */}
              {venue.formatted_address && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{venue.formatted_address}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleFavoriteToggle}
              >
                <Heart
                  className={`h-5 w-5 ${
                    isFavorite ? 'fill-red-500 text-red-500' : ''
                  }`}
                />
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {venue.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{venue.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Amenities */}
            {venue.amenities && venue.amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {venue.amenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary">
                        {amenity.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Reviews ({reviews.length})</CardTitle>
                  <Button onClick={() => setShowReviewForm(!showReviewForm)}>
                    Write a Review
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">
                    No reviews yet. Be the first to review this venue!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {review.profiles?.display_name || 'Anonymous'}
                              </span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= review.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">
                              {formatDate(review.created_at)}
                            </p>
                          </div>
                        </div>
                        {review.title && (
                          <h4 className="font-medium mb-1">{review.title}</h4>
                        )}
                        {review.comment && (
                          <p className="text-gray-700">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Age Suitability */}
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Age Range</p>
                    <p className="text-sm text-gray-600">
                      {venue.age_suitability.min}-{venue.age_suitability.max} years
                    </p>
                  </div>
                </div>

                {/* Phone */}
                {venue.phone_number && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Phone</p>
                      <a
                        href={`tel:${venue.phone_number}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {venue.phone_number}
                      </a>
                    </div>
                  </div>
                )}

                {/* Website */}
                {venue.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Website</p>
                      <a
                        href={venue.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  </div>
                )}

                {/* Parking */}
                {venue.parking_available && (
                  <div className="flex items-start gap-3">
                    <ParkingCircle className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Parking</p>
                      <p className="text-sm text-gray-600">Available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <Button className="w-full mb-3" asChild>
                  <Link href={`/playdates/new?venue=${venue.id}`}>
                    Plan Playdate Here
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Directions
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
