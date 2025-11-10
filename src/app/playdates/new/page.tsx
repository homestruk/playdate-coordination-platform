'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Users, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Circle {
  id: string
  name: string
  description: string | null
}

interface AvailableUser {
  user_id: string
  full_name: string | null
  email: string
}

function NewPlaydatePageContent() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    circle_id: '',
    location_name: '',
    location_address: '',
    start_time: '',
    end_time: '',
    capacity: 10
  })
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

      // Set default circle if provided in URL
      const circleId = searchParams.get('circle')
      if (circleId && circlesList.find(c => c.id === circleId)) {
        setFormData(prev => ({ ...prev, circle_id: circleId }))
      }

      setLoading(false)
    }

    getUser()
  }, [router, supabase, searchParams])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // If circle or time changes, check availability
    if (field === 'circle_id' || field === 'start_time' || field === 'end_time') {
      checkAvailability(field === 'circle_id' ? value : formData.circle_id, formData.start_time, formData.end_time)
    }
  }

  const checkAvailability = async (circleId: string, startTime: string, endTime: string) => {
    if (!circleId || !startTime || !endTime) {
      setAvailableUsers([])
      return
    }

    try {
      const { data } = await supabase.rpc('get_available_users', {
        p_circle_id: circleId,
        p_start_time: startTime,
        p_end_time: endTime
      })

      setAvailableUsers(data || [])
    } catch (error) {
      console.error('Error checking availability:', error)
      setAvailableUsers([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    try {
      if (!formData.circle_id) {
        toast.error('Please select a circle')
        return
      }

      if (!formData.start_time || !formData.end_time) {
        toast.error('Please select start and end time')
        return
      }

      const playdateId = crypto.randomUUID()
      const startIso = new Date(formData.start_time).toISOString()
      const endIso = new Date(formData.end_time).toISOString()

      if (new Date(startIso) >= new Date(endIso)) {
        toast.error('End time must be after start time')
        return
      }

      const { error } = await supabase
        .from('playdates')
        .insert([{
          id: playdateId,
          circle_id: formData.circle_id,
          created_by: authUser.id,
          title: formData.title,
          description: formData.description || null,
          location_name: formData.location_name || null,
          location_address: formData.location_address || null,
          start_time: startIso,
          end_time: endIso,
          capacity: Number(formData.capacity),
          status: 'published',
        }])

      if (error) {
        console.error('Playdate insert error', {
          message: error.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
        })
        throw error
      }

      router.push(`/playdates/${playdateId}`)
    } catch (error) {
      console.error('Error creating playdate:', error)
      toast.error('Error creating playdate. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return ''
    const date = new Date(dateTime)
    return date.toLocaleString()
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
            <div className="flex items-center">
              <Link href="/playdates" className="text-blue-600 hover:underline mr-4">
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to Playdates
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Plan New Playdate</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Playdate Details</CardTitle>
                <CardDescription>
                  Create a new playdate event for your circle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter playdate title"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe the playdate activity"
                    />
                  </div>

                  <div>
                    <Label htmlFor="circle">Circle</Label>
                    <Select value={formData.circle_id} onValueChange={(value) => handleInputChange('circle_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a circle" />
                      </SelectTrigger>
                      <SelectContent>
                        {circles.map((circle) => (
                          <SelectItem key={circle.id} value={circle.id}>
                            {circle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location_name">Location Name</Label>
                    <Input
                      id="location_name"
                      value={formData.location_name}
                      onChange={(e) => handleInputChange('location_name', e.target.value)}
                      placeholder="e.g., Central Park Playground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location_address">Location Address</Label>
                    <Input
                      id="location_address"
                      value={formData.location_address}
                      onChange={(e) => handleInputChange('location_address', e.target.value)}
                      placeholder="Full address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => handleInputChange('start_time', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) => handleInputChange('end_time', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      max="50"
                      value={formData.capacity}
                      onChange={(e) => handleInputChange('capacity', e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Creating Playdate...' : 'Create Playdate'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Available Members */}
            {formData.circle_id && formData.start_time && formData.end_time && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Available Members
                  </CardTitle>
                  <CardDescription>
                    Members available during this time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {availableUsers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No members available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableUsers.map((user) => (
                        <div key={user.user_id} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            {user.full_name || user.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <Calendar className="h-4 w-4 mt-0.5" />
                    <p>Choose a time when most circle members are available</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <p>Include specific location details for easy finding</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Users className="h-4 w-4 mt-0.5" />
                    <p>Set appropriate capacity based on venue size</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewPlaydatePage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading..." />}>
      <NewPlaydatePageContent />
    </Suspense>
  )
}
