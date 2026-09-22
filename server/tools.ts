import type Anthropic from '@anthropic-ai/sdk'
import { componentRecord, locationOf } from '../src/assistant/describe'
import { ANIMATIONS } from '../src/data/animations'
import type { BopDataset } from '../src/data/build-bop'
import { searchComponents } from '../src/data/search'
import { SYSTEMS, SYSTEM_IDS } from '../src/data/systems'
import type { SystemId } from '../src/data/types'
import type { Command } from '../src/state/commands'

type Tool = Anthropic.Beta.BetaTool

const idsSchema = { type: 'array', items: { type: 'string' }, description: 'Component ids from search_components or get_component.' } as const

export const TOOLS: Tool[] = [
  {
    name: 'search_components',
    description: 'Search the verified component database by name, alias, location words (upper/lower/left/right), catalog item number ("item 5") or part number. Returns ids to use with other tools.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'get_component',
    description: 'Full verified record of one component: part number, quantity, documented functions, material, documented dimensions, drawing, kits, notes and geometry tier. Every value carries its sources; missing values are the literal string "Not available in verified public documentation."',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'get_connections',
    description: 'Connections of one component with the basis and confidence of each (A = named or shown in the catalog, C = third-party, D = inferred).',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'list_assemblies_and_systems',
    description: 'Assemblies (for explode_assembly), systems (for show_system) and animations (for play_animation), with the documented basis of each animation.',
    input_schema: { type: 'object', properties: {} },
  },
  { name: 'select_component', description: 'Select a component in the viewer and open its detail panel.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'focus_camera', description: 'Move the camera to a component id or an assembly id ("bop" for everything).', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'isolate_components', description: 'Show only these components.', input_schema: { type: 'object', properties: { ids: idsSchema }, required: ['ids'] } },
  { name: 'hide_components', description: 'Hide these components.', input_schema: { type: 'object', properties: { ids: idsSchema }, required: ['ids'] } },
  { name: 'show_all', description: 'Clear hide, isolate, system filters and connection highlights.', input_schema: { type: 'object', properties: {} } },
  {
    name: 'explode_assembly',
    description: 'Explode one assembly (amount 0 to 1). Use assembly_id "bop" for the whole BOP.',
    input_schema: { type: 'object', properties: { assembly_id: { type: 'string' }, amount: { type: 'number' } }, required: ['assembly_id', 'amount'] },
  },
  {
    name: 'show_system',
    description: `Filter the view to systems. Valid ids: ${SYSTEM_IDS.join(', ')}. Empty list clears the filter.`,
    input_schema: { type: 'object', properties: { system_ids: { type: 'array', items: { type: 'string', enum: SYSTEM_IDS } } }, required: ['system_ids'] },
  },
  { name: 'show_connections', description: 'Draw connection lines from one component to everything connected to it.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  {
    name: 'play_animation',
    description: `Play an animation. Valid ids: ${ANIMATIONS.map((a) => a.id).join(', ')}.`,
    input_schema: { type: 'object', properties: { animation_id: { type: 'string', enum: ANIMATIONS.map((a) => a.id) } }, required: ['animation_id'] },
  },
  { name: 'set_xray', description: 'Turn the transparent (x-ray) view on or off.', input_schema: { type: 'object', properties: { on: { type: 'boolean' } }, required: ['on'] } },
]

export interface ToolOutcome {
  content: string
  isError: boolean
  /** Knowledge text that the final answer may quote. */
  knowledge: string
  command?: Command
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function err(message: string): ToolOutcome {
  return { content: message, isError: true, knowledge: '' }
}

function viewer(command: Command, message: string): ToolOutcome {
  return { content: message, isError: false, knowledge: '', command }
}

export function runTool(ds: BopDataset, name: string, input: Record<string, unknown>): ToolOutcome {
  const hasComponent = (id: string) => ds.byId.has(id)
  switch (name) {
    case 'search_components': {
      const hits = searchComponents(ds, str(input.query), 15).map((h) => ({
        id: h.component.id,
        name: h.component.name,
        catalogItem: h.component.catalogItem ?? null,
        location: locationOf(h.component, ds),
        partNumber: h.component.partNumber?.value ?? null,
      }))
      const json = JSON.stringify(hits)
      return { content: hits.length ? json : 'No matches.', isError: false, knowledge: json }
    }
    case 'get_component': {
      const c = ds.byId.get(str(input.id))
      if (!c) return err(`Unknown component id "${str(input.id)}". Use search_components first.`)
      const json = JSON.stringify(componentRecord(c, ds))
      return { content: json, isError: false, knowledge: json }
    }
    case 'get_connections': {
      const id = str(input.id)
      if (!hasComponent(id)) return err(`Unknown component id "${id}".`)
      const links = ds.connections
        .filter((k) => k.from === id || k.to === id)
        .map((k) => {
          const other = ds.byId.get(k.from === id ? k.to : k.from)!
          return { otherId: other.id, otherName: other.name, location: locationOf(other, ds), kind: k.kind, basis: k.basis.value, confidence: k.basis.confidence, sources: k.basis.sources }
        })
      const json = JSON.stringify(links)
      return { content: json, isError: false, knowledge: json }
    }
    case 'list_assemblies_and_systems': {
      const json = JSON.stringify({
        assemblies: ds.assemblies.map((a) => ({ id: a.id, name: a.name, parentId: a.parentId })),
        systems: Object.values(SYSTEMS).map((s) => ({ id: s.id, name: s.name, description: s.description })),
        animations: ANIMATIONS.map((a) => ({ id: a.id, name: a.name, description: a.description, basis: a.basis })),
      })
      return { content: json, isError: false, knowledge: json }
    }
    case 'select_component':
      return hasComponent(str(input.id)) ? viewer({ type: 'selectComponent', id: str(input.id) }, 'Selected.') : err(`Unknown component id "${str(input.id)}".`)
    case 'focus_camera': {
      const id = str(input.id)
      return hasComponent(id) || ds.assemblies.some((a) => a.id === id) ? viewer({ type: 'focusCamera', id }, 'Camera moved.') : err(`Unknown id "${id}".`)
    }
    case 'isolate_components':
    case 'hide_components': {
      const ids = strs(input.ids).filter(hasComponent)
      if (!ids.length) return err('None of the ids exist.')
      return viewer(name === 'isolate_components' ? { type: 'isolateComponents', ids } : { type: 'hideComponents', ids }, `${ids.length} component(s) affected.`)
    }
    case 'show_all':
      return viewer({ type: 'showAll' }, 'All visible.')
    case 'explode_assembly': {
      const assemblyId = str(input.assembly_id)
      const amount = typeof input.amount === 'number' ? input.amount : 1
      if (assemblyId !== 'bop' && !ds.assemblies.some((a) => a.id === assemblyId)) return err(`Unknown assembly "${assemblyId}". Call list_assemblies_and_systems.`)
      return viewer({ type: 'explodeAssembly', assemblyId, amount }, 'Exploded.')
    }
    case 'show_system': {
      const systemIds = strs(input.system_ids).filter((s): s is SystemId => (SYSTEM_IDS as string[]).includes(s))
      return viewer({ type: 'showSystems', systemIds }, systemIds.length ? `Showing ${systemIds.join(', ')}.` : 'Filter cleared.')
    }
    case 'show_connections':
      return hasComponent(str(input.id)) ? viewer({ type: 'showConnections', id: str(input.id) }, 'Connections drawn.') : err(`Unknown component id "${str(input.id)}".`)
    case 'play_animation': {
      const id = str(input.animation_id)
      const anim = ANIMATIONS.find((a) => a.id === id)
      if (!anim) return err(`Unknown animation "${id}".`)
      const json = JSON.stringify({ playing: anim.id, basis: anim.basis })
      return { content: json, isError: false, knowledge: json, command: { type: 'playAnimation', id } }
    }
    case 'set_xray':
      return viewer({ type: 'setXray', on: input.on === true }, `X-ray ${input.on === true ? 'on' : 'off'}.`)
    default:
      return err(`Unknown tool "${name}".`)
  }
}
