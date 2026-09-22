// Documented facts per catalog item. Every string here is a direct quote or a close paraphrase
// of the cited page. Items with no documented function simply have no entry.
import { BONNET_REBUILD_KIT, OPERATING_DATA } from './catalog'
import { cat, claim } from './sources'
import type { Claim, SystemId } from './types'

export type BonnetGroup = 'structure' | 'operating' | 'ramchange' | 'lock' | 'packing' | 'seals'

export const GROUP_NAMES: Record<BonnetGroup, string> = {
  structure: 'Bonnet structure and bolting',
  operating: 'Ram operating system',
  ramchange: 'Ram-change (bonnet moving) system',
  lock: 'Manual locking system',
  packing: 'Secondary connecting-rod packing',
  seals: 'Bonnet softgoods',
}

interface ItemCuration {
  group: BonnetGroup
  systems: SystemId[]
  aliases?: string[]
  functions?: Claim<string>[]
  material?: Claim<string>
  notes?: string[]
}

const P6_RAMS = claim(
  'Ram closing pressure closes the rams. Ram opening pressure opens the rams.',
  [cat(6, 'Ram closing pressure closes the rams. ... Ram opening pressure opens the rams.')],
  'A',
  'System-level statement from the hydraulic control system page. The catalog does not describe this part on its own.',
)

const P6_BONNET = claim(
  'With the bonnet bolts removed, ram closing pressure opens the bonnet; ram opening pressure closes it again. The rams are pulled outward before the bonnets move toward the body.',
  [cat(6, 'When the bonnet bolts are removed, closing pressure opens the bonnet. ... Following ram change-out, this pressure closes the bonnets.')],
  'A',
)

const P6_RAM_CHANGE = claim(
  'Hydraulic pressure provides the means for quick ram change-out.',
  [cat(6, 'hydraulic pressure opens and closes the rams and provides the means for quick ram change-out')],
  'A',
  'System-level statement. The part names identify these parts as the ram-change system.',
)

const SLB_SEALS = claim(
  'Most operating system seals can be replaced with the bonnet in the ram-change position without removing the bonnets.',
  [{ sourceId: 'SRC-SLB-DS-2025', quote: 'Most operating system seals can be replaced with the bonnet in the ram-change position without removing the bonnets' }],
  'A',
)

const LOCK_STANDARD = claim(
  'The standard lock type is manual; a hydraulic lock (wedgelock) is optional.',
  [{ sourceId: 'SRC-SLB-WEB', quote: 'Lock types: Standard: Manual. Optional: Hydraulic' }],
  'A',
)

const LOCK_TURNS = claim(
  `Locking screw turns (each end): ${OPERATING_DATA.lockingScrewTurns}.`,
  [cat(7, undefined, 'Operating Data & Fluid Requirements, 13-5/8" Except 15,000 psi')],
  'A',
)

const BOLTS_HOLD = claim(
  'Hydraulic pressure draws the bonnets tightly against the preventer body and the bonnet bolts are reinstalled to hold the bonnets closed.',
  [cat(6, 'Hydraulic pressure draws the bonnets tightly against the preventer body and the bonnet bolts are reinstalled to hold the bonnets closed.')],
  'A',
)

const FACE_SEAL = claim(
  'The standard bonnet seal is a face seal. An optional bonnet seal carrier (bore-type seal) replaces it, so sealing no longer depends on bonnet bolt torque.',
  [cat(60, 'The bonnet seal carrier is a bore-type sealing assembly which replaces the face seal used as the previous bonnet seal. Sealing capability is not dependant upon bonnet bolt torque.')],
  'A',
)

const NITRILE = claim('Nitrile rubber', [cat(59, 'Connecting rod seals are nitrile rubber.')], 'A')

export const CURATION: Record<number, ItemCuration> = {
  2: { group: 'structure', systems: ['structure'], aliases: ['int flange', 'intermediate flange'] },
  3: { group: 'structure', systems: ['structure'], aliases: ['bonnet'], functions: [P6_BONNET, claim('Hydraulically opening bonnets.', [cat(5), { sourceId: 'SRC-SLB-WEB' }], 'A')] },
  5: { group: 'operating', systems: ['hydraulics'], aliases: ['operating piston', 'piston', 'connecting rod', 'tail rod', 'op piston'], functions: [P6_RAMS], notes: ['The catalog lists the operating piston as one part. Its inner end is the connecting rod (sealed by item 20) and its outer end is the tail rod (sealed by item 27). There is no separate connecting-rod part number.'] },
  6: { group: 'operating', systems: ['hydraulics'], aliases: ['operating cylinder', 'cylinder'], functions: [P6_RAMS] },
  7: { group: 'lock', systems: ['locking'], aliases: ['lock housing', 'locking screw housing'], functions: [LOCK_STANDARD] },
  8: { group: 'lock', systems: ['locking'], aliases: ['locking screw', 'lock screw', 'manual lock'], functions: [LOCK_STANDARD, LOCK_TURNS] },
  9: { group: 'ramchange', systems: ['hydraulics'], aliases: ['ram change piston open'], functions: [P6_RAM_CHANGE, P6_BONNET] },
  10: { group: 'ramchange', systems: ['hydraulics'], aliases: ['ram change piston close'], functions: [P6_RAM_CHANGE, P6_BONNET] },
  11: { group: 'ramchange', systems: ['hydraulics'], aliases: ['ram change cylinder'], functions: [P6_RAM_CHANGE] },
  12: { group: 'structure', systems: ['fasteners', 'structure'], aliases: ['bonnet bolt', 'bonnet bolts'], functions: [BOLTS_HOLD] },
  13: { group: 'lock', systems: ['fasteners'], aliases: ['housing stud', 'tie stud'] },
  14: { group: 'lock', systems: ['fasteners'], aliases: ['housing nut'] },
  15: { group: 'packing', systems: ['seals'], aliases: ['check valve'] },
  16: { group: 'packing', systems: ['seals', 'fasteners'], aliases: ['packing screw'] },
  17: { group: 'packing', systems: ['seals'], aliases: ['pipe plug'] },
  18: { group: 'packing', systems: ['seals'] },
  19: { group: 'packing', systems: ['seals'] },
  20: { group: 'seals', systems: ['seals'], aliases: ['connecting rod seal', 'rod seal'], material: NITRILE },
  21: { group: 'seals', systems: ['seals'], aliases: ['backup ring'] },
  22: { group: 'seals', systems: ['seals'], aliases: ['bonnet seal'], functions: [FACE_SEAL] },
  23: { group: 'structure', systems: ['structure'], aliases: ['guide pin'] },
  24: { group: 'seals', systems: ['seals', 'hydraulics'] },
  25: { group: 'seals', systems: ['seals', 'hydraulics'] },
  26: { group: 'seals', systems: ['seals', 'hydraulics'], aliases: ['piston seal', 'lip seal'] },
  27: { group: 'seals', systems: ['seals'], aliases: ['tail rod seal'] },
  28: { group: 'seals', systems: ['seals'], aliases: ['wiper'] },
  29: { group: 'seals', systems: ['seals', 'hydraulics'] },
  30: { group: 'seals', systems: ['seals', 'hydraulics'] },
  31: { group: 'seals', systems: ['seals', 'hydraulics'] },
  32: { group: 'seals', systems: ['seals', 'hydraulics'] },
  33: { group: 'seals', systems: ['seals', 'hydraulics'] },
  34: { group: 'seals', systems: ['seals'] },
  35: { group: 'structure', systems: ['fasteners'], aliases: ['cap screw'] },
  36: { group: 'operating', systems: ['hydraulics'], aliases: ['bleeder'] },
  37: { group: 'operating', systems: ['hydraulics'], aliases: ['bleeder plug'] },
  38: { group: 'structure', systems: ['structure'], aliases: ['eyebolt', 'lifting eye'], notes: ['Catalog p.6: "An eyebolt can be installed in the top of each ram to lift it out of the preventer." Whether this eyebolt is item 38 is not stated. Its position in the model is illustrative.'] },
  39: { group: 'packing', systems: ['seals'], aliases: ['plastic packing'] },
  40: { group: 'packing', systems: ['seals'] },
  41: { group: 'packing', systems: ['seals'] },
  42: { group: 'seals', systems: ['seals', 'hydraulics'], aliases: ['wear ring'] },
  43: { group: 'structure', systems: ['structure'] },
}

/** Items the catalog lists in the bonnet rebuild softgoods kit (p.16). */
export const KIT_ITEMS = [18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 39, 42]

export function kitClaims(item: number): Claim<string>[] {
  if (!KIT_ITEMS.includes(item) || !BONNET_REBUILD_KIT) return []
  return [claim(`Bonnet rebuild softgoods kit ${BONNET_REBUILD_KIT} (13-5/8" 3,000, 5,000 and 10,000 psi, pipe)`, [cat(16)], 'A')]
}

export const OPERATING_SYSTEM_SEALS_NOTE = SLB_SEALS
