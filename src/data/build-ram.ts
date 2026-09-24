// Ram parts for every ram type the catalog documents for this BOP: fixed-bore pipe and blind rams (p.43),
// shearing blind rams (p.48), ISR shearing blind rams (p.52), VBR-II variable bore rams (p.54) and
// FLEXPACKER-NR packers (p.55). Part numbers come from the extracted catalog tables only.
import { RAM_LAYOUT, WORLD_UP_RAM_PARTS } from '../geometry/explode-layout'
import type { BonnetFrame } from '../geometry/frame'
import { ramPartGeometry, type RamPart } from '../geometry/ram-geometry'
import { locationLabel, toWorldExplode } from './build-bonnet'
import { FLEXPACKER_TOP_SEAL, flexpackerRow, ISR, PIPE_RAM_TOP_SEAL, pipeRamRow, quantityClaim, SBR, vbrRow } from './catalog'
import { cat, claim } from './sources'
import type { BopConfig, CavityId, Claim, ComponentInstance, RamKind, Side } from './types'

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
const CAMRAM_TOP_SEAL = claim('CAMRAM top seals are standard for U BOP pipe rams from 7-1/16" through 18-3/4".', [cat(41)], 'A')
const SBR_MATERIAL = claim('Blades: sulfide-stress-cracking susceptible materials. Ram body: sulfide-stress-cracking resistant materials. Grades not documented.', [cat(47)], 'A')
const SHEAR_SIDE_NOTE = 'The catalog lists an "upper" and a "lower" ram subassembly. Which bonnet side each goes on is not documented; the model assignment is illustrative.'

const ISR_FUNCTION = claim(
  'The Interlocking Shear Ram (ISR) is an improved-shearing-capacity alternative to the standard SBR, to be used only when the standard rams cannot handle the desired shearing load. Its "V" shape, designed as wide as possible, can shear multiple strings and drill pipe as large as 6-5/8" O.D.',
  [cat(52, 'Since the geometry of the ISR ram incorporates a "V" shape and is designed as wide as possible, it can shear multiple strings and drill pipe as large as 6-5/8" O.D.')],
  'A',
)
const ISR_FISH = claim(
  'ISR rams do not fold over the lower fish, so less force is required to shear, and kill mud can be pumped down the severed drill string.',
  [cat(52, 'ISR Rams do not have to fold over the lower fish. This means less force is required to shear and, by leaving the fish open, kill mud can be pumped down the severed drill string.')],
  'A',
)
const ISR_INTERLOCK = claim(
  'The interlocking mechanism lets these rams be used in an oversized cavity without fear of a leak at low wellbore pressures.',
  [cat(52, 'The interlocking mechanism incorporated in the ISR means that these rams can be utilized in an oversized cavity without fear of a leak at low wellbore pressures.')],
  'A',
)
const VBR_FUNCTION = claim(
  'The VBR-II packer accommodates a range of pipe sizes and may be used in existing Cameron variable bore rams. It seals on a range of drill pipe sizes as well as hexagonal kellys and provides uniform sealing pressure with virtual elimination of extrusion paths.',
  [cat(54, 'The VBR-II seals on a range of drill pipe sizes as well as hexagonal kellys and provides uniform sealing pressure with virtual elimination of extrusion paths.')],
  'A',
)
const FLEX_FUNCTION = claim(
  'The FLEXPACKER-NR is a narrow variable bore ram packer designed for use with tapered drill strings. It is designed to fit standard fixed-bore Cameron pipe rams.',
  [cat(55, 'The Cameron Flexpacker-NR is a narrow variable bore ram packer designed for use with tapered drill strings. These packers are designed to fit standard fixed bore Cameron pipe rams.')],
  'A',
)

interface RamPartDef {
  part: RamPart
  name: string
  partNumber: Claim<string> | null
  functions: Claim<string>[]
  material?: Claim<string>
  notes?: string[]
}

const pn = (value: string | null, page: number): Claim<string> | null => (value ? claim(value, [cat(page)], 'A') : null)

export const RAM_PAGE: Record<RamKind['type'], number> = { pipe: 43, blind: 43, sbr: 48, isr: 52, vbr: 54, flexpacker: 55 }

function shearDefs(kind: Extract<RamKind, { type: 'sbr' | 'isr' }>, side: Side): RamPartDef[] {
  const upper = side === 'L'
  const label = upper ? 'upper' : 'lower'
  if (kind.type === 'sbr') {
    const half = upper ? SBR.upper : SBR.lower
    return [
      { part: 'body', name: `Shearing blind ram body (${label} ram)`, partNumber: pn(half.body, 48), functions: [SBR_FUNCTION, PRESSURE_ENERGIZED], material: SBR_MATERIAL, notes: [SHEAR_SIDE_NOTE, `Subassembly part number: ${half.subassembly}.`] },
      ...(half.bladePacker ? [{ part: 'bladePacker' as const, name: 'Blade packer', partNumber: pn(half.bladePacker, 48), functions: [] }] : []),
      { part: 'sidePackers', name: 'Side packers (pair)', partNumber: pn(`${half.sidePackers[0]} / ${half.sidePackers[1]}`, 48), functions: [] },
      { part: 'topSeal', name: 'Top seal', partNumber: pn(half.topSeal, 48), functions: [], notes: ['Catalog p.48 lists the top seal as "2 Required" under the lower ram subassembly.'] },
    ]
  }
  const half = upper ? ISR.upper : ISR.lower
  const items = upper ? '2-7' : '9-12'
  return [
    {
      part: 'body',
      name: `ISR shearing blind ram body (${label} ram)`,
      partNumber: pn(half.body, 52),
      functions: [ISR_FUNCTION, ISR_FISH, ISR_INTERLOCK, PRESSURE_ENERGIZED],
      notes: [SHEAR_SIDE_NOTE, `Subassembly part number (items ${items}): ${half.subassembly}.`, ...(upper ? ['Catalog p.52 footnote on this row: "Should be with wear pads."'] : [])],
    },
    { part: 'sidePackers', name: 'ISR side packers (pair)', partNumber: pn(`${half.sidePackers[0]} / ${half.sidePackers[1]}`, 52), functions: [] },
    { part: 'topSeal', name: 'ISR top seal', partNumber: pn(half.topSeal, 52), functions: [] },
    ...(half.bladeSeals ? [{ part: 'bladeSeals' as const, name: 'ISR blade seals (pair)', partNumber: pn(`${half.bladeSeals[0]} / ${half.bladeSeals[1]}`, 52), functions: [] }] : []),
  ]
}

function flexpackerTopSeal(packer: string): Claim<string> {
  if (FLEXPACKER_TOP_SEAL && FLEXPACKER_TOP_SEAL.packer === packer) return claim(FLEXPACKER_TOP_SEAL.topSeal, [cat(55, undefined, 'FLEXPACKER table, 13-5/8" row')], 'A')
  return claim(
    PIPE_RAM_TOP_SEAL,
    [cat(55, 'These packers are designed to fit standard fixed bore Cameron pipe rams.'), cat(43)],
    'D',
    'Inferred: p.55 prints a top seal only for the 2-3/8" x 3-1/2" packer. This packer fits standard pipe rams, whose top seal is listed on p.43.',
  )
}

function ramPartDefs(config: BopConfig, cavity: CavityId, side: Side): RamPartDef[] {
  const kind = config.rams[cavity]
  switch (kind.type) {
    case 'sbr':
    case 'isr':
      return shearDefs(kind, side)
    case 'vbr': {
      const row = vbrRow(kind.id)
      const label = row.highTemp ? 'Extended range high temperature VBR-II' : 'VBR-II'
      return [
        { part: 'body', name: `Variable bore ram body (${label}, ${row.range})`, partNumber: pn(row.body, 54), functions: [PRESSURE_ENERGIZED, VBR_FUNCTION], notes: [`Ram subassembly part number: ${row.subassembly}.`] },
        { part: 'packer', name: `${label} packer (${row.range})`, partNumber: pn(row.packer, 54), functions: [VBR_FUNCTION] },
        { part: 'topSeal', name: 'Top seal', partNumber: pn(row.topSeal, 54), functions: [] },
      ]
    }
    case 'flexpacker': {
      const row = flexpackerRow(kind.id)
      return [
        {
          part: 'body',
          name: 'Pipe ram body (for FLEXPACKER-NR)',
          partNumber: null,
          functions: [PRESSURE_ENERGIZED, FLEX_FUNCTION],
          notes: ['Catalog p.55 lists only the packer. It fits standard fixed-bore Cameron pipe rams; which pipe ram body is used is not stated.'],
        },
        { part: 'packer', name: `FLEXPACKER-NR packer (${row.range})`, partNumber: pn(row.packer, 55), functions: [FLEX_FUNCTION] },
        { part: 'topSeal', name: 'Top seal', partNumber: flexpackerTopSeal(row.packer), functions: [] },
      ]
    }
    case 'pipe':
    case 'blind': {
      const row = pipeRamRow(kind.type === 'blind' ? 'Blind' : kind.pipeSize)
      const title = kind.type === 'blind' ? 'Blind ram' : `Pipe ram, ${kind.pipeSize}" pipe`
      return [
        { part: 'body', name: `${title} body`, partNumber: pn(row.ram, 43), functions: [PRESSURE_ENERGIZED, ...(kind.type === 'pipe' ? [PIPE_RAM_FEATURES] : [])], notes: [`Ram assembly part number: ${row.assembly}.`] },
        { part: 'packer', name: 'Ram packer', partNumber: pn(row.packer, 43), functions: row.packer?.startsWith('644') ? [CAMRAM] : [] },
        { part: 'topSeal', name: 'Top seal', partNumber: pn(PIPE_RAM_TOP_SEAL, 43), functions: [CAMRAM_TOP_SEAL] },
      ]
    }
  }
}

const DRAWING: Record<RamKind['type'], Claim<string>> = {
  pipe: claim('Pipe ram sketch Sd-10825 (catalog p.41); ram assembly is balloon 4 on SD17500', [cat(41), cat(9)], 'A'),
  blind: claim('Pipe ram sketch Sd-10825 (catalog p.41); ram assembly is balloon 4 on SD17500', [cat(41), cat(9)], 'A'),
  sbr: claim('Shear ram figures (catalog p.47); balloon 4 on SD17500', [cat(47), cat(9)], 'A'),
  isr: claim('ISR shearing blind ram view SD 034603 (catalog p.52); balloon 4 on SD17500', [cat(52), cat(9)], 'A'),
  vbr: claim('U BOP variable bore ram figure (catalog p.54); balloon 4 on SD17500', [cat(54), cat(9)], 'A'),
  flexpacker: claim('FLEXPACKER-NR photo (catalog p.55); balloon 4 on SD17500', [cat(55), cat(9)], 'A'),
}

function tierNote(kind: RamKind): string {
  switch (kind.type) {
    case 'pipe':
      return 'Pipe cutout radius is half the documented pipe size; all other sizes are educational approximations.'
    case 'vbr':
    case 'flexpacker':
      return 'Bore cutout drawn at the largest pipe of the documented range. The inserts follow the p.54 picture; their shape, material and all sizes are educational approximations.'
    case 'isr':
      return 'The "V" front follows the catalog statement that the ISR geometry incorporates a "V" shape (p.52). Sizes are educational approximations.'
    default:
      return 'Educational approximation.'
  }
}

function sizeDimensions(kind: RamKind, part: RamPart): ComponentInstance['documentedDimensions'] {
  if (part === 'topSeal') return []
  if (kind.type === 'pipe') return [{ label: 'Pipe size the ram fits', claim: claim(`${kind.pipeSize} in`, [cat(43)], 'A') }]
  if (kind.type === 'vbr') return [{ label: 'Pipe size range', claim: claim(vbrRow(kind.id).range, [cat(54)], 'A') }]
  if (kind.type === 'flexpacker') return [{ label: 'Pipe size range', claim: claim(flexpackerRow(kind.id).range, [cat(55)], 'A') }]
  if (kind.type === 'isr' && part === 'body') return [{ label: 'Largest drill pipe it can shear', claim: claim('6-5/8" O.D.', [cat(52)], 'A') }]
  return []
}

const PART_ALIAS: Record<RamPart, string> = {
  body: 'ram block',
  packer: 'packer',
  topSeal: 'top seal',
  bladePacker: 'blade packer',
  sidePackers: 'side packer',
  bladeSeals: 'blade seal',
}

const KIND_ALIASES: Record<RamKind['type'], string[]> = {
  pipe: ['pipe ram'],
  blind: ['blind ram'],
  sbr: ['shear ram', 'sbr', 'shearing blind ram'],
  isr: ['isr', 'interlocking shear ram', 'shear ram'],
  vbr: ['vbr', 'variable bore ram', 'vbr-ii'],
  flexpacker: ['flexpacker', 'flexpacker-nr', 'variable bore'],
}

export function ramInstances(cavity: CavityId, side: Side, f: BonnetFrame, config: BopConfig): ComponentInstance[] {
  const kind = config.rams[cavity]
  const loc = locationLabel(cavity, side, config.stack)
  return ramPartDefs(config, cavity, side).flatMap((def) => {
    const geom = ramPartGeometry(kind, def.part, f, side === 'L')
    if (!geom) return []
    const inst: ComponentInstance = {
      id: `${cavity}-${side}/ram-${def.part}`,
      name: def.name,
      catalogItem: 4,
      aliases: ['ram', `${loc} ram`, PART_ALIAS[def.part], ...KIND_ALIASES[kind.type]],
      assemblyId: `ram-${cavity}-${side}`,
      systemIds: def.part === 'body' ? ['rams'] : ['rams', 'seals'],
      cavity,
      side,
      partNumber: def.partNumber,
      quantity: def.part === 'body' ? quantityClaim(4, config.stack) : null,
      functionText: def.functions,
      material: def.material ?? null,
      documentedDimensions: sizeDimensions(kind, def.part),
      drawing: DRAWING[kind.type],
      recommendedSpare: null,
      kits: [],
      notes: def.notes ?? [],
      geometry: {
        tier: 'T3',
        tierNote: tierNote(kind),
        meshes: geom.meshes,
        kinematic: geom.kinematic,
        explode: toWorldExplode(RAM_LAYOUT[def.part] ?? geom.explode, f, cavity, config.stack, WORLD_UP_RAM_PARTS.has(def.part)),
      },
    }
    return [inst]
  })
}

export function ramKindLabel(k: RamKind): string {
  switch (k.type) {
    case 'pipe':
      return `${k.pipeSize}" pipe rams`
    case 'blind':
      return 'blind rams'
    case 'sbr':
      return 'shearing blind rams'
    case 'isr':
      return 'ISR shearing blind rams'
    case 'vbr': {
      const row = vbrRow(k.id)
      return `${row.highTemp ? 'extended range high temperature VBR-II' : 'VBR-II'} variable bore rams, ${row.range}`
    }
    case 'flexpacker':
      return `FLEXPACKER-NR rams, ${flexpackerRow(k.id).range}`
  }
}

export function describeRamKind(config: BopConfig, cavity: CavityId): string {
  return ramKindLabel(config.rams[cavity])
}
