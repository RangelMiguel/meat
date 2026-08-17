import { useState } from 'react'
import { LogOut, Link2 } from 'lucide-react'
import type { AppStore } from '../hooks/useAppStore'
import { LOCALES, t } from '../i18n'
import { themes } from '../themes'
import { FamilyView } from './FamilyView'
import { PasskeysCard } from './PasskeysCard'
import { PwaInstallCard } from './PwaInstallCard'
import { AiSettingsCard } from './AiSettingsCard'

interface Props {
  store: AppStore
  onOpenMember: (memberId?: string) => void
}

export function SettingsView({ store, onOpenMember }: Props) {
  const locale = store.locale
  const finance = store.finance
  const [financeUrl, setFinanceUrl] = useState(finance.baseUrl)
  const [financeToken, setFinanceToken] = useState('')
  const [financeEnabled, setFinanceEnabled] = useState(finance.enabled)
  const [financeFlash, setFinanceFlash] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

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
                title={locale === 'es' ? theme.tagline.es : theme.tagline.en}
              >
                <span
                  className="theme-pill-dot"
                  style={{ background: theme.preview.primary }}
                  aria-hidden
                />
                {locale === 'es' ? theme.name.es : theme.name.en}
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

      <AiSettingsCard locale={locale} />

      <div className="card">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'financeTitle')}</h4>
            <p className="sub">{t(locale, 'financeSub')}</p>
          </div>
          <Link2 size={18} />
        </div>
        <div className="form-grid">
          <label className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={financeEnabled}
              onChange={(e) => setFinanceEnabled(e.target.checked)}
            />
            <span>{t(locale, 'financeEnable')}</span>
          </label>
          <div className="field">
            <label htmlFor="mf-url">{t(locale, 'financeUrl')}</label>
            <input
              id="mf-url"
              type="url"
              placeholder="https://…"
              value={financeUrl}
              onChange={(e) => setFinanceUrl(e.target.value)}
            />
            <p className="field-hint">{t(locale, 'financeUrlHint')}</p>
          </div>
          <div className="field">
            <label htmlFor="mf-token">{t(locale, 'financeToken')}</label>
            <input
              id="mf-token"
              type="password"
              autoComplete="off"
              placeholder={finance.hasToken ? '••••••••' : ''}
              value={financeToken}
              onChange={(e) => setFinanceToken(e.target.value)}
            />
            <p className="field-hint">
              {finance.hasToken ? t(locale, 'financeTokenKeep') : t(locale, 'financeTokenHint')}
            </p>
          </div>
          {finance.lastStatus === 'ok' && finance.lastAt && (
            <p className="field-hint">{t(locale, 'financeLastOk', { date: finance.lastAt.slice(0, 10) })}</p>
          )}
          {finance.lastStatus === 'error' && finance.lastError && (
            <p className="field-hint">{t(locale, 'financeLastErr', { error: finance.lastError })}</p>
          )}
          {financeFlash && <p className="field-hint">{financeFlash}</p>}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                store.saveFinanceIntegration({
                  enabled: financeEnabled,
                  baseUrl: financeUrl,
                  token: financeToken.trim() || undefined,
                })
                setFinanceToken('')
                setFinanceFlash(t(locale, 'financeSaved'))
              }}
            >
              {t(locale, 'financeSave')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={testing}
              onClick={async () => {
                setTesting(true)
                const result = await store.testFinanceIntegration()
                setTesting(false)
                if (!result) {
                  setFinanceFlash(t(locale, 'financeTestFail', { error: 'network' }))
                  return
                }
                setFinanceFlash(
                  result.lastStatus === 'ok'
                    ? t(locale, 'financeTestOk', { name: 'Finance' })
                    : t(locale, 'financeTestFail', { error: result.lastError || '' }),
                )
              }}
            >
              {t(locale, 'financeTest')}
            </button>
          </div>
        </div>
      </div>

      <PwaInstallCard store={store} />
      <PasskeysCard store={store} />

      <FamilyView store={store} onOpenMember={onOpenMember} />
    </div>
  )
}
