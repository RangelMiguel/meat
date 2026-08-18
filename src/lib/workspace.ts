import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from './db'
import { BadRequestError, canAdmin, requireHouseholdAccess } from './auth'
import { createHouseholdWithOwner } from './household'
import { normalizeInviteCode, uniqueInviteCode } from './invite'
import { clampBoughtOn, clampGrams, todayKey } from './calories'
import { consumeInventoryLots, recipeNeedsForServings } from './portions'
import { parseWeekPlan } from './weekPlan'
import {
  normalizeFinanceUrl,
  parseFinanceLink,
  postMeatPurchase,
  publicFinanceLink,
  purchaseItemsForFinance,
  serializeFinanceLink,
  testMeatConnection,
} from './finance'
import {
  findMergedRecipe,
  isUserRecipe,
  parseCustomRecipes,
  parseRecipeOverrides,
  USER_RECIPE_PREFIX,
} from './recipeLibrary'
import { parseCustomIngredients, snackIngredientId } from './customIngredients'
import type { Recipe } from '../data/types'
import type {
  CaloriePlan,
  ExerciseEntry,
  ExerciseKind,
  Family,
  FoodEntry,
  InventoryItem,
  Kitchen,
  MealType,
  Member,
  PurchaseItem,
  WeekMealSlot,
} from '../types'
import type { Locale } from '../i18n'
import { normalizeThemeId, type ThemeId } from '../themes'
import type { WorkspaceDTO } from './workspace-types'
import { listInstalledModuleIds, requireAddon } from './modules/access'

export type { WorkspaceDTO } from './workspace-types'

const workspaceInclude = {
  members: {
    include: {
      entries: { orderBy: { createdAt: 'desc' as const } },
      exercises: { orderBy: { createdAt: 'desc' as const } },
      waterLogs: true,
    },
  },
  kitchen: {
    include: {
      inventory: { orderBy: { createdAt: 'desc' as const } },
      purchases: { orderBy: { createdAt: 'desc' as const } },
    },
  },
  memberships: true,
} satisfies Prisma.HouseholdInclude

type LoadedHousehold = Prisma.HouseholdGetPayload<{ include: typeof workspaceInclude }>

const MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const EXERCISE_KINDS: ExerciseKind[] = [
  'walk',
  'run',
  'cycle',
  'swim',
  'weights',
  'yoga',
  'hiit',
  'hike',
  'dance',
  'sport',
  'other',
]

function parseTheme(value: string | null | undefined): ThemeId {
  return normalizeThemeId(value)
}

function parseLocale(value: string | null | undefined): Locale {
  return value === 'es' || value === 'en' ? value : 'en'
}

function parsePlan(raw: string | null): CaloriePlan | null {
  if (!raw) return null
  try {
    const plan = JSON.parse(raw) as CaloriePlan
    return plan && typeof plan === 'object' ? plan : null
  } catch {
    return null
  }
}

function parseRecipes(raw: string): Recipe[] {
  try {
    return parseCustomRecipes(JSON.parse(raw))
  } catch {
    return []
  }
}

function parseOverrides(raw: string): Record<string, Recipe> {
  try {
    return parseRecipeOverrides(JSON.parse(raw))
  } catch {
    return {}
  }
}

function ownerUserId(household: LoadedHousehold): string | null {
  return household.memberships.find((item) => item.role === 'owner')?.userId ?? household.createdBy
}

function toFood(entry: LoadedHousehold['members'][number]['entries'][number]): FoodEntry {
  return {
    id: entry.id,
    date: entry.date,
    meal: MEALS.includes(entry.meal as MealType) ? (entry.meal as MealType) : 'Snack',
    name: entry.name,
    detail: entry.detail ?? undefined,
    kcal: entry.kcal,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    createdAt: entry.createdAt.toISOString(),
    recipeId: entry.recipeId ?? undefined,
    servings: entry.servings ?? undefined,
  }
}

function toExercise(entry: LoadedHousehold['members'][number]['exercises'][number]): ExerciseEntry {
  return {
    id: entry.id,
    date: entry.date,
    kind: EXERCISE_KINDS.includes(entry.kind as ExerciseKind) ? (entry.kind as ExerciseKind) : 'other',
    name: entry.name,
    minutes: entry.minutes,
    kcal: entry.kcal,
    createdAt: entry.createdAt.toISOString(),
  }
}

function toMember(household: LoadedHousehold, member: LoadedHousehold['members'][number], kitchenId: string): Member {
  const water: Record<string, number> = {}
  for (const log of member.waterLogs) {
    if (log.glasses > 0) water[log.date] = log.glasses
  }
  return {
    id: member.id,
    accountId: member.userId,
    familyId: household.shared ? household.id : null,
    kitchenId,
    name: member.name,
    plan: parsePlan(member.planJson),
    entries: member.entries.map(toFood),
    exercises: member.exercises.map(toExercise),
    water,
  }
}

function toKitchen(household: LoadedHousehold, kitchen: NonNullable<LoadedHousehold['kitchen']>): Kitchen {
  return {
    id: kitchen.id,
    familyId: household.shared ? household.id : null,
    ownerAccountId: ownerUserId(household),
    inventory: kitchen.inventory.map(
      (item): InventoryItem => ({
        id: item.id,
        ingredientId: item.ingredientId,
        grams: item.grams,
        boughtOn: item.boughtOn,
        createdAt: item.createdAt.toISOString(),
      }),
    ),
    purchaseList: kitchen.purchases.map(
      (item): PurchaseItem => ({
        id: item.id,
        ingredientId: item.ingredientId,
        grams: item.grams,
        createdAt: item.createdAt.toISOString(),
      }),
    ),
    customRecipes: parseRecipes(kitchen.recipesJson),
    recipeOverrides: parseOverrides(kitchen.overridesJson),
    customIngredients: parseCustomIngredients(safeJson(kitchen.ingredientsJson)),
    weekPlan: parseWeekPlan(safeJson(kitchen.weekPlanJson)),
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function toFamily(household: LoadedHousehold): Family | null {
  if (!household.shared) return null
  return {
    id: household.id,
    name: household.name,
    inviteCode: household.inviteCode,
    ownerAccountId: ownerUserId(household) ?? '',
    createdAt: household.createdAt.toISOString(),
  }
}

export function serializeWorkspace(
  household: LoadedHousehold,
  user: { id: string; email: string; displayName: string; createdAt: Date; locale?: string },
  pref: { theme: string; locale: string; activeMemberId: string | null } | null,
): WorkspaceDTO {
  const kitchen = household.kitchen
  if (!kitchen) throw new Error('Household kitchen missing')
  const members = household.members.map((member) => toMember(household, member, kitchen.id))
  const active =
    pref?.activeMemberId && members.some((member) => member.id === pref.activeMemberId)
      ? pref.activeMemberId
      : (members.find((member) => member.accountId === user.id)?.id ?? members[0]?.id ?? null)

  return {
    account: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    },
    family: toFamily(household),
    members,
    kitchens: [toKitchen(household, kitchen)],
    activeMemberId: active,
    theme: parseTheme(pref?.theme),
    locale: parseLocale(pref?.locale || user.locale),
    finance: publicFinanceLink(parseFinanceLink(safeJson(kitchen.integrationsJson))),
    role: household.memberships.find((item) => item.userId === user.id)?.role ?? 'member',
    installedModules: [],
  }
}

export async function loadWorkspace(userId: string): Promise<WorkspaceDTO> {
  const access = await requireHouseholdAccess(userId)
  const household = await prisma.household.findUnique({
    where: { id: access.householdId },
    include: workspaceInclude,
  })
  if (!household?.kitchen) throw new BadRequestError('notInFamily')
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new BadRequestError('badLogin')
  const pref = await prisma.userPreference.findUnique({ where: { userId } })
  const installedModules = await listInstalledModuleIds(household.id)
  return { ...serializeWorkspace(household, user, pref), installedModules }
}

async function loadHousehold(householdId: string) {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: workspaceInclude,
  })
  if (!household?.kitchen) throw new BadRequestError('notInFamily')
  return household
}

function memberOfUser(household: LoadedHousehold, userId: string) {
  return household.members.find((member) => member.userId === userId)
}

const caloriePlanSchema = z.object({
  input: z.object({
    name: z.string(),
    sex: z.enum(['male', 'female']),
    age: z.number(),
    heightCm: z.number(),
    weightKg: z.number(),
    activity: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
    goal: z.enum(['lose', 'maintain', 'gain']),
    weeklyChangeKg: z.number(),
  }),
  bmr: z.number(),
  tdee: z.number(),
  dailyCalories: z.number(),
  macros: z.object({
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
  }),
  waterGlasses: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const recipeSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  nameEs: z.string().optional(),
  cuisine: z.enum(['mexican', 'american', 'italian', 'chinese']).optional(),
  region: z.string().optional(),
  category: z.string(),
  servings: z.number(),
  ingredients: z.array(
    z.object({
      ingredientId: z.string(),
      grams: z.number(),
      note: z.string().optional(),
    }),
  ),
  summary: z.string().optional(),
  steps: z.array(z.string()).optional(),
})

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('createFamily'), name: z.string() }),
  z.object({ action: z.literal('joinFamily'), code: z.string() }),
  z.object({ action: z.literal('leaveFamily') }),
  z.object({ action: z.literal('dissolveFamily') }),
  z.object({ action: z.literal('addManagedMember'), name: z.string() }),
  z.object({ action: z.literal('removeMember'), memberId: z.string() }),
  z.object({ action: z.literal('regenerateInviteCode') }),
  z.object({ action: z.literal('setActiveMember'), memberId: z.string() }),
  z.object({ action: z.literal('setTheme'), theme: z.string() }),
  z.object({ action: z.literal('setLocale'), locale: z.enum(['en', 'es']) }),
  z.object({
    action: z.literal('savePlan'),
    plan: caloriePlanSchema,
    memberId: z.string().optional(),
  }),
  z.object({ action: z.literal('clearPlan'), memberId: z.string().optional() }),
  z.object({
    action: z.literal('addEntry'),
    entry: z.object({
      date: z.string().optional(),
      meal: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
      name: z.string(),
      detail: z.string().optional(),
      kcal: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      recipeId: z.string().optional(),
      servings: z.number().optional(),
    }),
    memberIds: z.array(z.string()).optional(),
  }),
  z.object({
    action: z.literal('logRecipeWithInventory'),
    meal: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
    name: z.string(),
    detail: z.string().optional(),
    recipeId: z.string(),
    portions: z.array(
      z.object({
        memberId: z.string(),
        servings: z.number(),
        kcal: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
      }),
    ),
  }),
  z.object({ action: z.literal('removeEntry'), id: z.string() }),
  z.object({
    action: z.literal('addExercise'),
    kind: z.enum([
      'walk',
      'run',
      'cycle',
      'swim',
      'weights',
      'yoga',
      'hiit',
      'hike',
      'dance',
      'sport',
      'other',
    ]),
    name: z.string(),
    minutes: z.number(),
    date: z.string().optional(),
    members: z.array(z.object({ memberId: z.string(), kcal: z.number() })),
  }),
  z.object({ action: z.literal('removeExercise'), id: z.string() }),
  z.object({
    action: z.literal('setWater'),
    date: z.string(),
    glasses: z.number(),
    memberId: z.string().optional(),
  }),
  z.object({
    action: z.literal('addInventoryItem'),
    ingredientId: z.string(),
    boughtOn: z.string(),
    grams: z.number(),
  }),
  z.object({
    action: z.literal('updateInventoryLot'),
    id: z.string(),
    grams: z.number().optional(),
    boughtOn: z.string().optional(),
  }),
  z.object({ action: z.literal('removeInventoryItem'), id: z.string() }),
  z.object({
    action: z.literal('addToPurchaseList'),
    items: z.array(z.object({ ingredientId: z.string(), grams: z.number() })),
  }),
  z.object({ action: z.literal('updatePurchaseItem'), id: z.string(), grams: z.number() }),
  z.object({ action: z.literal('removePurchaseItem'), id: z.string() }),
  z.object({
    action: z.literal('completePurchaseList'),
    spendAmount: z.number().optional(),
    spendNote: z.string().optional(),
    skipFinance: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('saveFinanceIntegration'),
    enabled: z.boolean(),
    baseUrl: z.string(),
    token: z.string().optional(),
  }),
  z.object({ action: z.literal('testFinanceIntegration') }),
  z.object({
    action: z.literal('saveWeekPlan'),
    slots: z.array(
      z.object({
        id: z.string(),
        date: z.string(),
        meal: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
        recipeId: z.string(),
        servings: z.number(),
        memberId: z.string(),
      }),
    ),
  }),
  z.object({
    action: z.literal('saveIngredient'),
    ingredient: z.object({
      id: z.string().optional(),
      name: z.string(),
      nameEs: z.string().optional(),
      category: z.string().optional(),
      kcal: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      unit: z.enum(['g', 'ml']).optional(),
    }),
  }),
  z.object({ action: z.literal('saveRecipe'), recipe: recipeSchema }),
  z.object({
    action: z.literal('importRecipes'),
    recipes: z.array(recipeSchema).min(1).max(200),
  }),
  z.object({ action: z.literal('deleteRecipe'), id: z.string() }),
  z.object({ action: z.literal('resetRecipe'), id: z.string() }),
  z.object({
    action: z.literal('importLegacy'),
    plan: caloriePlanSchema.nullable().optional(),
    entries: z.array(z.any()).optional(),
    water: z.record(z.string(), z.number()).optional(),
    inventory: z.array(z.any()).optional(),
    purchaseList: z.array(z.any()).optional(),
    customRecipes: z.array(z.any()).optional(),
    recipeOverrides: z.record(z.string(), z.any()).optional(),
  }),
])

async function mergeKitchenInto(targetKitchenId: string, sourceKitchenId: string) {
  if (targetKitchenId === sourceKitchenId) return
  const [target, source] = await Promise.all([
    prisma.kitchen.findUnique({
      where: { id: targetKitchenId },
      include: { inventory: true, purchases: true },
    }),
    prisma.kitchen.findUnique({
      where: { id: sourceKitchenId },
      include: { inventory: true, purchases: true },
    }),
  ])
  if (!target || !source) return

  for (const lot of source.inventory) {
    const existing = target.inventory.find(
      (item) => item.ingredientId === lot.ingredientId && item.boughtOn === lot.boughtOn,
    )
    if (existing) {
      await prisma.inventoryItem.update({
        where: { id: existing.id },
        data: { grams: clampGrams(existing.grams + lot.grams) },
      })
    } else {
      await prisma.inventoryItem.create({
        data: {
          kitchenId: target.id,
          ingredientId: lot.ingredientId,
          grams: lot.grams,
          boughtOn: lot.boughtOn,
        },
      })
    }
  }

  for (const item of source.purchases) {
    const existing = target.purchases.find((row) => row.ingredientId === item.ingredientId)
    if (existing) {
      await prisma.purchaseItem.update({
        where: { id: existing.id },
        data: { grams: clampGrams(existing.grams + item.grams) },
      })
    } else {
      await prisma.purchaseItem.create({
        data: {
          kitchenId: target.id,
          ingredientId: item.ingredientId,
          grams: item.grams,
        },
      })
    }
  }

  const targetRecipes = parseRecipes(target.recipesJson)
  const sourceRecipes = parseRecipes(source.recipesJson)
  const ids = new Set(targetRecipes.map((recipe) => recipe.id))
  const recipes = [...targetRecipes, ...sourceRecipes.filter((recipe) => !ids.has(recipe.id))]
  const overrides = {
    ...parseOverrides(source.overridesJson),
    ...parseOverrides(target.overridesJson),
  }
  const targetFinance = parseFinanceLink(safeJson(target.integrationsJson))
  const sourceFinance = parseFinanceLink(safeJson(source.integrationsJson))
  const finance = targetFinance.token ? targetFinance : sourceFinance
  const targetIngs = parseCustomIngredients(safeJson(target.ingredientsJson))
  const sourceIngs = parseCustomIngredients(safeJson(source.ingredientsJson))
  const ingIds = new Set(targetIngs.map((item) => item.id))
  const ingredients = [...targetIngs, ...sourceIngs.filter((item) => !ingIds.has(item.id))]
  await prisma.kitchen.update({
    where: { id: target.id },
    data: {
      recipesJson: JSON.stringify(recipes),
      overridesJson: JSON.stringify(overrides),
      ingredientsJson: JSON.stringify(ingredients),
      integrationsJson: serializeFinanceLink(finance),
    },
  })
}

export async function mutateWorkspace(userId: string, raw: unknown): Promise<WorkspaceDTO> {
  const body = actionSchema.parse(raw)
  const access = await requireHouseholdAccess(userId, {
    write: body.action !== 'setActiveMember' && body.action !== 'setTheme' && body.action !== 'setLocale',
  })
  let household = await loadHousehold(access.householdId)
  const mine = memberOfUser(household, userId)
  if (!mine) throw new BadRequestError('badLogin')

  if (body.action === 'saveWeekPlan') await requireAddon(household.id, 'week')
  if (body.action === 'addExercise' || body.action === 'removeExercise') {
    await requireAddon(household.id, 'exercise')
  }

  switch (body.action) {
    case 'createFamily': {
      const name = body.name.trim()
      if (!name) throw new BadRequestError('familyNameRequired')
      if (household.shared) throw new BadRequestError('alreadyInFamily')
      await prisma.household.update({
        where: { id: household.id },
        data: { name, shared: true },
      })
      break
    }
    case 'joinFamily': {
      if (household.shared) throw new BadRequestError('alreadyInFamily')
      const code = normalizeInviteCode(body.code)
      if (!code) throw new BadRequestError('badInvite')
      const target = await prisma.household.findFirst({
        where: { inviteCode: code, shared: true },
        include: { kitchen: true },
      })
      if (!target?.kitchen) throw new BadRequestError('badInvite')
      if (target.id === household.id) throw new BadRequestError('alreadyInFamily')
      await mergeKitchenInto(target.kitchen.id, household.kitchen!.id)
      await prisma.$transaction([
        prisma.member.update({
          where: { id: mine.id },
          data: { householdId: target.id },
        }),
        prisma.membership.delete({
          where: { householdId_userId: { householdId: household.id, userId } },
        }),
        prisma.membership.create({
          data: { householdId: target.id, userId, role: 'member' },
        }),
        prisma.userPreference.upsert({
          where: { userId },
          create: { userId, householdId: target.id, activeMemberId: mine.id },
          update: { householdId: target.id, activeMemberId: mine.id },
        }),
      ])
      const leftover = await prisma.membership.count({ where: { householdId: household.id } })
      if (leftover === 0) {
        await prisma.household.delete({ where: { id: household.id } })
      }
      household = await loadHousehold(target.id)
      break
    }
    case 'leaveFamily': {
      if (!household.shared) throw new BadRequestError('notInFamily')
      const others = household.memberships.filter((item) => item.userId !== userId)
      if (access.role === 'owner' && others.length > 0) {
        throw new BadRequestError('ownerMustDissolve')
      }
      if (others.length === 0) {
        await prisma.household.update({
          where: { id: household.id },
          data: { shared: false },
        })
        break
      }
      await prisma.membership.delete({
        where: { householdId_userId: { householdId: household.id, userId } },
      })
      const created = await createHouseholdWithOwner({
        name: mine.name,
        userId,
        shared: false,
        memberName: mine.name,
        existingMemberId: mine.id,
      })
      household = await loadHousehold(created.id)
      break
    }
    case 'dissolveFamily': {
      if (!household.shared || !canAdmin(access.role)) throw new BadRequestError('notInFamily')
      const others = household.members.filter((member) => member.userId && member.userId !== userId)
      for (const other of others) {
        if (!other.userId) continue
        await prisma.membership.delete({
          where: { householdId_userId: { householdId: household.id, userId: other.userId } },
        })
        await createHouseholdWithOwner({
          name: other.name,
          userId: other.userId,
          shared: false,
          memberName: other.name,
          existingMemberId: other.id,
        })
      }
      await prisma.household.update({
        where: { id: household.id },
        data: { shared: false },
      })
      break
    }
    case 'addManagedMember': {
      if (!household.shared) throw new BadRequestError('notInFamily')
      const name = body.name.trim()
      if (!name) throw new BadRequestError('nameRequired')
      const created = await prisma.member.create({
        data: { householdId: household.id, name, userId: null },
      })
      await prisma.userPreference.update({
        where: { userId },
        data: { activeMemberId: created.id },
      })
      break
    }
    case 'removeMember': {
      if (!household.shared || !canAdmin(access.role)) throw new BadRequestError('notInFamily')
      const target = household.members.find((member) => member.id === body.memberId)
      if (!target) throw new BadRequestError('notInFamily')
      if (target.id === mine.id) throw new BadRequestError('cannotRemoveSelf')
      if (target.userId) {
        await prisma.membership.delete({
          where: { householdId_userId: { householdId: household.id, userId: target.userId } },
        })
        await createHouseholdWithOwner({
          name: target.name,
          userId: target.userId,
          shared: false,
          memberName: target.name,
          existingMemberId: target.id,
        })
      } else {
        await prisma.member.delete({ where: { id: target.id } })
      }
      await prisma.userPreference.updateMany({
        where: { userId, activeMemberId: body.memberId },
        data: { activeMemberId: mine.id },
      })
      break
    }
    case 'regenerateInviteCode': {
      if (!household.shared || !canAdmin(access.role)) throw new BadRequestError('notInFamily')
      await prisma.household.update({
        where: { id: household.id },
        data: { inviteCode: await uniqueInviteCode() },
      })
      break
    }
    case 'setActiveMember': {
      if (!household.members.some((member) => member.id === body.memberId)) {
        throw new BadRequestError('notInFamily')
      }
      await prisma.userPreference.upsert({
        where: { userId },
        create: { userId, householdId: household.id, activeMemberId: body.memberId },
        update: { activeMemberId: body.memberId },
      })
      break
    }
    case 'setTheme': {
      const theme = parseTheme(body.theme)
      await prisma.userPreference.upsert({
        where: { userId },
        create: { userId, householdId: household.id, theme },
        update: { theme },
      })
      break
    }
    case 'setLocale': {
      await prisma.user.update({ where: { id: userId }, data: { locale: body.locale } })
      await prisma.userPreference.upsert({
        where: { userId },
        create: { userId, householdId: household.id, locale: body.locale },
        update: { locale: body.locale },
      })
      break
    }
    case 'savePlan': {
      const targetId = body.memberId ?? mine.id
      const target = household.members.find((member) => member.id === targetId)
      if (!target) throw new BadRequestError('notInFamily')
      const named = body.plan.input.name.trim() || target.name
      const nextPlan = { ...body.plan, input: { ...body.plan.input, name: named } }
      await prisma.member.update({
        where: { id: target.id },
        data: { name: named, planJson: JSON.stringify(nextPlan) },
      })
      break
    }
    case 'clearPlan': {
      const targetId = body.memberId ?? mine.id
      if (!household.members.some((member) => member.id === targetId)) {
        throw new BadRequestError('notInFamily')
      }
      await prisma.member.update({ where: { id: targetId }, data: { planJson: null } })
      break
    }
    case 'addEntry': {
      const targets =
        body.memberIds && body.memberIds.length > 0 ? body.memberIds : [mine.id]
      const date = body.entry.date ?? todayKey()
      for (const memberId of targets) {
        if (!household.members.some((member) => member.id === memberId)) continue
        await prisma.foodEntry.create({
          data: {
            memberId,
            date,
            meal: body.entry.meal,
            name: body.entry.name,
            detail: body.entry.detail,
            kcal: body.entry.kcal,
            protein: body.entry.protein,
            carbs: body.entry.carbs,
            fat: body.entry.fat,
            recipeId: body.entry.recipeId,
            servings: body.entry.servings,
          },
        })
      }
      break
    }
    case 'logRecipeWithInventory': {
      const kitchen = household.kitchen!
      const custom = parseRecipes(kitchen.recipesJson)
      const overrides = parseOverrides(kitchen.overridesJson)
      const recipe = findMergedRecipe(body.recipeId, custom, overrides)
      if (!recipe) throw new BadRequestError('notInFamily')
      const totalServings = body.portions.reduce((sum, part) => sum + part.servings, 0)
      if (totalServings <= 0) throw new BadRequestError('notInFamily')
      const needs = recipeNeedsForServings(recipe, totalServings)
      const currentLots = kitchen.inventory.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        grams: item.grams,
        boughtOn: item.boughtOn,
        createdAt: item.createdAt.toISOString(),
      }))
      const nextInv = consumeInventoryLots(currentLots, needs)
      if (!nextInv) throw new BadRequestError('notInFamily')
      const nextIds = new Set(nextInv.map((item) => item.id))
      await prisma.$transaction(async (tx) => {
        for (const lot of kitchen.inventory) {
          if (!nextIds.has(lot.id)) {
            await tx.inventoryItem.delete({ where: { id: lot.id } })
            continue
          }
          const updated = nextInv.find((item) => item.id === lot.id)
          if (updated && updated.grams !== lot.grams) {
            await tx.inventoryItem.update({
              where: { id: lot.id },
              data: { grams: updated.grams },
            })
          }
        }
        const date = todayKey()
        for (const part of body.portions) {
          if (!household.members.some((member) => member.id === part.memberId)) continue
          await tx.foodEntry.create({
            data: {
              memberId: part.memberId,
              date,
              meal: body.meal,
              name: body.name,
              detail: body.detail,
              kcal: part.kcal,
              protein: part.protein,
              carbs: part.carbs,
              fat: part.fat,
              recipeId: body.recipeId,
              servings: part.servings,
            },
          })
        }
      })
      break
    }
    case 'removeEntry': {
      const entry = await prisma.foodEntry.findFirst({
        where: {
          id: body.id,
          member: { householdId: household.id },
        },
      })
      if (entry) await prisma.foodEntry.delete({ where: { id: entry.id } })
      break
    }
    case 'addExercise': {
      const date = body.date ?? todayKey()
      const minutes = Math.max(1, Math.round(body.minutes))
      for (const part of body.members) {
        if (!household.members.some((member) => member.id === part.memberId)) continue
        await prisma.exerciseEntry.create({
          data: {
            memberId: part.memberId,
            date,
            kind: body.kind,
            name: body.name.trim() || body.kind,
            minutes,
            kcal: Math.max(0, Math.round(part.kcal)),
          },
        })
      }
      break
    }
    case 'removeExercise': {
      const entry = await prisma.exerciseEntry.findFirst({
        where: {
          id: body.id,
          member: { householdId: household.id },
        },
      })
      if (entry) await prisma.exerciseEntry.delete({ where: { id: entry.id } })
      break
    }
    case 'setWater': {
      const memberId = body.memberId ?? mine.id
      if (!household.members.some((member) => member.id === memberId)) {
        throw new BadRequestError('notInFamily')
      }
      await prisma.waterLog.upsert({
        where: { memberId_date: { memberId, date: body.date } },
        create: { memberId, date: body.date, glasses: Math.max(0, body.glasses) },
        update: { glasses: Math.max(0, body.glasses) },
      })
      break
    }
    case 'addInventoryItem': {
      const kitchenId = household.kitchen!.id
      const grams = clampGrams(body.grams)
      const boughtOn = clampBoughtOn(body.boughtOn)
      const existing = await prisma.inventoryItem.findFirst({
        where: { kitchenId, ingredientId: body.ingredientId, boughtOn },
      })
      if (existing) {
        await prisma.inventoryItem.update({
          where: { id: existing.id },
          data: { grams: clampGrams(existing.grams + grams) },
        })
      } else {
        await prisma.inventoryItem.create({
          data: {
            kitchenId,
            ingredientId: body.ingredientId,
            grams,
            boughtOn,
          },
        })
      }
      break
    }
    case 'updateInventoryLot': {
      await prisma.inventoryItem.updateMany({
        where: { id: body.id, kitchenId: household.kitchen!.id },
        data: {
          ...(body.grams !== undefined ? { grams: clampGrams(body.grams) } : {}),
          ...(body.boughtOn !== undefined ? { boughtOn: clampBoughtOn(body.boughtOn) } : {}),
        },
      })
      break
    }
    case 'removeInventoryItem': {
      await prisma.inventoryItem.deleteMany({
        where: { id: body.id, kitchenId: household.kitchen!.id },
      })
      break
    }
    case 'addToPurchaseList': {
      const kitchenId = household.kitchen!.id
      for (const item of body.items) {
        const grams = clampGrams(item.grams)
        if (grams <= 0) continue
        const existing = await prisma.purchaseItem.findFirst({
          where: { kitchenId, ingredientId: item.ingredientId },
        })
        if (existing) {
          await prisma.purchaseItem.update({
            where: { id: existing.id },
            data: { grams: clampGrams(existing.grams + grams) },
          })
        } else {
          await prisma.purchaseItem.create({
            data: { kitchenId, ingredientId: item.ingredientId, grams },
          })
        }
      }
      break
    }
    case 'updatePurchaseItem': {
      await prisma.purchaseItem.updateMany({
        where: { id: body.id, kitchenId: household.kitchen!.id },
        data: { grams: clampGrams(body.grams) },
      })
      break
    }
    case 'removePurchaseItem': {
      await prisma.purchaseItem.deleteMany({
        where: { id: body.id, kitchenId: household.kitchen!.id },
      })
      break
    }
    case 'saveWeekPlan': {
      const slots: WeekMealSlot[] = body.slots
        .filter((slot) => slot.servings > 0 && /^\d{4}-\d{2}-\d{2}$/.test(slot.date))
        .map((slot) => ({
          id: slot.id,
          date: slot.date,
          meal: slot.meal,
          recipeId: slot.recipeId,
          servings: slot.servings,
          memberId: slot.memberId,
        }))
      await prisma.kitchen.update({
        where: { id: household.kitchen!.id },
        data: { weekPlanJson: JSON.stringify({ slots }) },
      })
      break
    }
    case 'saveFinanceIntegration': {
      const kitchen = household.kitchen!
      const current = parseFinanceLink(safeJson(kitchen.integrationsJson))
      const nextToken = body.token?.trim()
      const cfg = {
        ...current,
        enabled: body.enabled,
        baseUrl: normalizeFinanceUrl(body.baseUrl),
        token: nextToken ? nextToken : current.token,
      }
      await prisma.kitchen.update({
        where: { id: kitchen.id },
        data: { integrationsJson: serializeFinanceLink(cfg) },
      })
      break
    }
    case 'testFinanceIntegration': {
      const kitchen = household.kitchen!
      const cfg = parseFinanceLink(safeJson(kitchen.integrationsJson))
      if (!cfg.baseUrl || !cfg.token) {
        throw new BadRequestError('financeNotConfigured')
      }
      const result = await testMeatConnection({ baseUrl: cfg.baseUrl, token: cfg.token })
      const next = {
        ...cfg,
        lastStatus: result.ok ? ('ok' as const) : ('error' as const),
        lastError: result.ok ? null : result.error,
        lastAt: new Date().toISOString(),
      }
      await prisma.kitchen.update({
        where: { id: kitchen.id },
        data: { integrationsJson: serializeFinanceLink(next) },
      })
      break
    }
    case 'completePurchaseList': {
      const kitchen = household.kitchen!
      const boughtOn = todayKey()
      const shopItems = kitchen.purchases.filter((item) => item.grams > 0)
      for (const item of kitchen.purchases) {
        const grams = clampGrams(item.grams)
        if (grams <= 0) continue
        const existing = kitchen.inventory.find(
          (lot) => lot.ingredientId === item.ingredientId && lot.boughtOn === boughtOn,
        )
        if (existing) {
          await prisma.inventoryItem.update({
            where: { id: existing.id },
            data: { grams: clampGrams(existing.grams + grams) },
          })
        } else {
          await prisma.inventoryItem.create({
            data: {
              kitchenId: kitchen.id,
              ingredientId: item.ingredientId,
              grams,
              boughtOn,
            },
          })
        }
      }
      await prisma.purchaseItem.deleteMany({ where: { kitchenId: kitchen.id } })

      const finance = parseFinanceLink(safeJson(kitchen.integrationsJson))
      const amount = Number(body.spendAmount)
      const shouldSend =
        !body.skipFinance &&
        finance.enabled &&
        Boolean(finance.baseUrl && finance.token) &&
        Number.isFinite(amount) &&
        amount > 0
      if (shouldSend) {
        const items = purchaseItemsForFinance(
          shopItems.map((item) => ({
            id: item.id,
            ingredientId: item.ingredientId,
            grams: item.grams,
            createdAt: item.createdAt.toISOString(),
          })),
        )
        const note = body.spendNote?.trim()
        const result = await postMeatPurchase({
          baseUrl: finance.baseUrl,
          token: finance.token,
          amount,
          date: boughtOn,
          description: note || `Meat grocery shop (${items.length})`,
          items,
          clientMutationId: `meat-${kitchen.id}-${boughtOn}-${Date.now()}`,
        })
        await prisma.kitchen.update({
          where: { id: kitchen.id },
          data: {
            integrationsJson: serializeFinanceLink({
              ...finance,
              lastStatus: result.ok ? 'ok' : 'error',
              lastError: result.ok ? null : result.error,
              lastAt: new Date().toISOString(),
            }),
          },
        })
      }
      break
    }
    case 'importRecipes': {
      const kitchen = household.kitchen!
      let custom = parseRecipes(kitchen.recipesJson)
      let overrides = parseOverrides(kitchen.overridesJson)
      for (const incoming of body.recipes) {
        const id = incoming.id ?? `${USER_RECIPE_PREFIX}${Date.now().toString(36)}`
        const recipe: Recipe = {
          ...incoming,
          id,
          name: incoming.name.trim() || 'Untitled recipe',
          nameEs: (incoming.nameEs || incoming.name).trim() || 'Untitled recipe',
          servings: Math.max(1, incoming.servings || 4),
          ingredients: incoming.ingredients.filter((line) => line.ingredientId && line.grams > 0),
          steps: (incoming.steps ?? []).map((step) => step.trim()).filter(Boolean),
        }
        if (!recipe.ingredients.length) continue
        if (isUserRecipe(id) || custom.some((item) => item.id === id)) {
          const idx = custom.findIndex((item) => item.id === id)
          custom = idx === -1 ? [recipe, ...custom] : custom.map((item) => (item.id === id ? recipe : item))
        } else {
          overrides = { ...overrides, [id]: recipe }
        }
      }
      await prisma.kitchen.update({
        where: { id: kitchen.id },
        data: {
          recipesJson: JSON.stringify(custom),
          overridesJson: JSON.stringify(overrides),
        },
      })
      break
    }
    case 'saveIngredient': {
      const kitchen = household.kitchen!
      const custom = parseCustomIngredients(safeJson(kitchen.ingredientsJson))
      const id = body.ingredient.id?.trim() || snackIngredientId(body.ingredient.name)
      const nextIng = {
        id,
        name: body.ingredient.name.trim() || id,
        nameEs: (body.ingredient.nameEs || body.ingredient.name).trim(),
        category: (body.ingredient.category as 'other') || 'other',
        per100g: {
          kcal: body.ingredient.kcal,
          protein: body.ingredient.protein,
          carbs: body.ingredient.carbs,
          fat: body.ingredient.fat,
        },
        unit: body.ingredient.unit ?? 'g',
      }
      const idx = custom.findIndex((item) => item.id === id)
      const next = idx === -1 ? [nextIng, ...custom] : custom.map((item) => (item.id === id ? nextIng : item))
      await prisma.kitchen.update({
        where: { id: kitchen.id },
        data: { ingredientsJson: JSON.stringify(next) },
      })
      break
    }
    case 'saveRecipe': {
      const kitchen = household.kitchen!
      const custom = parseRecipes(kitchen.recipesJson)
      const overrides = parseOverrides(kitchen.overridesJson)
      const id = body.recipe.id ?? `${USER_RECIPE_PREFIX}${Date.now().toString(36)}`
      const recipe: Recipe = {
        ...body.recipe,
        id,
        name: body.recipe.name.trim() || 'Untitled recipe',
        nameEs: (body.recipe.nameEs || body.recipe.name).trim() || 'Untitled recipe',
        servings: Math.max(1, body.recipe.servings || 4),
        ingredients: body.recipe.ingredients.filter((line) => line.ingredientId && line.grams > 0),
        steps: (body.recipe.steps ?? []).map((step) => step.trim()).filter(Boolean),
      }
      if (isUserRecipe(id) || custom.some((item) => item.id === id)) {
        const idx = custom.findIndex((item) => item.id === id)
        const next = idx === -1 ? [recipe, ...custom] : custom.map((item) => (item.id === id ? recipe : item))
        await prisma.kitchen.update({
          where: { id: kitchen.id },
          data: { recipesJson: JSON.stringify(next) },
        })
      } else {
        await prisma.kitchen.update({
          where: { id: kitchen.id },
          data: { overridesJson: JSON.stringify({ ...overrides, [id]: recipe }) },
        })
      }
      break
    }
    case 'deleteRecipe': {
      const kitchen = household.kitchen!
      if (isUserRecipe(body.id)) {
        const custom = parseRecipes(kitchen.recipesJson).filter((row) => row.id !== body.id)
        await prisma.kitchen.update({
          where: { id: kitchen.id },
          data: { recipesJson: JSON.stringify(custom) },
        })
      } else {
        const overrides = parseOverrides(kitchen.overridesJson)
        delete overrides[body.id]
        await prisma.kitchen.update({
          where: { id: kitchen.id },
          data: { overridesJson: JSON.stringify(overrides) },
        })
      }
      break
    }
    case 'resetRecipe': {
      const kitchen = household.kitchen!
      const overrides = parseOverrides(kitchen.overridesJson)
      delete overrides[body.id]
      await prisma.kitchen.update({
        where: { id: kitchen.id },
        data: { overridesJson: JSON.stringify(overrides) },
      })
      break
    }
    case 'importLegacy': {
      if (!mine.planJson && body.plan) {
        await prisma.member.update({
          where: { id: mine.id },
          data: { planJson: JSON.stringify(body.plan), name: body.plan.input.name || mine.name },
        })
      }
      if ((mine.entries.length === 0 || !mine.entries.length) && body.entries?.length) {
        for (const entry of body.entries) {
          if (!entry || typeof entry !== 'object') continue
          const rec = entry as Partial<FoodEntry>
          if (typeof rec.date !== 'string' || typeof rec.name !== 'string') continue
          await prisma.foodEntry.create({
            data: {
              memberId: mine.id,
              date: rec.date,
              meal: MEALS.includes(rec.meal as MealType) ? (rec.meal as MealType) : 'Snack',
              name: rec.name,
              detail: rec.detail,
              kcal: Number(rec.kcal) || 0,
              protein: Number(rec.protein) || 0,
              carbs: Number(rec.carbs) || 0,
              fat: Number(rec.fat) || 0,
              recipeId: rec.recipeId,
              servings: rec.servings,
            },
          })
        }
      }
      if (body.water) {
        for (const [date, glasses] of Object.entries(body.water)) {
          if (!Number.isFinite(glasses) || glasses <= 0) continue
          await prisma.waterLog.upsert({
            where: { memberId_date: { memberId: mine.id, date } },
            create: { memberId: mine.id, date, glasses },
            update: { glasses },
          })
        }
      }
      const kitchen = household.kitchen!
      if (kitchen.inventory.length === 0 && body.inventory?.length) {
        for (const item of body.inventory) {
          if (!item || typeof item !== 'object') continue
          const rec = item as Partial<InventoryItem>
          if (typeof rec.ingredientId !== 'string') continue
          await prisma.inventoryItem.create({
            data: {
              kitchenId: kitchen.id,
              ingredientId: rec.ingredientId,
              grams: clampGrams(Number(rec.grams) || 0),
              boughtOn: clampBoughtOn(typeof rec.boughtOn === 'string' ? rec.boughtOn : todayKey()),
            },
          })
        }
      }
      if (kitchen.purchases.length === 0 && body.purchaseList?.length) {
        for (const item of body.purchaseList) {
          if (!item || typeof item !== 'object') continue
          const rec = item as Partial<PurchaseItem>
          if (typeof rec.ingredientId !== 'string') continue
          await prisma.purchaseItem.create({
            data: {
              kitchenId: kitchen.id,
              ingredientId: rec.ingredientId,
              grams: clampGrams(Number(rec.grams) || 0),
            },
          })
        }
      }
      if (body.customRecipes?.length || body.recipeOverrides) {
        await prisma.kitchen.update({
          where: { id: kitchen.id },
          data: {
            recipesJson: JSON.stringify(parseCustomRecipes(body.customRecipes)),
            overridesJson: JSON.stringify(parseRecipeOverrides(body.recipeOverrides)),
          },
        })
      }
      break
    }
  }

  return loadWorkspace(userId)
}
