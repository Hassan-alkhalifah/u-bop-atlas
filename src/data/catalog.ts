// Typed access to the machine-extracted Cameron catalog data.
// Part numbers must come from here (never typed by hand); tests enforce this.
import raw from '../../data/extracted/cameron-catalog-13-5-8-10k.json'
import { cat, claim } from './sources'
import type { Claim } from './types'

interface RawItem {
  item: number
  description: string
  qtySingle: string
  qtyDouble: string
  partNumber10k: string | null
  inExplodedView: boolean
  recommendedSpare: boolean
}

interface RawRow {
  page: number
  cells: string[]
}

const items = raw.bonnetAndBodyParts as RawItem[]

/** Items whose 10,000 psi part number differs from its sibling columns in a way that looks like a print error. */
const PRINT_ANOMALIES: Record<number, string> = {
  12: 'Print anomaly: the 3,000 psi column prints 201081-06-01 while this column prints 2010181-06-01. Confirm with SLB.',
  13: 'Print anomaly: the other pressure columns print 219065-..., this column prints 219061-.... Confirm with SLB.',
  39: 'Print anomaly: the other columns print 007650-25; this column prints 07650-25 (probable missing leading zero). Confirm with SLB.',
}

export const EXTRACTED_ANOMALIES: string[] = raw.knownPrintAnomalies

export function catalogItem(item: number): RawItem {
  const found = items.find((i) => i.item === item)
  if (!found) throw new Error(`Catalog item ${item} missing from extracted data`)
  return found
}

export function allCatalogItems(): RawItem[] {
  return items
}

export function partNumberClaim(item: number): Claim<string> | null {
  const it = catalogItem(item)
  if (!it.partNumber10k) return null
  const anomaly = PRINT_ANOMALIES[item]
  return claim(it.partNumber10k, [cat(12, undefined, `item ${item}, 10,000 psi Model II column`)], anomaly ? 'B' : 'A', anomaly)
}

export function quantityClaim(item: number, stack: 'double' | 'single'): Claim<string> {
  const it = catalogItem(item)
  const q = stack === 'double' ? it.qtyDouble : it.qtySingle
  return claim(`${q} per ${stack} BOP`, [cat(12, undefined, `item ${item}, Qty ${stack === 'double' ? 'Dbl' : 'Sgl'}`)], 'A')
}

export function drawingClaim(item: number): Claim<string> | null {
  const it = catalogItem(item)
  if (!it.inExplodedView) return null
  return claim(`Balloon ${item} on exploded view SD17500 "Double U BOP"`, [cat(9)], 'A', 'The drawing is not to scale and carries no dimensions.')
}

export function spareClaim(item: number): Claim<boolean> {
  const it = catalogItem(item)
  return claim(it.recommendedSpare, [cat(9, 'Note: "*" Indicates Recommended Spare Parts')], 'A')
}

// ---------- Rams ----------

const pipeRows = (raw.pipeRams as RawRow[]).map((r) => r.cells)

function topSealFromHeader(): string {
  const header = pipeRows.find((c) => c.some((x) => x.startsWith('Top Seal 644')))
  const cell = header?.find((x) => x.startsWith('Top Seal 644'))
  if (!cell) throw new Error('Pipe ram top seal header not found')
  return cell.replace('Top Seal ', '').trim()
}

export const PIPE_RAM_TOP_SEAL = topSealFromHeader()

export interface PipeRamRow {
  size: string
  assembly: string
  ram: string | null
  packer: string | null
}

const isPn = (v: string | undefined): v is string => !!v && /\d{4,}/.test(v)

/** Rows of the 13-5/8" 3,000-10,000 psi pipe ram table (catalog p.43, right half). */
export const PIPE_RAM_ROWS: PipeRamRow[] = pipeRows
  .filter((c) => /^(Blind|\d+\.\d{3})$/.test(c[0]) && isPn(c[4]))
  .map((c) => ({ size: c[0], assembly: c[4], ram: isPn(c[6]) ? c[6] : null, packer: isPn(c[7]) ? c[7] : null }))

/** Pipe sizes offered in the UI: rows that document assembly, ram and packer. */
export const SELECTABLE_PIPE_SIZES = PIPE_RAM_ROWS.filter((r) => r.size !== 'Blind' && r.ram && r.packer).map((r) => r.size)

export function pipeRamRow(size: string): PipeRamRow {
  const row = PIPE_RAM_ROWS.find((r) => r.size === size)
  if (!row) throw new Error(`No pipe ram row for ${size}`)
  return row
}

const sbrRows = (raw.shearingBlindRams as RawRow[]).map((r) => r.cells).filter((c) => c[0].startsWith('13-5/8'))

export interface SbrHalf {
  subassembly: string
  body: string
  bladePacker: string | null
  sidePackers: [string, string]
  topSeal: string
}

/** Catalog p.48: upper ram (blade side A) and lower ram (blade side B) of the shearing blind ram. */
export const SBR: { upper: SbrHalf; lower: SbrHalf } = (() => {
  const [u, l] = sbrRows
  if (!u || !l) throw new Error('SBR rows missing')
  return {
    upper: { subassembly: u[1], body: u[2], bladePacker: u[3], sidePackers: [u[4], u[5]], topSeal: l[5] },
    lower: { subassembly: l[1], body: l[2], bladePacker: null, sidePackers: [l[3], l[4]], topSeal: l[5] },
  }
})()

// ---------- Operating data (p.7) ----------

const opRow = (raw.operatingData as RawRow[]).map((r) => r.cells).find((c) => c[0].startsWith('13-5/8" Except'))
if (!opRow) throw new Error('Operating data row missing')
const opValues = opRow.filter((x) => x !== '')

export const OPERATING_DATA = {
  galsToOpen: opValues[1],
  galsToClose: opValues[2],
  lockingScrewTurns: opValues[3],
  closingRatio: opValues[4],
  openingRatio: opValues[5],
}

// ---------- Options and accessories ----------

function rowsOf(key: keyof typeof raw): string[][] {
  return (raw[key] as RawRow[]).map((r) => r.cells)
}

export const BONNET_REBUILD_KIT = rowsOf('bonnetRebuildKits').find((c) => c[1].includes('10,000'))?.[2] ?? null
export const LIFTING_PLATES = rowsOf('liftingPlates').map((c) => ({ partNumber: c[2], ratingTons: c[3] }))
export const LB_SHEAR_KIT = rowsOf('largeBoreShearBonnetKits').find((c) => c[1] === '10,000')?.[2] ?? null
export const SEAL_CARRIER = rowsOf('bonnetSealCarriers').find((c) => c[1] === '13-5/8"') ?? null
export const CAMLAST = rowsOf('wearPadsAndCamlastSeals').find((c) => c[1]?.startsWith('3,000, 5,000'))
export const ACCESSORIES_10K = rowsOf('standardAccessories')[0] ?? null
export const TANDEM_BOOSTER_ASSEMBLY = rowsOf('tandemBoosterComposite').find((c) => c[1] === 'Tandem Booster Assembly')?.[3] ?? null

export const LB_SHEAR_BONNET_10K = (() => {
  const rows = rowsOf('largeBoreShearBonnet')
  const headerIdx = rows.findIndex((c) => c[2] === '10,000 psi' && c[1] === '(2 Required per Cavity)')
  if (headerIdx < 0) return []
  return rows.slice(headerIdx + 2).map((c) => ({ item: c[0], description: c[1], partNumber: c[2] }))
})()

/** Every part-number string present in the extracted data; used to verify nothing was typed by hand. */
export function allExtractedStrings(): Set<string> {
  const out = new Set<string>()
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.add(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(raw)
  return out
}
