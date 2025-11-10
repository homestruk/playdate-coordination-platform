'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Clock, MapPin, Users, ArrowLeft, CheckCircle, XCircle, User, MessageSquare, Edit } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'

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
  circles: {
    id: string
    name: string
    description: string | null
  }
  participants_count: number
  user_participation: {
    status: string
    num_children: number
  } | null
}

interface Participant {
  id: string
  user_id: string
  num_children: number
  status: string
  created_at: string
  users: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  users: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export default function PlaydateDetailPage() {
  const params = useParams<{ id: string }>()
  const playdateId = (params?.id ?? '') as string
  const [playdate, setPlaydate] = useState<Playdate | null>(null)
  const [isCircleAdmin, setIsCircleAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showRSVPDialog, setShowRSVPDialog] = useState(false)
  const [numChildren, setNumChildren] = useState(1)
  const router = useRouter()
  const supabase = createClient()
  const [children, setChildren] = useState<any[]>([])
  const [childRsvp, setChildRsvp] = useState<Record<string, { rsvp: 'yes' | 'no' | 'maybe' | 'pending'; notes: string }>>({})

  useEffect(() => {
    const getPlaydateData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/login')
        return
      }

      // Get playdate details
      const { data: playdateData, error: playdateError } = await supabase
        .from('playdates')
        .select(`
          *,
          circles (
            id,
            name,
            description
          )
        `)
        .eq('id', playdateId)
        .single()

      if (playdateError || !playdateData) {
        router.push('/playdates')
        return
      }

      setPlaydate(playdateData)
      // Admin flags based on this playdate's circle
      const { data: circleRole } = await supabase
        .from('circle_members')
        .select('role')
        .eq('circle_id', playdateData.circle_id)
        .eq('user_id', authUser.id)
        .eq('status', 'approved')
        .single()
      setIsCircleAdmin(circleRole?.role === 'admin')

      const { data: userRow } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', authUser.id)
        .single()
      setIsSuperAdmin(Boolean((userRow as any)?.is_super_admin))

      // Get participants
      const { data: participantsData } = await supabase
        .from('playdate_participants')
        .select(`
          id,
          user_id,
          num_children,
          status,
          created_at,
          users (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('playdate_id', playdateId)
        .order('created_at', { ascending: false })

      setParticipants((participantsData || []).map(participant => ({
        ...participant,
        users: Array.isArray(participant.users) ? participant.users[0] : participant.users
      })))

      // Get user's participation
      const { data: userParticipation } = await supabase
        .from('playdate_participants')
        .select('status, num_children')
        .eq('playdate_id', playdateId)
        .eq('user_id', authUser.id)
        .single()

      if (userParticipation) {
        setNumChildren(userParticipation.num_children)
      }

      // Get messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          id,
          user_id,
          content,
          created_at,
          users (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('playdate_id', playdateId)
        .order('created_at', { ascending: true })

      setMessages((messagesData || []).map(msg => ({
        ...msg,
        users: Array.isArray(msg.users) ? msg.users[0] : msg.users
      })))

      // Load user's children and existing per-child RSVP
      const { data: kids } = await supabase.from('children').select('*').eq('user_id', authUser.id)
      const { data: pcp } = await supabase
        .from('playdate_child_participants')
        .select('child_id, rsvp, notes')
        .eq('playdate_id', playdateId)

      const byChild: Record<string, { rsvp: 'yes' | 'no' | 'maybe' | 'pending'; notes: string }> = {}
      ;(pcp || []).forEach((r: any) => { byChild[r.child_id] = { rsvp: r.rsvp, notes: r.notes || '' } })
      ;(kids || []).forEach((k: any) => { if (!byChild[k.id]) byChild[k.id] = { rsvp: 'pending', notes: '' } })
      setChildren(kids || [])
      setChildRsvp(byChild)
      setLoading(false)
    }

    getPlaydateData()

  }, [playdateId, router, supabase])

  const handleRSVP = async (status: string) => {
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

      setShowRSVPDialog(false)
      // Refresh data
      window.location.reload()
    } catch (error) {
      console.error('Error updating RSVP:', error)
    }
  }

  const saveChildRsvp = async (childId: string) => {
    const row = childRsvp[childId]
    await supabase.from('playdate_child_participants').upsert({
      playdate_id: playdateId,
      child_id: childId,
      rsvp: row?.rsvp || 'pending',
      notes: row?.notes || null,
    }, { onConflict: 'playdate_id,child_id' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    setSendingMessage(true)

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          playdate_id: playdateId,
          user_id: authUser.id,
          content: newMessage.trim()
        })
        .select(`
          id,
          user_id,
          content,
          created_at,
          users (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      const message = {
        ...data,
        users: Array.isArray(data.users) ? data.users[0] : data.users
      }
      setMessages(prev => [...prev, message])
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default'
      case 'interested': return 'secondary'
      case 'declined': return 'destructive'
      default: return 'secondary'
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
      if (error) throw error
      setMessages(prev => prev.filter(m => m.id !== messageId))
    } catch (err) {
      console.error('Error deleting message:', err)
      toast.error('Failed to delete message')
    }
  }

  const handleCancelPlaydate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !playdate) return
      // Only show to creator, circle admin or super admin; RLS enforces as well
      const { error } = await supabase
        .from('playdates')
        .update({ status: 'cancelled' })
        .eq('id', playdate.id)
      if (error) throw error
      setPlaydate({ ...playdate, status: 'cancelled' })
    } catch (err) {
      console.error('Error cancelling playdate:', err)
      toast.error('Failed to cancel playdate')
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

  if (!playdate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Playdate not found</h1>
          <Link href="/playdates">
            <Button>Back to Playdates</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { date, time } = formatDateTime(playdate.start_time)
  const endTime = formatDateTime(playdate.end_time).time
  const isAtCapacity = playdate.participants_count >= playdate.capacity
  const userStatus = playdate.user_participation?.status

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/playdates" className="text-blue-600 hover:underline mr-4">
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to Playdates
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">{playdate.title}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={playdate.status === 'published' ? 'default' : 'secondary'}>
                {playdate.status}
              </Badge>
              {(isCircleAdmin || isSuperAdmin || playdate.created_by) && playdate.status !== 'cancelled' && (
                <Button variant="outline" size="sm" onClick={handleCancelPlaydate}>
                  Cancel Playdate
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Playdate Details */}
            <Card>
              <CardHeader>
                <CardTitle>{playdate.title}</CardTitle>
                <CardDescription>{playdate.circles.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {playdate.description && (
                    <p className="text-gray-600">{playdate.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{date}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{time} - {endTime}</span>
                    </div>
                  </div>

                  {playdate.location_name && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{playdate.location_name}</p>
                        {playdate.location_address && (
                          <p className="text-gray-500">{playdate.location_address}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>{playdate.participants_count}/{playdate.capacity} spots filled</span>
                    </div>
                    {isAtCapacity && (
                      <Badge variant="destructive">Full</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Message List */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {messages.map((message) => (
                      <div key={message.id} className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-8 w-8">
                          <AvatarImage src={message.users?.avatar_url || ''} />
                          <AvatarFallback>
                            {message.users?.full_name?.charAt(0) || message.users?.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {message.users?.full_name || message.users?.email || 'Unknown User'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">{message.content}</p>
                        </div>
                        </div>
                        {(isCircleAdmin || isSuperAdmin || (playdate && playdate.created_by)) && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteMessage(message.id)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={sendingMessage}
                    />
                    <Button type="submit" disabled={sendingMessage || !newMessage.trim()}>
                      Send
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          {/* Per-child RSVP */}
          {children.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>RSVP per child</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {children.map((child: any) => (
                  <div key={child.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div className="font-medium">{child.full_name}</div>
                    <Select
                      value={childRsvp[child.id]?.rsvp || 'pending'}
                      onValueChange={(val: any) => setChildRsvp((r) => ({ ...r, [child.id]: { ...(r[child.id] || { notes: '' }), rsvp: val } }))}
                    >
                      <SelectTrigger><SelectValue placeholder="RSVP" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="maybe">Maybe</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Notes (allergies, pickup...)"
                        value={childRsvp[child.id]?.notes || ''}
                        onChange={(e) => setChildRsvp((r) => ({ ...r, [child.id]: { ...(r[child.id] || { rsvp: 'pending' }), notes: e.target.value } }))}
                      />
                      <Button onClick={() => saveChildRsvp(child.id)}>Save</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* RSVP */}
            <Card>
              <CardHeader>
                <CardTitle>RSVP</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userStatus ? (
                    <div className="text-center">
                      <Badge variant={getStatusColor(userStatus)} className="mb-2">
                        {userStatus}
                      </Badge>
                      {userStatus === 'confirmed' && (
                        <p className="text-sm text-gray-600">
                          {playdate.user_participation?.num_children} children
                        </p>
                      )}
                      <Dialog open={showRSVPDialog} onOpenChange={setShowRSVPDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="mt-2">
                            Change RSVP
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update RSVP</DialogTitle>
                            <DialogDescription>
                              Update your response for this playdate
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="numChildren">Number of Children</Label>
                              <Input
                                id="numChildren"
                                type="number"
                                min="1"
                                max="10"
                                value={numChildren}
                                onChange={(e) => setNumChildren(parseInt(e.target.value))}
                              />
                            </div>
                            <div className="flex space-x-2">
                              <Button onClick={() => handleRSVP('confirmed')} className="flex-1">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm
                              </Button>
                              <Button variant="outline" onClick={() => handleRSVP('interested')} className="flex-1">
                                <User className="h-4 w-4 mr-2" />
                                Interested
                              </Button>
                              <Button variant="destructive" onClick={() => handleRSVP('declined')} className="flex-1">
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-4">Haven't responded yet</p>
                      <Dialog open={showRSVPDialog} onOpenChange={setShowRSVPDialog}>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            RSVP Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>RSVP to Playdate</DialogTitle>
                            <DialogDescription>
                              Let us know if you can attend
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="numChildren">Number of Children</Label>
                              <Input
                                id="numChildren"
                                type="number"
                                min="1"
                                max="10"
                                value={numChildren}
                                onChange={(e) => setNumChildren(parseInt(e.target.value))}
                              />
                            </div>
                            <div className="flex space-x-2">
                              <Button onClick={() => handleRSVP('confirmed')} className="flex-1">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm
                              </Button>
                              <Button variant="outline" onClick={() => handleRSVP('interested')} className="flex-1">
                                <User className="h-4 w-4 mr-2" />
                                Interested
                              </Button>
                              <Button variant="destructive" onClick={() => handleRSVP('declined')} className="flex-1">
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle>Participants ({participants.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.users?.avatar_url || ''} />
                          <AvatarFallback>
                            {participant.users?.full_name?.charAt(0) || participant.users?.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {participant.users?.full_name || participant.users?.email || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {participant.num_children} children
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(participant.status)}>
                        {participant.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
