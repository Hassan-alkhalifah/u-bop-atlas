// Tandem booster geometry (tier T3), keyed by the item numbers of the composite-style view on catalog p.21.
// Arrangement outward from the bonnet follows that view and the p.20 text: cylinder head (4) on the operating
// cylinder, booster cylinder (3) with its piston (6), tail rod (5) running out to the adapter plate (1), and
// the standard lock housing on the outside end. No dimensions are published; sizes are approximations.
import type { MeshSpec } from '../data/types'
import { STANDARD_DIMS, type PartGeometry } from './bonnet-geometry'
import { cylS, ellipsePoints, hexHeadS, latheS, plateS, ringS, rodS, worldX, type BonnetFrame } from './frame'
import { P, S } from './params'

const HEAD = { s0: S.cylEnd, s1: S.cylEnd + 2 }
const CYL = { s0: HEAD.s1, s1: S.cylEnd + P.boosterLength - 2 }
const ADAPTER = { s0: CYL.s1, s1: S.cylEnd + P.boosterLength }
const ADAPTER_R = STANDARD_DIMS.collarR + 1.5
const PISTON_R = STANDARD_DIMS.pistonR
const CYL_R = STANDARD_DIMS.cylR
const PISTON = { s0: S.tailEnd, s1: S.tailEnd + 2.5 }
const TAIL_END = S.tailEnd + P.boosterLength
const HEAD_SCREWS = ellipsePoints(6, 7.6, 7.6)
const ADAPTER_SCREWS = ellipsePoints(8, 9, 9, Math.PI / 8)

function atY(f: BonnetFrame, s: number, y: number, shape: MeshSpec['shape'], material: MeshSpec['material']): MeshSpec {
  return { shape, position: [worldX(f, s), f.cavityY + y, 0], axis: 'y', material }
}

/** Geometry per p.21 item; null for items whose position is not documented (studs, tubing, fittings). */
export function boosterItemGeometry(item: number, f: BonnetFrame): PartGeometry | null {
  switch (item) {
    case 1:
      return {
        meshes: [plateS(f, { type: 'circle', r: ADAPTER_R }, ADAPTER.s0, ADAPTER.s1 - ADAPTER.s0, 'structureAlt', [{ x: 0, y: 0, r: P.tailRodRadius + 0.3 }], 0, 0.35)],
        kinematic: 'bonnet',
        explode: [0, 0, 0],
      }
    case 2:
      return { meshes: [atY(f, ADAPTER.s0 + 1, ADAPTER_R + 0.25, { kind: 'hex', across: 0.9, len: 0.6 }, 'fitting')], kinematic: 'bonnet', explode: [0, 0, 0] }
    case 3:
      return {
        meshes: [
          latheS(f, [
            [PISTON_R - 0.1, CYL.s0], [CYL_R + 0.4, CYL.s0], [CYL_R + 0.4, CYL.s0 + 0.8], [CYL_R, CYL.s0 + 1.1],
            [CYL_R, CYL.s1 - 1.5], [ADAPTER_R - 0.3, CYL.s1 - 1.2], [ADAPTER_R - 0.3, CYL.s1], [PISTON_R - 0.1, CYL.s1], [PISTON_R - 0.1, CYL.s0],
          ], 'structure'),
        ],
        kinematic: 'bonnet',
        explode: [0, 0, 0],
      }
    case 4:
      return {
        meshes: [plateS(f, { type: 'circle', r: STANDARD_DIMS.collarR + 0.8 }, HEAD.s0, HEAD.s1 - HEAD.s0, 'structureAlt', [{ x: 0, y: 0, r: P.tailRodRadius + 0.3 }], 0, 0.3)],
        kinematic: 'bonnet',
        explode: [0, 0, 0],
      }
    case 5:
      return { meshes: [rodS(f, P.tailRodRadius, PISTON.s1 - 0.2, TAIL_END, 'moving')], kinematic: 'ram', explode: [0, 0, 0] }
    case 6:
      return {
        meshes: [
          latheS(f, [
            [0, PISTON.s0], [PISTON_R - 0.1, PISTON.s0], [PISTON_R, PISTON.s0 + 0.1], [PISTON_R, PISTON.s0 + 0.45], [PISTON_R - 0.3, PISTON.s0 + 0.45],
            [PISTON_R - 0.3, PISTON.s0 + 0.95], [PISTON_R, PISTON.s0 + 0.95], [PISTON_R, PISTON.s1 - 0.1], [PISTON_R - 0.1, PISTON.s1], [0, PISTON.s1],
          ], 'moving'),
        ],
        kinematic: 'ram',
        explode: [0, 0, 0],
      }
    case 7:
      return { meshes: ADAPTER_SCREWS.flatMap(([y, z]) => [rodS(f, 0.4, CYL.s1 - 1.2, ADAPTER.s1, 'fastener', y, z), ...hexHeadS(f, 1.05, ADAPTER.s1, 0.75, y, z)]), kinematic: 'bonnet', explode: [0, 0, 0] }
    case 8:
      return { meshes: HEAD_SCREWS.flatMap(([y, z]) => [rodS(f, 0.45, HEAD.s0 - 3, HEAD.s1, 'fastener', y, z), ...hexHeadS(f, 1.15, HEAD.s1, 0.85, y, z)]), kinematic: 'bonnet', explode: [0, 0, 0] }
    case 9:
      return { meshes: [ringS(f, PISTON_R + 0.1, 0.2, CYL.s0 + 0.1)], kinematic: 'bonnet', explode: [0, 0, 0] }
    case 10:
      return { meshes: [ringS(f, P.tailRodRadius + 0.2, 0.22, HEAD.s0 + 1)], kinematic: 'bonnet', explode: [0, 0, 0] }
    case 11:
      return { meshes: [ringS(f, PISTON_R + 0.1, 0.2, CYL.s1 - 0.1)], kinematic: 'bonnet', explode: [0, 0, 0] }
    case 12:
      return { meshes: [ringS(f, PISTON_R - 0.12, 0.22, PISTON.s0 + 0.7)], kinematic: 'ram', explode: [0, 0, 0] }
    case 13:
      return { meshes: [cylS(f, PISTON_R + 0.04, PISTON.s0 + 1.4, PISTON.s0 + 2.0, 0, 0, 'softgood', PISTON_R - 0.15)], kinematic: 'ram', explode: [0, 0, 0] }
    case 14:
      return { meshes: [cylS(f, P.tailRodRadius + 0.4, ADAPTER.s0 + 0.3, ADAPTER.s0 + 0.9, 0, 0, 'softgood', P.tailRodRadius + 0.05)], kinematic: 'bonnet', explode: [0, 0, 0] }
    case 15:
      return { meshes: [ringS(f, P.tailRodRadius + 0.2, 0.22, ADAPTER.s0 + 1.4)], kinematic: 'bonnet', explode: [0, 0, 0] }
    case 16:
      return {
        meshes: [atY(f, CYL.s1 - 3, CYL_R + 0.45, { kind: 'cyl', r: 0.45, len: 0.9, sides: 20 }, 'fitting'), atY(f, CYL.s1 - 3, CYL_R + 1.2, { kind: 'cyl', r: 0.75, len: 0.7, sides: 24 }, 'fitting')],
        kinematic: 'bonnet',
        explode: [0, 0, 0],
      }
    default:
      return null
  }
}
