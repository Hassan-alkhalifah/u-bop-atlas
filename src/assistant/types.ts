import type { BopDataset } from '../data/build-bop'
import type { Command } from '../state/commands'

export type { CavityId, ComponentInstance, Side, SystemId } from '../data/types'
export type { Command }

export interface AssistantReply {
  text: string
  commands: Command[]
  /** Follow-up commands shown as tap-to-run chips. */
  suggestions?: string[]
}

export interface AssistantContext {
  ds: BopDataset
  /** Lower-cased input without trailing punctuation. */
  t: string
  raw: string
  selectedId: string | null
}

export type Intent = (ctx: AssistantContext) => AssistantReply | null
