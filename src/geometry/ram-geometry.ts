// Ram block, packer and seal geometry (tier T3). The pipe cutout radius equals half the documented
// pipe size of the selected ram (catalog p.43), or half the largest pipe of a variable-bore range (p.54, p.55),
// so only that one value is tied to a document.
// Forms follow the catalog sketches: ram with packer across the front and an arched top seal over the
// top (Sd-10825, p.41); shear rams with blade packer and side packers (p.47, p.53); variable-bore packers with
// inserts around the bore as pictured on p.54 and p.55 (their material is not stated); the ISR with a "V" front (p.52).
import { flexpackerRow, vbrRow } from '../data/catalog'
import type { MeshSpec, RamKind } from '../data/types'
import type { PartGeometry } from './bonnet-geometry'
import { worldX, type BonnetFrame } from './frame'
import { P, S } from './params'

const PACKER_DEPTH = 1.4
const PLATE = 0.35
/** Depth of the ISR "V" (inches from apex to flank end); approximation. */
const ISR_VEE = 3
const INSERTS = 7

function block(f: BonnetFrame, s0: number, s1: number, cutoutR: number, chamfer: number, material: MeshSpec['material'], y = 0, height = P.ramHeight, width = P.ramWidth, vee = 0): MeshSpec {
  return {
    shape: { kind: 'ramBlock', depth: s1 - s0, height, width, cutoutR, chamfer, ...(vee ? { vee } : {}) },
    position: [worldX(f, (s0 + s1) / 2), f.cavityY + y, 0],
    axis: 'x',
    material,
    flip: f.sign < 0,
  }
}

export function cutoutRadius(kind: RamKind): number {
  switch (kind.type) {
    case 'pipe':
      return Number(kind.pipeSize) / 2
    case 'vbr':
      return vbrRow(kind.id).max / 2
    case 'flexpacker':
      return flexpackerRow(kind.id).max / 2
    default:
      return 0
  }
}

const isShear = (kind: RamKind) => kind.type === 'sbr' || kind.type === 'isr'
const isVariable = (kind: RamKind) => kind.type === 'vbr' || kind.type === 'flexpacker'

export type RamPart = 'body' | 'packer' | 'topSeal' | 'bladePacker' | 'sidePackers' | 'bladeSeals'

/** Arched top seal lying on the ram top, bulging away from the bore. */
function topSealArc(f: BonnetFrame, front: number): MeshSpec {
  const R = P.ramWidth / 2 - 0.9
  return {
    shape: { kind: 'torus', major: R, tube: 0.32, arc: Math.PI },
    position: [worldX(f, front + 1.6), f.cavityY + P.ramHeight / 2 + 0.05, 0],
    axis: 'y',
    material: 'softgood',
    rotation: [Math.PI / 2, 0, f.sign > 0 ? -Math.PI / 2 : Math.PI / 2],
  }
}

/** Inserts of a variable-bore packer (pictured on p.54), fanned around the bore inside the top and bottom plates. */
function packerInserts(f: BonnetFrame, front: number, cut: number): MeshSpec[] {
  const R = cut + 0.55
  const y = P.ramHeight / 2 - PLATE - 0.2
  const out: MeshSpec[] = []
  for (let i = 0; i < INSERTS; i++) {
    const t = -1.2 + (2.4 * i) / (INSERTS - 1)
    const x = Math.cos(t) * R
    const z = Math.sin(t) * R
    for (const dy of [y, -y]) {
      out.push({
        shape: { kind: 'box', size: [1.0, 0.32, 0.75] },
        position: [worldX(f, front + x), f.cavityY + dy, z],
        axis: 'x',
        material: 'ram',
        rotation: [0, Math.atan2(-z, f.sign * x), 0],
      })
    }
  }
  return out
}

/** ISR "V" front: the upper ram is convex (vee > 0), the lower ram concave, so the two interlock. */
function isrVee(isUpperBlade: boolean): number {
  return isUpperBlade ? ISR_VEE : -ISR_VEE
}

export function ramPartGeometry(kind: RamKind, part: RamPart, f: BonnetFrame, isUpperBlade: boolean): PartGeometry | null {
  const front = S.ramFront
  const cut = cutoutRadius(kind)
  const chamfer = kind.type === 'sbr' ? (isUpperBlade ? 2.5 : -2.5) : 0
  const vee = kind.type === 'isr' ? isrVee(isUpperBlade) : 0
  const topY = P.ramHeight / 2
  switch (part) {
    case 'body':
      return {
        meshes: [block(f, front + (isShear(kind) ? 0 : PACKER_DEPTH), S.ramBack, cut, chamfer, 'ram', 0, P.ramHeight, P.ramWidth, vee)],
        kinematic: 'ram',
        explode: [0, 0, 0],
      }
    case 'packer': {
      if (isShear(kind)) return null
      const rubberH = P.ramHeight - 2 * PLATE
      return {
        meshes: [
          block(f, front, front + PACKER_DEPTH, cut, 0, 'softgood', 0, rubberH),
          block(f, front + 0.05, front + PACKER_DEPTH, cut, 0, 'ram', topY - PLATE / 2, PLATE),
          block(f, front + 0.05, front + PACKER_DEPTH, cut, 0, 'ram', -topY + PLATE / 2, PLATE),
          ...(isVariable(kind) ? packerInserts(f, front, cut) : []),
        ],
        kinematic: 'ram',
        explode: [-6, 0, 0],
      }
    }
    case 'topSeal':
      return { meshes: [topSealArc(f, front)], kinematic: 'ram', explode: [0, 8, 0] }
    case 'bladePacker':
      if (kind.type !== 'sbr' || !isUpperBlade) return null
      return {
        meshes: [{ shape: { kind: 'box', size: [2.6, 0.7, P.ramWidth - 3] }, position: [worldX(f, front + 2.2), f.cavityY + topY - 1.2, 0], axis: 'x', material: 'softgood' }],
        kinematic: 'ram',
        explode: [-4, 6, 0],
      }
    case 'sidePackers': {
      if (!isShear(kind)) return null
      const edge = P.ramWidth / 2 - 0.6
      return {
        meshes: [1, -1].map((dz) => ({
          shape: { kind: 'box', size: [2.2, P.ramHeight - 1.2, 0.9] } as MeshSpec['shape'],
          position: [worldX(f, front + 1.6 + (kind.type === 'isr' ? vee / 2 : (dz * chamfer) / 4)), f.cavityY, dz * edge] as [number, number, number],
          axis: 'x' as const,
          material: 'softgood' as const,
        })),
        kinematic: 'ram',
        explode: [-5, 0, 0],
      }
    }
    case 'bladeSeals': {
      if (kind.type !== 'isr' || !isUpperBlade) return null
      // One seal strip along each flank of the "V", near the top of the blade.
      const hw = P.ramWidth / 2 - 0.3
      const len = Math.hypot(ISR_VEE, hw) - 1
      return {
        meshes: [1, -1].map((dz) => ({
          shape: { kind: 'box', size: [0.45, 0.5, len] } as MeshSpec['shape'],
          position: [worldX(f, front + 0.35), f.cavityY + topY - 0.9, (dz * hw) / 2] as [number, number, number],
          axis: 'x' as const,
          material: 'softgood' as const,
          rotation: [0, Math.atan2(dz * f.sign * ISR_VEE, hw), 0] as [number, number, number],
        })),
        kinematic: 'ram',
        explode: [-4, 5, 0],
      }
    }
  }
}
