import type { Goal, PlanInput } from '../types'

export type GoalPace = 'lose_fast' | 'lose' | 'maintain' | 'gain' | 'gain_fast'

export const GOAL_PACES: {
  id: GoalPace
  goal: Goal
  weeklyChangeKg: number
}[] = [
  { id: 'lose_fast', goal: 'lose', weeklyChangeKg: 0.75 },
  { id: 'lose', goal: 'lose', weeklyChangeKg: 0.4 },
  { id: 'maintain', goal: 'maintain', weeklyChangeKg: 0 },
  { id: 'gain', goal: 'gain', weeklyChangeKg: 0.4 },
  { id: 'gain_fast', goal: 'gain', weeklyChangeKg: 0.75 },
]

export function paceFromInput(input: Pick<PlanInput, 'goal' | 'weeklyChangeKg'>): GoalPace {
  if (input.goal === 'maintain') return 'maintain'
  if (input.goal === 'lose') return input.weeklyChangeKg >= 0.6 ? 'lose_fast' : 'lose'
  return input.weeklyChangeKg >= 0.6 ? 'gain_fast' : 'gain'
}

export function applyPace(pace: GoalPace): Pick<PlanInput, 'goal' | 'weeklyChangeKg'> {
  const row = GOAL_PACES.find((item) => item.id === pace) ?? GOAL_PACES[2]
  return { goal: row.goal, weeklyChangeKg: row.weeklyChangeKg }
}

export function paceIndex(pace: GoalPace): number {
  return Math.max(0, GOAL_PACES.findIndex((item) => item.id === pace))
}
