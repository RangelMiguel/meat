import type { Ingredient, IngredientCategory, MacrosPer100g } from '../data/types'
import { getIngredient } from '../data/catalog'

export const SNACK_INGREDIENT_PREFIX = 'snack-'

const CATEGORIES: IngredientCategory[] = [
  'meat',
  'poultry',
  'seafood',
  'dairy',
  'egg',
  'grain',
  'legume',
  'vegetable',
  'fruit',
  'chile',
  'herb-spice',
  'oil-fat',
  'nut-seed',
  'sweetener',
  'beverage',
  'other',
]

export function isSnackIngredient(id: string): boolean {
  return id.startsWith(SNACK_INGREDIENT_PREFIX)
}

export function snackIngredientId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${SNACK_INGREDIENT_PREFIX}${slug || Date.now().toString(36)}`
}

export function parseCustomIngredients(raw: unknown): Ingredient[] {
  if (!Array.isArray(raw)) return []
  return raw.map(parseCustomIngredient).filter((item): item is Ingredient => item !== null)
}

export function parseCustomIngredient(raw: unknown): Ingredient | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Partial<Ingredient> & { per100g?: Partial<MacrosPer100g> }
  if (typeof rec.id !== 'string' || typeof rec.name !== 'string') return null
  const per = rec.per100g
  const kcal = Number(per?.kcal)
  if (!Number.isFinite(kcal) || kcal < 0) return null
  const category = CATEGORIES.includes(rec.category as IngredientCategory)
    ? (rec.category as IngredientCategory)
    : 'other'
  return {
    id: rec.id,
    name: rec.name.trim() || rec.id,
    nameEs: (rec.nameEs || rec.name).trim() || rec.name,
    category,
    per100g: {
      kcal: Math.round(kcal * 10) / 10,
      protein: Math.max(0, Number(per?.protein) || 0),
      carbs: Math.max(0, Number(per?.carbs) || 0),
      fat: Math.max(0, Number(per?.fat) || 0),
    },
    unit: rec.unit === 'ml' ? 'ml' : 'g',
    density: rec.density,
    form: rec.form,
  }
}

export function findIngredient(id: string, custom: Ingredient[] = []): Ingredient | undefined {
  return getIngredient(id) ?? custom.find((item) => item.id === id)
}

export function macrosForCustomAmount(ingredient: Ingredient, amount: number): MacrosPer100g {
  const grams = ingredient.unit === 'ml' ? amount * (ingredient.density || 1) : amount
  const f = grams / 100
  return {
    kcal: Math.round(ingredient.per100g.kcal * f * 10) / 10,
    protein: Math.round(ingredient.per100g.protein * f * 10) / 10,
    carbs: Math.round(ingredient.per100g.carbs * f * 10) / 10,
    fat: Math.round(ingredient.per100g.fat * f * 10) / 10,
  }
}

export function per100gFromServing(serving: MacrosPer100g, grams: number): MacrosPer100g {
  const g = grams > 0 ? grams : 100
  const f = 100 / g
  return {
    kcal: Math.round(serving.kcal * f * 10) / 10,
    protein: Math.round(serving.protein * f * 10) / 10,
    carbs: Math.round(serving.carbs * f * 10) / 10,
    fat: Math.round(serving.fat * f * 10) / 10,
  }
}
