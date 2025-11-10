# 🔐 Authentication & Authorization Flow

Complete breakdown of how each user type authenticates and what access they receive.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication Process](#authentication-process)
3. [User Type Flows](#user-type-flows)
4. [Authorization Levels](#authorization-levels)
5. [Security Architecture](#security-architecture)
6. [API Authentication](#api-authentication)
7. [Common Scenarios](#common-scenarios)

---

## Overview

### **Authentication Provider: Supabase Auth**

**Technology Stack:**
- **Frontend**: Next.js 16 with App Router
- **Auth**: Supabase Authentication (JWT-based)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Session**: HTTP-only cookies via Supabase

**Key Files:**
- `src/lib/supabase-client.ts` - Browser client
- `src/lib/supabase-server.ts` - Server-side client
- `src/middleware.ts` - Route protection
- `supabase/migrations/001_initial_schema.sql` - User schema + triggers

---

## Authentication Process

### **1. New User Signup Flow**

```
┌─────────────────────────────────────────────────────┐
│ Step 1: User Visits /signup                         │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 2: User Enters Information                     │
│  - Email address (required)                         │
│  - Password (required, min 6 chars)                 │
│  - Full name (optional)                             │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 3: Frontend calls supabase.auth.signUp()      │
│  POST → Supabase Auth API                           │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 4: Supabase Creates Auth User                  │
│  - Generates UUID user ID                           │
│  - Hashes password with bcrypt                      │
│  - Stores in auth.users table                       │
│  - Sends email verification (optional)              │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 5: Database Trigger Fires                      │
│  on_auth_user_created → handle_new_user()           │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 6: Profile Created in public.users             │
│  INSERT INTO public.users:                          │
│   - id: UUID (matches auth.users.id)                │
│   - email: From auth                                │
│   - full_name: From metadata                        │
│   - avatar_url: From metadata                       │
│   - is_super_admin: false (default)                 │
│   - created_at: NOW()                               │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 7: JWT Token Issued                            │
│  - Access token (1 hour expiry)                     │
│  - Refresh token (stored in HTTP-only cookie)       │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 8: User Redirected to /dashboard               │
│  - Session established                              │
│  - Cookies set                                      │
│  - User is now authenticated                        │
└─────────────────────────────────────────────────────┘
```

**SQL Trigger (Automatic Profile Creation):**
```sql
-- From 001_initial_schema.sql
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### **2. Existing User Login Flow**

```
┌─────────────────────────────────────────────────────┐
│ Step 1: User Visits /login                          │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 2: User Enters Credentials                     │
│  - Email                                            │
│  - Password                                         │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 3: Frontend calls supabase.auth.signInWith... │
│  POST → Supabase Auth API                           │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 4: Supabase Validates Credentials              │
│  - Looks up email in auth.users                     │
│  - Compares password hash                           │
│  - Returns error if invalid                         │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 5: JWT Token Issued (if valid)                 │
│  - Access token with claims:                        │
│    {                                                │
│      "sub": "user-uuid",                            │
│      "email": "user@example.com",                   │
│      "role": "authenticated",                       │
│      "iat": 1234567890,                             │
│      "exp": 1234571490                              │
│    }                                                │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 6: Session Established                         │
│  - Tokens stored in HTTP-only cookies               │
│  - Client-side session object available             │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Step 7: User Redirected to /dashboard               │
│  - Middleware allows access to protected routes     │
└─────────────────────────────────────────────────────┘
```

**Frontend Login Code:**
```typescript
// src/app/login/page.tsx
const handleLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    toast.error('Invalid credentials')
    return
  }

  router.push('/dashboard')
}
```

---

### **3. Session Validation Flow**

**Every Request:**

```
┌─────────────────────────────────────────────────────┐
│ User Makes Request to Protected Route               │
│  GET /dashboard                                     │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Middleware Intercepts (src/middleware.ts)            │
│  - Checks for auth cookies                          │
│  - Validates JWT signature                          │
│  - Checks token expiration                          │
└─────────────────────────────────────────────────────┘
                     ↓
        ┌─────────────────────┐
        │ Token Valid?        │
        └─────────────────────┘
                ↓                 ↓
           ✅ YES              ❌ NO
                ↓                 ↓
┌───────────────────────┐  ┌───────────────────────┐
│ Allow Request         │  │ Redirect to /login    │
│ Continue to page      │  │ Clear invalid session │
└───────────────────────┘  └───────────────────────┘
                ↓
┌─────────────────────────────────────────────────────┐
│ Page Component Loads                                │
│  - Server component fetches user data               │
│  - RLS policies enforce data access                 │
└─────────────────────────────────────────────────────┘
```

**Middleware Code:**
```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup')

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users to login
  if (!user && !isAuthPage && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
```

---

## User Type Flows

### **Type 1: Public/Unauthenticated User**

**Authentication Status:** ❌ None

**Access Flow:**
```
User visits site
     ↓
No auth cookies found
     ↓
Middleware allows access to:
  - /login
  - /signup
  - /venues (view only)
  - /venues/[id] (view only)
     ↓
All other routes → Redirect to /login
```

**What They Can Do:**
- ✅ Browse venue listings
- ✅ View venue details
- ✅ View venue reviews
- ✅ Search for venues
- ✅ Sign up for account
- ❌ Cannot favorite venues
- ❌ Cannot write reviews
- ❌ Cannot view circles
- ❌ Cannot view playdates

**Database Access:**
```sql
-- RLS Policy for venues (public read)
CREATE POLICY "Anyone can view venues" ON public.venues
  FOR SELECT USING (true);

-- RLS Policy for venue_reviews (public read)
CREATE POLICY "Anyone can view venue reviews" ON public.venue_reviews
  FOR SELECT USING (true);
```

---

### **Type 2: Authenticated User (No Circles)**

**Authentication Status:** ✅ Logged In

**Access Flow:**
```
User logs in successfully
     ↓
JWT token issued and stored
     ↓
Session established
     ↓
Redirected to /dashboard
     ↓
Can access authenticated routes
     ↓
NOT a member of any circles yet
     ↓
Limited data access via RLS
```

**What They Can Do:**
- ✅ View/update own profile
- ✅ Browse venues
- ✅ Write venue reviews
- ✅ Favorite venues
- ✅ Set availability
- ✅ **Create new circles**
- ✅ **Join circles via invite code**
- ❌ Cannot view circles they're not in
- ❌ Cannot view playdates (no circles)
- ❌ Cannot send messages (no circles)

**Authorization Check:**
```typescript
// Every authenticated request includes user ID
const { data: { user } } = await supabase.auth.getUser()

// User can only access their own data
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)  // RLS enforces this
  .single()
```

**Database Access:**
```sql
-- Can only see their own profile
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Can create circles
CREATE POLICY "Users can create circles" ON public.circles
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Can join circles
CREATE POLICY "Users can join circles" ON public.circle_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

### **Type 3: Pending Circle Member**

**Authentication Status:** ✅ Logged In

**Circle Status:** ⏳ Pending Approval

**Access Flow:**
```
User joins circle via invite code
     ↓
INSERT INTO circle_members:
  - user_id: auth.uid()
  - circle_id: circle-uuid
  - status: 'pending'  ← KEY
  - role: 'member'
     ↓
RLS blocks access to circle content
     ↓
User sees "Pending Approval" in UI
     ↓
Waiting for admin to approve
```

**What They Can Do:**
- ✅ Everything from Type 2
- ✅ See they have a pending request
- ✅ Cancel pending request
- ❌ Cannot view circle details
- ❌ Cannot view circle members
- ❌ Cannot view playdates in circle
- ❌ Cannot send messages

**Database Record:**
```sql
-- Pending membership example
SELECT * FROM circle_members WHERE user_id = 'user-uuid';

| id | circle_id | user_id | role   | status  | joined_at |
|----|-----------|---------|--------|---------|-----------|
| 1  | circle-1  | user-1  | member | pending | 2025-11-10|
```

**RLS Enforcement:**
```sql
-- Users can only view circles they're APPROVED in
CREATE POLICY "Users can view circles they are members of" ON public.circles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_members.circle_id = circles.id
      AND circle_members.user_id = auth.uid()
      AND circle_members.status = 'approved'  -- ← KEY CHECK
    )
  );
```

---

### **Type 4: Approved Circle Member**

**Authentication Status:** ✅ Logged In

**Circle Status:** ✅ Approved

**Access Flow:**
```
Admin approves membership
     ↓
UPDATE circle_members:
  SET status = 'approved'
  WHERE user_id = 'user-uuid'
     ↓
RLS now allows access to circle data
     ↓
User can view circle content
     ↓
User can participate in activities
```

**What They Can Do:**
- ✅ Everything from Type 2
- ✅ **View circle details**
- ✅ **View circle members**
- ✅ **Create playdates in circle**
- ✅ **Join playdates**
- ✅ **Send/view messages in circle**
- ✅ **Create venues in circle**
- ✅ Update/delete own content
- ❌ Cannot approve other members
- ❌ Cannot update circle settings
- ❌ Cannot delete circle
- ❌ Cannot remove members

**Database Record:**
```sql
SELECT * FROM circle_members WHERE user_id = 'user-uuid';

| id | circle_id | user_id | role   | status   | joined_at |
|----|-----------|---------|--------|----------|-----------|
| 1  | circle-1  | user-1  | member | approved | 2025-11-10|
```

**Authorization Examples:**

**Can View Circle:**
```typescript
const { data: circle } = await supabase
  .from('circles')
  .select('*')
  .eq('id', circleId)
  .single()

// RLS allows this because user has approved membership
```

**Can Create Playdate:**
```typescript
const { data: playdate } = await supabase
  .from('playdates')
  .insert({
    circle_id: circleId,
    created_by: user.id,  // Must match auth.uid()
    title: 'Park Playdate',
    start_time: '2025-11-15 14:00:00',
    // ...
  })

// RLS checks:
// 1. User is authenticated (auth.uid() exists)
// 2. created_by matches auth.uid()
// 3. User has approved membership in circle
```

**Can Send Message:**
```typescript
const { data: message } = await supabase
  .from('messages')
  .insert({
    circle_id: circleId,
    user_id: user.id,
    content: 'Hello everyone!',
  })

// RLS Policy checks user is approved member
```

---

### **Type 5: Circle Admin**

**Authentication Status:** ✅ Logged In

**Circle Status:** ✅ Approved

**Role:** 👑 Admin

**Access Flow:**
```
User creates circle → Automatic admin
  OR
Existing admin promotes user
     ↓
INSERT/UPDATE circle_members:
  - role: 'admin'  ← KEY
  - status: 'approved'
     ↓
RLS grants additional permissions
     ↓
Can manage circle and moderate content
```

**What They Can Do:**
- ✅ Everything from Type 4
- ✅ **Update circle settings**
- ✅ **Delete circle**
- ✅ **Approve/reject member requests**
- ✅ **Remove members**
- ✅ **Promote members to admin**
- ✅ **Delete any messages in circle**
- ✅ **Update/delete any playdates in circle**
- ❌ Cannot access other circles (unless member)
- ❌ Cannot see all users (unless super admin)

**Database Record:**
```sql
SELECT * FROM circle_members WHERE user_id = 'admin-uuid';

| id | circle_id | user_id   | role  | status   | joined_at |
|----|-----------|-----------|-------|----------|-----------|
| 1  | circle-1  | admin-1   | admin | approved | 2025-11-01|
```

**Authorization Examples:**

**Can Update Circle:**
```typescript
const { data } = await supabase
  .from('circles')
  .update({ name: 'New Name' })
  .eq('id', circleId)

// RLS Policy:
CREATE POLICY "Circle admins can update circles" ON public.circles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_members.circle_id = circles.id
      AND circle_members.user_id = auth.uid()
      AND circle_members.role = 'admin'  -- ← KEY CHECK
      AND circle_members.status = 'approved'
    )
  );
```

**Can Approve Members:**
```typescript
const { data } = await supabase
  .from('circle_members')
  .update({ status: 'approved' })
  .eq('id', membershipId)
  .eq('circle_id', circleId)

// RLS checks current user is admin of this circle
```

**Can Delete Messages:**
```typescript
const { data } = await supabase
  .from('messages')
  .delete()
  .eq('id', messageId)

// RLS Policy (from 002_roles_permissions.sql):
CREATE POLICY "circle_admin_delete_messages" ON public.messages
  FOR DELETE USING (
    circle_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = messages.circle_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'approved'
    )
  );
```

---

### **Type 6: Super Admin (PTC Leader)**

**Authentication Status:** ✅ Logged In

**Super Admin Status:** 👑 Platform Admin

**Access Flow:**
```
User promoted via SQL:
  SELECT promote_to_super_admin('email@example.com');
     ↓
UPDATE public.users:
  SET is_super_admin = true
     ↓
RLS grants god-mode access
     ↓
Can access ALL data and admin routes
```

**What They Can Do:**
- ✅ Everything from all previous types
- ✅ **Access admin dashboard** (`/admin`)
- ✅ **View ALL circles** (across platform)
- ✅ **View ALL playdates** (across platform)
- ✅ **View ALL users**
- ✅ **Access ALL data** (via super admin policies)
- ✅ **Manage any circle**
- ✅ **Delete any content**
- ✅ **View platform analytics**
- ❌ Cannot modify other users' is_super_admin (must use SQL)

**Database Record:**
```sql
SELECT email, is_super_admin FROM public.users WHERE email = 'ptc-leader@school.com';

| email                    | is_super_admin |
|--------------------------|----------------|
| ptc-leader@school.com    | true           |
```

**Authorization Examples:**

**Admin Dashboard Access:**
```typescript
// src/app/admin/page.tsx
useEffect(() => {
  const checkAdminAccess = async () => {
    const response = await fetch('/api/admin/check')

    if (!response.ok) {
      toast.error('You do not have admin access')
      router.push('/dashboard')
      return
    }

    setIsAdmin(true)
    // Load admin data...
  }

  checkAdminAccess()
}, [])
```

**API Route Protection:**
```typescript
// src/app/api/admin/stats/route.ts
export async function GET() {
  const supabase = await createClient()

  // Check admin status
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_super_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Continue with admin operation...
}
```

**Database Access (All Data):**
```sql
-- Super admin policies (from 002_roles_permissions.sql)
CREATE POLICY "super_admin_all_circles" ON public.circles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.is_super_admin = true)
  );

CREATE POLICY "super_admin_all_playdates" ON public.playdates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.is_super_admin = true)
  );

-- Applies to ALL tables
```

**Query Any Data:**
```typescript
// As super admin, can query anything
const { data: allCircles } = await supabase
  .from('circles')
  .select('*')
// Returns ALL circles, not just ones user is in

const { data: allUsers } = await supabase
  .from('users')
  .select('*')
// Returns ALL users

const { data: allPlaydates } = await supabase
  .from('playdates')
  .select('*')
// Returns ALL playdates across all circles
```

---

## Authorization Levels

### **Permission Matrix**

| Action | Public | Auth User | Pending | Member | Admin | Super Admin |
|--------|--------|-----------|---------|--------|-------|-------------|
| **Authentication** |
| Sign up | ✅ | - | - | - | - | - |
| Login | ✅ | - | - | - | - | - |
| View own profile | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Circles** |
| View circle list | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create circle | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Join circle | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View circle details | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Update circle | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Delete circle | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve members | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View ALL circles | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Playdates** |
| View playdates | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create playdate | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Update own playdate | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Update any playdate | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ |
| Delete own playdate | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete any playdate | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ |
| Join playdate | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| View ALL playdates | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Messages** |
| View messages | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Send messages | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete own message | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete any message | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ |
| **Venues** |
| Search venues | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View venue details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create venue | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Favorite venue | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Write review | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all reviews | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** |
| Access /admin | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View platform stats | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

`*` = Only within their circle

---

## Security Architecture

### **Defense in Depth: Multiple Security Layers**

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Client-Side (Middleware)                  │
│  - Route protection                                 │
│  - Session validation                               │
│  - Token refresh                                    │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: API Routes                                 │
│  - Auth check: supabase.auth.getUser()              │
│  - Role validation (admin, super admin)             │
│  - Input validation (Zod schemas)                   │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: Supabase Client                            │
│  - JWT validation                                   │
│  - Token expiry check                               │
│  - Signature verification                           │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Layer 4: Database (RLS Policies)                    │
│  - Row-level security                               │
│  - auth.uid() enforcement                           │
│  - Role-based policies                              │
│  - FINAL AUTHORITY                                  │
└─────────────────────────────────────────────────────┘
```

**Key Principle:**
> Even if client-side or API checks are bypassed, RLS policies at the database level will still enforce authorization.

---

### **JWT Token Structure**

**Access Token (1 hour expiry):**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // User ID
  "email": "user@example.com",
  "aud": "authenticated",
  "role": "authenticated",
  "iat": 1699564800,  // Issued at
  "exp": 1699568400,  // Expires at (1 hour)
  "session_id": "session-uuid"
}
```

**Refresh Token:**
- Stored in HTTP-only cookie
- Used to get new access token
- 30 day expiry
- Cannot be accessed by JavaScript

---

## API Authentication

### **Server-Side API Routes**

**Pattern:**
```typescript
// src/app/api/[endpoint]/route.ts
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Step 1: Get authenticated user
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  // Step 2: Check role/permissions (if needed)
  const { data: userData } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (requiresAdmin && !userData?.is_super_admin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  }

  // Step 3: Query data (RLS applies automatically)
  const { data, error: queryError } = await supabase
    .from('table_name')
    .select('*')

  // RLS policies determine what data is returned

  return NextResponse.json({ data })
}
```

---

## Common Scenarios

### **Scenario 1: Parent Signs Up**

```
1. Visit /signup
2. Enter: email, password, name
3. Click "Sign Up"
   → Supabase creates auth user
   → Trigger creates profile (is_super_admin: false)
   → JWT issued
4. Redirected to /dashboard
5. See empty state (no circles yet)
6. Click "Create Circle" or "Join Circle"
```

---

### **Scenario 2: Parent Joins Grade Circle**

```
1. Receive invite code from PTC leader
2. Go to /circles
3. Click "Join Circle"
4. Enter invite code
5. Submit
   → INSERT INTO circle_members (status: 'pending')
6. See "Pending Approval" status
7. Wait for admin approval
8. Admin approves
   → UPDATE circle_members (status: 'approved')
9. Parent now sees circle content
10. Can create/join playdates
```

---

### **Scenario 3: PTC Leader Becomes Super Admin**

```
1. Sign up normal account
2. PTC leader goes to Supabase SQL Editor
3. Runs: SELECT promote_to_super_admin('ptc@school.com')
   → UPDATE users SET is_super_admin = true
4. PTC leader refreshes dashboard
5. Sees "Admin Dashboard" link appear
6. Clicks → Access to /admin
7. Can view all circles and playdates
```

---

### **Scenario 4: Room Parent Becomes Circle Admin**

```
1. Room parent joins circle (status: pending)
2. Grade coordinator (existing admin) approves
3. Grade coordinator goes to circle settings
4. Promotes room parent to admin
   → UPDATE circle_members SET role = 'admin'
5. Room parent can now:
   - Approve new members
   - Manage playdates
   - Moderate messages
```

---

### **Scenario 5: Session Expiry**

```
1. User logged in (token issued at 2:00 PM)
2. User browses site for 1 hour
3. At 3:00 PM, token expires
4. User clicks link
   → Middleware detects expired token
   → Uses refresh token to get new access token
   → New token issued automatically
5. User continues (seamless experience)

If refresh token also expired:
   → Redirect to /login
   → User must sign in again
```

---

## Summary

**Key Takeaways:**

1. **Supabase Auth** handles all authentication (signup, login, sessions)
2. **JWT tokens** store user identity and are validated on every request
3. **Middleware** protects routes at the Next.js level
4. **RLS policies** enforce authorization at the database level (final authority)
5. **User types** determine access via:
   - `auth.uid()` - Basic authentication
   - `circle_members.status` - Circle access
   - `circle_members.role` - Admin permissions
   - `users.is_super_admin` - Platform admin

**Security is enforced at EVERY layer:**
- Frontend: Middleware
- API: Auth checks
- Database: RLS policies

**Even if you bypass the first two layers, RLS will block unauthorized access at the database.**

---

## 🔗 Related Files

- **Schema**: `supabase/migrations/001_initial_schema.sql`
- **RLS Policies**: `supabase/migrations/002_roles_permissions.sql`
- **Super Admin**: `supabase/migrations/006_super_admin_helper.sql`
- **Middleware**: `src/middleware.ts`
- **Supabase Clients**: `src/lib/supabase-*.ts`

---

**Need help with authentication? Check the logs:**
- Browser Console (F12) for client errors
- Supabase Dashboard → Logs for auth events
- Terminal for API route errors
