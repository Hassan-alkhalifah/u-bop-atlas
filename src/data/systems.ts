import { OPERATING_SYSTEM_SEALS_NOTE } from './curation'
import { cat, claim } from './sources'
import type { SystemDef, SystemId } from './types'

export const SYSTEMS: Record<SystemId, SystemDef> = {
  structure: {
    id: 'structure',
    name: 'Structure',
    color: '#8A9499',
    description: claim('Forged body, bonnets and intermediate flanges; flanged top and bottom connections with optional side outlets.', [cat(5), cat(8)], 'A'),
  },
  rams: {
    id: 'rams',
    name: 'Rams',
    color: '#C98F1C',
    description: claim('Pressure-energized rams: wellbore pressure increases the sealing force and maintains the seal if hydraulic pressure is lost.', [cat(5)], 'A'),
  },
  hydraulics: {
    id: 'hydraulics',
    name: 'Hydraulics',
    color: '#1E7F86',
    description: claim(
      'Hydraulic pressure opens and closes the rams and provides the means for quick ram change-out. Control connections are 1" NPT, two per set of rams.',
      [cat(6), cat(8)],
      'A',
    ),
  },
  seals: {
    id: 'seals',
    name: 'Seals',
    color: '#3B4A52',
    description: OPERATING_SYSTEM_SEALS_NOTE,
  },
  locking: {
    id: 'locking',
    name: 'Locking',
    color: '#8C4A2F',
    description: claim('Manual locking screws are the standard lock; hydraulic wedgelocks are optional and not modelled because no part data is public for this size.', [{ sourceId: 'SRC-SLB-WEB' }, cat(5)], 'A'),
  },
  fasteners: {
    id: 'fasteners',
    name: 'Fasteners',
    color: '#6F6A5E',
    description: null,
  },
}

export const SYSTEM_IDS = Object.keys(SYSTEMS) as SystemId[]
