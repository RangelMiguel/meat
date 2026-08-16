import { z } from 'zod'
import { BadRequestError, requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/access'
import {
  createRegistrationOptions,
  verifyRegistration,
  listCredentials,
  removeCredential,
} from '@/lib/webauthn'
import { enforceRateLimit } from '@/lib/rate-limit'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'

export async function GET() {
  try {
    const session = await requireSession()
    const credentials = await listCredentials(session.userId)
    return jsonOk({ credentials })
  } catch (e) {
    return jsonError(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession()
    await enforceRateLimit({
      key: `webauthn-reg:${session.userId}`,
      limit: 10,
      windowSec: 60 * 60,
    })
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
    })
    const options = await createRegistrationOptions(user, req)
    return jsonOk(options)
  } catch (e) {
    return jsonError(e)
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireSession()
    const body = z
      .object({
        response: z.unknown(),
        nickname: z.string().max(80).optional(),
      })
      .parse(await req.json())

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
    })
    const cred = await verifyRegistration(
      user,
      req,
      body.response as RegistrationResponseJSON,
      body.nickname,
    )

    return jsonOk({
      credential: {
        id: cred.id,
        nickname: cred.nickname,
        deviceType: cred.deviceType,
        createdAt: cred.createdAt,
      },
    })
  } catch (e) {
    return jsonError(e)
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSession()
    const body = z.object({ id: z.string().min(1) }).parse(await req.json())

    const count = await prisma.webAuthnCredential.count({
      where: { userId: session.userId },
    })
    if (count <= 1) throw new BadRequestError('passkeyLast')

    await removeCredential(session.userId, body.id)
    return jsonOk({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}
