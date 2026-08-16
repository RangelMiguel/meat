import { randomBytes } from 'crypto'
import { prisma } from './db'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function randomInviteCode(): string {
  const bytes = randomBytes(6)
  let code = ''
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  return code
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export async function uniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = randomInviteCode()
    const exists = await prisma.household.findUnique({ where: { inviteCode: code } })
    if (!exists) return code
  }
  return `F${Date.now().toString(36).toUpperCase().slice(-8)}`
}
