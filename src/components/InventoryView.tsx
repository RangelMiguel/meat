import { useMemo, useState, type FormEvent } from 'react'
import { Check, ChevronDown, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { getIngredient, INGREDIENTS, ingredientUnit, macrosForAmount } from '../data/catalog'
import type { Ingredient, IngredientCategory } from '../data/types'
import type { AppStore } from '../hooks/useAppStore'
import {
  categoryLabel,
  ingredientAltName,
  ingredientName,
  t,
} from '../i18n'
import type { InventoryItem } from '../types'
import {
  formatAmount,
  formatDateLabel,
  formatLotAge,
  formatMixedTotals,
  todayKey,
  unitLabel,
} from '../lib/calories'
import { formatMacrosLine } from '../lib/portions'

interface Props {
  store: AppStore
}

function ageBadgeClass(tone: 'fresh' | 'aging' | 'old'): string {
  if (tone === 'old') return 'badge badge-danger'
  if (tone === 'aging') return 'badge badge-warning'
  return 'badge badge-neutral'
}

export function InventoryView({ store }: Props) {
  const {
    inventory,
    addInventoryItem,
    updateInventoryLot,
    removeInventoryItem,
    gramsOnHand,
    locale,
  } = store
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<IngredientCategory | 'all'>('all')
  const [ingredientId, setIngredientId] = useState('')
  const [grams, setGrams] = useState(100)
  const [boughtOn, setBoughtOn] = useState(todayKey)
  const [listQuery, setListQuery] = useState('')
  const [listCategory, setListCategory] = useState<IngredientCategory | 'all'>('all')
  const [adding, setAdding] = useState(false)
  const [showNotInHand, setShowNotInHand] = useState(false)
  const [missingQuery, setMissingQuery] = useState('')
  const [missingCategory, setMissingCategory] = useState<IngredientCategory | 'all'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editGrams, setEditGrams] = useState(0)
  const [editBoughtOn, setEditBoughtOn] = useState(todayKey)

  const today = todayKey()
  const stock = inventory

  const categories = useMemo(() => {
    return Array.from(new Set(INGREDIENTS.map((i) => i.category))).sort()
  }, [])

  const picker = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = INGREDIENTS.filter((ing) => {
      if (category !== 'all' && ing.category !== category) return false
      if (!q) return true
      return (
        ing.name.toLowerCase().includes(q) ||
        ing.nameEs.toLowerCase().includes(q) ||
        categoryLabel(locale, ing.category).toLowerCase().includes(q) ||
        (ing.form?.toLowerCase().includes(q) ?? false)
      )
    })
    return [...list]
      .sort((a, b) => ingredientName(a, locale).localeCompare(ingredientName(b, locale), locale))
      .slice(0, 40)
  }, [query, category, locale])

  const selected = getIngredient(ingredientId)

  const groups = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    const byId = new Map<
      string,
      { ingredientId: string; ingredient?: Ingredient; lots: InventoryItem[] }
    >()

    for (const item of stock) {
      const ingredient = getIngredient(item.ingredientId)
      if (listCategory !== 'all' && ingredient?.category !== listCategory) continue
      if (q) {
        const hay = ingredient
          ? `${ingredient.name} ${ingredient.nameEs} ${categoryLabel(locale, ingredient.category)} ${item.boughtOn}`
          : item.ingredientId
        if (!hay.toLowerCase().includes(q)) continue
      }
      const group = byId.get(item.ingredientId)
      if (group) group.lots.push(item)
      else byId.set(item.ingredientId, { ingredientId: item.ingredientId, ingredient, lots: [item] })
    }

    return Array.from(byId.values())
      .map((group) => {
        const lots = [...group.lots].sort((a, b) => {
          const byDate = a.boughtOn.localeCompare(b.boughtOn)
          if (byDate !== 0) return byDate
          return a.createdAt.localeCompare(b.createdAt)
        })
        return {
          ...group,
          lots,
          totalGrams: lots.reduce((sum, lot) => sum + lot.grams, 0),
        }
      })
      .sort((a, b) => {
        const oldest = a.lots[0].boughtOn.localeCompare(b.lots[0].boughtOn)
        if (oldest !== 0) return oldest
        const aName = a.ingredient ? ingredientName(a.ingredient, locale) : a.ingredientId
        const bName = b.ingredient ? ingredientName(b.ingredient, locale) : b.ingredientId
        return aName.localeCompare(bName, locale)
      })
  }, [stock, listQuery, listCategory, locale])

  const onHandIds = useMemo(
    () => new Set(stock.map((item) => item.ingredientId)),
    [stock],
  )

  const missing = useMemo(() => {
    const q = missingQuery.trim().toLowerCase()
    return INGREDIENTS.filter((ing) => {
      if (onHandIds.has(ing.id)) return false
      if (missingCategory !== 'all' && ing.category !== missingCategory) return false
      if (!q) return true
      return (
        ing.name.toLowerCase().includes(q) ||
        ing.nameEs.toLowerCase().includes(q) ||
        categoryLabel(locale, ing.category).toLowerCase().includes(q) ||
        (ing.form?.toLowerCase().includes(q) ?? false)
      )
    }).sort((a, b) => ingredientName(a, locale).localeCompare(ingredientName(b, locale), locale))
  }, [onHandIds, missingQuery, missingCategory, locale])

  const missingTotal = INGREDIENTS.length - onHandIds.size

  const uniqueCount = new Set(stock.map((i) => i.ingredientId)).size
  const existingLots = selected
    ? stock.filter((i) => i.ingredientId === selected.id).length
    : 0
  const alreadyHave = selected ? gramsOnHand(selected.id) : 0

  const startEdit = (lot: InventoryItem) => {
    setEditingId(lot.id)
    setEditGrams(lot.grams)
    setEditBoughtOn(lot.boughtOn)
  }

  const saveEdit = () => {
    if (!editingId) return
    updateInventoryLot(editingId, { grams: editGrams, boughtOn: editBoughtOn })
    setEditingId(null)
  }

  const closeAdd = () => {
    setAdding(false)
    setIngredientId('')
    setQuery('')
    setCategory('all')
  }

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!selected || grams <= 0) return
    addInventoryItem({ ingredientId: selected.id, boughtOn, grams })
    closeAdd()
  }

  const startAddFromMissing = (ingredient: Ingredient) => {
    setAdding(true)
    setIngredientId(ingredient.id)
    setCategory(ingredient.category)
    setQuery(ingredientName(ingredient, locale))
    setShowNotInHand(false)
    requestAnimationFrame(() => {
      document.getElementById('inventory-add')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const ingredientNoun = t(locale, uniqueCount === 1 ? 'ingredientOne' : 'ingredientMany')
  const totals =
    stock.length > 0
      ? formatMixedTotals(
          stock.map((item) => ({
            amount: item.grams,
            unit: ingredientUnit(item.ingredientId),
          })),
        )
      : ''

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'inventory')}</h2>
        <span>
          {uniqueCount} {ingredientNoun}
          {stock.length !== uniqueCount ? ` · ${stock.length} ${t(locale, 'lots')}` : ''}
          {totals ? ` · ${totals}` : ''}
        </span>
      </div>

      <form id="inventory-add" className="card" onSubmit={handleAdd}>
        <div className="card-header inventory-add-head">
          <div>
            <h4>{t(locale, 'addALot')}</h4>
            <p className="sub">{t(locale, 'addLotSub')}</p>
          </div>
          {adding ? (
            <button type="button" className="btn btn-ghost" onClick={closeAdd}>
              <X size={16} />
              {t(locale, 'cancel')}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              <Plus size={16} />
              {t(locale, 'addALot')}
            </button>
          )}
        </div>

        {adding && (
          <>
        <div className="form-row">
          <div className="field">
            <label htmlFor="inv-search">{t(locale, 'findIngredient')}</label>
            <div className="search-wrap">
              <Search size={16} className="search-icon" aria-hidden />
              <input
                id="inv-search"
                type="search"
                placeholder={t(locale, 'ingredientSearchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="inv-cat">{t(locale, 'category')}</label>
            <select
              id="inv-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as IngredientCategory | 'all')}
            >
              <option value="all">{t(locale, 'allCategories')}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(locale, c)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="inventory-pick-panel">
          <ul className="inventory-pick-list">
            {picker.map((ing) => {
              const have = gramsOnHand(ing.id)
              return (
                <li key={ing.id}>
                  <button
                    type="button"
                    className={`inventory-pick${ingredientId === ing.id ? ' is-active' : ''}`}
                    onClick={() => setIngredientId(ing.id)}
                  >
                    <span>
                      <strong>{ingredientName(ing, locale)}</strong>
                      <em>
                        {categoryLabel(locale, ing.category)}
                        {ing.form ? ` · ${ing.form}` : ''}
                      </em>
                    </span>
                    {have > 0 && (
                      <span className="badge badge-neutral">
                        {formatAmount(have, ingredientUnit(ing.id))}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
            {picker.length === 0 && (
              <li>
                <p className="meal-empty">{t(locale, 'noIngredientMatch')}</p>
              </li>
            )}
          </ul>
        </div>

        {selected && (
          <div className="inventory-add-lot">
            <div className="inventory-add-lot-head">
              <div>
                <strong>{ingredientName(selected, locale)}</strong>
                <p>
                  {alreadyHave > 0
                    ? t(locale, 'alreadyOnHand', {
                        amount: formatAmount(alreadyHave, ingredientUnit(selected.id)),
                        lots: existingLots,
                        lotsLabel: t(locale, existingLots === 1 ? 'lot' : 'lots'),
                      })
                    : t(locale, 'firstLot')}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setIngredientId('')}
                aria-label={t(locale, 'clearSelected')}
              >
                <X size={16} />
              </button>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="inv-grams">
                  {t(locale, 'amountUnit', { unit: unitLabel(ingredientUnit(selected.id)) })}
                </label>
                <input
                  id="inv-grams"
                  type="number"
                  min={1}
                  step={1}
                  value={grams}
                  onChange={(e) => setGrams(Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label htmlFor="inv-bought">{t(locale, 'boughtOn')}</label>
                <input
                  id="inv-bought"
                  type="date"
                  value={boughtOn}
                  max={today}
                  onChange={(e) => setBoughtOn(e.target.value || today)}
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={grams <= 0}>
              <Plus size={16} />
              {t(locale, 'addAmountLot', {
                amount: formatAmount(grams, ingredientUnit(selected.id)),
              })}
            </button>
          </div>
        )}
          </>
        )}
      </form>

      <div className="card">
        <div className="card-header inventory-onhand-head">
          <div>
            <h4>{t(locale, 'onHand')}</h4>
            <p className="sub">{t(locale, 'onHandSub')}</p>
          </div>
          {stock.length > 0 ? (
            <div className="inventory-onhand-filters">
              <label className="sr-only" htmlFor="inv-list-search">
                {t(locale, 'searchOnHand')}
              </label>
              <input
                id="inv-list-search"
                type="search"
                placeholder={t(locale, 'searchPlaceholder')}
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
              />
              <label className="sr-only" htmlFor="inv-list-cat">
                {t(locale, 'category')}
              </label>
              <select
                id="inv-list-cat"
                value={listCategory}
                onChange={(e) => setListCategory(e.target.value as IngredientCategory | 'all')}
              >
                <option value="all">{t(locale, 'allCategories')}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(locale, c)}
                  </option>
                ))}
              </select>
              <span className="badge badge-neutral">{groups.length}</span>
            </div>
          ) : (
            <span className="badge badge-neutral">{groups.length}</span>
          )}
        </div>

        {stock.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem 0.5rem' }}>
            <div className="empty-icon">
              <Plus size={28} />
            </div>
            <h2>{t(locale, 'nothingOnHand')}</h2>
            <p>{t(locale, 'addPurchaseHint')}</p>
          </div>
        ) : groups.length === 0 ? (
          <p className="meal-empty">{t(locale, 'noInventoryMatch')}</p>
        ) : (
          <div className="inventory-groups">
            {groups.map((group) => {
              const label = group.ingredient
                ? ingredientName(group.ingredient, locale)
                : t(locale, 'unknownIngredient')
              return (
              <article key={group.ingredientId} className="inventory-group">
                <header className="inventory-group-head">
                  <div>
                    <h5>{label}</h5>
                    <p>
                      {group.ingredient
                        ? `${ingredientAltName(group.ingredient, locale)} · ${categoryLabel(locale, group.ingredient.category)}`
                        : group.ingredientId}
                      {group.lots.length > 1 ? ` · ${group.lots.length} ${t(locale, 'lots')}` : ''}
                    </p>
                    {group.ingredient && (
                      <p className="inventory-macros">
                        {formatMacrosLine(macrosForAmount(group.ingredient.id, group.totalGrams))}
                      </p>
                    )}
                  </div>
                  <strong className="inventory-amount">
                    {formatAmount(
                      group.totalGrams,
                      ingredientUnit(group.ingredient?.id ?? group.ingredientId),
                    )}
                  </strong>
                </header>

                <ul className="inventory-lots">
                  {group.lots.map((lot, index) => {
                    const age = formatLotAge(lot.boughtOn, locale)
                    const useFirst = group.lots.length > 1 && index === 0
                    const editing = editingId === lot.id

                    return (
                      <li
                        key={lot.id}
                        className={`inventory-lot${useFirst ? ' is-oldest' : ''}${
                          editing ? ' is-editing' : ''
                        }`}
                      >
                        {editing ? (
                          <div className="inventory-lot-edit">
                            <div className="form-row">
                              <div className="field">
                                <label htmlFor={`edit-g-${lot.id}`}>
                                  {t(locale, 'amountUnit', {
                                    unit: unitLabel(
                                      ingredientUnit(group.ingredient?.id ?? group.ingredientId),
                                    ),
                                  })}
                                </label>
                                <input
                                  id={`edit-g-${lot.id}`}
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={editGrams}
                                  onChange={(e) => setEditGrams(Number(e.target.value))}
                                />
                              </div>
                              <div className="field">
                                <label htmlFor={`edit-d-${lot.id}`}>{t(locale, 'boughtOn')}</label>
                                <input
                                  id={`edit-d-${lot.id}`}
                                  type="date"
                                  value={editBoughtOn}
                                  max={today}
                                  onChange={(e) => setEditBoughtOn(e.target.value || lot.boughtOn)}
                                />
                              </div>
                            </div>
                            <div className="btn-row">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={saveEdit}
                              >
                                <Check size={14} />
                                {t(locale, 'save')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setEditingId(null)}
                              >
                                {t(locale, 'cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="inventory-lot-copy">
                              <strong>
                                {formatAmount(
                                  lot.grams,
                                  ingredientUnit(group.ingredient?.id ?? group.ingredientId),
                                )}
                              </strong>
                              {group.ingredient && (
                                <p className="inventory-macros">
                                  {formatMacrosLine(
                                    macrosForAmount(group.ingredient.id, lot.grams),
                                  )}
                                </p>
                              )}
                              <p>
                                {formatDateLabel(lot.boughtOn, locale)}
                                <span className={ageBadgeClass(age.tone)}>{age.label}</span>
                                {useFirst && (
                                  <span className="badge badge-warning">{t(locale, 'useFirst')}</span>
                                )}
                              </p>
                            </div>
                            <div className="inventory-lot-actions">
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon"
                                onClick={() => startEdit(lot)}
                                aria-label={t(locale, 'editLot', { name: label })}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon icon-danger"
                                onClick={() => removeInventoryItem(lot.id)}
                                aria-label={t(locale, 'removeLot', { name: label })}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </article>
            )})}
          </div>
        )}
      </div>

      <div className="card">
        <button
          type="button"
          className={`card-header inventory-add-head inventory-accordion${
            showNotInHand ? ' is-open' : ''
          }`}
          onClick={() => setShowNotInHand((open) => !open)}
          aria-expanded={showNotInHand}
        >
          <div>
            <h4>{t(locale, 'notInHand')}</h4>
            <p className="sub">
              {t(locale, 'notInHandSub', {
                count: missingTotal,
                noun: t(locale, missingTotal === 1 ? 'ingredientOne' : 'ingredientMany'),
              })}
            </p>
          </div>
          <span className="inventory-accordion-meta">
            <span className="badge badge-neutral">{missingTotal}</span>
            <ChevronDown size={18} />
          </span>
        </button>

        {showNotInHand && (
          <div className="inventory-missing">
            <div className="inventory-onhand-filters" style={{ marginBottom: '0.85rem' }}>
              <label className="sr-only" htmlFor="inv-missing-search">
                {t(locale, 'searchMissing')}
              </label>
              <input
                id="inv-missing-search"
                type="search"
                placeholder={t(locale, 'searchPlaceholder')}
                value={missingQuery}
                onChange={(e) => setMissingQuery(e.target.value)}
              />
              <label className="sr-only" htmlFor="inv-missing-cat">
                {t(locale, 'category')}
              </label>
              <select
                id="inv-missing-cat"
                value={missingCategory}
                onChange={(e) =>
                  setMissingCategory(e.target.value as IngredientCategory | 'all')
                }
              >
                <option value="all">{t(locale, 'allCategories')}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(locale, c)}
                  </option>
                ))}
              </select>
            </div>

            {missing.length === 0 ? (
              <p className="meal-empty">
                {missingTotal === 0 ? t(locale, 'everyOnHand') : t(locale, 'noMissingMatch')}
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t(locale, 'name')}</th>
                      <th>{locale === 'es' ? t(locale, 'englishName') : t(locale, 'displayName')}</th>
                      <th>{t(locale, 'category')}</th>
                      <th>{t(locale, 'kcalShort')}</th>
                      <th>P</th>
                      <th>C</th>
                      <th>F</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {missing.map((ing) => (
                      <tr key={ing.id}>
                        <td>
                          {ingredientName(ing, locale)}
                          {ing.form ? (
                            <div className="field-hint" style={{ margin: 0 }}>
                              {ing.form}
                            </div>
                          ) : null}
                        </td>
                        <td>{ingredientAltName(ing, locale)}</td>
                        <td>
                          <span className="badge badge-neutral">{categoryLabel(locale, ing.category)}</span>
                        </td>
                        <td className="mono">{ing.per100g.kcal}</td>
                        <td className="mono">{ing.per100g.protein}</td>
                        <td className="mono">{ing.per100g.carbs}</td>
                        <td className="mono">{ing.per100g.fat}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => startAddFromMissing(ing)}
                          >
                            <Plus size={14} />
                            {t(locale, 'addLot')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
