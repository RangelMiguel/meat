import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChefHat, Search, ShoppingCart, Sparkles } from 'lucide-react'
import {
  CUISINE_OPTIONS,
  getIngredient,
  recipeCuisine,
  type Cuisine,
  type Recipe,
} from '../data/catalog'
import { formatAmount } from '../lib/calories'
import {
  canMakeServings,
  compareRecipeToInventory,
  formatServings,
  MEAL_SHARE,
  recipePerServingMacros,
  roundServings,
  scaleMacros,
  suggestPortion,
} from '../lib/portions'
import {
  categoryLabel,
  cuisineName,
  ingredientName,
  mealLabel,
  recipeName,
  t,
  type Locale,
} from '../i18n'
import { MEAL_ORDER, type CaloriePlan, type MealType } from '../types'
import { EaterPicker } from './EaterPicker'

export interface RecipeEaterPortion {
  memberId: string
  name: string
  servings: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface RecipeLogPayload {
  meal: MealType
  name: string
  detail: string
  recipeId: string
  portions: RecipeEaterPortion[]
}

export interface RecipeEater {
  id: string
  name: string
  plan: CaloriePlan | null
  eatenToday: number
  mealEaten: Record<MealType, number>
}

interface Props {
  defaultMeal?: MealType
  recipes: Recipe[]
  locale: Locale
  eaters: RecipeEater[]
  selectedEaterIds: string[]
  onSelectedEatersChange: (ids: string[]) => void
  initialRecipeId?: string
  gramsOnHand: (ingredientId: string) => number
  onAddToPurchaseList: (items: { ingredientId: string; grams: number }[]) => void
  onInitialRecipeApplied?: () => void
  onSubmit: (payload: RecipeLogPayload) => void
  onCancel?: () => void
  onCustom?: () => void
}

export function LogRecipePanel({
  defaultMeal = 'Lunch',
  recipes,
  locale,
  eaters,
  selectedEaterIds,
  onSelectedEatersChange,
  initialRecipeId,
  gramsOnHand,
  onAddToPurchaseList,
  onInitialRecipeApplied,
  onSubmit,
  onCancel,
  onCustom,
}: Props) {
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState<Cuisine | 'all'>('all')
  const [meal, setMeal] = useState<MealType>(defaultMeal)
  const [recipeId, setRecipeId] = useState<string>(initialRecipeId ?? '')
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [manual, setManual] = useState(false)
  const [addedToList, setAddedToList] = useState(false)
  const [showShortageModal, setShowShortageModal] = useState(false)

  const selectedEaters = useMemo(
    () => eaters.filter((eater) => selectedEaterIds.includes(eater.id)),
    [eaters, selectedEaterIds],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = recipes.filter((r) => {
      if (cuisine !== 'all' && recipeCuisine(r) !== cuisine) return false
      if (!q) return true
      const label = cuisineName(locale, recipeCuisine(r)).toLowerCase()
      return (
        r.name.toLowerCase().includes(q) ||
        r.nameEs.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        categoryLabel(locale, r.category).toLowerCase().includes(q) ||
        label.includes(q) ||
        (r.region?.toLowerCase().includes(q) ?? false)
      )
    })
    return [...list]
      .sort((a, b) => recipeName(a, locale).localeCompare(recipeName(b, locale), locale))
      .slice(0, 48)
  }, [query, cuisine, recipes, locale])

  const recipe: Recipe | undefined = recipes.find((r) => r.id === recipeId)

  const perServing = useMemo(
    () => (recipe ? recipePerServingMacros(recipe) : null),
    [recipe],
  )

  const autoPortions = useMemo(() => {
    if (!perServing) return []
    return selectedEaters.map((eater) => {
      if (eater.plan) {
        return {
          eater,
          suggestion: suggestPortion({
            perServingKcal: perServing.kcal,
            dailyGoal: eater.plan.dailyCalories,
            eatenToday: eater.eatenToday,
            meal,
            mealEaten: eater.mealEaten[meal] ?? 0,
            locale,
          }),
        }
      }
      return {
        eater,
        suggestion: {
          servings: 1,
          targetKcal: Math.round(perServing.kcal),
          remainingDay: 0,
          remainingMeal: 0,
          mealBudget: 0,
          overBudget: false,
          explanation: t(locale, 'noCalorieData'),
        },
      }
    })
  }, [perServing, selectedEaters, meal, locale])

  const portions = useMemo(() => {
    if (!perServing) return []
    return autoPortions.map(({ eater, suggestion }) => {
      const servings = manual && overrides[eater.id] != null ? overrides[eater.id] : suggestion.servings
      const macros = scaleMacros(perServing, servings)
      return {
        memberId: eater.id,
        name: eater.name,
        servings,
        kcal: macros.kcal,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        remainingDay: suggestion.remainingDay,
      }
    })
  }, [autoPortions, overrides, manual, perServing])

  const totalServings = portions.reduce((sum, part) => sum + part.servings, 0)
  const totalMacros = portions.reduce(
    (acc, part) => ({
      kcal: acc.kcal + part.kcal,
      protein: acc.protein + part.protein,
      carbs: acc.carbs + part.carbs,
      fat: acc.fat + part.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )

  useEffect(() => {
    setAddedToList(false)
    setShowShortageModal(false)
  }, [totalServings, recipeId, selectedEaterIds.join('|')])

  useEffect(() => {
    setMeal(defaultMeal)
    setManual(false)
    setOverrides({})
  }, [defaultMeal])

  useEffect(() => {
    if (!initialRecipeId) return
    setRecipeId(initialRecipeId)
    setManual(false)
    setOverrides({})
    setAddedToList(false)
    onInitialRecipeApplied?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRecipeId])

  const shortages = useMemo(() => {
    if (!recipe || totalServings <= 0) return []
    return compareRecipeToInventory(recipe, totalServings, gramsOnHand).filter(
      (need) => need.shortfallGrams > 0,
    )
  }, [recipe, totalServings, gramsOnHand])

  const selectRecipe = (id: string) => {
    setRecipeId(id)
    setManual(false)
    setOverrides({})
    setAddedToList(false)
  }

  const addMissingToList = () => {
    onAddToPurchaseList(
      shortages.map((need) => ({
        ingredientId: need.ingredientId,
        grams: need.shortfallGrams,
      })),
    )
    setAddedToList(true)
    setShowShortageModal(false)
  }

  const applyPlanPortion = () => {
    setManual(false)
    setOverrides({})
  }

  const bumpEater = (memberId: string, delta: number) => {
    setManual(true)
    setOverrides((prev) => {
      const current =
        prev[memberId] ??
        portions.find((part) => part.memberId === memberId)?.servings ??
        1
      return { ...prev, [memberId]: roundServings(Math.min(3, Math.max(0.25, current + delta))) }
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!recipe || !perServing || portions.length === 0) return
    if (shortages.length > 0) {
      setShowShortageModal(true)
      return
    }
    onSubmit({
      meal,
      name: recipeName(recipe, locale),
      detail: t(locale, 'planAdapted', {
        servings: formatServings(totalServings, locale),
        kcal: Math.round(perServing.kcal),
      }),
      recipeId: recipe.id,
      portions,
    })
  }

  const minCover = Math.max(0.25, 0.25 * Math.max(1, selectedEaters.length))

  return (
    <form className="form-grid log-recipe" onSubmit={handleSubmit}>
      <EaterPicker
        locale={locale}
        eaters={eaters}
        selected={selectedEaterIds}
        onChange={onSelectedEatersChange}
      />

      <div className="form-row form-row-3">
        <div className="field">
          <label htmlFor="log-meal">{t(locale, 'meal')}</label>
          <select
            id="log-meal"
            value={meal}
            onChange={(e) => {
              setMeal(e.target.value as MealType)
              setManual(false)
              setOverrides({})
            }}
          >
            {MEAL_ORDER.map((m) => (
              <option key={m} value={m}>
                {mealLabel(locale, m)} · {Math.round(MEAL_SHARE[m] * 100)}%
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="log-cuisine">{t(locale, 'cuisine')}</label>
          <select
            id="log-cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value as Cuisine | 'all')}
          >
            <option value="all">{t(locale, 'allCuisines')}</option>
            {CUISINE_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {cuisineName(locale, c.id)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="log-search">{t(locale, 'findADish')}</label>
          <div className="search-wrap">
            <Search size={16} className="search-icon" aria-hidden />
            <input
              id="log-search"
              type="search"
              placeholder={t(locale, 'dishSearchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </div>

      <div className="recipe-picker-grid">
        {filtered.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`recipe-chip${recipeId === r.id ? ' is-active' : ''}${
              canMakeServings(r, minCover, gramsOnHand) ? '' : ' is-unavailable'
            }`}
            onClick={() => selectRecipe(r.id)}
          >
            <strong>{recipeName(r, locale)}</strong>
            <span>
              {cuisineName(locale, recipeCuisine(r))} · {categoryLabel(locale, r.category)}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="meal-empty">{t(locale, 'noDishesMatch')}</p>
        )}
      </div>

      {recipe && perServing && portions.length > 0 && (
        <div className="portion-panel">
          <div className="portion-head">
            <div>
              <h4>
                <ChefHat size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                {recipeName(recipe, locale)}
              </h4>
              <p className="sub">
                {t(locale, 'catalogServing', {
                  kcal: Math.round(perServing.kcal),
                  n: recipe.servings,
                })}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={applyPlanPortion}
              title={t(locale, 'fitMyPlanTitle')}
            >
              <Sparkles size={14} /> {t(locale, 'fitMyPlan')}
            </button>
          </div>

          <ul className="eater-portions">
            {portions.map((part) => (
              <li key={part.memberId}>
                <div>
                  <strong>{part.name}</strong>
                  <span>
                    {t(locale, 'eaterPortion', {
                      name: part.name,
                      servings: formatServings(part.servings, locale),
                      kcal: part.kcal,
                    }).replace(`${part.name}: `, '')}
                  </span>
                </div>
                <div className="eater-stepper">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => bumpEater(part.memberId, -0.25)}>
                    −
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => bumpEater(part.memberId, 0.25)}>
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="field-hint" style={{ marginBottom: '0.75rem' }}>
            {t(locale, 'cookTotal', { servings: formatServings(totalServings, locale) })}
          </p>

          <div className="result-grid portion-macros">
            <div className="result-tile">
              <span>{t(locale, 'calories')}</span>
              <strong>{totalMacros.kcal}</strong>
              <em>kcal</em>
            </div>
            <div className="result-tile">
              <span>{t(locale, 'protein')}</span>
              <strong>{Math.round(totalMacros.protein)}g</strong>
              <em>{t(locale, 'macros')}</em>
            </div>
            <div className="result-tile">
              <span>{t(locale, 'carbs')}</span>
              <strong>{Math.round(totalMacros.carbs)}g</strong>
              <em>{t(locale, 'macros')}</em>
            </div>
            <div className="result-tile">
              <span>{t(locale, 'fat')}</span>
              <strong>{Math.round(totalMacros.fat)}g</strong>
              <em>{t(locale, 'macros')}</em>
            </div>
          </div>

          {shortages.length > 0 && (
            <div className="alert alert-warning">
              <div>
                <strong>{t(locale, 'notEnough')}</strong>
                <p>
                  {t(locale, 'notEnoughBody', {
                    count: shortages.length,
                    noun: t(locale, shortages.length === 1 ? 'ingredientOne' : 'ingredientMany'),
                  })}
                </p>
                <ul className="shortage-list">
                  {shortages.map((need) => (
                    <li key={need.ingredientId}>
                      {t(locale, 'shortageLine', {
                        name: ingredientName(
                          getIngredient(need.ingredientId) ?? {
                            name: need.name,
                            nameEs: need.name,
                          },
                          locale,
                        ),
                        need: formatAmount(need.needGrams, need.unit),
                        have: formatAmount(need.haveGrams, need.unit),
                        short: formatAmount(need.shortfallGrams, need.unit),
                      })}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addMissingToList}
                  disabled={addedToList}
                >
                  <ShoppingCart size={14} />
                  {addedToList ? t(locale, 'addedToList') : t(locale, 'addMissing')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!recipe && (
        <div className="empty-results">
          <p>{t(locale, 'pickDish')}</p>
        </div>
      )}

      {showShortageModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowShortageModal(false)}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-labelledby="shortage-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="shortage-title">{t(locale, 'notEnough')}</h3>
            <p>
              {t(locale, 'cannotLog', {
                name: recipe ? recipeName(recipe, locale) : '',
                servings: formatServings(totalServings, locale),
              })}
            </p>
            <ul className="shortage-list">
              {shortages.map((need) => (
                <li key={need.ingredientId}>
                  {t(locale, 'shortageLine', {
                    name: ingredientName(
                      getIngredient(need.ingredientId) ?? {
                        name: need.name,
                        nameEs: need.name,
                      },
                      locale,
                    ),
                    need: formatAmount(need.needGrams, need.unit),
                    have: formatAmount(need.haveGrams, need.unit),
                    short: formatAmount(need.shortfallGrams, need.unit),
                  })}
                </li>
              ))}
            </ul>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={addMissingToList}>
                <ShoppingCart size={16} />
                {t(locale, 'addToPurchaseList')}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowShortageModal(false)}
              >
                {t(locale, 'close')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="btn-row">
        <button className="btn btn-primary" type="submit" disabled={!recipe || portions.length === 0}>
          {t(locale, 'logAdapted')}
        </button>
        {onCustom && (
          <button className="btn btn-secondary" type="button" onClick={onCustom}>
            {t(locale, 'customInstead')}
          </button>
        )}
        {onCancel && (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            {t(locale, 'cancel')}
          </button>
        )}
      </div>
    </form>
  )
}
