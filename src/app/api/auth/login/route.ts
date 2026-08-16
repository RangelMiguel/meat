import { NextResponse } from 'next/server'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'

/** Password login is disabled — use WebAuthn passkeys only. */
export async function POST(req: Request) {
  const ip = clientIp(req)
  await enforceRateLimit({
    key: `login:ip:${ip}`,
    limit: 20,
    windowSec: 15 * 60,
  }).catch(() => {})

  return NextResponse.json(
    { error: 'passkeyRequired' },
    { status: 403 },
  )
}
