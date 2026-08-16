import { useState, type FormEvent } from 'react'
import { LogIn, UserPlus } from 'lucide-react'
import type { AppStore } from '../hooks/useAppStore'
import { LOCALES, t } from '../i18n'

interface Props {
  store: AppStore
}

export function AuthView({ store }: Props) {
  const locale = store.locale
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const result =
      mode === 'signup'
        ? await store.signUp({ email, password, displayName })
        : await store.logIn({ email, password })
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
      <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
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
          <label htmlFor="auth-email">{t(locale, 'email')}</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="auth-pass">{t(locale, 'password')}</label>
          <input
            id="auth-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={mode === 'signup' ? 6 : undefined}
            required
          />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {mode === 'signup' ? <UserPlus size={16} /> : <LogIn size={16} />}
            {mode === 'signup' ? t(locale, 'createAccount') : t(locale, 'signIn')}
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
      </form>
    </div>
  )
}
