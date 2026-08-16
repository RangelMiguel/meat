import type { ExerciseKind, Goal, MacroTargets } from '../types'

export type ExerciseStyle = 'endurance' | 'strength' | 'mixed' | 'recovery'

export interface ExercisePreset {
  id: ExerciseKind
  /** Metabolic equivalent, used as kcal ≈ MET × kg × hours. */
  met: number
}

export const EXERCISE_PRESETS: ExercisePreset[] = [
  { id: 'walk', met: 3.5 },
  { id: 'run', met: 9.8 },
  { id: 'cycle', met: 7.5 },
  { id: 'swim', met: 8 },
  { id: 'weights', met: 5 },
  { id: 'yoga', met: 3 },
  { id: 'hiit', met: 8 },
  { id: 'hike', met: 6 },
  { id: 'dance', met: 5.5 },
  { id: 'sport', met: 7 },
  { id: 'other', met: 4 },
]

export function exerciseMet(kind: ExerciseKind): number {
  return EXERCISE_PRESETS.find((item) => item.id === kind)?.met ?? 4
}

/** kcal burned ≈ MET × body weight (kg) × hours. */
export function estimateExerciseKcal(
  kind: ExerciseKind,
  minutes: number,
  weightKg: number,
): number {
  const hours = Math.max(0, minutes) / 60
  const kg = weightKg > 0 ? weightKg : 70
  return Math.max(0, Math.round(exerciseMet(kind) * kg * hours))
}

export function exerciseStyle(kind: ExerciseKind): ExerciseStyle {
  if (kind === 'weights') return 'strength'
  if (kind === 'yoga' || kind === 'other') return 'recovery'
  if (kind === 'hiit' || kind === 'sport' || kind === 'dance') return 'mixed'
  return 'endurance'
}

export function dominantExerciseStyle(
  items: { kind: ExerciseKind; kcal: number }[],
): ExerciseStyle {
  const scores: Record<ExerciseStyle, number> = {
    endurance: 0,
    strength: 0,
    mixed: 0,
    recovery: 0,
  }
  for (const item of items) {
    scores[exerciseStyle(item.kind)] += Math.max(0, item.kcal)
  }
  return (Object.entries(scores) as [ExerciseStyle, number][]).sort((a, b) => b[1] - a[1])[0][0]
}

/** How much of the burn to eat back, by goal. */
export function eatBackShare(goal: Goal): number {
  if (goal === 'lose') return 0.5
  if (goal === 'gain') return 1
  return 0.9
}

/** Share of eat-back kcal for protein / carbs / fat. */
export function fuelSplit(style: ExerciseStyle): { protein: number; carbs: number; fat: number } {
  if (style === 'strength') return { protein: 0.35, carbs: 0.45, fat: 0.2 }
  if (style === 'endurance') return { protein: 0.18, carbs: 0.67, fat: 0.15 }
  if (style === 'mixed') return { protein: 0.25, carbs: 0.55, fat: 0.2 }
  return { protein: 0.3, carbs: 0.4, fat: 0.3 }
}

export interface FuelSuggestion {
  burned: number
  eatBackKcal: number
  extraProteinG: number
  extraCarbsG: number
  extraFatG: number
  targetKcal: number
  targetProteinG: number
  targetCarbsG: number
  targetFatG: number
  remainKcal: number
  remainProteinG: number
  remainCarbsG: number
  remainFatG: number
  style: ExerciseStyle
  eatBackPct: number
  goal: Goal
}

export function suggestFuel(opts: {
  burned: number
  exercises: { kind: ExerciseKind; kcal: number }[]
  goal: Goal
  planKcal: number
  planMacros: MacroTargets
  eatenKcal: number
  eatenProtein: number
  eatenCarbs: number
  eatenFat: number
}): FuelSuggestion {
  const style = dominantExerciseStyle(opts.exercises)
  const share = eatBackShare(opts.goal)
  const eatBackKcal = Math.max(0, Math.round(opts.burned * share))
  const split = fuelSplit(style)
  const extraProteinG = Math.round((eatBackKcal * split.protein) / 4)
  const extraFatG = Math.round((eatBackKcal * split.fat) / 9)
  const extraCarbsG = Math.max(
    0,
    Math.round((eatBackKcal - extraProteinG * 4 - extraFatG * 9) / 4),
  )
  const targetKcal = opts.planKcal + eatBackKcal
  const targetProteinG = opts.planMacros.proteinG + extraProteinG
  const targetCarbsG = opts.planMacros.carbsG + extraCarbsG
  const targetFatG = opts.planMacros.fatG + extraFatG
  return {
    burned: opts.burned,
    eatBackKcal,
    extraProteinG,
    extraCarbsG,
    extraFatG,
    targetKcal,
    targetProteinG,
    targetCarbsG,
    targetFatG,
    remainKcal: Math.max(0, targetKcal - opts.eatenKcal),
    remainProteinG: Math.max(0, Math.round(targetProteinG - opts.eatenProtein)),
    remainCarbsG: Math.max(0, Math.round(targetCarbsG - opts.eatenCarbs)),
    remainFatG: Math.max(0, Math.round(targetFatG - opts.eatenFat)),
    style,
    eatBackPct: Math.round(share * 100),
    goal: opts.goal,
  }
}

export function mergeFuel(parts: FuelSuggestion[]): FuelSuggestion | null {
  const active = parts.filter((part) => part.burned > 0)
  if (active.length === 0) return null
  const first = active[0]
  const sameGoal = active.every((part) => part.goal === first.goal)
  const styleScores: Record<ExerciseStyle, number> = {
    endurance: 0,
    strength: 0,
    mixed: 0,
    recovery: 0,
  }
  for (const part of active) styleScores[part.style] += part.burned
  const style = (Object.entries(styleScores) as [ExerciseStyle, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0]
  const sum = active.reduce(
    (acc, part) => ({
      burned: acc.burned + part.burned,
      eatBackKcal: acc.eatBackKcal + part.eatBackKcal,
      extraProteinG: acc.extraProteinG + part.extraProteinG,
      extraCarbsG: acc.extraCarbsG + part.extraCarbsG,
      extraFatG: acc.extraFatG + part.extraFatG,
      targetKcal: acc.targetKcal + part.targetKcal,
      targetProteinG: acc.targetProteinG + part.targetProteinG,
      targetCarbsG: acc.targetCarbsG + part.targetCarbsG,
      targetFatG: acc.targetFatG + part.targetFatG,
      remainKcal: acc.remainKcal + part.remainKcal,
      remainProteinG: acc.remainProteinG + part.remainProteinG,
      remainCarbsG: acc.remainCarbsG + part.remainCarbsG,
      remainFatG: acc.remainFatG + part.remainFatG,
    }),
    {
      burned: 0,
      eatBackKcal: 0,
      extraProteinG: 0,
      extraCarbsG: 0,
      extraFatG: 0,
      targetKcal: 0,
      targetProteinG: 0,
      targetCarbsG: 0,
      targetFatG: 0,
      remainKcal: 0,
      remainProteinG: 0,
      remainCarbsG: 0,
      remainFatG: 0,
    },
  )
  return {
    ...sum,
    style,
    eatBackPct:
      sum.burned > 0 ? Math.round((sum.eatBackKcal / sum.burned) * 100) : first.eatBackPct,
    goal: sameGoal ? first.goal : 'maintain',
  }
}
