'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Users, Plus, Copy, Check, UserPlus, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'
import { getCircleRoleColor } from '@/lib/status'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { createCircleSchema, joinCircleSchema, type CreateCircleInput, type JoinCircleInput } from '@/lib/validations/circle'

interface Circle {
  id: string
  name: string
  description: string | null
  created_by: string
  invite_code: string
  created_at: string
  members_count: number
  role: 'admin' | 'member'
}

interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

export default function CirclesPage() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const createForm = useForm<CreateCircleInput>({
    resolver: zodResolver(createCircleSchema),
    defaultValues: {
      name: '',
      description: ''
    }
  })

  const joinForm = useForm<JoinCircleInput>({
    resolver: zodResolver(joinCircleSchema),
    defaultValues: {
      inviteCode: ''
    }
  })

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

      // Get user's circles with role information and member counts in a single query
      const { data: circlesData } = await supabase
        .from('circle_members')
        .select(`
          role,
          circles (
            id,
            name,
            description,
            created_by,
            invite_code,
            created_at,
            circle_members!inner (
              id
            )
          )
        `)
        .eq('user_id', authUser.id)
        .eq('status', 'approved')

      // Transform data to include member counts
      const circlesWithCounts = (circlesData || []).map((item: any) => ({
        ...item.circles,
        members_count: item.circles.circle_members?.length || 0,
        role: item.role
      }))

      setCircles(circlesWithCounts)
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  const handleCreateCircle = async (data: CreateCircleInput) => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const authUser = authData?.user
      if (!authUser) {
        toast.error('You must be logged in to create a circle')
        return
      }

      // Generate circle id client-side to avoid relying on select after insert (RLS-safe)
      const circleId = crypto.randomUUID()

      // Attempt creation with retry for rare invite_code collisions
      const tryCreateCircle = async (): Promise<void> => {
        for (let i = 0; i < 3; i++) {
          const invite = generateInviteCode()
          const { error: circleErr } = await supabase
            .from('circles')
            .insert([{
              id: circleId,
              name: data.name,
              description: data.description || null,
              created_by: authUser.id,
              invite_code: invite,
            }])

          if (!circleErr) return

          // 23505 = unique_violation (invite_code collision), retry
          const pgCode = (circleErr as any)?.code
          if (pgCode !== '23505') {
            console.error('Circle insert error', circleErr)
            throw circleErr
          }
        }
        throw new Error('Failed to create a unique invite code. Please try again.')
      }

      await tryCreateCircle()

      // Add creator as admin member (now allowed by RLS)
      const { error: memberErr } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circleId,
          user_id: authUser.id,
          role: 'admin',
          status: 'approved',
        })

      if (memberErr) {
        console.error('Circle member insert error', memberErr)
        toast.error('Circle created but failed to add you as admin')
        return
      }

      toast.success('Circle created successfully!')
      setShowCreateDialog(false)
      createForm.reset()
      router.push(`/circles/${circleId}`)
    } catch (err: any) {
      console.error('Unexpected error creating circle', err)
      toast.error(err?.message || 'Failed to create circle')
    }
  }

  const handleJoinCircle = async (data: JoinCircleInput) => {
    if (!user) return

    try {
      // Find circle by invite code
      const { data: circle, error: circleError } = await supabase
        .from('circles')
        .select('id')
        .eq('invite_code', data.inviteCode)
        .single()

      if (circleError || !circle) {
        toast.error('Invalid invite code')
        return
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        toast.warning('You are already a member of this circle')
        return
      }

      // Add user as pending member
      const { error } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circle.id,
          user_id: user.id,
          role: 'member',
          status: 'pending'
        })

      if (error) {
        toast.error('Failed to join circle')
        return
      }

      toast.success('Join request sent! The circle admin will approve your request.')
      setShowJoinDialog(false)
      joinForm.reset()
    } catch (error) {
      console.error('Error joining circle:', error)
      toast.error('Error joining circle')
    }
  }

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading circles..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-blue-600 hover:underline mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Circles</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Circle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join a Circle</DialogTitle>
                    <DialogDescription>
                      Enter the invite code to join a circle
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...joinForm}>
                    <form onSubmit={joinForm.handleSubmit(handleJoinCircle)} className="space-y-4">
                      <FormField
                        control={joinForm.control}
                        name="inviteCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invite Code</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter invite code"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={joinForm.formState.isSubmitting}>
                        {joinForm.formState.isSubmitting ? 'Joining...' : 'Join Circle'}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Circle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a New Circle</DialogTitle>
                    <DialogDescription>
                      Create a trusted circle of parents to coordinate playdates
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(handleCreateCircle)} className="space-y-4">
                      <FormField
                        control={createForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Circle Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter circle name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Describe your circle" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createForm.formState.isSubmitting}>
                        {createForm.formState.isSubmitting ? 'Creating...' : 'Create Circle'}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {circles.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-24 w-24 mx-auto mb-8 text-gray-300" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No circles yet</h2>
            <p className="text-gray-600 mb-8">Create your first circle or join an existing one to get started</p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Circle
              </Button>
              <Button variant="outline" onClick={() => setShowJoinDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Join Circle
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {circles.map((circle) => (
              <Card key={circle.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{circle.name}</CardTitle>
                    <Badge variant={getCircleRoleColor(circle.role)}>
                      {circle.role}
                    </Badge>
                  </div>
                  {circle.description && (
                    <CardDescription>{circle.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{circle.members_count} members</span>
                      <span>Created {formatDate(circle.created_at)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {circle.invite_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteCode(circle.invite_code)}
                        >
                          {copiedCode === circle.invite_code ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Link href={`/circles/${circle.id}`} className="flex-1">
                        <Button className="w-full">
                          <Users className="h-4 w-4 mr-2" />
                          View Circle
                        </Button>
                      </Link>
                      {circle.role === 'admin' && (
                        <Link href={`/circles/${circle.id}/settings`}>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
