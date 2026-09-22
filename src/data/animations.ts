// Animation sequences. The order of events follows catalog p.6; strokes and timings are approximations.
import { OPERATING_DATA } from './catalog'
import { cat, claim } from './sources'
import type { AnimationDef } from './types'

const P6_CLOSE = cat(6, 'Ram closing pressure closes the rams.')

export const ANIMATIONS: AnimationDef[] = [
  {
    id: 'close',
    name: 'Close and lock the rams',
    description: 'Closing pressure drives the operating pistons inward, the rams meet at the bore, then the manual locking screws are run in.',
    basis: claim(
      `Ram closing pressure closes the rams (p.6). The standard lock is manual (SLB), ${OPERATING_DATA.lockingScrewTurns} locking-screw turns each end (p.7).`,
      [P6_CLOSE, cat(7), { sourceId: 'SRC-SLB-WEB' }],
      'A',
      'Stroke length, speed and screw travel are approximations.',
    ),
    steps: [
      { cavity: 'all', channel: 'lock', to: 0, duration: 0.8 },
      { cavity: 'all', channel: 'ram', to: 1, duration: 2.4 },
      { cavity: 'all', channel: 'lock', to: 1, duration: 1.6 },
    ],
  },
  {
    id: 'open',
    name: 'Unlock and open the rams',
    description: 'The locking screws are backed out, then opening pressure drives the pistons and rams outward, clearing the bore.',
    basis: claim('Ram opening pressure opens the rams.', [cat(6, 'Ram opening pressure opens the rams.')], 'A', 'The locks must be retracted first; with wedgelocks this is enforced by sequence caps (p.5).'),
    steps: [
      { cavity: 'all', channel: 'lock', to: 0, duration: 1.6 },
      { cavity: 'all', channel: 'ram', to: 0, duration: 2.4 },
    ],
  },
  {
    id: 'piston-train',
    name: 'Piston, connecting rod and ram',
    description: 'Slow close of one ram set with the operating piston, its connecting rod and the ram highlighted.',
    basis: claim('Ram closing pressure closes the rams; the p.6 section shows the connecting rod of the operating piston ending at the ram.', [P6_CLOSE], 'A'),
    steps: [
      { cavity: 'upper', channel: 'lock', to: 0, duration: 0.6 },
      { cavity: 'upper', channel: 'ram', to: 0, duration: 1.2 },
      { cavity: 'upper', channel: 'ram', to: 1, duration: 4 },
    ],
    highlight: [4, 5],
  },
  {
    id: 'bonnet-open',
    name: 'Open the bonnets for ram change',
    description: 'Bolts removed, then closing pressure moves each bonnet outward until the ram is clear of the body.',
    basis: claim(
      'When the bonnet bolts are removed, closing pressure opens the bonnet. After the bonnet has moved to the fully extended position, the ram is clear of the body.',
      [cat(6)],
      'A',
      'Bonnet travel is derived from the rental-sheet open and closed lengths; bolt handling is simplified.',
    ),
    steps: [
      { cavity: 'all', channel: 'lock', to: 0, duration: 1 },
      { cavity: 'all', channel: 'bolts', to: 1, duration: 1.4 },
      { cavity: 'all', channel: 'ram', to: 1, duration: 1.2 },
      { cavity: 'all', channel: 'bonnet', to: 1, duration: 3 },
    ],
  },
  {
    id: 'bonnet-close',
    name: 'Close the bonnets after ram change',
    description: 'Opening pressure first pulls the rams outward, then draws the bonnets tight against the body; the bolts are reinstalled.',
    basis: claim(
      'Ram opening pressure closes the bonnets. The rams are pulled outward before the bonnets begin moving toward the body; the bonnet bolts are reinstalled to hold the bonnets closed.',
      [cat(6)],
      'A',
    ),
    steps: [
      { cavity: 'all', channel: 'ram', to: 0, duration: 1.2 },
      { cavity: 'all', channel: 'bonnet', to: 0, duration: 3 },
      { cavity: 'all', channel: 'bolts', to: 0, duration: 1.4 },
    ],
  },
]

export function animationById(id: string): AnimationDef | undefined {
  return ANIMATIONS.find((a) => a.id === id)
}
