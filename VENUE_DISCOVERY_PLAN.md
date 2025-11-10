# 🏞️ Venue Discovery Feature Plan
**Integrating Local Parks, Libraries & Public Playdate Locations**

---

## 🎯 **Feature Overview**

Make it easy for parents to discover, review, and share great playdate locations in their community.

### **Core Value Propositions:**
1. 🗺️ **Discover** - Find parks, libraries, museums near you
2. ⭐ **Review** - Share experiences and ratings
3. 📍 **Navigate** - Get directions and details
4. 📅 **Plan** - Book playdates at specific venues
5. 🏆 **Popular** - See what's trending in your community

---

## 🗄️ **Database Schema Enhancement**

### **Update Existing `venues` Table:**

```sql
-- Enhance the existing venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_type TEXT; -- 'park', 'library', 'museum', etc.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS hours JSONB; -- Operating hours
ALTER TABLE venues ADD COLUMN IF NOT EXISTS amenities TEXT[]; -- ['parking', 'restrooms', 'playground']
ALTER TABLE venues ADD COLUMN IF NOT EXISTS age_suitability TEXT[]; -- ['toddler', 'preschool', 'school-age']
ALTER TABLE venues ADD COLUMN IF NOT EXISTS accessibility_features TEXT[]; -- ['wheelchair', 'stroller-friendly']
ALTER TABLE venues ADD COLUMN IF NOT EXISTS photos TEXT[]; -- Array of photo URLs
ALTER TABLE venues ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES users(id); -- For business owners
ALTER TABLE venues ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT NOW();

-- Create index for searching
CREATE INDEX IF NOT EXISTS idx_venues_type ON venues(venue_type);
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues USING GIST (
  ll_to_earth(lat, lng)
);
CREATE INDEX IF NOT EXISTS idx_venues_google_place_id ON venues(google_place_id);
```

### **New Tables:**

```sql
-- Venue reviews and ratings
CREATE TABLE venue_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  title TEXT,
  review_text TEXT,
  visit_date DATE,
  age_at_visit TEXT[], -- ['toddler', 'preschool']
  pros TEXT[],
  cons TEXT[],
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(venue_id, user_id) -- One review per user per venue
);

-- Track helpful reviews
CREATE TABLE review_helpfulness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES venue_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Venue photos from users
CREATE TABLE venue_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Favorite venues
CREATE TABLE user_favorite_venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, venue_id)
);

-- Venue visit tracking (for stats)
CREATE TABLE venue_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  playdate_id UUID REFERENCES playdates(id) ON DELETE CASCADE,
  visit_date TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_venue_reviews_venue ON venue_reviews(venue_id);
CREATE INDEX idx_venue_reviews_user ON venue_reviews(user_id);
CREATE INDEX idx_venue_reviews_rating ON venue_reviews(rating);
CREATE INDEX idx_venue_photos_venue ON venue_photos(venue_id);
CREATE INDEX idx_favorite_venues_user ON user_favorite_venues(user_id);
```

### **Row Level Security (RLS) Policies:**

```sql
-- Enable RLS
ALTER TABLE venue_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_venues ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Anyone can view venue reviews" ON venue_reviews
  FOR SELECT USING (true);

-- Users can create their own reviews
CREATE POLICY "Users can create reviews" ON venue_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their reviews" ON venue_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their reviews" ON venue_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for photos and favorites
CREATE POLICY "Anyone can view venue photos" ON venue_photos
  FOR SELECT USING (true);

CREATE POLICY "Users can upload venue photos" ON venue_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their favorites" ON user_favorite_venues
  FOR ALL USING (auth.uid() = user_id);
```

---

## 🔌 **API Integration Strategy**

### **Option 1: Google Places API (Recommended)**

**Pros:**
- Comprehensive database (parks, libraries, museums, playgrounds)
- Reviews and ratings
- Photos
- Operating hours
- Real-time data

**Pricing:**
- Places API: $17 per 1,000 requests (first $200/month free)
- Estimated: ~$50-100/month for moderate usage

**Implementation:**
```typescript
// src/lib/google-places.ts
import { Client } from "@googlemaps/google-maps-services-js";

const client = new Client({});

export async function searchNearbyVenues(
  lat: number,
  lng: number,
  radius: number = 5000, // 5km
  type?: string // 'park' | 'library' | 'museum' | 'playground'
) {
  const response = await client.placesNearby({
    params: {
      location: { lat, lng },
      radius,
      type,
      key: process.env.GOOGLE_PLACES_API_KEY!,
    },
  });

  return response.data.results;
}

export async function getPlaceDetails(placeId: string) {
  const response = await client.placeDetails({
    params: {
      place_id: placeId,
      fields: [
        'name',
        'formatted_address',
        'geometry',
        'photos',
        'rating',
        'user_ratings_total',
        'opening_hours',
        'formatted_phone_number',
        'website',
        'types'
      ],
      key: process.env.GOOGLE_PLACES_API_KEY!,
    },
  });

  return response.data.result;
}
```

### **Option 2: OpenStreetMap (Free Alternative)**

**Pros:**
- Completely free
- Community-maintained
- Good coverage

**Cons:**
- Less detailed information
- No built-in reviews
- May miss some venues

**Implementation:**
```typescript
// src/lib/openstreetmap.ts
export async function searchOSMVenues(
  lat: number,
  lng: number,
  radius: number = 5000
) {
  const response = await fetch(
    `https://overpass-api.de/api/interpreter?data=[out:json];(node["leisure"="playground"](around:${radius},${lat},${lng});node["amenity"="library"](around:${radius},${lat},${lng}););out;`
  );

  return response.json();
}
```

### **Hybrid Approach (Best):**
- Use Google Places for initial data
- Cache results in your database
- Supplement with community reviews
- Reduces API costs over time

---

## 🎨 **UI/UX Design**

### **1. Venue Discovery Page** (`/venues`)

```tsx
// src/app/venues/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Star, Heart, Navigation } from 'lucide-react'

export default function VenuesPage() {
  const [venues, setVenues] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'park', 'library', 'museum'
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Discover Playdate Locations</h1>
          <p className="text-gray-600">Find parks, libraries, and fun places near you</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search & Filter Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <Input
                placeholder="Search by name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="md:col-span-2"
              />

              {/* Type Filter */}
              <Select value={filter} onValueChange={setFilter}>
                <option value="all">All Locations</option>
                <option value="park">Parks & Playgrounds</option>
                <option value="library">Libraries</option>
                <option value="museum">Museums</option>
                <option value="indoor_play">Indoor Play Spaces</option>
                <option value="recreation_center">Recreation Centers</option>
              </Select>

              {/* View Toggle */}
              <div className="flex space-x-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                  className="flex-1"
                >
                  List
                </Button>
                <Button
                  variant={viewMode === 'map' ? 'default' : 'outline'}
                  onClick={() => setViewMode('map')}
                  className="flex-1"
                >
                  Map
                </Button>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="cursor-pointer">
                ⭐ Top Rated
              </Badge>
              <Badge variant="outline" className="cursor-pointer">
                🚼 Toddler Friendly
              </Badge>
              <Badge variant="outline" className="cursor-pointer">
                ♿ Accessible
              </Badge>
              <Badge variant="outline" className="cursor-pointer">
                🅿️ Free Parking
              </Badge>
              <Badge variant="outline" className="cursor-pointer">
                🚻 Restrooms
              </Badge>
              <Badge variant="outline" className="cursor-pointer">
                ☀️ Shaded Areas
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {viewMode === 'list' ? (
          <VenueListView venues={venues} />
        ) : (
          <VenueMapView venues={venues} />
        )}
      </div>
    </div>
  )
}

// Venue Card Component
function VenueCard({ venue }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Photo */}
        <div className="relative h-48 bg-gray-200">
          {venue.photos?.[0] ? (
            <img
              src={venue.photos[0]}
              alt={venue.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <MapPin className="w-12 h-12" />
            </div>
          )}

          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 bg-white/90"
          >
            <Heart className="w-4 h-4" />
          </Button>

          {/* Type Badge */}
          <Badge className="absolute bottom-2 left-2">
            {venue.venue_type}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg">{venue.name}</h3>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{venue.average_rating}</span>
              <span className="text-sm text-gray-600">({venue.review_count})</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3">{venue.address}</p>

          {/* Amenities */}
          <div className="flex flex-wrap gap-1 mb-3">
            {venue.amenities?.slice(0, 4).map((amenity) => (
              <Badge key={amenity} variant="secondary" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {venue.amenities?.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{venue.amenities.length - 4}
              </Badge>
            )}
          </div>

          {/* Age Suitability */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xs text-gray-600">Great for:</span>
            {venue.age_suitability?.map((age) => (
              <Badge key={age} variant="outline" className="text-xs">
                {age}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="flex-1">
              <MapPin className="w-4 h-4 mr-1" />
              Directions
            </Button>
            <Button size="sm" className="flex-1">
              Plan Playdate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### **2. Venue Detail Page** (`/venues/[id]`)

```tsx
// src/app/venues/[id]/page.tsx
export default function VenueDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gray-300">
        {/* Photo Gallery */}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold">{venue.name}</h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge>{venue.venue_type}</Badge>
                    {venue.is_verified && (
                      <Badge variant="secondary">✓ Verified</Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline">
                  <Heart className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <span className="font-medium text-lg">{venue.average_rating}</span>
                <span className="text-gray-600">
                  {venue.review_count} reviews
                </span>
              </div>
            </div>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Address:</dt>
                    <dd className="font-medium">{venue.address}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Phone:</dt>
                    <dd className="font-medium">{venue.phone}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Hours:</dt>
                    <dd className="font-medium">9 AM - 5 PM</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Amenities & Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {venue.amenities?.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Reviews ({venue.review_count})</CardTitle>
                  <Button>Write a Review</Button>
                </div>
              </CardHeader>
              <CardContent>
                <ReviewsList venueId={venue.id} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-200 rounded mb-4">
                  {/* Map component */}
                </div>
                <Button className="w-full">
                  <Navigation className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Your Visit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full">
                  Create Playdate Here
                </Button>
                <Button variant="outline" className="w-full">
                  Check Availability
                </Button>
              </CardContent>
            </Card>

            {/* Popular Times */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Times</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Based on community playdates
                </p>
                {/* Bar chart of popular times */}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### **3. Map View Component**

```tsx
// src/components/venue-map.tsx
'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

export function VenueMap({ venues, center, onVenueClick }) {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: 12,
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    })

    // Add markers
    venues.forEach((venue) => {
      const el = document.createElement('div')
      el.className = 'venue-marker'
      el.style.backgroundImage = getMarkerIcon(venue.venue_type)
      el.style.width = '40px'
      el.style.height = '40px'

      new mapboxgl.Marker(el)
        .setLngLat([venue.lng, venue.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold">${venue.name}</h3>
                <p class="text-sm">${venue.venue_type}</p>
                <div class="flex items-center mt-1">
                  <span class="text-yellow-500">⭐</span>
                  <span class="ml-1 text-sm">${venue.average_rating}</span>
                </div>
              </div>
            `)
        )
        .addTo(map.current)
    })
  }, [venues, center])

  return <div ref={mapContainer} className="w-full h-[600px] rounded-lg" />
}

function getMarkerIcon(type: string) {
  const icons = {
    park: '🌳',
    library: '📚',
    museum: '🏛️',
    playground: '🎠',
    indoor_play: '🏢'
  }
  return icons[type] || '📍'
}
```

---

## 📱 **Feature Implementations**

### **1. Venue Search API Route**

```typescript
// src/app/api/venues/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { searchNearbyVenues } from '@/lib/google-places'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const type = searchParams.get('type')
  const radius = parseInt(searchParams.get('radius') || '5000')

  const supabase = createClient()

  try {
    // First, check local database
    let query = supabase
      .from('venues')
      .select('*')
      .gte('lat', lat - 0.05) // Approximate 5km
      .lte('lat', lat + 0.05)
      .gte('lng', lng - 0.05)
      .lte('lng', lng + 0.05)

    if (type && type !== 'all') {
      query = query.eq('venue_type', type)
    }

    const { data: localVenues } = await query

    // If not enough local results, fetch from Google Places
    if (!localVenues || localVenues.length < 10) {
      const googleResults = await searchNearbyVenues(lat, lng, radius, type)

      // Cache new venues in database
      for (const place of googleResults) {
        await supabase.from('venues').upsert({
          google_place_id: place.place_id,
          name: place.name,
          address: place.vicinity,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          venue_type: place.types[0],
          average_rating: place.rating || 0,
          review_count: place.user_ratings_total || 0
        }, { onConflict: 'google_place_id' })
      }

      // Fetch again with new data
      const { data: updatedVenues } = await query
      return NextResponse.json(updatedVenues)
    }

    return NextResponse.json(localVenues)
  } catch (error) {
    console.error('Venue search error:', error)
    return NextResponse.json({ error: 'Failed to search venues' }, { status: 500 })
  }
}
```

### **2. Review Submission**

```typescript
// src/app/api/venues/[id]/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { rating, title, review_text, age_at_visit, pros, cons } = body

  try {
    // Insert review
    const { data: review, error } = await supabase
      .from('venue_reviews')
      .insert({
        venue_id: params.id,
        user_id: user.id,
        rating,
        title,
        review_text,
        age_at_visit,
        pros,
        cons
      })
      .select()
      .single()

    if (error) throw error

    // Update venue average rating
    const { data: stats } = await supabase
      .from('venue_reviews')
      .select('rating')
      .eq('venue_id', params.id)

    const avgRating = stats.reduce((sum, r) => sum + r.rating, 0) / stats.length
    const reviewCount = stats.length

    await supabase
      .from('venues')
      .update({
        average_rating: avgRating,
        review_count: reviewCount
      })
      .eq('id', params.id)

    return NextResponse.json(review)
  } catch (error) {
    console.error('Review submission error:', error)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
```

---

## 🚀 **Implementation Timeline**

### **Phase 1: Foundation** (1 week)
- ✅ Database schema migration
- ✅ Google Places API integration
- ✅ Basic venue search API
- ✅ Venue list/grid view

### **Phase 2: Core Features** (1 week)
- ✅ Venue detail pages
- ✅ Map view with markers
- ✅ Reviews and ratings system
- ✅ Favorite venues

### **Phase 3: Enhancement** (1 week)
- ✅ Photo uploads
- ✅ Advanced filtering
- ✅ Integration with playdate creation
- ✅ Popular times widget

---

## 📊 **Success Metrics**

Track these to measure feature adoption:
- Number of venues added/viewed
- Reviews submitted per month
- Venues favorited
- Playdates created at discovered venues
- User engagement (time on venue pages)

---

## 💰 **Cost Estimates**

### **Google Places API:**
- ~1,000 searches/day = $17/day (after free tier)
- **Optimization:** Cache results for 30 days
- **Estimated:** $50-100/month with caching

### **Mapbox:**
- Free up to 50,000 map loads/month
- **Estimated:** Free for initial launch

### **Storage (Photos):**
- Supabase storage: $0.021/GB
- **Estimated:** $10-20/month

**Total: ~$60-120/month**

---

## 🎯 **Next Steps**

Would you like me to:
1. **Start implementing Phase 1** (database + API integration)
2. **Create the venue discovery UI** first
3. **Set up Google Places API** credentials
4. **Build a prototype** of the map view

Which would you like to tackle first?
