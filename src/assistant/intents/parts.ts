// Part actions (show, isolate, hide, unhide, connections) and part questions, with "it"/"its" follow-ups.
import type { BopDataset } from '../../data/build-bop'
import { NOT_AVAILABLE } from '../../data/sources'
import { SYSTEMS } from '../../data/systems'
import type { ComponentInstance } from '../../data/types'
import { cite, claimText, locationOf, summarize } from '../describe'
import { findTargets, parseLocation, REFERS_TO_SELECTION, stripFiller, suggestNames, systemFrom } from '../parse'
import type { AssistantContext, AssistantReply, Intent } from '../types'

/** Targets for a phrase: the selected part when the phrase says "it/this", otherwise a search. */
function resolve(ctx: AssistantContext, phrase: string): ComponentInstance[] {
  if (REFERS_TO_SELECTION.test(phrase) && ctx.selectedId) {
    const c = ctx.ds.byId.get(ctx.selectedId)
    if (c) return [c]
  }
  return findTargets(ctx.ds, phrase, parseLocation(phrase))
}

export function notFound(ds: BopDataset, phrase: string): AssistantReply {
  const near = suggestNames(ds, phrase)
  const clean = phrase.trim().replace(/^the /, '')
  return {
    text: near.length
      ? `I could not find "${clean}". Did you mean one of these?`
      : `I could not find "${clean}" in the component database. Try a catalog name such as "operating piston", a part number, or "item 22". Type "help" for all commands.`,
    commands: [],
    suggestions: near.length ? near.map((n) => `show the ${n}`) : ['help', 'list systems'],
  }
}

const followUps = (c: ComponentInstance) => ['its connections', 'isolate it', c.material ? 'its material' : 'its part number', 'explode']

export const connections: Intent = (ctx) => {
  const m = ctx.t.match(/(?:connected to|connects to|connections? (?:of|for|to)|attached to|touching|touches|what does (.+?) connect to|mates? with)\s*(.*)$/)
  const refersToSelection = /\b(its|it's) connections\b|\bconnections\b$/.test(ctx.t) && ctx.selectedId
  if (!m && !refersToSelection) return null
  const phrase = refersToSelection ? 'it' : (m![1] ?? m![2] ?? '')
  const target = resolve(ctx, phrase || 'it')[0]
  if (!target) return notFound(ctx.ds, phrase)
  const links = ctx.ds.connections.filter((k) => k.from === target.id || k.to === target.id)
  const lines = links.map((k) => {
    const other = ctx.ds.byId.get(k.from === target.id ? k.to : k.from)!
    const inferred = k.basis.confidence === 'D' ? ' (inferred)' : ''
    return `- ${other.name} (${locationOf(other, ctx.ds)}): ${k.kind.replace('-', ' ')}${inferred} ${cite(k.basis.sources)}`
  })
  return {
    text: `${target.name} (${locationOf(target, ctx.ds)}) has ${links.length} connections. Solid lines are named or shown in the catalog; dashed lines are inferred.\n${lines.join('\n')}`,
    commands: [{ type: 'selectComponent', id: target.id }, { type: 'showConnections', id: target.id }, { type: 'focusCamera', id: target.id }],
    suggestions: ['isolate it', 'reset'],
  }
}

export const isolateHide: Intent = (ctx) => {
  const { ds, t } = ctx
  const m = t.match(/^(isolate|show only|only show|hide|remove|unhide|show again|bring back)\s+(.+)$/)
  if (!m) return null
  const verb = m[1]
  const phrase = m[2]
  const loc = parseLocation(t)
  // Only a bare system name ('all seals', 'the rams', 'hydraulic system') means a whole system; 'bonnet bolts' is a part.
  const core = stripFiller(phrase).replace(/\bsystem\b/, '').trim()
  const sys = /^(seals?|o-?rings?|softgoods?|packings?|hydraulics?|lock(ing|s)?|fasteners?|bolting|structure|structural|rams?)$/.test(core) ? systemFrom(core) : null
  let targets: ComponentInstance[]
  if (sys) targets = ds.components.filter((c) => c.systemIds.includes(sys) && (loc.cavities || loc.sides ? findLoc(c, loc) : true))
  else if (/\bbonnets?\b|\brams?\b/.test(phrase) && /\b(assembly|assemblies)\b|\b(upper|lower|left|right)\b/.test(phrase) && /^(the )?(upper |lower )?(left |right )?(bonnet|ram)s?( assembl(y|ies))?$/.test(phrase)) {
    const kind = /bonnet/.test(phrase) ? 'bonnet' : 'ram'
    targets = ds.components.filter((c) => c.assemblyId.startsWith(`${kind}-`) && findLoc(c, loc))
  } else targets = resolve(ctx, phrase)
  if (!targets.length) return notFound(ds, phrase)
  const ids = targets.map((c) => c.id)
  const label = sys ? `the ${SYSTEMS[sys].name.toLowerCase()} system (${ids.length} parts)` : targets.length > 1 && new Set(targets.map((x) => x.name)).size > 1 ? `${ids.length} parts` : `${targets[0].name} (${ids.length} location${ids.length > 1 ? 's' : ''})`
  if (verb === 'hide' || verb === 'remove') return { text: `Hid ${label}.`, commands: [{ type: 'hideComponents', ids }], suggestions: ['unhide', 'reset'] }
  if (verb === 'unhide' || verb === 'show again' || verb === 'bring back') return { text: `Showing ${label} again.`, commands: [{ type: 'unhideComponents', ids }] }
  return { text: `Isolated ${label}.`, commands: [{ type: 'isolateComponents', ids }, { type: 'focusCamera', id: ids.length > 1 ? (sys ? 'bop' : ids[0]) : ids[0] }], suggestions: ['reset', 'explode', 'x-ray on'] }
}

function findLoc(c: ComponentInstance, loc: ReturnType<typeof parseLocation>): boolean {
  if (loc.cavities && (!c.cavity || !loc.cavities.includes(c.cavity))) return false
  if (loc.sides && (!c.side || !loc.sides.includes(c.side))) return false
  return true
}

export const unhideAll: Intent = ({ t }) => (/^(unhide|show hidden|unhide all|show hidden parts)$/.test(t) ? { text: 'All hidden parts are visible again.', commands: [{ type: 'showAll' }] } : null)

type Field = 'partNumber' | 'material' | 'dimensions' | 'function' | 'quantity' | 'spare' | 'drawing' | 'geometry'

const FIELD_PATTERNS: [RegExp, Field][] = [
  [/\b(part (number|no\.?|#)|p\/?n|pn)\b/, 'partNumber'],
  [/\b(material|made of|made from|grade|alloy|steel|rubber type)\b/, 'material'],
  [/\b(dimensions?|size|diameter|length|width|height|tolerance|weight|torque|how big|how heavy|volume|gallons?|ratio)\b/, 'dimensions'],
  [/\b(function|purpose|what does .+ do|what is .+ for|used for|role|job)\b/, 'function'],
  [/\b(quantity|how many)\b/, 'quantity'],
  [/\b(spare)\b/, 'spare'],
  [/\b(drawing|diagram|balloon)\b/, 'drawing'],
  [/\b(accurate|real shape|cad|geometry|model accuracy)\b/, 'geometry'],
]

function fieldAnswer(c: ComponentInstance, field: Field, ds: BopDataset): string {
  const head = `${c.name} (${locationOf(c, ds)})`
  switch (field) {
    case 'partNumber':
      return `Part number of ${head}: ${claimText(c.partNumber)}`
    case 'material':
      return `Material of ${head}: ${claimText(c.material)}`
    case 'dimensions':
      return c.documentedDimensions.length ? `${head}:\n${c.documentedDimensions.map((d) => `- ${d.label}: ${claimText(d.claim)}`).join('\n')}` : `Dimensions of ${head}: ${NOT_AVAILABLE} The 3D shape is an educational approximation.`
    case 'function':
      return `Function of ${head}: ${c.functionText.length ? c.functionText.map((f) => claimText(f)).join('\n') : NOT_AVAILABLE}`
    case 'quantity':
      return `Quantity of ${head}: ${claimText(c.quantity)}`
    case 'spare':
      return c.recommendedSpare ? `${head}: ${c.recommendedSpare.value ? 'yes, a recommended spare part (marked * on SD17500)' : 'not marked as a recommended spare'} ${cite(c.recommendedSpare.sources)}` : `${head}: ${NOT_AVAILABLE}`
    case 'drawing':
      return `Drawing for ${head}: ${claimText(c.drawing)}`
    case 'geometry':
      return `${head}: 3D tier ${c.geometry.tier}, educational approximation. ${c.geometry.tierNote}`
  }
}

/** Questions about one part ("material of the rod seal", "its part number") and plain "show X" requests. */
export const describePart: Intent = (ctx) => {
  const { ds, t } = ctx
  const field = FIELD_PATTERNS.find(([rx]) => rx.test(t))?.[1] ?? null
  const phrase = t
    .replace(/\b(part (number|no\.?|#)|p\/?n|material|made of|made from|dimensions?|size|diameter|tolerances?|weight|torque|function|purpose|quantity|drawing|spare|used for|what does|do|does|for|the|is|are|what|whats|of)\b/g, ' ')
    .replace(/^(show( me)?|select|find|where is|where's|tell me about|explain|describe|zoom (in )?(to|on)|focus (on)?|go to|highlight|locate)\s+/, '')
  const targets = resolve(ctx, REFERS_TO_SELECTION.test(t) ? 'it' : phrase)
  if (!targets.length) return notFound(ds, phrase)
  const c = targets[0]
  let text = field ? fieldAnswer(c, field, ds) : summarize(c, ds)
  if (!field && targets.length > 1) text += `\n\nThis part appears in ${targets.length} places; the ${locationOf(c, ds)} one is selected.`
  const commands: AssistantReply['commands'] = [{ type: 'selectComponent', id: c.id }]
  if (c.geometry.meshes.length) commands.push({ type: 'focusCamera', id: c.id })
  return { text, commands, suggestions: followUps(c) }
}
