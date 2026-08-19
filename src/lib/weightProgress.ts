import { buildPlan, daysSince } from './calories'
import type { CaloriePlan, Goal, WeightEntry } from '../types'

const MIN_TREND_DAYS = 7
const SLOW_TREND_DAYS = 14
const SUBSTANTIAL_KG = 3
const SUBSTANTIAL_PCT = 0.04
const SLOW_RATIO = 0.45
const FAST_RATIO = 1.8
const FAST_ABS_WEEK = 1
const WRONG_WAY_WEEK = 0.15
const MAINTAIN_DRIFT_WEEK = 0.25
const MAX_WEEKLY = 1
const MIN_WEIGHT_KG = 35
const MAX_WEIGHT_KG = 300

export function clampWeightKg(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.max(MIN_WEIGHT_KG, Math.min(MAX_WEIGHT_KG, value)) * 10) / 10
}

export function isValidWeightKg(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_WEIGHT_KG && value <= MAX_WEIGHT_KG
}

export function formatKg(value: number): string {
  const n = Math.round(value * 10) / 10
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function formatKgDelta(value: number): string {
  const abs = formatKg(Math.abs(value))
  if (Math.abs(value) < 0.05) return '0'
  return value > 0 ? `+${abs}` : `−${abs}`
}

export function sortWeights(logs: WeightEntry[]): WeightEntry[] {
  return [...logs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
}

export function latestWeight(logs: WeightEntry[] | undefined): WeightEntry | null {
  const sorted = sortWeights(logs ?? [])
  return sorted[sorted.length - 1] ?? null
}

export function currentWeightKg(logs: WeightEntry[] | undefined, fallback?: number): number {
  return latestWeight(logs)?.kg ?? fallback ?? 70
}

export function weighInOnDate(logs: WeightEntry[] | undefined, date: string): WeightEntry | null {
  const matches = (logs ?? []).filter((item) => item.date === date)
  if (matches.length === 0) return null
  return matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

function dateMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((dateMs(to) - dateMs(from)) / 86_400_000)
}

function trendWindow(sorted: WeightEntry[], maxDays = 28): WeightEntry[] {
  if (sorted.length < 2) return sorted
  const end = sorted[sorted.length - 1]
  const windowed = sorted.filter((log) => daysBetween(log.date, end.date) <= maxDays)
  return windowed.length >= 2 ? windowed : sorted
}

export function expectedSignedWeekly(plan: CaloriePlan | null): number {
  if (!plan || plan.input.goal === 'maintain') return 0
  const weekly = Math.max(0, plan.input.weeklyChangeKg)
  return plan.input.goal === 'lose' ? -weekly : weekly
}

export function expectedWeightAt(
  startKg: number,
  startDate: string,
  date: string,
  weeklySigned: number,
): number {
  return startKg + weeklySigned * (daysBetween(startDate, date) / 7)
}

export type WeightStats = {
  logs: WeightEntry[]
  latest: WeightEntry | null
  start: WeightEntry | null
  latestKg: number | null
  startKg: number | null
  totalChangeKg: number | null
  weeklyRateKg: number | null
  expectedWeeklyKg: number
  spanDays: number
  logCount: number
  planWeightKg: number | null
  planDriftKg: number | null
}

export type InsightKind =
  | 'need_logs'
  | 'need_more'
  | 'on_track'
  | 'too_slow'
  | 'too_fast'
  | 'wrong_way'
  | 'recalculate'
  | 'maintain_ok'
  | 'maintain_drift'

export type InsightAction = 'none' | 'reduce_calories' | 'increase_calories' | 'recalculate'

export type WeightInsight = {
  kind: InsightKind
  severity: 'info' | 'success' | 'warn' | 'danger'
  action: InsightAction
  suggestedDailyCalories: number | null
  suggestedWeeklyChangeKg: number | null
}

export type WeightProgress = {
  stats: WeightStats
  insights: WeightInsight[]
}

function suggestedPace(
  goal: Goal,
  currentWeekly: number,
  extraKgPerWeek: number,
): number {
  if (goal === 'maintain') return Math.min(MAX_WEEKLY, Math.max(0.25, extraKgPerWeek))
  return Math.min(MAX_WEEKLY, Math.max(0.1, currentWeekly + extraKgPerWeek))
}

function planForWeight(
  plan: CaloriePlan,
  weightKg: number,
  weeklyChangeKg?: number,
  goal?: Goal,
): CaloriePlan {
  return buildPlan(
    {
      ...plan.input,
      weightKg,
      weeklyChangeKg: weeklyChangeKg ?? plan.input.weeklyChangeKg,
      goal: goal ?? plan.input.goal,
    },
    plan,
  )
}

function insight(
  partial: Omit<WeightInsight, 'suggestedDailyCalories' | 'suggestedWeeklyChangeKg'> &
    Partial<Pick<WeightInsight, 'suggestedDailyCalories' | 'suggestedWeeklyChangeKg'>>,
): WeightInsight {
  return {
    suggestedDailyCalories: null,
    suggestedWeeklyChangeKg: null,
    ...partial,
  }
}

export function analyzeWeightProgress(
  logs: WeightEntry[] | undefined,
  plan: CaloriePlan | null,
): WeightProgress {
  const sorted = sortWeights(logs ?? [])
  const latest = sorted[sorted.length - 1] ?? null
  const start = sorted[0] ?? null
  const window = trendWindow(sorted)
  const windowStart = window[0] ?? null
  const windowEnd = window[window.length - 1] ?? null
  const spanDays =
    windowStart && windowEnd ? Math.max(0, daysBetween(windowStart.date, windowEnd.date)) : 0
  const weeklyRateKg =
    windowStart && windowEnd && spanDays > 0
      ? ((windowEnd.kg - windowStart.kg) / spanDays) * 7
      : null
  const expectedWeeklyKg = expectedSignedWeekly(plan)
  const planWeightKg = plan?.input.weightKg ?? null
  const latestKg = latest?.kg ?? null
  const startKg = start?.kg ?? null
  const totalChangeKg = latestKg != null && startKg != null ? latestKg - startKg : null
  const planDriftKg = latestKg != null && planWeightKg != null ? latestKg - planWeightKg : null

  const stats: WeightStats = {
    logs: sorted,
    latest,
    start,
    latestKg,
    startKg,
    totalChangeKg,
    weeklyRateKg,
    expectedWeeklyKg,
    spanDays,
    logCount: sorted.length,
    planWeightKg,
    planDriftKg,
  }

  if (sorted.length === 0) {
    return { stats, insights: [insight({ kind: 'need_logs', severity: 'info', action: 'none' })] }
  }

  const insights: WeightInsight[] = []

  if (plan && latestKg != null && planWeightKg != null) {
    const threshold = Math.max(SUBSTANTIAL_KG, planWeightKg * SUBSTANTIAL_PCT)
    if (Math.abs(latestKg - planWeightKg) >= threshold) {
      const next = planForWeight(plan, latestKg)
      insights.push(
        insight({
          kind: 'recalculate',
          severity: 'warn',
          action: 'recalculate',
          suggestedDailyCalories: next.dailyCalories,
          suggestedWeeklyChangeKg: next.input.weeklyChangeKg,
        }),
      )
    }
  }

  if (sorted.length < 2 || spanDays < MIN_TREND_DAYS || weeklyRateKg == null) {
    insights.push(insight({ kind: 'need_more', severity: 'info', action: 'none' }))
    return { stats, insights }
  }

  if (!plan) return { stats, insights }

  const goal = plan.input.goal
  const rate = weeklyRateKg
  const expectedAbs = Math.abs(expectedWeeklyKg)
  const towardGoal = goal === 'maintain' ? 0 : goal === 'lose' ? -rate : rate
  const progressRatio = expectedAbs > 0 ? towardGoal / expectedAbs : null

  if (goal === 'maintain') {
    if (Math.abs(rate) < MAINTAIN_DRIFT_WEEK || spanDays < SLOW_TREND_DAYS) {
      insights.push(insight({ kind: 'maintain_ok', severity: 'success', action: 'none' }))
      return { stats, insights }
    }
    const next = planForWeight(plan, latestKg ?? plan.input.weightKg)
    insights.push(
      insight({
        kind: 'maintain_drift',
        severity: 'warn',
        action: 'recalculate',
        suggestedDailyCalories: next.dailyCalories,
        suggestedWeeklyChangeKg: 0,
      }),
    )
    return { stats, insights }
  }

  const goingWrong =
    (goal === 'lose' && rate > WRONG_WAY_WEEK) || (goal === 'gain' && rate < -WRONG_WAY_WEEK)

  if (goingWrong) {
    const extra = Math.max(0.15, expectedAbs + Math.abs(rate))
    const weekly = suggestedPace(goal, plan.input.weeklyChangeKg, extra - plan.input.weeklyChangeKg)
    const next = planForWeight(plan, latestKg ?? plan.input.weightKg, weekly, goal)
    insights.push(
      insight({
        kind: 'wrong_way',
        severity: 'danger',
        action: goal === 'lose' ? 'reduce_calories' : 'increase_calories',
        suggestedDailyCalories: next.dailyCalories,
        suggestedWeeklyChangeKg: weekly,
      }),
    )
    return { stats, insights }
  }

  const tooFast =
    Math.abs(rate) >= FAST_ABS_WEEK || (progressRatio != null && progressRatio >= FAST_RATIO)

  if (tooFast) {
    const slower = Math.max(0.25, Math.min(plan.input.weeklyChangeKg, expectedAbs * 0.85))
    const next = planForWeight(plan, latestKg ?? plan.input.weightKg, slower, goal)
    insights.push(
      insight({
        kind: 'too_fast',
        severity: 'warn',
        action: goal === 'lose' ? 'increase_calories' : 'reduce_calories',
        suggestedDailyCalories: next.dailyCalories,
        suggestedWeeklyChangeKg: slower,
      }),
    )
    return { stats, insights }
  }

  if (spanDays >= SLOW_TREND_DAYS && progressRatio != null && progressRatio < SLOW_RATIO) {
    const gap = Math.max(0.1, expectedAbs - Math.max(0, towardGoal))
    const weekly = suggestedPace(goal, plan.input.weeklyChangeKg, gap)
    const rebuilt = planForWeight(plan, latestKg ?? plan.input.weightKg, weekly, goal)
    insights.push(
      insight({
        kind: 'too_slow',
        severity: 'warn',
        action: goal === 'lose' ? 'reduce_calories' : 'increase_calories',
        suggestedDailyCalories: rebuilt.dailyCalories,
        suggestedWeeklyChangeKg: weekly,
      }),
    )
    return { stats, insights }
  }

  insights.push(insight({ kind: 'on_track', severity: 'success', action: 'none' }))
  return { stats, insights }
}

export function lastWeighInLabelDays(logs: WeightEntry[] | undefined): number | null {
  const last = latestWeight(logs)
  if (!last) return null
  return daysSince(last.date)
}

export { MIN_WEIGHT_KG, MAX_WEIGHT_KG }
