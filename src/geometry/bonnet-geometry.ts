// Educational-approximation geometry (tier T3) for every catalog item in one bonnet assembly.
// Part shapes and arrangement follow exploded view SD17500 and the assembled 3D view (catalog p.9) and the
// section on p.6: stepped bonnet with the bolt heads on the step, octagonal intermediate flange pierced by
// the two ram-change cylinders, round-flanged locking-screw housing held by short studs (item 13) and nuts
// (item 14), square-drive locking screw. None of these drawings carry dimensions, so sizes are approximations.
import type { BonnetType, Kinematic, MeshSpec, Outline } from '../data/types'
import { alongS, boxS, cylS, ellipsePoints, hexHeadS, hexS, latheS, plateS, ringS, rodS, threadS, worldX, type BonnetFrame } from './frame'
import { P, S } from './params'

export interface PartGeometry {
  meshes: MeshSpec[]
  kinematic: Kinematic
  /** Explode offset in local frame: [along s outward, up (away from the other cavity), front]. */
  explode: [number, number, number]
  spin?: boolean
}

// Bonnet: flange section at the body face, then a narrower body section.
const FLANGE_LEN = 4
const RC_R = P.rcCylinderRadius - 0.2
const RC_HEAD_S = S.cylEnd - 1
const RC_ROD_R = 0.8
const RC_END = S.housingEnd - 2.5

/**
 * Radial sizes that differ between bonnet types, plus the outward shift of the lock housing.
 * The large-bore shear bonnet (p.18) has a larger operating piston (closing ratio 10.8:1 vs 7.0:1, p.7), so the
 * cylinder, piston and everything arranged around them grow by the same amount. A tandem booster (p.21) sits
 * between the operating cylinder and the lock housing, which moves outward by the booster length (p.20).
 */
export interface BonnetDims {
  cylR: number
  pistonR: number
  collarR: number
  studR: number
  rcZ: number
  flange: Extract<Outline, { type: 'roundRect' }>
  body: Extract<Outline, { type: 'roundRect' }>
  intFlange: Extract<Outline, { type: 'octagon' }>
  /** Outward shift of the lock housing, locking screw, housing studs and nuts and tail-rod seals. */
  lockShift: number
}

export function bonnetDims(type: BonnetType): BonnetDims {
  const grow = type === 'largeBoreShear' ? P.lbCylinderRadius - P.opCylinderRadius : 0
  return {
    cylR: P.opCylinderRadius + grow,
    pistonR: 6.1 + grow,
    collarR: 8.2 + grow,
    studR: 7.2 + grow,
    rcZ: 8.4 + grow,
    flange: { type: 'roundRect', w: 24 + 2 * grow, h: 21, r: 3 },
    // The body section is lower than the flange so the bonnet bolt heads sit on the step (as drawn on p.9).
    body: { type: 'roundRect', w: 21 + 2 * grow, h: 15, r: 3 },
    intFlange: { type: 'octagon', w: 23 + 2 * grow, h: 19, chamfer: 4.5 },
    lockShift: type === 'tandemBooster' ? P.boosterLength : 0,
  }
}

export const STANDARD_DIMS = bonnetDims('standard')

// Bolt shanks must stay inside the cavity housing (half-height 10) and the heads on the bonnet step.
const BOLT_Y = 9
const BOLT_POS: [number, number][] = [[BOLT_Y, 8.2], [BOLT_Y, -8.2], [-BOLT_Y, 8.2], [-BOLT_Y, -8.2]]
const CAP_POS: [number, number][] = [20, 48, 76, 104, 132, 160].flatMap((deg) => {
  const a = (deg * Math.PI) / 180
  return [
    [7.4 * Math.sin(a), 9.4 * Math.cos(a)],
    [-7.4 * Math.sin(a), 9.4 * Math.cos(a)],
  ] as [number, number][]
})

function atY(f: BonnetFrame, s: number, y: number, z: number, shape: MeshSpec['shape'], material: MeshSpec['material']): MeshSpec {
  return { shape, position: [worldX(f, s), f.cavityY + y, z], axis: 'y', material }
}

function pistonProfile(r: number): [number, number][] {
  const a = S.ramBack
  const face = S.pistonFace
  const back = S.pistonBack
  return [
    [0, a], [P.rodRadius - 0.2, a], [P.rodRadius, a + 0.2],
    [P.rodRadius, face - 0.4], [P.rodRadius + 0.5, face],
    [r - 0.1, face], [r, face + 0.1], [r, face + 0.9], [r - 0.35, face + 0.9], [r - 0.35, face + 1.25],
    [r, face + 1.25], [r, back - 0.1], [r - 0.1, back],
    [P.tailRodRadius + 0.4, back], [P.tailRodRadius, back + 0.4],
    [P.tailRodRadius, S.tailEnd - 0.2], [P.tailRodRadius - 0.2, S.tailEnd], [0, S.tailEnd],
  ]
}

export function bonnetItemGeometry(item: number, f: BonnetFrame, withLiftingEye: boolean, d: BonnetDims = STANDARD_DIMS): PartGeometry | null {
  const rcZ = [d.rcZ, -d.rcZ]
  const topBody = d.body.h / 2
  const studPos = ellipsePoints(8, d.studR, d.studR, Math.PI / 8)
  // Lock housing stations; with a tandem booster the standard lock sits on the outside end of the booster (p.20).
  const lockAt = S.cylEnd + d.lockShift
  const housingEnd = S.housingEnd + d.lockShift
  const tailEnd = S.tailEnd + d.lockShift
  const screwEnd = S.screwEnd + d.lockShift
  const lockStudPos = d.lockShift ? ellipsePoints(8, STANDARD_DIMS.studR, STANDARD_DIMS.studR, Math.PI / 8) : studPos
  switch (item) {
    case 2:
      return {
        meshes: [plateS(f, d.intFlange, S.bonnetEnd, P.intFlangeLength, 'structureAlt', [{ x: 0, y: 0, r: P.rodRadius + 0.3 }, { x: d.rcZ, y: 0, r: RC_R + 0.05 }, { x: -d.rcZ, y: 0, r: RC_R + 0.05 }], 0, 0.45)],
        kinematic: 'bonnet',
        explode: [16, 0, 0],
      }
    case 3:
      return {
        meshes: [
          plateS(f, d.flange, 0, FLANGE_LEN, 'structure', [], 0, 0.6),
          plateS(f, d.body, FLANGE_LEN - 0.3, S.bonnetEnd - FLANGE_LEN + 0.3, 'structure', [], 0, 0.6),
        ],
        kinematic: 'bonnet',
        explode: [8, 0, 0],
      }
    case 5:
      return { meshes: [latheS(f, pistonProfile(d.pistonR), 'moving')], kinematic: 'ram', explode: [22, 16, 0] }
    case 6:
      return {
        meshes: [
          latheS(f, [
            [d.pistonR - 0.1, S.intEnd], [d.cylR + 0.35, S.intEnd], [d.cylR + 0.35, S.intEnd + 0.7], [d.cylR, S.intEnd + 0.9],
            [d.cylR, S.cylEnd - 1.6], [d.collarR - 0.2, S.cylEnd - 1.4], [d.collarR, S.cylEnd - 1.2],
            [d.collarR, S.cylEnd], [d.pistonR - 0.1, S.cylEnd], [d.pistonR - 0.1, S.intEnd],
          ], 'structure'),
        ],
        kinematic: 'bonnet',
        explode: [30, 0, 0],
      }
    case 7:
      return {
        meshes: [
          plateS(f, { type: 'circle', r: d.lockShift ? STANDARD_DIMS.collarR : d.collarR }, lockAt, 1.5, 'structureAlt', [{ x: 0, y: 0, r: 1.7 }, ...lockStudPos.map(([y, z]) => ({ x: z, y, r: 0.5 }))], 0, 0.25),
          latheS(f, [[1.7, lockAt + 1.4], [4.6, lockAt + 1.4], [4.6, lockAt + 2.1], [4.2, lockAt + 2.4], [4.2, housingEnd - 0.4], [3.8, housingEnd], [1.7, housingEnd], [1.7, lockAt + 1.4]], 'structureAlt'),
        ],
        kinematic: 'bonnet',
        explode: [40, 0, 0],
      }
    case 8:
      return {
        meshes: [
          threadS(f, 1.5, tailEnd, screwEnd - 2.2, 0.35, 'moving'),
          rodS(f, 1.1, screwEnd - 2.3, screwEnd - 1.5, 'moving'),
          boxS(f, 1.5, 1.35, 1.35, screwEnd - 1.5, 0, 0, 'moving'),
        ],
        kinematic: 'lock',
        explode: [52, 0, 0],
        spin: true,
      }
    case 9:
    case 10: {
      const z = item === 9 ? d.rcZ : -d.rcZ
      return {
        meshes: [
          rodS(f, RC_ROD_R, -4, RC_HEAD_S, 'moving', 0, z),
          latheS(f, [[0, RC_HEAD_S], [1.4, RC_HEAD_S], [1.5, RC_HEAD_S + 0.1], [1.5, RC_HEAD_S + 0.3], [1.35, RC_HEAD_S + 0.3], [1.35, RC_HEAD_S + 0.6], [1.5, RC_HEAD_S + 0.6], [1.5, RC_HEAD_S + 0.9], [1.4, RC_HEAD_S + 1], [0, RC_HEAD_S + 1]], 'moving', 0, z),
        ],
        kinematic: 'fixed',
        explode: [2, 0, item === 9 ? 6 : -6],
      }
    }
    case 11:
      return {
        meshes: rcZ.flatMap((z) => [
          latheS(f, [[RC_R - 0.15, 1], [RC_R, 1], [RC_R, RC_END - 0.8], [RC_R - 0.3, RC_END - 0.3], [RC_R - 0.9, RC_END], [0, RC_END + 0.05]], 'structureAlt', 0, z),
          alongS(f, { kind: 'hex', across: 2 * RC_R + 0.7, len: 0.9 }, S.intEnd + 0.15, S.intEnd + 1.05, 0, z, 'structureAlt'),
        ]),
        kinematic: 'bonnet',
        explode: [14, 0, 0],
      }
    case 12:
      return {
        meshes: BOLT_POS.flatMap(([y, z]) => [rodS(f, 0.9, -7, FLANGE_LEN, 'fastener', y, z), ...hexHeadS(f, 2.4, FLANGE_LEN, 1.9, y, z)]),
        kinematic: 'bolt',
        explode: [12, 0, 0],
      }
    case 13:
      return { meshes: lockStudPos.map(([y, z]) => threadS(f, 0.45, lockAt - 1.3, lockAt + 2.5, 0.18, 'fastener', y, z)), kinematic: 'bonnet', explode: [26, 0, 0] }
    case 14:
      return { meshes: lockStudPos.map(([y, z]) => hexS(f, 1.15, 0.8, lockAt + 1.5, y, z)), kinematic: 'bonnet', explode: [44, 0, 0] }
    case 15:
      return { meshes: [atY(f, S.bonnetEnd + 1.5, d.intFlange.h / 2 + 0.4, -3, { kind: 'cyl', r: 0.55, len: 0.9, sides: 24 }, 'fitting'), atY(f, S.bonnetEnd + 1.5, d.intFlange.h / 2 + 1.1, -3, { kind: 'hex', across: 1, len: 0.5 }, 'fitting')], kinematic: 'bonnet', explode: [8, 8, 0] }
    case 16:
      return { meshes: [atY(f, S.bonnetEnd + 1.5, d.intFlange.h / 2 + 0.35, 0, { kind: 'hex', across: 0.9, len: 0.7 }, 'fastener')], kinematic: 'bonnet', explode: [8, 10, 0] }
    case 17:
      return { meshes: [atY(f, S.bonnetEnd + 1.5, d.intFlange.h / 2 + 0.3, 3, { kind: 'cyl', r: 0.45, len: 0.6, sides: 4 }, 'fitting')], kinematic: 'bonnet', explode: [8, 12, 0] }
    case 18:
      return { meshes: [ringS(f, 2.5, 0.35, 5)], kinematic: 'bonnet', explode: [6, 16, 0] }
    case 19:
      return { meshes: [ringS(f, 2.5, 0.3, 5.8)], kinematic: 'bonnet', explode: [6, 19, 0] }
    case 20:
      return { meshes: [ringS(f, 2.55, 0.4, 3)], kinematic: 'bonnet', explode: [6, 10, 0] }
    case 21:
      return { meshes: [2.3, 3.7].map((s) => cylS(f, 2.9, s - 0.12, s + 0.12, 0, 0, 'softgood', 2.25)), kinematic: 'bonnet', explode: [6, 13, 0] }
    case 22:
      return { meshes: [ringS(f, 8, 0.35, 0.15, 0, 0, 'softgood', 0.72)], kinematic: 'bonnet', explode: [3, 0, 0] }
    case 23:
      return { meshes: [6, -6].map((z) => rodS(f, 0.5, -1.5, 1, 'fastener', -3.8, z)), kinematic: 'bonnet', explode: [5, 0, 0] }
    case 24:
      return { meshes: [S.intEnd + 0.35, S.cylEnd - 0.2].map((s) => ringS(f, d.cylR - 0.25, 0.22, s)), kinematic: 'bonnet', explode: [26, 12, 0] }
    case 25:
      return { meshes: [ringS(f, 2.5, 0.3, S.bonnetEnd + 1.5)], kinematic: 'bonnet', explode: [16, 10, 0] }
    case 26:
      return { meshes: [ringS(f, d.pistonR - 0.15, 0.24, S.pistonFace + 1.07)], kinematic: 'ram', explode: [22, 22, 0] }
    case 27:
      return { meshes: [ringS(f, 2.1, 0.3, lockAt + 2)], kinematic: 'bonnet', explode: [36, 10, 0] }
    case 28:
      return { meshes: [ringS(f, 2.0, 0.2, housingEnd - 0.3)], kinematic: 'bonnet', explode: [36, 13, 0] }
    case 29:
      return { meshes: rcZ.map((z) => ringS(f, 1.05, 0.2, -0.5, 0, z)), kinematic: 'fixed', explode: [0, 8, 0] }
    case 30:
      return { meshes: rcZ.map((z) => ringS(f, 1.05, 0.2, S.bonnetEnd + 1.5, 0, z)), kinematic: 'bonnet', explode: [16, 8, 0] }
    case 31:
      return { meshes: rcZ.map((z) => ringS(f, RC_R + 0.1, 0.18, S.intEnd - 0.1, 0, z)), kinematic: 'bonnet', explode: [16, 11, 0] }
    case 32:
      return { meshes: rcZ.map((z) => ringS(f, RC_R + 0.1, 0.18, 1.3, 0, z)), kinematic: 'bonnet', explode: [8, 11, 0] }
    case 33:
      return { meshes: rcZ.map((z) => ringS(f, 1.4, 0.16, RC_HEAD_S + 0.45, 0, z)), kinematic: 'fixed', explode: [2, 8, 0] }
    case 34:
      return { meshes: BOLT_POS.map(([y, z]) => ringS(f, 1.0, 0.18, FLANGE_LEN - 0.3, y, z)), kinematic: 'bolt', explode: [10, 6, 0] }
    case 35:
      return { meshes: CAP_POS.flatMap(([y, z]) => hexHeadS(f, 1.05, S.intEnd, 0.75, y, z * (d.intFlange.w / STANDARD_DIMS.intFlange.w))), kinematic: 'bonnet', explode: [20, 0, 0] }
    case 36:
      return { meshes: [atY(f, 7.2, topBody + 0.4, 4.5, { kind: 'hex', across: 1.0, len: 0.8 }, 'fitting')], kinematic: 'bonnet', explode: [8, 10, 0] }
    case 37:
      return { meshes: [atY(f, 7.2, topBody + 1.1, 4.5, { kind: 'cyl', r: 0.35, len: 0.6, sides: 24 }, 'fitting')], kinematic: 'bonnet', explode: [8, 13, 0] }
    case 38:
      if (!withLiftingEye) return null
      return {
        meshes: [
          { shape: { kind: 'torus', major: 1.2, tube: 0.32 }, position: [worldX(f, 7.2), f.cavityY + topBody + 2.2, -3], axis: 'z', material: 'fastener' },
          atY(f, 7.2, topBody + 0.5, -3, { kind: 'cyl', r: 0.9, len: 0.5, sides: 24 }, 'fastener'),
        ],
        kinematic: 'bonnet',
        explode: [5, 8, 0],
      }
    case 40:
      return { meshes: [cylS(f, 3, 6.45, 6.75, 0, 0, 'fastener', 2.25)], kinematic: 'bonnet', explode: [6, 22, 0] }
    case 41:
      return { meshes: [ringS(f, 2.6, 0.2, 7.1, 0, 0, 'fastener')], kinematic: 'bonnet', explode: [6, 25, 0] }
    case 42:
      return { meshes: [cylS(f, d.pistonR + 0.04, S.pistonFace + 0.15, S.pistonFace + 0.85, 0, 0, 'softgood', d.pistonR - 0.15)], kinematic: 'ram', explode: [22, 26, 0] }
    default:
      return null
  }
}

/** Items that are listed but not drawn on SD17500, or whose quantity is "--": no geometry is invented for them. */
export const ITEMS_WITHOUT_GEOMETRY: Record<number, string> = {
  39: 'Not drawn on the manufacturer exploded view (SD17500), so no geometry is shown.',
  43: 'Not drawn on SD17500 and the catalog quantity is "--", so no geometry is shown.',
}

/** Item 24A of the large-bore shear bonnet (p.18): O-ring at the intermediate flange to bonnet lip joint. */
export function lbLipOringGeometry(f: BonnetFrame, d: BonnetDims): PartGeometry {
  return { meshes: [ringS(f, d.cylR - 0.6, 0.24, S.bonnetEnd - 0.05)], kinematic: 'bonnet', explode: [16, 14, 0] }
}
