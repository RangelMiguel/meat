import { useEffect, useState } from 'react'
import { KeyRound, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { t } from '../i18n'
import type { AppStore } from '../hooks/useAppStore'

type Passkey = {
  id: string
  nickname: string | null
  deviceType: string | null
  createdAt: string
  lastUsedAt: string | null
}

export function PasskeysCard({ store }: { store: AppStore }) {
  const locale = store.locale
  const [keys, setKeys] = useState<Passkey[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    const data = await api<{ credentials: Passkey[] }>('/api/auth/webauthn/register')
    setKeys(data.credentials)
  }

  useEffect(() => {
    void refresh().catch(() => undefined)
  }, [])

  const add = async () => {
    setBusy(true)
    setError('')
    const result = await store.registerPasskey(store.account?.displayName)
    if (result) setError(t(locale, result))
    else await refresh().catch(() => undefined)
    setBusy(false)
  }

  const remove = async (id: string) => {
    if (!confirm(t(locale, 'removePasskey'))) return
    setBusy(true)
    setError('')
    try {
      await api('/api/auth/webauthn/register', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      })
      await refresh()
    } catch (err) {
      const code = err instanceof Error ? err.message : 'networkError'
      setError(t(locale, code as 'passkeyLast'))
    }
    setBusy(false)
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h4>{t(locale, 'passkeys')}</h4>
          <p className="sub">{t(locale, 'passkeysSub')}</p>
        </div>
      </div>
      {error && (
        <div className="alert alert-danger">
          <strong>{error}</strong>
        </div>
      )}
      {keys.length === 0 ? (
        <p className="sub">{t(locale, 'noPasskeysYet')}</p>
      ) : (
        <ul className="family-member-list">
          {keys.map((key) => (
            <li key={key.id}>
              <div>
                <strong>{key.nickname || key.deviceType || t(locale, 'passkeys')}</strong>
                <span className="sub">
                  {new Date(key.createdAt).toLocaleDateString(locale === 'es' ? 'es' : 'en')}
                </span>
              </div>
              {keys.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-icon icon-danger"
                  aria-label={t(locale, 'removePasskey')}
                  disabled={busy}
                  onClick={() => void remove(key.id)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void add()}>
        <KeyRound size={16} />
        {t(locale, 'addPasskey')}
      </button>
    </div>
  )
}
