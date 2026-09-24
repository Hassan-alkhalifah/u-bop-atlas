import { bonnetDims, bonnetItemGeometry, ITEMS_WITHOUT_GEOMETRY, lbLipOringGeometry } from '../geometry/bonnet-geometry'
import { BONNET_LAYOUT, BOOSTER_CHAIN_OVERRIDES, LB_LIP_ORING_LAYOUT, WORLD_UP_ITEMS, type ExplodeOffset } from '../geometry/explode-layout'
import type { BonnetFrame } from '../geometry/frame'
import { allCatalogItems, catalogItem, drawingClaim, LB_OPERATING_DATA, LB_SHEAR_ASSEMBLIES, LB_SHEAR_KIT, lbShearItem, OPERATING_DATA, partNumberClaim, quantityClaim, spareClaim } from './catalog'
import { CURATION, GROUP_NAMES, KIT_ITEMS, kitClaims, type BonnetGroup } from './curation'
import { cat, claim } from './sources'
import type { Assembly, BonnetType, BopConfig, CavityId, Claim, ComponentInstance, Side } from './types'

export const SIDE_NAME: Record<Side, string> = { L: 'left', R: 'right' }
export const CAVITY_NAME: Record<CavityId, string> = { upper: 'upper', lower: 'lower' }

export const BONNET_TYPE_LABEL: Record<BonnetType, string> = {
  standard: 'Standard bonnets',
  largeBoreShear: 'Large-bore shear bonnets',
  tandemBooster: 'Standard bonnets with tandem boosters',
}

export function locationLabel(cavity: CavityId, side: Side, stack: BopConfig['stack']): string {
  return stack === 'double' ? `${CAVITY_NAME[cavity]} ${SIDE_NAME[side]}` : SIDE_NAME[side]
}

const DRAWN_TIER_NOTE = 'Position and count follow exploded view SD17500 (catalog p.9). Shape and size are educational approximations.'
const LB_TIER_NOTE = 'Large-bore shear bonnet: arrangement as SD17500 (p.9); the larger operating cylinder is scaled from the documented closing ratios (p.7). Sizes are educational approximations.'

/** Converts a local [axial, up, front] layout offset to world axes; "up" points away from the other cavity. */
export function toWorldExplode(local: ExplodeOffset, f: BonnetFrame, cavity: CavityId, stack: BopConfig['stack'], worldUp = false): [number, number, number] {
  const up = worldUp || stack === 'single' || cavity === 'upper' ? 1 : -1
  return [f.sign * local[0], up * local[1], local[2]]
}

const HYDRAULIC_DIMENSIONS = [
  { label: 'Hydraulic operating pressure', claim: claim('1,500 psi (max 3,000 psi)', [{ sourceId: 'SRC-PAT', locator: 'rows 15-16' }, { sourceId: 'SRC-QT' }], 'C', 'Not stated in the Cameron catalog.') },
  { label: 'Hydraulic connection size', claim: claim('1" NPT, two connections per set of rams', [cat(8)], 'A') },
]

const OPERATING_DIMENSIONS = [
  { label: 'Fluid to close, pipe rams (1 set)', claim: claim(`${OPERATING_DATA.galsToClose} gal`, [cat(7), { sourceId: 'SRC-PAT', locator: 'row 19: 5.8 gal' }, { sourceId: 'SRC-QT', locator: 'Gallons to Close 5.80' }], 'A') },
  { label: 'Fluid to open, pipe rams (1 set)', claim: claim(`${OPERATING_DATA.galsToOpen} gal`, [cat(7), { sourceId: 'SRC-PAT', locator: 'row 18: 5.5 gal' }], 'A') },
  {
    label: 'Closing ratio',
    claim: { ...claim(OPERATING_DATA.closingRatio, [cat(7)], 'A'), conflicts: [{ value: '6.80', sources: [{ sourceId: 'SRC-QT', locator: 'Close Ratio 6.80 (standard bonnets)' }] }] } as Claim<string>,
  },
  { label: 'Opening ratio', claim: claim(OPERATING_DATA.openingRatio, [cat(7), { sourceId: 'SRC-QT', locator: 'Open Ratio 2.30' }], 'A') },
  ...HYDRAULIC_DIMENSIONS,
]

const LB_TABLE = 'Large Bore Shear Bonnet Operating Data, 13-5/8" Except 15,000 psi'

const LB_OPERATING_DIMENSIONS = [
  { label: 'Fluid to close, pipe rams (1 set), large-bore shear bonnets', claim: claim(`${LB_OPERATING_DATA.galsToClose} gal`, [cat(7, undefined, LB_TABLE)], 'A') },
  { label: 'Fluid to open, pipe rams (1 set), large-bore shear bonnets', claim: claim(`${LB_OPERATING_DATA.galsToOpen} gal`, [cat(7, undefined, LB_TABLE)], 'A') },
  { label: 'Closing ratio, large-bore shear bonnets', claim: claim(LB_OPERATING_DATA.closingRatio, [cat(7, undefined, LB_TABLE)], 'A') },
  { label: 'Opening ratio, large-bore shear bonnets', claim: claim(LB_OPERATING_DATA.openingRatio, [cat(7, undefined, LB_TABLE)], 'A') },
  ...HYDRAULIC_DIMENSIONS,
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

function extraDimensions(item: number, type: BonnetType) {
  const lb = type === 'largeBoreShear'
  if (item === 5) return lb ? LB_OPERATING_DIMENSIONS : OPERATING_DIMENSIONS
  if (item === 12) return BOLT_DIMENSIONS
  if (item === 8) return [{ label: 'Locking screw turns (each end)', claim: claim((lb ? LB_OPERATING_DATA : OPERATING_DATA).lockingScrewTurns, [cat(7, undefined, lb ? LB_TABLE : undefined)], 'A') }]
  if (item === 3 && lb && LB_SHEAR_ASSEMBLIES.right && LB_SHEAR_ASSEMBLIES.left) {
    return [{ label: 'Shear bonnet assembly part numbers', claim: claim(`Right ${LB_SHEAR_ASSEMBLIES.right}; left ${LB_SHEAR_ASSEMBLIES.left}`, [cat(18, '* Two shear bonnet assemblies one right and one left are required per cavity')], 'A') }]
  }
  return []
}

export const BOOSTER_GROUP = 'booster'

export function bonnetAssemblies(cavity: CavityId, side: Side, config: BopConfig): Assembly[] {
  const id = `bonnet-${cavity}-${side}`
  const loc = locationLabel(cavity, side, config.stack)
  const groups = Object.keys(GROUP_NAMES) as BonnetGroup[]
  const type = config.bonnets[cavity]
  const kind = type === 'largeBoreShear' ? 'Large-bore shear bonnet assembly' : 'Bonnet assembly'
  return [
    { id, name: `${kind}, ${loc}`, parentId: 'bop', aliases: [`${loc} bonnet`, `${SIDE_NAME[side]} bonnet`, `${loc} bonnet assembly`, ...(type === 'largeBoreShear' ? ['shear bonnet', 'large bore bonnet'] : [])] },
    ...groups.map((g) => ({ id: `${id}/${g}`, name: GROUP_NAMES[g], parentId: id, aliases: [] })),
    ...(type === 'tandemBooster' ? [{ id: `${id}/${BOOSTER_GROUP}`, name: 'Tandem booster (p.21)', parentId: id, aliases: ['tandem booster', 'booster'] }] : []),
    { id: `ram-${cavity}-${side}`, name: `Ram assembly, ${loc}`, parentId: 'bop', aliases: [`${loc} ram`, `${SIDE_NAME[side]} ram`] },
  ]
}

/** Items that the large-bore shear bonnet table (p.18) lists in a "/Shear" version with an "A" suffix. */
const LB_SWAPPED = [2, 3, 5, 26, 42]

const LB_SWAP_NOTE = (item: number) =>
  `Catalog p.18 lists this part as item ${item}A, the large-bore shear bonnet version of standard item ${item} (same name with "/Shear"). Parts that p.18 does not list keep their standard p.12 part numbers here; whether the large-bore bonnet shares them is not stated.`

const LB_KIT_CLAIM = (item: number): Claim<string> =>
  claim(`Large-bore shear bonnet softgoods kit ${LB_SHEAR_KIT} (13-5/8" 10,000 psi) lists item ${item}. One kit contains softgoods for one bonnet.`, [cat(19, '*  One kit contains softgoods for one bonnet.')], 'A')

function kitsFor(item: number, type: BonnetType): Claim<string>[] {
  if (type !== 'largeBoreShear') return kitClaims(item)
  return KIT_ITEMS.includes(item) && LB_SHEAR_KIT ? [LB_KIT_CLAIM(item)] : []
}

const BOOSTER_LOCK = claim(
  'With tandem boosters, the standard shear locking mechanism is installed on the outside end of the booster, because the booster tail rod has the same stroke as the operating piston.',
  [cat(20, "Since the tail rod of the tandem booster has the same stroke as the BOP's operating piston, the standard shear locking mechanism can be installed on the outside end of the booster.")],
  'A',
)

export function bonnetInstances(cavity: CavityId, side: Side, f: BonnetFrame, config: BopConfig): ComponentInstance[] {
  const prefix = `${cavity}-${side}`
  const loc = locationLabel(cavity, side, config.stack)
  const type = config.bonnets[cavity]
  const lb = type === 'largeBoreShear'
  const dims = bonnetDims(type)
  const withLiftingEye = config.stack === 'single' || cavity === 'upper'
  const layoutFor = (item: number) => (type === 'tandemBooster' ? BOOSTER_CHAIN_OVERRIDES[item] : undefined) ?? BONNET_LAYOUT[item]
  const out: ComponentInstance[] = []
  for (const it of allCatalogItems()) {
    if (it.item === 1 || it.item === 4) continue
    const cur = CURATION[it.item]
    const geom = bonnetItemGeometry(it.item, f, withLiftingEye, dims)
    if (it.item === 38 && !geom) continue
    const noGeom = ITEMS_WITHOUT_GEOMETRY[it.item]
    const swap = lb && LB_SWAPPED.includes(it.item) ? lbShearItem(`${it.item}A`) : null
    const boosterLock = type === 'tandemBooster' && (it.item === 7 || it.item === 8)
    out.push({
      id: `${prefix}/i${String(it.item).padStart(2, '0')}`,
      name: swap ? swap.description : it.description,
      catalogItem: it.item,
      ...(swap ? { itemLabel: `${it.item}A` } : {}),
      aliases: [...(cur.aliases ?? []), loc, ...(swap ? ['shear bonnet', 'large bore'] : [])],
      assemblyId: `bonnet-${cavity}-${side}/${cur.group}`,
      systemIds: cur.systems,
      cavity,
      side,
      partNumber: swap ? claim(swap.partNumber, [cat(18, undefined, `item ${swap.item}, 13-5/8" 10,000 psi column`)], 'A') : partNumberClaim(it.item),
      quantity: swap ? claim('2 per cavity (one right and one left bonnet)', [cat(18, 'Description (2 Required per Cavity)')], 'A') : quantityClaim(it.item, config.stack),
      functionText: [...(cur.functions ?? []), ...(boosterLock ? [BOOSTER_LOCK] : [])],
      material: cur.material ?? null,
      documentedDimensions: extraDimensions(it.item, type),
      drawing: swap ? claim(`Balloon ${swap.item} on the large-bore shear bonnet view SD-017503 (catalog p.18)`, [cat(18)], 'A') : drawingClaim(it.item),
      recommendedSpare: spareClaim(it.item),
      kits: kitsFor(it.item, type),
      notes: [...(cur.notes ?? []), ...(noGeom ? [noGeom] : []), ...(swap ? [LB_SWAP_NOTE(it.item)] : [])],
      geometry: geom
        ? { tier: 'T3', tierNote: lb ? LB_TIER_NOTE : DRAWN_TIER_NOTE, meshes: geom.meshes, kinematic: geom.kinematic, explode: toWorldExplode(layoutFor(it.item) ?? geom.explode, f, cavity, config.stack, WORLD_UP_ITEMS.has(it.item)), spin: geom.spin }
        : { tier: 'T3', tierNote: noGeom ?? 'No geometry.', meshes: [], kinematic: 'fixed', explode: [0, 0, 0] },
    })
  }
  if (lb) out.push(lbLipOring(cavity, side, f, config))
  return out
}

/** Item 24A (p.18) exists only on the large-bore shear bonnet; it has no standard counterpart on p.12. */
function lbLipOring(cavity: CavityId, side: Side, f: BonnetFrame, config: BopConfig): ComponentInstance {
  const row = lbShearItem('24A')
  const geom = lbLipOringGeometry(f, bonnetDims('largeBoreShear'))
  return {
    id: `${cavity}-${side}/i24a`,
    name: row.description,
    itemLabel: '24A',
    aliases: ['o-ring', 'lip o-ring', 'shear bonnet', locationLabel(cavity, side, config.stack)],
    assemblyId: `bonnet-${cavity}-${side}/seals`,
    systemIds: ['seals', 'hydraulics'],
    cavity,
    side,
    partNumber: claim(row.partNumber, [cat(18, undefined, 'item 24A, 13-5/8" 10,000 psi column')], 'A'),
    quantity: claim('2 per cavity (one right and one left bonnet)', [cat(18, 'Description (2 Required per Cavity)')], 'A'),
    functionText: [],
    material: null,
    documentedDimensions: [],
    drawing: claim('Balloon 24A on the large-bore shear bonnet view SD-017503 (catalog p.18)', [cat(18)], 'A'),
    recommendedSpare: null,
    kits: [],
    notes: ['The part name places this O-ring between the intermediate flange and the bonnet lip. p.18 lists it only for the large-bore shear bonnet.'],
    geometry: { tier: 'T3', tierNote: LB_TIER_NOTE, meshes: geom.meshes, kinematic: geom.kinematic, explode: toWorldExplode(LB_LIP_ORING_LAYOUT, f, cavity, config.stack) },
  }
}

export { catalogItem }
