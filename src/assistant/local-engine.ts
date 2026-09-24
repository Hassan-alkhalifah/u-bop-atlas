// Offline assistant: maps a request to viewer commands and answers only with text rendered from dataset
// claims. Intents are tried in order; the first that recognises the request answers it.
import type { BopDataset } from '../data/build-bop'
import { SYSTEMS } from '../data/systems'
import { claimText } from './describe'
import { configuration, greeting, help, HELP_SUGGESTIONS, reset, viewSettings } from './intents/general'
import { count, gaps, kits, listing, procedures, sources, spares } from './intents/knowledge'
import { learn, shareExport } from './intents/learn'
import { animation, explode, stop } from './intents/motion'
import { connections, describePart, isolateHide, unhideAll } from './intents/parts'
import { REFERS_TO_SELECTION, systemFrom } from './parse'
import type { AssistantContext, AssistantReply, Intent } from './types'

export type { AssistantReply }

const needsSelection: Intent = ({ t, selectedId }) =>
  REFERS_TO_SELECTION.test(t) && !selectedId && /^(hide|isolate|show|what|whats|its|explode|focus|zoom|how many|material|part number)\b/.test(t)
    ? { text: 'Select a part first: tap it in the model, pick it in the Parts list, or say for example "show the operating piston".', commands: [], suggestions: ['show the operating piston', 'show the bonnet'] }
    : null

const showSystem: Intent = ({ t }) => {
  const m = t.match(/^(show|filter|highlight|display)( me)?( the)? (.+?) system$/)
  if (!m) return null
  const sys = systemFrom(m[4]) ?? systemFrom(`${m[4]}s`)
  if (!sys) return null
  return { text: `${SYSTEMS[sys].name} system: ${claimText(SYSTEMS[sys].description)}`, commands: [{ type: 'showSystems', systemIds: [sys] }], suggestions: [`list the ${sys} system`, 'reset'] }
}

const INTENTS: Intent[] = [
  help,
  greeting,
  learn,
  shareExport,
  reset,
  stop,
  viewSettings,
  configuration,
  explode,
  animation,
  needsSelection,
  connections,
  isolateHide,
  unhideAll,
  showSystem,
  listing,
  count,
  spares,
  kits,
  sources,
  gaps,
  procedures,
  describePart,
]

export function runLocalAssistant(ds: BopDataset, input: string, selectedId: string | null = null): AssistantReply {
  const raw = input.trim()
  const t = raw.toLowerCase().replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim()
  if (!t) return { text: 'Type a question or a command. "help" shows everything I can do.', commands: [], suggestions: ['help', ...HELP_SUGGESTIONS.slice(0, 2)] }
  const ctx: AssistantContext = { ds, t, raw, selectedId }
  for (const intent of INTENTS) {
    const r = intent(ctx)
    if (r) return r
  }
  return { text: 'I did not understand that. Type "help" to see what I can do.', commands: [], suggestions: ['help'] }
}
