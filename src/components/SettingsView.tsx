import { LogOut } from 'lucide-react'
import type { AppStore } from '../hooks/useAppStore'
import { LOCALES, t } from '../i18n'
import { themes } from '../themes'
import { FamilyView } from './FamilyView'
import { PasskeysCard } from './PasskeysCard'
import { PwaInstallCard } from './PwaInstallCard'

interface Props {
  store: AppStore
  onOpenMember: (memberId?: string) => void
}

export function SettingsView({ store, onOpenMember }: Props) {
  const locale = store.locale

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'settings')}</h2>
        <span>{t(locale, 'settingsSub')}</span>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'appearance')}</h4>
            <p className="sub">
              {t(locale, 'language')} · {t(locale, 'theme')}
            </p>
          </div>
        </div>
        <div className="field">
          <span className="theme-strip-label">{t(locale, 'language')}</span>
          <div className="theme-pills" role="tablist" aria-label={t(locale, 'language')}>
            {LOCALES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={locale === item.id}
                className={`theme-pill${locale === item.id ? ' is-active' : ''}`}
                onClick={() => store.setLocale(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginTop: '0.85rem' }}>
          <span className="theme-strip-label">{t(locale, 'theme')}</span>
          <div className="theme-pills" role="tablist" aria-label={t(locale, 'theme')}>
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                role="tab"
                aria-selected={store.theme === theme.id}
                className={`theme-pill${store.theme === theme.id ? ' is-active' : ''}`}
                onClick={() => store.setTheme(theme.id)}
                title={theme.tagline}
              >
                <span
                  className="theme-pill-dot"
                  style={{ background: theme.preview.primary }}
                  aria-hidden
                />
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'account')}</h4>
            <p className="sub">
              {t(locale, 'signedInAs', { name: store.account?.displayName ?? '' })}
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={store.logOut}>
            <LogOut size={16} />
            {t(locale, 'logOut')}
          </button>
        </div>
      </div>

      <PwaInstallCard store={store} />
      <PasskeysCard store={store} />

      <FamilyView store={store} onOpenMember={onOpenMember} />
    </div>
  )
}
