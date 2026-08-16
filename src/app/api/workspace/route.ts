import { requireSession } from '@/lib/auth'
import { jsonError, jsonOk } from '@/lib/access'
import { loadWorkspace, mutateWorkspace } from '@/lib/workspace'

export async function GET() {
  try {
    const session = await requireSession()
    return jsonOk(await loadWorkspace(session.userId))
  } catch (e) {
    return jsonError(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession()
    const body = await req.json()
    return jsonOk(await mutateWorkspace(session.userId, body))
  } catch (e) {
    return jsonError(e)
  }
}
