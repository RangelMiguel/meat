import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { t, type Locale } from '../i18n'

type PublicAi = {
  provider: 'xai' | 'openai' | 'gemini' | 'custom'
  baseUrl: string
  model: string
  hasKey: boolean
  keyHint: string | null
  consented: boolean
}

export function AiSettingsCard({ locale }: { locale: Locale }) {
  const [ai, setAi] = useState<PublicAi | null>(null)
  const [provider, setProvider] = useState<PublicAi['provider']>('xai')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('grok-4.5')
  const [apiKey, setApiKey] = useState('')
  const [consent, setConsent] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    void api<{ ai: PublicAi }>('/api/ai/settings').then((res) => {
      setAi(res.ai)
      setProvider(res.ai.provider)
      setBaseUrl(res.ai.baseUrl)
      setModel(res.ai.model)
      setConsent(res.ai.consented)
    })
  }, [])

  async function save() {
    const res = await api<{ ai: PublicAi }>('/api/ai/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        provider,
        baseUrl,
        model,
        apiKey: apiKey.trim() || undefined,
        consent,
      }),
    })
    setAi(res.ai)
    setApiKey('')
    setFlash(t(locale, 'aiSaved'))
  }

  async function clearKey() {
    const res = await api<{ ai: PublicAi }>('/api/ai/settings', {
      method: 'PATCH',
      body: JSON.stringify({ clearKey: true }),
    })
    setAi(res.ai)
    setApiKey('')
    setFlash(t(locale, 'aiKeyCleared'))
  }

  if (!ai) return null

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h4>{t(locale, 'aiSettingsTitle')}</h4>
          <p className="sub">{t(locale, 'aiSettingsSub')}</p>
        </div>
        <Sparkles size={18} />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="ai-provider">{t(locale, 'aiProvider')}</label>
          <select
            id="ai-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as PublicAi['provider'])}
          >
            <option value="xai">{t(locale, 'aiProviderXai')}</option>
            <option value="openai">{t(locale, 'aiProviderOpenai')}</option>
            <option value="gemini">{t(locale, 'aiProviderGemini')}</option>
            <option value="custom">{t(locale, 'aiProviderCustom')}</option>
          </select>
        </div>
        {(provider === 'custom' || provider === 'xai' || provider === 'openai') && (
          <div className="field">
            <label htmlFor="ai-url">{t(locale, 'aiBaseUrl')}</label>
            <input
              id="ai-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                provider === 'custom'
                  ? 'http://127.0.0.1:11434/v1'
                  : provider === 'openai'
                    ? 'https://api.openai.com/v1'
                    : 'https://api.x.ai/v1'
              }
            />
            <p className="field-hint">{t(locale, 'aiBaseUrlHint')}</p>
          </div>
        )}
        <div className="field">
          <label htmlFor="ai-model">{t(locale, 'aiModel')}</label>
          <input id="ai-model" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ai-key">{t(locale, 'aiApiKey')}</label>
          <input
            id="ai-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={ai.hasKey ? ai.keyHint || '••••' : t(locale, 'aiApiKeyHint')}
          />
          {ai.hasKey && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void clearKey()}>
              {t(locale, 'aiClearKey')}
            </button>
          )}
        </div>
        <label className="field" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            <strong>{t(locale, 'aiConsentTitle')}</strong>
            <span className="field-hint" style={{ display: 'block' }}>
              {t(locale, 'aiConsentBody')}
            </span>
          </span>
        </label>
        {flash && <p className="field-hint">{flash}</p>}
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            {t(locale, 'aiSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
