// Questions answered from the dataset: lists, counts, spares, kits, sources, gaps and procedures.
import type { BopDataset } from '../../data/build-bop'
import { BONNET_REBUILD_KIT, LB_SHEAR_KIT } from '../../data/catalog'
import { KIT_ITEMS } from '../../data/curation'
import { NOT_AVAILABLE, SOURCES } from '../../data/sources'
import { SYSTEMS } from '../../data/systems'
import type { ComponentInstance } from '../../data/types'
import { componentsInAssembly } from '../../state/commands'
import { cite, claimText, locationOf } from '../describe'
import { findTargets, hasLocation, parseLocation, REFERS_TO_SELECTION, systemFrom } from '../parse'
import type { AssistantReply, Intent } from '../types'

/** One line per distinct catalog part: "(5) Piston, Operating  2245074-01-01". */
function partLines(list: ComponentInstance[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of [...list].sort((a, b) => (a.catalogItem ?? 99) - (b.catalogItem ?? 99))) {
    if (seen.has(c.name)) continue
    seen.add(c.name)
    const item = c.catalogItem !== undefined ? `(${c.catalogItem}) ` : ''
    out.push(`- ${item}${c.name}${c.partNumber ? `  ${c.partNumber.value}` : ''}`)
  }
  return out
}

/** "bonnet-upper-R" -> "explode the upper right bonnet". */
function spokenAssembly(id: string): string {
  const [kind, cav, side] = id.split('-')
  return side ? `explode the ${cav} ${side === 'L' ? 'left' : 'right'} ${kind}` : 'explode'
}

function assemblyFromText(ds: BopDataset, t: string): string[] {
  const kind = /\bbonnets?\b/.test(t) ? 'bonnet' : /\brams?\b/.test(t) && !/\brams system\b/.test(t) ? 'ram' : /\bbody\b/.test(t) ? 'body' : null
  if (!kind) return []
  if (kind === 'body') return ['body-assembly']
  const loc = parseLocation(t)
  if (!hasLocation(loc)) return []
  return ds.assemblies
    .filter((a) => new RegExp(`^${kind}-(upper|lower)-(L|R)$`).test(a.id))
    .filter((a) => {
      const [, cav, side] = a.id.split('-')
      return (!loc.cavities || loc.cavities.includes(cav as 'upper')) && (!loc.sides || loc.sides.includes(side as 'L'))
    })
    .map((a) => a.id)
}

export const listing: Intent = ({ ds, t }) => {
  if (!/^(list|what(?:'s| is| are)? (in|inside)|which parts|show me (all )?(the )?parts|parts (in|of)|contents of|what does .* contain|name (all|the) parts)\b/.test(t) && !/^list\b/.test(t)) return null
  const asm = assemblyFromText(ds, t)
  if (asm.length) {
    const ids = asm.flatMap((a) => componentsInAssembly(ds, a))
    const list = ids.map((id) => ds.byId.get(id)!)
    const names = asm.map((a) => ds.assemblies.find((x) => x.id === a)!.name).join(', ')
    return { text: `${names}: ${partLines(list).length} catalog parts.\n${partLines(list).join('\n')}`, commands: [{ type: 'isolateComponents', ids }, { type: 'focusCamera', id: asm[0] }], suggestions: ['reset', spokenAssembly(asm[0])] }
  }
  const sys = systemFrom(t)
  if (sys) {
    const list = ds.components.filter((c) => c.systemIds.includes(sys))
    return { text: `${SYSTEMS[sys].name} system: ${partLines(list).length} catalog parts (${list.length} in the model).\n${partLines(list).join('\n')}`, commands: [{ type: 'showSystems', systemIds: [sys] }], suggestions: ['reset', `isolate all ${sys}`] }
  }
  if (/\bsystems?\b/.test(t)) {
    return { text: `Systems:\n${Object.values(SYSTEMS).map((s) => `- ${s.name}: ${s.description ? s.description.value : NOT_AVAILABLE}`).join('\n')}`, commands: [], suggestions: ['list the hydraulics system', 'list the locking system'] }
  }
  return { text: 'Say which assembly or system to list, for example "list parts in the upper left bonnet" or "list the seals".', commands: [], suggestions: ['list parts in the upper left bonnet', 'list the seals', 'list systems'] }
}

export const count: Intent = ({ ds, t, selectedId }) => {
  const m = t.match(/^how many (.+?)( are there| in (the|this) (bop|preventer|model))?$/)
  if (!m) return null
  const loc = parseLocation(t)
  const targets = REFERS_TO_SELECTION.test(m[1]) && selectedId ? [ds.byId.get(selectedId)!] : findTargets(ds, m[1], loc)
  if (!targets.length) return null
  const c = targets[0]
  const qty = c.quantity ? `Catalog quantity: ${claimText(c.quantity)}` : `Catalog quantity: ${NOT_AVAILABLE}`
  return { text: `${c.name}: ${qty}\nIn this model: ${targets.length} location${targets.length > 1 ? 's' : ''} (${targets.map((x) => locationOf(x, ds)).join(', ')}).`, commands: [{ type: 'highlight', ids: targets.map((x) => x.id) }, { type: 'focusCamera', id: targets.length > 1 ? 'bop' : c.id }], suggestions: [`isolate the ${c.name.toLowerCase()}`, 'reset'] }
}

export const spares: Intent = ({ ds, t }) => {
  if (!/\bspares?\b|\bspare parts\b|\bwear parts\b/.test(t)) return null
  const list = ds.components.filter((c) => c.recommendedSpare?.value)
  return {
    text: `Recommended spare parts (marked * on the Cameron exploded view SD17500) ${cite([{ sourceId: 'SRC-CAM-CAT-2014', page: 9 }])}:\n${partLines(list).join('\n')}`,
    commands: [{ type: 'isolateComponents', ids: list.map((c) => c.id) }, { type: 'focusCamera', id: 'bop' }],
    suggestions: ['rebuild kit', 'reset'],
  }
}

export const kits: Intent = ({ ds, t }) => {
  if (!/\bkits?\b|\bsoftgoods?\b|\brebuild\b|\bredress\b/.test(t)) return null
  const list = ds.components.filter((c) => c.catalogItem !== undefined && KIT_ITEMS.includes(c.catalogItem) && c.cavity !== undefined)
  const lines = [
    BONNET_REBUILD_KIT ? `Bonnet rebuild softgoods kit (13-5/8" 3,000-10,000 psi, pipe bonnet): ${BONNET_REBUILD_KIT} ${cite([{ sourceId: 'SRC-CAM-CAT-2014', page: 16 }])}` : `Bonnet rebuild kit: ${NOT_AVAILABLE}`,
    LB_SHEAR_KIT ? `Large-bore shear bonnet softgoods kit, 10,000 psi: ${LB_SHEAR_KIT} ${cite([{ sourceId: 'SRC-CAM-CAT-2014', page: 19 }])}` : '',
    'Parts in the bonnet rebuild kit:',
    ...partLines(list),
  ].filter(Boolean)
  return { text: lines.join('\n'), commands: [{ type: 'isolateComponents', ids: list.map((c) => c.id) }, { type: 'focusCamera', id: 'bop' }], suggestions: ['recommended spare parts', 'reset'] }
}

export const sources: Intent = ({ t }) => {
  if (!/\b(sources?|references?|where does (the|this) (data|information) come from|documents?|citations?)\b/.test(t)) return null
  const lines = Object.values(SOURCES).map((s) => `- ${s.publisher}: ${s.title}. ${s.reliability}`)
  return { text: `Every value in this atlas cites one of these public sources:\n${lines.join('\n')}\nThe paywalled Scribd manual and catalog were not used.`, commands: [], suggestions: ['what is not documented', 'evidence mode'] }
}

export const gaps: Intent = ({ t }) => {
  if (!/\b(missing|not documented|undocumented|unknown|gaps?|what (don't|do not) you know|limitations?|how accurate|accuracy)\b/.test(t)) return null
  return {
    text: [
      'Not available in verified public documentation:',
      '- Materials and grades for almost every part (exceptions: nitrile connecting-rod seals; forged body).',
      '- Internal dimensions, tolerances, seal cross-sections and all part sizes.',
      '- Maintenance, disassembly and pressure-test procedures (the OEM manual is paywalled).',
      '- Wedgelock parts for this size, and shearing capability for specific pipe grades.',
      '- Official CAD. The 3D model is an educational reconstruction; only the overall size and the part arrangement come from documents.',
      'Documented: the 43-item Cameron parts list with part numbers and quantities, fluid volumes and ratios, the exploded-view arrangement, and overall dimensions from rental data sheets.',
    ].join('\n'),
    commands: [{ type: 'setProvenanceMode', on: true }],
    suggestions: ['sources', 'evidence mode off'],
  }
}

export const procedures: Intent = ({ t }) => {
  if (!/\b(how (do|to|can) (i|you|we)? ?(replace|change|install|remove|repair|test|maintain|service|dismantle|disassemble|torque|redress)|procedure|maintenance|service interval|pressure test|inspection)\b/.test(t)) return null
  const reply: AssistantReply = {
    text: `Step-by-step procedures: ${NOT_AVAILABLE} They are in the Cameron operation manual, which is not publicly accessible.\nWhat is documented: with the bonnet bolts removed, ram closing pressure opens the bonnet so the ram can be lifted out, and opening pressure closes it again ${cite([{ sourceId: 'SRC-CAM-CAT-2014', page: 6 }])}. Bonnet bolt torque values are on the "Bolt, Bonnet" part (third-party data sheets).`,
    commands: [],
    suggestions: ['open the bonnets', 'part number of the bonnet bolt', 'rebuild kit'],
  }
  return reply
}

