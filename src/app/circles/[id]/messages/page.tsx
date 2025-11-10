'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Send, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'

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

interface Circle {
  id: string
  name: string
  description: string | null
}

export default function CircleMessagesPage() {
  const params = useParams<{ id: string }>()
  const circleId = (params?.id ?? '') as string
  const [messages, setMessages] = useState<Message[]>([])
  const [circle, setCircle] = useState<Circle | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [isCircleAdmin, setIsCircleAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
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

      // role and super admin flags
      const { data: roleRow } = await supabase
        .from('circle_members')
        .select('role')
        .eq('circle_id', circleId)
        .eq('user_id', authUser.id)
        .eq('status', 'approved')
        .single()
      setIsCircleAdmin(roleRow?.role === 'admin')

      const { data: userRow } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', authUser.id)
        .single()
      setIsSuperAdmin(Boolean((userRow as any)?.is_super_admin))

      // Get messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          id,
          user_id,
          content,
          created_at,
          users!inner (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('circle_id', circleId)
        .order('created_at', { ascending: true })

      setMessages((messagesData || []).map(msg => ({
        ...msg,
        users: Array.isArray(msg.users) ? msg.users[0] : msg.users
      })))
      setLoading(false)
    }

    getCircleData()
  }, [circleId, router, supabase])

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!circle) return

    const channel = supabase
      .channel(`circle-messages-${circleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `circle_id=eq.${circleId}`
        },
        (payload) => {
          // Fetch the new message with user data
            supabase
              .from('messages')
              .select(`
                id,
                user_id,
                content,
                created_at,
                users!inner (
                  id,
                  email,
                  full_name,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  const message = {
                    ...data,
                    users: Array.isArray(data.users) ? data.users[0] : data.users
                  }
                  setMessages(prev => [...prev, message])
                }
              })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [circle, circleId, supabase])

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    setSendingMessage(true)

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          circle_id: params.id,
          user_id: authUser.id,
          content: newMessage.trim()
        })

      if (error) throw error

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href={`/circles/${params.id}`} className="text-blue-600 hover:underline mr-4">
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to Circle
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">{circle.name} Messages</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="h-[calc(100vh-200px)] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              {circle.name} Chat
            </CardTitle>
            <CardDescription>
              General discussion for {circle.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {/* Message List */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.users?.avatar_url || ''} />
                      <AvatarFallback>
                        {message.users?.full_name?.charAt(0) || message.users?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
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
                    {(isCircleAdmin || isSuperAdmin) && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteMessage(message.id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={sendingMessage}
                className="flex-1"
              />
              <Button type="submit" disabled={sendingMessage || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
