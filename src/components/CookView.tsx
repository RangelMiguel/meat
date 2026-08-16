import { useMemo, useState } from 'react'
import { Check, ChefHat } from 'lucide-react'
import { formatCookAmount, getIngredient, macrosForAmount } from '../data/catalog'
import type { AppStore } from '../hooks/useAppStore'
import { ingredientAltName, ingredientName, mealLabel, recipeAltName, recipeName, t } from '../i18n'
import type { CookSession } from '../types'
import { clampGrams } from '../lib/calories'
import { formatMacrosLine, formatServings } from '../lib/portions'
import { displaySteps } from '../lib/recipeLibrary'

interface Props {
  store: AppStore
  session: CookSession
  onDone: () => void
}

export function CookView({ store, session, onDone }: Props) {
  const locale = store.locale
  const recipe = store.recipeById(session.recipeId)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [doneSteps, setDoneSteps] = useState<Record<number, boolean>>({})

  const lines = useMemo(() => {
    if (!recipe) return []
    const factor = session.servings / Math.max(1, recipe.servings)
    return recipe.ingredients.map((line, index) => {
      const ingredient = getIngredient(line.ingredientId)
      const grams = clampGrams(line.grams * factor)
      return {
        key: `${line.ingredientId}-${index}`,
        ingredient,
        note: line.note,
        grams,
        macros: ingredient ? macrosForAmount(ingredient.id, grams) : null,
      }
    })
  }, [recipe, session.servings])

  if (!recipe) {
    return (
      <div className="card empty-state">
        <h2>{t(locale, 'recipeNotFound')}</h2>
        <p>{t(locale, 'recipeGone')}</p>
        <button className="btn btn-primary" type="button" onClick={onDone}>
          {t(locale, 'backToToday')}
        </button>
      </div>
    )
  }

  const doneCount = lines.filter((line) => checked[line.key]).length
  const steps = displaySteps(recipe, locale)

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'cooking')}</h2>
        <span>
          {formatServings(session.servings, locale)} · {mealLabel(locale, session.meal)}
          {session.eaterNames && session.eaterNames.length > 0
            ? ` · ${t(locale, 'cookingFor', {
                count: session.eaterNames.length,
                names: session.eaterNames.join(', '),
              })}`
            : ''}
        </span>
      </div>

      <div className="card">
        <div className="card-header inventory-add-head">
          <div>
            <h3>
              <ChefHat size={18} style={{ verticalAlign: '-3px', marginRight: 8 }} />
              {recipeName(recipe, locale)}
            </h3>
            <p className="sub">
              {recipeAltName(recipe, locale)}
              {recipe.region ? ` · ${recipe.region}` : ''} ·{' '}
              {t(locale, 'cookScaled', {
                from: recipe.servings,
                to: formatServings(session.servings, locale),
              })}
            </p>
          </div>
          <span className="badge badge-primary">
            {t(locale, 'usedCount', { done: doneCount, total: lines.length })}
          </span>
        </div>
        {recipe.summary && <p className="recipe-summary">{recipe.summary}</p>}
        <p className="field-hint" style={{ marginBottom: '0.85rem' }}>
          {t(locale, 'cookHint')}
        </p>

        <ul className="cook-list">
          {lines.map((line) => {
            const isOn = Boolean(checked[line.key])
            return (
              <li key={line.key}>
                <label className={`cook-line${isOn ? ' is-done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() =>
                      setChecked((prev) => ({ ...prev, [line.key]: !prev[line.key] }))
                    }
                  />
                  <span className="cook-line-copy">
                    <strong>
                      {line.ingredient ? ingredientName(line.ingredient, locale) : line.key}
                    </strong>
                    <em>
                      {line.ingredient ? ingredientAltName(line.ingredient, locale) : ''}
                      {line.note ? ` · ${line.note}` : ''}
                      {line.macros ? ` · ${formatMacrosLine(line.macros)}` : ''}
                    </em>
                  </span>
                  <span className="inventory-amount">
                    {formatCookAmount(line.ingredient?.id ?? '', line.grams)}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        {steps.length > 0 && (
          <div className="recipe-prep">
            <h4>{t(locale, 'preparation')}</h4>
            <ol className="prep-steps cook-prep">
              {steps.map((step, index) => (
                <li key={`${recipe.id}-cook-step-${index}`}>
                  <label className={doneSteps[index] ? 'is-done' : ''}>
                    <input
                      type="checkbox"
                      checked={Boolean(doneSteps[index])}
                      onChange={() =>
                        setDoneSteps((prev) => ({ ...prev, [index]: !prev[index] }))
                      }
                    />
                    <span>{step}</span>
                  </label>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary" type="button" onClick={onDone}>
            <Check size={16} />
            {t(locale, 'doneCooking')}
          </button>
        </div>
      </div>
    </div>
  )
}
