// Help, greetings, reset, view settings (x-ray, evidence, paint, quality) and configuration changes.
import { BONNET_TYPE_LABEL } from '../../data/build-bonnet'
import { RAM_PAGE, ramKindLabel } from '../../data/build-ram'
import { FLEXPACKER_NR_ROWS, SELECTABLE_PIPE_SIZES, VBR_ROWS } from '../../data/catalog'
import { activeCavities } from '../../data/config'
import type { BonnetType, BopConfig, CavityId, RamKind } from '../../data/types'
import { parseLocation, parsePipeSize, parseSizeInches } from '../parse'
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
- x-ray on / x-ray off
- evidence mode
- paint red / paint grey
- single BOP / double BOP
- upper rams blind / lower rams 5 inch pipe / lower rams shear
- lower rams ISR / upper rams VBR 5 inch / upper rams flexpacker
- large bore shear bonnets / tandem boosters / standard bonnets
- high quality / standard quality

Learn, share and export
- start the tour / lessons
- lesson on shearing / lesson on sealing
- quiz me / name the part quiz
- share this view / export the parts list

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

type RangeRow = { id: string; min: number; max: number }

/** The range that contains the requested pipe size, else the first range; null when a size fits no range. */
function pickRange<R extends RangeRow>(rows: R[], size: number | null): R | null {
  if (size === null) return rows[0] ?? null
  return rows.find((r) => size >= r.min - 1e-6 && size <= r.max + 1e-6) ?? null
}

function ramKindFrom(t: string): RamKind | 'unknown-size' | 'no-range' | null {
  if (/\b(isr|interlocking)\b/.test(t)) return { type: 'isr' }
  if (/\bflex ?packers?(-nr)?\b/.test(t)) {
    const row = pickRange(FLEXPACKER_NR_ROWS, parseSizeInches(t))
    return row ? { type: 'flexpacker', id: row.id } : 'no-range'
  }
  if (/\b(vbr(-?ii)?|variable( bore)?)\b/.test(t)) {
    const highTemp = /\b(high temp(erature)?|extended( range)?|hi temp)\b/.test(t)
    const rows = VBR_ROWS.filter((r) => r.highTemp === highTemp)
    const row = pickRange(rows, parseSizeInches(t))
    return row ? { type: 'vbr', id: row.id } : 'no-range'
  }
  if (/\b(shear|shearing|sbr|cutting)\b/.test(t)) return { type: 'sbr' }
  if (/\bblind\b/.test(t)) return { type: 'blind' }
  const size = parsePipeSize(t)
  if (size === 'unknown') return 'unknown-size'
  if (size) return { type: 'pipe', pipeSize: size }
  return null
}

const isShear = (k: RamKind) => k.type === 'sbr' || k.type === 'isr'

function bonnetTypeFrom(t: string): BonnetType | null {
  if (/\b(remove|without|no)\b.*\bboosters?\b/.test(t) || /\bstandard bonnets?\b/.test(t)) return 'standard'
  if (/\b(large[- ]?bore|lb)( shear)? bonnets?\b|\bshear bonnets?\b/.test(t)) return 'largeBoreShear'
  if (/\b(tandem )?boosters?\b/.test(t)) return 'tandemBooster'
  return null
}

const BONNET_PAGE: Record<BonnetType, number> = { standard: 12, largeBoreShear: 18, tandemBooster: 21 }

/** Bonnet change: "large bore shear bonnets", "add tandem boosters to the lower cavity", "standard bonnets". */
function bonnetChange(config: BopConfig, t: string): AssistantReply | null {
  const type = bonnetTypeFrom(t)
  if (!type) return null
  const asksChange = /\b(use|add|fit|install|put|switch|change|set|make|give|want|with|remove|without|swap)\b/.test(t) || /^(large|lb|shear|tandem|standard|boosters?)\b/.test(t)
  if (!asksChange) return null
  const loc = parseLocation(t)
  const shearCavity = activeCavities(config).find((c) => isShear(config.rams[c]))
  const cavity: CavityId = loc.cavities?.[0] ?? shearCavity ?? 'upper'
  if (cavity === 'lower' && config.stack === 'single') return reply('A single BOP has only one ram cavity. Say "double BOP" first to get a lower cavity.', [], ['double BOP'])
  const next: BopConfig = { ...config, bonnets: { ...config.bonnets, [cavity]: type } }
  const where = config.stack === 'double' ? `${cavity} cavity` : 'ram cavity'
  const why = !loc.cavities && shearCavity === cavity && config.stack === 'double' ? ' (the cavity with the shear rams)' : ''
  return reply(
    `The ${where}${why} now has ${BONNET_TYPE_LABEL[type].toLowerCase()}. Part numbers come from catalog p.${BONNET_PAGE[type]}.`,
    [{ type: 'setConfig', config: next }, { type: 'focusCamera', id: `bonnet-${cavity}-L` }],
    type === 'tandemBooster' ? ['show the tandem booster cylinder', 'explode the left bonnet'] : type === 'largeBoreShear' ? ['show the operating piston', 'explode the left bonnet'] : ['explode the left bonnet'],
  )
}

export const configuration: Intent = ({ ds, t }) => {
  const config = ds.config
  if (/\b(single)( bop| stack| preventer)?\b/.test(t) && /\b(single|make|switch|change|set|use)\b/.test(t) && !/\bram\b/.test(t)) {
    return reply('Switched to a single BOP (one ram cavity).', [{ type: 'setConfig', config: { ...config, stack: 'single' } }, { type: 'focusCamera', id: 'bop' }])
  }
  if (/\bdouble( bop| stack| preventer)?\b/.test(t) && /\b(double|make|switch|change|set|use)\b/.test(t) && !/\bram\b/.test(t)) {
    return reply('Switched to a double BOP (upper and lower ram cavities).', [{ type: 'setConfig', config: { ...config, stack: 'double' } }, { type: 'focusCamera', id: 'bop' }])
  }
  const bonnet = bonnetChange(config, t)
  if (bonnet) return bonnet
  if (!/\brams?\b/.test(t) || !/\b(set|change|use|make|switch|install|fit|put|upper|lower|to)\b/.test(t)) return null
  const kind = ramKindFrom(t)
  if (kind === null) return null
  if (kind === 'unknown-size') {
    return reply(`That pipe size is not in the catalog table for this BOP (p.43). Available sizes: ${SELECTABLE_PIPE_SIZES.join(', ')} in.`, [], ['upper rams 5 inch pipe', 'upper rams blind'])
  }
  if (kind === 'no-range') {
    const ranges = [...VBR_ROWS.map((r) => `VBR-II ${r.range}`), ...FLEXPACKER_NR_ROWS.map((r) => `FLEXPACKER-NR ${r.range}`)]
    return reply(`No variable-bore range in the catalog for this BOP covers that pipe size (p.54, p.55). Documented ranges: ${ranges.join('; ')}.`, [], ['upper rams VBR', 'upper rams flexpacker'])
  }
  const loc = parseLocation(t)
  const cavity: CavityId = loc.cavities?.[0] ?? 'upper'
  if (cavity === 'lower' && config.stack === 'single') return reply('A single BOP has only one ram cavity. Say "double BOP" first to get a lower cavity.', [], ['double BOP'])
  const next: BopConfig = { ...config, rams: { ...config.rams, [cavity]: kind } }
  const where = config.stack === 'double' ? `${cavity} cavity` : 'ram cavity'
  const follow = isShear(kind) ? ['show the side packers', 'close the rams'] : ['show the ram packer', 'close the rams']
  return reply(`The ${where} now has ${ramKindLabel(kind)}. Part numbers update from the catalog (p.${RAM_PAGE[kind.type]}).`, [{ type: 'setConfig', config: next }, { type: 'focusCamera', id: `ram-${cavity}-L` }], follow)
}
