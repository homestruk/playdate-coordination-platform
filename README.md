# Playdate Coordination Platform

A modern web application for trusted circles of parents to coordinate playdates with time-boxed availability, capacity management, and real-time updates.

## Features

### 🔐 Authentication
- Email/password authentication
- Social login (Google, Facebook)
- Secure user profiles

### 👥 Circle Management
- Create trusted parent circles
- Invite-only system with unique codes
- Request-to-join with admin approval
- Member role management (admin/member)

### 📅 Playdate Coordination
- Plan playdates with date/time selection
- Location management with address details
- Capacity management with real-time tracking
- RSVP system (Confirmed/Interested/Declined)
- Number of children tracking

### ⏰ Availability Management
- Set recurring weekly availability
- Specific date overrides
- Visual calendar interface
- Availability matching algorithm

### 💬 Real-time Messaging
- Circle-wide chat
- Playdate-specific messaging
- Real-time message delivery
- User presence indicators

### 📊 Dashboard
- Upcoming playdates overview
- Circle membership summary
- Quick action buttons
- Real-time notifications

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **UI Components**: shadcn/ui
- **State Management**: React Context + Hooks
- **Deployment**: Vercel + Supabase

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd playdate-coordination-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: OAuth providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

# Optional: Maps integration
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

5. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL migration from `supabase/migrations/001_initial_schema.sql`
   - Enable Row Level Security (RLS) policies
   - Configure OAuth providers if needed

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following main tables:

- **users**: Extended user profiles
- **circles**: Parent groups/trusted circles
- **circle_members**: Many-to-many relationship with roles
- **playdates**: Playdate events with capacity management
- **playdate_participants**: RSVPs and attendance tracking
- **availability_slots**: User availability windows
- **messages**: Circle and playdate messaging
- **venues**: Saved locations/venues

## Key Features Implementation

### Capacity Management
- Real-time capacity tracking
- Visual indicators when at capacity
- Automatic RSVP status updates

### Time-boxed Availability
- Query availability across circle members
- Filter by playdate date/time range
- Show available members during planning

### Real-time Updates
- Supabase subscriptions for messages
- Live RSVP updates
- Circle member notifications
- Optimistic UI updates

### Security
- Row Level Security (RLS) policies
- User authentication and authorization
- Data privacy controls

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Supabase Configuration

## Supabase Update Plate

Use this plate to safely update Supabase schema/policies and data.

1) Backup and link
```bash
supabase link --project-ref <project_ref>
npm run db:dump
```

2) Env sanity
Ensure `.env.local` has: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPERADMIN_EMAILS`. Restart dev.

3) Apply migrations
```bash
npm run db:push
```

4) Validate & backfill (optional)
- Validate schema/trigger in `supabase/plate/validate.sql`
- Backfill profiles and creator memberships via:
```bash
curl -s -X POST http://localhost:3000/api/admin/backfill | jq .
```

5) Elevate super admins
```bash
npm run elevate | jq .
```

6) Seed demo data (optional)
```bash
npm run seed:demo | jq .
```

7) Verify UI
- Create circle → membership row → dashboard updates
- Admin-only: delete messages (circle/playdate), cancel playdates. Members cannot.

1. Set up production Supabase project
2. Configure OAuth providers
3. Set up custom domains if needed
4. Enable real-time features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository or contact the development team.