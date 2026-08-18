import { useEffect, useState } from 'react'
import { Check, Download, Store, Trash2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { ADDON_MODULES, type AppModuleId } from '../lib/modules/catalog'
import { t, type MsgId } from '../i18n'
import type { AppStore } from '../hooks/useAppStore'

const MODULE_COPY: Record<AppModuleId, { title: MsgId; body: MsgId } | undefined> = {
  today: undefined,
  plan: undefined,
  recipes: undefined,
  inventory: undefined,
  purchase: undefined,
  settings: undefined,
  week: { title: 'moduleWeekTitle', body: 'moduleWeekBody' },
  exercise: { title: 'moduleExerciseTitle', body: 'moduleExerciseBody' },
  history: { title: 'moduleHistoryTitle', body: 'moduleHistoryBody' },
  ai: undefined,
}

interface Props {
  store: AppStore
}

export function MarketplaceView({ store }: Props) {
  const locale = store.locale
  const [installed, setInstalled] = useState<string[]>(store.installedModules)
  const [canManage, setCanManage] = useState(store.canManageModules)
  const [busy, setBusy] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const data = await api<{ installed: string[]; canManage: boolean }>('/api/modules')
    setInstalled(data.installed)
    setCanManage(data.canManage)
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof ApiError ? e.code : t(locale, 'networkError')))
  }, [locale])

  async function install(moduleId: AppModuleId) {
    setBusy(moduleId)
    setError(null)
    try {
      const res = await api<{ installed: string[] }>('/api/modules', {
        method: 'POST',
        body: JSON.stringify({ moduleId }),
      })
      setInstalled(res.installed)
      await store.reloadWorkspace()
      setFlash(t(locale, 'marketplaceInstalled'))
    } catch (e) {
      setError(e instanceof ApiError ? e.code : t(locale, 'networkError'))
    } finally {
      setBusy(null)
    }
  }

  async function uninstall(moduleId: string) {
    setBusy(moduleId)
    setError(null)
    try {
      const res = await api<{ installed: string[] }>(
        `/api/modules?moduleId=${encodeURIComponent(moduleId)}`,
        { method: 'DELETE' },
      )
      setInstalled(res.installed)
      await store.reloadWorkspace()
      setFlash(t(locale, 'marketplaceRemoved'))
    } catch (e) {
      setError(e instanceof ApiError ? e.code : t(locale, 'networkError'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'marketplaceTitle')}</h2>
        <span>{t(locale, 'marketplaceSub')}</span>
      </div>
      {error && (
        <div className="alert alert-danger">
          <strong>{error}</strong>
        </div>
      )}
      {flash && <p className="field-hint">{flash}</p>}
      <div className="grid-2">
        {ADDON_MODULES.map((mod) => {
          const on = installed.includes(mod.id)
          const copy = MODULE_COPY[mod.id]
          return (
            <div key={mod.id} className="card">
              <div className="card-header">
                <div>
                  <h4>
                    <Store size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                    {copy ? t(locale, copy.title) : mod.id}
                  </h4>
                  <p className="sub">{copy ? t(locale, copy.body) : ''}</p>
                </div>
              </div>
              <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                <span className="field-hint">
                  {mod.priceCents === 0 ? t(locale, 'marketplaceFree') : t(locale, 'marketplacePriceSoon')}
                </span>
                {on ? (
                  <div className="btn-row">
                    <span className="field-hint">
                      <Check size={14} /> {t(locale, 'marketplaceOn')}
                    </span>
                    {canManage && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy === mod.id}
                        onClick={() => void uninstall(mod.id)}
                      >
                        <Trash2 size={14} /> {t(locale, 'marketplaceRemove')}
                      </button>
                    )}
                  </div>
                ) : (
                  canManage && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy === mod.id}
                      onClick={() => void install(mod.id)}
                    >
                      <Download size={14} /> {t(locale, 'marketplaceInstall')}
                    </button>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
