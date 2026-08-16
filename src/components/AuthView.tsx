import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import type { AppStore } from '../hooks/useAppStore'
import { LOCALES, t } from '../i18n'

interface Props {
  store: AppStore
}

export function AuthView({ store }: Props) {
  const locale = store.locale
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const result =
      mode === 'signup'
        ? await store.signUp({ email, displayName })
        : await store.logIn({ email })
    setBusy(false)
    if (result) setError(t(locale, result))
  }

  return (
    <div className="card auth-card">
      <div className="theme-pills" style={{ marginBottom: '0.85rem' }}>
        {LOCALES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`theme-pill${locale === item.id ? ' is-active' : ''}`}
            onClick={() => store.setLocale(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="card-header">
        <div>
          <h2>{t(locale, 'authTitle')}</h2>
          <p className="sub">{t(locale, 'authSub')}</p>
        </div>
      </div>
      <form
        className="form-grid"
        onSubmit={(e) => void handleSubmit(e)}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
      >
        {error && (
          <div className="alert alert-danger">
            <strong>{error}</strong>
          </div>
        )}
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="auth-name">{t(locale, 'yourName')}</label>
            <input
              id="auth-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-email">
            {mode === 'signup' ? t(locale, 'email') : t(locale, 'emailOptionalPasskey')}
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete={mode === 'signup' ? 'email' : 'username webauthn'}
            required={mode === 'signup'}
          />
          {mode === 'login' && (
            <p className="sub" style={{ marginTop: '0.35rem' }}>
              {t(locale, 'emailOptionalPasskeyHint')}
            </p>
          )}
        </div>
        {mode === 'signup' && (
          <p className="sub" style={{ margin: 0 }}>
            {t(locale, 'registerPasskeyPrompt')}
          </p>
        )}
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            <KeyRound size={16} />
            {busy
              ? mode === 'signup'
                ? t(locale, 'creatingPasskey')
                : t(locale, 'passkeyWaiting')
              : mode === 'signup'
                ? t(locale, 'createWithPasskey')
                : t(locale, 'passkeyLogin')}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setMode((m) => (m === 'signup' ? 'login' : 'signup'))
              setError('')
            }}
          >
            {mode === 'signup' ? t(locale, 'haveAccount') : t(locale, 'needAccount')}
          </button>
        </div>
        <p className="sub" style={{ margin: 0 }}>
          {t(locale, 'passkeyHint')}
        </p>
      </form>
    </div>
  )
}
