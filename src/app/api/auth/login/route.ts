import { z } from 'zod'
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from '@/lib/auth'
import { prisma } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/access'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { loadWorkspace } from '@/lib/workspace'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
})

export async function POST(req: Request) {
  const ip = clientIp(req)
  try {
    await enforceRateLimit({
      key: `login:ip:${ip}`,
      limit: 20,
      windowSec: 15 * 60,
    })

    const body = schema.parse(await req.json())
    const email = body.email.trim().toLowerCase()
    const user = await prisma.user.findUnique({ where: { email } })
    const ok = await verifyPassword(body.password, user?.passwordHash)
    if (!user || !ok) return jsonOk({ error: 'badLogin' }, 401)

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    })
    await setSessionCookie(token)

    return jsonOk(await loadWorkspace(user.id))
  } catch (e) {
    return jsonError(e)
  }
}
