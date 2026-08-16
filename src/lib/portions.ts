import {
  getIngredient,
  ingredientUnit,
  macrosForAmount,
  type MacrosPer100g,
  type Recipe,
} from '../data/catalog'
import { clampGrams, type MeasureUnit } from './calories'
import { mealLabel, t, type Locale } from '../i18n'
import type { InventoryItem, MealType } from '../types'

/** Share of daily calories allocated to each meal slot. */
export const MEAL_SHARE: Record<MealType, number> = {
  Breakfast: 0.25,
  Lunch: 0.35,
  Dinner: 0.3,
  Snack: 0.1,
}

export function emptyMacros(): MacrosPer100g {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 }
}

export function addMacros(a: MacrosPer100g, b: MacrosPer100g): MacrosPer100g {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  }
}

export function scaleMacros(m: MacrosPer100g, factor: number): MacrosPer100g {
  return {
    kcal: Math.round(m.kcal * factor),
    protein: Math.round(m.protein * factor * 10) / 10,
    carbs: Math.round(m.carbs * factor * 10) / 10,
    fat: Math.round(m.fat * factor * 10) / 10,
  }
}

/** Full-recipe (all listed grams) macros from the ingredient catalog. */
export function recipeBatchMacros(recipe: Recipe): MacrosPer100g {
  return recipe.ingredients.reduce((acc, line) => {
    return addMacros(acc, macrosForAmount(line.ingredientId, line.grams))
  }, emptyMacros())
}

/** Macros for one nominal serving of the recipe. */
export function recipePerServingMacros(recipe: Recipe): MacrosPer100g {
  const batch = recipeBatchMacros(recipe)
  const servings = Math.max(1, recipe.servings)
  return {
    kcal: batch.kcal / servings,
    protein: batch.protein / servings,
    carbs: batch.carbs / servings,
    fat: batch.fat / servings,
  }
}

export function roundServings(n: number): number {
  // nearest quarter serving, min 0.25
  return Math.max(0.25, Math.round(n * 4) / 4)
}

export interface PortionSuggestion {
  /** How many servings of the recipe to eat */
  servings: number
  /** Expected kcal for that portion */
  targetKcal: number
  /** Remaining daily kcal before this meal */
  remainingDay: number
  /** Remaining budget for the selected meal slot */
  remainingMeal: number
  /** Meal slot calorie allowance for the day */
  mealBudget: number
  /** True if user is already at/over daily goal */
  overBudget: boolean
  explanation: string
}

/**
 * Suggest a recipe portion that fits the user's plan:
 * prefer the remaining budget for the chosen meal, capped by remaining daily calories.
 */
export function suggestPortion(opts: {
  perServingKcal: number
  dailyGoal: number
  eatenToday: number
  meal: MealType
  mealEaten: number
  locale?: Locale
}): PortionSuggestion {
  const { perServingKcal, dailyGoal, eatenToday, meal, mealEaten, locale = 'en' } = opts
  const share = MEAL_SHARE[meal]
  const mealBudget = Math.round(dailyGoal * share)
  const remainingDay = Math.max(0, dailyGoal - eatenToday)
  const remainingMeal = Math.max(0, mealBudget - mealEaten)
  const overBudget = eatenToday >= dailyGoal

  if (perServingKcal <= 0) {
    return {
      servings: 1,
      targetKcal: 0,
      remainingDay,
      remainingMeal,
      mealBudget,
      overBudget,
      explanation: t(locale, 'noCalorieData'),
    }
  }

  if (overBudget || remainingDay < 50) {
    const servings = 0.25
    return {
      servings,
      targetKcal: Math.round(perServingKcal * servings),
      remainingDay,
      remainingMeal,
      mealBudget,
      overBudget: true,
      explanation: t(locale, 'overGoalExplain'),
    }
  }

  // Aim for remaining meal budget, never more than remaining day.
  // Leave a small buffer (~5%) so later meals still have room when this is an early meal.
  let target = Math.min(remainingMeal, remainingDay)
  if (target < 80 && remainingDay >= 80) {
    // Meal slot full-ish but day has room: allow up to half a meal budget from remaining day
    target = Math.min(remainingDay, Math.max(mealBudget * 0.5, 80))
  }

  // Soft buffer so one meal doesn’t consume the entire day when others are empty
  if (eatenToday < dailyGoal * 0.15 && meal !== 'Dinner') {
    target = Math.min(target, mealBudget)
  }

  let servings = target / perServingKcal
  servings = roundServings(servings)
  servings = Math.min(3, servings)

  const targetKcal = Math.round(perServingKcal * servings)
  const mealName = mealLabel(locale, meal).toLowerCase()
  const explanation =
    remainingMeal > 0
      ? t(locale, 'scaledExplain', {
          pct: Math.round(share * 100),
          meal: mealName,
          budget: mealBudget,
          left: remainingDay,
        })
      : t(locale, 'slotFullExplain', { meal: mealName, left: remainingDay })

  return {
    servings,
    targetKcal,
    remainingDay,
    remainingMeal,
    mealBudget,
    overBudget: false,
    explanation,
  }
}

export function formatMacrosLine(m: MacrosPer100g): string {
  return `${Math.round(m.kcal)} kcal · P${Math.round(m.protein)} C${Math.round(m.carbs)} F${Math.round(m.fat)}`
}

export interface IngredientNeed {
  ingredientId: string
  name: string
  unit: MeasureUnit
  needGrams: number
  haveGrams: number
  shortfallGrams: number
}

/** How much of each ingredient a portion uses (recipe batch scaled to servings). */
export function recipeNeedsForServings(
  recipe: Recipe,
  servings: number,
): { ingredientId: string; grams: number }[] {
  const factor = servings / Math.max(1, recipe.servings)
  return recipe.ingredients.map((line) => ({
    ingredientId: line.ingredientId,
    grams: clampGrams(line.grams * factor),
  }))
}

export function compareRecipeToInventory(
  recipe: Recipe,
  servings: number,
  gramsOnHand: (ingredientId: string) => number,
): IngredientNeed[] {
  return recipeNeedsForServings(recipe, servings).map((need) => {
    const have = gramsOnHand(need.ingredientId)
    const ingredient = getIngredient(need.ingredientId)
    return {
      ingredientId: need.ingredientId,
      name: ingredient?.name ?? need.ingredientId,
      unit: ingredientUnit(need.ingredientId),
      needGrams: need.grams,
      haveGrams: have,
      shortfallGrams: clampGrams(Math.max(0, need.grams - have)),
    }
  })
}

export function canMakeServings(
  recipe: Recipe,
  servings: number,
  gramsOnHand: (ingredientId: string) => number,
): boolean {
  return compareRecipeToInventory(recipe, servings, gramsOnHand).every(
    (need) => need.shortfallGrams <= 0,
  )
}

/** Subtract needs from oldest lots first. Returns null if any ingredient falls short. */
export function consumeInventoryLots(
  inventory: InventoryItem[],
  needs: { ingredientId: string; grams: number }[],
): InventoryItem[] | null {
  const next = inventory.map((item) => ({ ...item }))
  for (const need of needs) {
    let remaining = clampGrams(need.grams)
    const lots = next
      .filter((item) => item.ingredientId === need.ingredientId)
      .sort((a, b) => {
        const byDate = a.boughtOn.localeCompare(b.boughtOn)
        if (byDate !== 0) return byDate
        return a.createdAt.localeCompare(b.createdAt)
      })
    for (const lot of lots) {
      if (remaining <= 0) break
      const take = Math.min(lot.grams, remaining)
      lot.grams = clampGrams(lot.grams - take)
      remaining = clampGrams(remaining - take)
    }
    if (remaining > 0.05) return null
  }
  return next.filter((item) => item.grams > 0)
}

export function formatServings(n: number, locale: Locale = 'en'): string {
  if (n === 1) return t(locale, 'serving1')
  if (n === 0.25) return t(locale, 'servingQuarter')
  if (n === 0.5) return t(locale, 'servingHalf')
  if (n === 0.75) return t(locale, 'serving3q')
  return t(locale, 'servingN', { n })
}
