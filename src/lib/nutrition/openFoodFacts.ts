import type { MacroSet, NutritionHit } from './types'

const OFF_BASE = 'https://world.openfoodfacts.org'
const UA = 'meat-nutrition/1.0 (household calorie log)'

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function macros(kcal: number, protein: number, carbs: number, fat: number): MacroSet {
  return {
    kcal: Math.max(0, Math.round(kcal)),
    protein: Math.max(0, round1(protein)),
    carbs: Math.max(0, round1(carbs)),
    fat: Math.max(0, round1(fat)),
  }
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return 0
}

type OffProduct = {
  code?: string
  product_name?: string
  product_name_en?: string
  product_name_es?: string
  brands?: string
  quantity?: string
  serving_size?: string
  serving_quantity?: number | string
  product_quantity?: number | string
  product_quantity_unit?: string
  nutriments?: Record<string, unknown>
}

function fromProduct(product: OffProduct): NutritionHit | null {
  const name =
    product.product_name?.trim() ||
    product.product_name_en?.trim() ||
    product.product_name_es?.trim()
  const n = product.nutriments ?? {}
  const per100 = macros(
    num(n['energy-kcal_100g'] ?? n['energy-kcal']),
    num(n.proteins_100g ?? n.proteins),
    num(n.carbohydrates_100g ?? n.carbohydrates),
    num(n.fat_100g ?? n.fat),
  )
  const servingRaw = macros(
    num(n['energy-kcal_serving']),
    num(n.proteins_serving),
    num(n.carbohydrates_serving),
    num(n.fat_serving),
  )
  const servingQty = num(product.serving_quantity)
  const scaledServing =
    servingRaw.kcal <= 0 && per100.kcal > 0 && servingQty > 0
      ? macros(
          (per100.kcal * servingQty) / 100,
          (per100.protein * servingQty) / 100,
          (per100.carbs * servingQty) / 100,
          (per100.fat * servingQty) / 100,
        )
      : servingRaw
  const serving = scaledServing.kcal > 0 ? scaledServing : per100
  if (!name || serving.kcal <= 0) return null

  const packQty = num(product.product_quantity)
  const packUnit = (product.product_quantity_unit || '').toLowerCase()
  const packIsMass = !packUnit || packUnit === 'g' || packUnit === 'gr' || packUnit === 'gram'
  const pack =
    per100.kcal > 0 && packQty > 0 && packIsMass
      ? {
          label: product.quantity?.trim() || `${packQty}g`,
          ...macros(
            (per100.kcal * packQty) / 100,
            (per100.protein * packQty) / 100,
            (per100.carbs * packQty) / 100,
            (per100.fat * packQty) / 100,
          ),
        }
      : undefined

  return {
    name,
    brand: product.brands?.split(',')[0]?.trim() || undefined,
    barcode: product.code || undefined,
    servingLabel:
      product.serving_size?.trim() ||
      (servingQty > 0 ? `${servingQty}g` : per100.kcal === serving.kcal ? '100g' : undefined),
    quantity: product.quantity?.trim() || undefined,
    serving,
    per100g: per100.kcal > 0 ? per100 : undefined,
    pack,
    source: 'openfoodfacts',
  }
}

async function offGet(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Open Food Facts ${res.status}`)
  return res.json()
}

export async function fetchProductByBarcode(barcode: string): Promise<NutritionHit | null> {
  const code = barcode.replace(/\D/g, '')
  if (code.length < 6) return null
  const data = (await offGet(`${OFF_BASE}/api/v2/product/${encodeURIComponent(code)}.json`)) as {
    status?: number
    product?: OffProduct
  }
  if (data.status !== 1 || !data.product) return null
  return fromProduct({ ...data.product, code: data.product.code || code })
}

export async function searchOpenFoodFacts(query: string, limit = 5): Promise<NutritionHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=${Math.min(Math.max(limit, 1), 8)}`
  const data = (await offGet(url)) as { products?: OffProduct[] }
  const hits: NutritionHit[] = []
  for (const product of data.products ?? []) {
    const hit = fromProduct(product)
    if (hit) hits.push(hit)
    if (hits.length >= limit) break
  }
  return hits
}
