'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AvailabilitySlot {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_recurring: boolean
  specific_date: string | null
}

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/login')
        return
      }

      // Get user's availability slots
      const { data: slotsData } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('user_id', authUser.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      setSlots(slotsData || [])
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const dayOfWeek = parseInt(formData.get('dayOfWeek') as string)
    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string
    const isRecurring = formData.get('isRecurring') === 'true'
    const specificDate = formData.get('specificDate') as string

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    try {
      const { error } = await supabase
        .from('availability_slots')
        .insert({
          user_id: authUser.id,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          is_recurring: isRecurring,
          specific_date: isRecurring ? null : specificDate
        })

      if (error) throw error

      // Refresh slots
      const { data: slotsData } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('user_id', authUser.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      setSlots(slotsData || [])
      setShowAddDialog(false)
    } catch (error) {
      console.error('Error adding availability slot:', error)
    }
  }

  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSlot) return

    const formData = new FormData(e.target as HTMLFormElement)
    const dayOfWeek = parseInt(formData.get('dayOfWeek') as string)
    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string
    const isRecurring = formData.get('isRecurring') === 'true'
    const specificDate = formData.get('specificDate') as string

    try {
      const { error } = await supabase
        .from('availability_slots')
        .update({
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          is_recurring: isRecurring,
          specific_date: isRecurring ? null : specificDate
        })
        .eq('id', editingSlot.id)

      if (error) throw error

      // Refresh slots
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: slotsData } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('user_id', authUser.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      setSlots(slotsData || [])
      setEditingSlot(null)
    } catch (error) {
      console.error('Error updating availability slot:', error)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) return

    try {
      const { error } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', slotId)

      if (error) throw error

      setSlots(slots.filter(slot => slot.id !== slotId))
    } catch (error) {
      console.error('Error deleting availability slot:', error)
    }
  }

  const getSlotsByDay = (dayOfWeek: number) => {
    return slots.filter(slot => slot.day_of_week === dayOfWeek)
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
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
              <Link href="/dashboard" className="text-blue-600 hover:underline mr-4">
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Availability</h1>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Availability
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Availability Slot</DialogTitle>
                  <DialogDescription>
                    Set your available times for playdates
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSlot} className="space-y-4">
                  <div>
                    <Label htmlFor="dayOfWeek">Day of Week</Label>
                    <Select name="dayOfWeek" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        name="startTime"
                        type="time"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        name="endTime"
                        type="time"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="isRecurring">Recurring</Label>
                    <Select name="isRecurring" defaultValue="true">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Weekly recurring</SelectItem>
                        <SelectItem value="false">Specific date only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="specificDate">Specific Date (if not recurring)</Label>
                    <Input
                      id="specificDate"
                      name="specificDate"
                      type="date"
                    />
                  </div>
                  <Button type="submit" className="w-full">Add Availability</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Weekly Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Weekly Availability
              </CardTitle>
              <CardDescription>
                Your recurring weekly availability schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DAYS.map((day, dayIndex) => {
                  const daySlots = getSlotsByDay(dayIndex)
                  return (
                    <div key={dayIndex} className="flex items-center space-x-4">
                      <div className="w-24 text-sm font-medium text-gray-900">
                        {day}
                      </div>
                      <div className="flex-1 flex flex-wrap gap-2">
                        {daySlots.length === 0 ? (
                          <span className="text-gray-400 text-sm">No availability</span>
                        ) : (
                          daySlots.map((slot) => (
                            <div key={slot.id} className="flex items-center space-x-2">
                              <Badge variant="secondary" className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                </span>
                                {!slot.is_recurring && (
                                  <span className="text-xs">(specific)</span>
                                )}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSlot(slot)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* All Slots */}
          <Card>
            <CardHeader>
              <CardTitle>All Availability Slots</CardTitle>
              <CardDescription>
                Manage all your availability slots including specific dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {slots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No availability slots set</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowAddDialog(true)}
                  >
                    Add your first availability slot
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {slots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {DAYS[slot.day_of_week]}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={slot.is_recurring ? 'default' : 'secondary'}>
                            {slot.is_recurring ? 'Recurring' : 'Specific Date'}
                          </Badge>
                          {slot.specific_date && (
                            <Badge variant="outline">
                              {new Date(slot.specific_date).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSlot(slot)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSlot(slot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSlot} onOpenChange={() => setEditingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Availability Slot</DialogTitle>
            <DialogDescription>
              Update your availability slot
            </DialogDescription>
          </DialogHeader>
          {editingSlot && (
            <form onSubmit={handleUpdateSlot} className="space-y-4">
              <div>
                <Label htmlFor="editDayOfWeek">Day of Week</Label>
                <Select name="dayOfWeek" defaultValue={editingSlot.day_of_week.toString()}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editStartTime">Start Time</Label>
                  <Input
                    id="editStartTime"
                    name="startTime"
                    type="time"
                    defaultValue={editingSlot.start_time}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editEndTime">End Time</Label>
                  <Input
                    id="editEndTime"
                    name="endTime"
                    type="time"
                    defaultValue={editingSlot.end_time}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editIsRecurring">Recurring</Label>
                <Select name="isRecurring" defaultValue={editingSlot.is_recurring.toString()}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Weekly recurring</SelectItem>
                    <SelectItem value="false">Specific date only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editSpecificDate">Specific Date (if not recurring)</Label>
                <Input
                  id="editSpecificDate"
                  name="specificDate"
                  type="date"
                  defaultValue={editingSlot.specific_date || ''}
                />
              </div>
              <Button type="submit" className="w-full">Update Availability</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
