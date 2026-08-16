import { localeTag, t, type Locale } from '../i18n'
import {
  ACTIVITY_OPTIONS,
  type CaloriePlan,
  type MacroTargets,
  type PlanInput,
} from '../types'

/** Mifflin–St Jeor BMR (kcal/day). */
export function calculateBmr(input: Pick<PlanInput, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age
  return Math.round(input.sex === 'male' ? base + 5 : base - 161)
}

export function activityFactor(activity: PlanInput['activity']): number {
  return ACTIVITY_OPTIONS.find((a) => a.value === activity)?.factor ?? 1.2
}

export function calculateTdee(bmr: number, activity: PlanInput['activity']): number {
  return Math.round(bmr * activityFactor(activity))
}

/**
 * ~7700 kcal ≈ 1 kg body fat. Weekly change → daily delta.
 * Floor at 1200 (female) / 1500 (male) for safety when losing.
 */
export function calculateDailyCalories(
  tdee: number,
  input: Pick<PlanInput, 'sex' | 'goal' | 'weeklyChangeKg'>,
): number {
  if (input.goal === 'maintain') return tdee

  const weekly = Math.max(0.1, Math.min(1.0, input.weeklyChangeKg || 0.5))
  const dailyDelta = Math.round((weekly * 7700) / 7)
  const raw = input.goal === 'lose' ? tdee - dailyDelta : tdee + dailyDelta
  const floor = input.sex === 'female' ? 1200 : 1500
  return Math.max(floor, raw)
}

/** Macro split: protein 1.8g/kg (lose) / 1.6 maintain / 1.8 gain; fat 25% kcal; rest carbs. */
export function calculateMacros(
  dailyCalories: number,
  weightKg: number,
  goal: PlanInput['goal'],
): MacroTargets {
  const proteinPerKg = goal === 'maintain' ? 1.6 : 1.8
  const proteinG = Math.round(weightKg * proteinPerKg)
  const fatG = Math.round((dailyCalories * 0.25) / 9)
  const proteinKcal = proteinG * 4
  const fatKcal = fatG * 9
  const carbsG = Math.max(0, Math.round((dailyCalories - proteinKcal - fatKcal) / 4))
  return { proteinG, carbsG, fatG }
}

export function suggestedWaterGlasses(weightKg: number): number {
  // ~35 ml/kg → glasses of 250 ml, clamped 6–12
  return Math.min(12, Math.max(6, Math.round((weightKg * 35) / 250)))
}

export function buildPlan(input: PlanInput, existing?: CaloriePlan | null): CaloriePlan {
  const bmr = calculateBmr(input)
  const tdee = calculateTdee(bmr, input.activity)
  const dailyCalories = calculateDailyCalories(tdee, input)
  const macros = calculateMacros(dailyCalories, input.weightKg, input.goal)
  const now = new Date().toISOString()
  return {
    input,
    bmr,
    tdee,
    dailyCalories,
    macros,
    waterGlasses: suggestedWaterGlasses(input.weightKg),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateLabel(dateKey: string, locale: Locale = 'en'): string {
  const today = todayKey()
  if (dateKey === today) return t(locale, 'today')
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (dateKey === todayKey(yest)) return t(locale, 'yesterday')
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(localeTag(locale), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function daysSince(dateKey: string, now = new Date()): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  const then = new Date(y, m - 1, d)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((today.getTime() - then.getTime()) / 86_400_000)
}

export function formatBoughtLabel(dateKey: string, locale: Locale = 'en'): string {
  const n = daysSince(dateKey)
  if (n <= 0) return t(locale, 'boughtToday')
  if (n === 1) return t(locale, 'boughtYesterday')
  if (n < 14) return t(locale, 'boughtDaysAgo', { n })
  return t(locale, 'boughtOnDate', { date: formatDateLabel(dateKey, locale) })
}

export type LotAgeTone = 'fresh' | 'aging' | 'old'

export function formatLotAge(
  dateKey: string,
  locale: Locale = 'en',
): {
  days: number
  label: string
  tone: LotAgeTone
} {
  const days = Math.max(0, daysSince(dateKey))
  if (days <= 0) return { days, label: t(locale, 'boughtToday'), tone: 'fresh' }
  if (days === 1) return { days, label: t(locale, 'dayOld'), tone: 'fresh' }
  if (days < 7) return { days, label: t(locale, 'daysOld', { n: days }), tone: 'fresh' }
  if (days < 14) return { days, label: t(locale, 'daysOld', { n: days }), tone: 'aging' }
  return { days, label: t(locale, 'daysOldCheck', { n: days }), tone: 'old' }
}

/** YYYY-MM-DD, never after today. */
export function clampBoughtOn(value: string): string {
  const today = todayKey()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return today
  return value > today ? today : value
}

export function clampGrams(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.max(0, value) * 10) / 10
}

export type MeasureUnit = 'g' | 'ml'

export function formatAmount(value: number, unit: MeasureUnit = 'g'): string {
  const n = clampGrams(value)
  if (unit === 'ml') {
    if (n >= 1000) {
      const liters = Math.round((n / 1000) * 100) / 100
      return `${liters} L`
    }
    return `${n} ml`
  }
  if (n >= 1000) {
    const kg = Math.round((n / 1000) * 100) / 100
    return `${kg} kg`
  }
  return `${n} g`
}

/** @deprecated use formatAmount */
export function formatGrams(grams: number, unit: MeasureUnit = 'g'): string {
  return formatAmount(grams, unit)
}

export function unitLabel(unit: MeasureUnit): string {
  return unit === 'ml' ? 'ml' : 'g'
}

export function formatMixedTotals(parts: { amount: number; unit: MeasureUnit }[]): string {
  let grams = 0
  let ml = 0
  for (const part of parts) {
    if (part.unit === 'ml') ml += part.amount
    else grams += part.amount
  }
  const bits: string[] = []
  if (grams > 0) bits.push(formatAmount(grams, 'g'))
  if (ml > 0) bits.push(formatAmount(ml, 'ml'))
  return bits.join(' · ')
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
