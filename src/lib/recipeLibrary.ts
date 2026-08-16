import { RECIPES, getRecipe as getCatalogRecipe } from '../data/catalog'
import { RECIPE_STEPS } from '../data/recipeSteps'
import { RECIPE_STEPS_ES } from '../data/recipeStepsEs'
import type { Recipe } from '../data/types'
import { getIngredient } from '../data/catalog'
import type { Locale } from '../i18n'

export const USER_RECIPE_PREFIX = 'user-'

export function isUserRecipe(id: string): boolean {
  return id.startsWith(USER_RECIPE_PREFIX)
}

export function withCatalogSteps(recipe: Recipe): Recipe {
  if (recipe.steps && recipe.steps.length > 0) return recipe
  const steps = RECIPE_STEPS[recipe.id]
  return steps?.length ? { ...recipe, steps } : recipe
}

/** Catalog prep in the active language, unless the user wrote their own steps. */
export function displaySteps(recipe: Recipe, locale: Locale): string[] {
  const catalogEn = RECIPE_STEPS[recipe.id]
  const catalogEs = RECIPE_STEPS_ES[recipe.id]
  const current = recipe.steps ?? []
  const isCatalogDefault =
    Boolean(catalogEn?.length) &&
    current.length === catalogEn.length &&
    current.every((step, index) => step === catalogEn[index])
  if (isCatalogDefault || current.length === 0) {
    if (locale === 'es' && catalogEs?.length) return catalogEs
    if (catalogEn?.length) return catalogEn
  }
  return current
}

export function mergeRecipeLibrary(
  custom: Recipe[],
  overrides: Record<string, Recipe>,
): Recipe[] {
  const catalog = RECIPES.map((recipe) => {
    const base = withCatalogSteps(recipe)
    const over = overrides[recipe.id]
    if (!over) return base
    return {
      ...base,
      ...over,
      id: recipe.id,
      ingredients: over.ingredients?.length ? over.ingredients : base.ingredients,
      steps: over.steps?.length ? over.steps : base.steps,
    }
  })
  return [...catalog, ...custom]
}

export function findMergedRecipe(
  id: string,
  custom: Recipe[],
  overrides: Record<string, Recipe>,
): Recipe | undefined {
  return mergeRecipeLibrary(custom, overrides).find((recipe) => recipe.id === id)
}

export function catalogRecipe(id: string): Recipe | undefined {
  const recipe = getCatalogRecipe(id)
  return recipe ? withCatalogSteps(recipe) : undefined
}

export function parseRecipe(raw: unknown): Recipe | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Partial<Recipe>
  if (typeof rec.id !== 'string' || typeof rec.name !== 'string') return null
  if (!Array.isArray(rec.ingredients)) return null
  const ingredients = rec.ingredients.flatMap((line) => {
    if (!line || typeof line !== 'object') return []
    if (typeof line.ingredientId !== 'string' || !getIngredient(line.ingredientId)) return []
    const grams = Number(line.grams)
    if (!Number.isFinite(grams) || grams < 0) return []
    return [
      {
        ingredientId: line.ingredientId,
        grams,
        note: typeof line.note === 'string' ? line.note : undefined,
      },
    ]
  })
  const steps = Array.isArray(rec.steps)
    ? rec.steps.filter((step): step is string => typeof step === 'string' && step.trim() !== '')
    : []
  const servings = Number(rec.servings)
  return {
    id: rec.id,
    name: rec.name.trim() || 'Untitled',
    nameEs: (rec.nameEs ?? rec.name).trim() || rec.name,
    cuisine: rec.cuisine,
    region: rec.region,
    category: rec.category?.trim() || 'plato-fuerte',
    servings: Number.isFinite(servings) && servings > 0 ? servings : 4,
    ingredients,
    summary: rec.summary,
    steps,
  }
}

export function parseCustomRecipes(raw: unknown): Recipe[] {
  if (!Array.isArray(raw)) return []
  return raw.map(parseRecipe).filter((recipe): recipe is Recipe => recipe !== null)
}

export function parseRecipeOverrides(raw: unknown): Record<string, Recipe> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, Recipe> = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const recipe = parseRecipe({ ...(value as object), id })
    if (recipe) out[id] = recipe
  }
  return out
}
