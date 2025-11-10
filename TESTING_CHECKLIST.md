# 🧪 Phase 1 Testing Checklist

Before applying the database migration and deploying, test these features locally.

---

## 🔧 Prerequisites

✅ Dev server running: http://localhost:3000
✅ Database: Connected to Supabase
✅ User account: You have an existing account

---

## 📝 Test Plan

### **Test 1: Circle Switcher (Without Admin)**

**What to test:**
The circle switcher should work for any user with circles.

**Steps:**
1. Go to http://localhost:3000
2. Login with your account
3. Go to `/dashboard`

**Expected:**
- [ ] You should see a "My Circles" dropdown button in the header (next to "Playdate Coordinator")
- [ ] Click the dropdown
- [ ] Should show all circles you're a member of
- [ ] Each circle should show:
  - Circle name
  - Description (if any)
  - Member count
  - Admin badge (if you're an admin)
  - Unread count badge (if messages in last 24h)
- [ ] Click a circle → Should navigate to that circle's page
- [ ] Should show "Join Another Circle" option at bottom

**If you have NO circles:**
- [ ] Button should say "Join a Circle"
- [ ] Click it → Should go to `/circles` page

**If you have PENDING circles:**
- [ ] Should show in separate "Pending Approval" section
- [ ] Should be grayed out/disabled

---

### **Test 2: Admin Dashboard Access (Before Migration)**

**What to test:**
Admin dashboard should be blocked until you run the migration.

**Steps:**
1. Still logged in, go to http://localhost:3000/admin

**Expected:**
- [ ] Should redirect you back to `/dashboard`
- [ ] Should show a toast error: "You do not have admin access"
- [ ] URL changes back to `/dashboard`

**Why:**
Because you haven't run the migration yet and aren't a super admin.

---

### **Test 3: Apply Database Migration**

**Now let's make you a super admin!**

**Steps:**
1. Open a new tab: https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New query"
5. Copy the contents of `supabase/migrations/006_super_admin_helper.sql` from your project
6. Paste into SQL Editor
7. Click "Run" (or press Cmd/Ctrl + Enter)

**Expected:**
- [ ] Success message: "Success. No rows returned"
- [ ] No errors

**Verify functions were created:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%super_admin%';
```

**Expected:**
- [ ] Should return 3 rows:
  - `promote_to_super_admin`
  - `demote_super_admin`
  - `is_super_admin`

---

### **Test 4: Promote Yourself to Super Admin**

**Steps:**
1. Still in SQL Editor, run:
```sql
-- Replace with YOUR email
SELECT promote_to_super_admin('your-email@example.com');
```

**Expected:**
- [ ] Success message with result: `true`

**Verify:**
```sql
SELECT email, is_super_admin
FROM public.users
WHERE email = 'your-email@example.com';
```

**Expected:**
- [ ] Should show your email
- [ ] `is_super_admin` column should be `true`

---

### **Test 5: Admin Dashboard Access (After Migration)**

**What to test:**
Admin dashboard should now be accessible.

**Steps:**
1. Go back to http://localhost:3000/dashboard
2. **Hard refresh** the page (Cmd+Shift+R / Ctrl+Shift+R)
3. Look in the Navigation sidebar

**Expected:**
- [ ] Should see "Admin Dashboard" link (with shield icon)
- [ ] Should have blue background
- [ ] Text should say "Admin Dashboard" in bold

4. Click "Admin Dashboard"

**Expected:**
- [ ] URL changes to `/admin`
- [ ] Page loads (no redirect)
- [ ] Shows "School Admin Dashboard" title
- [ ] Shows stats cards:
  - Total Circles
  - Active Parents
  - Upcoming Events
  - Pending Approvals

---

### **Test 6: Admin Dashboard - Stats**

**What to test:**
All stats should display real data from your database.

**Check each stat card:**

**Total Circles:**
- [ ] Shows a number (could be 0)
- [ ] Has blue users icon

**Active Parents:**
- [ ] Shows total user count
- [ ] Has green users icon

**Upcoming Events:**
- [ ] Shows count of future playdates
- [ ] Has purple calendar icon

**Pending Approvals:**
- [ ] Shows count of pending circle members
- [ ] Has orange clock icon

**Activity Stats:**
- [ ] Active Today: Shows users who created content today
- [ ] Messages Today: Shows message count from last 24 hours
- [ ] Total Venues: Shows venue count

---

### **Test 7: Admin Dashboard - Circle List**

**What to test:**
Left column should show all circles in the platform.

**Expected:**
- [ ] Card titled "All Grade Circles"
- [ ] If you have circles:
  - [ ] Each circle shows:
    - Name and description
    - Member count badge
    - Pending count badge (if any)
    - Upcoming playdates badge (if any)
    - Admin names listed at bottom
    - "View" button
  - [ ] Click "View" → Should go to that circle's page
- [ ] If no circles:
  - [ ] Shows "No circles yet"

---

### **Test 8: Admin Dashboard - Playdate List**

**What to test:**
Right column should show upcoming playdates across all circles.

**Expected:**
- [ ] Card titled "Upcoming Events"
- [ ] If you have upcoming playdates:
  - [ ] Each playdate shows:
    - Title
    - Circle name badge
    - Date and time
    - Location (if set)
    - Participant count / capacity
    - Organizer name
    - "View" button
  - [ ] Click "View" → Should go to that playdate's page
- [ ] If no upcoming playdates:
  - [ ] Shows "No upcoming playdates"

---

### **Test 9: Admin Dashboard - Quick Actions**

**What to test:**
Bottom section should have action buttons.

**Expected:**
- [ ] Three buttons:
  - "Manage All Circles" → Goes to `/circles`
  - "View All Playdates" → Goes to `/playdates`
  - "Manage Venues" → Goes to `/venues`
- [ ] Click each button to verify navigation

---

### **Test 10: Circle Switcher (With Multiple Circles)**

**What to test:**
If you're in multiple circles, test navigation.

**Steps:**
1. Go back to `/dashboard`
2. Click the Circle Switcher dropdown

**If you have 2+ circles:**
- [ ] All circles are listed
- [ ] Click a circle → URL changes to `/circles/{id}`
- [ ] The circle you clicked should now have a checkmark ✓
- [ ] Click dropdown again → Checkmark should be on current circle

**Test unread counts:**
1. Go to a circle's messages page
2. Post a message
3. Go back to dashboard
4. Open Circle Switcher

**Expected:**
- [ ] That circle should show a red badge with count

---

### **Test 11: Non-Admin User (Optional)**

**If you have a second test account:**

**Steps:**
1. Logout
2. Login with a different account (not super admin)
3. Go to `/dashboard`

**Expected:**
- [ ] Circle Switcher works normally
- [ ] NO "Admin Dashboard" link in navigation
- [ ] If they try to go to `/admin` directly:
  - [ ] Should redirect to `/dashboard`
  - [ ] Should show error toast

---

### **Test 12: API Endpoints**

**Test the new API routes directly:**

**Admin Check:**
```bash
# In terminal (while logged in as admin in browser)
curl http://localhost:3000/api/admin/check
```
**Expected:**
```json
{"is_admin":true}
```

**Admin Stats:**
```bash
curl http://localhost:3000/api/admin/stats
```
**Expected:**
```json
{
  "stats": {
    "total_circles": 2,
    "total_users": 5,
    "total_playdates": 3,
    "upcoming_playdates": 1,
    "total_venues": 10,
    "pending_members": 0,
    "active_today": 1,
    "messages_today": 2
  }
}
```

**My Circles:**
```bash
curl http://localhost:3000/api/circles/my-circles
```
**Expected:**
```json
{
  "circles": [
    {
      "id": "...",
      "name": "Kindergarten",
      "description": "...",
      "member_count": 5,
      "unread_count": 0,
      "role": "admin",
      "status": "approved"
    }
  ]
}
```

---

## ✅ Testing Complete Checklist

**Before Deployment:**
- [ ] Circle Switcher shows all my circles
- [ ] Circle Switcher navigation works
- [ ] Admin Dashboard is accessible (after migration)
- [ ] Admin Dashboard shows correct stats
- [ ] All circles listed in admin dashboard
- [ ] Upcoming playdates shown correctly
- [ ] Quick action buttons work
- [ ] Non-admin users can't access admin dashboard
- [ ] No console errors in browser (F12 → Console)
- [ ] No TypeScript errors: `npm run build` passes

**Migration Checklist:**
- [ ] Migration 006 applied successfully in Supabase
- [ ] Helper functions created (3 functions)
- [ ] I'm promoted to super admin (`is_super_admin = true`)
- [ ] Other users still have `is_super_admin = false`

---

## 🐛 Common Issues

### **Issue: Circle Switcher shows "Loading..."**
**Fix:**
- Check browser console for errors
- Verify `/api/circles/my-circles` endpoint works
- Check that you're authenticated

### **Issue: Admin Dashboard redirects me**
**Fix:**
- Hard refresh the page (Cmd+Shift+R)
- Check your `is_super_admin` status in database
- Verify migration was applied
- Clear browser cache

### **Issue: Stats show 0 for everything**
**Fix:**
- This is normal if you have no data yet!
- Create a circle, playdate, or venue to see stats update
- Refresh the admin dashboard

### **Issue: "Module not found: dropdown-menu"**
**Fix:**
```bash
npx shadcn@latest add dropdown-menu --yes
npm run dev
```

---

## 📊 Test Data Recommendations

**To fully test the admin dashboard, you should have:**

**Minimum test data:**
- [ ] At least 1 circle
- [ ] At least 1 other user (as circle member)
- [ ] At least 1 upcoming playdate
- [ ] At least 1 message in a circle

**Ideal test data:**
- [ ] 3-4 circles (representing different grades)
- [ ] 5-10 users across circles
- [ ] 3-5 upcoming playdates
- [ ] Some pending circle members
- [ ] A few messages in different circles

**To create test data quickly:**
1. Create multiple circles from `/circles`
2. Generate invite codes
3. Join circles with different test accounts
4. Create playdates from `/playdates/new`
5. Send some messages in circle chats

---

## ✅ Ready to Deploy?

Once all tests pass:

1. **Commit any fixes:**
```bash
git add .
git commit -m "fix: address testing issues"
git push origin main
```

2. **Vercel will auto-deploy**
   - Monitor: https://vercel.com
   - Takes 2-3 minutes

3. **Test on production:**
   - Visit: https://playdate-coordination-platform-3n0thccr7.vercel.app
   - Login and verify all features work
   - Test admin dashboard
   - Test circle switcher

4. **Share with other PTC members!**

---

## 🎉 Success Criteria

**Phase 1 is successful when:**
- ✅ You can access admin dashboard as super admin
- ✅ Admin dashboard shows accurate stats
- ✅ You can see all circles and playdates
- ✅ Circle switcher allows quick navigation
- ✅ Non-admin users can't access admin features
- ✅ No errors in console or logs
- ✅ Works on both local and production

---

**Happy Testing! 🚀**

Let me know if you encounter any issues during testing.
