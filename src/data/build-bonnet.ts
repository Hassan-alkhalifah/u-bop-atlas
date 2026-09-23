import { bonnetItemGeometry, ITEMS_WITHOUT_GEOMETRY } from '../geometry/bonnet-geometry'
import { BONNET_LAYOUT, RAM_LAYOUT, WORLD_UP_ITEMS, WORLD_UP_RAM_PARTS, type ExplodeOffset } from '../geometry/explode-layout'
import type { BonnetFrame } from '../geometry/frame'
import { ramPartGeometry, type RamPart } from '../geometry/ram-geometry'
import { allCatalogItems, catalogItem, drawingClaim, OPERATING_DATA, partNumberClaim, PIPE_RAM_TOP_SEAL, pipeRamRow, quantityClaim, SBR, spareClaim } from './catalog'
import { CURATION, GROUP_NAMES, kitClaims, type BonnetGroup } from './curation'
import { cat, claim } from './sources'
import type { Assembly, BopConfig, CavityId, Claim, ComponentInstance, Side } from './types'

export const SIDE_NAME: Record<Side, string> = { L: 'left', R: 'right' }
export const CAVITY_NAME: Record<CavityId, string> = { upper: 'upper', lower: 'lower' }

export function locationLabel(cavity: CavityId, side: Side, stack: BopConfig['stack']): string {
  return stack === 'double' ? `${CAVITY_NAME[cavity]} ${SIDE_NAME[side]}` : SIDE_NAME[side]
}

const DRAWN_TIER_NOTE = 'Position and count follow exploded view SD17500 (catalog p.9). Shape and size are educational approximations.'

/** Converts a local [axial, up, front] layout offset to world axes; "up" points away from the other cavity. */
function toWorldExplode(local: ExplodeOffset, f: BonnetFrame, cavity: CavityId, stack: BopConfig['stack'], worldUp = false): [number, number, number] {
  const up = worldUp || stack === 'single' || cavity === 'upper' ? 1 : -1
  return [f.sign * local[0], up * local[1], local[2]]
}

const OPERATING_DIMENSIONS = [
  { label: 'Fluid to close, pipe rams (1 set)', claim: claim(`${OPERATING_DATA.galsToClose} gal`, [cat(7), { sourceId: 'SRC-PAT', locator: 'row 19: 5.8 gal' }, { sourceId: 'SRC-QT', locator: 'Gallons to Close 5.80' }], 'A') },
  { label: 'Fluid to open, pipe rams (1 set)', claim: claim(`${OPERATING_DATA.galsToOpen} gal`, [cat(7), { sourceId: 'SRC-PAT', locator: 'row 18: 5.5 gal' }], 'A') },
  {
    label: 'Closing ratio',
    claim: { ...claim(OPERATING_DATA.closingRatio, [cat(7)], 'A'), conflicts: [{ value: '6.80', sources: [{ sourceId: 'SRC-QT', locator: 'Close Ratio 6.80 (standard bonnets)' }] }] } as Claim<string>,
  },
  { label: 'Opening ratio', claim: claim(OPERATING_DATA.openingRatio, [cat(7), { sourceId: 'SRC-QT', locator: 'Open Ratio 2.30' }], 'A') },
  { label: 'Hydraulic operating pressure', claim: claim('1,500 psi (max 3,000 psi)', [{ sourceId: 'SRC-PAT', locator: 'rows 15-16' }, { sourceId: 'SRC-QT' }], 'C', 'Not stated in the Cameron catalog.') },
  { label: 'Hydraulic connection size', claim: claim('1" NPT, two connections per set of rams', [cat(8)], 'A') },
]

const BOLT_DIMENSIONS = [
  {
    label: 'Bonnet bolt torque',
    claim: {
      ...claim('14,500 ft-lb (API lube) / 7,500 ft-lb (Moly lube)', [{ sourceId: 'SRC-PAT', locator: 'rows 11-12' }], 'C'),
      conflicts: [{ value: '8,982 ft-lb (Moly lube)', sources: [{ sourceId: 'SRC-QT', locator: 'Bonnet Bolt Specs' }] }],
    } as Claim<string>,
  },
  { label: 'Bonnet bolt wrench size', claim: claim('3-1/2" impact socket; 2-1/4" striking wrench', [{ sourceId: 'SRC-PAT', locator: 'rows 13-14' }], 'C') },
]

function extraDimensions(item: number) {
  if (item === 5) return OPERATING_DIMENSIONS
  if (item === 12) return BOLT_DIMENSIONS
  if (item === 8) return [{ label: 'Locking screw turns (each end)', claim: claim(OPERATING_DATA.lockingScrewTurns, [cat(7)], 'A') }]
  return []
}

export function bonnetAssemblies(cavity: CavityId, side: Side, stack: BopConfig['stack']): Assembly[] {
  const id = `bonnet-${cavity}-${side}`
  const loc = locationLabel(cavity, side, stack)
  const groups = Object.keys(GROUP_NAMES) as BonnetGroup[]
  return [
    { id, name: `Bonnet assembly, ${loc}`, parentId: 'bop', aliases: [`${loc} bonnet`, `${SIDE_NAME[side]} bonnet`, `${loc} bonnet assembly`] },
    ...groups.map((g) => ({ id: `${id}/${g}`, name: GROUP_NAMES[g], parentId: id, aliases: [] })),
    { id: `ram-${cavity}-${side}`, name: `Ram assembly, ${loc}`, parentId: 'bop', aliases: [`${loc} ram`, `${SIDE_NAME[side]} ram`] },
  ]
}

export function bonnetInstances(cavity: CavityId, side: Side, f: BonnetFrame, config: BopConfig): ComponentInstance[] {
  const prefix = `${cavity}-${side}`
  const loc = locationLabel(cavity, side, config.stack)
  const withLiftingEye = config.stack === 'single' || cavity === 'upper'
  const out: ComponentInstance[] = []
  for (const it of allCatalogItems()) {
    if (it.item === 1 || it.item === 4) continue
    const cur = CURATION[it.item]
    const geom = bonnetItemGeometry(it.item, f, withLiftingEye)
    if (it.item === 38 && !geom) continue
    const noGeom = ITEMS_WITHOUT_GEOMETRY[it.item]
    out.push({
      id: `${prefix}/i${String(it.item).padStart(2, '0')}`,
      name: it.description,
      catalogItem: it.item,
      aliases: [...(cur.aliases ?? []), loc],
      assemblyId: `bonnet-${cavity}-${side}/${cur.group}`,
      systemIds: cur.systems,
      cavity,
      side,
      partNumber: partNumberClaim(it.item),
      quantity: quantityClaim(it.item, config.stack),
      functionText: cur.functions ?? [],
      material: cur.material ?? null,
      documentedDimensions: extraDimensions(it.item),
      drawing: drawingClaim(it.item),
      recommendedSpare: spareClaim(it.item),
      kits: kitClaims(it.item),
      notes: [...(cur.notes ?? []), ...(noGeom ? [noGeom] : [])],
      geometry: geom
        ? { tier: 'T3', tierNote: DRAWN_TIER_NOTE, meshes: geom.meshes, kinematic: geom.kinematic, explode: toWorldExplode(BONNET_LAYOUT[it.item] ?? geom.explode, f, cavity, config.stack, WORLD_UP_ITEMS.has(it.item)), spin: geom.spin }
        : { tier: 'T3', tierNote: noGeom ?? 'No geometry.', meshes: [], kinematic: 'fixed', explode: [0, 0, 0] },
    })
  }
  return out
}

const PRESSURE_ENERGIZED = claim(
  'Rams are pressure-energized: wellbore pressure acts on the rams to increase the sealing force and maintain the seal if hydraulic pressure is lost.',
  [cat(5, 'Well bore pressure acts on the rams to increase the sealing force and maintain the seal in case of hydraulic pressure loss.'), { sourceId: 'SRC-SLB-DS-2025' }],
  'A',
)
const PIPE_RAM_FEATURES = claim(
  'Pipe rams are self-feeding with a large reservoir of packer rubber; packers lock into place and are not dislodged by well flow. Suitable for H2S service per NACE MR-01-75.',
  [cat(41)],
  'A',
)
const SBR_FUNCTION = claim(
  'Shearing blind rams shear the pipe in the hole, then bend the lower section of sheared pipe so the rams can close and seal. They can also be used as blind rams.',
  [cat(47)],
  'A',
)
const CAMRAM = claim('Packer part numbers beginning with 644 indicate the CAMRAM lipped-plate design.', [cat(41)], 'A')
const SBR_MATERIAL = claim('Blades: sulfide-stress-cracking susceptible materials. Ram body: sulfide-stress-cracking resistant materials. Grades not documented.', [cat(47)], 'A')
const SBR_SIDE_NOTE = 'The catalog lists an "upper" and a "lower" ram subassembly. Which bonnet side each goes on is not documented; the model assignment is illustrative.'

interface RamPartDef {
  part: RamPart
  name: string
  pn: string | null
  functions: Claim<string>[]
  material?: Claim<string>
  notes?: string[]
}

function ramPartDefs(config: BopConfig, cavity: CavityId, side: Side): RamPartDef[] {
  const kind = config.rams[cavity]
  if (kind.type === 'sbr') {
    const half = side === 'L' ? SBR.upper : SBR.lower
    const label = side === 'L' ? 'upper' : 'lower'
    return [
      { part: 'body', name: `Shearing blind ram body (${label} ram)`, pn: half.body, functions: [SBR_FUNCTION, PRESSURE_ENERGIZED], material: SBR_MATERIAL, notes: [SBR_SIDE_NOTE, `Subassembly part number: ${half.subassembly}.`] },
      ...(half.bladePacker ? [{ part: 'bladePacker' as const, name: 'Blade packer', pn: half.bladePacker, functions: [] }] : []),
      { part: 'sidePackers', name: 'Side packers (pair)', pn: `${half.sidePackers[0]} / ${half.sidePackers[1]}`, functions: [] },
      { part: 'topSeal', name: 'Top seal', pn: half.topSeal, functions: [], notes: ['Catalog p.48 lists the top seal as "2 Required" under the lower ram subassembly.'] },
    ]
  }
  const row = pipeRamRow(kind.type === 'blind' ? 'Blind' : kind.pipeSize)
  const title = kind.type === 'blind' ? 'Blind ram' : `Pipe ram, ${kind.pipeSize}" pipe`
  return [
    { part: 'body', name: `${title} body`, pn: row.ram, functions: [PRESSURE_ENERGIZED, ...(kind.type === 'pipe' ? [PIPE_RAM_FEATURES] : [])], notes: [`Ram assembly part number: ${row.assembly}.`] },
    { part: 'packer', name: 'Ram packer', pn: row.packer, functions: row.packer?.startsWith('644') ? [CAMRAM] : [] },
    { part: 'topSeal', name: 'Top seal', pn: PIPE_RAM_TOP_SEAL, functions: [claim('CAMRAM top seals are standard for U BOP pipe rams from 7-1/16" through 18-3/4".', [cat(41)], 'A')] },
  ]
}

export function ramInstances(cavity: CavityId, side: Side, f: BonnetFrame, config: BopConfig): ComponentInstance[] {
  const kind = config.rams[cavity]
  const loc = locationLabel(cavity, side, config.stack)
  const page = kind.type === 'sbr' ? 48 : 43
  return ramPartDefs(config, cavity, side).flatMap((def) => {
    const geom = ramPartGeometry(kind, def.part, f, side === 'L')
    if (!geom) return []
    const partNumber = def.pn ? claim(def.pn, [cat(page)], 'A') : null
    const sizeDim =
      kind.type === 'pipe' && def.part !== 'topSeal'
        ? [{ label: 'Pipe size the ram fits', claim: claim(`${kind.pipeSize} in`, [cat(43)], 'A') }]
        : []
    const inst: ComponentInstance = {
      id: `${cavity}-${side}/ram-${def.part}`,
      name: def.name,
      catalogItem: 4,
      aliases: ['ram', `${loc} ram`, def.part === 'packer' ? 'packer' : def.part === 'topSeal' ? 'top seal' : 'ram block'],
      assemblyId: `ram-${cavity}-${side}`,
      systemIds: def.part === 'body' ? ['rams'] : ['rams', 'seals'],
      cavity,
      side,
      partNumber,
      quantity: def.part === 'body' ? quantityClaim(4, config.stack) : null,
      functionText: def.functions,
      material: def.material ?? null,
      documentedDimensions: sizeDim,
      drawing: claim(page === 43 ? 'Pipe ram sketch Sd-10825 (catalog p.41); ram assembly is balloon 4 on SD17500' : 'Shear ram figures (catalog p.47); balloon 4 on SD17500', [cat(page === 43 ? 41 : 47), cat(9)], 'A'),
      recommendedSpare: null,
      kits: [],
      notes: def.notes ?? [],
      geometry: {
        tier: 'T3',
        tierNote: kind.type === 'pipe' ? 'Pipe cutout radius is half the documented pipe size; all other sizes are educational approximations.' : 'Educational approximation.',
        meshes: geom.meshes,
        kinematic: geom.kinematic,
        explode: toWorldExplode(RAM_LAYOUT[def.part] ?? geom.explode, f, cavity, config.stack, WORLD_UP_RAM_PARTS.has(def.part)),
      },
    }
    return [inst]
  })
}

export function describeRamKind(config: BopConfig, cavity: CavityId): string {
  const k = config.rams[cavity]
  return k.type === 'pipe' ? `${k.pipeSize}" pipe rams` : k.type === 'blind' ? 'blind rams' : 'shearing blind rams'
}

export { catalogItem }
