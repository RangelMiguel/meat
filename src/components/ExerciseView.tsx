import { useMemo, useState } from 'react'
import { Dumbbell, Trash2 } from 'lucide-react'
import type { AppStore } from '../hooks/useAppStore'
import { exerciseLabel, t } from '../i18n'
import { formatDateLabel } from '../lib/calories'
import { mergeFuel, suggestFuel } from '../lib/exercises'
import { ExerciseFuelCard } from './ExerciseFuelCard'
import { LogExerciseForm } from './LogExerciseForm'

interface Props {
  store: AppStore
}

export function ExerciseView({ store }: Props) {
  const { locale, household, todayExercises, todayBurned, historyDays, familyToday, today } = store
  const [who, setWho] = useState<string[]>(() => household.map((member) => member.id))

  const memberFuels = useMemo(
    () =>
      familyToday.flatMap(({ member, totals, burned }) => {
        if (!member.plan || burned <= 0) return []
        return [
          {
            member,
            fuel: suggestFuel({
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
          },
        ]
      }),
    [familyToday, today],
  )
  const householdFuel = useMemo(
    () => mergeFuel(memberFuels.map((item) => item.fuel)),
    [memberFuels],
  )

  const recent = useMemo(() => {
    const list = household.flatMap((member) =>
      (member.exercises ?? []).map((item) => ({
        ...item,
        memberName: member.name,
      })),
    )
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40)
  }, [household])

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'exercise')}</h2>
        <span>{t(locale, 'todayBurned', { kcal: todayBurned })}</span>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'logWorkout')}</h4>
            <p className="sub">{t(locale, 'exerciseSub')}</p>
          </div>
        </div>
        <LogExerciseForm
          locale={locale}
          members={household}
          selectedIds={who}
          onSelectedChange={setWho}
          onSubmit={(payload) => store.addExercise(payload)}
        />
      </div>

      {householdFuel ? (
        <>
          <ExerciseFuelCard locale={locale} fuel={householdFuel} />
          {memberFuels.length > 1 &&
            memberFuels.map(({ member, fuel }) => (
              <ExerciseFuelCard key={member.id} locale={locale} fuel={fuel} name={member.name} />
            ))}
        </>
      ) : (
        <div className="card">
          <p className="meal-empty" style={{ padding: '0.4rem 0' }}>
            {t(locale, 'fuelNoBurn')}
          </p>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'exerciseToday')}</h4>
            <p className="sub">{t(locale, 'householdBurned', { kcal: todayBurned })}</p>
          </div>
          <span className="badge badge-neutral">{todayExercises.length}</span>
        </div>
        {todayExercises.length === 0 ? (
          <p className="meal-empty">{t(locale, 'noWorkouts')}</p>
        ) : (
          <ul className="exercise-list">
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
      </div>

      {recent.length > todayExercises.length && (
        <div className="card">
          <div className="card-header">
            <h4>{t(locale, 'recentWorkouts')}</h4>
            <span className="badge badge-neutral">{historyDays.length}</span>
          </div>
          <ul className="exercise-list">
            {recent
              .filter((item) => !todayExercises.some((row) => row.id === item.id))
              .map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name || exerciseLabel(locale, item.kind)}</strong>
                    <p>
                      {formatDateLabel(item.date, locale)}
                      {household.length > 1 ? ` · ${item.memberName}` : ''}
                      {` · ${t(locale, 'minutesShort', { n: item.minutes })}`}
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
        </div>
      )}
    </div>
  )
}
