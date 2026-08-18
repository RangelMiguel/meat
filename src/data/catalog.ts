import {
  getIngredient,
  INGREDIENTS,
  ingredientDensity,
  ingredientUnit,
  requireIngredient,
} from './ingredients'
import { getRecipe, recipeCount, RECIPES } from './recipes'
import type { Cuisine, Ingredient, MacrosPer100g, Recipe, RecipeIngredient } from './types'
import { CUISINE_OPTIONS, cuisineLabel, recipeCuisine } from './types'

export type { Cuisine, Ingredient, MacrosPer100g, Recipe, RecipeIngredient }
export {
  CUISINE_OPTIONS,
  cuisineLabel,
  getIngredient,
  getRecipe,
  INGREDIENTS,
  ingredientDensity,
  ingredientUnit,
  recipeCount,
  recipeCuisine,
  RECIPES,
  requireIngredient,
}

export interface ResolvedIngredientLine {
  line: RecipeIngredient
  ingredient: Ingredient
  /** Macros for this line’s grams only (amount × per100g). Available for later use — not rolled into a recipe total in the UI yet. */
  lineMacros: MacrosPer100g
}

/** Scale per-100g macros to a gram amount. */
export function macrosForGrams(per100g: MacrosPer100g, grams: number): MacrosPer100g {
  const f = grams / 100
  return {
    kcal: Math.round(per100g.kcal * f * 10) / 10,
    protein: Math.round(per100g.protein * f * 10) / 10,
    carbs: Math.round(per100g.carbs * f * 10) / 10,
    fat: Math.round(per100g.fat * f * 10) / 10,
  }
}

/** Convert a listed amount (g or ml) to mass in grams using density for liquids. */
export function amountToGrams(ingredientId: string, amount: number): number {
  if (ingredientUnit(ingredientId) !== 'ml') return amount
  return Math.round(amount * ingredientDensity(ingredientId) * 10) / 10
}

/** Convert mass in grams to the ingredient’s display unit. */
export function gramsToAmount(ingredientId: string, grams: number): number {
  if (ingredientUnit(ingredientId) !== 'ml') return grams
  return Math.round((grams / ingredientDensity(ingredientId)) * 10) / 10
}

export function macrosForAmount(ingredientId: string, amount: number): MacrosPer100g {
  const ingredient = requireIngredient(ingredientId)
  return macrosForGrams(ingredient.per100g, amountToGrams(ingredientId, amount))
}

function compactNumber(n: number): string {
  return String(Math.round(n * 10) / 10)
}

/** Cooking display: liquids as `87ml (80g)`, solids as `400g`. */
export function formatCookAmount(ingredientId: string, amount: number): string {
  const n = Math.round(amount * 10) / 10
  if (ingredientUnit(ingredientId) === 'ml') {
    const grams = amountToGrams(ingredientId, n)
    return `${compactNumber(n)}ml (${compactNumber(grams)}g)`
  }
  return `${compactNumber(n)}g`
}

/** Resolve a recipe’s ingredient list with full ingredient records + line macros. Does not sum a recipe total. */
export function resolveRecipeIngredients(
  recipe: Recipe,
  extras: Ingredient[] = [],
): ResolvedIngredientLine[] {
  return recipe.ingredients.map((line) => {
    const ingredient =
      getIngredient(line.ingredientId) ??
      extras.find((item) => item.id === line.ingredientId) ??
      placeholderIngredient(line.ingredientId)
    const lineMacros = getIngredient(line.ingredientId)
      ? macrosForAmount(line.ingredientId, line.grams)
      : macrosForGrams(ingredient.per100g, line.grams)
    return { line, ingredient, lineMacros }
  })
}

function placeholderIngredient(id: string): Ingredient {
  return {
    id,
    name: id,
    nameEs: id,
    category: 'other',
    per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  }
}

/** Validate every recipe ingredient id exists. Throws if broken. */
export function assertCatalogIntegrity(): void {
  for (const recipe of RECIPES) {
    for (const line of recipe.ingredients) {
      if (!getIngredient(line.ingredientId)) {
        throw new Error(`Recipe "${recipe.id}" references missing ingredient "${line.ingredientId}"`)
      }
    }
  }
}
