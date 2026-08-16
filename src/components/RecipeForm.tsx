import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  CUISINE_OPTIONS,
  INGREDIENTS,
  ingredientUnit,
  type Cuisine,
  type Recipe,
} from '../data/catalog'
import { cuisineName, ingredientName, t, type Locale } from '../i18n'
import { unitLabel } from '../lib/calories'
import type { RecipeIngredient } from '../data/types'

interface Props {
  initial?: Recipe | null
  existingCategories: string[]
  locale: Locale
  onSave: (recipe: Omit<Recipe, 'id'> & { id?: string }) => void
  onCancel: () => void
}

const emptyLine = (): RecipeIngredient => ({ ingredientId: '', grams: 0, note: '' })

export function RecipeForm({ initial, existingCategories, locale, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [nameEs, setNameEs] = useState(initial?.nameEs ?? '')
  const [cuisine, setCuisine] = useState<Cuisine>(initial?.cuisine ?? 'mexican')
  const [category, setCategory] = useState(initial?.category ?? 'plato-fuerte')
  const [region, setRegion] = useState(initial?.region ?? '')
  const [servings, setServings] = useState(initial?.servings ?? 4)
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initial?.ingredients.length ? initial.ingredients : [emptyLine()],
  )
  const [steps, setSteps] = useState<string[]>(
    initial?.steps?.length ? initial.steps : [''],
  )
  const [ingQuery, setIngQuery] = useState('')

  const ingredientOptions = useMemo(() => {
    const q = ingQuery.trim().toLowerCase()
    const list = !q
      ? INGREDIENTS
      : INGREDIENTS.filter(
          (ing) =>
            ing.name.toLowerCase().includes(q) ||
            ing.nameEs.toLowerCase().includes(q) ||
            ing.category.includes(q),
        )
    return [...list]
      .sort((a, b) => ingredientName(a, locale).localeCompare(ingredientName(b, locale), locale))
      .slice(0, 80)
  }, [ingQuery, locale])

  const updateLine = (index: number, patch: Partial<RecipeIngredient>) => {
    setIngredients((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const cleanIngredients = ingredients.filter((line) => line.ingredientId && line.grams > 0)
    if (!name.trim() || cleanIngredients.length === 0) return
    onSave({
      id: initial?.id,
      name: name.trim(),
      nameEs: nameEs.trim() || name.trim(),
      cuisine,
      category: category.trim() || 'plato-fuerte',
      region: region.trim() || undefined,
      servings: Math.max(1, servings),
      summary: summary.trim() || undefined,
      ingredients: cleanIngredients,
      steps: steps.map((step) => step.trim()).filter(Boolean),
    })
  }

  return (
    <form className="card stack-lg" onSubmit={handleSubmit}>
      <div className="card-header">
        <div>
          <h4>{t(locale, initial ? 'editRecipeTitle' : 'newRecipeTitle')}</h4>
          <p className="sub">{t(locale, 'formRecipeSub')}</p>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="rf-name">{t(locale, 'englishName')}</label>
          <input id="rf-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="rf-name-es">{t(locale, 'displayName')}</label>
          <input
            id="rf-name-es"
            value={nameEs}
            onChange={(e) => setNameEs(e.target.value)}
            placeholder={t(locale, 'sameAsName')}
          />
        </div>
      </div>

      <div className="form-row form-row-3">
        <div className="field">
          <label htmlFor="rf-cuisine">{t(locale, 'cuisine')}</label>
          <select
            id="rf-cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value as Cuisine)}
          >
            {CUISINE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {cuisineName(locale, option.id)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rf-cat">{t(locale, 'category')}</label>
          <input
            id="rf-cat"
            list="rf-cat-list"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="rf-cat-list">
            {existingCategories.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="rf-servings">{t(locale, 'servings')}</label>
          <input
            id="rf-servings"
            type="number"
            min={1}
            step={1}
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="rf-region">{t(locale, 'regionOptional')}</label>
        <input id="rf-region" value={region} onChange={(e) => setRegion(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="rf-summary">{t(locale, 'summary')}</label>
        <textarea
          id="rf-summary"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      <div>
        <div className="card-header" style={{ marginBottom: '0.55rem' }}>
          <h4>{t(locale, 'ingredients')}</h4>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIngredients((rows) => [...rows, emptyLine()])}
          >
            <Plus size={14} />
            {t(locale, 'addIngredient')}
          </button>
        </div>
        <div className="field" style={{ marginBottom: '0.55rem' }}>
          <label htmlFor="rf-ing-filter">{t(locale, 'filterIngredients')}</label>
          <input
            id="rf-ing-filter"
            type="search"
            placeholder={t(locale, 'searchCatalog')}
            value={ingQuery}
            onChange={(e) => setIngQuery(e.target.value)}
          />
        </div>
        <div className="stack-lg">
          {ingredients.map((line, index) => (
            <div key={`${index}-${line.ingredientId}`} className="form-row form-row-3">
              <div className="field">
                <label htmlFor={`rf-ing-${index}`}>{t(locale, 'ingredient')}</label>
                <select
                  id={`rf-ing-${index}`}
                  value={line.ingredientId}
                  onChange={(e) => updateLine(index, { ingredientId: e.target.value })}
                >
                  <option value="">{t(locale, 'choose')}</option>
                  {ingredientOptions.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ingredientName(ing, locale)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`rf-amt-${index}`}>
                  {t(locale, 'amountUnit', {
                    unit: line.ingredientId
                      ? unitLabel(ingredientUnit(line.ingredientId))
                      : t(locale, 'unitGMl'),
                  })}
                </label>
                <input
                  id={`rf-amt-${index}`}
                  type="number"
                  min={0}
                  step={0.1}
                  value={line.grams || ''}
                  onChange={(e) => updateLine(index, { grams: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label htmlFor={`rf-note-${index}`}>{t(locale, 'note')}</label>
                <div className="btn-row" style={{ margin: 0, alignItems: 'center' }}>
                  <input
                    id={`rf-note-${index}`}
                    value={line.note ?? ''}
                    onChange={(e) => updateLine(index, { note: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon icon-danger"
                    onClick={() =>
                      setIngredients((rows) => rows.filter((_, i) => i !== index))
                    }
                    aria-label={t(locale, 'removeIngredient')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="card-header" style={{ marginBottom: '0.55rem' }}>
          <h4>{t(locale, 'preparation')}</h4>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSteps((rows) => [...rows, ''])}
          >
            <Plus size={14} />
            {t(locale, 'addStep')}
          </button>
        </div>
        <div className="stack-lg">
          {steps.map((step, index) => (
            <div key={index} className="field">
              <label htmlFor={`rf-step-${index}`}>{t(locale, 'stepN', { n: index + 1 })}</label>
              <div className="btn-row" style={{ margin: 0, alignItems: 'flex-start' }}>
                <textarea
                  id={`rf-step-${index}`}
                  rows={2}
                  value={step}
                  onChange={(e) =>
                    setSteps((rows) => rows.map((row, i) => (i === index ? e.target.value : row)))
                  }
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon icon-danger"
                  onClick={() => setSteps((rows) => rows.filter((_, i) => i !== index))}
                  aria-label={t(locale, 'removeStep', { n: index + 1 })}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" type="submit">
          {t(locale, 'saveRecipe')}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>
          {t(locale, 'cancel')}
        </button>
      </div>
    </form>
  )
}
