/**
 * Venue Discovery Page
 * Browse and search for playdate locations (parks, libraries, museums, etc.)
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { VenueCard } from '@/components/venues/VenueCard'
import { Search, MapPin, SlidersHorizontal, List, Map } from 'lucide-react'
import { toast } from 'sonner'
import type { VenueWithDetails, VenueType } from '@/lib/types/venue'
import { VENUE_TYPE_LABELS, VENUE_TYPE_ICONS } from '@/lib/types/venue'

function VenuesPageContent() {
  const searchParams = useSearchParams()
  const [venues, setVenues] = useState<VenueWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  // Filter state
  const [selectedTypes, setSelectedTypes] = useState<VenueType[]>([])
  const [minRating, setMinRating] = useState<number>(0)
  const [showFilters, setShowFilters] = useState(false)

  // Get user's current location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setLocationError(null)
        },
        (error) => {
          console.error('Geolocation error:', error)
          setLocationError('Unable to get your location. Using default location.')
          // Default to New York City
          setUserLocation({ lat: 40.7128, lng: -74.0060 })
        }
      )
    } else {
      setLocationError('Geolocation is not supported by your browser')
      // Default to New York City
      setUserLocation({ lat: 40.7128, lng: -74.0060 })
    }
  }, [])

  // Fetch venues when location is available
  useEffect(() => {
    if (userLocation) {
      fetchVenues()
    }
  }, [userLocation, selectedTypes, minRating])

  const fetchVenues = async () => {
    if (!userLocation) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        latitude: userLocation.lat.toString(),
        longitude: userLocation.lng.toString(),
        radius: '8000', // 8km / 5 miles
      })

      if (selectedTypes.length > 0) {
        params.append('venue_types', selectedTypes.join(','))
      }

      if (minRating > 0) {
        params.append('min_rating', minRating.toString())
      }

      const response = await fetch(`/api/venues/search?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch venues')
      }

      const data = await response.json()
      setVenues(data.venues || [])
    } catch (error) {
      console.error('Error fetching venues:', error)
      toast.error('Failed to load venues')
    } finally {
      setLoading(false)
    }
  }

  const handleFavoriteToggle = async (venueId: string, isFavorite: boolean) => {
    try {
      const method = isFavorite ? 'POST' : 'DELETE'
      const response = await fetch(`/api/venues/${venueId}/favorite`, {
        method,
      })

      if (!response.ok) {
        throw new Error('Failed to toggle favorite')
      }

      toast.success(isFavorite ? 'Added to favorites' : 'Removed from favorites')
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite')
      throw error
    }
  }

  const toggleVenueType = (type: VenueType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    )
  }

  const clearFilters = () => {
    setSelectedTypes([])
    setMinRating(0)
  }

  if (loading && !userLocation) {
    return <LoadingSpinner message="Getting your location..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Discover Playdate Venues
              </h1>
              <p className="text-gray-600 mt-1">
                Find parks, libraries, museums, and more near you
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <Map className="h-4 w-4 mr-2" />
                Map
              </Button>
            </div>
          </div>

          {/* Location Info */}
          {locationError && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{locationError}</p>
            </div>
          )}

          {userLocation && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>
                Showing venues near your location
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filters</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    disabled={selectedTypes.length === 0 && minRating === 0}
                  >
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Venue Types */}
                <div>
                  <h3 className="font-medium mb-3">Venue Type</h3>
                  <div className="space-y-2">
                    {Object.entries(VENUE_TYPE_LABELS).map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => toggleVenueType(type as VenueType)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                          selectedTypes.includes(type as VenueType)
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{VENUE_TYPE_ICONS[type as VenueType]}</span>
                          <span className="text-sm">{label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minimum Rating */}
                <div>
                  <h3 className="font-medium mb-3">Minimum Rating</h3>
                  <div className="space-y-2">
                    {[0, 3, 4, 4.5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setMinRating(rating)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                          minRating === rating
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-sm">
                          {rating === 0 ? 'Any Rating' : `${rating}+ Stars`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Filters */}
                {(selectedTypes.length > 0 || minRating > 0) && (
                  <div>
                    <h3 className="font-medium mb-2">Active Filters</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedTypes.map((type) => (
                        <Badge
                          key={type}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => toggleVenueType(type)}
                        >
                          {VENUE_TYPE_LABELS[type]} ×
                        </Badge>
                      ))}
                      {minRating > 0 && (
                        <Badge
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => setMinRating(0)}
                        >
                          {minRating}+ Stars ×
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Venues List */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner message="Loading venues..." size="md" />
              </div>
            ) : venues.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No venues found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your filters or search in a different area
                  </p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Results Count */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Found {venues.length} venue{venues.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Venue Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {venues.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VenuesPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading venues..." />}>
      <VenuesPageContent />
    </Suspense>
  )
}
