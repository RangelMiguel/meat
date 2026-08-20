import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ShoppingCart,
  Shuffle,
  Snowflake,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import {
  CUISINE_OPTIONS,
  getIngredient,
  recipeCuisine,
  type Cuisine,
  type Recipe,
} from '../data/catalog'
import type { AppStore } from '../hooks/useAppStore'
import {
  categoryLabel,
  cuisineName,
  ingredientName,
  mealLabel,
  recipeName,
  t,
} from '../i18n'
import { formatAmount, todayKey, uid } from '../lib/calories'
import {
  formatMacrosLine,
  recipePerServingMacros,
  roundServings,
  scaleMacros,
} from '../lib/portions'
import {
  addDays,
  buildRandomWeekPlan,
  buildWeekShopping,
  mondayOf,
  servingsForPlan,
  slotsInWeek,
  storageLines,
  weekDates,
  weekdayLong,
  weekRangeLabel,
} from '../lib/weekPlan'
import { MEAL_ORDER, type MealType, type Member, type WeekMealSlot } from '../types'
import { EaterPicker } from './EaterPicker'

interface Props {
  store: AppStore
  memberId: string
  onSelectMember: (memberId: string) => void
  onNeedPlan: () => void
  onGoPurchase: () => void
}

type Scope = 'all' | string

export function WeekPlanView({ store, memberId, onSelectMember, onNeedPlan, onGoPurchase }: Props) {
  const locale = store.locale
  const today = todayKey()
  const planners = useMemo(() => store.household.filter((item) => item.plan), [store.household])
  const [weekStart, setWeekStart] = useState(() => mondayOf(today))
  const [scope, setScope] = useState<Scope>(() => (planners.length > 1 ? 'all' : memberId))
  const [picker, setPicker] = useState<{ date: string; meal: MealType } | null>(null)
  const [eaterIds, setEaterIds] = useState<string[]>(() => planners.map((item) => item.id))
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState<Cuisine | 'all'>('all')
  const [added, setAdded] = useState(false)

  const member =
    store.household.find((item) => item.id === (scope === 'all' ? memberId : scope)) ??
    store.myMember ??
    store.household[0]
  const slots = store.weekPlan.slots
  const householdMode = planners.length > 1 && scope === 'all'

  useEffect(() => {
    setAdded(false)
  }, [weekStart, slots, store.purchaseList])

  useEffect(() => {
    setEaterIds((ids) => {
      const valid = ids.filter((id) => planners.some((item) => item.id === id))
      if (valid.length > 0) return valid
      return planners.map((item) => item.id)
    })
  }, [planners])

  const weekSlotList = useMemo(() => slotsInWeek(slots, weekStart), [slots, weekStart])
  const visibleSlots = useMemo(
    () =>
      householdMode
        ? weekSlotList
        : weekSlotList.filter((slot) => slot.memberId === (scope === 'all' ? member?.id : scope)),
    [weekSlotList, householdMode, scope, member?.id],
  )
  const shopSlots = weekSlotList
  const days = useMemo(() => weekDates(weekStart), [weekStart])

  const shopping = useMemo(
    () =>
      buildWeekShopping({
        slots: shopSlots,
        recipesById: store.recipeById,
        gramsOnHand: store.gramsOnHand,
        purchaseList: store.purchaseList,
        shopDate: weekStart,
      }),
    [shopSlots, store.recipeById, store.gramsOnHand, store.purchaseList, weekStart],
  )

  const toAdd = shopping.filter((item) => item.addGrams > 0)
  const plannedKcal = useMemo(() => {
    return visibleSlots.reduce((sum, slot) => {
      const recipe = store.recipeById(slot.recipeId)
      if (!recipe) return sum
      return sum + Math.round(recipePerServingMacros(recipe).kcal * slot.servings)
    }, 0)
  }, [visibleSlots, store])
  const weekGoal = householdMode
    ? planners.reduce((sum, item) => sum + (item.plan?.dailyCalories ?? 0) * 7, 0)
    : (member?.plan?.dailyCalories ?? 0) * 7
  const shoppers = useMemo(() => {
    const ids = new Set(weekSlotList.map((slot) => slot.memberId))
    return store.household.filter((item) => ids.has(item.id))
  }, [weekSlotList, store.household])

  const persist = (next: WeekMealSlot[]) => {
    store.saveWeekPlan(next)
  }

  const openPicker = (date: string, meal: MealType, presetIds?: string[]) => {
    setPicker({ date, meal })
    setQuery('')
    if (presetIds && presetIds.length > 0) {
      setEaterIds(presetIds)
    } else if (householdMode) {
      setEaterIds(planners.map((item) => item.id))
    } else if (member) {
      setEaterIds([member.id])
    }
  }

  const setDishForEaters = (date: string, meal: MealType, recipeId: string, ids: string[]) => {
    const recipe = store.recipeById(recipeId)
    if (!recipe || ids.length === 0) return
    const targets = new Set(ids)
    const keep = slots.filter(
      (slot) => !(slot.date === date && slot.meal === meal && targets.has(slot.memberId)),
    )
    const addedSlots: WeekMealSlot[] = []
    for (const id of ids) {
      const person = planners.find((item) => item.id === id) ?? store.household.find((item) => item.id === id)
      const daily = person?.plan?.dailyCalories
      if (!daily) continue
      addedSlots.push({
        id: uid(),
        date,
        meal,
        recipeId,
        servings: servingsForPlan(recipe, daily, meal),
        memberId: id,
      })
    }
    persist([...keep, ...addedSlots])
    setPicker(null)
    setQuery('')
  }

  const updateServings = (slotId: string, servings: number) => {
    persist(slots.map((slot) => (slot.id === slotId ? { ...slot, servings } : slot)))
  }

  const clearSlot = (slotId: string) => {
    persist(slots.filter((slot) => slot.id !== slotId))
  }

  const clearSlots = (slotIds: string[]) => {
    const drop = new Set(slotIds)
    persist(slots.filter((slot) => !drop.has(slot.id)))
  }

  const peopleInScope = householdMode ? planners : member ? [member] : []

  const clearWeek = () => {
    if (peopleInScope.length === 0) return
    const confirmKey = householdMode ? 'clearWeekHouseholdConfirm' : 'clearWeekConfirm'
    if (!confirm(t(locale, confirmKey))) return
    const ids = new Set(peopleInScope.map((item) => item.id))
    persist(
      slots.filter((slot) => {
        const inWeek = slot.date >= weekStart && slot.date <= addDays(weekStart, 6)
        return !(inWeek && ids.has(slot.memberId))
      }),
    )
  }

  const addShopping = () => {
    if (toAdd.length === 0) return
    store.addToPurchaseList(toAdd.map((item) => ({ ingredientId: item.ingredientId, grams: item.addGrams })))
    setAdded(true)
  }

  const fillRandomWeek = () => {
    const people = peopleInScope.filter((item) => item.plan)
    if (people.length === 0) return
    const hasDishes = visibleSlots.length > 0
    const confirmKey = householdMode ? 'randomWeekHouseholdConfirm' : 'randomWeekConfirm'
    if (hasDishes && !confirm(t(locale, confirmKey))) return
    const generated = buildRandomWeekPlan({
      weekStart,
      members: people.map((item) => ({
        id: item.id,
        dailyCalories: item.plan!.dailyCalories,
      })),
      recipes: store.recipes,
    })
    if (generated.length === 0) return
    const ids = new Set(people.map((item) => item.id))
    const keep = slots.filter((slot) => {
      const inWeek = slot.date >= weekStart && slot.date <= addDays(weekStart, 6)
      return !(inWeek && ids.has(slot.memberId))
    })
    persist([...keep, ...generated])
  }

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return store.recipes
      .filter((recipe) => {
        if (cuisine !== 'all' && recipeCuisine(recipe) !== cuisine) return false
        if (!q) return true
        const label = cuisineName(locale, recipeCuisine(recipe)).toLowerCase()
        return (
          recipe.name.toLowerCase().includes(q) ||
          recipe.nameEs.toLowerCase().includes(q) ||
          label.includes(q) ||
          categoryLabel(locale, recipe.category).toLowerCase().includes(q) ||
          (recipe.region?.toLowerCase().includes(q) ?? false)
        )
      })
      .sort((a, b) => recipeName(a, locale).localeCompare(recipeName(b, locale), locale))
      .slice(0, 48)
  }, [query, cuisine, store.recipes, locale])

  if (planners.length === 0) {
    return (
      <div className="stack-lg">
        <div className="section-title">
          <h2>{t(locale, 'weekTitle')}</h2>
        </div>
        <div className="card">
          <div className="empty-state" style={{ padding: '1.5rem 0.5rem' }}>
            <div className="empty-icon">
              <UtensilsCrossed size={28} />
            </div>
            <h2>{t(locale, 'noPlanWeekTitle')}</h2>
            <p>{t(locale, 'noPlanWeekBody')}</p>
            <button type="button" className="btn btn-primary" onClick={onNeedPlan}>
              {t(locale, 'createPlan')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'weekTitle')}</h2>
        <span>{t(locale, 'weekSub')}</span>
      </div>

      {planners.length > 1 && (
        <div className="theme-pills" role="tablist" aria-label={t(locale, 'weekTitle')}>
          <button
            type="button"
            role="tab"
            aria-selected={householdMode}
            className={`theme-pill${householdMode ? ' is-active' : ''}`}
            onClick={() => setScope('all')}
          >
            {t(locale, 'weekEveryone')}
          </button>
          {planners.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={scope === item.id}
              className={`theme-pill${scope === item.id ? ' is-active' : ''}`}
              onClick={() => {
                setScope(item.id)
                onSelectMember(item.id)
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <div className="card week-nav-card">
        <div className="week-nav">
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label={t(locale, 'prevWeek')}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="week-nav-copy">
            <strong>
              {weekStart === mondayOf(today) ? t(locale, 'thisWeek') : weekRangeLabel(weekStart, locale)}
            </strong>
            <span>{weekRangeLabel(weekStart, locale)}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label={t(locale, 'nextWeek')}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="week-nav-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={fillRandomWeek}>
            <Shuffle size={14} />
            {t(locale, 'randomWeek')}
          </button>
          {visibleSlots.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearWeek}>
              {t(locale, 'clearWeek')}
            </button>
          )}
        </div>
      </div>

      {weekGoal > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h4>{t(locale, 'weekTotals')}</h4>
              <p className="sub">
                {householdMode ? t(locale, 'weekHouseholdHint') : t(locale, 'weekPickedHint')}
              </p>
            </div>
          </div>
          <div className="result-grid">
            <div className="result-tile">
              <span>{t(locale, 'weekGoal')}</span>
              <strong>{weekGoal}</strong>
              <em>kcal</em>
            </div>
            <div className="result-tile">
              <span>{t(locale, 'weekPicked')}</span>
              <strong>{plannedKcal}</strong>
              <em>kcal</em>
            </div>
            <div className="result-tile">
              <span>{t(locale, 'dishes')}</span>
              <strong>
                {householdMode
                  ? new Set(visibleSlots.map((slot) => `${slot.date}|${slot.meal}|${slot.recipeId}`)).size
                  : visibleSlots.length}
              </strong>
              <em>
                {householdMode
                  ? t(locale, 'peopleCount', { count: planners.length })
                  : t(locale, visibleSlots.length === 1 ? 'itemOne' : 'itemMany')}
              </em>
            </div>
          </div>
        </div>
      )}

      <div className="week-days">
        {days.map((date) => (
          <div key={date} className="card week-day">
            <div className="week-day-head">
              <strong>{weekdayLong(date, locale)}</strong>
              {date === today && <span className="badge badge-neutral">{t(locale, 'today')}</span>}
            </div>
            <ul className="week-slots">
              {MEAL_ORDER.map((meal) => {
                const mealSlots = visibleSlots.filter((item) => item.date === date && item.meal === meal)
                const groups = groupByRecipe(mealSlots)
                return (
                  <li key={meal} className="week-slot">
                    <div className="week-slot-meal">{mealLabel(locale, meal)}</div>
                    {groups.length === 0 ? (
                      <button
                        type="button"
                        className="week-slot-add"
                        onClick={() => openPicker(date, meal)}
                      >
                        <Plus size={14} />
                        {t(locale, 'addDish')}
                      </button>
                    ) : (
                      <div className="week-slot-groups">
                        {groups.map((group) => {
                          const recipe = store.recipeById(group.recipeId)
                          if (!recipe) return null
                          return (
                            <DishGroup
                              key={group.recipeId}
                              locale={locale}
                              recipe={recipe}
                              groupSlots={group.slots}
                              household={store.household}
                              showNames={householdMode || group.slots.length > 1}
                              onUpdateServings={updateServings}
                              onClearSlot={clearSlot}
                              onClearGroup={() => clearSlots(group.slots.map((slot) => slot.id))}
                              onChange={() =>
                                openPicker(
                                  date,
                                  meal,
                                  group.slots.map((slot) => slot.memberId),
                                )
                              }
                            />
                          )
                        })}
                        {householdMode && mealSlots.length < planners.length && (
                          <button
                            type="button"
                            className="week-slot-add"
                            onClick={() => {
                              const taken = new Set(mealSlots.map((slot) => slot.memberId))
                              openPicker(
                                date,
                                meal,
                                planners.filter((item) => !taken.has(item.id)).map((item) => item.id),
                              )
                            }}
                          >
                            <Plus size={14} />
                            {t(locale, 'addDish')}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {visibleSlots.length === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: '1.25rem 0.5rem' }}>
            <div className="empty-icon">
              <UtensilsCrossed size={28} />
            </div>
            <h2>{t(locale, 'weekEmpty')}</h2>
            <p>{t(locale, 'weekEmptyBody')}</p>
          </div>
        </div>
      )}

      {shopSlots.length > 0 && (
        <div className="week-shop-layout">
          <div className="card">
            <div className="card-header">
              <div>
                <h4>{t(locale, 'shopForWeek')}</h4>
                <p className="sub">{t(locale, 'shopForWeekSub')}</p>
              </div>
              <span className="badge badge-neutral">{shopping.filter((item) => item.buyGrams > 0).length}</span>
            </div>
            {shoppers.length > 1 && (
              <p className="field-hint" style={{ marginTop: 0 }}>
                {t(locale, 'includesMembers', { names: shoppers.map((item) => item.name).join(', ') })}
              </p>
            )}
            {shopping.filter((item) => item.buyGrams > 0).length === 0 ? (
              <p className="field-hint">{t(locale, 'nothingToBuyWeek')}</p>
            ) : (
              <ul className="inventory-lots">
                {shopping
                  .filter((item) => item.buyGrams > 0)
                  .map((item) => {
                    const ingredient = getIngredient(item.ingredientId)
                    const label = ingredient
                      ? ingredientName(ingredient, locale)
                      : item.name
                    return (
                      <li key={item.ingredientId} className="inventory-lot">
                        <div className="inventory-lot-copy">
                          <strong>{label}</strong>
                          <p>
                            {t(locale, 'buyAmount', { amount: formatAmount(item.buyGrams, item.unit) })}
                            {item.haveGrams > 0
                              ? ` · ${t(locale, 'onHandHave', { have: formatAmount(item.haveGrams, item.unit) })}`
                              : ''}
                            {item.alreadyOnListGrams > 0
                              ? ` · ${t(locale, 'alreadyListed', { amount: formatAmount(item.alreadyOnListGrams, item.unit) })}`
                              : ''}
                          </p>
                        </div>
                      </li>
                    )
                  })}
              </ul>
            )}
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={toAdd.length === 0 || added}
                onClick={addShopping}
              >
                <ShoppingCart size={16} />
                {added
                  ? t(locale, 'weekAddedToList')
                  : t(locale, 'addWeekToList', { count: toAdd.length })}
              </button>
              {added && (
                <button type="button" className="btn btn-secondary" onClick={onGoPurchase}>
                  {t(locale, 'navPurchase')}
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h4>{t(locale, 'storeHow')}</h4>
                <p className="sub">{t(locale, 'storeHowSub')}</p>
              </div>
              <Snowflake size={18} />
            </div>
            <p className="field-hint" style={{ marginTop: 0 }}>
              {t(locale, 'weekShopHint', {
                date: weekdayLong(weekStart, locale),
              })}
            </p>
            <ul className="storage-list">
              {shopping.map((item) => {
                const ingredient = getIngredient(item.ingredientId)
                const label = ingredient ? ingredientName(ingredient, locale) : item.name
                const lines = storageLines(item, locale)
                if (lines.length === 0) return null
                return (
                  <li key={item.ingredientId} className="storage-item">
                    <strong>{label}</strong>
                    {lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {picker && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPicker(null)}>
          <div
            className="modal-card week-picker-modal"
            role="dialog"
            aria-labelledby="week-picker-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="week-picker-title">
              {t(locale, 'pickWeekDish')} · {mealLabel(locale, picker.meal)}
            </h3>
            <p>
              {weekdayLong(picker.date, locale)} ·{' '}
              {householdMode || eaterIds.length > 1
                ? t(locale, 'suggestedForHousehold', {
                    meal: mealLabel(locale, picker.meal).toLowerCase(),
                  })
                : t(locale, 'suggestedForSlot', {
                    meal: mealLabel(locale, picker.meal).toLowerCase(),
                  })}
            </p>
            <EaterPicker
              locale={locale}
              eaters={planners}
              selected={eaterIds}
              onChange={setEaterIds}
              hint={t(locale, 'weekEatersHint')}
            />
            <div className="form-row form-row-3" style={{ marginTop: '0.85rem' }}>
              <div className="field">
                <label htmlFor="week-cuisine">{t(locale, 'cuisine')}</label>
                <select
                  id="week-cuisine"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value as Cuisine | 'all')}
                >
                  <option value="all">{t(locale, 'allCuisines')}</option>
                  {CUISINE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {cuisineName(locale, opt.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="week-dish-search">{t(locale, 'findADish')}</label>
                <div className="search-wrap">
                  <Search size={16} className="search-icon" aria-hidden />
                  <input
                    id="week-dish-search"
                    type="search"
                    placeholder={t(locale, 'dishSearchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <div className="recipe-picker-grid week-picker-grid">
              {filteredRecipes.map((recipe) => {
                const per = recipePerServingMacros(recipe)
                const selectedPeople = eaterIds
                  .map((id) => planners.find((item) => item.id === id))
                  .filter((item): item is Member => Boolean(item?.plan))
                const preview =
                  selectedPeople.length === 1
                    ? String(servingsForPlan(recipe, selectedPeople[0].plan!.dailyCalories, picker.meal))
                    : selectedPeople
                        .map(
                          (person) =>
                            `${person.name} ${servingsForPlan(recipe, person.plan!.dailyCalories, picker.meal)}`,
                        )
                        .join(' · ')
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    className="recipe-chip"
                    disabled={eaterIds.length === 0}
                    onClick={() => setDishForEaters(picker.date, picker.meal, recipe.id, eaterIds)}
                  >
                    <strong>{recipeName(recipe, locale)}</strong>
                    <span>
                      {cuisineName(locale, recipeCuisine(recipe))} · {Math.round(per.kcal)} kcal
                      {preview ? ` · ${preview}` : ''}
                    </span>
                  </button>
                )
              })}
              {filteredRecipes.length === 0 && <p className="meal-empty">{t(locale, 'noDishesMatch')}</p>}
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={() => setPicker(null)}>
                {t(locale, 'cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function groupByRecipe(slots: WeekMealSlot[]): { recipeId: string; slots: WeekMealSlot[] }[] {
  const order: string[] = []
  const map = new Map<string, WeekMealSlot[]>()
  for (const slot of slots) {
    const list = map.get(slot.recipeId)
    if (list) list.push(slot)
    else {
      map.set(slot.recipeId, [slot])
      order.push(slot.recipeId)
    }
  }
  return order.map((recipeId) => ({ recipeId, slots: map.get(recipeId) ?? [] }))
}

function DishGroup({
  locale,
  recipe,
  groupSlots,
  household,
  showNames,
  onUpdateServings,
  onClearSlot,
  onClearGroup,
  onChange,
}: {
  locale: AppStore['locale']
  recipe: Recipe
  groupSlots: WeekMealSlot[]
  household: Member[]
  showNames: boolean
  onUpdateServings: (slotId: string, servings: number) => void
  onClearSlot: (slotId: string) => void
  onClearGroup: () => void
  onChange: () => void
}) {
  const totalMacros = groupSlots.reduce(
    (acc, slot) => {
      const part = scaleMacros(recipePerServingMacros(recipe), slot.servings)
      return {
        kcal: acc.kcal + part.kcal,
        protein: acc.protein + part.protein,
        carbs: acc.carbs + part.carbs,
        fat: acc.fat + part.fat,
      }
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return (
    <div className="week-slot-body week-dish-group">
      <div className="week-slot-copy">
        <strong>{recipeName(recipe, locale)}</strong>
        <p>{formatMacrosLine(totalMacros)}</p>
      </div>
      <ul className="week-eaters">
        {groupSlots.map((slot) => {
          const person = household.find((item) => item.id === slot.memberId)
          const macros = scaleMacros(recipePerServingMacros(recipe), slot.servings)
          return (
            <li key={slot.id} className="week-eater">
              {showNames && (
                <span className="week-eater-name">{person?.name ?? slot.memberId}</span>
              )}
              <div className="eater-stepper">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onUpdateServings(slot.id, roundServings(slot.servings - 0.25))}
                  aria-label="−"
                >
                  −
                </button>
                <span className="week-servings">{slot.servings}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onUpdateServings(slot.id, roundServings(Math.min(3, slot.servings + 0.25)))}
                  aria-label="+"
                >
                  +
                </button>
              </div>
              <span className="week-eater-kcal">{Math.round(macros.kcal)} kcal</span>
              {showNames && (
                <button
                  type="button"
                  className="btn btn-ghost btn-icon icon-danger"
                  onClick={() => onClearSlot(slot.id)}
                  aria-label={t(locale, 'removeEaterFromMeal', { name: person?.name ?? '' })}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <div className="week-slot-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onChange}>
          {t(locale, 'changeDish')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon icon-danger"
          onClick={onClearGroup}
          aria-label={t(locale, 'clearSlot')}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
