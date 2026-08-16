import { t, type Locale } from '../i18n'

export interface EaterOption {
  id: string
  name: string
}

interface Props {
  locale: Locale
  eaters: EaterOption[]
  selected: string[]
  onChange: (ids: string[]) => void
  title?: string
  hint?: string
}

export function EaterPicker({ locale, eaters, selected, onChange, title, hint }: Props) {
  if (eaters.length <= 1) return null

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      const next = selected.filter((item) => item !== id)
      if (next.length === 0) return
      onChange(next)
      return
    }
    onChange([...selected, id])
  }

  return (
    <div className="eater-picker">
      <div className="eater-picker-head">
        <label>{title ?? t(locale, 'whoIsEating')}</label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(eaters.map((eater) => eater.id))}
        >
          {t(locale, 'selectAll')}
        </button>
      </div>
      <p className="field-hint" style={{ marginTop: 0 }}>
        {hint ?? t(locale, 'whoIsEatingSub')}
      </p>
      <div className="eater-chips">
        {eaters.map((eater) => {
          const on = selected.includes(eater.id)
          return (
            <button
              key={eater.id}
              type="button"
              className={`eater-chip${on ? ' is-active' : ''}`}
              aria-pressed={on}
              onClick={() => toggle(eater.id)}
            >
              {eater.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
