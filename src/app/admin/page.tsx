/**
 * School Admin Dashboard
 * For PTC leaders and super admins to oversee all circles and activities
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Link from 'next/link'
import {
  Users,
  Calendar,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminStats {
  total_circles: number
  total_users: number
  total_playdates: number
  upcoming_playdates: number
  total_venues: number
  pending_members: number
  active_today: number
  messages_today: number
}

interface Circle {
  id: string
  name: string
  description: string
  member_count: number
  pending_count: number
  admin_names: string[]
  upcoming_playdates: number
  created_at: string
}

interface UpcomingPlaydate {
  id: string
  title: string
  circle_name: string
  circle_id: string
  start_time: string
  location_name: string
  participant_count: number
  capacity: number
  created_by_name: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [circles, setCircles] = useState<Circle[]>([])
  const [upcomingPlaydates, setUpcomingPlaydates] = useState<UpcomingPlaydate[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/admin/check')

      if (!response.ok) {
        toast.error('You do not have admin access')
        window.location.href = '/dashboard'
        return
      }

      setIsAdmin(true)
      await Promise.all([
        fetchStats(),
        fetchCircles(),
        fetchUpcomingPlaydates(),
      ])
    } catch (error) {
      console.error('Error checking admin access:', error)
      toast.error('Failed to verify admin access')
      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Failed to load statistics')
    }
  }

  const fetchCircles = async () => {
    try {
      const response = await fetch('/api/admin/circles')
      if (!response.ok) throw new Error('Failed to fetch circles')
      const data = await response.json()
      setCircles(data.circles)
    } catch (error) {
      console.error('Error fetching circles:', error)
      toast.error('Failed to load circles')
    }
  }

  const fetchUpcomingPlaydates = async () => {
    try {
      const response = await fetch('/api/admin/playdates?status=upcoming&limit=10')
      if (!response.ok) throw new Error('Failed to fetch playdates')
      const data = await response.json()
      setUpcomingPlaydates(data.playdates)
    } catch (error) {
      console.error('Error fetching playdates:', error)
      toast.error('Failed to load playdates')
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading admin dashboard..." />
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">School Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Overview of all circles, playdates, and parent activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Circles</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.total_circles || 0}</p>
                </div>
                <Users className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Parents</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.total_users || 0}</p>
                </div>
                <Users className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.upcoming_playdates || 0}</p>
                </div>
                <Calendar className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.pending_members || 0}</p>
                </div>
                <Clock className="h-10 w-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.active_today || 0} parents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Messages Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.messages_today || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Venues</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.total_venues || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* All Circles */}
          <Card>
            <CardHeader>
              <CardTitle>All Grade Circles</CardTitle>
              <CardDescription>Overview of all parent groups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {circles.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No circles yet</p>
                ) : (
                  circles.map((circle) => (
                    <div
                      key={circle.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{circle.name}</h3>
                          <p className="text-sm text-gray-600">{circle.description}</p>
                        </div>
                        <Link href={`/circles/${circle.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {circle.member_count} parents
                        </Badge>

                        {circle.pending_count > 0 && (
                          <Badge variant="outline" className="text-orange-600">
                            <Clock className="h-3 w-3 mr-1" />
                            {circle.pending_count} pending
                          </Badge>
                        )}

                        {circle.upcoming_playdates > 0 && (
                          <Badge variant="outline" className="text-blue-600">
                            <Calendar className="h-3 w-3 mr-1" />
                            {circle.upcoming_playdates} upcoming
                          </Badge>
                        )}
                      </div>

                      {circle.admin_names.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Admins: {circle.admin_names.join(', ')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Playdates */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>All scheduled playdates across circles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingPlaydates.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No upcoming playdates</p>
                ) : (
                  upcomingPlaydates.map((playdate) => (
                    <div
                      key={playdate.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{playdate.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <Badge variant="outline" className="mr-2">
                              {playdate.circle_name}
                            </Badge>
                          </p>
                        </div>
                        <Link href={`/playdates/${playdate.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600 mt-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(playdate.start_time).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>

                        {playdate.location_name && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {playdate.location_name}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {playdate.participant_count} / {playdate.capacity} participants
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 mt-2">
                        Organized by: {playdate.created_by_name}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button asChild variant="outline" className="h-auto py-4">
                <Link href="/circles">
                  <Users className="h-5 w-5 mr-2" />
                  Manage All Circles
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto py-4">
                <Link href="/playdates">
                  <Calendar className="h-5 w-5 mr-2" />
                  View All Playdates
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto py-4">
                <Link href="/venues">
                  <MapPin className="h-5 w-5 mr-2" />
                  Manage Venues
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
