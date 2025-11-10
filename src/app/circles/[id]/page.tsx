'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Calendar, MessageSquare, Settings, ArrowLeft, Check, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

interface Circle {
  id: string
  name: string
  description: string | null
  created_by: string
  invite_code: string
  created_at: string
}

interface Member {
  id: string
  user_id: string
  role: 'admin' | 'member'
  status: 'pending' | 'approved'
  joined_at: string
  users: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  } | null
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

export default function CircleDetailPage() {
  const params = useParams<{ id: string }>()
  const circleId = (params?.id ?? '') as string
  const [circle, setCircle] = useState<Circle | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [playdates, setPlaydates] = useState<Playdate[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getCircleData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/login')
        return
      }

      // Get circle details
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .select('*')
        .eq('id', circleId)
        .single()

      if (circleError || !circleData) {
        router.push('/circles')
        return
      }

      setCircle(circleData)

      // Check user's role in circle
      const { data: userMembership } = await supabase
        .from('circle_members')
        .select('role')
        .eq('circle_id', circleId)
        .eq('user_id', authUser.id)
        .eq('status', 'approved')
        .single()

      if (!userMembership) {
        router.push('/circles')
        return
      }

      setUserRole(userMembership.role)

      // Get circle members
      const { data: membersData } = await supabase
        .from('circle_members')
        .select(`
          id,
          user_id,
          role,
          status,
          joined_at,
          users (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('circle_id', circleId)
        .order('status', { ascending: true })
        .order('joined_at', { ascending: false })

      setMembers((membersData || []).map(member => ({
        ...member,
        users: Array.isArray(member.users) ? member.users[0] : member.users
      })))

      // Get recent playdates
      const { data: playdatesData } = await supabase
        .from('playdates')
        .select(`
          id,
          title,
          description,
          location_name,
          start_time,
          end_time,
          capacity,
          status
        `)
        .eq('circle_id', circleId)
        .order('start_time', { ascending: false })
        .limit(5)

      const playdatesWithCounts = await Promise.all(
        (playdatesData || []).map(async (playdate: any) => {
          const { count } = await supabase
            .from('playdate_participants')
            .select('*', { count: 'exact', head: true })
            .eq('playdate_id', playdate.id)
            .eq('status', 'confirmed')

          return {
            ...playdate,
            participants_count: count || 0
          }
        })
      )

      setPlaydates(playdatesWithCounts)
      setLoading(false)
    }

    getCircleData()
  }, [circleId, router, supabase])

  const handleApproveMember = async (memberId: string) => {
    try {
      await supabase
        .from('circle_members')
        .update({ status: 'approved' })
        .eq('id', memberId)

      setMembers(members.map(member => 
        member.id === memberId ? { ...member, status: 'approved' } : member
      ))
    } catch (error) {
      console.error('Error approving member:', error)
    }
  }

  const handleRejectMember = async (memberId: string) => {
    try {
      await supabase
        .from('circle_members')
        .delete()
        .eq('id', memberId)

      setMembers(members.filter(member => member.id !== memberId))
    } catch (error) {
      console.error('Error rejecting member:', error)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      await supabase
        .from('circle_members')
        .delete()
        .eq('id', memberId)

      setMembers(members.filter(member => member.id !== memberId))
    } catch (error) {
      console.error('Error removing member:', error)
    }
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

  if (!circle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Circle not found</h1>
          <Link href="/circles">
            <Button>Back to Circles</Button>
          </Link>
        </div>
      </div>
    )
  }

  const approvedMembers = members.filter(m => m.status === 'approved')
  const pendingMembers = userRole === 'admin' ? members.filter(m => m.status === 'pending') : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/circles" className="text-blue-600 hover:underline mr-4">
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to Circles
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">{circle.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href={`/playdates/new?circle=${circle.id}`}>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Plan Playdate
                </Button>
              </Link>
              {userRole === 'admin' && (
                <Link href={`/circles/${circle.id}/settings`}>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Circle Info */}
            <Card>
              <CardHeader>
                <CardTitle>Circle Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{circle.name}</h3>
                    {circle.description && (
                      <p className="text-gray-600 mt-1">{circle.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Created {new Date(circle.created_at).toLocaleDateString()}</span>
                    <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                      {circle.invite_code}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Playdates */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Playdates</CardTitle>
                  <CardDescription>Latest playdate events</CardDescription>
                </div>
                <Link href={`/playdates?circle=${circle.id}`}>
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {playdates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No playdates yet</p>
                    <Link href={`/playdates/new?circle=${circle.id}`}>
                      <Button variant="outline" className="mt-4">Plan your first playdate</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {playdates.map((playdate) => (
                      <Link key={playdate.id} href={`/playdates/${playdate.id}`}>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
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
                            <Badge variant={playdate.status === 'published' ? 'default' : 'secondary'} className="ml-2">
                              {playdate.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Members ({approvedMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {approvedMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.users?.avatar_url || ''} />
                          <AvatarFallback>
                            {member.users?.full_name?.charAt(0) || member.users?.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.users?.full_name || member.users?.email || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500">{member.users?.email || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                        {userRole === 'admin' && member.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pending Requests */}
            {userRole === 'admin' && pendingMembers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Requests ({pendingMembers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.users?.avatar_url || ''} />
                            <AvatarFallback>
                              {member.users?.full_name?.charAt(0) || member.users?.email?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {member.users?.full_name || member.users?.email || 'Unknown User'}
                            </p>
                            <p className="text-xs text-gray-500">{member.users?.email || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApproveMember(member.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRejectMember(member.id)}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
