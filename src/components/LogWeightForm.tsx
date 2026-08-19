import { useState, type FormEvent } from 'react'
import { Scale } from 'lucide-react'
import { todayKey } from '../lib/calories'
import { isValidWeightKg } from '../lib/weightProgress'
import { t, type Locale } from '../i18n'

interface Props {
  locale: Locale
  defaultKg?: number
  compact?: boolean
  idPrefix?: string
  onSubmit: (input: { kg: number; date: string }) => void
}

export function LogWeightForm({ locale, defaultKg, compact, idPrefix = 'weight', onSubmit }: Props) {
  const [kg, setKg] = useState(defaultKg != null ? String(defaultKg) : '')
  const [date, setDate] = useState(todayKey())
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(kg)
    const today = todayKey()
    if (!isValidWeightKg(value)) {
      setError(t(locale, 'errWeightRange'))
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) {
      setError(t(locale, 'errWeightDate'))
      return
    }
    onSubmit({ kg: Math.round(value * 10) / 10, date })
    setError('')
  }

  return (
    <form className={`weight-form${compact ? ' is-compact' : ''}`} onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger">
          <strong>{error}</strong>
        </div>
      )}
      <div className={`form-row${compact ? '' : ' form-row-3'}`}>
        <div className="field">
          <label htmlFor={`${idPrefix}-kg`}>{t(locale, 'weightKg')}</label>
          <input
            id={`${idPrefix}-kg`}
            type="number"
            min={35}
            max={300}
            step={0.1}
            inputMode="decimal"
            value={kg}
            onChange={(event) => setKg(event.target.value)}
          />
        </div>
        {!compact && (
          <div className="field">
            <label htmlFor={`${idPrefix}-date`}>{t(locale, 'weighInDate')}</label>
            <input
              id={`${idPrefix}-date`}
              type="date"
              max={todayKey()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        )}
        <div className={`field${compact ? '' : ' weight-form-action'}`}>
          {!compact && <label className="weight-form-spacer">&nbsp;</label>}
          <button className="btn btn-primary" type="submit">
            <Scale size={16} /> {t(locale, 'saveWeight')}
          </button>
        </div>
      </div>
    </form>
  )
}
