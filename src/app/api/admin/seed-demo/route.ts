import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Created = {
  adminId?: string
  parentAId?: string
  parentBId?: string
  circleId?: string
  playdateId?: string
}

export async function POST() {
  const results: Created = {}
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, reason: 'not_configured' }, { status: 200 })
    }

    const supabase = createClient(url, serviceKey)

    async function getUserIdByEmail(email: string): Promise<string | null> {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()
      return data?.id || null
    }

    async function ensureUser(email: string, password: string, fullName: string): Promise<string> {
      let id = await getUserIdByEmail(email)
      if (id) return id
      // create user with metadata so the trigger creates profile
      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
      if (error && !created?.user) {
        // If already exists, fall back to profile lookup
        id = await getUserIdByEmail(email)
        if (id) return id
        throw error
      }
      // ensure profile exists
      const userId = created?.user?.id || (await getUserIdByEmail(email))
      if (!userId) throw new Error('Failed to resolve user id')
      // Upsert public.users for safety (trigger might already have inserted)
      await supabase.from('users').upsert({ id: userId, email, full_name: fullName }, { onConflict: 'id' })
      return userId
    }

    // 1) Ensure demo users
    const adminEmail = 'demo-admin@demo.com'
    const parentAEmail = 'demo-parent-a@demo.com'
    const parentBEmail = 'demo-parent-b@demo.com'

    const adminId = await ensureUser(adminEmail, 'Password123!', 'Demo Admin')
    const parentAId = await ensureUser(parentAEmail, 'Password123!', 'Parent A')
    const parentBId = await ensureUser(parentBEmail, 'Password123!', 'Parent B')
    results.adminId = adminId
    results.parentAId = parentAId
    results.parentBId = parentBId

    // 2) Elevate admin to super admin (idempotent)
    await supabase.from('users').update({ is_super_admin: true }).eq('id', adminId)

    // 3) Ensure a demo circle
    const circleName = 'Neighborhood Pals'
    let { data: circleRow } = await supabase
      .from('circles')
      .select('id')
      .eq('name', circleName)
      .eq('created_by', adminId)
      .single()

    if (!circleRow) {
      const invite = generateInviteCode()
      const { data: insertedCircle, error: circleErr } = await supabase
        .from('circles')
        .insert({ id: cryptoRandomUUID(), name: circleName, description: 'Local families circle', created_by: adminId, invite_code: invite })
        .select('id')
        .single()
      if (circleErr) throw circleErr
      circleRow = insertedCircle!
    }
    const circleId = circleRow.id
    results.circleId = circleId

    // 4) Ensure memberships
    await upsertMember(supabase, circleId, adminId, 'admin', 'approved')
    await upsertMember(supabase, circleId, parentAId, 'member', 'approved')
    await upsertMember(supabase, circleId, parentBId, 'member', 'approved')

    // 5) Seed a playdate (future-dated)
    const existing = await supabase
      .from('playdates')
      .select('id')
      .eq('circle_id', circleId)
      .eq('title', 'Park Playdate')
      .maybeSingle()
    let playdateId: string
    if ((existing as any)?.data?.id) {
      playdateId = (existing as any).data.id
    } else {
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
      const { data: pd, error: pdErr } = await supabase
        .from('playdates')
        .insert({
          id: cryptoRandomUUID(),
          circle_id: circleId,
          created_by: adminId,
          title: 'Park Playdate',
          description: 'Bring snacks and blankets.',
          location_name: 'Central Park Playground',
          location_address: '123 Park Ave, City',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          capacity: 8,
          status: 'published',
        })
        .select('id')
        .single()
      if (pdErr) throw pdErr
      playdateId = pd!.id
    }
    results.playdateId = playdateId

    // 6) Participants & a hello message
    await supabase
      .from('playdate_participants')
      .upsert({ playdate_id: playdateId, user_id: parentAId, num_children: 1, status: 'confirmed' }, { onConflict: 'playdate_id,user_id' })

    await supabase
      .from('messages')
      .insert({ circle_id: circleId, user_id: adminId, content: 'Welcome to the Neighborhood Pals circle! 🎉' })

    return NextResponse.json({ ok: true, created: results }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: 'exception', message: e?.message, created: results }, { status: 200 })
  }
}

function cryptoRandomUUID() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID()
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function upsertMember(supabase: any, circleId: string, userId: string, role: 'admin' | 'member', status: 'pending' | 'approved') {
  const { data } = await supabase
    .from('circle_members')
    .select('id')
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) {
    await supabase
      .from('circle_members')
      .insert({ circle_id: circleId, user_id: userId, role, status })
  } else {
    await supabase
      .from('circle_members')
      .update({ role, status })
      .eq('id', data.id)
  }
}


