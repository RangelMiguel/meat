import { useState } from 'react'
import { Check, ShoppingCart, Snowflake, Trash2 } from 'lucide-react'
import { getIngredient, ingredientUnit } from '../data/catalog'
import { categoryLabel, ingredientAltName, ingredientName, t } from '../i18n'
import { todayKey, unitLabel } from '../lib/calories'
import { buildWeekShopping, storageLines, weekdayLong } from '../lib/weekPlan'
import type { AppStore } from '../hooks/useAppStore'

interface Props {
  store: AppStore
}

export function PurchaseView({ store }: Props) {
  const { purchaseList, updatePurchaseItem, removePurchaseItem, completePurchaseList, locale } =
    store
  const completable = purchaseList.some((item) => item.grams > 0)
  const financeReady = store.finance.enabled && store.finance.hasToken
  const [spendOpen, setSpendOpen] = useState(false)
  const [spendAmount, setSpendAmount] = useState('')
  const [spendNote, setSpendNote] = useState('')
  const [spendError, setSpendError] = useState<string | null>(null)
  const today = todayKey()
  const storageItems = buildWeekShopping({
    slots: store.weekPlan.slots.filter((slot) => slot.date >= today),
    recipesById: store.recipeById,
    gramsOnHand: store.gramsOnHand,
    purchaseList,
    shopDate: today,
  })
  const showStorage = storageItems.some((item) => storageLines(item, locale).length > 0)

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
            <h4>{t(locale, 'toBuy')}</h4>
            <p className="sub">{t(locale, 'purchaseSub')}</p>
          </div>
          <span className="badge badge-neutral">{purchaseList.length}</span>
        </div>

        {purchaseList.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem 0.5rem' }}>
            <div className="empty-icon">
              <ShoppingCart size={28} />
            </div>
            <h2>{t(locale, 'nothingToBuy')}</h2>
            <p>{t(locale, 'nothingToBuyBody')}</p>
          </div>
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
                onClick={() => {
                  if (financeReady) {
                    setSpendAmount('')
                    setSpendNote('')
                    setSpendError(null)
                    setSpendOpen(true)
                    return
                  }
                  completePurchaseList()
                }}
              >
                <Check size={16} />
                {t(locale, 'markComplete')}
              </button>
            </div>
            <p className="field-hint" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
              {t(locale, 'completeHint')}
            </p>
          </>
        )}
      </div>

      {showStorage && (
        <div className="card">
          <div className="card-header">
            <div>
              <h4>{t(locale, 'storeHow')}</h4>
              <p className="sub">{t(locale, 'storeHowSub')}</p>
            </div>
            <Snowflake size={18} />
          </div>
          <p className="field-hint" style={{ marginTop: 0 }}>
            {t(locale, 'weekShopHint', { date: weekdayLong(today, locale) })}
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

      {spendOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSpendOpen(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-labelledby="spend-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="spend-title">{t(locale, 'financeSpendTitle')}</h3>
            <p>{t(locale, 'financeSpendBody')}</p>
            <div className="field" style={{ marginTop: '0.85rem' }}>
              <label htmlFor="spend-amount">{t(locale, 'financeSpendAmount')}</label>
              <input
                id="spend-amount"
                type="number"
                min={0}
                step={0.01}
                value={spendAmount}
                onChange={(e) => setSpendAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="spend-note">{t(locale, 'financeSpendNote')}</label>
              <input
                id="spend-note"
                value={spendNote}
                onChange={(e) => setSpendNote(e.target.value)}
              />
            </div>
            {spendError && <p className="field-hint">{spendError}</p>}
            <div className="btn-row" style={{ marginTop: '0.85rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const amount = Number(spendAmount)
                  if (!Number.isFinite(amount) || amount <= 0) {
                    setSpendError(t(locale, 'financeNeedAmount'))
                    return
                  }
                  completePurchaseList({
                    spendAmount: amount,
                    spendNote: spendNote.trim() || undefined,
                  })
                  setSpendOpen(false)
                }}
              >
                {t(locale, 'financeSend')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  completePurchaseList({ skipFinance: true })
                  setSpendOpen(false)
                }}
              >
                {t(locale, 'financeSkip')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setSpendOpen(false)}>
                {t(locale, 'cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
