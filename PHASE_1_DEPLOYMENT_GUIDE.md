# 🚀 Phase 1 Deployment Guide
## School Admin Dashboard & Circle Switcher

---

## ✅ What's Been Built

### 1. **School Admin Dashboard** (`/admin`)
A comprehensive overview dashboard for PTC leaders:
- Total circles, active parents, upcoming events stats
- Activity metrics (messages today, active users)
- List of all grade circles with member counts
- List of all upcoming playdates across all circles
- Quick action buttons

### 2. **Circle Switcher**
Quick navigation dropdown for parents with kids in multiple grades:
- Shows all circles user is a member of
- Displays admin status
- Shows pending circles
- Unread message count (last 24 hours)
- Quick access to join more circles

### 3. **Super Admin System**
- Helper SQL functions to promote/demote admins
- Secure admin-only API routes
- RLS policies enforced at database level

### 4. **Documentation**
- `USER_ROLES_AND_CAPABILITIES.md` - Complete role breakdown
- `SCHOOL_PTC_USE_CASE.md` - School-specific recommendations
- This deployment guide

---

## 📋 Deployment Steps

### **Step 1: Apply Database Migration** (5 min)

1. **Go to Supabase SQL Editor:**
   https://app.supabase.com → Your Project → SQL Editor

2. **Run migration 006:**
   ```sql
   -- Copy & paste contents of:
   -- supabase/migrations/006_super_admin_helper.sql
   ```

3. **Verify:**
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name LIKE '%super_admin%';
   -- Should show: promote_to_super_admin, demote_super_admin, is_super_admin
   ```

---

### **Step 2: Promote Yourself to Super Admin** (2 min)

**In Supabase SQL Editor:**

```sql
-- Replace with your email address
SELECT promote_to_super_admin('your-email@example.com');
```

**Verify:**
```sql
SELECT email, is_super_admin
FROM public.users
WHERE email = 'your-email@example.com';
-- Should show: is_super_admin = true
```

---

### **Step 3: Automatic Deployment** (0 min)

Since your GitHub repo is connected to Vercel:
- ✅ Push to main triggers automatic deployment
- ✅ Build should complete in ~2-3 minutes
- ✅ Monitor at: https://vercel.com/adams-projects-8a3bc807/playdate-coordination-platform

---

### **Step 4: Test Features** (5 min)

1. **Visit your production site:**
   https://playdate-coordination-platform-3n0thccr7.vercel.app

2. **Login with your account**

3. **Check Dashboard:**
   - You should see the Circle Switcher in the header
   - If you're a super admin, you'll see "Admin Dashboard" link in navigation

4. **Visit Admin Dashboard:**
   https://playdate-coordination-platform-3n0thccr7.vercel.app/admin

   You should see:
   - Platform stats (circles, users, events)
   - List of all circles
   - Upcoming playdates across all circles

5. **Test Circle Switcher:**
   - Click the "My Circles" dropdown in header
   - Should show all circles you're a member of
   - Click a circle to navigate

---

## 🎉 You're Live!

### **What You Can Do Now:**

**As Super Admin:**
- View all circles across all grade levels
- See all upcoming playdates
- Monitor platform activity
- Access analytics

**As Any User:**
- Quick navigation between circles (grades)
- See unread message counts
- View admin status badges
- One-click to join more circles

---

## 🔐 Security Notes

1. **Admin Access:**
   - Only users with `is_super_admin = true` can access `/admin`
   - API routes check admin status via RLS
   - Non-admins are redirected to dashboard

2. **Circle Membership:**
   - Users only see circles they're members of
   - Circle Switcher respects approval status
   - RLS policies prevent unauthorized access

3. **Data Privacy:**
   - Admins can view aggregated stats only
   - Personal user data remains protected
   - Circle boundaries are respected

---

## 📊 Admin Dashboard Features

### **Stats Cards:**
- **Total Circles** - Number of grade groups
- **Active Parents** - Total registered users
- **Upcoming Events** - Published playdates
- **Pending Approvals** - Members waiting for approval

### **Activity Metrics:**
- **Active Today** - Users who created content today
- **Messages Today** - Chat activity in last 24 hours
- **Total Venues** - Added locations

### **Circle Overview:**
Each circle card shows:
- Circle name and description
- Member count (approved only)
- Pending member count (if any)
- Upcoming playdate count
- Admin names
- Quick "View" button

### **Playdate Overview:**
Each playdate card shows:
- Event title
- Circle (grade level)
- Date and time
- Location
- Participant count / capacity
- Organizer name
- Quick "View" button

---

## 🛠️ Troubleshooting

### **Can't See Admin Dashboard Link?**
```sql
-- Check your admin status
SELECT email, is_super_admin FROM public.users WHERE email = 'your-email@example.com';

-- If false, promote yourself
SELECT promote_to_super_admin('your-email@example.com');

-- Refresh the page
```

### **Admin Dashboard Shows "Unauthorized"?**
- Clear browser cache
- Log out and log back in
- Verify database connection in Vercel env vars

### **Circle Switcher Not Showing?**
- Verify you're a member of at least one circle
- Check circle_members table for your user_id
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### **Build Failed?**
```bash
# Test locally first
npm run build

# If successful, push again
git push origin main
```

---

## 📈 Next Steps (Phase 2)

Ready to build more? Here's what's next:

### **Option A: Bulk Invite System**
- Import parent email lists
- Send batch invitations
- Track signup progress
- Send reminder emails

### **Option B: Event Types**
- PTC meetings vs playdates
- Fundraisers
- Volunteer events
- Color-coded calendar

### **Option C: Recurring Events**
- Weekly park meetups
- Monthly PTC meetings
- Standing coffee dates
- Automated schedule generation

Want to proceed with Phase 2? Let me know which feature you'd like next!

---

## 📞 Support

**Database Issues:**
- Check Supabase logs: https://app.supabase.com
- Verify RLS policies are enabled
- Check user permissions

**Deployment Issues:**
- Check Vercel logs
- Verify environment variables
- Test build locally first

**Feature Requests:**
- Refer to `SCHOOL_PTC_USE_CASE.md`
- See `USER_ROLES_AND_CAPABILITIES.md` for ideas

---

## ✨ Quick Reference

**Key URLs:**
- Production: https://playdate-coordination-platform-3n0thccr7.vercel.app
- Admin Dashboard: https://playdate-coordination-platform-3n0thccr7.vercel.app/admin
- GitHub: https://github.com/homestruk/playdate-coordination-platform
- Supabase: https://app.supabase.com

**Key Files:**
- Admin Dashboard: `src/app/admin/page.tsx`
- Circle Switcher: `src/components/navigation/CircleSwitcher.tsx`
- Admin API: `src/app/api/admin/**`
- Migration: `supabase/migrations/006_super_admin_helper.sql`

**SQL Helpers:**
```sql
-- Promote user to super admin
SELECT promote_to_super_admin('email@example.com');

-- Demote super admin
SELECT demote_super_admin('email@example.com');

-- Check if current user is super admin
SELECT is_super_admin();
```

---

**🎓 Perfect for School PTCs!**
Now you can manage multiple grade-level circles and coordinate parent activities across your school community.
