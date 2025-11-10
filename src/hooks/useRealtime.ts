'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeMessages(circleId?: string, playdateId?: string) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!circleId && !playdateId) return

    const fetchMessages = async () => {
      let query = supabase
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
        .order('created_at', { ascending: true })

      if (circleId) {
        query = query.eq('circle_id', circleId)
      }
      if (playdateId) {
        query = query.eq('playdate_id', playdateId)
      }

      const { data } = await query
      setMessages(data || [])
      setLoading(false)
    }

    fetchMessages()
  }, [circleId, playdateId, supabase])

  useEffect(() => {
    if (!circleId && !playdateId) return

    const channel = supabase
      .channel(`messages-${circleId || playdateId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: circleId ? `circle_id=eq.${circleId}` : `playdate_id=eq.${playdateId}`
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
              users (
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
                setMessages(prev => [...prev, data])
              }
            })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [circleId, playdateId, supabase])

  const sendMessage = async (content: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const messageData: any = {
      user_id: user.id,
      content: content.trim()
    }

    if (circleId) {
      messageData.circle_id = circleId
    }
    if (playdateId) {
      messageData.playdate_id = playdateId
    }

    const { error } = await supabase
      .from('messages')
      .insert(messageData)

    if (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  return { messages, loading, sendMessage }
}

export function useRealtimePlaydates() {
  const [playdates, setPlaydates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchPlaydates = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's circles
      const { data: circlesData } = await supabase
        .from('circle_members')
        .select('circles(id)')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      const circleIds = circlesData?.map((item: any) => item.circles.id) || []

      if (circleIds.length === 0) {
        setPlaydates([])
        setLoading(false)
        return
      }

      const { data: playdatesData } = await supabase
        .from('playdates')
        .select(`
          *,
          circles (
            id,
            name,
            description
          )
        `)
        .in('circle_id', circleIds)
        .order('start_time', { ascending: false })

      setPlaydates(playdatesData || [])
      setLoading(false)
    }

    fetchPlaydates()
  }, [supabase])

  useEffect(() => {
    const channel = supabase
      .channel('playdates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'playdates'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new playdate with circle data
            supabase
              .from('playdates')
              .select(`
                *,
                circles (
                  id,
                  name,
                  description
                )
              `)
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setPlaydates(prev => [data, ...prev])
                }
              })
          } else if (payload.eventType === 'UPDATE') {
            setPlaydates(prev => 
              prev.map(playdate => 
                playdate.id === payload.new.id ? { ...playdate, ...payload.new } : playdate
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setPlaydates(prev => prev.filter(playdate => playdate.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return { playdates, loading }
}

export function useRealtimeCircles() {
  const [circles, setCircles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchCircles = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')

      const circlesList = circlesData?.map((item: any) => ({
        ...item.circles,
        role: item.role
      })) || []

      setCircles(circlesList)
      setLoading(false)
    }

    fetchCircles()
  }, [supabase])

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let isMounted = true

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const currentUserId = user?.id
      if (!currentUserId) return

      channel = supabase
        .channel(`circles-changes-${currentUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'circle_members',
            filter: `user_id=eq.${currentUserId}`,
          },
          async (payload) => {
            if (!isMounted) return
            const ev = payload.eventType

            if (ev === 'INSERT') {
              const status = (payload.new as any)?.status
              const circleId = (payload.new as any)?.circle_id
              const role = (payload.new as any)?.role

              if (status === 'approved') {
                const { data: circle } = await supabase
                  .from('circles')
                  .select('*')
                  .eq('id', circleId)
                  .single()
                if (circle) {
                  setCircles((prev) =>
                    prev.some((c: any) => c.id === circle.id)
                      ? prev
                      : [...prev, { ...circle, role }]
                  )
                }
              }
            } else if (ev === 'UPDATE') {
              const newStatus = (payload.new as any)?.status
              const oldStatus = (payload.old as any)?.status
              const circleId = (payload.new as any)?.circle_id
              const role = (payload.new as any)?.role

              if (oldStatus !== 'approved' && newStatus === 'approved') {
                const { data: circle } = await supabase
                  .from('circles')
                  .select('*')
                  .eq('id', circleId)
                  .single()
                if (circle) {
                  setCircles((prev) =>
                    prev.some((c: any) => c.id === circle.id)
                      ? prev
                      : [...prev, { ...circle, role }]
                  )
                }
              } else if (oldStatus === 'approved' && newStatus !== 'approved') {
                setCircles((prev) => prev.filter((c: any) => c.id !== circleId))
              } else if (newStatus === 'approved') {
                setCircles((prev) => prev.map((c: any) => (c.id === circleId ? { ...c, role } : c)))
              }
            } else if (ev === 'DELETE') {
              const oldStatus = (payload.old as any)?.status
              const circleId = (payload.old as any)?.circle_id
              if (oldStatus === 'approved') {
                setCircles((prev) => prev.filter((c: any) => c.id !== circleId))
              }
            }
          }
        )
        .subscribe()
    }

    init()

    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase])

  return { circles, loading }
}

export function useRealtimeParticipants(playdateId: string) {
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!playdateId) return

    const fetchParticipants = async () => {
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

      setParticipants(participantsData || [])
      setLoading(false)
    }

    fetchParticipants()
  }, [playdateId, supabase])

  useEffect(() => {
    if (!playdateId) return

    const channel = supabase
      .channel(`participants-${playdateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'playdate_participants',
          filter: `playdate_id=eq.${playdateId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new participant with user data
            supabase
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
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setParticipants(prev => [data, ...prev])
                }
              })
          } else if (payload.eventType === 'UPDATE') {
            setParticipants(prev => 
              prev.map(participant => 
                participant.id === payload.new.id ? { ...participant, ...payload.new } : participant
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev => prev.filter(participant => participant.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [playdateId, supabase])

  return { participants, loading }
}
