import { useState, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { t, type Locale } from '../../i18n'
import type { View } from '../../types'
import { Sidebar } from './Sidebar'

interface Props {
  locale: Locale
  view: View
  cooking: boolean
  householdName?: string | null
  userName?: string
  footer?: ReactNode
  onGo: (view: View) => void
  onLocale: (locale: Locale) => void
  onLogout: () => void
  children: ReactNode
}

export function AppShell({
  locale,
  view,
  cooking,
  householdName,
  userName,
  footer,
  onGo,
  onLocale,
  onLogout,
  children,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="app-frame">
      <a href="#main-content" className="skip-link">
        {t(locale, 'skipToContent')}
      </a>

      <div className="app-sidebar-dock">
        <Sidebar
          locale={locale}
          view={view}
          cooking={cooking}
          householdName={householdName}
          userName={userName}
          onGo={onGo}
          onLocale={onLocale}
          onLogout={onLogout}
        />
      </div>

      {open && (
        <div className="sidebar-drawer">
          <button
            type="button"
            className="sidebar-drawer-backdrop"
            aria-label={t(locale, 'closeMenu')}
            onClick={() => setOpen(false)}
          />
          <div className="sidebar-drawer-panel">
            <Sidebar
              locale={locale}
              view={view}
              cooking={cooking}
              householdName={householdName}
              userName={userName}
              onGo={onGo}
              onLocale={onLocale}
              onLogout={onLogout}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="app-column">
        <header className="app-topbar">
          <div className="app-topbar-left">
            <button
              type="button"
              className="btn btn-ghost btn-icon menu-toggle"
              aria-label={open ? t(locale, 'closeMenu') : t(locale, 'openMenu')}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="font-display topbar-title-mobile">meat</div>
            <div className="topbar-crumb">
              <span>meat</span>
              {householdName ? (
                <>
                  <span className="topbar-sep">/</span>
                  <span className="topbar-household">{householdName}</span>
                </>
              ) : null}
            </div>
          </div>
          {userName ? <div className="topbar-user">{userName}</div> : null}
        </header>

        <main id="main-content" className="page-stage" tabIndex={-1}>
          {children}
        </main>
        {footer ? <div className="app-status">{footer}</div> : null}
      </div>
    </div>
  )
}
