// Parsing helpers for the offline assistant: locations, amounts, pipe sizes, targets and suggestions.
import type { BopDataset } from '../data/build-bop'
import { SELECTABLE_PIPE_SIZES } from '../data/catalog'
import { sameKindAs, searchComponents } from '../data/search'
import type { CavityId, ComponentInstance, Command, Side, SystemId } from './types'

export interface Location {
  cavities: CavityId[] | null
  sides: Side[] | null
}

export function parseLocation(t: string): Location {
  const cav: CavityId[] = []
  if (/\b(upper|top)\b/.test(t)) cav.push('upper')
  if (/\b(lower|bottom)\b/.test(t)) cav.push('lower')
  const sides: Side[] = []
  if (/\bleft\b/.test(t)) sides.push('L')
  if (/\bright\b/.test(t)) sides.push('R')
  return { cavities: cav.length ? cav : null, sides: sides.length ? sides : null }
}

export function hasLocation(loc: Location): boolean {
  return loc.cavities !== null || loc.sides !== null
}

const FILLER = /\b(upper|lower|top|bottom|left|right|side|sides|the|all|every|everything|please|me|of|a|an|for|on|in|to|show|find|select|where|is|are|what|whats|which|tell|about|zoom|focus|highlight|only|parts?|components?|assembly|assemblies|can|you|i|want|see|look|at|this|that|it|its)\b/g

export function stripFiller(t: string): string {
  return t.replace(FILLER, ' ').replace(/\s+/g, ' ').trim()
}

export function inLocation(c: ComponentInstance, loc: Location): boolean {
  if (loc.cavities && (!c.cavity || !loc.cavities.includes(c.cavity))) return false
  if (loc.sides && (!c.side || !loc.sides.includes(c.side))) return false
  return true
}

/** Best match plus every instance of the same catalog part in the requested location. */
export function findTargets(ds: BopDataset, phrase: string, loc: Location): ComponentInstance[] {
  const q = stripFiller(phrase)
  if (!q) return []
  const hits = searchComponents(ds, q, 60).map((h) => h.component)
  const located = hits.filter((c) => inLocation(c, loc))
  const top = located[0] ?? hits[0]
  if (!top) return []
  const family = sameKindAs(ds, top).filter((c) => inLocation(c, loc))
  return family.length ? family : [top]
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3)

/** Near matches for a phrase that found nothing: part names sharing a word prefix with the query. */
export function suggestNames(ds: BopDataset, phrase: string, limit = 3): string[] {
  const q = words(stripFiller(phrase))
  if (!q.length) return []
  const scored = new Map<string, number>()
  for (const c of ds.components) {
    const nameWords = words([c.name, ...c.aliases].join(' '))
    let score = 0
    for (const w of q) if (nameWords.some((n) => n.startsWith(w.slice(0, 4)) || w.startsWith(n.slice(0, 4)))) score += 1
    if (score > 0) scored.set(c.name, Math.max(scored.get(c.name) ?? 0, score))
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([n]) => n)
}

/** "50%", "0.5", "half", "fully", "a little" -> 0..1; null when no amount is given. */
export function parseAmount(t: string): number | null {
  const pct = t.match(/(\d{1,3})\s*%/)
  if (pct) return Math.min(1, Number(pct[1]) / 100)
  const dec = t.match(/\b(0?\.\d+|1(?:\.0+)?)\b/)
  if (dec && !/inch|in\b|"/.test(t)) return Math.min(1, Number(dec[1]))
  if (/\b(half|halfway)\b/.test(t)) return 0.5
  if (/\b(a little|slightly|a bit)\b/.test(t)) return 0.3
  if (/\b(full(y)?|completely|all the way|max(imum)?)\b/.test(t)) return 1
  return null
}

/** A pipe size written as 5", 5 in, 3 1/2 inch, 3-1/2" or 3.5 inch, in inches; null when none is given. */
export function parseSizeInches(t: string): number | null {
  const m = t.match(/(\d+)(?:\s*[- ]\s*(\d)\/(\d)|\.(\d+))?\s*(?:"|in(?:ch(?:es)?)?\b|pipe)/) ?? t.match(/pipe\s*(\d+)(?:\s*[- ]\s*(\d)\/(\d)|\.(\d+))?/)
  if (!m) return null
  let v = Number(m[1])
  if (m[2] && m[3]) v += Number(m[2]) / Number(m[3])
  if (m[4]) v = Number(`${m[1]}.${m[4]}`)
  return v
}

/** Pipe size in inches as the catalog string ("5.000"); 'unknown' when a size is given but not in the catalog. */
export function parsePipeSize(t: string): string | 'unknown' | null {
  const v = parseSizeInches(t)
  if (v === null) return null
  const key = v.toFixed(3)
  return SELECTABLE_PIPE_SIZES.includes(key) ? key : 'unknown'
}

export const SYSTEM_WORDS: [RegExp, SystemId][] = [
  [/\bseals?\b|\bsoftgoods?\b|\bo-?rings?\b|\bpacking\b/, 'seals'],
  [/\bhydraulics?\b|\bhydraulic system\b/, 'hydraulics'],
  [/\block(ing|s)?\b/, 'locking'],
  [/\bfasteners?\b|\bbolting\b|\bbolts\b|\bnuts\b|\bstuds\b/, 'fasteners'],
  [/\bstructur(e|al)\b/, 'structure'],
  [/\brams\b|\bram system\b/, 'rams'],
]

export function systemFrom(t: string): SystemId | null {
  for (const [rx, id] of SYSTEM_WORDS) if (rx.test(t)) return id
  return null
}

export const REFERS_TO_SELECTION = /\b(it|its|it's|this|that|this part|that part|the selected( part)?|selection)\b/

export function focusOn(ids: string[]): Command[] {
  return ids.length ? [{ type: 'focusCamera', id: ids[0] }] : []
}
