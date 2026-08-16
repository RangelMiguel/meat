import { z } from 'zod'
import { createSessionToken, hashPassword, setSessionCookie } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createHouseholdWithOwner } from '@/lib/household'
import { jsonError, jsonOk } from '@/lib/access'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { loadWorkspace } from '@/lib/workspace'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  displayName: z.string().min(1).max(80),
})

export async function POST(req: Request) {
  const ip = clientIp(req)
  try {
    await enforceRateLimit({
      key: `register:ip:${ip}`,
      limit: 8,
      windowSec: 60 * 60,
    })

    const body = schema.parse(await req.json())
    const email = body.email.trim().toLowerCase()
    const displayName = body.displayName.trim()
    if (!displayName) return jsonOk({ error: 'nameRequired' }, 400)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return jsonOk({ error: 'emailTaken' }, 409)

    const passwordHash = await hashPassword(body.password)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
      },
    })

    await createHouseholdWithOwner({
      name: displayName,
      userId: user.id,
      memberName: displayName,
    })

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    })
    await setSessionCookie(token)

    return jsonOk(await loadWorkspace(user.id), 201)
  } catch (e) {
    return jsonError(e)
  }
}
