import { INGREDIENTS, LIQUID_DENSITY, ingredientUnit } from '../src/data/ingredients.ts'
import { RECIPES } from '../src/data/recipes.ts'
import { RECIPE_STEPS } from '../src/data/recipeSteps.ts'
import { RECIPE_STEPS_ES } from '../src/data/recipeStepsEs.ts'
import { recipeBatchMacros, recipePerServingMacros } from '../src/lib/portions.ts'
import { QUICK_FOODS } from '../src/lib/foods.ts'

const issues = []
const warn = (msg) => issues.push({ level: 'warn', msg })
const err = (msg) => issues.push({ level: 'error', msg })

const byId = new Map(INGREDIENTS.map((i) => [i.id, i]))
const dupIds = INGREDIENTS.map((i) => i.id).filter((id, i, a) => a.indexOf(id) !== i)
if (dupIds.length) err(`Duplicate ingredient ids: ${[...new Set(dupIds)].join(', ')}`)

const recipeIds = RECIPES.map((r) => r.id)
const dupRecipes = recipeIds.filter((id, i, a) => a.indexOf(id) !== i)
if (dupRecipes.length) err(`Duplicate recipe ids: ${[...new Set(dupRecipes)].join(', ')}`)

const used = new Set()
for (const recipe of RECIPES) {
  if (!recipe.servings || recipe.servings < 1) err(`${recipe.id}: invalid servings ${recipe.servings}`)
  if (!recipe.ingredients?.length) err(`${recipe.id}: no ingredients`)
  const seen = new Map()
  for (const line of recipe.ingredients) {
    used.add(line.ingredientId)
    const ing = byId.get(line.ingredientId)
    if (!ing) {
      err(`${recipe.id}: missing ingredient ${line.ingredientId}`)
      continue
    }
    if (!(line.grams > 0)) err(`${recipe.id}: ${line.ingredientId} amount ${line.grams}`)
    seen.set(line.ingredientId, (seen.get(line.ingredientId) || 0) + 1)
    const unit = ingredientUnit(line.ingredientId)
    if (unit === 'ml' && !(line.ingredientId in LIQUID_DENSITY)) {
      err(`${recipe.id}: liquid ${line.ingredientId} has no density`)
    }
  }
}

for (const recipe of RECIPES) {
  try {
    const batch = recipeBatchMacros(recipe)
    const per = recipePerServingMacros(recipe)
    if (per.kcal < 40) warn(`${recipe.id}: very low ${Math.round(per.kcal)} kcal/serving`)
    if (per.kcal > 1400) warn(`${recipe.id}: very high ${Math.round(per.kcal)} kcal/serving (${recipe.servings} servings, batch ${Math.round(batch.kcal)})`)
    const atwater = per.protein * 4 + per.carbs * 4 + per.fat * 9
    const drift = Math.abs(atwater - per.kcal) / Math.max(per.kcal, 1)
    if (drift > 0.25 && per.kcal > 80) {
      warn(
        `${recipe.id}: serving kcal ${Math.round(per.kcal)} vs Atwater ${Math.round(atwater)} (${Math.round(drift * 100)}%)`,
      )
    }
  } catch (e) {
    err(`${recipe.id}: macros failed ${e.message}`)
  }
}

for (const ing of INGREDIENTS) {
  const { kcal, protein, carbs, fat } = ing.per100g
  const atwater = protein * 4 + carbs * 4 + fat * 9
  const drift = Math.abs(atwater - kcal)
  // fiber-heavy foods drift a lot; only flag if kcal is way off AND not fiber-typical
  if (kcal > 20 && drift > 80 && atwater > kcal * 1.4) {
    warn(`${ing.id}: kcal ${kcal} vs Atwater ${Math.round(atwater)} (P${protein} C${carbs} F${fat})`)
  }
  if (protein < 0 || carbs < 0 || fat < 0 || kcal < 0) err(`${ing.id}: negative macros`)
}

const unused = INGREDIENTS.filter((i) => !used.has(i.id)).map((i) => i.id)

const missingStepsEn = RECIPES.filter((r) => !RECIPE_STEPS[r.id]?.length).map((r) => r.id)
const missingStepsEs = RECIPES.filter((r) => !RECIPE_STEPS_ES[r.id]?.length).map((r) => r.id)
const extraStepsEn = Object.keys(RECIPE_STEPS).filter((id) => !recipeIds.includes(id))
const extraStepsEs = Object.keys(RECIPE_STEPS_ES).filter((id) => !recipeIds.includes(id))

console.log(`ingredients: ${INGREDIENTS.length}`)
console.log(`recipes: ${RECIPES.length}`)
console.log(`unused ingredients (${unused.length}): ${unused.join(', ') || 'none'}`)
console.log(`missing EN steps (${missingStepsEn.length}): ${missingStepsEn.join(', ') || 'none'}`)
console.log(`missing ES steps (${missingStepsEs.length}): ${missingStepsEs.join(', ') || 'none'}`)
console.log(`extra EN steps: ${extraStepsEn.join(', ') || 'none'}`)
console.log(`extra ES steps: ${extraStepsEs.join(', ') || 'none'}`)
console.log('quick foods', QUICK_FOODS.length)

console.log('\n=== per-serving macros (sample / outliers) ===')
const rows = RECIPES.map((r) => {
  const p = recipePerServingMacros(r)
  return { id: r.id, name: r.name, servings: r.servings, ...p }
}).sort((a, b) => a.kcal - b.kcal)
for (const r of [rows[0], rows[1], rows[2], rows[rows.length - 3], rows[rows.length - 2], rows[rows.length - 1]]) {
  console.log(
    `${Math.round(r.kcal).toString().padStart(5)} kcal  P${r.protein.toFixed(0).padStart(3)} C${r.carbs.toFixed(0).padStart(3)} F${r.fat.toFixed(0).padStart(3)}  ${r.servings} sv  ${r.id}`,
  )
}

console.log('\n=== all servings ===')
for (const r of rows) {
  console.log(
    `${Math.round(r.kcal).toString().padStart(5)}  P${r.protein.toFixed(1).padStart(5)} C${r.carbs.toFixed(1).padStart(5)} F${r.fat.toFixed(1).padStart(5)}  x${String(r.servings).padStart(2)}  ${r.id}`,
  )
}

console.log('\n=== issues ===')
for (const i of issues) console.log(`${i.level.toUpperCase()}: ${i.msg}`)
console.log(`\n${issues.filter((i) => i.level === 'error').length} errors, ${issues.filter((i) => i.level === 'warn').length} warnings`)
