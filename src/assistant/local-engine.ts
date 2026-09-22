// Rule-based assistant used when no Claude API key is configured. It maps a request to viewer
// commands and answers only with text rendered from dataset claims.
import { ANIMATIONS } from '../data/animations'
import type { BopDataset } from '../data/build-bop'
import { searchComponents, sameKindAs } from '../data/search'
import { NOT_AVAILABLE } from '../data/sources'
import { SYSTEMS } from '../data/systems'
import type { CavityId, ComponentInstance, Side, SystemId } from '../data/types'
import type { Command } from '../state/commands'
import { claimText, cite, locationOf, summarize } from './describe'

export interface AssistantReply {
  text: string
  commands: Command[]
}

const SYSTEM_WORDS: [RegExp, SystemId][] = [
  [/\bseals?\b|\bsoftgoods?\b|\bo-?rings?\b/, 'seals'],
  [/\bhydraulics?\b/, 'hydraulics'],
  [/\block(ing|s)?\b/, 'locking'],
  [/\bfasteners?\b|\bbolting\b/, 'fasteners'],
  [/\bstructur(e|al)\b/, 'structure'],
  [/\brams\b/, 'rams'],
]

interface Location {
  cavities: CavityId[] | null
  sides: Side[] | null
}

function parseLocation(t: string): Location {
  const cav: CavityId[] = []
  if (/\bupper|top\b/.test(t)) cav.push('upper')
  if (/\blower|bottom\b/.test(t)) cav.push('lower')
  const sides: Side[] = []
  if (/\bleft\b/.test(t)) sides.push('L')
  if (/\bright\b/.test(t)) sides.push('R')
  return { cavities: cav.length ? cav : null, sides: sides.length ? sides : null }
}

const stripLocation = (t: string) => t.replace(/\b(upper|lower|top|bottom|left|right|side|the|all|every|everything)\b/g, ' ')

function inLocation(c: ComponentInstance, loc: Location): boolean {
  if (loc.cavities && (!c.cavity || !loc.cavities.includes(c.cavity))) return false
  if (loc.sides && (!c.side || !loc.sides.includes(c.side))) return false
  return true
}

function findTargets(ds: BopDataset, phrase: string, loc: Location): ComponentInstance[] {
  const hits = searchComponents(ds, stripLocation(phrase), 40).map((h) => h.component)
  if (!hits.length) return []
  const top = hits[0]
  const family = sameKindAs(ds, top).filter((c) => inLocation(c, loc))
  if (family.length) return family
  return hits.filter((c) => inLocation(c, loc)).slice(0, 1)
}

function systemFrom(t: string): SystemId | null {
  for (const [rx, id] of SYSTEM_WORDS) if (rx.test(t)) return id
  return null
}

function notFound(phrase: string): AssistantReply {
  return { text: `I could not find "${phrase.trim()}" in the component database. Try a catalog name such as "operating piston", a part number, or "item 22".`, commands: [] }
}

function explainAnimation(id: string): AssistantReply {
  const anim = ANIMATIONS.find((a) => a.id === id)!
  return { text: `${anim.name}. ${anim.description}\nSource: ${claimText(anim.basis)}`, commands: [{ type: 'showAll' }, { type: 'playAnimation', id }] }
}

export function runLocalAssistant(ds: BopDataset, input: string): AssistantReply {
  const t = input.toLowerCase().trim().replace(/[.!?]+$/, '')
  const loc = parseLocation(t)

  if (/^(reset( the)?( view)?|show (all|everything)( again)?|unhide( all| everything)?|clear( all)?)$/.test(t)) return { text: 'Everything is visible again.', commands: [{ type: 'showAll' }, { type: 'setExplode', amount: 0 }] }
  if (/x-?ray/.test(t)) {
    const on = !/\b(off|disable|stop)\b/.test(t)
    return { text: `X-ray ${on ? 'on' : 'off'}.`, commands: [{ type: 'setXray', on }] }
  }
  if (/(how|explain|why).*\b(close|closing|closes)\b/.test(t) && !/bonnet/.test(t)) return explainAnimation('close')
  if (/(how|explain).*\b(open|opening|opens)\b/.test(t) && !/bonnet/.test(t)) return explainAnimation('open')
  if (/(ram change|change (the )?rams?|bonnet).*(open|change)|open.*bonnet/.test(t) && /(how|explain|animate|play|show)/.test(t)) return explainAnimation('bonnet-open')
  if (/(animate|play|demonstrate).*(piston|connecting rod)|piston.*(->|to|and|then).*ram/.test(t)) return explainAnimation('piston-train')
  if (/(animate|play)/.test(t)) return explainAnimation(/open/.test(t) ? 'open' : 'close')

  if (/\b(collapse|unexplode|assemble|reassemble)\b/.test(t)) return { text: 'Reassembled.', commands: [{ type: 'setExplode', amount: 0 }] }
  if (/\bexplode\b/.test(t)) {
    if (/bonnet|ram/.test(t)) {
      const kind = /bonnet/.test(t) ? 'bonnet' : 'ram'
      const cavities = loc.cavities ?? (ds.config.stack === 'double' ? ['upper', 'lower'] : ['upper'])
      const sides = loc.sides ?? ['L', 'R']
      const ids = cavities.flatMap((c) => sides.map((s) => `${kind}-${c}-${s}`)).filter((id) => ds.assemblies.some((a) => a.id === id))
      if (!ids.length) return { text: 'That assembly is not in the current configuration.', commands: [] }
      const names = ids.map((id) => ds.assemblies.find((a) => a.id === id)!.name)
      return { text: `Exploding ${names.join(' and ')}.`, commands: [...ids.map((assemblyId) => ({ type: 'explodeAssembly' as const, assemblyId, amount: 1 })), { type: 'focusCamera', id: ids.length > 1 ? 'bop' : ids[0] }] }
    }
    return { text: 'Exploded view of the whole BOP.', commands: [{ type: 'setExplode', amount: 1 }, { type: 'focusCamera', id: 'bop' }] }
  }

  const connected = t.match(/(?:connected to|connections? (?:of|for|to)|attached to|touching)\s+(.+)/)
  if (connected) {
    const target = findTargets(ds, connected[1], loc)[0]
    if (!target) return notFound(connected[1])
    const links = ds.connections.filter((k) => k.from === target.id || k.to === target.id)
    const lines = links.map((k) => {
      const other = ds.byId.get(k.from === target.id ? k.to : k.from)!
      return `- ${other.name} (${locationOf(other, ds)}): ${k.kind}. ${k.basis.value} ${cite(k.basis.sources)}`
    })
    return {
      text: `${links.length} documented or inferred connections for ${target.name} (${locationOf(target, ds)}). Dashed lines are inferred.\n${lines.join('\n')}`,
      commands: [{ type: 'selectComponent', id: target.id }, { type: 'showConnections', id: target.id }, { type: 'focusCamera', id: target.id }],
    }
  }

  const isolate = t.match(/^isolate\s+(.+)/)
  const hide = t.match(/^hide\s+(.+)/)
  if (isolate || hide) {
    const phrase = (isolate ?? hide)![1]
    const sys = /\ball\b|s\b/.test(phrase) ? systemFrom(phrase) : null
    const targets = sys ? ds.components.filter((c) => c.systemIds.includes(sys) && inLocation(c, loc)) : findTargets(ds, phrase, loc)
    if (!targets.length) return notFound(phrase)
    const ids = targets.map((c) => c.id)
    const label = sys ? `${SYSTEMS[sys].name.toLowerCase()} system (${ids.length} components)` : `${targets[0].name} (${ids.length} instance${ids.length > 1 ? 's' : ''})`
    return isolate
      ? { text: `Isolated the ${label}.`, commands: [{ type: 'isolateComponents', ids }, { type: 'focusCamera', id: sys ? 'bop' : ids[0] }] }
      : { text: `Hid the ${label}.`, commands: [{ type: 'hideComponents', ids }] }
  }

  const sysShow = t.match(/(?:show|filter)\s+(?:the\s+)?(.+?)\s+system/)
  if (sysShow) {
    const sys = systemFrom(sysShow[1] + 's') ?? systemFrom(sysShow[1])
    if (sys) return { text: `${SYSTEMS[sys].name}: ${claimText(SYSTEMS[sys].description)}`, commands: [{ type: 'showSystems', systemIds: [sys] }] }
  }

  const phrase = t.replace(/^(show( me)?|select|find|where is|what is|what's|tell me about|explain|describe|zoom (in )?(to|on))\s+/, '').replace(/\?$/, '')
  const asksMaterial = /\b(material|made of|grade|alloy)\b/.test(t)
  const asksDims = /\b(dimension|size|diameter|length|tolerance|weight|torque|pressure rating)\b/.test(t)
  const targets = findTargets(ds, phrase.replace(/\b(part number|material|made of|dimensions?|tolerances?|of|for|what|is|the)\b/g, ' '), loc)
  if (!targets.length) return notFound(phrase)
  const c = targets[0]
  let text: string
  if (asksMaterial) text = `Material of ${c.name}: ${claimText(c.material)}`
  else if (asksDims)
    text = c.documentedDimensions.length ? `${c.name}: ${c.documentedDimensions.map((d) => `${d.label}: ${claimText(d.claim)}`).join('\n')}` : `Dimensions of ${c.name}: ${NOT_AVAILABLE}`
  else text = summarize(c, ds)
  if (targets.length > 1) text += `\n\n${targets.length} instances of this part are in the current configuration; the ${locationOf(c, ds)} one is selected.`
  return { text, commands: [{ type: 'selectComponent', id: c.id }, { type: 'focusCamera', id: c.id }] }
}
