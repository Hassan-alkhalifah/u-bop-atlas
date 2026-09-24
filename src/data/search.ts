import type { BopDataset } from './build-bop'
import { locationLabel } from './build-bonnet'
import type { ComponentInstance } from './types'

export interface SearchHit {
  component: ComponentInstance
  score: number
}

const norm = (s: string) => s.toLowerCase().replace(/[,"()]/g, ' ').replace(/\s+/g, ' ').trim()

const STOP = new Set(['the', 'a', 'an', 'me', 'show', 'of', 'all', 'please', 'find', 'select', 'part', 'component', 'components', 'number'])

/** Singularise simple plurals so "seals" matches "seal". */
const stem = (t: string) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t)

function haystack(c: ComponentInstance, ds: BopDataset): string {
  const loc = c.cavity && c.side ? locationLabel(c.cavity, c.side, ds.config.stack) : ''
  const pn = c.partNumber?.value ?? ''
  const item = [c.catalogItem !== undefined ? `item ${c.catalogItem}` : '', c.itemLabel ? `item ${c.itemLabel}` : ''].join(' ')
  return norm([c.name, ...c.aliases, loc, pn, item, c.id].join(' '))
}

const LOCATION_ORDER = ['upper-L', 'upper-R', 'lower-L', 'lower-R']

/** Body parts first, then upper-left, upper-right, lower-left, lower-right. */
function locationRank(c: ComponentInstance): number {
  if (!c.cavity || !c.side) return -1
  return LOCATION_ORDER.indexOf(`${c.cavity}-${c.side}`)
}

export function searchComponents(ds: BopDataset, query: string, limit = 12): SearchHit[] {
  const q = norm(query)
  if (!q) return []
  const tokens = q.split(' ').filter((t) => !STOP.has(t)).map(stem)
  if (!tokens.length) return []
  const hits: SearchHit[] = []
  for (const c of ds.components) {
    const h = haystack(c, ds)
    const pn = c.partNumber?.value.toLowerCase() ?? ''
    let score = 0
    if (pn && q.replace(/\s/g, '').includes(pn.replace(/\s/g, ''))) score += 100
    const itemMatch = q.match(/\bitem\s*(\d{1,2})\b/)
    if (itemMatch && c.catalogItem === Number(itemMatch[1])) score += 60
    let matched = 0
    for (const t of tokens) {
      if (h.includes(t)) {
        matched += 1
        score += new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(h) ? 10 : 4
      }
    }
    if (matched < tokens.length && score < 60) continue
    if (norm(c.name) === tokens.join(' ')) score += 30
    if (c.aliases.some((a) => norm(a) === tokens.join(' '))) score += 20
    hits.push({ component: c, score })
  }
  return hits.sort((a, b) => b.score - a.score || locationRank(a.component) - locationRank(b.component) || a.component.id.localeCompare(b.component.id)).slice(0, limit)
}

/** Groups hits that are the same catalog part in different bonnets. */
export function sameKindAs(ds: BopDataset, c: ComponentInstance): ComponentInstance[] {
  return ds.components.filter((o) => o.name === c.name && o.catalogItem === c.catalogItem)
}
