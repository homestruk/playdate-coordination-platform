# 👥 User Roles & Capabilities Overview

## Current User Types

### 1. **Super Admin** (Platform Administrator)
**Database Field**: `users.is_super_admin = true`

**Full Platform Access:**
- ✅ View, create, update, delete ALL circles
- ✅ View, create, update, delete ALL playdates
- ✅ View, approve, remove ANY circle member
- ✅ View, delete ANY messages
- ✅ View, update, delete ANY venues
- ✅ View, manage ALL user profiles
- ✅ View ALL availability slots
- ✅ View ALL playdate participants

**Use Cases:**
- Platform moderation
- User support
- Data management
- Analytics and reporting

**Current Implementation Status:** ✅ Implemented in `002_roles_permissions.sql`

---

### 2. **Circle Admin** (Group Administrator)
**Database Field**: `circle_members.role = 'admin'` where `status = 'approved'`

**Circle-Level Access:**
- ✅ Update/delete their circle settings
- ✅ Approve/reject membership requests
- ✅ Remove members from circle
- ✅ View all circle members
- ✅ Delete any messages in circle chat
- ✅ Update/cancel/delete ANY playdate in their circle (not just their own)
- ✅ Moderate playdate discussions in their circle

**Limited Access:**
- ❌ Cannot view other circles
- ❌ Cannot access users outside their circle

**Use Cases:**
- Community moderation
- Member management
- Event oversight

**Current Implementation Status:** ✅ Implemented in `001_initial_schema.sql` + `002_roles_permissions.sql`

---

### 3. **Circle Member** (Regular User - Approved)
**Database Field**: `circle_members.role = 'member'` where `status = 'approved'`

**Circle-Level Access:**
- ✅ View their circle details
- ✅ View circle members
- ✅ Create playdates in their circles
- ✅ Update/delete playdates THEY created
- ✅ Join/leave playdates
- ✅ View playdate details
- ✅ Send messages in circle chat
- ✅ Send messages in playdate discussions
- ✅ Create venues in their circles
- ✅ Update/delete venues THEY created

**Personal Access:**
- ✅ View/update their own profile
- ✅ Manage their own availability slots
- ✅ Manage their own children profiles
- ✅ View their own favorite venues
- ✅ Write venue reviews
- ✅ Mark venues as favorites

**Limited Access:**
- ❌ Cannot approve members
- ❌ Cannot delete other users' messages
- ❌ Cannot update/delete other users' playdates
- ❌ Cannot view other circles they're not in

**Current Implementation Status:** ✅ Implemented in `001_initial_schema.sql`

---

### 4. **Pending Member**
**Database Field**: `circle_members.status = 'pending'`

**Limited Access:**
- ✅ Can see they have a pending request
- ❌ Cannot view circle content until approved
- ❌ Cannot view members
- ❌ Cannot view playdates
- ❌ Cannot send messages

**Use Cases:**
- Users who joined via invite code
- Awaiting admin approval

**Current Implementation Status:** ✅ Implemented in `001_initial_schema.sql`

---

### 5. **Public/Unauthenticated User**
**No account required**

**Limited Access:**
- ✅ View public venue listings (via venues API)
- ✅ View venue details
- ✅ View venue reviews
- ✅ Search for venues
- ❌ Cannot favorite venues
- ❌ Cannot write reviews
- ❌ Cannot view circles
- ❌ Cannot view playdates

**Use Cases:**
- Discovering platform features
- Browsing venues before signup

**Current Implementation Status:** ✅ Implemented in `005_venue_discovery_schema.sql`

---

## User Capabilities Matrix

| Feature | Public | Pending | Member | Circle Admin | Super Admin |
|---------|--------|---------|--------|--------------|-------------|
| **Authentication** |
| Sign up / Login | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update own profile | ❌ | ✅ | ✅ | ✅ | ✅ |
| View all users | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Circles** |
| Create circle | ❌ | ✅ | ✅ | ✅ | ✅ |
| Join circle | ❌ | ✅ | ✅ | ✅ | ✅ |
| View circle | ❌ | ❌ | ✅ | ✅ | ✅ |
| Update circle | ❌ | ❌ | ❌ | ✅ | ✅ |
| Delete circle | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve members | ❌ | ❌ | ❌ | ✅ | ✅ |
| Remove members | ❌ | ❌ | ❌ | ✅ | ✅ |
| View all circles | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Playdates** |
| Create playdate | ❌ | ❌ | ✅ | ✅ | ✅ |
| View playdate | ❌ | ❌ | ✅ | ✅ | ✅ |
| Update own playdate | ❌ | ❌ | ✅ | ✅ | ✅ |
| Update any playdate | ❌ | ❌ | ❌ | ✅* | ✅ |
| Delete own playdate | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete any playdate | ❌ | ❌ | ❌ | ✅* | ✅ |
| Join playdate | ❌ | ❌ | ✅ | ✅ | ✅ |
| View participants | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Venues** |
| Search venues | ✅ | ✅ | ✅ | ✅ | ✅ |
| View venue details | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create venue | ❌ | ❌ | ✅ | ✅ | ✅ |
| Update own venue | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete own venue | ❌ | ❌ | ✅ | ✅ | ✅ |
| Favorite venue | ❌ | ✅ | ✅ | ✅ | ✅ |
| Write review | ❌ | ✅ | ✅ | ✅ | ✅ |
| View reviews | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Messages** |
| Send circle message | ❌ | ❌ | ✅ | ✅ | ✅ |
| Send playdate message | ❌ | ❌ | ✅ | ✅ | ✅ |
| View messages | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete own message | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete any message | ❌ | ❌ | ❌ | ✅* | ✅ |
| **Availability** |
| Set availability | ❌ | ✅ | ✅ | ✅ | ✅ |
| View own availability | ❌ | ✅ | ✅ | ✅ | ✅ |
| View others' availability | ❌ | ❌ | ✅† | ✅† | ✅ |
| **Children** |
| Add child profile | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage own children | ❌ | ✅ | ✅ | ✅ | ✅ |

**Notes:**
- `*` = Only within their circle
- `†` = Only within circles they share

---

## 🚀 Recommended Enhancements

### Priority 1: Enhanced User Types

#### **1. Circle Co-Admin / Moderator**
**Problem:** Only one admin per circle can be limiting for large communities

**Proposed Solution:**
```sql
-- Add moderator role
ALTER TABLE circle_members
  DROP CONSTRAINT IF EXISTS circle_members_role_check;

ALTER TABLE circle_members
  ADD CONSTRAINT circle_members_role_check
  CHECK (role IN ('admin', 'moderator', 'member'));
```

**Moderator Capabilities:**
- ✅ Approve/reject members
- ✅ Delete inappropriate messages
- ✅ Edit/cancel playdates (with notifications to creator)
- ❌ Cannot delete circle
- ❌ Cannot remove admins
- ❌ Cannot change circle settings

**Benefits:**
- Distributed moderation
- Scalable for large circles
- Clear responsibility hierarchy

---

#### **2. Venue Contributor / Curator**
**Problem:** Venues currently tied to circles; no global venue curation

**Proposed Solution:**
```sql
-- Add venue curator role
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_venue_curator BOOLEAN DEFAULT false;

-- Curators can update any venue
CREATE POLICY "venue_curators_can_update" ON public.venues
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_venue_curator = true)
  );
```

**Curator Capabilities:**
- ✅ Update venue details (hours, amenities, etc.)
- ✅ Add photos to any venue
- ✅ Flag outdated information
- ❌ Cannot delete venues
- ❌ Cannot see private circle data

**Benefits:**
- Crowdsourced venue accuracy
- Community-driven maintenance
- Better venue data quality

---

#### **3. Event Organizer (Premium)**
**Problem:** Power users who organize many playdates need better tools

**Proposed Solution:**
```sql
-- Add organizer tier
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free' CHECK (user_tier IN ('free', 'organizer', 'premium'));
```

**Organizer Capabilities:**
- ✅ Create recurring playdates
- ✅ Send announcements to circle
- ✅ Export attendance reports
- ✅ Custom playdate templates
- ✅ Priority support
- ✅ Analytics dashboard

**Benefits:**
- Monetization opportunity
- Better tools for active users
- Increased engagement

---

### Priority 2: Feature Enhancements

#### **1. Verified Venue Badges**
```sql
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
```

**Display:**
- Show ✓ badge on verified venues
- Higher ranking in search
- Trust indicator for users

---

#### **2. Playdate Waiting Lists**
```sql
CREATE TABLE playdate_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playdate_id UUID REFERENCES playdates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playdate_id, user_id)
);
```

**Features:**
- Auto-notify when spots open
- Fair first-come ordering
- Reduces no-shows

---

#### **3. User Reputation System**
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_playdates_hosted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_playdates_attended INTEGER DEFAULT 0;

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- 'super_host', 'early_adopter', 'top_reviewer', etc.
  earned_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Benefits:**
- Encourage quality contributions
- Build trust in community
- Gamification for engagement

---

#### **4. Private/Public Circles**
```sql
ALTER TABLE circles
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted'));
```

**Public Circles:**
- Anyone can discover
- Auto-approve members
- Great for community events

**Unlisted:**
- Need invite code
- Visible to members
- Current behavior

**Private:**
- Invite only
- Hidden from search
- Maximum privacy

---

#### **5. Playdate RSVP Reminders**
```sql
CREATE TABLE playdate_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playdate_id UUID REFERENCES playdates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reminder_type TEXT CHECK (reminder_type IN ('24h_before', '1h_before', 'day_after')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Reminder Types:**
- 24 hours before: Confirm attendance
- 1 hour before: Last call
- Day after: Request review/feedback

---

#### **6. Advanced Search & Filters**
**Venue Search:**
- Age-appropriate venues
- Amenity filters (parking, accessibility)
- Open now filter
- Distance radius
- Price level

**Playdate Search:**
- By date range
- By circle
- By location
- By age range
- By availability

**Circle Search:**
- By location
- By size
- By activity focus

---

#### **7. Parent-to-Parent Direct Messages**
```sql
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only allow DMs between users who share a circle
CREATE POLICY "can_dm_circle_members" ON direct_messages
  FOR INSERT WITH CHECK (
    auth.uid() = from_user_id AND
    EXISTS (
      SELECT 1 FROM circle_members cm1
      JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
      WHERE cm1.user_id = from_user_id
        AND cm2.user_id = to_user_id
        AND cm1.status = 'approved'
        AND cm2.status = 'approved'
    )
  );
```

---

#### **8. Attendance Tracking & No-Show Protection**
```sql
ALTER TABLE playdate_participants
  ADD COLUMN IF NOT EXISTS attended BOOLEAN,
  ADD COLUMN IF NOT EXISTS marked_attended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(3,2) DEFAULT 1.0;
```

**Features:**
- Mark attendance after playdate
- Track reliability score
- Auto-warning after 3 no-shows
- Admins can see reliability scores

---

#### **9. Photo Upload for Venues & Playdates**
```sql
CREATE TABLE playdate_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playdate_id UUID REFERENCES playdates(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation:**
- Use Supabase Storage
- Image optimization
- Privacy controls (only circle members can see)

---

#### **10. Push Notifications & Email Preferences**
```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  new_playdate_created BOOLEAN DEFAULT true,
  playdate_reminder BOOLEAN DEFAULT true,
  playdate_cancelled BOOLEAN DEFAULT true,
  new_circle_message BOOLEAN DEFAULT true,
  membership_approved BOOLEAN DEFAULT true,
  playdate_full BOOLEAN DEFAULT false,
  email_digest_frequency TEXT DEFAULT 'daily' CHECK (email_digest_frequency IN ('realtime', 'daily', 'weekly', 'never'))
);
```

---

## 📊 User Journey Comparison

### Current Journey:
1. Sign up → Pending status
2. Create/join circle → Wait for approval
3. Approved → Can create/join playdates
4. Browse venues (limited to circle venues)

### Enhanced Journey:
1. Sign up → Browse public venues immediately
2. Create/join circle → Instant access to public circles
3. Build reputation → Earn badges & curator status
4. Upgrade to organizer → Advanced features
5. Become super contributor → Community recognition

---

## 🎯 Quick Wins (Easy Implementations)

### 1. **Add Display Name to Profile** (5 min)
Already in schema, just needs UI:
```typescript
// src/app/settings/page.tsx - add display_name field
```

### 2. **Show User Stats on Profile** (10 min)
```sql
-- Add view for user stats
CREATE VIEW user_stats AS
SELECT
  u.id,
  COUNT(DISTINCT p.id) as playdates_created,
  COUNT(DISTINCT pp.id) as playdates_attended,
  COUNT(DISTINCT vr.id) as reviews_written
FROM users u
LEFT JOIN playdates p ON p.created_by = u.id
LEFT JOIN playdate_participants pp ON pp.user_id = u.id
LEFT JOIN venue_reviews vr ON vr.user_id = u.id
GROUP BY u.id;
```

### 3. **Venue Visit Counter** (5 min)
Already in schema! Just needs UI display:
```typescript
// Show "X users have visited" on venue detail page
```

### 4. **Quick Action Buttons** (15 min)
Add to dashboard:
- "Find playmates near me" → Search circles by location
- "Discover venues" → Jump to venue search
- "My upcoming playdates" → Filtered playdate list

---

## 💡 Summary of Recommended Changes

**User Roles to Add:**
1. ✨ Moderator (circle co-admin)
2. ✨ Venue Curator (verified contributor)
3. ✨ Organizer Tier (premium features)

**Features to Add:**
1. ✨ User reputation & badges
2. ✨ Playdate waiting lists
3. ✨ Attendance tracking
4. ✨ Direct messages
5. ✨ Push notifications
6. ✨ Public/private circles
7. ✨ Photo uploads
8. ✨ Advanced search
9. ✨ Recurring playdates
10. ✨ Email reminders

**Quick Wins:**
1. Display name field in UI
2. User stats on profile
3. Visit counters
4. Quick action buttons

---

Would you like me to implement any of these enhancements? I can start with the quick wins or tackle a specific feature!
