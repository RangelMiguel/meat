export type NutritionSource = 'openfoodfacts' | 'ai' | 'cache'

export type MacroSet = {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type NutritionHit = {
  name: string
  brand?: string
  barcode?: string
  servingLabel?: string
  quantity?: string
  serving: MacroSet
  per100g?: MacroSet
  pack?: MacroSet & { label: string }
  source: NutritionSource
  estimated?: boolean
}

export type NutritionLookupInput = {
  barcode?: string
  query?: string
}
