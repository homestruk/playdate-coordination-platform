'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRealtimePlaydates, useRealtimeCircles } from '@/hooks/useRealtime'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, MessageSquare, Plus, Settings, LogOut, Bell, MapPin, Shield } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleSwitcher } from '@/components/navigation/CircleSwitcher'

interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_super_admin?: boolean
}

interface Circle {
  id: string
  name: string
  description: string | null
  created_by: string
  invite_code: string
  created_at: string
  members_count: number
}

interface Playdate {
  id: string
  title: string
  description: string | null
  location_name: string | null
  start_time: string
  end_time: string
  capacity: number
  status: string
  participants_count: number
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  
  // Use real-time hooks
  const { circles } = useRealtimeCircles()
  const { playdates } = useRealtimePlaydates()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/login')
        return
      }

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(userData)
      // Fire-and-forget super admin elevation (once per email)
      try {
        const key = `elevated:${authUser.email}`
        if (authUser.email && !localStorage.getItem(key)) {
          fetch('/api/admin/elevate', { method: 'POST' })
            .then(() => localStorage.setItem(key, '1'))
            .catch(() => {})
        }
      } catch {}
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  // Filter upcoming playdates
  const upcomingPlaydates = playdates
    .filter(playdate => 
      new Date(playdate.start_time) >= new Date() && 
      playdate.status === 'published'
    )
    .slice(0, 5)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">Playdate Coordinator</h1>
              <CircleSwitcher />
            </div>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={user?.avatar_url || ''} />
                <AvatarFallback>
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user?.full_name || 'User'}</p>
                <p className="text-gray-500">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Get started with common tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link href="/circles/new">
                    <Button className="w-full h-20 flex flex-col items-center justify-center">
                      <Users className="h-6 w-6 mb-2" />
                      Create Circle
                    </Button>
                  </Link>
                  <Link href="/playdates/new">
                    <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                      <Calendar className="h-6 w-6 mb-2" />
                      Plan Playdate
                    </Button>
                  </Link>
                  <Link href="/venues">
                    <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                      <MapPin className="h-6 w-6 mb-2" />
                      Find Venues
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Playdates */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Upcoming Playdates</CardTitle>
                  <CardDescription>Your next playdate events</CardDescription>
                </div>
                <Link href="/playdates">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {upcomingPlaydates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No upcoming playdates</p>
                    <Link href="/playdates/new">
                      <Button variant="outline" className="mt-4">Plan your first playdate</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingPlaydates.map((playdate) => (
                      <div key={playdate.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{playdate.title}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(playdate.start_time).toLocaleDateString()} at {new Date(playdate.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {playdate.location_name && (
                            <p className="text-sm text-gray-500">📍 {playdate.location_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">
                            {playdate.participants_count}/{playdate.capacity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Your Circles */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Your Circles</CardTitle>
                  <CardDescription>Parent groups you belong to</CardDescription>
                </div>
                <Link href="/circles">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {circles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No circles yet</p>
                    <Link href="/circles/new">
                      <Button variant="outline" className="mt-4">Create your first circle</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {circles.map((circle) => (
                      <Link key={circle.id} href={`/circles/${circle.id}`}>
                        <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <h3 className="font-medium text-gray-900">{circle.name}</h3>
                          <p className="text-sm text-gray-500">{circle.members_count} members</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card>
              <CardHeader>
                <CardTitle>Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <nav className="space-y-2">
                  <Link href="/circles" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <Users className="h-5 w-5" />
                    <span>Circles</span>
                  </Link>
                  <Link href="/playdates" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <Calendar className="h-5 w-5" />
                    <span>Playdates</span>
                  </Link>
                  <Link href="/venues" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <MapPin className="h-5 w-5" />
                    <span>Venues</span>
                  </Link>
                  <Link href="/availability" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <Calendar className="h-5 w-5" />
                    <span>Availability</span>
                  </Link>
                  <Link href="/profile" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <Settings className="h-5 w-5" />
                    <span>Profile</span>
                  </Link>
                  {user?.is_super_admin && (
                    <Link href="/admin" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 bg-blue-50 text-blue-600">
                      <Shield className="h-5 w-5" />
                      <span className="font-medium">Admin Dashboard</span>
                    </Link>
                  )}
                </nav>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
