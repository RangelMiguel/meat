import { z } from 'zod'
import { createSessionToken, setSessionCookie } from '@/lib/auth'
import { jsonError, jsonOk } from '@/lib/access'
import { createAuthenticationOptions, verifyAuthentication } from '@/lib/webauthn'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { loadWorkspace } from '@/lib/workspace'

/** POST — start (options); PUT — verify + session */
export async function POST(req: Request) {
  const ip = clientIp(req)
  try {
    await enforceRateLimit({
      key: `webauthn-login:ip:${ip}`,
      limit: 20,
      windowSec: 15 * 60,
    })
    const body = z
      .object({ email: z.string().email().optional() })
      .parse(await req.json().catch(() => ({})))
    const options = await createAuthenticationOptions(req, body.email)
    return jsonOk(options)
  } catch (e) {
    return jsonError(e)
  }
}

export async function PUT(req: Request) {
  const ip = clientIp(req)
  try {
    await enforceRateLimit({
      key: `webauthn-login:ip:${ip}`,
      limit: 20,
      windowSec: 15 * 60,
    })

    const body = z.object({ response: z.unknown() }).parse(await req.json())
    const user = await verifyAuthentication(req, body.response as AuthenticationResponseJSON)

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
