import type { AppStore } from '../hooks/useAppStore'
import { exerciseLabel, mealLabel, recipeName, t } from '../i18n'
import { formatDateLabel } from '../lib/calories'
import { checkInputFromEntry } from '../lib/geminiCheck'
import { GeminiCheckButton } from './GeminiCheckButton'

interface Props {
  store: AppStore
}

export function HistoryView({ store }: Props) {
  const { historyDays, household, householdGoal, locale } = store
  const hasPlan = household.some((member) => member.plan)

  if (!hasPlan) {
    return (
      <div className="card empty-state">
        <h2>{t(locale, 'noHistory')}</h2>
        <p>{t(locale, 'noHistoryBody')}</p>
      </div>
    )
  }

  if (historyDays.length === 0) {
    return (
      <div className="card empty-state">
        <h2>{t(locale, 'noDaysLogged')}</h2>
        <p>{t(locale, 'noDaysBody')}</p>
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'history')}</h2>
        <span>
          {t(locale, historyDays.length === 1 ? 'daysCount' : 'daysCountPlural', {
            count: historyDays.length,
          })}
        </span>
      </div>

      {historyDays.map((date) => {
        const dayEntries = household.flatMap((member) =>
          member.entries
            .filter((entry) => entry.date === date)
            .map((entry) => ({ ...entry, memberName: member.name })),
        )
        const totals = dayEntries.reduce(
          (acc, e) => ({
            kcal: acc.kcal + e.kcal,
            protein: acc.protein + e.protein,
            carbs: acc.carbs + e.carbs,
            fat: acc.fat + e.fat,
          }),
          { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        )
        const dayWorkouts = household.flatMap((member) =>
          (member.exercises ?? [])
            .filter((item) => item.date === date)
            .map((item) => ({ ...item, memberName: member.name })),
        )
        const burned = dayWorkouts.reduce((sum, item) => sum + item.kcal, 0)
        const glasses = household.reduce((sum, member) => sum + (member.water[date] ?? 0), 0)
        const waterGoal = household.reduce(
          (sum, member) => sum + (member.plan?.waterGlasses ?? 0),
          0,
        )
        const goal = householdGoal + burned
        const over = goal > 0 && totals.kcal > goal
        const pct = goal > 0 ? Math.min((totals.kcal / goal) * 100, 100) : 0

        return (
          <article key={date} className="card history-day">
            <div className="history-day-head">
              <div>
                <h3>{formatDateLabel(date, locale)}</h3>
                <p className="sub mono">{date}</p>
              </div>
              <div className="history-day-stats">
                <span className={`badge ${over ? 'badge-danger' : 'badge-success'}`}>
                  {Math.round(totals.kcal)} / {goal} kcal
                </span>
                {burned > 0 && (
                  <span className="badge badge-neutral">
                    {t(locale, 'householdBurned', { kcal: burned })}
                  </span>
                )}
                <span className="badge badge-info">
                  {glasses}/{waterGoal || '—'} {t(locale, 'water')}
                </span>
              </div>
            </div>
            <div className="macro-track history-bar">
              <div
                className={`macro-fill protein${over ? ' is-over-bar' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="history-macros mono">
              P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F{' '}
              {Math.round(totals.fat)}g · {dayEntries.length} {t(locale, 'items')}
            </p>
            {dayEntries.length > 0 && (
              <ul className="history-foods">
                {dayEntries.map((e) => (
                  <li key={e.id}>
                    <span className="badge badge-neutral">{mealLabel(locale, e.meal)}</span>
                    <span className="history-food-name">
                      {e.recipeId
                        ? recipeName(store.recipeById(e.recipeId) ?? { name: e.name, nameEs: e.name }, locale)
                        : e.name}
                      {household.length > 1 ? ` · ${e.memberName}` : ''}
                    </span>
                    <span className="history-kcal-cell mono">
                      <GeminiCheckButton
                        locale={locale}
                        compact
                        item={checkInputFromEntry(
                          e,
                          e.recipeId ? store.recipeById(e.recipeId) : null,
                        )}
                      />
                      {e.kcal}
                    </span>
                  </li>
                ))}
                {dayWorkouts.map((item) => (
                  <li key={item.id}>
                    <span className="badge badge-primary">{t(locale, 'exercise')}</span>
                    <span className="history-food-name">
                      {item.name || exerciseLabel(locale, item.kind)}
                      {household.length > 1 ? ` · ${item.memberName}` : ''}
                      {` · ${t(locale, 'minutesShort', { n: item.minutes })}`}
                    </span>
                    <span className="mono">−{item.kcal}</span>
                  </li>
                ))}
              </ul>
            )}
            {dayEntries.length === 0 && dayWorkouts.length > 0 && (
              <ul className="history-foods">
                {dayWorkouts.map((item) => (
                  <li key={item.id}>
                    <span className="badge badge-primary">{t(locale, 'exercise')}</span>
                    <span className="history-food-name">
                      {item.name || exerciseLabel(locale, item.kind)}
                      {household.length > 1 ? ` · ${item.memberName}` : ''}
                      {` · ${t(locale, 'minutesShort', { n: item.minutes })}`}
                    </span>
                    <span className="mono">−{item.kcal}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        )
      })}
    </div>
  )
}
