// Short text codes for ram kinds and bonnet types, used by the setup selects and by share links.
// Decoding validates every code against the extracted catalog rows, so a link can never select a ram
// the catalog does not document.
import { FLEXPACKER_NR_ROWS, SELECTABLE_PIPE_SIZES, VBR_ROWS } from './catalog'
import type { BonnetType, RamKind } from './types'

export function encodeRamKind(k: RamKind): string {
  switch (k.type) {
    case 'pipe':
      return `pipe_${k.pipeSize}`
    case 'vbr':
      return `vbr_${k.id}`
    case 'flexpacker':
      return `flex_${k.id}`
    default:
      return k.type
  }
}

export function decodeRamKind(code: string): RamKind | null {
  if (code === 'blind' || code === 'sbr' || code === 'isr') return { type: code }
  const [prefix, value] = code.split(/_(.*)/s)
  if (!value) return null
  if (prefix === 'pipe' && SELECTABLE_PIPE_SIZES.includes(value)) return { type: 'pipe', pipeSize: value }
  if (prefix === 'vbr' && VBR_ROWS.some((r) => r.id === value)) return { type: 'vbr', id: value }
  if (prefix === 'flex' && FLEXPACKER_NR_ROWS.some((r) => r.id === value)) return { type: 'flexpacker', id: value }
  return null
}

const BONNET_CODES: Record<BonnetType, string> = { standard: 'std', largeBoreShear: 'lb', tandemBooster: 'tb' }

export function encodeBonnetType(t: BonnetType): string {
  return BONNET_CODES[t]
}

export function decodeBonnetType(code: string): BonnetType | null {
  const hit = (Object.keys(BONNET_CODES) as BonnetType[]).find((t) => BONNET_CODES[t] === code)
  return hit ?? null
}
