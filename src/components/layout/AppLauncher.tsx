import { useEffect, useRef, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { t, type Locale } from '../../i18n'

export type SuiteApp = {
  id: string
  label: string
  hint: string
  href: string
}

interface Props {
  locale: Locale
  apps: SuiteApp[]
}

export function AppLauncher({ locale, apps }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="suite-launcher" ref={rootRef}>
      <button
        type="button"
        className={`suite-launcher-btn${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t(locale, 'suiteApps')}
        onClick={() => setOpen((value) => !value)}
      >
        <LayoutGrid size={18} />
      </button>
      {open && (
        <div className="suite-launcher-menu" role="menu">
          <p className="suite-launcher-title">{t(locale, 'suiteApps')}</p>
          <div className="suite-launcher-grid">
            {apps.map((app) => (
              <a
                key={app.id}
                role="menuitem"
                className="suite-launcher-tile"
                href={app.href || undefined}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  if (!app.href) event.preventDefault()
                  setOpen(false)
                }}
              >
                <span className={`suite-launcher-mark suite-launcher-mark-${app.id}`}>
                  {app.id === 'finance' ? 'F' : app.label.slice(0, 1)}
                </span>
                <strong>{app.label}</strong>
                <em>{app.hint}</em>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
