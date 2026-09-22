// Body, flanges, side outlets, flange studs and hydraulic ports (geometry tier T3 unless noted).
// Arrangement (vertical column, one cavity housing per ram set, outlets on the column below the rams)
// follows the assembled 3D view on catalog p.9. The drawing has no dimensions, so sizes are approximations.
import type { CavityId, MeshSpec } from '../data/types'
import type { PartGeometry } from './bonnet-geometry'
import { ellipsePoints } from './frame'
import { bodyBlockHeight, cavityCentres, overallHeight, P } from './params'

type Stack = 'double' | 'single'

const boreR = () => P.boreDiameter / 2
const FLANGE_BOLT_CIRCLE = 13
const FLANGE_HOLE_R = 1.05

export function flangeStations(stack: Stack) {
  const top = overallHeight(stack).value / 2
  const flangeBottom = top - P.flangeThickness
  const blockTop = bodyBlockHeight(stack) / 2
  return { top, flangeBottom, blockTop }
}

function cavityY(stack: Stack, cavity: CavityId): number {
  const c = cavityCentres(stack)
  return cavity === 'upper' ? c.upper : (c.lower ?? 0)
}

/** Vertical lathe; profile heights are world Y. */
function latheY(profile: [number, number][], material: MeshSpec['material'], flipDown = false): MeshSpec {
  return { shape: { kind: 'lathe', profile, segments: 72 }, position: [0, 0, 0], axis: 'y', material, rotation: flipDown ? [Math.PI, 0, 0] : [0, 0, 0] }
}

export function bodyGeometry(stack: Stack): PartGeometry {
  const { top, flangeBottom, blockTop } = flangeStations(stack)
  const b = boreR()
  const R = P.columnRadius
  const meshes: MeshSpec[] = [
    // Column with the vertical bore.
    latheY([[b, -blockTop], [R - 0.6, -blockTop], [R, -blockTop + 0.6], [R, blockTop - 0.6], [R - 0.6, blockTop], [b, blockTop], [b, -blockTop]], 'structure'),
  ]
  // Cavity housings: one per ram set, bevelled blocks pierced by the bore.
  const cavities: CavityId[] = stack === 'double' ? ['upper', 'lower'] : ['upper']
  for (const cav of cavities) {
    meshes.push({
      shape: { kind: 'plate', outline: { type: 'roundRect', w: 2 * P.bodyHalfWidth, h: P.bodyDepth, r: 3.5 }, thickness: P.housingHeight, holes: [{ x: 0, y: 0, r: b }], bevel: 0.8 },
      position: [0, cavityY(stack, cav), 0],
      axis: 'y',
      material: 'structure',
    })
  }
  // Necks and flanges, top and bottom (bottom is the mirror image).
  for (const down of [false, true]) {
    meshes.push(
      latheY([[b, blockTop - 0.1], [R - 1, blockTop - 0.1], [11.2, flangeBottom - 1.2], [11.6, flangeBottom], [b, flangeBottom], [b, blockTop - 0.1]], 'structure', down),
      {
        shape: {
          kind: 'plate',
          outline: { type: 'circle', r: P.flangeOuterDiameter / 2 },
          thickness: P.flangeThickness,
          holes: [{ x: 0, y: 0, r: b }, ...ellipsePoints(20, FLANGE_BOLT_CIRCLE, FLANGE_BOLT_CIRCLE).map(([u, v]) => ({ x: u, y: v, r: FLANGE_HOLE_R }))],
          bevel: 0.35,
        },
        position: [0, (down ? -1 : 1) * (top - P.flangeThickness / 2), 0],
        axis: 'y',
        material: 'structure',
      },
      // Raised face with ring groove (visual only; BX-159 gasket per SRC-PAT).
      latheY([[b, top - 0.01], [10.2, top - 0.01], [10.2, top + 0.25], [8.9, top + 0.25], [8.9, top + 0.05], [8.3, top + 0.05], [8.3, top + 0.25], [b, top + 0.25]], 'moving', down),
    )
  }
  return { meshes, kinematic: 'fixed', explode: [0, 0, 0] }
}

export function outletY(stack: Stack, cavity: CavityId): number {
  return cavityY(stack, cavity) - 7.5
}

/** Studded 4-1/16" outlet on the column: hub, drilled flange and 8 studs with nuts (8 per SRC-PAT). */
export function outletGeometry(stack: Stack, cavity: CavityId, front: boolean): PartGeometry {
  const y = outletY(stack, cavity)
  const dir = front ? 1 : -1
  // Hub starts inside the housing/column so it never floats off the surface.
  const z0 = P.bodyDepth / 2 - 0.5
  const bore = 2.03
  const rot: [number, number, number] = [dir * Math.PI / 2, 0, 0]
  const hub: MeshSpec = {
    shape: { kind: 'lathe', profile: [[bore, 0], [3.4, 0], [3.4, 3.2], [3.0, 3.6], [bore, 3.6], [bore, 0]] },
    position: [0, y, dir * z0],
    axis: 'z',
    material: 'structure',
    rotation: rot,
  }
  const flangeZ = z0 + 3.6 + 0.8
  const flange: MeshSpec = {
    shape: { kind: 'plate', outline: { type: 'circle', r: 5.3 }, thickness: 1.6, holes: [{ x: 0, y: 0, r: bore }, ...ellipsePoints(8, 4.1, 4.1, Math.PI / 8).map(([u, v]) => ({ x: u, y: v, r: 0.62 }))], bevel: 0.2 },
    position: [0, y, dir * flangeZ],
    axis: 'z',
    material: 'structure',
  }
  const studs: MeshSpec[] = ellipsePoints(8, 4.1, 4.1, Math.PI / 8).flatMap(([u, v]) => [
    { shape: { kind: 'cyl', r: 0.5625, len: 3.2, sides: 16 }, position: [u, y + v, dir * (flangeZ + 0.8)] as [number, number, number], axis: 'z' as const, material: 'fastener' as const },
    { shape: { kind: 'hex', across: 1.8, len: 0.9 }, position: [u, y + v, dir * (flangeZ - 1.25)] as [number, number, number], axis: 'z' as const, material: 'fastener' as const },
  ])
  return { meshes: [hub, flange, ...studs], kinematic: 'fixed', explode: [0, 0, dir * 10] }
}

export function flangeStudGeometry(stack: Stack, topFlange: boolean): PartGeometry {
  const { top, flangeBottom } = flangeStations(stack)
  const dir = topFlange ? 1 : -1
  const y0 = flangeBottom - 1.4
  const y1 = top + 3
  const r = P.flangeStudDiameter / 2
  const meshes: MeshSpec[] = ellipsePoints(20, FLANGE_BOLT_CIRCLE, FLANGE_BOLT_CIRCLE).flatMap(([a, b]) => [
    { shape: { kind: 'cyl', r, len: y1 - y0, sides: 16 }, position: [a, dir * ((y0 + y1) / 2), b] as [number, number, number], axis: 'y' as const, material: 'fastener' as const },
    { shape: { kind: 'hex', across: 2.9, len: 1.2 }, position: [a, dir * (flangeBottom - 0.7), b] as [number, number, number], axis: 'y' as const, material: 'fastener' as const },
  ])
  return { meshes, kinematic: 'fixed', explode: [0, dir * 14, 0] }
}

export function portGeometry(stack: Stack, cavity: CavityId, index: 0 | 1): PartGeometry {
  const x = index === 0 ? -15 : 15
  const z = P.bodyDepth / 2
  return {
    meshes: [
      { shape: { kind: 'cyl', r: 1.2, len: 0.6, sides: 32 }, position: [x, cavityY(stack, cavity) + 4, z + 0.3], axis: 'z', material: 'fitting' },
      { shape: { kind: 'hex', across: 1.8, len: 1.1 }, position: [x, cavityY(stack, cavity) + 4, z + 1.1], axis: 'z', material: 'fitting' },
    ],
    kinematic: 'fixed',
    explode: [0, 0, 6],
  }
}
