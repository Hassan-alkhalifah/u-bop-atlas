// Parts lists for export (Excel and print). Every value is copied from the dataset claims, with its evidence
// level and source; a missing value prints the standard "not available" text, never an estimate.
import type { BopDataset } from '../data/build-bop'
import { BONNET_PAGE, BONNET_TYPE_LABEL, locationLabel } from '../data/build-bonnet'
import { RAM_PAGE, ramKindLabel } from '../data/build-ram'
import { activeCavities } from '../data/config'
import { NOT_AVAILABLE, SOURCES } from '../data/sources'
import type { Claim, Confidence, ComponentInstance, SourceId, SourceRef } from '../data/types'
import { componentsInAssembly } from '../state/commands'
import { isVisible, type ViewerState } from '../state/store'

export type ExportScope = 'all' | 'assembly' | 'visible' | 'spares'

export const CONFIDENCE_TEXT: Record<Confidence, string> = {
  A: 'A: manufacturer document',
  B: 'B: manufacturer document, print anomaly',
  C: 'C: third-party data sheet',
  D: 'D: inferred, not stated',
}

const SHORT_SOURCE: Record<SourceId, string> = {
  'SRC-CAM-CAT-2014': 'Cameron catalog',
  'SRC-SLB-DS-2025': 'SLB data sheet',
  'SRC-SLB-WEB': 'SLB product page',
  'SRC-PAT': 'Patterson sheet',
  'SRC-QT': 'Quail Tools sheet',
}

export interface PartRow {
  id: string
  location: string
  assembly: string
  item: string
  name: string
  partNumber: string
  evidence: string
  quantity: string
  spare: string
  kits: string
  sources: string
  notes: string
  /** Part number evidence level; null when the catalog prints no part number. */
  confidence: Confidence | null
  /** Note attached to the part number claim (print anomaly, inference), or ''. */
  pnNote: string
  refs: SourceRef[]
}

export function refText(r: SourceRef): string {
  return `${SHORT_SOURCE[r.sourceId]}${r.page !== undefined ? ` p.${r.page}` : ''}`
}

function refsOf(claims: (Claim<unknown> | null)[]): SourceRef[] {
  const seen = new Set<string>()
  const out: SourceRef[] = []
  for (const c of claims) {
    for (const r of c?.sources ?? []) {
      const key = refText(r)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(r)
    }
  }
  return out
}

const COMPACT_SOURCE: Record<SourceId, string> = {
  'SRC-CAM-CAT-2014': 'Catalog',
  'SRC-SLB-DS-2025': 'SLB data sheet',
  'SRC-SLB-WEB': 'SLB web page',
  'SRC-PAT': 'Patterson',
  'SRC-QT': 'Quail Tools',
}

/** Short source text for narrow columns: "Catalog p.9, p.12; Patterson". */
export function compactSources(refs: SourceRef[]): string {
  const pages = new Map<SourceId, number[]>()
  for (const r of refs) {
    const list = pages.get(r.sourceId) ?? []
    pages.set(r.sourceId, r.page !== undefined && !list.includes(r.page) ? [...list, r.page] : list)
  }
  return [...pages.entries()]
    .map(([id, ps]) => (ps.length ? `${COMPACT_SOURCE[id]} ${[...ps].sort((a, b) => a - b).map((n) => `p.${n}`).join(', ')}` : COMPACT_SOURCE[id]))
    .join('; ')
}

const LOCATION_ORDER = ['upper-L', 'upper-R', 'lower-L', 'lower-R']

function locationRank(c: ComponentInstance): number {
  return c.cavity && c.side ? LOCATION_ORDER.indexOf(`${c.cavity}-${c.side}`) : -1
}

function itemRank(c: ComponentInstance): number {
  if (c.catalogItem !== undefined) return c.catalogItem * 10 + (c.itemLabel ? 1 : 0)
  const tb = c.itemLabel?.match(/^TB(\d+)$/)
  return tb ? 1000 + Number(tb[1]) : 2000
}

export function partRow(c: ComponentInstance, ds: BopDataset): PartRow {
  const assembly = ds.assemblies.find((a) => a.id === c.assemblyId)?.name ?? ''
  const refs = refsOf([c.partNumber, c.quantity, c.recommendedSpare, ...c.kits])
  return {
    id: c.id,
    location: c.cavity && c.side ? locationLabel(c.cavity, c.side, ds.config.stack) : 'body',
    assembly,
    item: c.itemLabel ?? (c.catalogItem !== undefined ? String(c.catalogItem) : ''),
    name: c.name,
    partNumber: c.partNumber?.value ?? NOT_AVAILABLE,
    evidence: c.partNumber ? CONFIDENCE_TEXT[c.partNumber.confidence] : 'No part number',
    quantity: c.quantity?.value ?? NOT_AVAILABLE,
    spare: c.recommendedSpare ? (c.recommendedSpare.value ? 'Yes (marked * on SD17500)' : 'No') : '',
    kits: c.kits.map((k) => k.value).join(' | '),
    sources: refs.map(refText).join('; '),
    notes: [c.partNumber?.note, ...c.notes].filter(Boolean).join(' '),
    confidence: c.partNumber?.confidence ?? null,
    pnNote: c.partNumber?.note ?? '',
    refs,
  }
}

/** Rows in reading order: body first, then each bonnet (upper left, upper right, lower left, lower right) by item. */
export function partRows(ds: BopDataset, ids?: Iterable<string>): PartRow[] {
  const wanted = ids ? new Set(ids) : null
  return ds.components
    .filter((c) => !wanted || wanted.has(c.id))
    .sort((a, b) => locationRank(a) - locationRank(b) || itemRank(a) - itemRank(b) || a.id.localeCompare(b.id))
    .map((c) => partRow(c, ds))
}

export interface BomRow {
  item: string
  name: string
  partNumber: string
  evidence: string
  quantity: string
  instances: number
  spare: string
  kits: string
  sources: string
  confidence: Confidence | null
  pnNote: string
  refs: SourceRef[]
}

/** One line per distinct part (same name, item and part number), with how many places it appears in the model. */
export function bomRows(rows: PartRow[]): BomRow[] {
  const groups = new Map<string, BomRow>()
  for (const r of rows) {
    const key = `${r.item}|${r.name}|${r.partNumber}`
    const g = groups.get(key)
    if (g) g.instances += 1
    else {
      const { item, name, partNumber, evidence, quantity, spare, kits, sources, confidence, pnNote, refs } = r
      groups.set(key, { item, name, partNumber, evidence, quantity, instances: 1, spare, kits, sources, confidence, pnNote, refs })
    }
  }
  return [...groups.values()]
}

export function sourcesUsed(rows: PartRow[]): { id: SourceId; title: string; publisher: string; url: string; reliability: string }[] {
  const used = new Set<string>(rows.flatMap((r) => r.sources.split('; ').map((s) => s.replace(/ p\.\d+$/, ''))))
  return (Object.keys(SOURCES) as SourceId[])
    .filter((id) => used.has(SHORT_SOURCE[id]))
    .map((id) => ({ id, title: SOURCES[id].title, publisher: SOURCES[id].publisher, url: SOURCES[id].url, reliability: SOURCES[id].reliability }))
}

/** Component ids in an export scope; `assembly` uses the top-level assembly of the selected part. */
export function scopeIds(s: ViewerState, scope: ExportScope): string[] {
  const ds = s.dataset
  switch (scope) {
    case 'all':
      return ds.components.map((c) => c.id)
    case 'visible':
      return ds.components.filter((c) => isVisible(s, c.id)).map((c) => c.id)
    case 'spares':
      return ds.components.filter((c) => c.recommendedSpare?.value).map((c) => c.id)
    case 'assembly': {
      const asm = selectedTopAssembly(s)
      return asm ? componentsInAssembly(ds, asm.id) : []
    }
  }
}

export function selectedTopAssembly(s: ViewerState): { id: string; name: string } | null {
  const c = s.selectedId ? s.dataset.byId.get(s.selectedId) : undefined
  if (!c) return null
  const topId = c.assemblyId.split('/')[0]
  const asm = s.dataset.assemblies.find((a) => a.id === topId)
  return asm ? { id: asm.id, name: asm.name } : null
}

export function configSummary(ds: BopDataset): string {
  const c = ds.config
  const cavity = (id: 'upper' | 'lower') => `${ramKindLabel(c.rams[id])}; ${BONNET_TYPE_LABEL[c.bonnets[id]].toLowerCase()}`
  const parts = activeCavities(c).map((id) => (c.stack === 'double' ? `${id} cavity: ${cavity(id)}` : cavity(id)))
  return `Cameron U BOP 13-5/8" 10,000 psi, ${c.stack}. ${parts.join('. ')}.`
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The configuration as label/value pairs, each with the catalog page its part numbers come from. */
export function setupRows(ds: BopDataset): [string, string][] {
  const c = ds.config
  const rows: [string, string][] = [['Stack', c.stack === 'double' ? 'Double BOP (upper and lower ram cavities)' : 'Single BOP (one ram cavity)']]
  for (const id of activeCavities(c)) {
    const label = c.stack === 'double' ? `${capital(id)} cavity` : 'Ram cavity'
    rows.push([`${label}, rams`, `${capital(ramKindLabel(c.rams[id]))} (catalog p.${RAM_PAGE[c.rams[id].type]})`])
    rows.push([`${label}, bonnets`, `${BONNET_TYPE_LABEL[c.bonnets[id]]} (catalog p.${BONNET_PAGE[c.bonnets[id]]})`])
  }
  return rows
}

export const DISCLAIMER =
  'Educational reference built from public documents. Part numbers are copied from the cited pages; confirm them with SLB for specific equipment (the catalog itself says weights, dimensions and part numbers should be confirmed). Not affiliated with or endorsed by SLB or Cameron.'
