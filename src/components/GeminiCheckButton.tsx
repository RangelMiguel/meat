import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import type { Locale } from '../i18n'
import { t } from '../i18n'
import {
  copyCalorieCheckPrompt,
  type CalorieCheckInput,
} from '../lib/geminiCheck'

interface Props {
  locale: Locale
  item: CalorieCheckInput
  compact?: boolean
}

export function GeminiCheckButton({ locale, item, compact = false }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const handleClick = async () => {
    const ok = await copyCalorieCheckPrompt(item, locale)
    setState(ok ? 'copied' : 'failed')
    window.setTimeout(() => setState('idle'), 2200)
  }

  const label =
    state === 'copied'
      ? t(locale, 'checkCopied')
      : state === 'failed'
        ? t(locale, 'checkCopyFailed')
        : t(locale, 'checkWithGemini')

  return (
    <button
      type="button"
      className={`btn btn-ghost${compact ? ' btn-icon' : ' btn-sm'}${state === 'copied' ? ' is-copied' : ''}`}
      aria-label={label}
      title={t(locale, 'checkWithGeminiHint')}
      onClick={() => void handleClick()}
    >
      {state === 'copied' ? <Check size={14} /> : <Sparkles size={14} />}
      {compact ? null : label}
    </button>
  )
}
