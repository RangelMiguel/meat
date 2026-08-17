import { z } from 'zod'
import { requireSession } from '@/lib/auth'
import { jsonError, jsonOk } from '@/lib/access'
import { enforceRateLimit } from '@/lib/rate-limit'
import { completeWithUserSettings } from '@/lib/ai/complete'
import { buildMeatContext } from '@/lib/ai/context'
import { loadPrivateAiSettings, loadPublicAiSettings } from '@/lib/ai/settings'

export async function POST(req: Request) {
  try {
    const session = await requireSession()
    await enforceRateLimit({
      key: `ai-ask:${session.userId}`,
      limit: 20,
      windowSec: 60,
    })
    const pub = await loadPublicAiSettings(session.userId)
    if (!pub.consented) throw new Error('Accept the privacy notice before using AI')
    const settings = await loadPrivateAiSettings(session.userId)
    if (!settings) throw new Error('Configure an AI provider and key in Settings')

    const body = z
      .object({
        messages: z
          .array(
            z.object({
              role: z.enum(['user', 'assistant']),
              content: z.string().min(1).max(4000),
            }),
          )
          .min(1)
          .max(16),
      })
      .parse(await req.json())

    const context = await buildMeatContext(session.userId)
    const system = [
      'You are a nutrition and kitchen assistant inside the meat app.',
      'Answer only from the snapshot of logged meals, plan, inventory, and week meals below.',
      'If something is missing, say so. Do not invent calories or foods.',
      'The user consented to send this snapshot to their own configured AI provider.',
      '',
      'DATA SNAPSHOT:',
      context,
    ].join('\n')

    const result = await completeWithUserSettings(settings, [
      { role: 'system', content: system },
      ...body.messages.slice(-12),
    ])
    return jsonOk({ reply: result.text, model: result.model, provider: result.provider })
  } catch (e) {
    return jsonError(e)
  }
}
