import { prisma } from '../db'
import type { NutritionHit } from './types'

const MAX_PRODUCTS = 80

function parseProducts(raw: string): NutritionHit[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((row) => row && typeof row === 'object' && typeof (row as NutritionHit).name === 'string') as NutritionHit[]
  } catch {
    return []
  }
}

export async function readProductCache(kitchenId: string): Promise<NutritionHit[]> {
  const kitchen = await prisma.kitchen.findUnique({
    where: { id: kitchenId },
    select: { productsJson: true },
  })
  return kitchen ? parseProducts(kitchen.productsJson) : []
}

export async function findCachedProduct(
  kitchenId: string,
  opts: { barcode?: string; query?: string },
): Promise<NutritionHit | null> {
  const rows = await readProductCache(kitchenId)
  const barcode = opts.barcode?.replace(/\D/g, '')
  if (barcode) {
    const hit = rows.find((row) => row.barcode && row.barcode.replace(/\D/g, '') === barcode)
    if (hit) return { ...hit, source: 'cache' }
  }
  const q = fold(opts.query)
  if (q) {
    const hit = rows.find((row) => fold(row.name) === q || fold(`${row.brand} ${row.name}`) === q)
    if (hit) return { ...hit, source: 'cache' }
  }
  return null
}

export async function rememberProduct(kitchenId: string, hit: NutritionHit): Promise<void> {
  const rows = await readProductCache(kitchenId)
  const barcode = hit.barcode?.replace(/\D/g, '')
  const next: NutritionHit[] = [
    { ...hit, source: hit.source === 'ai' ? 'ai' as const : 'openfoodfacts' as const },
    ...rows.filter((row) => {
      if (barcode && row.barcode?.replace(/\D/g, '') === barcode) return false
      if (!barcode && fold(row.name) === fold(hit.name)) return false
      return true
    }),
  ].slice(0, MAX_PRODUCTS)
  await prisma.kitchen.update({
    where: { id: kitchenId },
    data: { productsJson: JSON.stringify(next) },
  })
}

function fold(value?: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
