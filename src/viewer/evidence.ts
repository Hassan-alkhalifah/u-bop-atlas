import type { ComponentInstance } from '../data/types'

/** Evidence colours: how well the part's identity is documented (part number confidence). */
export const EVIDENCE_COLORS = {
  A: '#2F7D5B',
  B: '#C98F1C',
  C: '#B4622F',
  none: '#9AA0A3',
} as const

export function evidenceKey(c: ComponentInstance): keyof typeof EVIDENCE_COLORS {
  const conf = c.partNumber?.confidence
  if (conf === 'A') return 'A'
  if (conf === 'B') return 'B'
  if (conf === 'C' || c.quantity?.confidence === 'C') return 'C'
  return 'none'
}
