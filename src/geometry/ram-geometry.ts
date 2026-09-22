// Ram block, packer and seal geometry (tier T3). The pipe cutout radius equals half the documented
// pipe size of the selected ram (catalog p.43), so only that one value is tied to a document.
// Forms follow the catalog sketches: ram with packer across the front and an arched top seal over the
// top (Sd-10825, p.41); shear rams with blade packer and side packers (p.47, p.53).
import type { MeshSpec, RamKind } from '../data/types'
import type { PartGeometry } from './bonnet-geometry'
import { worldX, type BonnetFrame } from './frame'
import { P, S } from './params'

const PACKER_DEPTH = 1.4
const PLATE = 0.35

function block(f: BonnetFrame, s0: number, s1: number, cutoutR: number, chamfer: number, material: MeshSpec['material'], y = 0, height = P.ramHeight, width = P.ramWidth): MeshSpec {
  return {
    shape: { kind: 'ramBlock', depth: s1 - s0, height, width, cutoutR, chamfer },
    position: [worldX(f, (s0 + s1) / 2), f.cavityY + y, 0],
    axis: 'x',
    material,
    flip: f.sign < 0,
  }
}

export function cutoutRadius(kind: RamKind): number {
  return kind.type === 'pipe' ? Number(kind.pipeSize) / 2 : 0
}

export type RamPart = 'body' | 'packer' | 'topSeal' | 'bladePacker' | 'sidePackers'

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

export function ramPartGeometry(kind: RamKind, part: RamPart, f: BonnetFrame, isUpperBlade: boolean): PartGeometry | null {
  const front = S.ramFront
  const cut = cutoutRadius(kind)
  const chamfer = kind.type === 'sbr' ? (isUpperBlade ? 2.5 : -2.5) : 0
  const topY = P.ramHeight / 2
  switch (part) {
    case 'body':
      return {
        meshes: [block(f, front + (kind.type === 'sbr' ? 0 : PACKER_DEPTH), S.ramBack, cut, kind.type === 'sbr' ? chamfer : 0, 'ram')],
        kinematic: 'ram',
        explode: [0, 0, 0],
      }
    case 'packer': {
      if (kind.type === 'sbr') return null
      const rubberH = P.ramHeight - 2 * PLATE
      return {
        meshes: [
          block(f, front, front + PACKER_DEPTH, cut, 0, 'softgood', 0, rubberH),
          block(f, front + 0.05, front + PACKER_DEPTH, cut, 0, 'ram', topY - PLATE / 2, PLATE),
          block(f, front + 0.05, front + PACKER_DEPTH, cut, 0, 'ram', -topY + PLATE / 2, PLATE),
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
    case 'sidePackers':
      if (kind.type !== 'sbr') return null
      return {
        meshes: [1, -1].map((dz) => ({
          shape: { kind: 'box', size: [2.2, P.ramHeight - 1.2, 0.9] } as MeshSpec['shape'],
          position: [worldX(f, front + 1.6 + (dz * chamfer) / 4), f.cavityY, dz * (P.ramWidth / 2 - 0.6)] as [number, number, number],
          axis: 'x' as const,
          material: 'softgood' as const,
        })),
        kinematic: 'ram',
        explode: [-5, 0, 0],
      }
  }
}
