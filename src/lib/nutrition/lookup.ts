import { requireHouseholdAccess } from '../auth'
import { findCachedProduct, rememberProduct } from './cache'
import { estimateNutritionWithAi } from './estimate'
import { fetchProductByBarcode, searchOpenFoodFacts } from './openFoodFacts'
import type { NutritionHit, NutritionLookupInput } from './types'

export type NutritionLookupResult = {
  hit: NutritionHit | null
  matches: NutritionHit[]
}

export async function lookupNutrition(
  userId: string,
  input: NutritionLookupInput,
): Promise<NutritionLookupResult> {
  const access = await requireHouseholdAccess(userId)
  const kitchenId = await kitchenIdForHousehold(access.householdId)
  const barcode = input.barcode?.replace(/\D/g, '') || undefined
  const query = input.query?.trim() || undefined

  if (kitchenId) {
    const cached = await findCachedProduct(kitchenId, { barcode, query })
    if (cached) return { hit: cached, matches: [cached] }
  }

  if (barcode) {
    try {
      const off = await fetchProductByBarcode(barcode)
      if (off) {
        if (kitchenId) await rememberProduct(kitchenId, off)
        return { hit: off, matches: [off] }
      }
    } catch {
      /* fall through */
    }
  }

  const search = query || barcode
  let matches: NutritionHit[] = []
  if (search) {
    try {
      matches = await searchOpenFoodFacts(search, barcode ? 3 : 5)
    } catch {
      matches = []
    }
  }
  if (matches[0]) {
    if (kitchenId) await rememberProduct(kitchenId, matches[0])
    return { hit: matches[0], matches }
  }

  const estimated = await estimateNutritionWithAi(userId, { barcode, query: query || barcode })
  if (estimated) {
    if (kitchenId && (barcode || query)) await rememberProduct(kitchenId, estimated)
    return { hit: estimated, matches: [estimated] }
  }
  return { hit: null, matches: [] }
}

async function kitchenIdForHousehold(householdId: string): Promise<string | undefined> {
  const { prisma } = await import('../db')
  const kitchen = await prisma.kitchen.findUnique({
    where: { householdId },
    select: { id: true },
  })
  return kitchen?.id
}
