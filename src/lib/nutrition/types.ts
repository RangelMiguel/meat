export type NutritionSource = 'openfoodfacts' | 'ai' | 'cache'

export type MacroSet = {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type ExtraNutrients = {
  sugars?: number
  fiber?: number
  salt?: number
  saturatedFat?: number
  sodiumMg?: number
}

export type NutritionHit = {
  name: string
  nameEs?: string
  brand?: string
  barcode?: string
  servingLabel?: string
  quantity?: string
  countries?: string
  url?: string
  nutriscore?: string
  serving: MacroSet
  per100g?: MacroSet
  pack?: MacroSet & { label: string }
  extras100g?: ExtraNutrients
  extrasServing?: ExtraNutrients
  source: NutritionSource
  estimated?: boolean
}

export type NutritionLookupInput = {
  barcode?: string
  query?: string
}
