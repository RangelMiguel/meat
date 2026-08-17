import { getIngredient } from '../data/catalog'
import type { Recipe } from '../data/types'
import { ingredientName, mealLabel, recipeName, type Locale } from '../i18n'
import { formatAmount } from './calories'
import { ingredientUnit } from '../data/ingredients'
import { recipeNeedsForServings } from './portions'
import type { FoodEntry, MealType } from '../types'

export type CalorieCheckInput = {
  name: string
  detail?: string
  meal?: MealType
  servings?: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  recipe?: Recipe | null
}

function formatIngredientLine(recipe: Recipe, servings: number, locale: Locale): string[] {
  const factorServings = servings > 0 ? servings : 1
  return recipeNeedsForServings(recipe, factorServings).map((need) => {
    const ingredient = getIngredient(need.ingredientId)
    const label = ingredient
      ? ingredientName(ingredient, locale)
      : need.ingredientId
    const amount = formatAmount(need.grams, ingredientUnit(need.ingredientId))
    const note = recipe.ingredients.find((line) => line.ingredientId === need.ingredientId)?.note
    return note ? `- ${label}: ${amount} (${note})` : `- ${label}: ${amount}`
  })
}

/** Ready-to-paste Gemini prompt asking whether a logged meal's calories look right. */
export function buildCalorieCheckPrompt(input: CalorieCheckInput, locale: Locale): string {
  const dish = input.recipe ? recipeName(input.recipe, locale) : input.name
  const meal = input.meal ? mealLabel(locale, input.meal) : ''
  const macros = `${Math.round(input.kcal)} kcal · P ${round1(input.protein)} g · C ${round1(input.carbs)} g · F ${round1(input.fat)} g`
  const ingredientLines =
    input.recipe && (input.servings ?? 1) > 0
      ? formatIngredientLine(input.recipe, input.servings ?? 1, locale)
      : []

  if (locale === 'es') {
    const parts = [
      'Eres un revisor de un registro casero de calorías. Dime si estas calorías y macros se ven razonables para lo que comí. Si se ven mal, dame una mejor estimación y una razón corta. Sé conciso.',
      '',
      `Comida: ${dish}`,
      input.detail ? `Notas / porción: ${input.detail}` : null,
      input.servings != null ? `Porciones registradas: ${input.servings}` : null,
      meal ? `Tiempo: ${meal}` : null,
      `Valores que registré: ${macros}`,
    ]
    if (ingredientLines.length) {
      parts.push('', 'Ingredientes de esta porción (cantidades del recetario, carne en crudo):', ...ingredientLines)
    }
    parts.push(
      '',
      'Responde con:',
      '1. Veredicto: se ve bien / un poco alto / un poco bajo / muy desviado',
      '2. Tu estimación (kcal y P/C/G)',
      '3. Por qué (1-2 frases)',
    )
    return parts.filter((line) => line !== null).join('\n')
  }

  const parts = [
    'You are checking a home calorie log. Tell me if these calories and macros look reasonable for what I ate. If they seem off, give a better estimate and a short reason. Be concise.',
    '',
    `Food: ${dish}`,
    input.detail ? `Notes / serving: ${input.detail}` : null,
    input.servings != null ? `Logged servings: ${input.servings}` : null,
    meal ? `Meal: ${meal}` : null,
    `Values I logged: ${macros}`,
  ]
  if (ingredientLines.length) {
    parts.push('', 'Ingredients in this portion (catalog amounts; meat is raw weight):', ...ingredientLines)
  }
  parts.push(
    '',
    'Reply with:',
    '1. Verdict: looks right / a bit high / a bit low / way off',
    '2. Your estimate (kcal and P/C/F)',
    '3. Why (1–2 sentences)',
  )
  return parts.filter((line) => line !== null).join('\n')
}

export function checkInputFromEntry(
  entry: Pick<FoodEntry, 'name' | 'detail' | 'meal' | 'servings' | 'kcal' | 'protein' | 'carbs' | 'fat'>,
  recipe?: Recipe | null,
): CalorieCheckInput {
  return {
    name: entry.name,
    detail: entry.detail,
    meal: entry.meal,
    servings: entry.servings,
    kcal: entry.kcal,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    recipe: recipe ?? null,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export async function copyCalorieCheckPrompt(
  input: CalorieCheckInput,
  locale: Locale,
): Promise<boolean> {
  const text = buildCalorieCheckPrompt(input, locale)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
