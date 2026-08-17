import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { t, type Locale } from '../i18n'

type Action = { name: string; summary: string }
type Msg = { role: 'user' | 'assistant'; content: string; actions?: Action[] }

type PublicAi = {
  consented: boolean
  hasKey: boolean
  provider: string
  baseUrl: string
}

interface Props {
  locale: Locale
  onGoSettings: () => void
  onMutated?: () => void
}

export function AiView({ locale, onGoSettings, onMutated }: Props) {
  const [ready, setReady] = useState<{ consented: boolean; configured: boolean } | null>(null)
  const [consent, setConsent] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void api<{ ai: PublicAi }>('/api/ai/settings')
      .then((res) => {
        const configured = res.ai.hasKey || (res.ai.provider === 'custom' && Boolean(res.ai.baseUrl))
        setReady({ consented: res.ai.consented, configured })
      })
      .catch((e) => setError(e instanceof ApiError ? e.code : t(locale, 'aiNeedKey')))
  }, [locale])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function acceptConsent() {
    if (!consent) {
      setError(t(locale, 'aiConsentRequired'))
      return
    }
    setError(null)
    await api('/api/ai/settings', { method: 'PATCH', body: JSON.stringify({ consent: true }) })
    setReady((prev) => (prev ? { ...prev, consented: true } : prev))
  }

  async function send() {
    const text = draft.trim()
    if (!text || busy) return
    const next: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setDraft('')
    setBusy(true)
    setError(null)
    try {
      const res = await api<{ reply: string; actions?: Action[] }>('/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ messages: next }),
      })
      setMessages([
        ...next,
        { role: 'assistant', content: res.reply, actions: res.actions ?? [] },
      ])
      if (res.actions?.length) onMutated?.()
    } catch (e) {
      setError(e instanceof ApiError ? e.code : t(locale, 'aiNeedKey'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack-lg">
      <div className="section-title">
        <h2>{t(locale, 'aiTitle')}</h2>
        <span>{t(locale, 'aiSub')}</span>
      </div>

      {error && <p className="field-hint">{error}</p>}

      {ready && !ready.consented && (
        <div className="card">
          <div className="card-header">
            <div>
              <h4>{t(locale, 'aiConsentTitle')}</h4>
              <p className="sub">{t(locale, 'aiConsentBody')}</p>
            </div>
          </div>
          <label className="field" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{t(locale, 'aiConsentCheck')}</span>
          </label>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => void acceptConsent()}>
              {t(locale, 'aiConsentAccept')}
            </button>
          </div>
        </div>
      )}

      {ready?.consented && !ready.configured && (
        <div className="card">
          <p className="sub">{t(locale, 'aiNeedKey')}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={onGoSettings}>
              {t(locale, 'aiGoSettings')}
            </button>
          </div>
        </div>
      )}

      {ready?.consented && ready.configured && (
        <div className="card">
          <div className="ai-thread">
            {messages.length === 0 && <p className="field-hint">{t(locale, 'aiEmpty')}</p>}
            {messages.map((msg, i) => (
              <div key={`${msg.role}-${i}`} className={`ai-bubble ai-bubble-${msg.role}`}>
                <strong>
                  {msg.role === 'assistant' ? (
                    <>
                      <Sparkles size={12} /> {t(locale, 'aiAssistant')}
                    </>
                  ) : (
                    t(locale, 'aiYou')
                  )}
                </strong>
                <p>{msg.content}</p>
                {msg.actions && msg.actions.length > 0 && (
                  <ul className="ai-actions">
                    {msg.actions.map((action, j) => (
                      <li key={`${action.name}-${j}`}>{action.summary}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {busy && <p className="field-hint">{t(locale, 'aiThinking')}</p>}
            <div ref={endRef} />
          </div>
          <div className="field" style={{ marginTop: '0.85rem' }}>
            <textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t(locale, 'aiPlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !draft.trim()}
              onClick={() => void send()}
            >
              {t(locale, 'aiSend')}
            </button>
          </div>
          <p className="field-hint">{t(locale, 'aiFooterHint')}</p>
        </div>
      )}
    </div>
  )
}
