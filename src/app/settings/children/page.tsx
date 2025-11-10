'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface ChildForm {
  full_name: string
  birthdate?: string
  allergies?: string
  notes?: string
}

export default function ChildrenSettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [children, setChildren] = useState<any[]>([])
  const [form, setForm] = useState<ChildForm>({ full_name: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('children')
        .select('*')
        .order('created_at', { ascending: false })
      setChildren(data ?? [])
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const addChild = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error, data } = await supabase
      .from('children')
      .insert({
        user_id: user.id,
        full_name: form.full_name,
        birthdate: form.birthdate || null,
        allergies: form.allergies || null,
        notes: form.notes || null,
      })
      .select('*')
      .single()
    if (error) {
      toast.error(error.message)
      return
    }
    setChildren((prev) => [data, ...prev])
    setForm({ full_name: '' })
  }

  const removeChild = async (id: string) => {
    const { error } = await supabase.from('children').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    setChildren((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Child</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addChild} className="grid grid-cols-1 gap-4">
            <Input
              placeholder="Full name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              required
            />
            <Input
              type="date"
              placeholder="Birthdate"
              value={form.birthdate || ''}
              onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
            />
            <Input
              placeholder="Allergies"
              value={form.allergies || ''}
              onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
            />
            <Input
              placeholder="Notes"
              value={form.notes || ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children.map((child) => (
          <Card key={child.id}>
            <CardHeader>
              <CardTitle>{child.full_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {child.birthdate && <div>Birthdate: {child.birthdate}</div>}
              {child.allergies && <div>Allergies: {child.allergies}</div>}
              {child.notes && <div>Notes: {child.notes}</div>}
              <Button variant="outline" onClick={() => removeChild(child.id)}>Remove</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


