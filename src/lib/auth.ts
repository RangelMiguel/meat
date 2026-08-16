const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function randomSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes.buffer)
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const actual = await hashPassword(password, salt)
  if (actual.length !== expectedHash.length) return false
  let mismatch = 0
  for (let i = 0; i < actual.length; i += 1) {
    mismatch |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  }
  return mismatch === 0
}

export function makeInviteCode(existing: Set<string>): string {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let code = ''
    const bytes = new Uint8Array(6)
    crypto.getRandomValues(bytes)
    for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
    if (!existing.has(code)) return code
  }
  return `F${Date.now().toString(36).toUpperCase().slice(-5)}`
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}
