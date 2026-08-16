import { t, type Locale } from '../i18n'

interface Props {
  eaten: number
  goal: number
  locale: Locale
}

export function CalorieRing({ eaten, goal, locale }: Props) {
  const size = 180
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const safeGoal = goal > 0 ? goal : 1
  const pct = Math.min(eaten / safeGoal, 1)
  const offset = c * (1 - pct)
  const remaining = Math.max(goal - eaten, 0)
  const over = eaten > goal

  return (
    <div
      className="ring-wrap"
      aria-label={`${eaten} ${t(locale, 'ofKcal', { goal })}${over ? t(locale, 'overBudgetAria') : ''}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} role="img">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} />
        <circle
          className={`ring-progress${over ? ' is-over' : ''}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-center">
        <div className="kcal">{Math.round(eaten)}</div>
        <div className="label">{t(locale, 'ofKcal', { goal })}</div>
        <div className={`remain${over ? ' over' : ''}`}>
          {over
            ? t(locale, 'over', { n: Math.round(eaten - goal) })
            : t(locale, 'left', { n: remaining })}
        </div>
      </div>
    </div>
  )
}
