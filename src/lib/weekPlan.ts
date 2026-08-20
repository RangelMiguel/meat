import { getIngredient, ingredientUnit, type Ingredient, type Recipe } from '../data/catalog'
import type { IngredientCategory } from '../data/types'
import { mealLabel, t, type Locale } from '../i18n'
import {
  clampGrams,
  formatAmount,
  todayKey,
  uid,
  type MeasureUnit,
} from './calories'
import { recipeNeedsForServings, recipePerServingMacros, suggestPortion } from './portions'
import type { MealType, PurchaseItem, WeekMealSlot, WeekPlan } from '../types'

const MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const PANTRY_PRODUCE = new Set([
  'white-onion',
  'red-onion',
  'garlic',
  'potato',
  'ginger',
])

const DRIED_CHILES = new Set([
  'guajillo',
  'ancho',
  'pasilla',
  'chipotle',
  'chile-de-arbol',
  'morita',
  'cascabel',
])

const PANTRY_PACKAGED = new Set([
  'canned-tuna',
  'canned-clams',
  'evaporated-milk',
  'condensed-milk',
  'tomato-paste',
  'crushed-tomato',
])

const FRIDGE_FATS = new Set(['butter'])

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(dateKey: string, days: number): string {
  const dt = parseDateKey(dateKey)
  dt.setDate(dt.getDate() + days)
  return todayKey(dt)
}

export function mondayOf(dateKey: string): string {
  const dt = parseDateKey(dateKey)
  const day = dt.getDay()
  const offset = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + offset)
  return todayKey(dt)
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey)
  const to = parseDateKey(toKey)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

export function emptyWeekPlan(): WeekPlan {
  return { slots: [] }
}

export function parseWeekPlan(raw: unknown): WeekPlan {
  if (!raw || typeof raw !== 'object') return emptyWeekPlan()
  const rec = raw as { slots?: unknown }
  if (!Array.isArray(rec.slots)) return emptyWeekPlan()
  const slots: WeekMealSlot[] = []
  for (const item of rec.slots) {
    if (!item || typeof item !== 'object') continue
    const slot = item as Partial<WeekMealSlot>
    if (
      typeof slot.id !== 'string' ||
      typeof slot.date !== 'string' ||
      typeof slot.recipeId !== 'string' ||
      typeof slot.memberId !== 'string' ||
      !MEALS.includes(slot.meal as MealType)
    ) {
      continue
    }
    const servings = Number(slot.servings)
    if (!Number.isFinite(servings) || servings <= 0) continue
    slots.push({
      id: slot.id,
      date: slot.date,
      meal: slot.meal as MealType,
      recipeId: slot.recipeId,
      servings,
      memberId: slot.memberId,
    })
  }
  return { slots }
}

export function slotsInWeek(slots: WeekMealSlot[], weekStart: string): WeekMealSlot[] {
  const end = addDays(weekStart, 6)
  return slots.filter((slot) => slot.date >= weekStart && slot.date <= end)
}

/** Meals still ahead in this week (or the whole week if it starts in the future). */
export function upcomingSlots(
  slots: WeekMealSlot[],
  weekStart: string,
  today: string,
): WeekMealSlot[] {
  const start = today > weekStart ? today : weekStart
  const end = addDays(weekStart, 6)
  return slots.filter((slot) => slot.date >= start && slot.date <= end)
}

/** Breakfast / lunch / dinner — snacks stay optional so a random week is easy to edit. */
export const RANDOM_WEEK_MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner']

const MEAL_CATEGORIES: Record<MealType, string[]> = {
  Breakfast: ['desayuno'],
  Lunch: ['plato-fuerte', 'sopa', 'mariscos'],
  Dinner: ['plato-fuerte', 'sopa', 'mariscos'],
  Snack: ['antojito', 'postre'],
}

function pickRecipe(recipes: Recipe[], meal: MealType, recentIds: Set<string>): Recipe | undefined {
  const preferred = recipes.filter((recipe) => MEAL_CATEGORIES[meal].includes(recipe.category))
  const fallback = recipes.filter(
    (recipe) => recipe.category !== 'salsa-side' && recipe.category !== 'bebida',
  )
  const pool = preferred.length ? preferred : fallback
  if (!pool.length) return undefined
  const fresh = pool.filter((recipe) => !recentIds.has(recipe.id))
  const list = fresh.length ? fresh : pool
  return list[Math.floor(Math.random() * list.length)]
}

/** Fill Mon–Sun meal slots from the catalog. Portions follow the calorie plan, not today’s log. */
export function buildRandomWeekPlan(opts: {
  weekStart: string
  memberId: string
  dailyCalories: number
  recipes: Recipe[]
  meals?: MealType[]
}): WeekMealSlot[] {
  const meals = opts.meals ?? RANDOM_WEEK_MEALS
  const days = weekDates(opts.weekStart)
  const slots: WeekMealSlot[] = []
  const recent: string[] = []
  for (const date of days) {
    for (const meal of meals) {
      const recipe = pickRecipe(opts.recipes, meal, new Set(recent.slice(-6)))
      if (!recipe) continue
      const per = recipePerServingMacros(recipe)
      const suggestion = suggestPortion({
        perServingKcal: per.kcal,
        dailyGoal: opts.dailyCalories,
        eatenToday: 0,
        meal,
        mealEaten: 0,
      })
      slots.push({
        id: uid(),
        date,
        meal,
        recipeId: recipe.id,
        servings: suggestion.servings,
        memberId: opts.memberId,
      })
      recent.push(recipe.id)
    }
  }
  return slots
}

export type StoragePlace = 'fridge' | 'freezer' | 'pantry'

export type IngredientStorageKind = 'protein' | 'seafood' | 'fridge' | 'pantry'

export function ingredientStorageKind(ingredient: Ingredient): IngredientStorageKind {
  if (PANTRY_PACKAGED.has(ingredient.id) || DRIED_CHILES.has(ingredient.id)) return 'pantry'
  if (FRIDGE_FATS.has(ingredient.id)) return 'fridge'
  if (PANTRY_PRODUCE.has(ingredient.id)) return 'pantry'
  if (ingredient.category === 'seafood') return 'seafood'
  if (ingredient.category === 'meat' || ingredient.category === 'poultry') return 'protein'
  const fridgeCats: IngredientCategory[] = ['dairy', 'egg', 'vegetable', 'fruit', 'chile']
  if (fridgeCats.includes(ingredient.category)) return 'fridge'
  return 'pantry'
}

export function fridgeDaysFor(kind: IngredientStorageKind): number {
  if (kind === 'seafood') return 1
  if (kind === 'protein') return 2
  if (kind === 'fridge') return 7
  return 0
}

export interface WeekIngredientUse {
  date: string
  meal: MealType
  grams: number
  recipeId: string
  memberId: string
}

export interface FreezerBag {
  grams: number
  count: number
  uses: WeekIngredientUse[]
}

export interface IngredientStoragePlan {
  kind: IngredientStorageKind
  fridgeGrams: number
  fridgeUses: WeekIngredientUse[]
  freezerBags: FreezerBag[]
  pantryGrams: number
}

export interface WeekShopItem {
  ingredientId: string
  name: string
  unit: MeasureUnit
  needGrams: number
  haveGrams: number
  buyGrams: number
  alreadyOnListGrams: number
  addGrams: number
  uses: WeekIngredientUse[]
  storage: IngredientStoragePlan
}

function groupFreezerBags(uses: WeekIngredientUse[]): FreezerBag[] {
  const groups = new Map<number, WeekIngredientUse[]>()
  for (const use of uses) {
    const grams = clampGrams(use.grams)
    if (grams <= 0) continue
    const list = groups.get(grams) ?? []
    list.push(use)
    groups.set(grams, list)
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([grams, bagUses]) => ({ grams, count: bagUses.length, uses: bagUses }))
}

export function planIngredientStorage(
  uses: WeekIngredientUse[],
  kind: IngredientStorageKind,
  shopDate: string,
): IngredientStoragePlan {
  const total = clampGrams(uses.reduce((sum, use) => sum + use.grams, 0))
  if (kind === 'pantry') {
    return { kind, fridgeGrams: 0, fridgeUses: [], freezerBags: [], pantryGrams: total }
  }
  if (kind === 'fridge') {
    return { kind, fridgeGrams: total, fridgeUses: uses, freezerBags: [], pantryGrams: 0 }
  }

  const window = fridgeDaysFor(kind)
  const fridgeUses: WeekIngredientUse[] = []
  const freezerUses: WeekIngredientUse[] = []
  for (const use of uses) {
    const daysOut = daysBetween(shopDate, use.date)
    if (daysOut < window) fridgeUses.push(use)
    else freezerUses.push(use)
  }
  return {
    kind,
    fridgeGrams: clampGrams(fridgeUses.reduce((sum, use) => sum + use.grams, 0)),
    fridgeUses,
    freezerBags: groupFreezerBags(freezerUses),
    pantryGrams: 0,
  }
}

export function buildWeekShopping(opts: {
  slots: WeekMealSlot[]
  recipesById: (id: string) => Recipe | undefined
  gramsOnHand: (ingredientId: string) => number
  purchaseList: PurchaseItem[]
  shopDate: string
}): WeekShopItem[] {
  const usesByIngredient = new Map<string, WeekIngredientUse[]>()
  for (const slot of opts.slots) {
    const recipe = opts.recipesById(slot.recipeId)
    if (!recipe) continue
    for (const need of recipeNeedsForServings(recipe, slot.servings)) {
      if (need.grams <= 0) continue
      const uses = usesByIngredient.get(need.ingredientId) ?? []
      uses.push({
        date: slot.date,
        meal: slot.meal,
        grams: need.grams,
        recipeId: slot.recipeId,
        memberId: slot.memberId,
      })
      usesByIngredient.set(need.ingredientId, uses)
    }
  }

  const onList = new Map<string, number>()
  for (const item of opts.purchaseList) {
    onList.set(item.ingredientId, (onList.get(item.ingredientId) ?? 0) + item.grams)
  }

  const items: WeekShopItem[] = []
  for (const [ingredientId, uses] of usesByIngredient) {
    const ingredient = getIngredient(ingredientId)
    const needGrams = clampGrams(uses.reduce((sum, use) => sum + use.grams, 0))
    const haveGrams = clampGrams(opts.gramsOnHand(ingredientId))
    const buyGrams = clampGrams(Math.max(0, needGrams - haveGrams))
    const alreadyOnListGrams = clampGrams(onList.get(ingredientId) ?? 0)
    const addGrams = clampGrams(Math.max(0, buyGrams - alreadyOnListGrams))
    const kind = ingredient ? ingredientStorageKind(ingredient) : 'pantry'
    items.push({
      ingredientId,
      name: ingredient?.name ?? ingredientId,
      unit: ingredientUnit(ingredientId),
      needGrams,
      haveGrams,
      buyGrams,
      alreadyOnListGrams,
      addGrams,
      uses: uses.sort((a, b) => a.date.localeCompare(b.date) || MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal)),
      storage: planIngredientStorage(uses, kind, opts.shopDate),
    })
  }

  return items.sort((a, b) => {
    const rank = (item: WeekShopItem) => {
      if (item.storage.kind === 'protein' || item.storage.kind === 'seafood') return 0
      if (item.storage.kind === 'fridge') return 1
      return 2
    }
    const byKind = rank(a) - rank(b)
    if (byKind !== 0) return byKind
    return a.name.localeCompare(b.name)
  })
}

export function formatUseWhen(uses: WeekIngredientUse[], locale: Locale): string {
  return uses
    .map((use) => {
      const [y, m, d] = use.date.split('-').map(Number)
      const weekday = new Date(y, m - 1, d).toLocaleDateString(locale === 'es' ? 'es' : 'en-US', {
        weekday: 'long',
      })
      return `${weekday} ${mealLabel(locale, use.meal).toLowerCase()}`
    })
    .join(t(locale, 'storeWhenSep'))
}

export function storageLines(item: WeekShopItem, locale: Locale): string[] {
  const { storage, unit } = item
  const lines: string[] = []

  if (storage.kind === 'pantry') {
    if (storage.pantryGrams > 0) {
      lines.push(t(locale, 'storePantry', { amount: formatAmount(storage.pantryGrams, unit) }))
    }
    return lines
  }

  if (storage.kind === 'fridge' || (storage.fridgeGrams > 0 && storage.freezerBags.length === 0)) {
    if (storage.fridgeGrams > 0) {
      const when = formatUseWhen(storage.fridgeUses, locale)
      lines.push(
        when
          ? t(locale, 'storeFridgeWhen', {
              amount: formatAmount(storage.fridgeGrams, unit),
              when,
            })
          : t(locale, 'storeFridgeAll', { amount: formatAmount(storage.fridgeGrams, unit) }),
      )
    }
    return lines
  }

  if (storage.fridgeGrams > 0) {
    lines.push(
      t(locale, 'storeFridgeWhen', {
        amount: formatAmount(storage.fridgeGrams, unit),
        when: formatUseWhen(storage.fridgeUses, locale),
      }),
    )
  }

  if (storage.freezerBags.length === 1 && storage.freezerBags[0].count === 1) {
    const bag = storage.freezerBags[0]
    lines.push(
      t(locale, 'storeFreezerOne', {
        amount: formatAmount(bag.grams, unit),
        when: formatUseWhen(bag.uses, locale),
      }),
    )
    return lines
  }

  if (storage.freezerBags.length === 1) {
    const bag = storage.freezerBags[0]
    lines.push(
      t(locale, 'storeFreezerSame', {
        total: formatAmount(bag.grams * bag.count, unit),
        count: bag.count,
        each: formatAmount(bag.grams, unit),
        when: formatUseWhen(bag.uses, locale),
      }),
    )
    return lines
  }

  if (storage.freezerBags.length > 1) {
    const bags = storage.freezerBags
      .map((bag) =>
        bag.count === 1
          ? t(locale, 'storeBagOnce', {
              amount: formatAmount(bag.grams, unit),
              when: formatUseWhen(bag.uses, locale),
            })
          : t(locale, 'storeBagMany', {
              count: bag.count,
              each: formatAmount(bag.grams, unit),
              when: formatUseWhen(bag.uses, locale),
            }),
      )
      .join(t(locale, 'storeWhenSep'))
    const total = storage.freezerBags.reduce((sum, bag) => sum + bag.grams * bag.count, 0)
    lines.push(
      t(locale, 'storeFreezerMixed', {
        total: formatAmount(total, unit),
        bags,
      }),
    )
  }

  return lines
}

export function weekdayLong(dateKey: string, locale: Locale): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale === 'es' ? 'es' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function weekRangeLabel(weekStart: string, locale: Locale): string {
  const end = addDays(weekStart, 6)
  const fmt = (key: string) => {
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(locale === 'es' ? 'es' : 'en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
  return `${fmt(weekStart)} – ${fmt(end)}`
}
