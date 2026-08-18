import { useMemo, useRef, useState } from 'react'
import { ChefHat, Download, Pencil, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import {
  CUISINE_OPTIONS,
  INGREDIENTS,
  ingredientUnit,
  recipeCuisine,
  resolveRecipeIngredients,
  type Cuisine,
  type Recipe,
} from '../data/catalog'
import type { AppStore } from '../hooks/useAppStore'
import {
  categoryLabel,
  cuisineName,
  ingredientName,
  recipeAltName,
  recipeName,
  t,
} from '../i18n'
import { formatAmount } from '../lib/calories'
import { canMakeServings } from '../lib/portions'
import {
  buildRecipePack,
  displaySteps,
  isUserRecipe,
  parseRecipePack,
} from '../lib/recipeLibrary'
import { RecipeForm } from './RecipeForm'

interface Props {
  store: AppStore
  onPrepare: (recipeId: string) => void
}

export function RecipesView({ store, onPrepare }: Props) {
  const recipes = store.recipes
  const locale = store.locale
  const [selectedId, setSelectedId] = useState(recipes[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState<Cuisine | 'all'>('all')
  const [category, setCategory] = useState<string>('all')
  const [editor, setEditor] = useState<'closed' | 'create' | 'edit'>('closed')
  const [packFlash, setPackFlash] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(() => {
    const pool =
      cuisine === 'all' ? recipes : recipes.filter((r) => recipeCuisine(r) === cuisine)
    return Array.from(new Set(pool.map((r) => r.category))).sort()
  }, [cuisine, recipes])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes
      .filter((r) => {
        if (cuisine !== 'all' && recipeCuisine(r) !== cuisine) return false
        if (category !== 'all' && r.category !== category) return false
        if (!q) return true
        const label = cuisineName(locale, recipeCuisine(r)).toLowerCase()
        const steps = displaySteps(r, locale).join(' ').toLowerCase()
        return (
          r.name.toLowerCase().includes(q) ||
          r.nameEs.toLowerCase().includes(q) ||
          label.includes(q) ||
          categoryLabel(locale, r.category).toLowerCase().includes(q) ||
          steps.includes(q) ||
          (r.region?.toLowerCase().includes(q) ?? false) ||
          (r.summary?.toLowerCase().includes(q) ?? false)
        )
      })
      .sort((a, b) => {
        const c = recipeCuisine(a).localeCompare(recipeCuisine(b))
        if (c !== 0) return c
        return recipeName(a, locale).localeCompare(recipeName(b, locale), locale)
      })
  }, [query, cuisine, category, recipes, locale])

  const selected: Recipe | undefined =
    list.find((r) => r.id === selectedId) ??
    recipes.find((r) => r.id === selectedId) ??
    list[0]

  const resolved = selected ? resolveRecipeIngredients(selected, store.customIngredients) : []
  const overridden = selected ? Boolean(store.recipeOverrides[selected.id]) : false

  const handleSaved = (recipe: Recipe) => {
    setSelectedId(recipe.id)
    setEditor('closed')
  }

  const householdRecipes = useMemo(() => {
    const custom = store.customRecipes
    const overrides = Object.values(store.recipeOverrides)
    const seen = new Set(custom.map((recipe) => recipe.id))
    return [...custom, ...overrides.filter((recipe) => !seen.has(recipe.id))]
  }, [store.customRecipes, store.recipeOverrides])

  const downloadPack = (recipes: Recipe[], filename: string) => {
    const blob = new Blob([JSON.stringify(buildRecipePack(recipes), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportAll = () => {
    const pack = householdRecipes.length ? householdRecipes : selected ? [selected] : []
    if (!pack.length) {
      setPackFlash(t(locale, 'recipePackEmpty'))
      return
    }
    downloadPack(pack, 'meat-recipes.json')
    setPackFlash(t(locale, 'recipePackExported', { n: pack.length }))
  }

  const exportOne = (recipe: Recipe) => {
    const slug = recipe.id.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
    downloadPack([recipe], `meat-recipe-${slug}.json`)
    setPackFlash(t(locale, 'recipePackExported', { n: 1 }))
  }

  const importFile = async (file: File) => {
    setPackFlash(null)
    try {
      const raw = JSON.parse(await file.text()) as unknown
      const { recipes: incoming, skipped } = parseRecipePack(raw)
      if (!incoming.length) {
        setPackFlash(t(locale, skipped ? 'recipePackNoneValid' : 'recipePackInvalid'))
        return
      }
      await store.importRecipes(incoming)
      setSelectedId(incoming[0].id)
      setPackFlash(
        skipped
          ? t(locale, 'recipePackImportedSome', { n: incoming.length, skipped })
          : t(locale, 'recipePackImported', { n: incoming.length }),
      )
    } catch {
      setPackFlash(t(locale, 'recipePackInvalid'))
    }
  }

  if (editor !== 'closed') {
    return (
      <div className="stack-lg">
        <div className="section-title">
          <h2>{t(locale, editor === 'create' ? 'newRecipeTitle' : 'editRecipeTitle')}</h2>
        </div>
        <RecipeForm
          initial={editor === 'edit' ? selected : null}
          locale={locale}
          existingCategories={Array.from(new Set(recipes.map((r) => r.category))).sort()}
          onSave={(draft) => handleSaved(store.saveRecipe(draft))}
          onCancel={() => setEditor('closed')}
        />
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'recipeCatalog')}</h2>
        <span>
          {t(locale, 'recipesCount', { recipes: recipes.length, ingredients: INGREDIENTS.length })}
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void importFile(file)
        }}
      />

      <div className="card">
        <div className="form-row form-row-3" style={{ marginBottom: 0 }}>
          <div className="field">
            <label htmlFor="recipe-search">{t(locale, 'search')}</label>
            <input
              id="recipe-search"
              type="search"
              placeholder={t(locale, 'recipeSearchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="recipe-cuisine">{t(locale, 'cuisine')}</label>
            <select
              id="recipe-cuisine"
              value={cuisine}
              onChange={(e) => {
                setCuisine(e.target.value as Cuisine | 'all')
                setCategory('all')
              }}
            >
              <option value="all">{t(locale, 'allCuisines')}</option>
              {CUISINE_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {cuisineName(locale, c.id)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="recipe-cat">{t(locale, 'category')}</label>
            <select
              id="recipe-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'recipePackTitle')}</h4>
            <p className="sub">{t(locale, 'recipePackSub')}</p>
          </div>
          <div className="btn-row" style={{ margin: 0 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
              <Upload size={14} />
              {t(locale, 'recipePackImport')}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={exportAll}>
              <Download size={14} />
              {t(locale, 'recipePackExport')}
            </button>
          </div>
        </div>
        {packFlash && <p className="field-hint">{packFlash}</p>}
      </div>

      <div className="recipes-layout">
        <div className="card recipe-list">
          <div className="card-header">
            <h4>{t(locale, 'dishes')}</h4>
            <div className="btn-row" style={{ margin: 0 }}>
              <span className="badge badge-neutral">{list.length}</span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setEditor('create')}
              >
                <Plus size={14} />
                {t(locale, 'newRecipe')}
              </button>
            </div>
          </div>
          <ul className="recipe-pick-list">
            {list.length === 0 && (
              <li>
                <p className="meal-empty">{t(locale, 'noRecipeMatch')}</p>
              </li>
            )}
            {list.map((r) => {
              const enough = canMakeServings(r, 1, store.gramsOnHand)
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`recipe-pick${selected?.id === r.id ? ' is-active' : ''}${
                      enough ? '' : ' is-unavailable'
                    }`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <strong>
                      {recipeName(r, locale)}
                      {isUserRecipe(r.id) ? ` · ${t(locale, 'yours')}` : ''}
                    </strong>
                    <span>
                      {cuisineName(locale, recipeCuisine(r))}
                      {r.region ? ` · ${r.region}` : ''} · {categoryLabel(locale, r.category)} ·{' '}
                      {r.ingredients.length} · {t(locale, 'servingsN', { n: r.servings })}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {selected && (
          <div className="card recipe-detail">
            <div className="card-header inventory-add-head">
              <div>
                <h3>{recipeName(selected, locale)}</h3>
                <p className="sub">
                  {recipeAltName(selected, locale)} · {cuisineName(locale, recipeCuisine(selected))}
                  {selected.region ? ` · ${selected.region}` : ''} ·{' '}
                  {categoryLabel(locale, selected.category)}
                </p>
              </div>
              <div className="btn-row" style={{ margin: 0 }}>
                <span className="badge badge-primary">
                  {t(locale, 'servingsN', { n: selected.servings })}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => exportOne(selected)}
                >
                  <Download size={14} />
                  {t(locale, 'recipePackExportOne')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditor('edit')}
                >
                  <Pencil size={14} />
                  {t(locale, 'edit')}
                </button>
                {overridden && !isUserRecipe(selected.id) && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => store.resetRecipe(selected.id)}
                  >
                    <RotateCcw size={14} />
                    {t(locale, 'reset')}
                  </button>
                )}
                {isUserRecipe(selected.id) && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm icon-danger"
                    onClick={() => {
                      if (!confirm(t(locale, 'deleteRecipeConfirm'))) return
                      store.deleteRecipe(selected.id)
                      setSelectedId(recipes.find((r) => r.id !== selected.id)?.id ?? '')
                    }}
                  >
                    <Trash2 size={14} />
                    {t(locale, 'delete')}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onPrepare(selected.id)}
                >
                  <ChefHat size={16} />
                  {t(locale, 'prepare')}
                </button>
              </div>
            </div>
            {selected.summary && <p className="recipe-summary">{selected.summary}</p>}
            <p className="field-hint" style={{ marginBottom: '0.75rem' }}>
              {t(locale, 'amountsFor', { n: selected.servings })}
            </p>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t(locale, 'ingredient')}</th>
                    <th>{t(locale, 'amount')}</th>
                    <th>{t(locale, 'per100g')}</th>
                    <th>{t(locale, 'thisAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {resolved.map(({ line, ingredient, lineMacros }) => (
                    <tr key={`${selected.id}-${line.ingredientId}-${line.note ?? ''}`}>
                      <td>
                        {ingredientName(ingredient, locale)}
                        {line.note ? (
                          <div className="field-hint" style={{ margin: 0 }}>
                            {line.note}
                          </div>
                        ) : null}
                      </td>
                      <td className="mono">
                        {formatAmount(line.grams, ingredientUnit(ingredient.id))}
                      </td>
                      <td className="mono">
                        {ingredient.per100g.kcal} kcal · P{ingredient.per100g.protein} C
                        {ingredient.per100g.carbs} F{ingredient.per100g.fat}
                      </td>
                      <td className="mono">
                        {lineMacros.kcal} kcal · P{lineMacros.protein} C{lineMacros.carbs} F
                        {lineMacros.fat}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="recipe-prep">
              <h4>{t(locale, 'preparation')}</h4>
              {displaySteps(selected, locale).length > 0 ? (
                <ol className="prep-steps">
                  {displaySteps(selected, locale).map((step, index) => (
                    <li key={`${selected.id}-step-${index}`}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="meal-empty">{t(locale, 'noSteps')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
