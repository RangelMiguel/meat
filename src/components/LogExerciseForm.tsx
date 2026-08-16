import { useMemo, useState, type FormEvent } from 'react'
import { Dumbbell } from 'lucide-react'
import { estimateExerciseKcal, EXERCISE_PRESETS } from '../lib/exercises'
import { exerciseLabel, t, type Locale } from '../i18n'
import type { ExerciseKind, Member } from '../types'
import { EaterPicker } from './EaterPicker'

interface Props {
  locale: Locale
  members: Member[]
  selectedIds: string[]
  onSelectedChange: (ids: string[]) => void
  onSubmit: (input: {
    kind: ExerciseKind
    name: string
    minutes: number
    members: { memberId: string; kcal: number }[]
  }) => void
}

export function LogExerciseForm({
  locale,
  members,
  selectedIds,
  onSelectedChange,
  onSubmit,
}: Props) {
  const [kind, setKind] = useState<ExerciseKind>('walk')
  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [manualKcal, setManualKcal] = useState<number | ''>('')
  const [error, setError] = useState('')

  const selected = useMemo(
    () => members.filter((member) => selectedIds.includes(member.id)),
    [members, selectedIds],
  )

  const estimates = useMemo(() => {
    return selected.map((member) => {
      const weight = member.plan?.input.weightKg ?? 70
      const auto = estimateExerciseKcal(kind, minutes, weight)
      const kcal = manualKcal === '' ? auto : Math.max(0, Number(manualKcal) || 0)
      return { memberId: member.id, name: member.name, kcal, auto }
    })
  }, [selected, kind, minutes, manualKcal])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (minutes <= 0) {
      setError(t(locale, 'minutesRequired'))
      return
    }
    if (selected.length === 0) {
      setError(t(locale, 'eatersNeeded'))
      return
    }
    onSubmit({
      kind,
      name: name.trim() || exerciseLabel(locale, kind),
      minutes,
      members: estimates.map((item) => ({ memberId: item.memberId, kcal: item.kcal })),
    })
    setName('')
    setManualKcal('')
    setError('')
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger">
          <strong>{error}</strong>
        </div>
      )}
      <EaterPicker
        locale={locale}
        eaters={members}
        selected={selectedIds}
        onChange={onSelectedChange}
        title={t(locale, 'whoExercised')}
        hint={t(locale, 'whoExercisedSub')}
      />
      <div className="form-row form-row-3">
        <div className="field">
          <label htmlFor="ex-kind">{t(locale, 'activity')}</label>
          <select
            id="ex-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ExerciseKind)
              setManualKcal('')
            }}
          >
            {EXERCISE_PRESETS.map((item) => (
              <option key={item.id} value={item.id}>
                {exerciseLabel(locale, item.id)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ex-min">{t(locale, 'minutes')}</label>
          <input
            id="ex-min"
            type="number"
            min={1}
            step={1}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="ex-kcal">{t(locale, 'kcalBurned')}</label>
          <input
            id="ex-kcal"
            type="number"
            min={0}
            step={1}
            value={manualKcal}
            placeholder={
              estimates.length === 1 ? String(estimates[0].auto) : t(locale, 'estimated')
            }
            onChange={(e) =>
              setManualKcal(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
          <p className="field-hint">{t(locale, 'estimated')}</p>
        </div>
      </div>
      {kind === 'other' && (
        <div className="field">
          <label htmlFor="ex-name">{t(locale, 'name')}</label>
          <input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      {estimates.length > 1 && (
        <ul className="eater-portions">
          {estimates.map((item) => (
            <li key={item.memberId}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.kcal} kcal</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="btn-row">
        <button className="btn btn-primary" type="submit">
          <Dumbbell size={16} />
          {t(locale, 'addWorkout')}
        </button>
      </div>
    </form>
  )
}
