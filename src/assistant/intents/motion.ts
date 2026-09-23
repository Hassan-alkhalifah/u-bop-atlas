// Animations and explode commands.
import { ANIMATIONS } from '../../data/animations'
import { activeCavities } from '../../data/config'
import type { Side } from '../../data/types'
import { claimText } from '../describe'
import { parseAmount, parseLocation } from '../parse'
import type { AssistantReply, Intent } from '../types'

function play(id: string): AssistantReply {
  const anim = ANIMATIONS.find((a) => a.id === id)!
  return {
    text: `${anim.name}. ${anim.description}\nSource: ${claimText(anim.basis)}`,
    commands: [{ type: 'showAll' }, { type: 'setExplode', amount: 0 }, { type: 'playAnimation', id }],
    suggestions: ['stop', id === 'close' ? 'open the rams' : 'close the rams', 'open the bonnets'],
  }
}

export const stop: Intent = ({ t }) =>
  /^(stop|pause|halt|freeze)\b/.test(t) ? { text: 'Animation stopped.', commands: [{ type: 'stopAnimation' }] } : null

export const animation: Intent = ({ t }) => {
  const bonnet = /\bbonnets?\b|\bram change\b|\bchange (the )?rams?\b/.test(t)
  if (bonnet && /\b(open|opens|opening|change|remove)\b/.test(t) && /\b(how|explain|show|animate|play|open|change)\b/.test(t)) return play('bonnet-open')
  if (bonnet && /\b(close|closes|closing|shut)\b/.test(t)) return play('bonnet-close')
  if (/(animate|play|demonstrate|show)\b.*\b(piston|connecting rod)\b.*\b(move|moves|stroke|work|works|animation)?/.test(t) && /\b(animate|play|demonstrate|move|moves|stroke|how)\b/.test(t)) return play('piston-train')
  if (/\bpiston\b.*(->|to|and|then).*\bram\b/.test(t)) return play('piston-train')
  if (/^(close|shut|seal|lock)( the)? (rams?|bop|well|preventer)\b/.test(t) || /(how|explain|why).*\b(close|closing|closes|shut)\b/.test(t)) return play('close')
  if (/^(open|unlock)( the)? (rams?|bop|preventer)\b/.test(t) || /(how|explain).*\b(open|opening|opens)\b/.test(t)) return play('open')
  if (/^(animate|play)\b/.test(t)) return play(/open/.test(t) ? 'open' : 'close')
  return null
}

export const explode: Intent = ({ ds, t }) => {
  if (/\b(collapse|unexplode|assemble|reassemble|put (it )?back( together)?|close up)\b/.test(t)) {
    return { text: 'Reassembled.', commands: [{ type: 'setExplode', amount: 0 }], suggestions: ['explode', 'explode the left bonnet'] }
  }
  if (!/\b(explode|exploded|spread|take apart|disassemble|break apart)\b/.test(t)) return null
  const amount = parseAmount(t) ?? 1
  const pct = `${Math.round(amount * 100)}%`
  if (/\bbonnets?\b|\brams?\b/.test(t)) {
    const kind = /\bbonnets?\b/.test(t) ? 'bonnet' : 'ram'
    const loc = parseLocation(t)
    const cavities = loc.cavities ?? activeCavities(ds.config)
    const sides: Side[] = loc.sides ?? ['L', 'R']
    const ids = cavities.flatMap((c) => sides.map((s) => `${kind}-${c}-${s}`)).filter((id) => ds.assemblies.some((a) => a.id === id))
    if (!ids.length) return { text: 'That assembly is not in the current configuration. Say "double BOP" to add the lower cavity.', commands: [], suggestions: ['double BOP'] }
    const names = ids.map((id) => ds.assemblies.find((a) => a.id === id)!.name)
    const note = kind === 'bonnet' ? ' The ram comes out with its bonnet.' : ' The bonnet comes out with its ram.'
    return {
      text: `Exploding ${names.join(', ')} to ${pct}.${note}`,
      commands: [{ type: 'setExplode', amount: 0 }, ...ids.map((assemblyId) => ({ type: 'explodeAssembly' as const, assemblyId, amount })), { type: 'focusCamera', id: ids.length > 1 ? 'bop' : ids[0] }],
      suggestions: ['collapse', 'list parts in the upper right bonnet', 'explode'],
    }
  }
  return {
    text: amount < 0.4 ? `Explode ${pct}: the bonnet assemblies slide out, carrying their rams.` : `Exploded view at ${pct}: bonnets and rams out of the body, parts spread in assembly order, seals in rows above their parts.`,
    commands: [{ type: 'setExplode', amount }, { type: 'focusCamera', id: 'bop' }],
    suggestions: ['collapse', 'explode 40%', 'isolate all seals'],
  }
}
