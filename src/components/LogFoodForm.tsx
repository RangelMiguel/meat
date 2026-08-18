import { useCallback, useState, type FormEvent } from 'react'
import { Plus, ScanBarcode } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { mealLabel, t, type Locale } from '../i18n'
import { MEAL_ORDER, type MealType } from '../types'
import { BarcodeScanner } from './BarcodeScanner'
import type { NutritionHit } from '../lib/nutrition/types'

export interface LogFoodPayload {
  meal: MealType
  name: string
  detail?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface Props {
  defaultMeal?: MealType
  initial?: Partial<LogFoodPayload>
  onSubmit: (payload: LogFoodPayload) => void
  onCancel?: () => void
  submitLabel?: string
  locale: Locale
}

const empty: LogFoodPayload = {
  meal: 'Breakfast',
  name: '',
  detail: '',
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
}

export function LogFoodForm({
  defaultMeal = 'Breakfast',
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  locale,
}: Props) {
  const saveLabel = submitLabel ?? t(locale, 'addFood')
  const [form, setForm] = useState<LogFoodPayload>({
    ...empty,
    meal: defaultMeal,
    ...initial,
  })
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [looking, setLooking] = useState(false)
  const [sourceHint, setSourceHint] = useState('')

  const update = <K extends keyof LogFoodPayload>(key: K, value: LogFoodPayload[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setError('')
  }

  const lookupBarcode = useCallback(
    async (barcode: string) => {
      setScanning(false)
      setLooking(true)
      setError('')
      try {
        const res = await api<{ hit: NutritionHit | null; error?: string }>('/api/nutrition/lookup', {
          method: 'POST',
          body: JSON.stringify({ barcode }),
        })
        if (!res.hit) {
          setError(t(locale, 'barcodeNotFound'))
          return
        }
        const hit = res.hit
        const macros = hit.pack && hit.pack.kcal > 0 && !hit.servingLabel ? hit.pack : hit.serving
        const note = hit.servingLabel || hit.pack?.label || hit.quantity
        setForm((f) => ({
          ...f,
          name: hit.brand ? `${hit.brand} ${hit.name}` : hit.name,
          detail: note || f.detail,
          kcal: macros.kcal,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat,
        }))
        setSourceHint(
          hit.estimated || hit.source === 'ai'
            ? t(locale, 'barcodeAiEstimate')
            : t(locale, 'barcodeFromDb'),
        )
      } catch (e) {
        setError(e instanceof ApiError ? e.code : t(locale, 'barcodeNotFound'))
      } finally {
        setLooking(false)
      }
    },
    [locale],
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(t(locale, 'foodNameRequired'))
      return
    }
    if (form.kcal <= 0) {
      setError(t(locale, 'caloriesMustBePositive'))
      return
    }
    onSubmit({
      ...form,
      name: form.name.trim(),
      detail: form.detail?.trim() || undefined,
      kcal: Math.round(form.kcal),
      protein: Math.max(0, Number(form.protein) || 0),
      carbs: Math.max(0, Number(form.carbs) || 0),
      fat: Math.max(0, Number(form.fat) || 0),
    })
    setForm({ ...empty, meal: form.meal })
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger">
          <div>
            <strong>{error}</strong>
          </div>
        </div>
      )}
      {scanning && (
        <BarcodeScanner locale={locale} onDetect={(code) => void lookupBarcode(code)} onClose={() => setScanning(false)} />
      )}
      <div className="field">
        <label htmlFor="food-name">{t(locale, 'food')}</label>
        <div className="barcode-name-row">
          <input
            id="food-name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t(locale, 'foodPlaceholder')}
            autoFocus
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setScanning(true)}
            disabled={looking}
          >
            <ScanBarcode size={16} /> {looking ? t(locale, 'barcodeLooking') : t(locale, 'scanBarcode')}
          </button>
        </div>
        {sourceHint && <p className="field-hint">{sourceHint}</p>}
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="food-meal">{t(locale, 'meal')}</label>
          <select
            id="food-meal"
            value={form.meal}
            onChange={(e) => update('meal', e.target.value as MealType)}
          >
            {MEAL_ORDER.map((m) => (
              <option key={m} value={m}>
                {mealLabel(locale, m)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="food-detail">{t(locale, 'servingNotes')}</label>
          <input
            id="food-detail"
            value={form.detail ?? ''}
            onChange={(e) => update('detail', e.target.value)}
            placeholder={t(locale, 'optional')}
          />
        </div>
      </div>
      <div className="form-row form-row-4">
        <div className="field">
          <label htmlFor="food-kcal">{t(locale, 'calories')}</label>
          <input
            id="food-kcal"
            type="number"
            min={0}
            value={form.kcal || ''}
            onChange={(e) => update('kcal', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="food-p">{t(locale, 'proteinG')}</label>
          <input
            id="food-p"
            type="number"
            min={0}
            step={0.1}
            value={form.protein || ''}
            onChange={(e) => update('protein', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="food-c">{t(locale, 'carbsG')}</label>
          <input
            id="food-c"
            type="number"
            min={0}
            step={0.1}
            value={form.carbs || ''}
            onChange={(e) => update('carbs', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="food-f">{t(locale, 'fatG')}</label>
          <input
            id="food-f"
            type="number"
            min={0}
            step={0.1}
            value={form.fat || ''}
            onChange={(e) => update('fat', Number(e.target.value))}
          />
        </div>
      </div>
      <div className="btn-row">
        <button className="btn btn-primary" type="submit">
          <Plus size={16} /> {saveLabel}
        </button>
        {onCancel && (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            {t(locale, 'cancel')}
          </button>
        )}
      </div>
      <p className="field-hint off-source-note">
        {t(locale, 'offSourceNoteBefore')}{' '}
        <a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">
          Open Food Facts
        </a>{' '}
        {t(locale, 'offSourceNoteAfter')}
      </p>
    </form>
  )
}
