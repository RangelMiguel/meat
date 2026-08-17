import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ShoppingCart,
  Snowflake,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import {
  CUISINE_OPTIONS,
  getIngredient,
  recipeCuisine,
  type Cuisine,
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
  suggestPortion,
} from '../lib/portions'
import {
  addDays,
  buildWeekShopping,
  mondayOf,
  slotsInWeek,
  storageLines,
  upcomingSlots,
  weekDates,
  weekdayLong,
  weekRangeLabel,
} from '../lib/weekPlan'
import { MEAL_ORDER, type MealType, type WeekMealSlot } from '../types'

interface Props {
  store: AppStore
  memberId: string
  onSelectMember: (memberId: string) => void
  onNeedPlan: () => void
  onGoPurchase: () => void
}

export function WeekPlanView({ store, memberId, onSelectMember, onNeedPlan, onGoPurchase }: Props) {
  const locale = store.locale
  const today = todayKey()
  const [weekStart, setWeekStart] = useState(() => mondayOf(today))
  const [picker, setPicker] = useState<{ date: string; meal: MealType } | null>(null)
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState<Cuisine | 'all'>('all')
  const [added, setAdded] = useState(false)

  const member =
    store.household.find((item) => item.id === memberId) ?? store.myMember ?? store.household[0]
  const plan = member?.plan ?? null
  const slots = store.weekPlan.slots

  useEffect(() => {
    setAdded(false)
  }, [weekStart, slots, store.purchaseList])

  const weekSlotList = useMemo(() => slotsInWeek(slots, weekStart), [slots, weekStart])
  const memberSlots = useMemo(
    () => weekSlotList.filter((slot) => slot.memberId === member?.id),
    [weekSlotList, member?.id],
  )
  const shopSlots = useMemo(
    () => upcomingSlots(weekSlotList, weekStart, today),
    [weekSlotList, weekStart, today],
  )
  const days = useMemo(() => weekDates(weekStart), [weekStart])

  const shopping = useMemo(
    () =>
      buildWeekShopping({
        slots: shopSlots,
        recipesById: store.recipeById,
        gramsOnHand: store.gramsOnHand,
        purchaseList: store.purchaseList,
        shopDate: today >= weekStart ? today : weekStart,
      }),
    [shopSlots, store.recipeById, store.gramsOnHand, store.purchaseList, today, weekStart],
  )

  const toAdd = shopping.filter((item) => item.addGrams > 0)
  const plannedKcal = useMemo(() => {
    return memberSlots.reduce((sum, slot) => {
      const recipe = store.recipeById(slot.recipeId)
      if (!recipe) return sum
      return sum + Math.round(recipePerServingMacros(recipe).kcal * slot.servings)
    }, 0)
  }, [memberSlots, store])
  const weekGoal = (plan?.dailyCalories ?? 0) * 7

  const persist = (next: WeekMealSlot[]) => {
    store.saveWeekPlan(next)
  }

  const setSlot = (date: string, meal: MealType, recipeId: string, servings: number) => {
    if (!member) return
    const existing = slots.find(
      (slot) => slot.date === date && slot.meal === meal && slot.memberId === member.id,
    )
    const next = existing
      ? slots.map((slot) =>
          slot.id === existing.id ? { ...slot, recipeId, servings } : slot,
        )
      : [
          ...slots,
          {
            id: uid(),
            date,
            meal,
            recipeId,
            servings,
            memberId: member.id,
          },
        ]
    persist(next)
    setPicker(null)
    setQuery('')
  }

  const updateServings = (slotId: string, servings: number) => {
    persist(slots.map((slot) => (slot.id === slotId ? { ...slot, servings } : slot)))
  }

  const clearSlot = (slotId: string) => {
    persist(slots.filter((slot) => slot.id !== slotId))
  }

  const clearWeek = () => {
    if (!member) return
    if (!confirm(t(locale, 'clearWeekConfirm'))) return
    const keep = slots.filter((slot) => {
      const inWeek = slot.date >= weekStart && slot.date <= addDays(weekStart, 6)
      return !(inWeek && slot.memberId === member.id)
    })
    persist(keep)
  }

  const addShopping = () => {
    if (toAdd.length === 0) return
    store.addToPurchaseList(toAdd.map((item) => ({ ingredientId: item.ingredientId, grams: item.addGrams })))
    setAdded(true)
  }

  const planners = useMemo(() => {
    const ids = new Set(weekSlotList.map((slot) => slot.memberId))
    return store.household.filter((item) => ids.has(item.id))
  }, [weekSlotList, store.household])

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

  if (!member || !plan) {
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

      {store.household.length > 1 && (
        <div className="theme-pills" role="tablist" aria-label={t(locale, 'weekTitle')}>
          {store.household.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === member.id}
              className={`theme-pill${item.id === member.id ? ' is-active' : ''}`}
              onClick={() => onSelectMember(item.id)}
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
        {memberSlots.length > 0 && (
          <div className="week-nav-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearWeek}>
              {t(locale, 'clearWeek')}
            </button>
          </div>
        )}
      </div>

      {weekGoal > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h4>{t(locale, 'weekTotals')}</h4>
              <p className="sub">{t(locale, 'editPlanFor', { name: member.name })}</p>
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
              <strong>{memberSlots.length}</strong>
              <em>{t(locale, memberSlots.length === 1 ? 'itemOne' : 'itemMany')}</em>
            </div>
          </div>
        </div>
      )}

      <div className="week-days">
        {days.map((date) => {
          const past = date < today
          return (
            <div key={date} className={`card week-day${past ? ' is-past' : ''}`}>
              <div className="week-day-head">
                <strong>{weekdayLong(date, locale)}</strong>
                {date === today && <span className="badge badge-neutral">{t(locale, 'today')}</span>}
              </div>
              <ul className="week-slots">
                {MEAL_ORDER.map((meal) => {
                  const slot = memberSlots.find((item) => item.date === date && item.meal === meal)
                  const recipe = slot ? store.recipeById(slot.recipeId) : undefined
                  const macros =
                    recipe && slot ? scaleMacros(recipePerServingMacros(recipe), slot.servings) : null
                  return (
                    <li key={meal} className="week-slot">
                      <div className="week-slot-meal">{mealLabel(locale, meal)}</div>
                      {slot && recipe ? (
                        <div className="week-slot-body">
                          <div className="week-slot-copy">
                            <strong>{recipeName(recipe, locale)}</strong>
                            <p>{macros ? formatMacrosLine(macros) : ''}</p>
                          </div>
                          <div className="week-slot-actions">
                            <div className="eater-stepper">
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => updateServings(slot.id, roundServings(slot.servings - 0.25))}
                                aria-label="−"
                              >
                                −
                              </button>
                              <span className="week-servings">{slot.servings}</span>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() =>
                                  updateServings(slot.id, roundServings(Math.min(3, slot.servings + 0.25)))
                                }
                                aria-label="+"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setPicker({ date, meal })
                                setQuery('')
                              }}
                            >
                              {t(locale, 'changeDish')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon icon-danger"
                              onClick={() => clearSlot(slot.id)}
                              aria-label={t(locale, 'clearSlot')}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="week-slot-add"
                          onClick={() => {
                            setPicker({ date, meal })
                            setQuery('')
                          }}
                        >
                          <Plus size={14} />
                          {t(locale, 'addDish')}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {memberSlots.length === 0 && (
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
            {planners.length > 1 && (
              <p className="field-hint" style={{ marginTop: 0 }}>
                {t(locale, 'includesMembers', { names: planners.map((item) => item.name).join(', ') })}
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
                date: weekdayLong(today >= weekStart ? today : weekStart, locale),
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
              {weekdayLong(picker.date, locale)} · {t(locale, 'suggestedForSlot', { meal: mealLabel(locale, picker.meal).toLowerCase() })}
            </p>
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
                const suggestion = suggestPortion({
                  perServingKcal: per.kcal,
                  dailyGoal: plan.dailyCalories,
                  eatenToday: 0,
                  meal: picker.meal,
                  mealEaten: 0,
                  locale,
                })
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    className="recipe-chip"
                    onClick={() => setSlot(picker.date, picker.meal, recipe.id, suggestion.servings)}
                  >
                    <strong>{recipeName(recipe, locale)}</strong>
                    <span>
                      {cuisineName(locale, recipeCuisine(recipe))} · {Math.round(per.kcal)} kcal ·{' '}
                      {suggestion.servings}
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
