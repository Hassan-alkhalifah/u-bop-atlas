// Integrity rules for the dataset. Run by `npm run validate` (build fails on any error) and by tests.
import { buildBop } from './build-bop'
import { allExtractedStrings, FLEXPACKER_NR_ROWS, SELECTABLE_PIPE_SIZES, VBR_ROWS } from './catalog'
import { SOURCES } from './sources'
import type { BonnetType, BopConfig, Claim, ComponentInstance, RamKind } from './types'

function claimsOf(c: ComponentInstance): { label: string; claim: Claim<unknown> }[] {
  const out: { label: string; claim: Claim<unknown> }[] = []
  const push = (label: string, cl: Claim<unknown> | null) => {
    if (cl) out.push({ label, claim: cl })
  }
  push('partNumber', c.partNumber)
  push('quantity', c.quantity)
  push('material', c.material)
  push('drawing', c.drawing)
  push('recommendedSpare', c.recommendedSpare)
  c.functionText.forEach((f, i) => push(`function[${i}]`, f))
  c.kits.forEach((k, i) => push(`kit[${i}]`, k))
  c.documentedDimensions.forEach((d) => push(`dimension:${d.label}`, d.claim))
  return out
}

export function checkConfig(config: BopConfig): string[] {
  const errors: string[] = []
  const ds = buildBop(config)
  const extracted = allExtractedStrings()
  const ids = new Set<string>()

  for (const c of ds.components) {
    if (ids.has(c.id)) errors.push(`${c.id}: duplicate id`)
    ids.add(c.id)
    if (!ds.assemblies.some((a) => a.id === c.assemblyId)) errors.push(`${c.id}: unknown assembly ${c.assemblyId}`)
    for (const { label, claim } of claimsOf(c)) {
      if (!claim.sources.length) errors.push(`${c.id}.${label}: claim has no source`)
      for (const s of claim.sources) if (!SOURCES[s.sourceId]) errors.push(`${c.id}.${label}: unknown source ${s.sourceId}`)
    }
    if (c.partNumber) {
      for (const pn of c.partNumber.value.split(' / ')) {
        if (!extracted.has(pn)) errors.push(`${c.id}: part number "${pn}" is not present in the extracted catalog data`)
      }
    }
    if (!['T1', 'T2', 'T3'].includes(c.geometry.tier)) errors.push(`${c.id}: missing geometry tier`)
    if (!c.geometry.tierNote) errors.push(`${c.id}: missing geometry tier note`)
  }

  for (const k of ds.connections) {
    if (!ids.has(k.from) || !ids.has(k.to)) errors.push(`connection ${k.id}: dangling endpoint`)
    if (!k.basis.sources.length) errors.push(`connection ${k.id}: no basis source`)
  }
  return errors
}

export const ALL_RAM_KINDS: RamKind[] = [
  ...SELECTABLE_PIPE_SIZES.map((pipeSize) => ({ type: 'pipe' as const, pipeSize })),
  { type: 'blind' },
  { type: 'sbr' },
  { type: 'isr' },
  ...VBR_ROWS.map((r) => ({ type: 'vbr' as const, id: r.id })),
  ...FLEXPACKER_NR_ROWS.map((r) => ({ type: 'flexpacker' as const, id: r.id })),
]

export const BONNET_TYPES: BonnetType[] = ['standard', 'largeBoreShear', 'tandemBooster']

/** Every ram kind in both stacks, and every bonnet type on each cavity. */
export function allConfigs(): BopConfig[] {
  const configs: BopConfig[] = []
  for (const k of ALL_RAM_KINDS) {
    configs.push({ stack: 'single', rams: { upper: k, lower: { type: 'blind' } }, bonnets: { upper: 'standard', lower: 'standard' } })
    configs.push({ stack: 'double', rams: { upper: k, lower: { type: 'sbr' } }, bonnets: { upper: 'standard', lower: 'standard' } })
  }
  for (const b of BONNET_TYPES) {
    configs.push({ stack: 'single', rams: { upper: { type: 'isr' }, lower: { type: 'blind' } }, bonnets: { upper: b, lower: 'standard' } })
    configs.push({ stack: 'double', rams: { upper: { type: 'pipe', pipeSize: '5.000' }, lower: { type: 'sbr' } }, bonnets: { upper: 'standard', lower: b } })
  }
  return configs
}

export function checkAll(): string[] {
  return allConfigs().flatMap((cfg) => checkConfig(cfg).map((e) => `[${cfg.stack} ${JSON.stringify(cfg.rams)} ${JSON.stringify(cfg.bonnets)}] ${e}`))
}
