-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create circles table
CREATE TABLE IF NOT EXISTS public.circles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create circle_members table
CREATE TABLE IF NOT EXISTS public.circle_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

-- Create playdates table
CREATE TABLE IF NOT EXISTS public.playdates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location_name TEXT,
  location_address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playdate_participants table
CREATE TABLE IF NOT EXISTS public.playdate_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playdate_id UUID REFERENCES public.playdates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  num_children INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'confirmed', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playdate_id, user_id)
);

-- Create availability_slots table
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  specific_date DATE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE,
  playdate_id UUID REFERENCES public.playdates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (
    (circle_id IS NOT NULL AND playdate_id IS NULL) OR 
    (circle_id IS NULL AND playdate_id IS NOT NULL)
  )
);

-- Create venues table
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON public.circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON public.circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_playdates_circle_id ON public.playdates(circle_id);
CREATE INDEX IF NOT EXISTS idx_playdates_start_time ON public.playdates(start_time);
CREATE INDEX IF NOT EXISTS idx_playdate_participants_playdate_id ON public.playdate_participants(playdate_id);
CREATE INDEX IF NOT EXISTS idx_playdate_participants_user_id ON public.playdate_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_user_id ON public.availability_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_circle_id ON public.messages(circle_id);
CREATE INDEX IF NOT EXISTS idx_messages_playdate_id ON public.messages(playdate_id);
CREATE INDEX IF NOT EXISTS idx_venues_circle_id ON public.venues(circle_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playdates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playdate_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for circles table
CREATE POLICY "Users can view circles they are members of" ON public.circles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.circle_members 
      WHERE circle_members.circle_id = circles.id 
      AND circle_members.user_id = auth.uid()
      AND circle_members.status = 'approved'
    )
  );

CREATE POLICY "Users can create circles" ON public.circles
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Circle admins can update circles" ON public.circles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.circle_members 
      WHERE circle_members.circle_id = circles.id 
      AND circle_members.user_id = auth.uid()
      AND circle_members.role = 'admin'
      AND circle_members.status = 'approved'
    )
  );

CREATE POLICY "Circle admins can delete circles" ON public.circles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.circle_members 
      WHERE circle_members.circle_id = circles.id 
      AND circle_members.user_id = auth.uid()
      AND circle_members.role = 'admin'
      AND circle_members.status = 'approved'
    )
  );

-- RLS Policies for circle_members table
CREATE POLICY "Users can view circle members of circles they belong to" ON public.circle_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.circle_members cm 
      WHERE cm.circle_id = circle_members.circle_id 
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
    )
  );

CREATE POLICY "Users can join circles" ON public.circle_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Circle admins can approve/remove members" ON public.circle_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.circle_members cm 
      WHERE cm.circle_id = circle_members.circle_id 
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
      AND cm.status = 'approved'
    )
  );

CREATE POLICY "Circle admins can delete members" ON public.circle_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.circle_members cm 
      WHERE cm.circle_id = circle_members.circle_id 
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
      AND cm.status = 'approved'
    )
  );

-- RLS Policies for playdates table
CREATE POLICY "Users can view playdates in circles they belong to" ON public.playdates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.circle_members 
      WHERE circle_members.circle_id = playdates.circle_id 
      AND circle_members.user_id = auth.uid()
      AND circle_members.status = 'approved'
    )
  );

CREATE POLICY "Users can create playdates in circles they belong to" ON public.playdates
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.circle_members 
      WHERE circle_members.circle_id = playdates.circle_id 
      AND circle_members.user_id = auth.uid()
      AND circle_members.status = 'approved'
    )
  );

CREATE POLICY "Playdate creators can update their playdates" ON public.playdates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Playdate creators can delete their playdates" ON public.playdates
  FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for playdate_participants table
CREATE POLICY "Users can view participants of playdates they can see" ON public.playdate_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.playdates p
      JOIN public.circle_members cm ON cm.circle_id = p.circle_id
      WHERE p.id = playdate_participants.playdate_id 
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
    )
  );

CREATE POLICY "Users can manage their own participation" ON public.playdate_participants
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for availability_slots table
CREATE POLICY "Users can manage their own availability" ON public.availability_slots
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for messages table
CREATE POLICY "Users can view messages in circles they belong to" ON public.messages
  FOR SELECT USING (
    (circle_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.circle_members 
      WHERE circle_members.circle_id = messages.circle_id 
      AND circle_members.user_id = auth.uid()
      AND circle_members.status = 'approved'
    )) OR
    (playdate_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.playdates p
      JOIN public.circle_members cm ON cm.circle_id = p.circle_id
      WHERE p.id = messages.playdate_id 
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
    ))
  );

CREATE POLICY "Users can send messages in circles they belong to" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    ((circle_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.circle_members 
      WHERE circle_members.circle_id = messages.circle_id 
      AND circle_members.user_id = auth.uid()
      AND circle_members.status = 'approved'
    )) OR
    (playdate_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.playdates p
      JOIN public.circle_members cm ON cm.circle_id = p.circle_id
      WHERE p.id = messages.playdate_id 
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
    )))
  );

-- RLS Policies for venues table
CREATE POLICY "Users can view venues in circles they belong to" ON public.venues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.circle_members 
      WHERE circle_members.circle_id = venues.circle_id 
      AND circle_members.user_id = auth.uid()
      AND circle_members.status = 'approved'
    )
  );

CREATE POLICY "Users can create venues in circles they belong to" ON public.venues
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.circle_members 
      WHERE circle_members.circle_id = venues.circle_id 
      AND circle_members.user_id = auth.uid()
      AND circle_members.status = 'approved'
    )
  );

CREATE POLICY "Venue creators can update their venues" ON public.venues
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Venue creators can delete their venues" ON public.venues
  FOR DELETE USING (auth.uid() = created_by);

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get available users for a time slot
CREATE OR REPLACE FUNCTION get_available_users(
  p_circle_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT u.id, u.full_name, u.email
  FROM public.users u
  JOIN public.circle_members cm ON cm.user_id = u.id
  WHERE cm.circle_id = p_circle_id
    AND cm.status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.availability_slots av
      WHERE av.user_id = u.id
        AND (
          (av.is_recurring = true AND av.day_of_week = EXTRACT(DOW FROM p_start_time))
          OR (av.is_recurring = false AND av.specific_date = p_start_time::DATE)
        )
        AND av.start_time <= p_start_time::TIME
        AND av.end_time >= p_end_time::TIME
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get playdate capacity info
CREATE OR REPLACE FUNCTION get_playdate_capacity(p_playdate_id UUID)
RETURNS TABLE (
  total_capacity INTEGER,
  current_participants INTEGER,
  spots_remaining INTEGER
) AS $$
DECLARE
  playdate_capacity INTEGER;
  current_count INTEGER;
BEGIN
  SELECT capacity INTO playdate_capacity
  FROM public.playdates
  WHERE id = p_playdate_id;
  
  SELECT COALESCE(SUM(num_children), 0) INTO current_count
  FROM public.playdate_participants
  WHERE playdate_id = p_playdate_id AND status = 'confirmed';
  
  RETURN QUERY
  SELECT 
    playdate_capacity,
    current_count,
    GREATEST(0, playdate_capacity - current_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
