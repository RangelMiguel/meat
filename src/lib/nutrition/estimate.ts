import { completeWithUserSettings } from '../ai/complete'
import { loadPrivateAiSettings } from '../ai/settings'
import { loadMeatPrivacy } from '../ai/privacyBook'
import type { NutritionHit } from './types'

export async function estimateNutritionWithAi(
  userId: string,
  prompt: { barcode?: string; query?: string },
): Promise<NutritionHit | null> {
  const settings = await loadPrivateAiSettings(userId)
  if (!settings) return null
  const label = prompt.query?.trim() || (prompt.barcode ? `barcode ${prompt.barcode}` : '')
  if (!label) return null
  const privacy = await loadMeatPrivacy(userId)
  const result = await completeWithUserSettings(settings, [
    {
      role: 'system',
      content: [
        'Estimate nutrition for one typical retail serving of a packaged food.',
        'If the user says bag, bottle, can, or pack, estimate that whole package.',
        'Reply with JSON only, no markdown:',
        '{"name":"","servingLabel":"","kcal":0,"protein":0,"carbs":0,"fat":0}',
        'Numbers are for that one serving/package. Use grams for macros.',
      ].join(' '),
    },
    {
      role: 'user',
      content: prompt.barcode
        ? `Product: ${label}. Barcode: ${prompt.barcode}.`
        : `Product: ${label}`,
    },
  ], { temperature: 0.1, privacy: privacy.book })

  const parsed = parseEstimate(result.text)
  if (!parsed) return null
  return {
    name: parsed.name || prompt.query?.trim() || 'Packaged food',
    barcode: prompt.barcode,
    servingLabel: parsed.servingLabel || '1 serving (estimate)',
    serving: {
      kcal: Math.max(0, Math.round(parsed.kcal)),
      protein: Math.max(0, round1(parsed.protein)),
      carbs: Math.max(0, round1(parsed.carbs)),
      fat: Math.max(0, round1(parsed.fat)),
    },
    source: 'ai',
    estimated: true,
  }
}

function parseEstimate(text: string): {
  name?: string
  servingLabel?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
} | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const raw = JSON.parse(match[0]) as Record<string, unknown>
    const kcal = Number(raw.kcal)
    if (!Number.isFinite(kcal) || kcal <= 0) return null
    return {
      name: typeof raw.name === 'string' ? raw.name : undefined,
      servingLabel: typeof raw.servingLabel === 'string' ? raw.servingLabel : undefined,
      kcal,
      protein: Number(raw.protein) || 0,
      carbs: Number(raw.carbs) || 0,
      fat: Number(raw.fat) || 0,
    }
  } catch {
    return null
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
