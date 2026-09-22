import { describe, expect, it } from 'vitest'
import { buildBop } from '../src/data/build-bop'
import { catalogItem, OPERATING_DATA, pipeRamRow, PIPE_RAM_TOP_SEAL, SBR, SELECTABLE_PIPE_SIZES } from '../src/data/catalog'
import { DEFAULT_CONFIG } from '../src/data/config'
import { checkAll } from '../src/data/integrity'
import { searchComponents } from '../src/data/search'
import { BONNET_TRAVEL, P, S } from '../src/geometry/params'

describe('dataset integrity', () => {
  it('passes every integrity rule for every configuration', () => {
    expect(checkAll()).toEqual([])
  })

  it('has 4 bonnet assemblies on a double and 2 on a single', () => {
    const count = (ds: ReturnType<typeof buildBop>) => ds.assemblies.filter((a) => /^bonnet-(upper|lower)-[LR]$/.test(a.id)).length
    expect(count(buildBop(DEFAULT_CONFIG))).toBe(4)
    expect(count(buildBop({ ...DEFAULT_CONFIG, stack: 'single' }))).toBe(2)
  })

  it('creates every catalog bonnet item (2-43 except 4 and 38 on lower bonnets) in each bonnet', () => {
    const ds = buildBop(DEFAULT_CONFIG)
    for (const prefix of ['upper-L', 'upper-R', 'lower-L', 'lower-R']) {
      for (let item = 2; item <= 43; item += 1) {
        if (item === 4 || (item === 38 && prefix.startsWith('lower'))) continue
        expect(ds.byId.has(`${prefix}/i${String(item).padStart(2, '0')}`), `${prefix} item ${item}`).toBe(true)
      }
    }
  })

  it('invents no geometry for items the drawing does not show', () => {
    const ds = buildBop(DEFAULT_CONFIG)
    expect(ds.byId.get('upper-L/i39')?.geometry.meshes).toHaveLength(0)
    expect(ds.byId.get('upper-L/i43')?.geometry.meshes).toHaveLength(0)
  })

  it('leaves the body part number empty because the catalog prints none', () => {
    expect(buildBop(DEFAULT_CONFIG).byId.get('body')?.partNumber).toBeNull()
    expect(catalogItem(1).partNumber10k).toBeNull()
  })

  it('flags printed anomalies with confidence B', () => {
    const ds = buildBop(DEFAULT_CONFIG)
    for (const item of [12, 13, 39]) expect(ds.byId.get(`upper-L/i${item}`)?.partNumber?.confidence).toBe('B')
    expect(ds.byId.get('upper-L/i05')?.partNumber?.confidence).toBe('A')
  })
})

describe('catalog extraction', () => {
  it('reads the documented 13-5/8" values from p.12, p.7 and p.43', () => {
    expect(catalogItem(5).partNumber10k).toBe('2245074-01-01')
    expect(catalogItem(22).partNumber10k).toBe('644197-03-00-01')
    expect(OPERATING_DATA).toEqual({ galsToOpen: '5.5', galsToClose: '5.8', lockingScrewTurns: '32', closingRatio: '7.0:1', openingRatio: '2.3:1' })
    expect(pipeRamRow('5.000')).toEqual({ size: '5.000', assembly: '644225-14-00-01', ram: '644738-03-00-01', packer: '644224-14-00-01' })
    expect(PIPE_RAM_TOP_SEAL).toBe('644223-01-00-01')
    expect(SBR.upper.body).toBe('046749-01-00-01')
    expect(SELECTABLE_PIPE_SIZES).toContain('5.000')
  })
})

describe('geometry envelope', () => {
  it('matches the T2 closed length (114.125 in) exactly', () => {
    expect(2 * (P.bodyHalfWidth + S.screwEnd)).toBeCloseTo(114.125, 6)
  })

  it('matches the T2 open length (172.75 in) exactly', () => {
    expect(2 * (P.bodyHalfWidth + BONNET_TRAVEL + S.screwEnd + P.lockTravel)).toBeCloseTo(172.75, 6)
    expect(BONNET_TRAVEL).toBeGreaterThan(0)
  })

  it('opens rams clear of the documented bore', () => {
    expect(P.bodyHalfWidth + S.ramFront + P.ramStroke).toBeGreaterThan(P.boreDiameter / 2)
  })
})

describe('search', () => {
  const ds = buildBop(DEFAULT_CONFIG)
  it('finds the operating piston by name', () => {
    expect(searchComponents(ds, 'operating piston')[0].component.catalogItem).toBe(5)
  })
  it('finds a part by part number', () => {
    expect(searchComponents(ds, '644197-03-00-01')[0].component.catalogItem).toBe(22)
  })
  it('finds a part by catalog item', () => {
    expect(searchComponents(ds, 'item 22')[0].component.name).toBe('Seal, Bonnet')
  })
  it('respects location words', () => {
    expect(searchComponents(ds, 'lower right bonnet')[0].component.id).toBe('lower-R/i03')
  })
})
