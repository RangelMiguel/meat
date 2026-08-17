import { z } from 'zod'
import { requireHouseholdAccess, requireSession } from '@/lib/auth'
import { jsonError, jsonOk } from '@/lib/access'
import { enforceRateLimit } from '@/lib/rate-limit'
import { completeWithTools } from '@/lib/ai/complete'
import { buildMeatContext } from '@/lib/ai/context'
import { loadPrivateAiSettings, loadPublicAiSettings } from '@/lib/ai/settings'
import { executeMeatTool, MEAT_TOOLS } from '@/lib/ai/tools'
import { requireAddon } from '@/lib/modules/access'

const TOOL_RULES = [
  'You can read and change this kitchen with tools.',
  'When the user asks to add, log, plan, or change something, call the matching tool. Do not pretend you saved it.',
  'Look up catalog ids with search_ingredients / search_recipes when a name is ambiguous.',
  'For packaged or branded foods (chips, soda, a bag of Fritos, yogurt cups, etc.) call lookup_nutrition even if they are not in the kitchen snapshot.',
  'After the first turn there is no snapshot — use list_* / search_* / lookup_nutrition if you need current or product numbers.',
  'Do not invent calories for store products when the lookup tool is available. If the tool returns an estimate, say so.',
  'Confirm what was actually saved using the tool result.',
].join('\n')

export async function POST(req: Request) {
  try {
    const session = await requireSession()
    const access = await requireHouseholdAccess(session.userId)
    await requireAddon(access.householdId, 'ai')
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

    const userTurns = body.messages.filter((m) => m.role === 'user').length
    const firstTurn = userTurns <= 1
    const system = firstTurn
      ? [
          'You are a nutrition and kitchen assistant inside the meat app.',
          'Answer from the snapshot below plus live tool results.',
          'The user consented to send this snapshot to their own configured AI provider.',
          'Later turns in this chat will not repeat the snapshot.',
          TOOL_RULES,
          '',
          'DATA SNAPSHOT:',
          await buildMeatContext(session.userId),
        ].join('\n')
      : [
          'You are a nutrition and kitchen assistant inside the meat app.',
          'The kitchen snapshot was sent only in the first message of this chat.',
          TOOL_RULES,
        ].join('\n')

    const result = await completeWithTools({
      settings,
      messages: [{ role: 'system', content: system }, ...body.messages.slice(-12)],
      tools: MEAT_TOOLS,
      execute: (call) => executeMeatTool({ userId: session.userId }, call),
    })
    return jsonOk({
      reply: result.text,
      model: result.model,
      provider: result.provider,
      actions: result.actions,
    })
  } catch (e) {
    return jsonError(e)
  }
}
