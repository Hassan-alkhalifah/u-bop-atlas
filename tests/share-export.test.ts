import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/data/config'
import { NOT_AVAILABLE } from '../src/data/sources'
import type { BopConfig } from '../src/data/types'
import { bomRows, partRows, scopeIds, sourcesUsed } from '../src/export/parts-list'
import { partsWorkbook } from '../src/export/xlsx'
import { dispatch } from '../src/state/commands'
import { applySharedView, buildShareParams, parseShareParams, shareUrl } from '../src/state/share'
import { initialState, useViewer } from '../src/state/store'

const CONFIG: BopConfig = { stack: 'double', rams: { upper: { type: 'isr' }, lower: { type: 'vbr', id: 'v4.5-7' } }, bonnets: { upper: 'largeBoreShear', lower: 'tandemBooster' } }

function reset(config: BopConfig = DEFAULT_CONFIG) {
  useViewer.setState(initialState(config))
}

describe('share links', () => {
  it('round-trips setup, selection, explode, visibility, paint and camera', () => {
    reset(CONFIG)
    dispatch({ type: 'selectComponent', id: 'lower-L/tb03' })
    dispatch({ type: 'setExplode', amount: 0.42 })
    dispatch({ type: 'explodeAssembly', assemblyId: 'bonnet-upper-L', amount: 1 })
    dispatch({ type: 'setXray', on: true })
    dispatch({ type: 'setPaint', paint: 'red' })
    dispatch({ type: 'hideComponents', ids: ['upper-L/i12', 'upper-R/i12'] })
    const before = useViewer.getState()
    const params = buildShareParams(before, { position: [10.04, 20, 30], target: [0, -5.56, 0] })
    const url = shareUrl(params, { origin: 'https://example.github.io', pathname: '/u-bop-atlas/' })
    expect(url.startsWith('https://example.github.io/u-bop-atlas/?stack=double')).toBe(true)

    reset()
    const view = parseShareParams(new URL(url).searchParams, DEFAULT_CONFIG)!
    expect(view.config).toEqual(CONFIG)
    applySharedView(view)
    const after = useViewer.getState()
    expect(after.dataset.config).toEqual(CONFIG)
    expect(after.selectedId).toBe('lower-L/tb03')
    expect(after.explode).toBe(0.42)
    expect(after.assemblyExplode).toEqual({ 'bonnet-upper-L': 1 })
    expect(after.xray).toBe(true)
    expect(after.paint).toBe('red')
    expect([...after.hidden].sort()).toEqual(['upper-L/i12', 'upper-R/i12'])
    expect(after.cameraRequest?.pose).toEqual({ position: [10, 20, 30], target: [0, -5.6, 0] })
  })

  it('accepts only the paints it defines, not inherited object keys', () => {
    for (const bad of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      const view = parseShareParams(new URLSearchParams(`paint=${bad}`), DEFAULT_CONFIG)!
      expect(view.commands.some((c) => c.type === 'setPaint')).toBe(false)
    }
    expect(parseShareParams(new URLSearchParams('paint=red&explode=0'), DEFAULT_CONFIG)!.commands).toEqual([
      { type: 'setExplode', amount: 0 },
      { type: 'setPaint', paint: 'red' },
    ])
  })

  it('ignores a plain visit and unknown keys', () => {
    expect(parseShareParams(new URLSearchParams(''), DEFAULT_CONFIG)).toBeNull()
    expect(parseShareParams(new URLSearchParams('utm_source=x'), DEFAULT_CONFIG)).toBeNull()
  })

  it('rejects values the catalog or dataset does not know', () => {
    reset()
    const view = parseShareParams(new URLSearchParams('upper=pipe_9.999&lower=laser&upperBonnet=gold&explode=7&paint=blue&systems=magic&part=<script>&isolate=nope/i99&cam=1,2,3'), DEFAULT_CONFIG)!
    expect(view.config).toEqual(DEFAULT_CONFIG)
    expect(view.commands).toEqual([
      { type: 'setExplode', amount: 1 },
      { type: 'isolateComponents', ids: ['nope/i99'] },
    ])
    applySharedView(view)
    expect(useViewer.getState().isolated).toBeNull()
    expect(useViewer.getState().explode).toBe(1)
  })
})

describe('parts list export', () => {
  it('builds sourced rows in reading order and never leaves a value blank', () => {
    reset(CONFIG)
    const s = useViewer.getState()
    const rows = partRows(s.dataset)
    expect(rows).toHaveLength(s.dataset.components.length)
    expect(rows[0].location).toBe('body')
    const piston = rows.find((r) => r.id === 'upper-L/i05')!
    expect(piston).toMatchObject({ item: '5A', partNumber: '2245074-02-01', evidence: 'A: manufacturer document', sources: 'Cameron catalog p.18; Cameron catalog p.9' })
    const body = rows.find((r) => r.id === 'body')!
    expect(body.partNumber).toBe(NOT_AVAILABLE)
    expect(rows.find((r) => r.id === 'lower-L/ram-packer')!.sources).toBe('Cameron catalog p.54')
  })

  it('groups identical parts into bill-of-materials lines and lists only the sources used', () => {
    reset()
    const rows = partRows(useViewer.getState().dataset)
    const bom = bomRows(rows)
    expect(bom.find((b) => b.partNumber === '644197-03-00-01')?.instances).toBe(4)
    expect(sourcesUsed(rows).map((x) => x.id)).toContain('SRC-CAM-CAT-2014')
  })

  it('scopes to the selected assembly, visible parts and recommended spares', () => {
    reset()
    dispatch({ type: 'selectComponent', id: 'upper-L/i05' })
    const s = useViewer.getState()
    expect(scopeIds(s, 'assembly').every((id) => id.startsWith('upper-L/'))).toBe(true)
    expect(scopeIds(s, 'spares').every((id) => s.dataset.byId.get(id)!.recommendedSpare?.value)).toBe(true)
    dispatch({ type: 'isolateComponents', ids: ['upper-L/i05'] })
    expect(scopeIds(useViewer.getState(), 'visible')).toEqual(['upper-L/i05'])
  })

  it('writes an .xlsx with four sheets that contains the catalog part numbers', async () => {
    reset(CONFIG)
    const ds = useViewer.getState().dataset
    const blob = await partsWorkbook(ds, partRows(ds), 'Whole BOP').toBlob()
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const workbook = strFromU8(files['xl/workbook.xml'])
    for (const name of ['Parts by location', 'Bill of materials', 'Sources', 'About']) expect(workbook).toContain(name)
    const text = Object.entries(files)
      .filter(([n]) => n.startsWith('xl/'))
      .map(([, f]) => strFromU8(f))
      .join('\n')
    for (const pn of ['2164775-03', '2010884-01', '644924-03', '614772-01']) expect(text).toContain(pn)
  })
})
