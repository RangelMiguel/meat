import { prisma } from './db'
import { uniqueInviteCode } from './invite'

export async function createHouseholdWithOwner(opts: {
  name: string
  userId: string
  shared?: boolean
  memberName?: string
  /** Move this existing member instead of creating a new profile. */
  existingMemberId?: string
}) {
  const inviteCode = await uniqueInviteCode()
  const household = await prisma.household.create({
    data: {
      name: opts.name,
      inviteCode,
      shared: opts.shared ?? false,
      createdBy: opts.userId,
      memberships: {
        create: {
          userId: opts.userId,
          role: 'owner',
        },
      },
      kitchen: { create: {} },
      ...(opts.existingMemberId
        ? {}
        : {
            members: {
              create: {
                userId: opts.userId,
                name: opts.memberName || opts.name,
              },
            },
          }),
    },
    include: { members: true },
  })

  if (opts.existingMemberId) {
    await prisma.member.update({
      where: { id: opts.existingMemberId },
      data: { householdId: household.id, userId: opts.userId },
    })
  }

  const memberId =
    opts.existingMemberId ??
    household.members[0]?.id ??
    (
      await prisma.member.findFirst({
        where: { householdId: household.id, userId: opts.userId },
      })
    )?.id

  await prisma.userPreference.upsert({
    where: { userId: opts.userId },
    create: {
      userId: opts.userId,
      householdId: household.id,
      activeMemberId: memberId,
    },
    update: {
      householdId: household.id,
      activeMemberId: memberId,
    },
  })

  return household
}
