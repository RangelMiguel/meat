import type { ExtraNutrients, MacroSet, NutritionHit } from './types'

const OFF_BASE = 'https://world.openfoodfacts.org'
const UA = 'MeatKitchen/1.0 (https://github.com/RangelMiguel/meat)'

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
  countries?: string
  nutriscore_grade?: string
  nutrition_grade_fr?: string
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

  const extras100g = extrasFrom(n, '100g')
  const extrasServing = extrasFrom(n, 'serving')
  const nutriscore = (product.nutriscore_grade || product.nutrition_grade_fr || '').trim().toLowerCase()
  const barcode = product.code || undefined

  return {
    name,
    nameEs: product.product_name_es?.trim() || undefined,
    brand: product.brands?.split(',')[0]?.trim() || undefined,
    barcode,
    servingLabel:
      product.serving_size?.trim() ||
      (servingQty > 0 ? `${servingQty}g` : per100.kcal === serving.kcal ? '100g' : undefined),
    quantity: product.quantity?.trim() || undefined,
    countries: product.countries?.trim() || undefined,
    url: barcode ? `${OFF_BASE}/product/${encodeURIComponent(barcode)}` : undefined,
    nutriscore: nutriscore || undefined,
    serving,
    per100g: per100.kcal > 0 ? per100 : undefined,
    pack,
    extras100g,
    extrasServing,
    source: 'openfoodfacts',
  }
}

function extrasFrom(n: Record<string, unknown>, suffix: '100g' | 'serving'): ExtraNutrients | undefined {
  const sugars = num(n[`sugars_${suffix}`] ?? (suffix === '100g' ? n.sugars : undefined))
  const fiber = num(n[`fiber_${suffix}`] ?? n[`fibre_${suffix}`])
  const salt = num(n[`salt_${suffix}`])
  const saturatedFat = num(n[`saturated-fat_${suffix}`])
  const sodiumG = num(n[`sodium_${suffix}`])
  if (sugars <= 0 && fiber <= 0 && salt <= 0 && saturatedFat <= 0 && sodiumG <= 0) return undefined
  return {
    ...(sugars > 0 ? { sugars: round1(sugars) } : {}),
    ...(fiber > 0 ? { fiber: round1(fiber) } : {}),
    ...(salt > 0 ? { salt: round1(salt) } : {}),
    ...(saturatedFat > 0 ? { saturatedFat: round1(saturatedFat) } : {}),
    ...(sodiumG > 0 ? { sodiumMg: Math.round(sodiumG * 1000) } : {}),
  }
}

export function formatOpenFoodFactsProduct(hit: NutritionHit) {
  return {
    name: hit.name,
    nameEs: hit.nameEs,
    brand: hit.brand,
    barcode: hit.barcode,
    countries: hit.countries,
    quantity: hit.quantity,
    servingLabel: hit.servingLabel,
    serving: { ...hit.serving, ...hit.extrasServing },
    per100g: hit.per100g ? { ...hit.per100g, ...hit.extras100g } : undefined,
    pack: hit.pack,
    nutriscore: hit.nutriscore,
    url: hit.url,
    source: 'openfoodfacts' as const,
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
  const pageSize = Math.min(Math.max(limit * 3, 8), 24)
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(pageSize),
    sort_by: 'unique_scans_n',
  })
  const data = (await offGet(`${OFF_BASE}/cgi/search.pl?${params.toString()}`)) as { products?: OffProduct[] }
  const hits: NutritionHit[] = []
  const seen = new Set<string>()
  for (const product of data.products ?? []) {
    const hit = fromProduct(product)
    if (!hit) continue
    const key = hit.barcode || `${fold(hit.brand)}|${fold(hit.name)}`
    if (seen.has(key)) continue
    seen.add(key)
    hits.push(hit)
    if (hits.length >= limit) break
  }
  return hits
}

function fold(value?: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
