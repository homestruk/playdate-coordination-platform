'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Users, Plus, ArrowLeft, CheckCircle, XCircle, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/format'
import { getPlaydateStatusColor } from '@/lib/status'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Circle {
  id: string
  name: string
  description: string | null
}

interface Playdate {
  id: string
  circle_id: string
  created_by: string
  title: string
  description: string | null
  location_name: string | null
  location_address: string | null
  lat: number | null
  lng: number | null
  start_time: string
  end_time: string
  capacity: number
  status: string
  created_at: string
  circles: Circle
  participants_count: number
  user_participation: {
    status: string
    num_children: number
  } | null
}

function PlaydatesPageContent() {
  const [playdates, setPlaydates] = useState<Playdate[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCircle, setSelectedCircle] = useState<string>('all')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/login')
        return
      }

      // Get user's circles
      const { data: circlesData } = await supabase
        .from('circle_members')
        .select(`
          circles (
            id,
            name,
            description
          )
        `)
        .eq('user_id', authUser.id)
        .eq('status', 'approved')

      const circlesList = (circlesData || []).map((item: any) => item.circles)
      setCircles(circlesList)

      // Get playdates with participant counts and user participation in optimized queries
      const circleId = searchParams.get('circle')
      const circleIds = circlesList.map(c => c.id)

      if (circleIds.length === 0) {
        setPlaydates([])
        setLoading(false)
        return
      }

      let playdatesQuery = supabase
        .from('playdates')
        .select(`
          *,
          circles (
            id,
            name,
            description
          ),
          playdate_participants!left (
            id,
            status,
            num_children,
            user_id
          )
        `)
        .in('circle_id', circleIds)
        .order('start_time', { ascending: false })

      if (circleId) {
        playdatesQuery = playdatesQuery.eq('circle_id', circleId)
        setSelectedCircle(circleId)
      }

      const { data: playdatesData } = await playdatesQuery

      // Transform data to include participant counts and user participation
      const playdatesWithParticipation = (playdatesData || []).map((playdate: any) => {
        const participants = playdate.playdate_participants || []
        const confirmedCount = participants.filter((p: any) => p.status === 'confirmed').length
        const userParticipation = participants.find((p: any) => p.user_id === authUser.id)

        return {
          ...playdate,
          participants_count: confirmedCount,
          user_participation: userParticipation ? {
            status: userParticipation.status,
            num_children: userParticipation.num_children
          } : null
        }
      })

      setPlaydates(playdatesWithParticipation)
      setLoading(false)
    }

    getUser()
  }, [router, supabase, searchParams])

  const handleRSVP = async (playdateId: string, status: string, numChildren: number = 1) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    try {
      // Check if user already has a participation record
      const { data: existingParticipation } = await supabase
        .from('playdate_participants')
        .select('id')
        .eq('playdate_id', playdateId)
        .eq('user_id', authUser.id)
        .single()

      if (existingParticipation) {
        // Update existing participation
        await supabase
          .from('playdate_participants')
          .update({ status, num_children: numChildren })
          .eq('id', existingParticipation.id)
      } else {
        // Create new participation
        await supabase
          .from('playdate_participants')
          .insert({
            playdate_id: playdateId,
            user_id: authUser.id,
            status,
            num_children: numChildren
          })
      }

      // Refresh playdates
      const { data: updatedPlaydate } = await supabase
        .from('playdate_participants')
        .select('status, num_children')
        .eq('playdate_id', playdateId)
        .eq('user_id', authUser.id)
        .single()

      setPlaydates(playdates.map(p => 
        p.id === playdateId 
          ? { 
              ...p, 
              user_participation: updatedPlaydate,
              participants_count: status === 'confirmed' ? p.participants_count + 1 : p.participants_count
            }
          : p
      ))
    } catch (error) {
      console.error('Error updating RSVP:', error)
    }
  }

  const filterPlaydates = (playdates: Playdate[]) => {
    if (selectedCircle === 'all') return playdates
    return playdates.filter(p => p.circle_id === selectedCircle)
  }

  if (loading) {
    return <LoadingSpinner message="Loading playdates..." />
  }

  const filteredPlaydates = filterPlaydates(playdates)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-blue-600 hover:underline mr-4">
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Playdates</h1>
            </div>
            <Link href="/playdates/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Plan Playdate
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <Label htmlFor="circleFilter">Filter by Circle:</Label>
                <Select value={selectedCircle} onValueChange={setSelectedCircle}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Circles</SelectItem>
                    {circles.map((circle) => (
                      <SelectItem key={circle.id} value={circle.id}>
                        {circle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Playdates List */}
          {filteredPlaydates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-16">
                  <Calendar className="h-24 w-24 mx-auto mb-8 text-gray-300" />
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">No playdates found</h2>
                  <p className="text-gray-600 mb-8">
                    {selectedCircle === 'all' 
                      ? "No playdates have been planned yet" 
                      : "No playdates found for this circle"
                    }
                  </p>
                  <Link href="/playdates/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Plan your first playdate
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlaydates.map((playdate) => {
                const { date, time } = formatDateTime(playdate.start_time)
                const endTime = formatDateTime(playdate.end_time).time
                const isAtCapacity = playdate.participants_count >= playdate.capacity
                const userStatus = playdate.user_participation?.status

                return (
                  <Card key={playdate.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{playdate.title}</CardTitle>
                          <CardDescription>{playdate.circles.name}</CardDescription>
                        </div>
                        <Badge variant={getPlaydateStatusColor(playdate.status as any)}>
                          {playdate.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Date & Time */}
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>{time} - {endTime}</span>
                        </div>

                        {/* Location */}
                        {playdate.location_name && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>{playdate.location_name}</span>
                          </div>
                        )}

                        {/* Description */}
                        {playdate.description && (
                          <p className="text-sm text-gray-600">{playdate.description}</p>
                        )}

                        {/* Capacity */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{playdate.participants_count}/{playdate.capacity} spots</span>
                          </div>
                          {isAtCapacity && (
                            <Badge variant="destructive">Full</Badge>
                          )}
                        </div>

                        {/* RSVP Actions */}
                        <div className="space-y-2">
                          {userStatus === 'confirmed' ? (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">
                                Confirmed ({playdate.user_participation?.num_children} children)
                              </span>
                            </div>
                          ) : userStatus === 'interested' ? (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="text-sm text-blue-600">Interested</span>
                            </div>
                          ) : userStatus === 'declined' ? (
                            <div className="flex items-center space-x-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-600">Declined</span>
                            </div>
                          ) : null}

                          <div className="flex space-x-2">
                            <Link href={`/playdates/${playdate.id}`} className="flex-1">
                              <Button variant="outline" className="w-full">
                                View Details
                              </Button>
                            </Link>
                            {playdate.status === 'published' && (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant={userStatus === 'confirmed' ? 'default' : 'outline'}
                                  onClick={() => handleRSVP(playdate.id, 'confirmed', 1)}
                                  disabled={isAtCapacity && userStatus !== 'confirmed'}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={userStatus === 'declined' ? 'destructive' : 'outline'}
                                  onClick={() => handleRSVP(playdate.id, 'declined', 0)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PlaydatesPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading playdates..." />}>
      <PlaydatesPageContent />
    </Suspense>
  )
}
