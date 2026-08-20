import { useMemo, useState } from 'react'
import { Check, ShoppingBag, ShoppingCart, Snowflake, Trash2 } from 'lucide-react'
import { getIngredient, ingredientUnit } from '../data/catalog'
import { categoryLabel, ingredientAltName, ingredientName, t } from '../i18n'
import { todayKey, unitLabel } from '../lib/calories'
import {
  buildWeekShopping,
  mondayOf,
  slotsInWeek,
  storageLines,
  weekdayLong,
} from '../lib/weekPlan'
import type { AppStore } from '../hooks/useAppStore'
import type { PurchaseItem } from '../types'

interface Props {
  store: AppStore
}

type ShopLine = {
  id: string
  ingredientId: string
  plannedGrams: number
  bought: boolean
  grams: string
  price: string
}

function linesFromList(list: PurchaseItem[]): ShopLine[] {
  return list.map((item) => ({
    id: item.id,
    ingredientId: item.ingredientId,
    plannedGrams: item.grams,
    bought: item.grams > 0,
    grams: item.grams > 0 ? String(item.grams) : '',
    price: '',
  }))
}

export function PurchaseView({ store }: Props) {
  const { purchaseList, updatePurchaseItem, removePurchaseItem, completePurchaseList, locale } =
    store
  const completable = purchaseList.some((item) => item.grams > 0)
  const financeReady = store.finance.enabled && store.finance.hasToken
  const [mode, setMode] = useState<'list' | 'shop'>('list')
  const [shopLines, setShopLines] = useState<ShopLine[]>([])
  const [spendNote, setSpendNote] = useState('')
  const [spendError, setSpendError] = useState<string | null>(null)
  const today = todayKey()
  const weekStart = mondayOf(today)
  const storageItems = buildWeekShopping({
    slots: slotsInWeek(store.weekPlan.slots, weekStart),
    recipesById: store.recipeById,
    gramsOnHand: store.gramsOnHand,
    purchaseList,
    shopDate: weekStart,
  })
  const showStorage = storageItems.some((item) => storageLines(item, locale).length > 0)

  const shopTotal = useMemo(
    () =>
      shopLines.reduce((sum, line) => {
        if (!line.bought) return sum
        const price = Number(line.price)
        return Number.isFinite(price) && price > 0 ? sum + price : sum
      }, 0),
    [shopLines],
  )
  const boughtCount = shopLines.filter((line) => line.bought && Number(line.grams) > 0).length

  const openShop = () => {
    setShopLines(linesFromList(purchaseList))
    setSpendNote('')
    setSpendError(null)
    setMode('shop')
  }

  const patchLine = (id: string, patch: Partial<ShopLine>) => {
    setShopLines((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const finishShop = (skipFinance: boolean) => {
    const items = shopLines
      .filter((line) => line.bought)
      .map((line) => {
        const grams = Number(line.grams)
        const price = Number(line.price)
        return {
          id: line.id,
          grams: Number.isFinite(grams) ? grams : 0,
          price: Number.isFinite(price) && price > 0 ? price : undefined,
        }
      })
      .filter((item) => item.grams > 0)

    if (items.length === 0) {
      setSpendError(t(locale, 'shopNeedBought'))
      return
    }

    const missingPrice = items.some((item) => item.price == null)
    if (financeReady && !skipFinance && missingPrice) {
      setSpendError(t(locale, 'shopNeedPrice'))
      return
    }

    completePurchaseList({
      items,
      spendAmount: shopTotal > 0 ? Math.round(shopTotal * 100) / 100 : undefined,
      spendNote: spendNote.trim() || undefined,
      skipFinance: skipFinance || !financeReady,
    })
    setMode('list')
    setShopLines([])
  }

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'purchaseList')}</h2>
        <span>
          {t(locale, 'itemsToBuy', {
            count: purchaseList.length,
            noun: t(locale, purchaseList.length === 1 ? 'itemOne' : 'itemMany'),
          })}
        </span>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h4>{mode === 'shop' ? t(locale, 'shopModeTitle') : t(locale, 'toBuy')}</h4>
            <p className="sub">{mode === 'shop' ? t(locale, 'shopModeSub') : t(locale, 'purchaseSub')}</p>
          </div>
          <span className="badge badge-neutral">
            {mode === 'shop' ? boughtCount : purchaseList.length}
          </span>
        </div>

        {purchaseList.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem 0.5rem' }}>
            <div className="empty-icon">
              <ShoppingCart size={28} />
            </div>
            <h2>{t(locale, 'nothingToBuy')}</h2>
            <p>{t(locale, 'nothingToBuyBody')}</p>
          </div>
        ) : mode === 'shop' ? (
          <>
            <ul className="inventory-lots shop-lines">
              {shopLines.map((line) => {
                const ingredient = getIngredient(line.ingredientId)
                const label = ingredient
                  ? ingredientName(ingredient, locale)
                  : t(locale, 'unknownIngredient')
                const unit = unitLabel(ingredientUnit(line.ingredientId))
                return (
                  <li
                    key={line.id}
                    className={`inventory-lot shop-line${line.bought ? '' : ' is-skipped'}`}
                  >
                    <label className="shop-bought">
                      <input
                        type="checkbox"
                        checked={line.bought}
                        onChange={(e) => patchLine(line.id, { bought: e.target.checked })}
                      />
                      <span className="inventory-lot-copy">
                        <strong>{label}</strong>
                        <p>
                          {t(locale, 'shopPlanned', {
                            amount: `${line.plannedGrams} ${unit}`,
                          })}
                        </p>
                      </span>
                    </label>
                    <div className="shop-line-fields">
                      <label className="inventory-grams-field">
                        <span>{t(locale, 'shopQty')}</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          disabled={!line.bought}
                          value={line.grams}
                          onChange={(e) => patchLine(line.id, { grams: e.target.value })}
                        />
                        <span>{unit}</span>
                      </label>
                      <label className="inventory-grams-field">
                        <span>{t(locale, 'shopPrice')}</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          disabled={!line.bought}
                          value={line.price}
                          onChange={(e) => patchLine(line.id, { price: e.target.value })}
                        />
                      </label>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="shop-total">
              <span>{t(locale, 'shopTotal')}</span>
              <strong>{shopTotal.toFixed(2)}</strong>
            </div>
            {financeReady && (
              <div className="field" style={{ marginTop: '0.85rem' }}>
                <label htmlFor="shop-note">{t(locale, 'financeSpendNote')}</label>
                <input
                  id="shop-note"
                  value={spendNote}
                  onChange={(e) => setSpendNote(e.target.value)}
                />
              </div>
            )}
            {spendError && <p className="field-hint">{spendError}</p>}
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={boughtCount === 0}
                onClick={() => finishShop(false)}
              >
                <Check size={16} />
                {financeReady ? t(locale, 'completeShopSend') : t(locale, 'completeShop')}
              </button>
              {financeReady && (
                <button type="button" className="btn btn-secondary" onClick={() => finishShop(true)}>
                  {t(locale, 'financeSkip')}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setMode('list')
                  setShopLines([])
                  setSpendError(null)
                }}
              >
                {t(locale, 'cancelShop')}
              </button>
            </div>
            <p className="field-hint" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
              {t(locale, 'completeHintShop')}
            </p>
          </>
        ) : (
          <>
            <ul className="inventory-lots">
              {purchaseList.map((item) => {
                const ingredient = getIngredient(item.ingredientId)
                const label = ingredient
                  ? ingredientName(ingredient, locale)
                  : t(locale, 'unknownIngredient')
                return (
                  <li key={item.id} className="inventory-lot">
                    <div className="inventory-lot-copy">
                      <strong>{label}</strong>
                      <p>
                        {ingredient
                          ? `${ingredientAltName(ingredient, locale)} · ${categoryLabel(locale, ingredient.category)}`
                          : item.ingredientId}
                      </p>
                    </div>
                    <div className="inventory-lot-actions">
                      <label className="inventory-grams-field">
                        <span className="sr-only">{t(locale, 'amountOf', { name: label })}</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={item.grams}
                          onChange={(e) => updatePurchaseItem(item.id, Number(e.target.value))}
                        />
                        <span>{unitLabel(ingredientUnit(item.ingredientId))}</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon icon-danger"
                        onClick={() => removePurchaseItem(item.id)}
                        aria-label={t(locale, 'removeFromList', { name: label })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!completable}
                onClick={openShop}
              >
                <ShoppingBag size={16} />
                {t(locale, 'startShop')}
              </button>
            </div>
            <p className="field-hint" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
              {t(locale, 'completeHint')}
            </p>
          </>
        )}
      </div>

      {showStorage && mode === 'list' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h4>{t(locale, 'storeHow')}</h4>
              <p className="sub">{t(locale, 'storeHowSub')}</p>
            </div>
            <Snowflake size={18} />
          </div>
          <p className="field-hint" style={{ marginTop: 0 }}>
            {t(locale, 'weekShopHint', { date: weekdayLong(weekStart, locale) })}
          </p>
          <ul className="storage-list">
            {storageItems.map((item) => {
              const ingredient = getIngredient(item.ingredientId)
              const label = ingredient ? ingredientName(ingredient, locale) : item.name
              const lines = storageLines(item, locale)
              if (lines.length === 0) return null
              return (
                <li key={item.ingredientId} className="storage-item">
                  <strong>{label}</strong>
                  {lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {purchaseList.length === 0 && store.finance.lastStatus === 'ok' && store.finance.lastAt && (
        <p className="field-hint">{t(locale, 'financeSent')}</p>
      )}
      {purchaseList.length === 0 && store.finance.lastStatus === 'error' && store.finance.lastError && (
        <p className="field-hint">{t(locale, 'financeLocalOnly', { error: store.finance.lastError })}</p>
      )}
    </div>
  )
}
