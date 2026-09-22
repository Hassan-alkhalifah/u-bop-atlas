import type { ComponentInstance } from '../data/types'
import { OPERATING_DATA } from '../data/catalog'
import { CAVITY_SPREAD, DRAWER_TRAVEL, FLOOR_DROP, STAGE_ONE_END } from '../geometry/explode-layout'
import { BONNET_TRAVEL, P } from '../geometry/params'
import type { ViewerState } from '../state/store'

const BOLT_BACKOUT = 12
const LOCK_TURNS = Number(OPERATING_DATA.lockingScrewTurns) || 0

/** Outward travel (inches along the bonnet axis) for a component in the current kinematic state. */
export function outwardTravel(c: ComponentInstance, s: ViewerState): number {
  if (!c.cavity || c.geometry.kinematic === 'fixed') return 0
  const k = s.kinematics[c.cavity]
  const bonnet = k.bonnet * BONNET_TRAVEL
  switch (c.geometry.kinematic) {
    case 'bonnet':
      return bonnet
    case 'ram':
      return bonnet + (1 - k.ram) * P.ramStroke
    case 'lock':
      return bonnet + (1 - k.lock) * P.lockTravel
    case 'bolt':
      return bonnet + k.bolts * BOLT_BACKOUT
  }
}

/** Spin angle of the locking screw: 32 documented turns (p.7) over the full lock travel. */
export function lockSpin(c: ComponentInstance, s: ViewerState): number {
  if (!c.cavity || !c.geometry.spin) return 0
  return (1 - s.kinematics[c.cavity].lock) * LOCK_TURNS * Math.PI * 2 * (c.side === 'L' ? -1 : 1)
}

export function explodeFactor(c: ComponentInstance, s: ViewerState): number {
  let f = s.explode
  let asmId: string | null = c.assemblyId
  while (asmId) {
    f = Math.max(f, s.assemblyExplode[asmId] ?? 0)
    asmId = s.dataset.assemblies.find((a) => a.id === asmId)?.parentId ?? null
  }
  // The bonnet carries its ram, so exploding a bonnet assembly also brings the ram out (and vice versa).
  if (c.cavity && c.side) {
    const pair = `${c.cavity}-${c.side}`
    f = Math.max(f, s.assemblyExplode[`bonnet-${pair}`] ?? 0, s.assemblyExplode[`ram-${pair}`] ?? 0)
  }
  return f
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (x: number) => x * x * (3 - 2 * x)

/** Stage 1 (drawer) and stage 2 (spread) progress for an explode factor; see explode-layout.ts. */
export function explodeStages(e: number): { drawer: number; spread: number } {
  return { drawer: smooth(clamp01(e / STAGE_ONE_END)), spread: smooth(clamp01((e - STAGE_ONE_END) / (1 - STAGE_ONE_END))) }
}

export function componentOffset(c: ComponentInstance, s: ViewerState): [number, number, number] {
  const sign = c.side === 'L' ? -1 : 1
  const e = explodeFactor(c, s)
  const [ex, ey, ez] = c.geometry.explode
  if (!c.side) {
    // Body-level parts (flange studs, outlets, ports) have no drawer stage.
    const p = smooth(clamp01(e))
    return [ex * p, ey * p, ez * p]
  }
  const { drawer, spread } = explodeStages(e)
  const apart = s.dataset.config.stack === 'double' ? (c.cavity === 'upper' ? 1 : -1) * CAVITY_SPREAD * spread : 0
  return [sign * (outwardTravel(c, s) + DRAWER_TRAVEL * drawer) + ex * spread, ey * spread + apart, ez * spread]
}

/** How far to drop the floor so exploded rows under the lower bonnets stay above it. */
export function floorDrop(s: ViewerState): number {
  const e = Math.max(s.explode, ...Object.values(s.assemblyExplode))
  return FLOOR_DROP * explodeStages(e).spread
}

export function componentCenter(c: ComponentInstance, s: ViewerState): [number, number, number] {
  const m = c.geometry.meshes
  if (!m.length) return [0, 0, 0]
  const o = componentOffset(c, s)
  const avg = m.reduce((acc, spec) => [acc[0] + spec.position[0], acc[1] + spec.position[1], acc[2] + spec.position[2]], [0, 0, 0])
  return [avg[0] / m.length + o[0], avg[1] / m.length + o[1], avg[2] / m.length + o[2]]
}
