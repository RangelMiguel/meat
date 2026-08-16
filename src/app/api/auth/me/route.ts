import { getSession } from '@/lib/auth'
import { jsonOk } from '@/lib/access'
import { loadWorkspace } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return jsonOk(await loadWorkspace(session.userId))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
