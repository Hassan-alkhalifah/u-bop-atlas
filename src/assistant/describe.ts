// Text renderings of dataset records. Shared by the offline assistant and the Claude server tools,
// so both only ever say what the dataset says.
import type { BopDataset } from '../data/build-bop'
import { locationLabel } from '../data/build-bonnet'
import { NOT_AVAILABLE, SOURCES } from '../data/sources'
import type { Claim, ComponentInstance, SourceRef } from '../data/types'

const SHORT: Record<SourceRef['sourceId'], string> = {
  'SRC-CAM-CAT-2014': 'Cameron catalog',
  'SRC-SLB-DS-2025': 'SLB data sheet',
  'SRC-SLB-WEB': 'SLB product page',
  'SRC-PAT': 'Patterson rental sheet',
  'SRC-QT': 'Quail Tools rental sheet',
}

export function cite(refs: SourceRef[]): string {
  const parts = refs.map((r) => `${SHORT[r.sourceId]}${r.page !== undefined ? ` p.${r.page}` : ''}`)
  return `[${[...new Set(parts)].join('; ')}]`
}

export function claimText(c: Claim<string> | null | undefined): string {
  if (!c) return NOT_AVAILABLE
  const conf = c.confidence === 'D' ? ' (inferred, not stated in a source)' : c.confidence === 'C' ? ' (third-party source only)' : ''
  const conflicts = c.conflicts?.length ? ` Conflicting value: ${c.conflicts.map((x) => `${x.value} ${cite(x.sources)}`).join('; ')}.` : ''
  const note = c.note ? ` Note: ${c.note}` : ''
  return `${c.value} ${cite(c.sources)}${conf}.${conflicts}${note}`
}

export function locationOf(c: ComponentInstance, ds: BopDataset): string {
  return c.cavity && c.side ? locationLabel(c.cavity, c.side, ds.config.stack) : 'body'
}

export function summarize(c: ComponentInstance, ds: BopDataset): string {
  const lines = [
    `${c.name}${c.catalogItem !== undefined ? ` (catalog item ${c.catalogItem})` : ''}, ${locationOf(c, ds)}.`,
    `Part number: ${claimText(c.partNumber)}`,
    `Function: ${c.functionText.length ? c.functionText.map((f) => claimText(f)).join(' ') : NOT_AVAILABLE}`,
    `Material: ${claimText(c.material)}`,
  ]
  if (c.documentedDimensions.length) lines.push(`Documented values: ${c.documentedDimensions.map((d) => `${d.label}: ${claimText(d.claim)}`).join(' ')}`)
  else lines.push(`Dimensions: ${NOT_AVAILABLE}`)
  lines.push(`Geometry: educational approximation (tier ${c.geometry.tier}). ${c.geometry.tierNote}`)
  return lines.join('\n')
}

/** JSON-safe record for the Claude tools: every value carries its sources. */
export function componentRecord(c: ComponentInstance, ds: BopDataset): Record<string, unknown> {
  const withSrc = (cl: Claim<unknown> | null) =>
    cl ? { value: cl.value, confidence: cl.confidence, sources: cl.sources.map((s) => ({ ...s, title: SOURCES[s.sourceId].title })), note: cl.note, conflicts: cl.conflicts } : NOT_AVAILABLE
  return {
    id: c.id,
    name: c.name,
    catalogItem: c.catalogItem ?? null,
    location: locationOf(c, ds),
    assemblyId: c.assemblyId,
    systems: c.systemIds,
    partNumber: withSrc(c.partNumber),
    quantity: withSrc(c.quantity),
    functions: c.functionText.length ? c.functionText.map(withSrc) : NOT_AVAILABLE,
    material: withSrc(c.material),
    documentedDimensions: c.documentedDimensions.length ? c.documentedDimensions.map((d) => ({ label: d.label, ...(withSrc(d.claim) as object) })) : NOT_AVAILABLE,
    drawing: withSrc(c.drawing),
    recommendedSpare: withSrc(c.recommendedSpare),
    kits: c.kits.map(withSrc),
    notes: c.notes,
    geometry: { tier: c.geometry.tier, note: c.geometry.tierNote },
  }
}
