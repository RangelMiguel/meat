/** Nutrition per 100 g edible portion (approx. USDA / common food tables). */
export interface MacrosPer100g {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type MeasureUnit = 'g' | 'ml'

export type IngredientCategory =
  | 'meat'
  | 'poultry'
  | 'seafood'
  | 'dairy'
  | 'egg'
  | 'grain'
  | 'legume'
  | 'vegetable'
  | 'fruit'
  | 'chile'
  | 'herb-spice'
  | 'oil-fat'
  | 'nut-seed'
  | 'sweetener'
  | 'beverage'
  | 'other'

export interface Ingredient {
  id: string
  name: string
  nameEs: string
  category: IngredientCategory
  per100g: MacrosPer100g
  /** Optional note on form (raw, cooked, drained, etc.) */
  form?: string
  /** Display/input unit. Liquids use ml; everything else is grams. */
  unit?: MeasureUnit
  /** Mass per milliliter (g/ml). Required for liquids so volume converts to nutrition mass. */
  density?: number
}

export interface RecipeIngredient {
  ingredientId: string
  /** Amount in the ingredient’s unit: grams for solids, milliliters for liquids. */
  grams: number
  note?: string
}

export type Cuisine = 'mexican' | 'american' | 'italian' | 'chinese'

export const CUISINE_OPTIONS: { id: Cuisine; label: string }[] = [
  { id: 'mexican', label: 'Mexican' },
  { id: 'american', label: 'American' },
  { id: 'italian', label: 'Italian' },
  { id: 'chinese', label: 'Chinese' },
]

export interface Recipe {
  id: string
  name: string
  nameEs: string
  /** Defaults to mexican for the original catalog. */
  cuisine?: Cuisine
  region?: string
  category: string
  /** How many servings the listed grams represent */
  servings: number
  ingredients: RecipeIngredient[]
  /** Short description of the dish */
  summary?: string
  /** Ordered preparation steps */
  steps?: string[]
}

export function recipeCuisine(recipe: Pick<Recipe, 'cuisine'>): Cuisine {
  return recipe.cuisine ?? 'mexican'
}

export function cuisineLabel(cuisine: Cuisine): string {
  return CUISINE_OPTIONS.find((c) => c.id === cuisine)?.label ?? cuisine
}
