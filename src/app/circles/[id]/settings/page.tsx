'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function CircleSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'admin' | 'member' | null>(null)
  const [inviteCode, setInviteCode] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: membership } = await supabase
        .from('circle_members')
        .select('role, status')
        .eq('circle_id', id)
        .eq('user_id', user.id)
        .single()

      if (!membership || membership.status !== 'approved') {
        router.push('/circles')
        return
      }
      setRole(membership.role)

      const { data: circle } = await supabase
        .from('circles')
        .select('invite_code')
        .eq('id', id)
        .single()

      setInviteCode(circle?.invite_code ?? '')
      setLoading(false)
    }
    load()
  }, [id, router, supabase])

  const rotateCode = async () => {
    try {
      const { data, error } = await supabase.rpc('rotate_circle_invite_code', { p_circle_id: id })
      if (error) throw error
      if (data) {
        setInviteCode(data)
        toast.success('Invite code rotated successfully')
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to rotate invite code')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (role !== 'admin') return <div className="p-6">Only admins can access circle settings.</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Circle Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-gray-600">Current invite code</div>
              <div className="font-mono text-lg">{inviteCode}</div>
            </div>
            <Badge variant="secondary">Admin</Badge>
          </div>
          <Button onClick={rotateCode}>Rotate invite code</Button>
        </CardContent>
      </Card>
    </div>
  )
}


