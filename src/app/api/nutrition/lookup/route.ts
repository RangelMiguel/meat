import { z } from 'zod'
import { requireSession } from '@/lib/auth'
import { jsonError, jsonOk } from '@/lib/access'
import { enforceRateLimit } from '@/lib/rate-limit'
import { lookupNutrition } from '@/lib/nutrition/lookup'

export async function POST(req: Request) {
  try {
    const session = await requireSession()
    await enforceRateLimit({
      key: `nutrition:${session.userId}`,
      limit: 30,
      windowSec: 60,
    })
    const body = z
      .object({
        barcode: z.string().max(32).optional(),
        query: z.string().max(160).optional(),
      })
      .parse(await req.json())
    if (!body.barcode?.trim() && !body.query?.trim()) {
      throw new Error('Enter a barcode or a product name')
    }
    const result = await lookupNutrition(session.userId, {
      barcode: body.barcode,
      query: body.query,
    })
    if (!result.hit) {
      return jsonOk({ hit: null, matches: [], error: 'not_found' })
    }
    return jsonOk({ hit: result.hit, matches: result.matches })
  } catch (e) {
    return jsonError(e)
  }
}
