-- Venue Discovery Feature Migration
-- This migration enhances the venues table and adds supporting tables for
-- venue reviews, photos, favorites, and visits tracking

-- ==============================================================================
-- STEP 1: Enhance existing venues table
-- ==============================================================================

-- Add new columns to venues table for enhanced venue discovery
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS venue_type VARCHAR(50) DEFAULT 'park',
  ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_level INTEGER CHECK (price_level BETWEEN 0 AND 4),
  ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS age_suitability JSONB DEFAULT '{"min": 0, "max": 18}'::jsonb,
  ADD COLUMN IF NOT EXISTS hours JSONB,
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[],
  ADD COLUMN IF NOT EXISTS accessibility_features TEXT[],
  ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS indoor_outdoor VARCHAR(20) DEFAULT 'outdoor',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add check constraint for venue_type
ALTER TABLE public.venues
  DROP CONSTRAINT IF EXISTS venues_venue_type_check;

ALTER TABLE public.venues
  ADD CONSTRAINT venues_venue_type_check
  CHECK (venue_type IN ('park', 'library', 'museum', 'playground', 'community_center', 'indoor_play', 'sports_facility', 'cafe', 'restaurant', 'other'));

-- Add check constraint for indoor_outdoor
ALTER TABLE public.venues
  DROP CONSTRAINT IF EXISTS venues_indoor_outdoor_check;

ALTER TABLE public.venues
  ADD CONSTRAINT venues_indoor_outdoor_check
  CHECK (indoor_outdoor IN ('indoor', 'outdoor', 'both'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_venues_venue_type ON public.venues(venue_type);
CREATE INDEX IF NOT EXISTS idx_venues_google_place_id ON public.venues(google_place_id);
CREATE INDEX IF NOT EXISTS idx_venues_rating ON public.venues(rating DESC);
CREATE INDEX IF NOT EXISTS idx_venues_amenities ON public.venues USING GIN(amenities);
CREATE INDEX IF NOT EXISTS idx_venues_lat_lng ON public.venues(lat, lng);

-- Add unique constraint on google_place_id (if not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_google_place_id_unique
  ON public.venues(google_place_id)
  WHERE google_place_id IS NOT NULL;

-- ==============================================================================
-- STEP 2: Create venue_reviews table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.venue_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  comment TEXT,
  visit_date DATE,
  age_of_children JSONB DEFAULT '[]'::jsonb, -- [2, 5, 8] for kids aged 2, 5, and 8
  helpful_count INTEGER DEFAULT 0,
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate reviews from same user for same venue
  UNIQUE(venue_id, user_id)
);

-- Indexes for venue_reviews
CREATE INDEX IF NOT EXISTS idx_venue_reviews_venue_id ON public.venue_reviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_reviews_user_id ON public.venue_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_reviews_rating ON public.venue_reviews(rating DESC);
CREATE INDEX IF NOT EXISTS idx_venue_reviews_created_at ON public.venue_reviews(created_at DESC);

-- ==============================================================================
-- STEP 3: Create review_helpfulness table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.venue_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate helpfulness votes
  UNIQUE(review_id, user_id)
);

-- Indexes for review_helpfulness
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_review_id ON public.review_helpfulness(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_user_id ON public.review_helpfulness(user_id);

-- ==============================================================================
-- STEP 4: Create venue_photos table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.venue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for venue_photos
CREATE INDEX IF NOT EXISTS idx_venue_photos_venue_id ON public.venue_photos(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_photos_user_id ON public.venue_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_photos_display_order ON public.venue_photos(venue_id, display_order);

-- ==============================================================================
-- STEP 5: Create user_favorite_venues table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_favorite_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate favorites
  UNIQUE(user_id, venue_id)
);

-- Indexes for user_favorite_venues
CREATE INDEX IF NOT EXISTS idx_user_favorite_venues_user_id ON public.user_favorite_venues(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_venues_venue_id ON public.user_favorite_venues(venue_id);

-- ==============================================================================
-- STEP 6: Create venue_visits table (for analytics)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.venue_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional, can be anonymous
  playdate_id UUID REFERENCES public.playdates(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for venue_visits
CREATE INDEX IF NOT EXISTS idx_venue_visits_venue_id ON public.venue_visits(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_visits_user_id ON public.venue_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_visits_playdate_id ON public.venue_visits(playdate_id);
CREATE INDEX IF NOT EXISTS idx_venue_visits_visit_date ON public.venue_visits(visit_date DESC);

-- ==============================================================================
-- STEP 7: Create function to update venue rating
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_venue_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate average rating and total reviews for the venue
  UPDATE public.venues
  SET
    rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM public.venue_reviews
      WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.venue_reviews
      WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.venue_id, OLD.venue_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update venue rating when reviews change
DROP TRIGGER IF EXISTS trigger_update_venue_rating ON public.venue_reviews;
CREATE TRIGGER trigger_update_venue_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.venue_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_venue_rating();

-- ==============================================================================
-- STEP 8: Create function to update review helpfulness count
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_review_helpfulness_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate helpful count for the review
  UPDATE public.venue_reviews
  SET
    helpful_count = (
      SELECT COUNT(*)
      FROM public.review_helpfulness
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
      AND is_helpful = true
    )
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update review helpfulness count
DROP TRIGGER IF EXISTS trigger_update_review_helpfulness_count ON public.review_helpfulness;
CREATE TRIGGER trigger_update_review_helpfulness_count
  AFTER INSERT OR UPDATE OR DELETE ON public.review_helpfulness
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_helpfulness_count();

-- ==============================================================================
-- STEP 9: RLS Policies for venue_reviews
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Anyone can view venue reviews" ON public.venue_reviews
  FOR SELECT USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews" ON public.venue_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON public.venue_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON public.venue_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- STEP 10: RLS Policies for review_helpfulness
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.review_helpfulness ENABLE ROW LEVEL SECURITY;

-- Everyone can view helpfulness votes
CREATE POLICY "Anyone can view review helpfulness" ON public.review_helpfulness
  FOR SELECT USING (true);

-- Authenticated users can vote
CREATE POLICY "Authenticated users can vote on helpfulness" ON public.review_helpfulness
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update their own votes" ON public.review_helpfulness
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes" ON public.review_helpfulness
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- STEP 11: RLS Policies for venue_photos
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.venue_photos ENABLE ROW LEVEL SECURITY;

-- Everyone can view photos
CREATE POLICY "Anyone can view venue photos" ON public.venue_photos
  FOR SELECT USING (true);

-- Authenticated users can upload photos
CREATE POLICY "Authenticated users can upload photos" ON public.venue_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own photos
CREATE POLICY "Users can update their own photos" ON public.venue_photos
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete their own photos" ON public.venue_photos
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- STEP 12: RLS Policies for user_favorite_venues
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.user_favorite_venues ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites" ON public.user_favorite_venues
  FOR SELECT USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites" ON public.user_favorite_venues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can remove their favorites
CREATE POLICY "Users can remove favorites" ON public.user_favorite_venues
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- STEP 13: RLS Policies for venue_visits
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.venue_visits ENABLE ROW LEVEL SECURITY;

-- Users can view their own visits
CREATE POLICY "Users can view their own visits" ON public.venue_visits
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Authenticated users can log visits
CREATE POLICY "Authenticated users can log visits" ON public.venue_visits
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own visits
CREATE POLICY "Users can update their own visits" ON public.venue_visits
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own visits
CREATE POLICY "Users can delete their own visits" ON public.venue_visits
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- STEP 14: Update RLS policies for venues table
-- ==============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view venues" ON public.venues;
DROP POLICY IF EXISTS "Authenticated users can create venues" ON public.venues;
DROP POLICY IF EXISTS "Users can update venues they created" ON public.venues;

-- Enable RLS on venues if not already enabled
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Everyone can view venues
CREATE POLICY "Anyone can view venues" ON public.venues
  FOR SELECT USING (true);

-- Authenticated users can create venues (for user-submitted venues)
CREATE POLICY "Authenticated users can create venues" ON public.venues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- System or admins can update any venue (for now, allowing authenticated users)
-- TODO: Restrict this to admin role when role system is implemented
CREATE POLICY "Authenticated users can update venues" ON public.venues
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ==============================================================================
-- STEP 15: Grant permissions
-- ==============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.update_venue_rating() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_review_helpfulness_count() TO authenticated;

-- Grant table permissions
GRANT SELECT ON public.venues TO anon, authenticated;
GRANT INSERT, UPDATE ON public.venues TO authenticated;

GRANT SELECT ON public.venue_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_reviews TO authenticated;

GRANT SELECT ON public.review_helpfulness TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.review_helpfulness TO authenticated;

GRANT SELECT ON public.venue_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_photos TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.user_favorite_venues TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_visits TO authenticated;

-- ==============================================================================
-- STEP 16: Insert sample venues for testing
-- ==============================================================================

-- Note: Sample venues will be inserted via the app since they need circle_id and created_by
-- The venues table requires circle_id (NOT NULL), so we can't insert samples here
-- Users will create venues through the app interface

COMMENT ON TABLE public.venues IS 'Stores venue information for playdate locations including parks, libraries, and other public spaces';
COMMENT ON TABLE public.venue_reviews IS 'User reviews and ratings for venues';
COMMENT ON TABLE public.review_helpfulness IS 'Tracks which users found reviews helpful';
COMMENT ON TABLE public.venue_photos IS 'User-uploaded photos of venues';
COMMENT ON TABLE public.user_favorite_venues IS 'Tracks users favorite venues';
COMMENT ON TABLE public.venue_visits IS 'Tracks venue visits for analytics';
