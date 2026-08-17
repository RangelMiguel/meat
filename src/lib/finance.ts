import { getIngredient } from '../data/catalog'
import type { PurchaseItem } from '../types'

export type FinanceLinkConfig = {
  enabled: boolean
  baseUrl: string
  token: string
  lastStatus: 'idle' | 'ok' | 'error'
  lastError: string | null
  lastAt: string | null
}

export type FinanceLinkPublic = {
  enabled: boolean
  baseUrl: string
  hasToken: boolean
  lastStatus: FinanceLinkConfig['lastStatus']
  lastError: string | null
  lastAt: string | null
}

const empty: FinanceLinkConfig = {
  enabled: false,
  baseUrl: '',
  token: '',
  lastStatus: 'idle',
  lastError: null,
  lastAt: null,
}

export function emptyFinanceLink(): FinanceLinkConfig {
  return { ...empty }
}

export function parseFinanceLink(raw: unknown): FinanceLinkConfig {
  if (!raw || typeof raw !== 'object') return emptyFinanceLink()
  const root = raw as { misfinanzas?: unknown }
  const rec = (root.misfinanzas && typeof root.misfinanzas === 'object'
    ? root.misfinanzas
    : raw) as Partial<FinanceLinkConfig>
  const lastStatus =
    rec.lastStatus === 'ok' || rec.lastStatus === 'error' || rec.lastStatus === 'idle'
      ? rec.lastStatus
      : 'idle'
  return {
    enabled: Boolean(rec.enabled),
    baseUrl: typeof rec.baseUrl === 'string' ? rec.baseUrl.trim() : '',
    token: typeof rec.token === 'string' ? rec.token.trim() : '',
    lastStatus,
    lastError: typeof rec.lastError === 'string' ? rec.lastError : null,
    lastAt: typeof rec.lastAt === 'string' ? rec.lastAt : null,
  }
}

export function publicFinanceLink(cfg: FinanceLinkConfig): FinanceLinkPublic {
  return {
    enabled: cfg.enabled && Boolean(cfg.baseUrl && cfg.token),
    baseUrl: cfg.baseUrl,
    hasToken: Boolean(cfg.token),
    lastStatus: cfg.lastStatus,
    lastError: cfg.lastError,
    lastAt: cfg.lastAt,
  }
}

export function serializeFinanceLink(cfg: FinanceLinkConfig): string {
  return JSON.stringify({
    misfinanzas: {
      enabled: cfg.enabled,
      baseUrl: cfg.baseUrl,
      token: cfg.token,
      lastStatus: cfg.lastStatus,
      lastError: cfg.lastError,
      lastAt: cfg.lastAt,
    },
  })
}

export function normalizeFinanceUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

export function purchaseItemsForFinance(items: PurchaseItem[]): { name: string; grams: number }[] {
  return items
    .filter((item) => item.grams > 0)
    .map((item) => ({
      name: getIngredient(item.ingredientId)?.name ?? item.ingredientId,
      grams: item.grams,
    }))
}

export async function postMeatPurchase(opts: {
  baseUrl: string
  token: string
  amount: number
  date: string
  description: string
  items: { name: string; grams: number }[]
  clientMutationId: string
}): Promise<{ ok: true; transactionId: string } | { ok: false; error: string }> {
  const url = `${normalizeFinanceUrl(opts.baseUrl)}/api/integrations/meat/purchases`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${opts.token}`,
        'idempotency-key': opts.clientMutationId,
      },
      body: JSON.stringify({
        amount: opts.amount,
        date: opts.date,
        description: opts.description,
        items: opts.items,
        source: 'meat',
        clientMutationId: opts.clientMutationId,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      transaction?: { id?: string }
    }
    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` }
    }
    return { ok: true, transactionId: data.transaction?.id ?? '' }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'networkError' }
  }
}

export async function testMeatConnection(opts: {
  baseUrl: string
  token: string
}): Promise<{ ok: true; householdName: string; currency: string } | { ok: false; error: string }> {
  const url = `${normalizeFinanceUrl(opts.baseUrl)}/api/integrations/meat/status`
  try {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${opts.token}` },
    })
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      householdName?: string
      currency?: string
    }
    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` }
    }
    return {
      ok: true,
      householdName: data.householdName || 'MisFinanzas',
      currency: data.currency || '',
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'networkError' }
  }
}
