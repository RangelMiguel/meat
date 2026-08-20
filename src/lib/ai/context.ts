import { getIngredient } from '../../data/catalog'
import { todayKey } from '../calories'
import { prisma } from '../db'
import { mondayOf, parseWeekPlan, slotsInWeek } from '../weekPlan'
import type { CaloriePlan } from '../../types'
import { redactForModel } from './privacy'
import { loadMeatPrivacy } from './privacyBook'

function parsePlan(raw: string | null): CaloriePlan | null {
  if (!raw) return null
  try {
    const plan = JSON.parse(raw) as CaloriePlan
    return plan && typeof plan === 'object' && plan.dailyCalories ? plan : null
  } catch {
    return null
  }
}

function clip(text: string, max = 12_000): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}\n…[truncated]`
}

export async function buildMeatContext(userId: string): Promise<string> {
  const member = await prisma.member.findFirst({
    where: { userId },
    include: {
      household: { include: { kitchen: { include: { inventory: true, purchases: true } } } },
      entries: { orderBy: { createdAt: 'desc' }, take: 40 },
      exercises: { orderBy: { createdAt: 'desc' }, take: 15 },
      weightLogs: { orderBy: { date: 'desc' }, take: 20 },
    },
  })
  if (!member) return 'No member profile found.'

  const today = todayKey()
  const plan = parsePlan(member.planJson)
  const privacy = await loadMeatPrivacy(userId)
  const lines: string[] = [
    'App: Meat (meals, calories, kitchen)',
    'Person: You',
    `Today: ${today}`,
    'Personal names, emails, phones, and keys are omitted.',
  ]
  if (plan) {
    lines.push(
      `Plan: ${plan.dailyCalories} kcal/day · P${plan.macros.proteinG} C${plan.macros.carbsG} F${plan.macros.fatG} · goal ${plan.input.goal}`,
    )
  }

  const todayFood = member.entries.filter((e) => e.date === today)
  const todayKcal = todayFood.reduce((s, e) => s + e.kcal, 0)
  lines.push(`Today eaten: ${Math.round(todayKcal)} kcal, ${todayFood.length} items`)
  for (const e of todayFood.slice(0, 12)) {
    lines.push(`- ${e.meal} ${e.name}: ${Math.round(e.kcal)} kcal`)
  }

  lines.push('Recent food log:')
  for (const e of member.entries.slice(0, 20)) {
    lines.push(`- ${e.date} ${e.meal} ${e.name}: ${Math.round(e.kcal)} kcal P${e.protein} C${e.carbs} F${e.fat}`)
  }

  const todayEx = member.exercises.filter((e) => e.date === today)
  if (todayEx.length) {
    const burned = todayEx.reduce((s, e) => s + e.kcal, 0)
    lines.push(`Today exercise: ${burned} kcal burned`)
  }

  if (member.weightLogs.length) {
    const latest = member.weightLogs[0]
    lines.push(`Latest weight: ${latest.kg} kg on ${latest.date}`)
    lines.push('Recent weigh-ins:')
    for (const log of member.weightLogs.slice(0, 12)) {
      lines.push(`- ${log.date}: ${log.kg} kg`)
    }
  }

  const kitchen = member.household.kitchen
  if (kitchen) {
    const week = parseWeekPlan(safeJson(kitchen.weekPlanJson))
    const planned = slotsInWeek(week.slots, mondayOf(today))
    if (planned.length) {
      lines.push('This week’s meal plan (a plan only — not logged as eaten):')
      for (const slot of planned.slice(0, 28)) {
        lines.push(`- ${slot.date} ${slot.meal}: recipe ${slot.recipeId} × ${slot.servings}`)
      }
    }
    if (kitchen.inventory.length) {
      lines.push('Inventory (on hand):')
      for (const lot of kitchen.inventory.slice(0, 25)) {
        const name = getIngredient(lot.ingredientId)?.name ?? lot.ingredientId
        lines.push(`- ${name}: ${lot.grams} (${lot.boughtOn})`)
      }
    }
    if (kitchen.purchases.length) {
      lines.push('Purchase list:')
      for (const item of kitchen.purchases.slice(0, 20)) {
        const name = getIngredient(item.ingredientId)?.name ?? item.ingredientId
        lines.push(`- ${name}: ${item.grams}`)
      }
    }
  }

  lines.push(
    'Completed shops can be sent to Finance as expenses when the Finance connection is enabled.',
  )
  return clip(redactForModel(lines.join('\n'), privacy.book))
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
