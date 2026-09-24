// Parts lists for export (Excel and print). Every value is copied from the dataset claims, with its evidence
// level and source; a missing value prints the standard "not available" text, never an estimate.
import type { BopDataset } from '../data/build-bop'
import { BONNET_TYPE_LABEL, locationLabel } from '../data/build-bonnet'
import { ramKindLabel } from '../data/build-ram'
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
}

export function refText(r: SourceRef): string {
  return `${SHORT_SOURCE[r.sourceId]}${r.page !== undefined ? ` p.${r.page}` : ''}`
}

function refsOf(claims: (Claim<unknown> | null)[]): string {
  const out = new Set<string>()
  for (const c of claims) for (const r of c?.sources ?? []) out.add(refText(r))
  return [...out].join('; ')
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
    sources: refsOf([c.partNumber, c.quantity, c.recommendedSpare, ...c.kits]),
    notes: [c.partNumber?.note, ...c.notes].filter(Boolean).join(' '),
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
}

/** One line per distinct part (same name, item and part number), with how many places it appears in the model. */
export function bomRows(rows: PartRow[]): BomRow[] {
  const groups = new Map<string, BomRow>()
  for (const r of rows) {
    const key = `${r.item}|${r.name}|${r.partNumber}`
    const g = groups.get(key)
    if (g) g.instances += 1
    else groups.set(key, { item: r.item, name: r.name, partNumber: r.partNumber, evidence: r.evidence, quantity: r.quantity, instances: 1, spare: r.spare, kits: r.kits, sources: r.sources })
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

export const DISCLAIMER =
  'Educational reference built from public documents. Part numbers are copied from the cited pages; confirm them with SLB for specific equipment (the catalog itself says weights, dimensions and part numbers should be confirmed). Not affiliated with or endorsed by SLB or Cameron.'
