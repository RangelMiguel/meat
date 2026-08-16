import { useMemo, useState, type FormEvent } from 'react'
import { Calculator, Save } from 'lucide-react'
import { activityCopy, t, type Locale } from '../i18n'
import { buildPlan } from '../lib/calories'
import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  type CaloriePlan,
  type Goal,
  type PlanInput,
  type Sex,
  type ActivityLevel,
} from '../types'

interface Props {
  locale: Locale
  existing: CaloriePlan | null
  onSave: (plan: CaloriePlan) => void
}

const defaultInput = (existing: CaloriePlan | null): PlanInput =>
  existing?.input ?? {
    name: '',
    sex: 'female',
    age: 30,
    heightCm: 170,
    weightKg: 70,
    activity: 'moderate',
    goal: 'lose',
    weeklyChangeKg: 0.5,
  }

export function PlanForm({ locale, existing, onSave }: Props) {
  const [form, setForm] = useState<PlanInput>(() => defaultInput(existing))
  const [preview, setPreview] = useState<CaloriePlan | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const update = <K extends keyof PlanInput>(key: K, value: PlanInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setPreview(null)
    setSavedFlash(false)
  }

  const validate = (): string[] => {
    const e: string[] = []
    if (!form.name.trim()) e.push(t(locale, 'errName'))
    if (form.age < 15 || form.age > 100) e.push(t(locale, 'errAge'))
    if (form.heightCm < 120 || form.heightCm > 230) e.push(t(locale, 'errHeight'))
    if (form.weightKg < 35 || form.weightKg > 300) e.push(t(locale, 'errWeight'))
    if (form.goal !== 'maintain' && (form.weeklyChangeKg < 0.1 || form.weeklyChangeKg > 1)) {
      e.push(t(locale, 'errWeight'))
    }
    return e
  }

  const calculated = useMemo(() => {
    try {
      return buildPlan(form, existing)
    } catch {
      return null
    }
  }, [form, existing])

  const runCalculate = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (errs.length || !calculated) return
    setPreview(calculated)
  }

  const runSave = () => {
    const errs = validate()
    setErrors(errs)
    if (errs.length) return
    const plan = buildPlan(form, existing)
    onSave(plan)
    setPreview(plan)
    setSavedFlash(true)
  }

  const shown = preview ?? (existing && sameInput(existing.input, form) ? existing : null)

  return (
    <div className="plan-layout">
      <form className="card plan-form" onSubmit={runCalculate}>
        <div className="card-header">
          <div>
            <h3>{t(locale, 'personalizedPlan')}</h3>
            <p className="sub">{t(locale, 'planIntro')}</p>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="alert alert-danger" style={{ marginBottom: '0.9rem' }}>
            <div>
              <strong>{t(locale, 'checkForm')}</strong>
              <ul className="error-list">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">{t(locale, 'name')}</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Alex"
              autoComplete="name"
            />
          </div>

          <fieldset className="segment-field">
            <legend>{t(locale, 'sex')}</legend>
            <div className="segment">
              {(
                [
                  ['female', t(locale, 'sexFemale')],
                  ['male', t(locale, 'sexMale')],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`segment-btn${form.sex === value ? ' is-active' : ''}`}
                  onClick={() => update('sex', value as Sex)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="form-row form-row-3">
            <div className="field">
              <label htmlFor="age">{t(locale, 'age')}</label>
              <input
                id="age"
                type="number"
                min={15}
                max={100}
                value={form.age}
                onChange={(e) => update('age', Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="height">{t(locale, 'heightCm')}</label>
              <input
                id="height"
                type="number"
                min={120}
                max={230}
                value={form.heightCm}
                onChange={(e) => update('heightCm', Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="weight">{t(locale, 'weightKg')}</label>
              <input
                id="weight"
                type="number"
                min={35}
                max={300}
                step={0.1}
                value={form.weightKg}
                onChange={(e) => update('weightKg', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="activity">{t(locale, 'activityLevel')}</label>
            <select
              id="activity"
              value={form.activity}
              onChange={(e) => update('activity', e.target.value as ActivityLevel)}
            >
              {ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {activityCopy(locale, opt.value).label} — {activityCopy(locale, opt.value).hint}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="segment-field">
            <legend>{t(locale, 'goal')}</legend>
            <div className="segment segment-3">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segment-btn${form.goal === opt.value ? ' is-active' : ''}`}
                  onClick={() => update('goal', opt.value as Goal)}
                  title={opt.value === 'lose' ? t(locale, 'goalLoseHint') : opt.value === 'gain' ? t(locale, 'goalGainHint') : t(locale, 'goalMaintainHint')}
                >
                  {opt.value === 'lose' ? t(locale, 'goalLose') : opt.value === 'gain' ? t(locale, 'goalGain') : t(locale, 'goalMaintain')}
                </button>
              ))}
            </div>
          </fieldset>

          {form.goal !== 'maintain' && (
            <div className="field">
              <label htmlFor="weekly">
                {form.goal === 'lose' ? t(locale, 'weeklyLoss') : t(locale, 'weeklyGain')}
              </label>
              <input
                id="weekly"
                type="number"
                min={0.1}
                max={1}
                step={0.1}
                value={form.weeklyChangeKg}
                onChange={(e) => update('weeklyChangeKg', Number(e.target.value))}
              />
              <p className="field-hint">{t(locale, 'weeklyHint')}</p>
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-secondary" type="submit">
              <Calculator size={16} /> {t(locale, 'calculate')}
            </button>
            <button className="btn btn-primary" type="button" onClick={runSave}>
              <Save size={16} /> {t(locale, 'savePlan')}
            </button>
          </div>
        </div>
      </form>

      <aside className="card plan-results">
        <div className="card-header">
          <div>
            <h3>{t(locale, 'yourTargets')}</h3>
            <p className="sub">{t(locale, 'personalizedTargets')}</p>
          </div>
        </div>

        {shown ? (
          <>
            {savedFlash && (
              <div className="alert alert-success" style={{ marginBottom: '0.9rem' }}>
                <div>
                  <strong>{t(locale, 'planSaved')}</strong>
                  <p>{t(locale, 'planSavedBody')}</p>
                </div>
              </div>
            )}
            <div className="result-hero">
              <span className="result-label">{t(locale, 'dailyCalories')}</span>
              <strong className="result-kcal">{shown.dailyCalories}</strong>
              <span className="result-unit">{t(locale, 'kcalDay')}</span>
            </div>
            <div className="result-grid">
              <div className="result-tile">
                <span>{t(locale, 'bmr')}</span>
                <strong>{shown.bmr}</strong>
                <em>{t(locale, 'atRest')}</em>
              </div>
              <div className="result-tile">
                <span>{t(locale, 'tdee')}</span>
                <strong>{shown.tdee}</strong>
                <em>{t(locale, 'maintenance')}</em>
              </div>
              <div className="result-tile">
                <span>{t(locale, 'protein')}</span>
                <strong>{shown.macros.proteinG}g</strong>
                <em>{t(locale, 'daily')}</em>
              </div>
              <div className="result-tile">
                <span>{t(locale, 'carbs')}</span>
                <strong>{shown.macros.carbsG}g</strong>
                <em>{t(locale, 'daily')}</em>
              </div>
              <div className="result-tile">
                <span>{t(locale, 'fat')}</span>
                <strong>{shown.macros.fatG}g</strong>
                <em>{t(locale, 'daily')}</em>
              </div>
              <div className="result-tile">
                <span>{t(locale, 'water')}</span>
                <strong>{shown.waterGlasses}</strong>
                <em>{t(locale, 'glasses')}</em>
              </div>
            </div>
            <p className="plan-note">
              {goalCopy(shown.input.goal, shown.tdee, shown.dailyCalories, shown.input.weeklyChangeKg)}
            </p>
          </>
        ) : (
          <div className="empty-results">
            <p>{t(locale, 'planEmptyHint')}</p>
          </div>
        )}
      </aside>
    </div>
  )
}

function sameInput(a: PlanInput, b: PlanInput): boolean {
  return (
    a.name === b.name &&
    a.sex === b.sex &&
    a.age === b.age &&
    a.heightCm === b.heightCm &&
    a.weightKg === b.weightKg &&
    a.activity === b.activity &&
    a.goal === b.goal &&
    a.weeklyChangeKg === b.weeklyChangeKg
  )
}

function goalCopy(goal: Goal, tdee: number, daily: number, weekly: number): string {
  if (goal === 'maintain') {
    return `Your maintenance estimate is ${tdee} kcal. Eat around this to hold weight steady.`
  }
  const delta = Math.abs(tdee - daily)
  if (goal === 'lose') {
    return `About ${delta} kcal/day below maintenance (~${weekly} kg/week). Minimum floors protect very low targets.`
  }
  return `About ${delta} kcal/day above maintenance (~${weekly} kg/week) to support a gradual gain.`
}
