// Help, greetings, reset, view settings (x-ray, evidence, paint, quality) and configuration changes.
import { SELECTABLE_PIPE_SIZES } from '../../data/catalog'
import type { BopConfig, CavityId, RamKind } from '../../data/types'
import { parseLocation, parsePipeSize } from '../parse'
import type { AssistantReply, Intent } from '../types'

export const HELP_TEXT = `Here is what I can do. Tap an example or type your own.

Find and show parts
- show the operating piston
- where is item 22
- find 644197-03-00-01
- show the upper left bonnet

Hide, isolate and reset
- isolate all seals
- show only the rams
- hide the bonnet bolts
- unhide  /  reset

Explode
- explode  /  explode 50%
- explode the left bonnet
- collapse

Animations
- close the rams  /  open the rams
- open the bonnets (ram change)
- animate the piston
- stop

Questions (answered only from the sourced data)
- part number of the bonnet
- material of the connecting rod seal
- how many bonnet bolts
- what is connected to the ram
- list the locking system
- list parts in the upper right bonnet
- recommended spare parts
- rebuild kit
- sources  /  what is not documented

View and setup
- x-ray on / off
- evidence mode
- paint red / paint grey
- single BOP / double BOP
- upper rams blind / lower rams 5 inch pipe / lower rams shear
- high quality / standard quality

After selecting a part you can say "hide it", "isolate it", "its part number" or "its connections".`

export const HELP_SUGGESTIONS = ['show the operating piston', 'isolate all seals', 'explode the left bonnet', 'close the rams', 'recommended spare parts']

const reply = (text: string, commands: AssistantReply['commands'] = [], suggestions?: string[]): AssistantReply => ({ text, commands, suggestions })

export const help: Intent = ({ t }) =>
  /^(help|\?|commands?|menu|what can you do|what can i (do|ask|say)|how (do i|to) use( this| you)?|options)\b/.test(t) ? reply(HELP_TEXT, [], HELP_SUGGESTIONS) : null

export const greeting: Intent = ({ t }) => {
  if (/^(hi|hello|hey|salam|salaam|marhaba|good (morning|afternoon|evening))\b/.test(t)) {
    return reply('Hello. I can find any part of the U BOP, explain it from the sourced data, and drive the 3D view. Type "help" to see everything I can do.', [], ['help', ...HELP_SUGGESTIONS.slice(0, 3)])
  }
  if (/^(thanks|thank you|thx|great|nice|ok|okay|cool)\b/.test(t)) return reply('Anything else? Type "help" for the full list of commands.', [], ['help'])
  return null
}

export const reset: Intent = ({ t }) =>
  /^(reset( the)?( view| everything| all)?|start over|clear( all)?|show (all|everything)( again)?)$/.test(t)
    ? reply('View reset: everything visible, assembled, rams closed and locked.', [{ type: 'resetView' }], ['explode', 'isolate all seals'])
    : null

export const viewSettings: Intent = ({ t }) => {
  if (/x-?ray/.test(t)) {
    const on = !/\b(off|disable|stop|hide|remove)\b/.test(t)
    return reply(`X-ray ${on ? 'on: outer parts are see-through' : 'off'}.`, [{ type: 'setXray', on }])
  }
  if (/\bevidence\b|\bprovenance\b/.test(t)) {
    const on = !/\b(off|disable|stop|hide|remove)\b/.test(t)
    return reply(on ? 'Evidence mode on. Green: part number from a Cameron document. Amber: Cameron document with a print anomaly. Orange: third-party sheet only. Grey: no part number.' : 'Evidence mode off.', [{ type: 'setProvenanceMode', on }])
  }
  const paint = t.match(/\b(red|grey|gray)\b/)
  if (paint && /\b(paint|colou?r|make it|turn)\b/.test(t)) {
    const p = paint[1] === 'red' ? 'red' : 'grey'
    return reply(p === 'red' ? 'Painted red, like the Cameron catalog render. Paint is illustrative only.' : 'Painted neutral grey. Paint is illustrative only.', [{ type: 'setPaint', paint: p }])
  }
  if (/\b(high|best) quality\b|\bhigh graphics\b/.test(t)) return reply('High quality rendering on (ambient occlusion).', [{ type: 'setQuality', quality: 'high' }])
  if (/\b(standard|low|fast(er)?) (quality|mode|graphics)\b|\bperformance mode\b/.test(t)) return reply('Standard rendering on (faster).', [{ type: 'setQuality', quality: 'standard' }])
  return null
}

function ramKindFrom(t: string): RamKind | 'unknown-size' | null {
  if (/\b(shear|shearing|sbr|cutting)\b/.test(t)) return { type: 'sbr' }
  if (/\bblind\b/.test(t)) return { type: 'blind' }
  const size = parsePipeSize(t)
  if (size === 'unknown') return 'unknown-size'
  if (size) return { type: 'pipe', pipeSize: size }
  return null
}

const kindLabel = (k: RamKind) => (k.type === 'pipe' ? `${k.pipeSize} in pipe rams` : k.type === 'blind' ? 'blind rams' : 'shearing blind rams')

export const configuration: Intent = ({ ds, t }) => {
  const config = ds.config
  if (/\b(single)( bop| stack| preventer)?\b/.test(t) && /\b(single|make|switch|change|set|use)\b/.test(t) && !/\bram\b/.test(t)) {
    return reply('Switched to a single BOP (one ram cavity).', [{ type: 'setConfig', config: { ...config, stack: 'single' } }, { type: 'focusCamera', id: 'bop' }])
  }
  if (/\bdouble( bop| stack| preventer)?\b/.test(t) && /\b(double|make|switch|change|set|use)\b/.test(t) && !/\bram\b/.test(t)) {
    return reply('Switched to a double BOP (upper and lower ram cavities).', [{ type: 'setConfig', config: { ...config, stack: 'double' } }, { type: 'focusCamera', id: 'bop' }])
  }
  if (!/\brams?\b/.test(t) || !/\b(set|change|use|make|switch|install|fit|put|upper|lower|to)\b/.test(t)) return null
  const kind = ramKindFrom(t)
  if (kind === null) return null
  if (kind === 'unknown-size') {
    return reply(`That pipe size is not in the catalog table for this BOP (p.43). Available sizes: ${SELECTABLE_PIPE_SIZES.join(', ')} in.`, [], ['upper rams 5 inch pipe', 'upper rams blind'])
  }
  const loc = parseLocation(t)
  const cavity: CavityId = loc.cavities?.[0] ?? 'upper'
  if (cavity === 'lower' && config.stack === 'single') return reply('A single BOP has only one ram cavity. Say "double BOP" first to get a lower cavity.', [], ['double BOP'])
  const next: BopConfig = { ...config, rams: { ...config.rams, [cavity]: kind } }
  const where = config.stack === 'double' ? `${cavity} cavity` : 'ram cavity'
  return reply(`The ${where} now has ${kindLabel(kind)}. Part numbers update from the catalog (${kind.type === 'sbr' ? 'p.48' : 'p.43'}).`, [{ type: 'setConfig', config: next }, { type: 'focusCamera', id: `ram-${cavity}-L` }], ['show the ram packer', 'close the rams'])
}
