import type { MaterialKey, MeshSpec, Outline, Shape } from '../data/types'
import { P } from './params'

/**
 * Local frame of one bonnet: s = inches outward from the body face along the bonnet axis,
 * y = vertical offset from the cavity centre, z = front(+)/back(-).
 */
export interface BonnetFrame {
  sign: 1 | -1
  cavityY: number
}

export function worldX(f: BonnetFrame, s: number): number {
  return f.sign * (P.bodyHalfWidth + s)
}

export function alongS(f: BonnetFrame, shape: Shape, s0: number, s1: number, y: number, z: number, material: MaterialKey): MeshSpec {
  return { shape, position: [worldX(f, (s0 + s1) / 2), f.cavityY + y, z], axis: 'x', material }
}

export function cylS(f: BonnetFrame, r: number, s0: number, s1: number, y: number, z: number, material: MaterialKey, rInner?: number): MeshSpec {
  return alongS(f, { kind: 'cyl', r, len: Math.abs(s1 - s0), rInner }, s0, s1, y, z, material)
}

export function ringS(f: BonnetFrame, major: number, tube: number, s: number, y = 0, z = 0, material: MaterialKey = 'softgood', scaleY?: number): MeshSpec {
  return { shape: { kind: 'torus', major, tube, scaleY }, position: [worldX(f, s), f.cavityY + y, z], axis: 'x', material }
}

export function boxS(f: BonnetFrame, len: number, h: number, w: number, s0: number, y: number, z: number, material: MaterialKey): MeshSpec {
  return { shape: { kind: 'box', size: [len, h, w] }, position: [worldX(f, s0 + len / 2), f.cavityY + y, z], axis: 'x', material }
}

export function hexS(f: BonnetFrame, across: number, len: number, s0: number, y: number, z: number, material: MaterialKey = 'fastener'): MeshSpec {
  return alongS(f, { kind: 'hex', across, len }, s0, s0 + len, y, z, material)
}

/** Points evenly spaced on an ellipse in the y-z plane. */
export function ellipsePoints(n: number, ry: number, rz: number, phase = 0): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2
    return [Math.sin(a) * ry, Math.cos(a) * rz]
  })
}

/**
 * Turned part along the bonnet axis. Profile = [radius, s] pairs with s measured outward from the body face.
 * The part's native +Y is rotated to point outward on either side, so profiles read the same both sides.
 */
export function latheS(f: BonnetFrame, profile: [number, number][], material: MaterialKey, y = 0, z = 0): MeshSpec {
  return {
    shape: { kind: 'lathe', profile },
    position: [worldX(f, 0), f.cavityY + y, z],
    axis: 'x',
    rotation: [0, 0, f.sign > 0 ? -Math.PI / 2 : Math.PI / 2],
    material,
  }
}

/** Plate normal to the bonnet axis, from s0 outward; outline u = front/back (z), v = vertical (y). */
export function plateS(
  f: BonnetFrame,
  outline: Outline,
  s0: number,
  thickness: number,
  material: MaterialKey,
  holes: { x: number; y: number; r: number }[] = [],
  y = 0,
  bevel = 0.3,
): MeshSpec {
  return { shape: { kind: 'plate', outline, thickness, holes, bevel }, position: [worldX(f, s0 + thickness / 2), f.cavityY + y, 0], axis: 'x', material }
}

/** Machined rod with chamfered ends along the bonnet axis. */
export function rodS(f: BonnetFrame, r: number, s0: number, s1: number, material: MaterialKey, y = 0, z = 0): MeshSpec {
  const c = Math.min(r * 0.25, 0.2)
  return latheS(f, [[0, s0], [r - c, s0], [r, s0 + c], [r, s1 - c], [r - c, s1], [0, s1]], material, y, z)
}

/** Threaded section: a saw-tooth profile reads as thread at viewing distance. */
export function threadS(f: BonnetFrame, r: number, s0: number, s1: number, pitch: number, material: MaterialKey, y = 0, z = 0): MeshSpec {
  const pts: [number, number][] = [[0, s0], [r * 0.86, s0]]
  for (let s = s0; s + pitch <= s1; s += pitch) {
    pts.push([r, s + pitch * 0.5], [r * 0.86, s + pitch])
  }
  pts.push([0, pts[pts.length - 1][1]])
  return latheS(f, pts, material, y, z)
}

/** Hex head with a washer face, pointing outward (along +s). */
export function hexHeadS(f: BonnetFrame, across: number, s0: number, len: number, y: number, z: number, material: MaterialKey = 'fastener'): MeshSpec[] {
  return [
    cylS(f, across * 0.55, s0, s0 + len * 0.18, y, z, material),
    alongS(f, { kind: 'hex', across, len: len * 0.82 }, s0 + len * 0.18, s0 + len, y, z, material),
  ]
}
