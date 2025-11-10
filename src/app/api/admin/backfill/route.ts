import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, reason: 'not_configured' }, { status: 200 })
  }

  const supabase = createClient(url, serviceKey)

  try {
    // 1) Ensure public.users exists for all auth.users
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const upserts = (authUsers?.users || []).map((u) =>
      supabase.from('users').upsert(
        {
          id: u.id,
          email: u.email ?? null,
          full_name: (u.user_metadata as any)?.full_name ?? null,
          avatar_url: (u.user_metadata as any)?.avatar_url ?? null,
        },
        { onConflict: 'id' }
      )
    )
    await Promise.all(upserts)

    // 2) Backfill creator membership (admin/approved) for creators without a membership row
    // Fetch circles and ensure creator is a member
    const { data: circles } = await supabase.from('circles').select('id,created_by')
    if (circles && circles.length) {
      for (const c of circles) {
        const { data: existing } = await supabase
          .from('circle_members')
          .select('id')
          .eq('circle_id', c.id)
          .eq('user_id', c.created_by)
          .maybeSingle()
        if (!existing) {
          await supabase.from('circle_members').insert({
            circle_id: c.id,
            user_id: c.created_by,
            role: 'admin',
            status: 'approved',
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: 'exception', message: e?.message }, { status: 200 })
  }
}


