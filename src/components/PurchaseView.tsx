import { Check, ShoppingCart, Trash2 } from 'lucide-react'
import { getIngredient, ingredientUnit } from '../data/catalog'
import { categoryLabel, ingredientAltName, ingredientName, t } from '../i18n'
import { unitLabel } from '../lib/calories'
import type { AppStore } from '../hooks/useAppStore'

interface Props {
  store: AppStore
}

export function PurchaseView({ store }: Props) {
  const { purchaseList, updatePurchaseItem, removePurchaseItem, completePurchaseList, locale } =
    store
  const completable = purchaseList.some((item) => item.grams > 0)

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
                onClick={completePurchaseList}
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
    </div>
  )
}
