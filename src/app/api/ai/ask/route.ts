import { z } from 'zod'
import { requireHouseholdAccess, requireSession } from '@/lib/auth'
import { jsonError, jsonOk } from '@/lib/access'
import { enforceRateLimit } from '@/lib/rate-limit'
import { completeWithTools } from '@/lib/ai/complete'
import { buildMeatContext } from '@/lib/ai/context'
import { loadPrivateAiSettings, loadPublicAiSettings } from '@/lib/ai/settings'
import { executeMeatTool, MEAT_TOOLS } from '@/lib/ai/tools'
import { loadMeatPrivacy } from '@/lib/ai/privacyBook'

const TOOL_RULES = [
  'You can read and change this kitchen with tools.',
  'When the user asks to add, log, plan, or change something, call the matching tool. Do not pretend you saved it.',
  'Look up catalog or household snack ids with search_ingredients / search_recipes when a name is ambiguous.',
  'For packaged or branded foods (chips, Gansito, Nito, Sabritas, soda, yogurt) call search_open_food_facts first and quote those numbers. Say they came from Open Food Facts.',
  'If Open Food Facts has no match, then call lookup_nutrition (it may estimate). Say when a number is an estimate.',
  'After a good Open Food Facts match, call save_packaged_food so the snack can be logged later.',
  'Use add_recipe to create cooked dishes and update_recipe to change existing ones.',
  'To create a week of meals, call list_household_plans then plan_week (mode random for a full household week, or mode set with slots). Use add_week_meal / remove_week_meal for one meal. Portions are sized per person. That plan does not log food as eaten.',
  'After the first turn there is no snapshot — use list_* / search_* / search_open_food_facts / list_week_plan if you need current or product numbers.',
  'Confirm what was actually saved using the tool result.',
  'Never ask for or repeat personal names, emails, phones, keys, or account numbers. Refer to people as You / Member N.',
].join('\n')

export async function POST(req: Request) {
  try {
    const session = await requireSession()
    await requireHouseholdAccess(session.userId)
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
          'You are a nutrition and kitchen assistant inside the Meat app.',
          'Answer from the snapshot below plus live tool results.',
          'The user consented to send this snapshot to their own configured AI provider.',
          'Later turns in this chat will not repeat the snapshot.',
          TOOL_RULES,
          '',
          'DATA SNAPSHOT:',
          await buildMeatContext(session.userId),
        ].join('\n')
      : [
          'You are a nutrition and kitchen assistant inside the Meat app.',
          'The kitchen snapshot was sent only in the first message of this chat.',
          TOOL_RULES,
        ].join('\n')

    const privacy = await loadMeatPrivacy(session.userId)
    const result = await completeWithTools({
      settings,
      messages: [{ role: 'system', content: system }, ...body.messages.slice(-12)],
      tools: MEAT_TOOLS,
      privacy: privacy.book,
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
