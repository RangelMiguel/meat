import { prisma } from '../db'
import { aliasList, buildPrivacyBook, nameTokens, type EntityAlias, type PrivacyBook } from './privacy'

export type MeatPrivacy = {
  book: PrivacyBook
  members: EntityAlias[]
}

export async function loadMeatPrivacy(userId: string): Promise<MeatPrivacy> {
  const member = await prisma.member.findFirst({
    where: { userId },
    include: {
      household: {
        include: {
          members: { select: { id: true, userId: true, name: true, planJson: true } },
          memberships: { include: { user: { select: { email: true, displayName: true } } } },
        },
      },
      user: { select: { email: true, displayName: true } },
    },
  })
  if (!member) {
    return { book: { replacements: [] }, members: [] }
  }

  const phrases: { from: string; to?: string }[] = []
  for (const token of nameTokens(member.household.name)) {
    phrases.push({ from: token, to: '[household]' })
  }
  for (const row of member.household.members) {
    for (const token of nameTokens(row.name, planName(row.planJson))) {
      phrases.push({ from: token, to: '[name]' })
    }
  }
  for (const row of member.household.memberships) {
    for (const token of nameTokens(row.user.displayName, row.user.email?.split('@')[0])) {
      phrases.push({ from: token, to: '[name]' })
    }
    if (row.user.email) phrases.push({ from: row.user.email, to: '[email]' })
  }
  if (member.user?.email) phrases.push({ from: member.user.email, to: '[email]' })

  const members = aliasList(
    member.household.members.map((row) => ({ id: row.id, names: [row.name] })),
    'Member',
  ).map((alias) => (alias.id === member.id ? { ...alias, alias: 'You' } : alias))

  return { book: buildPrivacyBook(phrases), members }
}

function planName(raw: string | null): string | undefined {
  if (!raw) return undefined
  try {
    const plan = JSON.parse(raw) as { input?: { name?: string } }
    return typeof plan.input?.name === 'string' ? plan.input.name : undefined
  } catch {
    return undefined
  }
}
