// Tandem booster parts (catalog p.21, composite style, column 13-5/8" 3,000, 5,000 & 10,000 psi).
// One catalog assembly includes two tandem boosters, one per bonnet of the cavity.
import { boosterItemGeometry } from '../geometry/booster-geometry'
import { BOOSTER_LAYOUT, BOOSTER_WORLD_UP } from '../geometry/explode-layout'
import type { BonnetFrame } from '../geometry/frame'
import { BOOSTER_GROUP, locationLabel, toWorldExplode } from './build-bonnet'
import { TANDEM_BOOSTER_ASSEMBLY, TANDEM_BOOSTER_ITEMS, TANDEM_BOOSTER_REPAIR_KIT, type TandemBoosterItem } from './catalog'
import { cat, claim } from './sources'
import type { BopConfig, CavityId, Claim, ComponentInstance, Side, SystemId } from './types'

const COLUMN = '13-5/8" 3,000, 5,000 & 10,000 psi column'
const ONE_ASSEMBLY = '** One assembly includes two tandem'

const FORCE = claim(
  'Tandem boosters approximately double the force available to shear the pipe, without increasing the wear and tear on the packers.',
  [cat(20, 'A BOP equipped with tandem boosters can deliver increased shearing force, while not increasing the wear and tear on the packers. Tandem boosters approximately double the force available to shear the pipe.')],
  'A',
  'From the tandem booster introduction on p.20; p.21 lists the composite-style parts used on this BOP.',
)
const LOCK = claim(
  'The booster tail rod has the same stroke as the operating piston, so the standard shear locking mechanism can be installed on the outside end of the booster.',
  [cat(20, "Since the tail rod of the tandem booster has the same stroke as the BOP's operating piston, the standard shear locking mechanism can be installed on the outside end of the booster.")],
  'A',
)

const TIER_NOTE =
  'Order follows the p.21 exploded view (cylinder head, cylinder, piston with tail rod, adapter plate) and the p.20 statement that the standard lock sits on the outside end of the booster. Sizes and seal seats are educational approximations.'
const NO_GEOMETRY = 'Listed on p.21, but its position on the booster is not documented, so no geometry is shown.'

/** Items with quantity 1 per assembly (one assembly = two boosters) are shown once, on the left booster. */
const ONCE_PER_ASSEMBLY = (it: TandemBoosterItem) => it.qtyPerAssembly === '1'

function systemsFor(item: number): SystemId[] {
  if (item >= 9 && item <= 15) return ['seals', 'hydraulics']
  if (item === 7 || item === 8 || item === 17) return ['fasteners']
  if (item === 1 || item === 4) return ['structure', 'hydraulics']
  return ['hydraulics']
}

function functionsFor(item: number): Claim<string>[] {
  if (item === 3 || item === 6) return [FORCE]
  if (item === 5) return [FORCE, LOCK]
  return []
}

function assemblyValues(item: number): ComponentInstance['documentedDimensions'] {
  if (item !== 3) return []
  return [
    ...(TANDEM_BOOSTER_ASSEMBLY ? [{ label: 'Tandem booster assembly part number (two boosters)', claim: claim(TANDEM_BOOSTER_ASSEMBLY, [cat(21, ONE_ASSEMBLY, COLUMN)], 'A') }] : []),
    ...(TANDEM_BOOSTER_REPAIR_KIT ? [{ label: 'Tandem booster repair kit part number', claim: claim(TANDEM_BOOSTER_REPAIR_KIT, [cat(21, undefined, COLUMN)], 'A', 'The catalog does not list the kit contents.') }] : []),
  ]
}

export function boosterInstances(cavity: CavityId, side: Side, f: BonnetFrame, config: BopConfig): ComponentInstance[] {
  if (config.bonnets[cavity] !== 'tandemBooster') return []
  const loc = locationLabel(cavity, side, config.stack)
  return TANDEM_BOOSTER_ITEMS.filter((it) => side === 'L' || !ONCE_PER_ASSEMBLY(it)).map((it) => {
    const geom = boosterItemGeometry(it.item, f)
    const layout = BOOSTER_LAYOUT[it.item]
    return {
      id: `${cavity}-${side}/tb${String(it.item).padStart(2, '0')}`,
      name: `${it.description} (tandem booster)`,
      itemLabel: `TB${it.item}`,
      aliases: ['tandem booster', 'booster', loc, it.description.toLowerCase()],
      assemblyId: `bonnet-${cavity}-${side}/${BOOSTER_GROUP}`,
      systemIds: systemsFor(it.item),
      cavity,
      side,
      partNumber: it.partNumber ? claim(it.partNumber, [cat(21, undefined, `item ${it.item}, ${COLUMN}`)], 'A') : null,
      quantity: claim(`${it.qtyPerAssembly} per tandem booster assembly (one assembly includes two tandem boosters)`, [cat(21, ONE_ASSEMBLY, `item ${it.item}`)], 'A'),
      functionText: functionsFor(it.item),
      material: null,
      documentedDimensions: assemblyValues(it.item),
      drawing: claim(`Balloon ${it.item} on the composite-style tandem booster view (catalog p.21)`, [cat(21)], 'A'),
      recommendedSpare: null,
      kits: [],
      notes: [
        ...(it.partNumber ? [] : ['The catalog prints "-" instead of a part number for this item.']),
        ...(ONCE_PER_ASSEMBLY(it) ? ['Quantity 1 per assembly of two boosters; shown once, on the left booster.'] : []),
        ...(geom ? [] : [NO_GEOMETRY]),
      ],
      geometry: geom && layout
        ? { tier: 'T3', tierNote: TIER_NOTE, meshes: geom.meshes, kinematic: geom.kinematic, explode: toWorldExplode(layout, f, cavity, config.stack, BOOSTER_WORLD_UP.has(it.item)) }
        : { tier: 'T3', tierNote: NO_GEOMETRY, meshes: [], kinematic: 'fixed', explode: [0, 0, 0] },
    } satisfies ComponentInstance
  })
}
