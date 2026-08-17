/** Client-safe invite helpers (no Prisma). */

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function inviteCodeFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  const path = window.location.pathname
  const join = path.match(/^\/join\/([^/?#]+)\/?$/i)
  if (join?.[1]) return normalizeInviteCode(decodeURIComponent(join[1]))
  const query = new URLSearchParams(window.location.search).get('invite')
  return query ? normalizeInviteCode(query) : null
}

export function inviteLink(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/join/${normalizeInviteCode(code)}`
}

export function clearInviteFromLocation() {
  if (typeof window === 'undefined') return
  if (window.location.pathname.startsWith('/join/') || window.location.search.includes('invite=')) {
    window.history.replaceState({}, '', '/')
  }
}
