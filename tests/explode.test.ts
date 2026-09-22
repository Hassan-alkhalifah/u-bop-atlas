import { describe, expect, it } from 'vitest'
import { P } from '../src/geometry/params'
import { initialState } from '../src/state/store'
import { componentOffset, explodeStages } from '../src/viewer/kinematics'

function withExplode(explode: number, assemblyExplode: Record<string, number> = {}) {
  return { ...initialState(), explode, assemblyExplode }
}

/** Innermost |x| reached by any mesh of the component, including its offset. */
function innerX(id: string, s: ReturnType<typeof withExplode>): number {
  const c = s.dataset.byId.get(id)!
  const [ox] = componentOffset(c, s)
  return Math.min(...c.geometry.meshes.map((m) => Math.abs(m.position[0] + ox)))
}

describe('organized explode', () => {
  it('leaves everything in place at zero', () => {
    const s = withExplode(0)
    for (const c of s.dataset.components) for (const v of componentOffset(c, s)) expect(Math.abs(v)).toBe(0)
  })

  it('brings every ram part out of the body at full explode', () => {
    const s = withExplode(1)
    const ramParts = s.dataset.components.filter((c) => c.id.includes('/ram-'))
    expect(ramParts.length).toBeGreaterThan(0)
    for (const c of ramParts) expect(innerX(c.id, s), c.id).toBeGreaterThan(P.bodyHalfWidth)
  })

  it('finishes the drawer stage before spreading parts', () => {
    expect(explodeStages(0.4)).toEqual({ drawer: 1, spread: 0 })
    expect(explodeStages(1)).toEqual({ drawer: 1, spread: 1 })
  })

  it('takes the ram out when only its bonnet assembly is exploded', () => {
    const s = withExplode(0, { 'bonnet-upper-L': 1 })
    expect(innerX('upper-L/ram-body', s)).toBeGreaterThan(P.bodyHalfWidth)
    expect(innerX('upper-R/ram-body', s)).toBeLessThan(P.bodyHalfWidth)
  })

  it('orders the main chain outward along the axis', () => {
    const s = withExplode(1)
    const x = (id: string) => componentOffset(s.dataset.byId.get(id)!, s)[0]
    const chain = ['upper-R/ram-body', 'upper-R/i03', 'upper-R/i02', 'upper-R/i06', 'upper-R/i07', 'upper-R/i08'].map(x)
    expect([...chain].sort((a, b) => a - b)).toEqual(chain)
  })
})
