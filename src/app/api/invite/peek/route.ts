import { jsonOk } from '@/lib/access'
import { prisma } from '@/lib/db'
import { normalizeInviteCode } from '@/lib/invite'
import { NextResponse } from 'next/server'

/** Public: household name for an invite code (no session). */
export async function GET(req: Request) {
  const code = normalizeInviteCode(new URL(req.url).searchParams.get('code') || '')
  if (!code) return NextResponse.json({ error: 'badInvite' }, { status: 400 })

  const household = await prisma.household.findFirst({
    where: { inviteCode: code, shared: true },
    select: { name: true },
  })
  if (!household) return NextResponse.json({ error: 'badInvite' }, { status: 404 })

  return jsonOk({ name: household.name, code })
}
