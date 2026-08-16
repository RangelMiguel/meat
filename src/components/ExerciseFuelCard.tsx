import { Sparkles } from 'lucide-react'
import { t, type Locale } from '../i18n'
import type { FuelSuggestion } from '../lib/exercises'

interface Props {
  locale: Locale
  fuel: FuelSuggestion
  name?: string
}

export function ExerciseFuelCard({ locale, fuel, name }: Props) {
  const eatBackId =
    fuel.goal === 'lose'
      ? 'fuelEatBackLose'
      : fuel.goal === 'gain'
        ? 'fuelEatBackGain'
        : 'fuelEatBackMaintain'
  const styleId =
    fuel.style === 'strength'
      ? 'fuelStyleStrength'
      : fuel.style === 'endurance'
        ? 'fuelStyleEndurance'
        : fuel.style === 'mixed'
          ? 'fuelStyleMixed'
          : 'fuelStyleRecovery'

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h4>
            <Sparkles size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {name ? t(locale, 'fuelTitleName', { name }) : t(locale, 'fuelTitle')}
          </h4>
          <p className="sub">
            {t(locale, eatBackId, {
              burned: fuel.burned,
              eat: fuel.eatBackKcal,
              pct: fuel.eatBackPct,
            })}
          </p>
        </div>
      </div>
      <p className="field-hint" style={{ marginTop: 0 }}>
        {t(locale, styleId)}
      </p>
      <div className="result-grid portion-macros">
        <div className="result-tile">
          <span>{t(locale, 'fuelExtra')}</span>
          <strong>+{fuel.eatBackKcal}</strong>
          <em>kcal</em>
        </div>
        <div className="result-tile">
          <span>{t(locale, 'protein')}</span>
          <strong>+{fuel.extraProteinG}g</strong>
          <em>{t(locale, 'macros')}</em>
        </div>
        <div className="result-tile">
          <span>{t(locale, 'carbs')}</span>
          <strong>+{fuel.extraCarbsG}g</strong>
          <em>{t(locale, 'macros')}</em>
        </div>
        <div className="result-tile">
          <span>{t(locale, 'fat')}</span>
          <strong>+{fuel.extraFatG}g</strong>
          <em>{t(locale, 'macros')}</em>
        </div>
      </div>
      <div className="portion-budget" style={{ marginTop: '0.85rem' }}>
        <div className="meta-row-inline">
          <span>{t(locale, 'fuelTargets')}</span>
          <strong>
            {fuel.targetKcal} kcal · P{fuel.targetProteinG} C{fuel.targetCarbsG} F{fuel.targetFatG}
          </strong>
        </div>
        <div className="meta-row-inline">
          <span>{t(locale, 'fuelStill')}</span>
          <strong>
            {fuel.remainKcal} kcal · P{fuel.remainProteinG} C{fuel.remainCarbsG} F{fuel.remainFatG}
          </strong>
        </div>
      </div>
    </div>
  )
}
