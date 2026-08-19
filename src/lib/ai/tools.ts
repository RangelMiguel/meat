import { getIngredient, INGREDIENTS, macrosForAmount, RECIPES } from '../../data/catalog'
import type { Cuisine, Recipe } from '../../data/types'
import { todayKey } from '../calories'
import { prisma } from '../db'
import {
  findIngredient,
  macrosForCustomAmount,
  parseCustomIngredients,
  per100gFromServing,
  snackIngredientId,
} from '../customIngredients'
import { findMergedRecipe, mergeRecipeLibrary, parseCustomRecipes, parseRecipeOverrides } from '../recipeLibrary'
import { parseWeekPlan } from '../weekPlan'
import { isModuleInstalled } from '../modules/access'
import { formatOpenFoodFactsProduct, fetchProductByBarcode, searchOpenFoodFacts } from '../nutrition/openFoodFacts'
import { lookupNutrition } from '../nutrition/lookup'
import { mutateWorkspace } from '../workspace'
import type { ToolCallRequest, ToolExecResult, ToolSpec } from './complete'

export type MeatToolContext = {
  userId: string
}

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
const EXERCISE_KINDS = [
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
] as const
const CUISINES: Cuisine[] = ['mexican', 'american', 'italian', 'chinese']

export const MEAT_TOOLS: ToolSpec[] = [
  {
    name: 'search_ingredients',
    description: 'Search the ingredient catalog by English or Spanish name. Use this before adding a recipe or inventory item if you are not sure of the ingredient id.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' }, limit: { type: 'number' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_recipes',
    description: 'Search catalog and household recipes by name.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' }, limit: { type: 'number' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_inventory',
    description: 'List food currently on hand in the kitchen.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_shopping_list',
    description: 'List items on the purchase / shopping list.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_today_log',
    description: 'List today’s food, exercise, and water for the current user.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'search_open_food_facts',
    description:
      'Search the Open Food Facts product database for official nutrition facts (calories, protein, carbs, fat, sugars, fiber, salt) per serving, per 100g, and per package. Use this first for packaged or branded foods (chips, Gansito, Nito, Sabritas, soda, yogurt). Returns several matches — pick the closest brand and size. Does not estimate.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Product name and brand, e.g. Gansito Marinela or Fritos original' },
        barcode: { type: 'string', description: 'EAN/UPC barcode if the user has one' },
        limit: { type: 'number', description: 'Max matches, default 6' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'lookup_nutrition',
    description:
      'Look up calories for a packaged food using Open Food Facts first, then an AI estimate if the database has no match. Prefer search_open_food_facts when you need official label facts or several product options.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Product name, e.g. bag of Fritos Lay' },
        barcode: { type: 'string', description: 'EAN/UPC barcode if the user has one' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'save_packaged_food',
    description:
      'Save a packaged snack or store product (chips, Gansito, Nito, soda, yogurt, etc.) as a household ingredient and a 1-serving recipe so it can be logged later. Use search_open_food_facts first when calories are unknown.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        nameEs: { type: 'string' },
        grams: { type: 'number', description: 'One serving or package in grams' },
        kcal: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
        query: { type: 'string', description: 'Search term if macros are not provided' },
        barcode: { type: 'string' },
        category: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_recipe',
    description:
      'Create a household recipe. Use catalog ingredient ids, household snack ids (snack-…), or names. For packaged snacks, prefer save_packaged_food or search_open_food_facts first.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        nameEs: { type: 'string' },
        category: { type: 'string', description: 'e.g. antojito, soup, salad, custom' },
        servings: { type: 'number' },
        cuisine: { type: 'string', enum: ['mexican', 'american', 'italian', 'chinese'] },
        summary: { type: 'string' },
        steps: { type: 'array', items: { type: 'string' } },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ingredient: { type: 'string', description: 'Catalog id or name' },
              grams: { type: 'number', description: 'Grams, or ml for liquids' },
              note: { type: 'string' },
            },
            required: ['ingredient', 'grams'],
          },
        },
      },
      required: ['name', 'ingredients'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_recipe',
    description:
      'Change an existing household or catalog recipe (name, servings, ingredients, steps). Pass the recipe id or name, plus only the fields to change. Ingredients replace the whole list when provided.',
    parameters: {
      type: 'object',
      properties: {
        recipe: { type: 'string', description: 'Recipe id or name' },
        name: { type: 'string' },
        nameEs: { type: 'string' },
        category: { type: 'string' },
        servings: { type: 'number' },
        cuisine: { type: 'string', enum: ['mexican', 'american', 'italian', 'chinese'] },
        summary: { type: 'string' },
        steps: { type: 'array', items: { type: 'string' } },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ingredient: { type: 'string' },
              grams: { type: 'number' },
              note: { type: 'string' },
            },
            required: ['ingredient', 'grams'],
          },
        },
      },
      required: ['recipe'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_food_entry',
    description:
      'Log food the user ate. Prefer a catalog recipe or ingredient so calories are calculated. If neither matches, you must supply kcal (and macros if known).',
    parameters: {
      type: 'object',
      properties: {
        meal: { type: 'string', enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] },
        name: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
        recipe: { type: 'string', description: 'Recipe id or name' },
        servings: { type: 'number', description: 'Servings of the recipe, default 1' },
        ingredient: { type: 'string', description: 'Ingredient id or name if logging a raw food' },
        grams: { type: 'number' },
        kcal: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
        detail: { type: 'string' },
      },
      required: ['meal', 'name'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_inventory',
    description: 'Add grams of a catalog ingredient to kitchen inventory.',
    parameters: {
      type: 'object',
      properties: {
        ingredient: { type: 'string' },
        grams: { type: 'number' },
        boughtOn: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
      },
      required: ['ingredient', 'grams'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_to_shopping_list',
    description: 'Add one or more catalog ingredients to the purchase list.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ingredient: { type: 'string' },
              grams: { type: 'number' },
            },
            required: ['ingredient', 'grams'],
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_week_meal',
    description: 'Add a meal slot to this week’s plan without wiping other slots.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        meal: { type: 'string', enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] },
        recipe: { type: 'string', description: 'Recipe id or name' },
        servings: { type: 'number' },
      },
      required: ['date', 'meal', 'recipe'],
      additionalProperties: false,
    },
  },
  {
    name: 'log_exercise',
    description: 'Log a workout for the current user.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: [...EXERCISE_KINDS] },
        name: { type: 'string' },
        minutes: { type: 'number' },
        kcal: { type: 'number' },
        date: { type: 'string' },
      },
      required: ['kind', 'minutes'],
      additionalProperties: false,
    },
  },
  {
    name: 'log_weight',
    description:
      'Log a weigh-in for the current user. One value per day; logging again updates that day. Use kilograms.',
    parameters: {
      type: 'object',
      properties: {
        kg: { type: 'number', description: 'Body weight in kilograms' },
        date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
      },
      required: ['kg'],
      additionalProperties: false,
    },
  },
  {
    name: 'set_water',
    description: 'Set how many water glasses the user logged for a day.',
    parameters: {
      type: 'object',
      properties: {
        glasses: { type: 'number' },
        date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
      },
      required: ['glasses'],
      additionalProperties: false,
    },
  },
]

async function needAddon(userId: string, moduleId: string): Promise<ToolExecResult | null> {
  const member = await prisma.member.findFirst({ where: { userId }, select: { householdId: true } })
  if (!member) return { ok: false, summary: 'Household not found', error: 'household' }
  const on = await isModuleInstalled(member.householdId, moduleId)
  if (on) return null
  return { ok: false, summary: `Install the ${moduleId} module from Marketplace first`, error: 'module' }
}

export async function executeMeatTool(ctx: MeatToolContext, call: ToolCallRequest): Promise<ToolExecResult> {
  const args = call.arguments ?? {}
  if (call.name === 'add_week_meal') {
    const blocked = await needAddon(ctx.userId, 'week')
    if (blocked) return blocked
  }
  if (call.name === 'log_exercise') {
    const blocked = await needAddon(ctx.userId, 'exercise')
    if (blocked) return blocked
  }
  switch (call.name) {
    case 'search_ingredients':
      return searchIngredients(ctx, str(args.query), num(args.limit))
    case 'search_recipes':
      return searchRecipes(ctx, str(args.query), num(args.limit))
    case 'list_inventory':
      return listInventory(ctx)
    case 'list_shopping_list':
      return listShopping(ctx)
    case 'list_today_log':
      return listToday(ctx)
    case 'search_open_food_facts':
      return searchOpenFoodFactsTool(str(args.query), str(args.barcode), num(args.limit))
    case 'lookup_nutrition':
      return lookupProduct(ctx, str(args.query), str(args.barcode))
    case 'save_packaged_food':
      return savePackagedFood(ctx, args)
    case 'add_recipe':
      return addRecipe(ctx, args)
    case 'update_recipe':
      return updateRecipe(ctx, args)
    case 'add_food_entry':
      return addFood(ctx, args)
    case 'add_inventory':
      return addInventory(ctx, args)
    case 'add_to_shopping_list':
      return addShopping(ctx, args)
    case 'add_week_meal':
      return addWeekMeal(ctx, args)
    case 'log_exercise':
      return logExercise(ctx, args)
    case 'log_weight':
      return logWeight(ctx, args)
    case 'set_water':
      return setWater(ctx, args)
    default:
      return { ok: false, summary: `Unknown tool ${call.name}`, error: 'unknown_tool' }
  }
}

async function searchOpenFoodFactsTool(
  query?: string,
  barcode?: string,
  limit?: number,
): Promise<ToolExecResult> {
  if (!query && !barcode) return { ok: false, summary: 'query or barcode is required', error: 'query' }
  const take = Math.min(Math.max(limit ?? 6, 1), 10)
  const products = []
  if (barcode) {
    try {
      const exact = await fetchProductByBarcode(barcode)
      if (exact) products.push(formatOpenFoodFactsProduct(exact))
    } catch {
      /* fall through to name search */
    }
  }
  const search = query || (!products.length ? barcode : undefined)
  if (search && products.length < take) {
    try {
      const matches = await searchOpenFoodFacts(search, take)
      const seen = new Set(products.map((row) => row.barcode).filter(Boolean))
      for (const hit of matches) {
        if (hit.barcode && seen.has(hit.barcode)) continue
        products.push(formatOpenFoodFactsProduct(hit))
        if (products.length >= take) break
      }
    } catch (err) {
      if (!products.length) {
        return {
          ok: false,
          summary: `Open Food Facts search failed: ${err instanceof Error ? err.message : String(err)}`,
          error: 'off',
        }
      }
    }
  }
  if (!products.length) {
    return {
      ok: false,
      summary: `No Open Food Facts match for ${query || barcode}. Try a brand + product name, or a barcode.`,
      error: 'not_found',
    }
  }
  const first = products[0]
  return {
    ok: true,
    summary: `Open Food Facts: ${products.length} product(s). Closest: ${first.brand ? `${first.brand} ` : ''}${first.name} · ${first.serving.kcal} kcal per ${first.servingLabel || 'serving'}`,
    data: { source: 'openfoodfacts', products },
  }
}

async function lookupProduct(
  ctx: MeatToolContext,
  query?: string,
  barcode?: string,
): Promise<ToolExecResult> {
  if (!query && !barcode) return { ok: false, summary: 'query or barcode is required', error: 'query' }
  const result = await lookupNutrition(ctx.userId, { query, barcode })
  if (!result.hit) {
    return { ok: false, summary: 'No nutrition data found', error: 'not_found' }
  }
  const hit = result.hit
  const extra = hit.pack
    ? ` · pack ${hit.pack.label} ${hit.pack.kcal} kcal`
    : hit.per100g
      ? ` · 100g ${hit.per100g.kcal} kcal`
      : ''
  return {
    ok: true,
    summary: `${hit.name}: ${hit.serving.kcal} kcal per ${hit.servingLabel || 'serving'}${extra}`,
    data: {
      ...formatOpenFoodFactsProduct(hit),
      estimated: Boolean(hit.estimated),
      source: hit.source,
      matches: result.matches.slice(0, 4).map((row) => formatOpenFoodFactsProduct(row)),
    },
  }
}

async function searchIngredients(
  ctx: MeatToolContext,
  query?: string,
  limit?: number,
): Promise<ToolExecResult> {
  if (!query) return { ok: false, summary: 'query is required', error: 'query' }
  const { extras } = await kitchenPayload(ctx.userId)
  const take = Math.min(Math.max(limit ?? 12, 1), 25)
  const pool = [...INGREDIENTS, ...extras]
  const hits = pool
    .map((ing) => ({
      id: ing.id,
      name: ing.name,
      nameEs: ing.nameEs,
      category: ing.category,
      score: bestScore(query, [ing.id, ing.name, ing.nameEs]),
    }))
    .filter((row) => row.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map(({ score: _score, ...row }) => row)
  return { ok: true, summary: `${hits.length} ingredients`, data: hits }
}

async function kitchenPayload(userId: string) {
  const member = await prisma.member.findFirst({
    where: { userId },
    include: {
      household: { include: { kitchen: { include: { inventory: true, purchases: true } } } },
    },
  })
  if (!member?.household.kitchen) throw new Error('Kitchen not found')
  const kitchen = member.household.kitchen
  const custom = parseCustomRecipes(safeJson(kitchen.recipesJson))
  const overrides = parseRecipeOverrides(safeJson(kitchen.overridesJson))
  const extras = parseCustomIngredients(safeJson(kitchen.ingredientsJson))
  return {
    member,
    kitchen,
    custom,
    overrides,
    extras,
    recipes: mergeRecipeLibrary(custom, overrides),
  }
}

async function searchRecipes(ctx: MeatToolContext, query?: string, limit?: number): Promise<ToolExecResult> {
  if (!query) return { ok: false, summary: 'query is required', error: 'query' }
  const { recipes } = await kitchenPayload(ctx.userId)
  const take = Math.min(Math.max(limit ?? 10, 1), 20)
  const hits = recipes
    .map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      nameEs: recipe.nameEs,
      servings: recipe.servings,
      category: recipe.category,
      score: bestScore(query, [recipe.id, recipe.name, recipe.nameEs]),
    }))
    .filter((row) => row.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map(({ score: _score, ...row }) => row)
  return { ok: true, summary: `${hits.length} recipes`, data: hits }
}

async function listInventory(ctx: MeatToolContext): Promise<ToolExecResult> {
  const { kitchen } = await kitchenPayload(ctx.userId)
  const rows = kitchen.inventory.map((lot) => ({
    id: lot.id,
    ingredientId: lot.ingredientId,
    name: getIngredient(lot.ingredientId)?.name ?? lot.ingredientId,
    grams: lot.grams,
    boughtOn: lot.boughtOn,
  }))
  return { ok: true, summary: `${rows.length} inventory lots`, data: rows }
}

async function listShopping(ctx: MeatToolContext): Promise<ToolExecResult> {
  const { kitchen } = await kitchenPayload(ctx.userId)
  const rows = kitchen.purchases.map((item) => ({
    id: item.id,
    ingredientId: item.ingredientId,
    name: getIngredient(item.ingredientId)?.name ?? item.ingredientId,
    grams: item.grams,
  }))
  return { ok: true, summary: `${rows.length} shopping items`, data: rows }
}

async function listToday(ctx: MeatToolContext): Promise<ToolExecResult> {
  const today = todayKey()
  const member = await prisma.member.findFirst({
    where: { userId: ctx.userId },
    include: {
      entries: { where: { date: today }, orderBy: { createdAt: 'desc' } },
      exercises: { where: { date: today } },
      waterLogs: { where: { date: today } },
      weightLogs: { where: { date: today } },
    },
  })
  if (!member) return { ok: false, summary: 'Member not found', error: 'member' }
  const food = member.entries.map((e) => ({
    id: e.id,
    meal: e.meal,
    name: e.name,
    kcal: e.kcal,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
  }))
  const kcal = food.reduce((sum, e) => sum + e.kcal, 0)
  return {
    ok: true,
    summary: `Today ${Math.round(kcal)} kcal`,
    data: {
      date: today,
      kcal: Math.round(kcal),
      food,
      exercise: member.exercises.map((e) => ({
        id: e.id,
        kind: e.kind,
        name: e.name,
        minutes: e.minutes,
        kcal: e.kcal,
      })),
      waterGlasses: member.waterLogs[0]?.glasses ?? 0,
      weightKg: member.weightLogs[0]?.kg ?? null,
    },
  }
}

async function savePackagedFood(ctx: MeatToolContext, args: Record<string, unknown>): Promise<ToolExecResult> {
  const name = str(args.name)
  if (!name) return { ok: false, summary: 'name is required', error: 'name' }
  let grams = num(args.grams)
  let kcal = num(args.kcal)
  let protein = num(args.protein) ?? 0
  let carbs = num(args.carbs) ?? 0
  let fat = num(args.fat) ?? 0
  if (kcal == null || !grams) {
    const hit = await lookupNutrition(ctx.userId, {
      query: str(args.query) || name,
      barcode: str(args.barcode),
    })
    if (!hit.hit) {
      return { ok: false, summary: `No nutrition found for ${name}. Provide kcal and grams.`, error: 'nutrition' }
    }
    const pack = hit.hit.pack && (!grams || grams >= 80) ? hit.hit.pack : hit.hit.serving
    kcal = kcal ?? pack.kcal
    protein = num(args.protein) ?? pack.protein
    carbs = num(args.carbs) ?? pack.carbs
    fat = num(args.fat) ?? pack.fat
    if (!grams) {
      const label = hit.hit.servingLabel || hit.hit.pack?.label || ''
      const parsed = Number((label.match(/(\d+(?:\.\d+)?)\s*g/i) || [])[1])
      grams = Number.isFinite(parsed) && parsed > 0 ? parsed : 30
    }
  }
  if (kcal == null || kcal <= 0 || !grams || grams <= 0) {
    return { ok: false, summary: 'Need kcal and grams for this snack', error: 'nutrition' }
  }
  const per100g = per100gFromServing({ kcal, protein, carbs, fat }, grams)
  const id = snackIngredientId(name)
  await mutateWorkspace(ctx.userId, {
    action: 'saveIngredient',
    ingredient: {
      id,
      name,
      nameEs: str(args.nameEs) || name,
      category: 'other',
      kcal: per100g.kcal,
      protein: per100g.protein,
      carbs: per100g.carbs,
      fat: per100g.fat,
    },
  })
  await mutateWorkspace(ctx.userId, {
    action: 'saveRecipe',
    recipe: {
      name,
      nameEs: str(args.nameEs) || name,
      category: str(args.category) || 'snack',
      servings: 1,
      cuisine: 'mexican',
      summary: `Packaged serving, ${grams}g`,
      ingredients: [{ ingredientId: id, grams, note: '1 serving / package' }],
    },
  })
  return {
    ok: true,
    mutated: true,
    summary: `Saved snack “${name}” · ${Math.round(kcal)} kcal per ${grams}g`,
    data: { id, name, grams, kcal, protein, carbs, fat },
  }
}

async function addRecipe(ctx: MeatToolContext, args: Record<string, unknown>): Promise<ToolExecResult> {
  const name = str(args.name)
  if (!name) return { ok: false, summary: 'name is required', error: 'name' }
  const { extras } = await kitchenPayload(ctx.userId)
  const rawItems = Array.isArray(args.ingredients) ? args.ingredients : []
  if (!rawItems.length) return { ok: false, summary: 'At least one ingredient is required', error: 'ingredients' }

  const ingredients: { ingredientId: string; grams: number; note?: string }[] = []
  const missing: { input: string; candidates: { id: string; name: string }[] }[] = []
  for (const raw of rawItems) {
    const rec = asRecord(raw)
    const hint = str(rec.ingredient) || str(rec.ingredientId)
    const grams = num(rec.grams)
    if (!hint || grams == null || grams <= 0) {
      missing.push({ input: hint || '(empty)', candidates: [] })
      continue
    }
    const resolved = resolveIngredient(hint, extras)
    if (!resolved.ok) {
      missing.push({ input: hint, candidates: resolved.candidates })
      continue
    }
    ingredients.push({
      ingredientId: resolved.id,
      grams,
      ...(str(rec.note) ? { note: str(rec.note) } : {}),
    })
  }
  if (missing.length) {
    return {
      ok: false,
      summary: `Unknown ingredients: ${missing.map((row) => row.input).join(', ')}. Use save_packaged_food or search_open_food_facts for snacks.`,
      error: 'ingredients',
      data: { missing },
    }
  }

  const cuisineRaw = str(args.cuisine)
  const cuisine = CUISINES.includes(cuisineRaw as Cuisine) ? (cuisineRaw as Cuisine) : undefined
  const servings = Math.max(1, Math.round(num(args.servings) ?? 4))
  const steps = Array.isArray(args.steps)
    ? args.steps.map((step) => String(step).trim()).filter(Boolean)
    : []
  await mutateWorkspace(ctx.userId, {
    action: 'saveRecipe',
    recipe: {
      name,
      nameEs: str(args.nameEs) || name,
      category: str(args.category) || 'custom',
      servings,
      ingredients,
      ...(cuisine ? { cuisine } : {}),
      ...(str(args.summary) ? { summary: str(args.summary) } : {}),
      ...(steps.length ? { steps } : {}),
    },
  })
  return {
    ok: true,
    mutated: true,
    summary: `Saved recipe “${name}” (${ingredients.length} ingredients, ${servings} servings)`,
    data: { name, servings, ingredients },
  }
}

async function updateRecipe(ctx: MeatToolContext, args: Record<string, unknown>): Promise<ToolExecResult> {
  const hint = str(args.recipe)
  if (!hint) return { ok: false, summary: 'recipe is required', error: 'recipe' }
  const { custom, overrides, extras } = await kitchenPayload(ctx.userId)
  const found = resolveRecipe(hint, custom, overrides)
  if (!found.ok) {
    return { ok: false, summary: `Recipe not found: ${hint}`, error: 'recipe', data: { candidates: found.candidates } }
  }
  const current = found.recipe
  let ingredients = current.ingredients
  if (Array.isArray(args.ingredients)) {
    const next: { ingredientId: string; grams: number; note?: string }[] = []
    const missing: string[] = []
    for (const raw of args.ingredients) {
      const rec = asRecord(raw)
      const ingHint = str(rec.ingredient) || str(rec.ingredientId)
      const grams = num(rec.grams)
      if (!ingHint || grams == null || grams <= 0) continue
      const resolved = resolveIngredient(ingHint, extras)
      if (!resolved.ok) {
        missing.push(ingHint)
        continue
      }
      next.push({
        ingredientId: resolved.id,
        grams,
        ...(str(rec.note) ? { note: str(rec.note) } : {}),
      })
    }
    if (missing.length) {
      return { ok: false, summary: `Unknown ingredients: ${missing.join(', ')}`, error: 'ingredients' }
    }
    if (!next.length) return { ok: false, summary: 'Need at least one ingredient', error: 'ingredients' }
    ingredients = next
  }
  const cuisineRaw = str(args.cuisine)
  const cuisine = CUISINES.includes(cuisineRaw as Cuisine) ? (cuisineRaw as Cuisine) : current.cuisine
  await mutateWorkspace(ctx.userId, {
    action: 'saveRecipe',
    recipe: {
      id: current.id,
      name: str(args.name) || current.name,
      nameEs: str(args.nameEs) || current.nameEs,
      category: str(args.category) || current.category,
      servings: Math.max(1, num(args.servings) ?? current.servings),
      ingredients,
      cuisine,
      summary: str(args.summary) ?? current.summary,
      steps: Array.isArray(args.steps)
        ? args.steps.map((step) => String(step).trim()).filter(Boolean)
        : current.steps,
    },
  })
  return {
    ok: true,
    mutated: true,
    summary: `Updated recipe “${str(args.name) || current.name}”`,
    data: { id: current.id },
  }
}

async function addFood(ctx: MeatToolContext, args: Record<string, unknown>): Promise<ToolExecResult> {
  const meal = str(args.meal)
  const name = str(args.name)
  if (!meal || !MEALS.includes(meal as (typeof MEALS)[number])) {
    return { ok: false, summary: 'meal must be Breakfast, Lunch, Dinner, or Snack', error: 'meal' }
  }
  if (!name) return { ok: false, summary: 'name is required', error: 'name' }
  const date = validDate(str(args.date)) || todayKey()
  const { member, custom, overrides, extras } = await kitchenPayload(ctx.userId)

  let recipeId: string | undefined
  let servings = num(args.servings)
  let kcal = num(args.kcal)
  let protein = num(args.protein)
  let carbs = num(args.carbs)
  let fat = num(args.fat)
  let detail = str(args.detail)

  const recipeHint = str(args.recipe)
  if (recipeHint) {
    const recipe = resolveRecipe(recipeHint, custom, overrides)
    if (!recipe.ok) {
      return {
        ok: false,
        summary: `Recipe not found: ${recipeHint}`,
        error: 'recipe',
        data: { candidates: recipe.candidates },
      }
    }
    recipeId = recipe.recipe.id
    servings = servings && servings > 0 ? servings : 1
    const macros = scaleRecipeMacros(recipe.recipe, servings, extras)
    kcal = kcal ?? macros.kcal
    protein = protein ?? macros.protein
    carbs = carbs ?? macros.carbs
    fat = fat ?? macros.fat
    detail = detail || `${servings} serving(s)`
  } else {
    const ingHint = str(args.ingredient) || name
    const grams = num(args.grams)
    const resolved = resolveIngredient(ingHint, extras)
    if (resolved.ok && (grams || kcal == null)) {
      const amount = grams && grams > 0 ? grams : 100
      const ing = findIngredient(resolved.id, extras)
      const macros = ing
        ? getIngredient(resolved.id)
          ? macrosForAmount(resolved.id, amount)
          : macrosForCustomAmount(ing, amount)
        : { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      kcal = kcal ?? macros.kcal
      protein = protein ?? macros.protein
      carbs = carbs ?? macros.carbs
      fat = fat ?? macros.fat
      detail = detail || `${amount}${ing?.unit === 'ml' ? 'ml' : 'g'}`
    }
  }

  if (kcal == null) {
    return {
      ok: false,
      summary: 'Need a known recipe, a catalog ingredient + grams, or explicit kcal',
      error: 'nutrition',
    }
  }

  await mutateWorkspace(ctx.userId, {
    action: 'addEntry',
    entry: {
      date,
      meal,
      name,
      detail,
      kcal: Math.round(kcal),
      protein: Math.round((protein ?? 0) * 10) / 10,
      carbs: Math.round((carbs ?? 0) * 10) / 10,
      fat: Math.round((fat ?? 0) * 10) / 10,
      recipeId,
      servings,
    },
    memberIds: [member.id],
  })
  return {
    ok: true,
    mutated: true,
    summary: `Logged ${name} for ${meal} · ${Math.round(kcal)} kcal`,
    data: { date, meal, name, kcal: Math.round(kcal), recipeId, servings },
  }
}

async function addInventory(ctx: MeatToolContext, args: Record<string, unknown>): Promise<ToolExecResult> {
  const hint = str(args.ingredient)
  const grams = num(args.grams)
  if (!hint) return { ok: false, summary: 'ingredient is required', error: 'ingredient' }
  if (grams == null || grams <= 0) return { ok: false, summary: 'grams must be > 0', error: 'grams' }
  const { extras } = await kitchenPayload(ctx.userId)
  const resolved = resolveIngredient(hint, extras)
  if (!resolved.ok) {
    return {
      ok: false,
      summary: `Unknown ingredient: ${hint}`,
      error: 'ingredient',
      data: { candidates: resolved.candidates },
    }
  }
  const boughtOn = validDate(str(args.boughtOn)) || todayKey()
  await mutateWorkspace(ctx.userId, {
    action: 'addInventoryItem',
    ingredientId: resolved.id,
    grams,
    boughtOn,
  })
  const label = findIngredient(resolved.id, extras)?.name ?? resolved.id
  return {
    ok: true,
    mutated: true,
    summary: `Added ${grams}g ${label} to inventory`,
    data: { ingredientId: resolved.id, grams, boughtOn },
  }
}

async function addShopping(ctx: MeatToolContext, args: Record<string, unknown>): Promise<ToolExecResult> {
  const rawItems = Array.isArray(args.items) ? args.items : []
  if (!rawItems.length) return { ok: false, summary: 'items is required', error: 'items' }
  const { extras } = await kitchenPayload(ctx.userId)
  const items: { ingredientId: string; grams: number }[] = []
  const missing: string[] = []
  for (const raw of rawItems) {
    const rec = asRecord(raw)
    const hint = str(rec.ingredient) || str(rec.ingredientId)
    const grams = num(rec.grams)
    if (!hint || grams == null || grams <= 0) continue
    const resolved = resolveIngredient(hint, extras)
    if (!resolved.ok) {
      missing.push(hint)
      continue
    }
    items.push({ ingredientId: resolved.id, grams })
  }
  if (missing.length) {
    return { ok: false, summary: `Unknown ingredients: ${missing.join(', ')}`, error: 'ingredients' }
  }
  if (!items.length) return { ok: false, summary: 'No valid items', error: 'items' }
  await mutateWorkspace(ctx.userId, { action: 'addToPurchaseList', items })
  return {
    ok: true,
    mutated: true,
    summary: `Added ${items.length} item(s) to the shopping list`,
    data: items.map((item) => ({
      ...item,
      name: getIngredient(item.ingredientId)?.name ?? item.ingredientId,
    })),
  }
}

async function addWeekMeal(ctx: MeatToolContext, args: Record<string, unknown>): Promise<ToolExecResult> {
  const date = validDate(str(args.date))
  const meal = str(args.meal)
  const recipeHint = str(args.recipe)
  if (!date) return { ok: false, summary: 'date must be YYYY-MM-DD', error: 'date' }
  if (!meal || !MEALS.includes(meal as (typeof MEALS)[number])) {
    return { ok: false, summary: 'meal must be Breakfast, Lunch, Dinner, or Snack', error: 'meal' }
  }
  if (!recipeHint) return { ok: false, summary: 'recipe is required', error: 'recipe' }
  const { member, kitchen, custom, overrides } = await kitchenPayload(ctx.userId)
  const recipe = resolveRecipe(recipeHint, custom, overrides)
  if (!recipe.ok) {
    return {
      ok: false,
      summary: `Recipe not found: ${recipeHint}`,
      error: 'recipe',
      data: { candidates: recipe.candidates },
    }
  }
  const week = parseWeekPlan(safeJson(kitchen.weekPlanJson))
  const servings = Math.max(1, num(args.servings) ?? 1)
  const slot = {
    id: `ai-${Date.now().toString(36)}`,
    date,
    meal,
    recipeId: recipe.recipe.id,
    servings,
    memberId: member.id,
  }
  await mutateWorkspace(ctx.userId, {
    action: 'saveWeekPlan',
    slots: [...week.slots, slot],
  })
  return {
    ok: true,
    mutated: true,
    summary: `Planned ${recipe.recipe.name} for ${meal} on ${date}`,
    data: slot,
  }
}

async function logExercise(ctx: MeatToolContext, args: Record<string, unknown>): Promise<ToolExecResult> {
  const kind = str(args.kind)
  const minutes = num(args.minutes)
  if (!kind || !EXERCISE_KINDS.includes(kind as (typeof EXERCISE_KINDS)[number])) {
    return { ok: false, summary: 'kind is required', error: 'kind' }
  }
  if (minutes == null || minutes <= 0) return { ok: false, summary: 'minutes must be > 0', error: 'minutes' }
  const { member } = await kitchenPayload(ctx.userId)
  const kcal = Math.max(0, Math.round(num(args.kcal) ?? minutes * 6))
  const name = str(args.name) || kind
  await mutateWorkspace(ctx.userId, {
    action: 'addExercise',
    kind,
    name,
    minutes,
    date: validDate(str(args.date)),
    members: [{ memberId: member.id, kcal }],
  })
  return {
    ok: true,
    mutated: true,
    summary: `Logged ${name} · ${Math.round(minutes)} min · ${kcal} kcal`,
    data: { kind, name, minutes, kcal },
  }
}

async function logWeight(ctx: MeatToolContext, args: Record<string, unknown>): Promise<ToolExecResult> {
  const kg = num(args.kg)
  if (kg == null || kg < 35 || kg > 300) {
    return { ok: false, summary: 'kg must be between 35 and 300', error: 'kg' }
  }
  const date = validDate(str(args.date)) || todayKey()
  const { member } = await kitchenPayload(ctx.userId)
  await mutateWorkspace(ctx.userId, { action: 'addWeight', kg, date, memberId: member.id })
  return {
    ok: true,
    mutated: true,
    summary: `Logged ${kg} kg on ${date}`,
    data: { kg, date },
  }
}

async function setWater(ctx: MeatToolContext, args: Record<string, unknown>): Promise<ToolExecResult> {
  const glasses = num(args.glasses)
  if (glasses == null || glasses < 0) return { ok: false, summary: 'glasses is required', error: 'glasses' }
  const date = validDate(str(args.date)) || todayKey()
  const { member } = await kitchenPayload(ctx.userId)
  await mutateWorkspace(ctx.userId, { action: 'setWater', date, glasses, memberId: member.id })
  return {
    ok: true,
    mutated: true,
    summary: `Set water to ${glasses} glasses on ${date}`,
    data: { date, glasses },
  }
}

function resolveIngredient(
  hint: string,
  extras: import('../../data/types').Ingredient[] = [],
): { ok: true; id: string } | { ok: false; candidates: { id: string; name: string }[] } {
  if (findIngredient(hint, extras)) return { ok: true, id: hint }
  const scored = [...INGREDIENTS, ...extras]
    .map((ing) => ({
      id: ing.id,
      name: ing.name,
      score: bestScore(hint, [ing.id, ing.name, ing.nameEs]),
    }))
    .filter((row) => row.score >= 60)
    .sort((a, b) => b.score - a.score)
  if (scored.length === 1 || (scored[0] && scored[0].score >= 90 && (!scored[1] || scored[0].score - scored[1].score >= 15))) {
    return { ok: true, id: scored[0].id }
  }
  return {
    ok: false,
    candidates: scored.slice(0, 6).map((row) => ({ id: row.id, name: row.name })),
  }
}

function resolveRecipe(
  hint: string,
  custom: Recipe[],
  overrides: Record<string, Recipe>,
): { ok: true; recipe: Recipe } | { ok: false; candidates: { id: string; name: string }[] } {
  const direct = findMergedRecipe(hint, custom, overrides) || RECIPES.find((recipe) => recipe.id === hint)
  if (direct) return { ok: true, recipe: direct }
  const library = mergeRecipeLibrary(custom, overrides)
  const scored = library
    .map((recipe) => ({
      recipe,
      score: bestScore(hint, [recipe.id, recipe.name, recipe.nameEs]),
    }))
    .filter((row) => row.score >= 55)
    .sort((a, b) => b.score - a.score)
  if (scored.length === 1 || (scored[0] && scored[0].score >= 90 && (!scored[1] || scored[0].score - scored[1].score >= 15))) {
    return { ok: true, recipe: scored[0].recipe }
  }
  return {
    ok: false,
    candidates: scored.slice(0, 6).map((row) => ({ id: row.recipe.id, name: row.recipe.name })),
  }
}

function scaleRecipeMacros(
  recipe: Recipe,
  servings: number,
  extras: import('../../data/types').Ingredient[] = [],
) {
  let kcal = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  for (const line of recipe.ingredients) {
    const ing = findIngredient(line.ingredientId, extras)
    if (!ing) continue
    const macros = getIngredient(line.ingredientId)
      ? macrosForAmount(line.ingredientId, line.grams)
      : macrosForCustomAmount(ing, line.grams)
    kcal += macros.kcal
    protein += macros.protein
    carbs += macros.carbs
    fat += macros.fat
  }
  const factor = servings / Math.max(1, recipe.servings || 1)
  return {
    kcal: Math.round(kcal * factor),
    protein: Math.round(protein * factor * 10) / 10,
    carbs: Math.round(carbs * factor * 10) / 10,
    fat: Math.round(fat * factor * 10) / 10,
  }
}

function bestScore(query: string, names: (string | null | undefined)[]): number {
  return Math.max(0, ...names.map((name) => matchScore(query, name)))
}

function matchScore(query: string, name?: string | null): number {
  const q = fold(query)
  const n = fold(name)
  if (!q || !n) return 0
  if (q === n) return 100
  if (n.startsWith(q) || q.startsWith(n)) return 82
  if (n.includes(q) || q.includes(n)) return 68
  return 0
}

function fold(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function validDate(value?: string): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}
