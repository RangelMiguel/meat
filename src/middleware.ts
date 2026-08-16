import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

function isPublic(path: string) {
  if (
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path === '/api/auth/logout'
  ) {
    return true
  }
  if (path.startsWith('/_next') || path.startsWith('/favicon')) return true
  if (!path.startsWith('/api/')) return true
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  const token = req.cookies.get('meat_session')?.value
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const secret = process.env.AUTH_SECRET
    if (!secret) throw new Error('no secret')
    await jwtVerify(token, new TextEncoder().encode(secret))
    return NextResponse.next()
  } catch {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
