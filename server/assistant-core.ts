// Claude assistant: a manual tool-use loop over verified knowledge tools and viewer-command tools.
// Viewer commands are validated here and returned to the browser, which dispatches them.
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { buildBop } from '../src/data/build-bop'
import { BONNET_TYPE_LABEL } from '../src/data/build-bonnet'
import { ramKindLabel } from '../src/data/build-ram'
import { FLEXPACKER_NR_ROWS, SELECTABLE_PIPE_SIZES, VBR_ROWS } from '../src/data/catalog'
import { NOT_AVAILABLE } from '../src/data/sources'
import type { BopConfig } from '../src/data/types'
import type { Command } from '../src/state/commands'
import { componentRecord } from '../src/assistant/describe'
import { ANIMATIONS } from '../src/data/animations'
import type { BopDataset } from '../src/data/build-bop'
import { SYSTEMS } from '../src/data/systems'
import { enforceGrounding } from './grounding'
import { checkRateLimit } from './rate-limit'
import { runTool, TOOLS } from './tools'

const MODEL = 'claude-opus-5'
const MAX_TOOL_ROUNDS = 8

const SYSTEM_PROMPT = `You are the assistant inside "U BOP Atlas", an educational 3D atlas of the Cameron U ram-type BOP, 13-5/8 in, 10,000 psi. You answer questions and control the 3D viewer through tools.

Accuracy rules. They override helpfulness:
- State an engineering fact (part number, dimension, material, tolerance, pressure, seal type, procedure, internal geometry) only if a knowledge tool returned it in this conversation. Cite the source and page shown in the tool result, e.g. "(Cameron catalog p.12)".
- If the tools do not provide a requested fact, say exactly: "${NOT_AVAILABLE}" Do not estimate, recall from memory, or generalise from other BOP models.
- Confidence D means inferred; say "inferred" when you use it. Confidence C means a third-party rental data sheet; say so. When a record lists conflicting values, give both.
- All 3D geometry is an educational approximation (tier T3) except where a record says otherwise. Never call it Cameron or SLB CAD.
- Maintenance, disassembly and test procedures are not in the database. Say they are not available.

Viewer rules:
- Find ids with search_components before calling viewer tools. For "show me X", select it and focus the camera on it.
- The default configuration is a double BOP (upper and lower cavities). If the user says "left bonnet" without upper/lower, act on both left bonnets and say so.
- For "explain how the BOP closes/opens", fetch list_assemblies_and_systems, explain from the animation basis, and play the animation.

Keep answers short: two to six sentences or a short list, in plain English. No emojis.`

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
})

const RamKindSchema = z.union([
  z.object({ type: z.literal('pipe'), pipeSize: z.string().refine((s) => SELECTABLE_PIPE_SIZES.includes(s)) }),
  z.object({ type: z.literal('blind') }),
  z.object({ type: z.literal('sbr') }),
  z.object({ type: z.literal('isr') }),
  z.object({ type: z.literal('vbr'), id: z.string().refine((id) => VBR_ROWS.some((r) => r.id === id)) }),
  z.object({ type: z.literal('flexpacker'), id: z.string().refine((id) => FLEXPACKER_NR_ROWS.some((r) => r.id === id)) }),
])

const BonnetTypeSchema = z.enum(['standard', 'largeBoreShear', 'tandemBooster'])

const RequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(MessageSchema).max(20).default([]),
  config: z.object({
    stack: z.enum(['double', 'single']),
    rams: z.object({ upper: RamKindSchema, lower: RamKindSchema }),
    bonnets: z.object({ upper: BonnetTypeSchema, lower: BonnetTypeSchema }).default({ upper: 'standard', lower: 'standard' }),
  }),
})

export interface AssistantResponseBody {
  ok: boolean
  text?: string
  commands?: Command[]
  removedValues?: string[]
  error?: 'assistant_offline' | 'bad_request' | 'rate_limited' | 'upstream_error'
  message?: string
}

const corpusCache = new Map<string, string>()

function datasetCorpus(ds: BopDataset): string {
  const key = JSON.stringify(ds.config)
  let corpus = corpusCache.get(key)
  if (!corpus) {
    corpus = JSON.stringify({
      components: ds.components.map((c) => componentRecord(c, ds)),
      connections: ds.connections,
      systems: SYSTEMS,
      animations: ANIMATIONS,
    })
    corpusCache.set(key, corpus)
  }
  return corpus
}

function describeConfig(c: BopConfig): string {
  const cavity = (id: 'upper' | 'lower') => `${ramKindLabel(c.rams[id])}, ${BONNET_TYPE_LABEL[c.bonnets[id]].toLowerCase()}`
  return c.stack === 'double' ? `double BOP; upper cavity: ${cavity('upper')}; lower cavity: ${cavity('lower')}` : `single BOP with ${cavity('upper')}`
}

export async function handleAssistantRequest(bodyText: string, clientKey = 'local'): Promise<{ status: number; body: AssistantResponseBody }> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return { status: 503, body: { ok: false, error: 'assistant_offline', message: 'No Claude API key is configured on the server.' } }
  }
  if (!checkRateLimit(clientKey)) {
    return { status: 429, body: { ok: false, error: 'rate_limited', message: 'Too many requests. Wait a minute and try again.' } }
  }
  let parsed: z.infer<typeof RequestSchema>
  try {
    parsed = RequestSchema.parse(JSON.parse(bodyText))
  } catch {
    return { status: 400, body: { ok: false, error: 'bad_request', message: 'The request was not valid.' } }
  }

  const ds = buildBop(parsed.config)
  const client = new Anthropic()
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...parsed.history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: `[Viewer configuration: ${describeConfig(ds.config)}]\n\n${parsed.message}` },
  ]
  const commands: Command[] = []
  // Grounding corpus = the verified dataset for this configuration + this request's tool results.
  // Client-supplied text (message or history, which a direct API caller could forge) never enters it.
  let knowledge = datasetCorpus(ds)

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
        output_config: { effort: 'medium' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      })

      if (response.stop_reason === 'refusal') {
        return { status: 200, body: { ok: true, text: 'The model declined this request. Try rephrasing it as a question about the BOP components.', commands } }
      }
      if (response.stop_reason !== 'tool_use') {
        const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim()
        const grounded = enforceGrounding(text || 'Done.', knowledge)
        return { status: 200, body: { ok: true, text: grounded.text, commands, removedValues: grounded.removed } }
      }

      messages.push({ role: 'assistant', content: response.content })
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const input = typeof block.input === 'object' && block.input !== null ? (block.input as Record<string, unknown>) : {}
        const outcome = runTool(ds, block.name, input)
        if (outcome.command) commands.push(outcome.command)
        knowledge += '\n' + outcome.knowledge
        results.push({ type: 'tool_result', tool_use_id: block.id, content: outcome.content, is_error: outcome.isError })
      }
      messages.push({ role: 'user', content: results })
    }
    return { status: 200, body: { ok: true, text: 'I stopped after too many tool steps. Try a more specific request.', commands } }
  } catch (error: unknown) {
    const status = error instanceof Anthropic.APIError ? (error.status ?? 502) : 502
    console.error('[assistant] upstream error', status, error instanceof Error ? error.message : error)
    return { status: 502, body: { ok: false, error: 'upstream_error', message: 'The assistant service is unavailable right now.' } }
  }
}
