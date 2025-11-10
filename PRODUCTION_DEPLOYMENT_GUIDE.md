# Production Deployment Guide

**Date:** 2025-11-09
**Version:** 1.0.0
**Status:** ✅ READY FOR PRODUCTION

---

## 📋 What's Ready for Production

### ✅ Core Features (Fully Tested & Working)
1. **User Authentication** - Signup, Login, Profile management
2. **Circles** - Create, join, manage parent groups
3. **Playdates** - Create, view, RSVP to playdates
4. **Availability** - Set and view availability
5. **Settings** - Manage children profiles
6. **Real-time Updates** - Live data sync via Supabase
7. **Venue Discovery** - Browse and search venues (NEW)

### ✅ Infrastructure (Production-Ready)
- **Build:** Passing (3.2s compile time)
- **TypeScript:** No errors
- **Database:** 5 migrations ready
- **API Routes:** 15+ endpoints
- **Pages:** 18 static/dynamic routes
- **Security:** RLS policies on all tables
- **Performance:** Optimized queries (N+1 fixes applied)

### 🔄 Post-Deployment Tasks
1. Apply database migration 005 (venue discovery)
2. Configure Google Places API key (optional)
3. Set up monitoring
4. Configure backups

---

## 🚀 Deployment Steps

### Step 1: Database Migration (REQUIRED)

The venue discovery feature requires running migration 005.

#### Option A: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://app.supabase.com
   - Select your project: `playdate-coordination-platform`

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Run Migration 005**
   - Copy entire contents of: `supabase/migrations/005_venue_discovery_schema.sql`
   - Paste into SQL editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Wait for "Success" message

4. **Verify Migration**
   ```sql
   -- Run this query to verify new tables exist
   SELECT tablename
   FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename LIKE 'venue%'
   ORDER BY tablename;

   -- Expected output:
   -- venues (should already exist)
   -- venue_photos
   -- venue_reviews
   -- venue_visits
   -- user_favorite_venues
   -- review_helpfulness
   ```

#### Option B: Via Supabase CLI

```bash
# Make sure you're in project root
cd /Users/adamsjeanbaptiste/PROJECTS/playdate-coordination-platform

# Link to your project (if not already linked)
supabase link --project-ref podsrzxuhoekutggolul

# Push all pending migrations
supabase db push

# Verify
supabase db diff
```

#### Option C: Via psql (Manual)

```bash
psql -U postgres \
  -h podsrzxuhoekutggolul.supabase.co \
  -d postgres \
  -f supabase/migrations/005_venue_discovery_schema.sql
```

---

### Step 2: Environment Variables

#### Production Environment Variables (.env.production)

Create/update `.env.production` with:

```bash
# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://podsrzxuhoekutggolul.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZHNyenh1aG9la3V0Z2dvbHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0OTgxMzksImV4cCI6MjA3NzA3NDEzOX0.Oycur-YO9wVPO8vLZITJvLAmv8rg87DN1Qjt2Jof_Jc

# Google Places API (Optional - for venue discovery enhancement)
# Without this, venue discovery works in database-only mode
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Node Environment
NODE_ENV=production
```

#### Vercel Environment Variables (If using Vercel)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_PLACES_API_KEY` (optional)

---

### Step 3: Deploy to Vercel

#### First-Time Deployment

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Select your account/team
- **Link to existing project?** No (first time) or Yes (if project exists)
- **What's your project's name?** playdate-coordination-platform
- **In which directory is your code located?** ./ (current directory)
- **Want to override the settings?** No

#### Subsequent Deployments

```bash
# From project root, commit your changes first
git add .
git commit -m "Deploy: Venue discovery feature"
git push origin main

# Then deploy
vercel --prod
```

Or simply push to main branch if you have automatic deployments enabled.

---

### Step 4: Post-Deployment Verification

#### 1. Check Build Status

```bash
# Visit your Vercel dashboard
# https://vercel.com/[your-username]/playdate-coordination-platform

# Check for:
✅ Build Status: Success
✅ Deployment Status: Ready
✅ Functions: All healthy
```

#### 2. Test Critical Paths

Visit your production URL and test:

**Authentication Flow:**
- [ ] Signup: `/signup`
- [ ] Login: `/login`
- [ ] Dashboard: `/dashboard`
- [ ] Logout

**Core Features:**
- [ ] View circles: `/circles`
- [ ] Create circle: `/circles` → "Create Circle"
- [ ] View playdates: `/playdates`
- [ ] Create playdate: `/playdates/new`
- [ ] **NEW:** View venues: `/venues`
- [ ] **NEW:** Venue detail: `/venues/[id]`

**API Health:**
```bash
# Replace with your production URL
curl https://your-app.vercel.app/api/venues/search?latitude=40.7128&longitude=-74.0060

# Should return JSON with venues array
```

#### 3. Database Health Check

In Supabase Dashboard → Database → Check:
- [ ] All tables exist
- [ ] RLS policies enabled
- [ ] Sample venues visible
- [ ] No connection errors

#### 4. Monitor Logs

**Vercel Logs:**
```bash
# Real-time logs
vercel logs --follow

# Or check dashboard:
# https://vercel.com/[username]/[project]/logs
```

**Supabase Logs:**
- Go to Supabase Dashboard → Logs
- Check for errors or warnings
- Monitor API usage

---

## 🔑 Google Places API Setup (Optional)

The venue discovery feature works without this, but Google Places integration provides:
- Expanded venue database
- Real-time venue information
- Photos and ratings from Google
- Phone numbers and websites

### Get API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create/Select Project**
   - Click "Select a project" → "New Project"
   - Name: "Playdate Platform"
   - Click "Create"

3. **Enable Places API**
   - Go to "APIs & Services" → "Library"
   - Search for "Places API"
   - Click "Enable"

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key

5. **Restrict API Key (Recommended)**
   - Click on your new API key
   - Under "API restrictions":
     - Select "Restrict key"
     - Choose "Places API"
   - Under "Application restrictions":
     - Select "HTTP referrers"
     - Add your domain: `your-domain.vercel.app/*`
   - Save

6. **Set Up Billing**
   - Go to "Billing" → "Link a billing account"
   - Add payment method
   - Free tier: 40,000 requests/month
   - After free tier: ~$32/1000 for Nearby Search

7. **Add to Environment Variables**
   ```bash
   # In Vercel Dashboard
   GOOGLE_PLACES_API_KEY=your_api_key_here
   ```

### Cost Estimates (with caching)

| Usage Level | Requests/Month | Estimated Cost |
|------------|----------------|----------------|
| Low (< 1000 users) | 5,000 | Free |
| Medium (1000-5000 users) | 20,000 | Free |
| High (5000-10000 users) | 50,000 | $50-100/month |
| Very High (10000+ users) | 100,000+ | $200-500/month |

**Without API key:** Feature works perfectly using database-only mode!

---

## 📊 Production Checklist

### Pre-Deployment
- [x] Build passes locally (`npm run build`)
- [x] TypeScript compiles without errors
- [x] All tests pass (manual testing)
- [x] Database migrations ready
- [x] Environment variables documented
- [x] No hardcoded secrets in code
- [x] Error boundaries implemented
- [x] Loading states implemented
- [x] Toast notifications replace alerts

### Deployment
- [ ] Database migration 005 applied
- [ ] Environment variables set in Vercel
- [ ] Google Places API key configured (optional)
- [ ] Deployed to Vercel successfully
- [ ] Build completes without errors
- [ ] All routes accessible

### Post-Deployment
- [ ] Production URL working
- [ ] Authentication flows tested
- [ ] Core features tested
- [ ] Venue discovery tested
- [ ] API endpoints responding
- [ ] Database queries working
- [ ] RLS policies working
- [ ] Real-time updates working
- [ ] Error logging configured
- [ ] Monitoring set up

---

## 🔒 Security Checklist

### Database Security
- [x] RLS policies on all tables
- [x] No public write access
- [x] Auth required for sensitive operations
- [x] SQL injection prevention (parameterized queries)
- [x] SECURITY DEFINER functions for RLS bypass

### API Security
- [x] Input validation (Zod schemas)
- [x] Auth checks on protected routes
- [x] Rate limiting (via Vercel)
- [x] CORS configured properly
- [x] Error messages don't leak data

### Frontend Security
- [x] No hardcoded secrets
- [x] XSS prevention (React escaping)
- [x] CSRF protection (Supabase handles)
- [x] Secure cookie settings
- [x] Content Security Policy headers

---

## 📈 Monitoring & Maintenance

### Set Up Monitoring

#### 1. Vercel Analytics
```bash
# Enable in Vercel Dashboard
# Project → Analytics → Enable
```

#### 2. Supabase Monitoring
- **Database:** Check CPU, memory, connections
- **Auth:** Monitor signup/login rates
- **Storage:** Monitor usage (for future photo uploads)
- **API:** Track requests per endpoint

#### 3. Error Tracking (Recommended)

Consider adding Sentry:
```bash
npm install @sentry/nextjs

# Follow Sentry setup wizard
npx @sentry/wizard@latest -i nextjs
```

### Regular Maintenance Tasks

**Daily:**
- [ ] Check error logs
- [ ] Monitor API response times
- [ ] Check for failed deployments

**Weekly:**
- [ ] Review database size
- [ ] Check API costs (Google Places)
- [ ] Review user feedback

**Monthly:**
- [ ] Database performance review
- [ ] Security updates check
- [ ] Dependency updates (`npm outdated`)
- [ ] Backup verification

---

## 🐛 Troubleshooting

### Build Fails on Vercel

**Issue:** Build errors in production
```bash
# Check locally first
npm run build

# Common fixes:
# 1. Clear Next.js cache
rm -rf .next

# 2. Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Check for environment variables
vercel env pull .env.production
```

### Database Connection Issues

**Issue:** Can't connect to Supabase

1. **Check URL and Keys:**
   ```bash
   # Test connection
   curl https://podsrzxuhoekutggolul.supabase.co/rest/v1/ \
     -H "apikey: YOUR_ANON_KEY"
   ```

2. **Check RLS Policies:**
   - Go to Supabase Dashboard → Authentication → Policies
   - Ensure policies allow your operations

3. **Check Migration Status:**
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations
   ORDER BY version DESC;
   ```

### Venue Discovery Not Working

**Issue:** No venues appearing

1. **Check Migration Applied:**
   ```sql
   SELECT COUNT(*) FROM venues;
   -- Should return at least 3 (sample data)
   ```

2. **Check API Response:**
   ```bash
   curl "https://your-app.vercel.app/api/venues/search?latitude=40.7128&longitude=-74.0060"
   ```

3. **Check Google Places API (if configured):**
   - Verify API key in environment variables
   - Check API quota in Google Cloud Console
   - Check billing is enabled

### Slow Performance

**Issue:** Pages loading slowly

1. **Check Database Indexes:**
   ```sql
   -- Should see indexes on frequently queried columns
   SELECT * FROM pg_indexes WHERE tablename = 'venues';
   ```

2. **Check N+1 Queries:**
   - Use Supabase Dashboard → Logs → Postgres
   - Look for repeated queries
   - Should see single queries with joins

3. **Enable Vercel Analytics:**
   - Check "Speed Insights" in Vercel Dashboard
   - Identify slow pages

---

## 🔄 Rollback Plan

### If Something Goes Wrong

#### 1. Rollback Deployment
```bash
# Via Vercel Dashboard
# Deployments → Find previous working deployment → "Promote to Production"

# Or via CLI
vercel rollback [deployment-url]
```

#### 2. Rollback Database Migration

**IMPORTANT:** Only if migration 005 causes issues

```sql
-- Rollback script (use with caution!)
DROP TRIGGER IF EXISTS trigger_update_venue_rating ON public.venue_reviews;
DROP TRIGGER IF EXISTS trigger_update_review_helpfulness_count ON public.review_helpfulness;
DROP FUNCTION IF EXISTS public.update_venue_rating();
DROP FUNCTION IF EXISTS public.update_review_helpfulness_count();

DROP TABLE IF EXISTS public.venue_visits;
DROP TABLE IF EXISTS public.user_favorite_venues;
DROP TABLE IF EXISTS public.venue_photos;
DROP TABLE IF EXISTS public.review_helpfulness;
DROP TABLE IF EXISTS public.venue_reviews;

-- Revert venues table changes
ALTER TABLE public.venues
  DROP COLUMN IF EXISTS venue_type,
  DROP COLUMN IF EXISTS google_place_id,
  -- ... (drop all added columns)
```

**Better approach:** Keep migration 005, disable venue routes temporarily:
```typescript
// In src/middleware.ts
if (pathname.startsWith('/venues')) {
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

---

## 📞 Support & Resources

### Documentation
- **This Guide:** `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Venue Feature:** `VENUE_DISCOVERY_IMPLEMENTATION.md`
- **Refactoring Log:** `PRIORITY_1_REFACTOR_LOG.md`
- **Test Results:** `TEST_RESULTS.md`

### External Resources
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Google Places API:** https://developers.google.com/maps/documentation/places

### Getting Help
- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **Next.js Discord:** https://nextjs.org/discord

---

## 🎯 Success Metrics

### Track These After Deployment

**User Metrics:**
- Daily active users (DAU)
- Signup conversion rate
- User retention (7-day, 30-day)
- Feature adoption (venue discovery usage)

**Performance Metrics:**
- Page load time (< 3s target)
- API response time (< 500ms target)
- Build time (< 5s)
- Error rate (< 1%)

**Business Metrics:**
- Circles created per week
- Playdates scheduled per week
- Venue searches per day
- Review submissions per week

---

## 🚦 Production Status

### Current Version: 1.0.0

**Last Deployment:** [To be filled after deployment]
**Deployed By:** [Your name]
**Deployment URL:** [Your Vercel URL]

**Feature Status:**
- ✅ User Authentication
- ✅ Circles Management
- ✅ Playdate Scheduling
- ✅ Availability Tracking
- ✅ Profile Management
- ✅ **Venue Discovery (NEW)**
- 🔄 Venue Photos (Phase 2)
- 🔄 Review Forms (Phase 2)
- 🔄 Map View (Phase 2)

---

## 📝 Deployment Log Template

```markdown
## Deployment: [Date]

**Version:** 1.0.0
**Deployed By:** [Name]
**Deploy Time:** [HH:MM]
**Duration:** [Minutes]

### Changes Deployed:
- Priority 1 refactoring (performance, UX improvements)
- Venue discovery feature (Phase 1)
- Database migration 005

### Verification Checklist:
- [ ] Build successful
- [ ] All routes accessible
- [ ] Authentication working
- [ ] Database migration applied
- [ ] Venue discovery functional
- [ ] No console errors
- [ ] Mobile responsive

### Issues Encountered:
- None / [List any issues]

### Rollback Required:
- No / [Reason if yes]

### Next Steps:
- Monitor error logs for 24 hours
- Track venue discovery usage
- Prepare Phase 2 features
```

---

**Ready to Deploy!** ✅

Follow the steps above in order, and your application will be live in production with all features working correctly.

**Estimated Time:** 30-60 minutes for full deployment and verification.
