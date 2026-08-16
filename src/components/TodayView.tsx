import { useEffect, useMemo, useState } from 'react'
import { ChefHat, Droplets, Dumbbell, Plus, Trash2, Utensils } from 'lucide-react'
import { QUICK_FOODS } from '../lib/foods'
import { eatBackShare, mergeFuel, suggestFuel } from '../lib/exercises'
import { formatServings } from '../lib/portions'
import type { AppStore } from '../hooks/useAppStore'
import { LogExerciseForm } from './LogExerciseForm'
import { LogFoodForm, type LogFoodPayload } from './LogFoodForm'
import { LogRecipePanel, type RecipeEater, type RecipeLogPayload } from './LogRecipePanel'
import { MEAL_ORDER, type CookSession, type MealType } from '../types'
import { CalorieRing } from './CalorieRing'
import { ExerciseFuelCard } from './ExerciseFuelCard'
import { EaterPicker } from './EaterPicker'
import { exerciseLabel, mealLabel, recipeName, t } from '../i18n'

interface Props {
  store: AppStore
  onGoPlan: () => void
  prepareRecipeId?: string | null
  onPrepareHandled?: () => void
  onStartCooking: (session: CookSession) => void
}

type LogMode = 'closed' | 'recipe' | 'custom' | 'exercise'

export function TodayView({
  store,
  onGoPlan,
  prepareRecipeId,
  onPrepareHandled,
  onStartCooking,
}: Props) {
  const {
    todayTotals,
    entriesByMeal,
    today,
    locale,
    household,
    familyToday,
    householdGoal,
    householdMacros,
    family,
    todayBurned,
    todayExercises,
  } = store
  const [logMode, setLogMode] = useState<LogMode>(() => (prepareRecipeId ? 'recipe' : 'closed'))
  const [defaultMeal, setDefaultMeal] = useState<MealType>('Lunch')
  const [eaterIds, setEaterIds] = useState<string[]>(() => household.map((member) => member.id))

  useEffect(() => {
    setEaterIds((ids) => {
      const valid = ids.filter((id) => household.some((member) => member.id === id))
      if (valid.length > 0) return valid
      return household.map((member) => member.id)
    })
  }, [household])

  useEffect(() => {
    if (!prepareRecipeId) return
    setLogMode('recipe')
  }, [prepareRecipeId])

  const hasAnyPlan = household.some((member) => member.plan)
  const macros = householdMacros
  const goal = householdGoal

  const recipeEaters: RecipeEater[] = useMemo(
    () =>
      familyToday.map(({ member, totals, burned }) => {
        const mealEaten = {
          Breakfast: 0,
          Lunch: 0,
          Dinner: 0,
          Snack: 0,
        }
        for (const entry of member.entries) {
          if (entry.date === today) mealEaten[entry.meal] += entry.kcal
        }
        return {
          id: member.id,
          name: member.name,
          plan: member.plan
            ? {
                ...member.plan,
                dailyCalories:
                  member.plan.dailyCalories +
                  Math.round(burned * eatBackShare(member.plan.input.goal)),
              }
            : null,
          eatenToday: totals.kcal,
          mealEaten,
        }
      }),
    [familyToday, today],
  )

  const householdFuel = useMemo(() => {
    const parts = familyToday.flatMap(({ member, totals, burned }) => {
      if (!member.plan || burned <= 0) return []
      return [
        suggestFuel({
          burned,
          exercises: (member.exercises ?? []).filter((item) => item.date === today),
          goal: member.plan.input.goal,
          planKcal: member.plan.dailyCalories,
          planMacros: member.plan.macros,
          eatenKcal: totals.kcal,
          eatenProtein: totals.protein,
          eatenCarbs: totals.carbs,
          eatenFat: totals.fat,
        }),
      ]
    })
    return mergeFuel(parts)
  }, [familyToday, today])

  const budget = householdFuel?.targetKcal ?? goal

  const mealTotals = useMemo(() => {
    const out = {} as Record<MealType, number>
    for (const meal of MEAL_ORDER) {
      out[meal] = entriesByMeal[meal].reduce((s, e) => s + e.kcal, 0)
    }
    return out
  }, [entriesByMeal])

  if (!hasAnyPlan) {
    return (
      <div className="card empty-state">
        <div className="empty-icon">
          <Utensils size={28} />
        </div>
        <h2>{t(locale, 'setupPlanTitle')}</h2>
        <p>{t(locale, 'noHouseholdPlan')}</p>
        <button className="btn btn-primary btn-lg" type="button" onClick={onGoPlan}>
          {t(locale, 'createPlan')}
        </button>
      </div>
    )
  }

  const proteinTarget = householdFuel?.targetProteinG ?? macros.proteinG
  const carbsTarget = householdFuel?.targetCarbsG ?? macros.carbsG
  const fatTarget = householdFuel?.targetFatG ?? macros.fatG
  const proteinPct = proteinTarget
    ? Math.min((todayTotals.protein / proteinTarget) * 100, 100)
    : 0
  const carbsPct = carbsTarget ? Math.min((todayTotals.carbs / carbsTarget) * 100, 100) : 0
  const fatPct = fatTarget ? Math.min((todayTotals.fat / fatTarget) * 100, 100) : 0

  const openRecipeLog = (meal?: MealType) => {
    if (meal) setDefaultMeal(meal)
    setLogMode('recipe')
  }

  const handleRecipeLog = (payload: RecipeLogPayload) => {
    const ok = store.logRecipeWithInventory({
      meal: payload.meal,
      name: payload.name,
      detail: payload.detail,
      recipeId: payload.recipeId,
      portions: payload.portions,
    })
    if (!ok) return
    setLogMode('closed')
    onStartCooking({
      recipeId: payload.recipeId,
      servings: payload.portions.reduce((sum, part) => sum + part.servings, 0),
      meal: payload.meal,
      eaterNames: payload.portions.map((part) => part.name),
    })
  }

  const handleCustomLog = (payload: LogFoodPayload) => {
    store.addEntry(payload, eaterIds)
    setLogMode('closed')
  }

  const householdName = family?.name ?? store.myMember?.name ?? ''

  return (
    <div className="stack-lg">
      {household.length > 1 && (
        <div className="member-switch">
          {familyToday.map(({ member, totals, burned }) => {
            const personGoal =
              (member.plan?.dailyCalories ?? 0) +
              (member.plan ? Math.round(burned * eatBackShare(member.plan.input.goal)) : 0)
            return (
              <div key={member.id} className="member-chip is-static">
                <strong>{member.name}</strong>
                <em>
                  {personGoal
                    ? `${Math.round(totals.kcal)}/${personGoal}`
                    : t(locale, 'noPlanShort')}
                </em>
              </div>
            )
          })}
        </div>
      )}
      <section className="card hero-card">
        <CalorieRing
          eaten={todayTotals.kcal}
          goal={budget || todayTotals.kcal || 1}
          locale={locale}
        />
        <div className="today-copy">
          <p className="eyebrow">{t(locale, 'householdToday', { name: householdName })}</p>
          <h2>
            {todayTotals.kcal === 0
              ? t(locale, 'todayEmptyTitle')
              : budget > 0 && todayTotals.kcal > budget
                ? t(locale, 'todayOverTitle')
                : t(locale, 'todayRoomTitle')}
          </h2>
          <p>
            {t(locale, 'householdGoalLine', {
              eaten: Math.round(todayTotals.kcal),
              goal: budget,
            })}
            {todayBurned > 0 ? ` · ${t(locale, 'householdBurned', { kcal: todayBurned })}` : ''}
            {' · '}
            <strong>
              {t(locale, 'todayLeft', { kcal: Math.max(0, budget - todayTotals.kcal) })}
            </strong>
          </p>
          <div className="mini-stats">
            <div className="mini-stat">
              <span>{t(locale, 'protein')}</span>
              <strong>
                {Math.round(todayTotals.protein)}
                <small>/{proteinTarget}g</small>
              </strong>
            </div>
            <div className="mini-stat">
              <span>{t(locale, 'carbs')}</span>
              <strong>
                {Math.round(todayTotals.carbs)}
                <small>/{carbsTarget}g</small>
              </strong>
            </div>
            <div className="mini-stat">
              <span>{t(locale, 'fat')}</span>
              <strong>
                {Math.round(todayTotals.fat)}
                <small>/{fatTarget}g</small>
              </strong>
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" type="button" onClick={() => openRecipeLog()}>
              <ChefHat size={16} /> {t(locale, 'logADish')}
            </button>
            <button className="btn btn-secondary" type="button" onClick={onGoPlan}>
              {t(locale, 'editPlan')}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setLogMode('exercise')}>
              <Dumbbell size={16} /> {t(locale, 'logWorkout')}
            </button>
          </div>
        </div>
      </section>

      <section className="grid-2 today-mid">
        <div className="card">
          <div className="card-header">
            <div>
              <h4>{t(locale, 'macros')}</h4>
              <p className="sub">
                {householdFuel ? t(locale, 'macrosWithExercise') : t(locale, 'macrosSub')}
              </p>
            </div>
          </div>
          <div className="macro-list">
            <div className="macro-row">
              <div className="macro-meta">
                <strong>{t(locale, 'protein')}</strong>
                <span>
                  {Math.round(todayTotals.protein)}/{proteinTarget}g
                </span>
              </div>
              <div className="macro-track">
                <div className="macro-fill protein" style={{ width: `${proteinPct}%` }} />
              </div>
            </div>
            <div className="macro-row">
              <div className="macro-meta">
                <strong>{t(locale, 'carbs')}</strong>
                <span>
                  {Math.round(todayTotals.carbs)}/{carbsTarget}g
                </span>
              </div>
              <div className="macro-track">
                <div className="macro-fill carbs" style={{ width: `${carbsPct}%` }} />
              </div>
            </div>
            <div className="macro-row">
              <div className="macro-meta">
                <strong>{t(locale, 'fat')}</strong>
                <span>
                  {Math.round(todayTotals.fat)}/{fatTarget}g
                </span>
              </div>
              <div className="macro-track">
                <div className="macro-fill fat" style={{ width: `${fatPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h4>
                <Droplets size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                {t(locale, 'water')}
              </h4>
              <p className="sub">{t(locale, 'waterSub')}</p>
            </div>
          </div>
          {familyToday.map(({ member, water }) => {
            const waterGoal = member.plan?.waterGlasses ?? 8
            return (
              <div key={member.id} className="water-person">
                {household.length > 1 && <strong>{member.name}</strong>}
                <div className="water-row">
                  {Array.from({ length: waterGoal }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`water-glass${i < water ? ' is-full' : ''}`}
                      aria-label={`${member.name} ${t(locale, 'glassN', { n: i + 1 })}`}
                      onClick={() =>
                        store.setWater(today, i + 1 === water ? i : i + 1, member.id)
                      }
                    />
                  ))}
                </div>
                <div className="btn-row" style={{ marginTop: '0.45rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => store.setWater(today, Math.min(water + 1, waterGoal), member.id)}
                  >
                    <Plus size={14} /> {t(locale, 'addGlass')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {householdFuel && <ExerciseFuelCard locale={locale} fuel={householdFuel} />}

      {logMode === 'exercise' && (
        <section className="card">
          <div className="card-header">
            <div>
              <h4>{t(locale, 'logWorkout')}</h4>
              <p className="sub">{t(locale, 'exerciseSub')}</p>
            </div>
          </div>
          <LogExerciseForm
            locale={locale}
            members={household}
            selectedIds={eaterIds}
            onSelectedChange={setEaterIds}
            onSubmit={(payload) => {
              store.addExercise(payload)
              setLogMode('closed')
            }}
          />
          {todayExercises.length > 0 && (
            <ul className="exercise-list" style={{ marginTop: '0.85rem' }}>
              {todayExercises.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name || exerciseLabel(locale, item.kind)}</strong>
                    <p>
                      {household.length > 1 ? `${item.memberName} · ` : ''}
                      {t(locale, 'minutesShort', { n: item.minutes })}
                    </p>
                  </div>
                  <div className="food-kcal">
                    <strong>{item.kcal}</strong>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon icon-danger"
                      aria-label={t(locale, 'removeWorkout')}
                      onClick={() => store.removeExercise(item.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {logMode === 'recipe' && (
        <section className="card">
          <div className="card-header">
            <div>
              <h4>{t(locale, 'logDishTitle')}</h4>
              <p className="sub">{t(locale, 'logDishSub')}</p>
            </div>
          </div>
          <LogRecipePanel
            defaultMeal={defaultMeal}
            recipes={store.recipes}
            initialRecipeId={prepareRecipeId ?? undefined}
            gramsOnHand={store.gramsOnHand}
            onAddToPurchaseList={store.addToPurchaseList}
            onInitialRecipeApplied={onPrepareHandled}
            onSubmit={handleRecipeLog}
            locale={locale}
            eaters={recipeEaters}
            selectedEaterIds={eaterIds}
            onSelectedEatersChange={setEaterIds}
            onCancel={() => setLogMode('closed')}
            onCustom={() => setLogMode('custom')}
          />
        </section>
      )}

      {logMode === 'custom' && (
        <section className="card">
          <div className="card-header">
            <div>
              <h4>{t(locale, 'logCustomTitle')}</h4>
              <p className="sub">{t(locale, 'logCustomSub')}</p>
            </div>
          </div>
          <EaterPicker
            locale={locale}
            eaters={household}
            selected={eaterIds}
            onChange={setEaterIds}
          />
          <LogFoodForm
            defaultMeal={defaultMeal}
            locale={locale}
            onSubmit={handleCustomLog}
            onCancel={() => setLogMode('closed')}
          />
          <div className="btn-row" style={{ marginTop: '0.75rem' }}>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setLogMode('recipe')}>
              <ChefHat size={14} /> {t(locale, 'backToDishes')}
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'quickAddTitle')}</h4>
            <p className="sub">{t(locale, 'quickAddSub')}</p>
          </div>
        </div>
        <EaterPicker
          locale={locale}
          eaters={household}
          selected={eaterIds}
          onChange={setEaterIds}
        />
        <div className="quick-adds">
          {QUICK_FOODS.map((food) => {
            const label = locale === 'es' ? food.nameEs : food.name
            const detail = locale === 'es' ? food.detailEs : food.detail
            return (
            <button
              key={food.name}
              type="button"
              className="quick-add"
              onClick={() =>
                store.addEntry(
                  {
                    meal: 'Snack',
                    name: label,
                    detail,
                    kcal: food.kcal,
                    protein: food.protein,
                    carbs: food.carbs,
                    fat: food.fat,
                  },
                  eaterIds,
                )
              }
            >
              {label}
              <em>{food.kcal}</em>
            </button>
            )
          })}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'mealsToday')}</h4>
            <p className="sub">
              {store.todayEntries.length === 0
                ? t(locale, 'nothingLogged')
                : t(locale, 'itemsKcal', {
                    count: store.todayEntries.length,
                    kcal: Math.round(todayTotals.kcal),
                  })}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => openRecipeLog()}>
            <Plus size={14} /> {t(locale, 'add')}
          </button>
        </div>

        {MEAL_ORDER.map((meal) => {
          const items = entriesByMeal[meal]
          return (
            <div key={meal} className="meal-block">
              <div className="meal-head">
                <h4>{mealLabel(locale, meal)}</h4>
                <div className="meal-head-actions">
                  <span>{mealTotals[meal] || 0} kcal</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => openRecipeLog(meal)}
                    aria-label={t(locale, 'addToMeal', { meal: mealLabel(locale, meal) })}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              {items.length === 0 ? (
                <p className="meal-empty">{t(locale, 'noFoodsYet')}</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="food-item">
                    <div>
                      <h5>
                        {item.recipeId
                          ? recipeName(
                              store.recipeById(item.recipeId) ?? { name: item.name, nameEs: item.name },
                              locale,
                            )
                          : item.name}
                        {item.recipeId ? (
                          <span className="badge badge-primary" style={{ marginLeft: 6 }}>
                            {t(locale, 'navRecipes')}
                          </span>
                        ) : null}
                        {household.length > 1 ? (
                          <span className="badge badge-neutral" style={{ marginLeft: 6 }}>
                            {t(locale, 'loggedFor', { name: item.memberName })}
                          </span>
                        ) : null}
                      </h5>
                      <p>
                        {item.detail ? `${item.detail} · ` : ''}
                        {item.servings != null ? `${formatServings(item.servings, locale)} · ` : ''}
                        P{Math.round(item.protein)} C{Math.round(item.carbs)} F
                        {Math.round(item.fat)}
                      </p>
                    </div>
                    <div className="food-kcal">
                      <strong>{item.kcal}</strong>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm icon-danger"
                        aria-label={t(locale, 'removeFood', { name: item.name })}
                        onClick={() => store.removeEntry(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
