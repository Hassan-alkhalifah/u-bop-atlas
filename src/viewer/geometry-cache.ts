import * as THREE from 'three'
import type { MeshSpec, Outline, Shape } from '../data/types'

const cache = new Map<string, THREE.BufferGeometry>()

/** Hollow cylinder along +Y built by lathing a rectangle profile. */
function tube(r: number, rInner: number, len: number, sides: number): THREE.BufferGeometry {
  const h = len / 2
  const profile = [new THREE.Vector2(rInner, -h), new THREE.Vector2(r, -h), new THREE.Vector2(r, h), new THREE.Vector2(rInner, h), new THREE.Vector2(rInner, -h)]
  return new THREE.LatheGeometry(profile, sides)
}

function outlineShape(o: Outline, inset: number): THREE.Shape {
  const s = new THREE.Shape()
  if (o.type === 'circle') {
    s.absarc(0, 0, o.r - inset, 0, Math.PI * 2, false)
    return s
  }
  const w = o.w / 2 - inset
  const h = o.h / 2 - inset
  if (o.type === 'octagon') {
    const c = Math.min(o.chamfer, w, h)
    s.moveTo(-w + c, -h)
    s.lineTo(w - c, -h)
    s.lineTo(w, -h + c)
    s.lineTo(w, h - c)
    s.lineTo(w - c, h)
    s.lineTo(-w + c, h)
    s.lineTo(-w, h - c)
    s.lineTo(-w, -h + c)
    s.closePath()
    return s
  }
  const r = Math.max(0.01, Math.min(o.r - inset, w, h))
  s.moveTo(-w + r, -h)
  s.lineTo(w - r, -h)
  s.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false)
  s.lineTo(w, h - r)
  s.absarc(w - r, h - r, r, 0, Math.PI / 2, false)
  s.lineTo(-w + r, h)
  s.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-w, -h + r)
  s.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

/** Plate in its own frame: outline in XY, thickness along Z, centred; edges bevelled so highlights catch them. */
function plate(shape: Extract<Shape, { kind: 'plate' }>): THREE.BufferGeometry {
  const bevel = Math.min(shape.bevel ?? 0.25, shape.thickness / 3)
  const s = outlineShape(shape.outline, bevel)
  for (const hole of shape.holes ?? []) {
    const p = new THREE.Path()
    p.absarc(hole.x, hole.y, hole.r + bevel, 0, Math.PI * 2, true)
    s.holes.push(p)
  }
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.01, shape.thickness - 2 * bevel),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 28,
  })
  g.translate(0, 0, -(shape.thickness - 2 * bevel) / 2)
  return g
}

function extrudeVertical(shape: THREE.Shape, height: number, bevel: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 40,
  })
  g.rotateX(Math.PI / 2)
  g.translate(0, height / 2 - bevel, 0)
  return g
}

/**
 * Ram block in its own frame: front face toward -X (the bore), width along Z, height along Y.
 * A pipe ram has a half-round cutout in the front face; a shear ram has a slanted front.
 */
function ramBlock(depth: number, height: number, width: number, cutoutR: number, chamfer: number): THREE.BufferGeometry {
  const bevel = 0.3
  const x0 = -depth / 2 + bevel
  const x1 = depth / 2 - bevel
  const hw = width / 2 - bevel
  const s = new THREE.Shape()
  const frontAt = (z: number) => x0 + (chamfer > 0 ? chamfer * ((hw - z) / (2 * hw)) : chamfer < 0 ? -chamfer * ((z + hw) / (2 * hw)) : 0)
  s.moveTo(frontAt(-hw), -hw)
  s.lineTo(x1 - 1.2, -hw)
  s.quadraticCurveTo(x1, -hw, x1, -hw + 1.2)
  s.lineTo(x1, hw - 1.2)
  s.quadraticCurveTo(x1, hw, x1 - 1.2, hw)
  s.lineTo(frontAt(hw), hw)
  const r = cutoutR > 0 ? cutoutR + bevel : 0
  if (r > 0 && r < hw) {
    s.lineTo(x0, r)
    s.absarc(x0, 0, r, Math.PI / 2, -Math.PI / 2, true)
    s.lineTo(x0, -hw)
  }
  s.closePath()
  return extrudeVertical(s, height, bevel)
}

function build(shape: Shape): THREE.BufferGeometry {
  switch (shape.kind) {
    case 'box':
      return new THREE.BoxGeometry(...shape.size)
    case 'cyl':
      return shape.rInner ? tube(shape.r, shape.rInner, shape.len, shape.sides ?? 48) : new THREE.CylinderGeometry(shape.r, shape.r, shape.len, shape.sides ?? 40)
    case 'torus': {
      const g = new THREE.TorusGeometry(shape.major, shape.tube, 12, 64, shape.arc ?? Math.PI * 2)
      if (shape.scaleY) g.scale(1, shape.scaleY, 1)
      return g
    }
    case 'hex': {
      const g = new THREE.CylinderGeometry(shape.across / Math.sqrt(3), shape.across / Math.sqrt(3), shape.len, 6)
      g.rotateY(Math.PI / 6)
      return g
    }
    case 'lathe':
      return new THREE.LatheGeometry(
        shape.profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)),
        shape.segments ?? 56,
      )
    case 'plate':
      return plate(shape)
    case 'ramBlock':
      return ramBlock(shape.depth, shape.height, shape.width, shape.cutoutR, shape.chamfer)
  }
}

export function geometryFor(shape: Shape): THREE.BufferGeometry {
  const key = JSON.stringify(shape)
  let g = cache.get(key)
  if (!g) {
    g = build(shape)
    g.computeVertexNormals()
    cache.set(key, g)
  }
  return g
}

/**
 * Euler rotation that maps each primitive's native axis onto the spec axis.
 * Cylinders, hex and lathe parts are native +Y; tori lie in XY (axis +Z); plates are extruded along +Z
 * with outline u/v mapped to (z, y) for axis x, (x, z) for axis y and (x, y) for axis z.
 */
export function rotationFor(spec: MeshSpec): [number, number, number] {
  const k = spec.shape.kind
  const flipY = spec.flip ? Math.PI : 0
  if (k === 'box' || k === 'ramBlock') return [0, flipY, 0]
  if (k === 'torus' || k === 'plate') {
    if (spec.axis === 'x') return [0, -Math.PI / 2, 0]
    if (spec.axis === 'y') return [Math.PI / 2, 0, 0]
    return [0, 0, 0]
  }
  if (spec.axis === 'x') return [0, 0, Math.PI / 2]
  if (spec.axis === 'z') return [Math.PI / 2, 0, 0]
  return [0, 0, 0]
}
