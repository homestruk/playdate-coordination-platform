import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const allowlist = (process.env.SUPERADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

    if (!url || !serviceKey || allowlist.length === 0) {
      return NextResponse.json({ ok: false, reason: 'not_configured' }, { status: 200 })
    }

    const supabase = createClient(url, serviceKey)

    // Find any users whose email is in the allowlist and set is_super_admin = true
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers()
    if (authErr) {
      return NextResponse.json({ ok: false, reason: 'auth_list_error', message: authErr.message }, { status: 200 })
    }

    const targets = (authUsers?.users || []).filter(u => u.email && allowlist.includes(u.email.toLowerCase()))

    for (const u of targets) {
      // Upsert user profile safety
      await supabase.from('users').upsert({ id: u.id, email: u.email }, { onConflict: 'id' })
      await supabase.from('users').update({ is_super_admin: true }).eq('id', u.id)
    }

    return NextResponse.json({ ok: true, elevated: targets.map(t => t.email) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: 'exception', message: e?.message }, { status: 200 })
  }
}


