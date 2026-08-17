import { defaultLocale, type Locale } from '../i18n'
import { clampGrams } from './calories'
import { defaultTheme, normalizeThemeId, type ThemeId } from '../themes'
import { parseCustomRecipes, parseRecipeOverrides } from './recipeLibrary'
import { emptyWeekPlan, parseWeekPlan } from './weekPlan'
import type {
  Account,
  AppState,
  CaloriePlan,
  ExerciseEntry,
  ExerciseKind,
  Family,
  FoodEntry,
  InventoryItem,
  Kitchen,
  LegacyWorkspace,
  Member,
  PurchaseItem,
} from '../types'

const KEY = 'meat-app-v2'
const LEGACY_KEY = 'meat-app-v1'

const emptyState = (): AppState => ({
  accounts: [],
  sessionAccountId: null,
  activeMemberId: null,
  families: [],
  members: [],
  kitchens: [],
  legacy: null,
  theme: defaultTheme,
  locale: defaultLocale(),
})

function parseGrams(value: unknown): number {
  if (typeof value === 'number') return clampGrams(value)
  if (typeof value === 'string' && value.trim() !== '') return clampGrams(Number(value))
  return 0
}

function parseInventory(raw: unknown): InventoryItem[] {
  if (!Array.isArray(raw)) return []
  const out: InventoryItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Partial<InventoryItem>
    if (
      typeof rec.id !== 'string' ||
      typeof rec.ingredientId !== 'string' ||
      typeof rec.boughtOn !== 'string'
    ) {
      continue
    }
    out.push({
      id: rec.id,
      ingredientId: rec.ingredientId,
      grams: parseGrams(rec.grams),
      boughtOn: rec.boughtOn,
      createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : rec.boughtOn,
    })
  }
  return out
}

function parsePurchaseList(raw: unknown): PurchaseItem[] {
  if (!Array.isArray(raw)) return []
  const out: PurchaseItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Partial<PurchaseItem>
    if (typeof rec.id !== 'string' || typeof rec.ingredientId !== 'string') continue
    out.push({
      id: rec.id,
      ingredientId: rec.ingredientId,
      grams: parseGrams(rec.grams),
      createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : new Date().toISOString(),
    })
  }
  return out
}

function parseEntries(raw: unknown): FoodEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is FoodEntry => {
    if (!item || typeof item !== 'object') return false
    const rec = item as Partial<FoodEntry>
    return typeof rec.id === 'string' && typeof rec.date === 'string' && typeof rec.name === 'string'
  })
}

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

function parseExercises(raw: unknown): ExerciseEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const rec = item as Partial<ExerciseEntry>
    if (typeof rec.id !== 'string' || typeof rec.date !== 'string') return []
    const kind = EXERCISE_KINDS.includes(rec.kind as ExerciseKind)
      ? (rec.kind as ExerciseKind)
      : 'other'
    const minutes = Number(rec.minutes)
    const kcal = Number(rec.kcal)
    return [
      {
        id: rec.id,
        date: rec.date,
        kind,
        name: typeof rec.name === 'string' ? rec.name : kind,
        minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
        kcal: Number.isFinite(kcal) && kcal > 0 ? Math.round(kcal) : 0,
        createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : rec.date,
      },
    ]
  })
}

function parseWater(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(n) && n > 0) out[key] = n
  }
  return out
}

function parseLegacy(raw: Partial<LegacyWorkspace> | null | undefined): LegacyWorkspace | null {
  if (!raw || typeof raw !== 'object') return null
  const hasData =
    raw.plan != null ||
    (Array.isArray(raw.entries) && raw.entries.length > 0) ||
    (Array.isArray(raw.inventory) && raw.inventory.length > 0) ||
    (Array.isArray(raw.purchaseList) && raw.purchaseList.length > 0) ||
    (Array.isArray(raw.customRecipes) && raw.customRecipes.length > 0)
  if (!hasData) return null
  return {
    plan: (raw.plan as CaloriePlan | null) ?? null,
    entries: parseEntries(raw.entries),
    water: parseWater(raw.water),
    inventory: parseInventory(raw.inventory),
    purchaseList: parsePurchaseList(raw.purchaseList),
    customRecipes: parseCustomRecipes(raw.customRecipes),
    recipeOverrides: parseRecipeOverrides(raw.recipeOverrides),
  }
}

function parseAccounts(raw: unknown): Account[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const rec = item as Partial<Account>
    if (typeof rec.id !== 'string' || typeof rec.email !== 'string') {
      return []
    }
    return [
      {
        id: rec.id,
        email: rec.email,
        displayName: typeof rec.displayName === 'string' ? rec.displayName : rec.email,
        createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : new Date().toISOString(),
      },
    ]
  })
}

function parseFamilies(raw: unknown): Family[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const rec = item as Partial<Family>
    if (
      typeof rec.id !== 'string' ||
      typeof rec.name !== 'string' ||
      typeof rec.inviteCode !== 'string' ||
      typeof rec.ownerAccountId !== 'string'
    ) {
      return []
    }
    return [
      {
        id: rec.id,
        name: rec.name,
        inviteCode: rec.inviteCode,
        ownerAccountId: rec.ownerAccountId,
        createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : new Date().toISOString(),
      },
    ]
  })
}

function parseMembers(raw: unknown): Member[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const rec = item as Partial<Member>
    if (typeof rec.id !== 'string' || typeof rec.kitchenId !== 'string' || typeof rec.name !== 'string') {
      return []
    }
    return [
      {
        id: rec.id,
        accountId: typeof rec.accountId === 'string' ? rec.accountId : null,
        familyId: typeof rec.familyId === 'string' ? rec.familyId : null,
        kitchenId: rec.kitchenId,
        name: rec.name,
        plan: (rec.plan as CaloriePlan | null) ?? null,
        entries: parseEntries(rec.entries),
        exercises: parseExercises(rec.exercises),
        water: parseWater(rec.water),
      },
    ]
  })
}

function parseKitchens(raw: unknown): Kitchen[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const rec = item as Partial<Kitchen>
    if (typeof rec.id !== 'string') return []
    return [
      {
        id: rec.id,
        familyId: typeof rec.familyId === 'string' ? rec.familyId : null,
        ownerAccountId: typeof rec.ownerAccountId === 'string' ? rec.ownerAccountId : null,
        inventory: parseInventory(rec.inventory),
        purchaseList: parsePurchaseList(rec.purchaseList),
        customRecipes: parseCustomRecipes(rec.customRecipes),
        recipeOverrides: parseRecipeOverrides(rec.recipeOverrides),
        weekPlan: rec.weekPlan ? parseWeekPlan(rec.weekPlan) : emptyWeekPlan(),
      },
    ]
  })
}

function looksLikeV1(parsed: Record<string, unknown>): boolean {
  return !Array.isArray(parsed.accounts) && ('plan' in parsed || 'entries' in parsed || 'inventory' in parsed)
}

function readJson(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function loadState(): AppState {
  try {
    const v2 = readJson(KEY)
    const v1 = readJson(LEGACY_KEY)
    const parsed = v2 ?? v1
    if (!parsed) {
      const oldTheme = localStorage.getItem('meat-theme') as ThemeId | null
      const theme = normalizeThemeId(oldTheme)
      return { ...emptyState(), theme }
    }

    const theme = normalizeThemeId(parsed.theme)
    const locale: Locale =
      parsed.locale === 'es' || parsed.locale === 'en' ? parsed.locale : defaultLocale()

    if (!v2 && looksLikeV1(parsed)) {
      return {
        ...emptyState(),
        theme,
        locale,
        legacy: parseLegacy(parsed as Partial<LegacyWorkspace>),
      }
    }

    const accounts = parseAccounts(parsed.accounts)
    const sessionAccountId =
      typeof parsed.sessionAccountId === 'string' &&
      accounts.some((account) => account.id === parsed.sessionAccountId)
        ? parsed.sessionAccountId
        : null
    const members = parseMembers(parsed.members)
    const activeMemberId =
      typeof parsed.activeMemberId === 'string' &&
      members.some((member) => member.id === parsed.activeMemberId)
        ? parsed.activeMemberId
        : null

    return {
      accounts,
      sessionAccountId,
      activeMemberId,
      families: parseFamilies(parsed.families),
      members,
      kitchens: parseKitchens(parsed.kitchens),
      legacy: parseLegacy(parsed.legacy as Partial<LegacyWorkspace> | null),
      theme,
      locale,
    }
  } catch {
    return emptyState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
  localStorage.setItem('meat-theme', state.theme)
}
