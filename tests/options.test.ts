import { describe, expect, it } from 'vitest'
import { runLocalAssistant } from '../src/assistant/local-engine'
import { buildBop } from '../src/data/build-bop'
import { FLEXPACKER_NR_ROWS, FLEXPACKER_TOP_SEAL, ISR, LB_OPERATING_DATA, LB_SHEAR_ASSEMBLIES, lbShearItem, TANDEM_BOOSTER_ITEMS, TANDEM_BOOSTER_REPAIR_KIT, VBR_ROWS } from '../src/data/catalog'
import { DEFAULT_CONFIG } from '../src/data/config'
import { decodeBonnetType, decodeRamKind, encodeBonnetType, encodeRamKind } from '../src/data/config-codec'
import { ALL_RAM_KINDS, BONNET_TYPES } from '../src/data/integrity'
import type { BopConfig } from '../src/data/types'

const withRams = (upper: BopConfig['rams']['upper'], bonnets: BopConfig['bonnets'] = DEFAULT_CONFIG.bonnets): BopConfig => ({ ...DEFAULT_CONFIG, rams: { ...DEFAULT_CONFIG.rams, upper }, bonnets })

describe('extracted option tables', () => {
  it('reads the ISR upper and lower rams from p.52', () => {
    expect(ISR.upper.subassembly).toBe('2164775-03')
    expect(ISR.lower).toEqual({ subassembly: '2164776-03', body: '2164774-01', sidePackers: ['2010985-01', '2010985-02'], topSeal: '645033-01-00-01', bladeSeals: null })
    expect(ISR.upper.bladeSeals).toEqual(['2010986-01', '2010986-02'])
  })

  it('reads the four 13-5/8" VBR-II ranges and the high-temperature VBR-II from p.54', () => {
    expect(VBR_ROWS.map((r) => r.range)).toEqual(['7" to 4-1/2"', '5-7/8" to 3-1/2"', '5-1/2" to 3-1/2"', '5" to 2-7/8"', '5-7/8" to 3-1/2"'])
    expect(VBR_ROWS.filter((r) => r.highTemp).map((r) => r.packer)).toEqual(['2164765-01'])
    expect(new Set(VBR_ROWS.map((r) => r.id)).size).toBe(VBR_ROWS.length)
  })

  it('reads FLEXPACKER-NR packers and the one printed top seal from p.55', () => {
    expect(FLEXPACKER_NR_ROWS.map((r) => r.packer)).toEqual(['2011716-01', '2011673-01', '2011688-01'])
    expect(FLEXPACKER_TOP_SEAL).toEqual({ packer: '2011716-01', topSeal: '644223-01-00-01' })
  })

  it('reads the large-bore shear bonnet and its operating data (p.18, p.7)', () => {
    expect(lbShearItem('5A').partNumber).toBe('2245074-02-01')
    expect(LB_SHEAR_ASSEMBLIES).toEqual({ right: '614498-01-70-01', left: '614498-02-70-01' })
    expect(LB_OPERATING_DATA).toEqual({ galsToOpen: '10.5', galsToClose: '10.9', lockingScrewTurns: '32', closingRatio: '10.8:1', openingRatio: '4.5:1' })
  })

  it('reads the composite tandem booster list from p.21', () => {
    expect(TANDEM_BOOSTER_ITEMS).toHaveLength(26)
    expect(TANDEM_BOOSTER_ITEMS.find((i) => i.item === 22)?.partNumber).toBeNull()
    expect(TANDEM_BOOSTER_REPAIR_KIT).toBe('2164148-02')
  })
})

describe('datasets for the new options', () => {
  it('builds ISR rams with a V front, side packers, top seals and blade seals on the upper ram only', () => {
    const ds = buildBop(withRams({ type: 'isr' }))
    const body = ds.byId.get('upper-L/ram-body')!
    expect(body.partNumber?.value).toBe(ISR.upper.body)
    expect(body.geometry.meshes[0].shape).toMatchObject({ kind: 'ramBlock', vee: 3 })
    expect(ds.byId.get('upper-R/ram-body')!.geometry.meshes[0].shape).toMatchObject({ vee: -3 })
    expect(ds.byId.has('upper-L/ram-bladeSeals')).toBe(true)
    expect(ds.byId.has('upper-R/ram-bladeSeals')).toBe(false)
    expect(ds.byId.has('upper-L/ram-packer')).toBe(false)
  })

  it('builds a VBR-II ram with steel inserts and a cutout for the largest pipe of the range', () => {
    const row = VBR_ROWS[0]
    const ds = buildBop(withRams({ type: 'vbr', id: row.id }))
    const packer = ds.byId.get('upper-L/ram-packer')!
    expect(packer.partNumber?.value).toBe(row.packer)
    expect(packer.geometry.meshes.length).toBeGreaterThan(3)
    expect(packer.geometry.meshes[0].shape).toMatchObject({ cutoutR: row.max / 2 })
    expect(packer.documentedDimensions[0].claim.value).toBe(row.range)
  })

  it('marks the FLEXPACKER-NR top seal as inferred except for the printed row, and gives the body no part number', () => {
    const [printed, other] = FLEXPACKER_NR_ROWS
    const a = buildBop(withRams({ type: 'flexpacker', id: printed.id }))
    const b = buildBop(withRams({ type: 'flexpacker', id: other.id }))
    expect(a.byId.get('upper-L/ram-topSeal')!.partNumber?.confidence).toBe('A')
    expect(b.byId.get('upper-L/ram-topSeal')!.partNumber?.confidence).toBe('D')
    expect(b.byId.get('upper-L/ram-body')!.partNumber).toBeNull()
  })

  it('swaps in the large-bore shear parts and adds item 24A', () => {
    const ds = buildBop({ ...DEFAULT_CONFIG, bonnets: { upper: 'standard', lower: 'largeBoreShear' } })
    const piston = ds.byId.get('lower-L/i05')!
    expect(piston.itemLabel).toBe('5A')
    expect(piston.partNumber?.value).toBe('2245074-02-01')
    expect(piston.documentedDimensions.find((d) => d.label.startsWith('Closing ratio'))?.claim.value).toBe('10.8:1')
    expect(ds.byId.get('lower-R/i24a')?.partNumber?.value).toBe('702645-45-81')
    expect(ds.byId.get('upper-L/i05')!.partNumber?.value).toBe('2245074-01-01')
    expect(ds.byId.get('lower-L/i20')!.kits[0].value).toContain('644860-07')
  })

  it('adds tandem boosters and moves the lock outward', () => {
    const plain = buildBop(DEFAULT_CONFIG)
    const ds = buildBop({ ...DEFAULT_CONFIG, bonnets: { upper: 'tandemBooster', lower: 'standard' } })
    expect(ds.byId.get('upper-L/tb03')?.partNumber?.value).toBe('2010884-01')
    expect(ds.byId.has('upper-L/tb19')).toBe(true)
    expect(ds.byId.has('upper-R/tb19')).toBe(false)
    const x = (d: typeof ds, id: string) => d.byId.get(id)!.geometry.meshes[0].position[0]
    expect(Math.abs(x(ds, 'upper-R/i07'))).toBeGreaterThan(Math.abs(x(plain, 'upper-R/i07')) + 10)
    expect(ds.connections.some((k) => k.from === 'upper-L/i07' && k.to === 'upper-L/tb01')).toBe(true)
    expect(ds.connections.some((k) => k.from === 'upper-L/i08' && k.to === 'upper-L/i05')).toBe(false)
  })
})

describe('config codes', () => {
  it('round-trips every ram kind and bonnet type', () => {
    for (const k of ALL_RAM_KINDS) expect(decodeRamKind(encodeRamKind(k))).toEqual(k)
    for (const b of BONNET_TYPES) expect(decodeBonnetType(encodeBonnetType(b))).toBe(b)
  })
  it('rejects codes the catalog does not document', () => {
    for (const bad of ['pipe_8.000', 'vbr_v1-2', 'flex_', 'laser', 'pipe_', '']) expect(decodeRamKind(bad)).toBeNull()
    expect(decodeBonnetType('xx')).toBeNull()
  })
})

describe('assistant setup commands for the new options', () => {
  const ds = buildBop(DEFAULT_CONFIG)
  const cfg = (text: string) => {
    const c = runLocalAssistant(ds, text).commands.find((x) => x.type === 'setConfig')
    return c && c.type === 'setConfig' ? c.config : null
  }

  it('changes ram types', () => {
    expect(cfg('lower rams ISR')?.rams.lower).toEqual({ type: 'isr' })
    expect(cfg('upper rams VBR 5 inch')?.rams.upper).toEqual({ type: 'vbr', id: VBR_ROWS.find((r) => !r.highTemp && r.min <= 5 && r.max >= 5)!.id })
    expect(cfg('upper rams vbr high temp')?.rams.upper).toEqual({ type: 'vbr', id: VBR_ROWS.find((r) => r.highTemp)!.id })
    expect(cfg('upper rams flexpacker 4 inch')?.rams.upper).toEqual({ type: 'flexpacker', id: FLEXPACKER_NR_ROWS[1].id })
    expect(runLocalAssistant(ds, 'upper rams flexpacker 9 inch').text).toContain('No variable-bore range')
  })

  it('changes bonnet types, defaulting to the cavity with shear rams', () => {
    expect(cfg('large bore shear bonnets')?.bonnets).toEqual({ upper: 'standard', lower: 'largeBoreShear' })
    expect(cfg('add tandem boosters to the upper cavity')?.bonnets).toEqual({ upper: 'tandemBooster', lower: 'standard' })
    expect(cfg('standard bonnets')?.bonnets.lower).toBe('standard')
  })

  it('does not change the setup when only asking about a part', () => {
    expect(cfg('show the tandem booster')).toBeNull()
    expect(cfg('what is the large bore shear bonnet')).toBeNull()
  })
})
