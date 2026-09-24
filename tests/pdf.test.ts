import { describe, expect, it } from 'vitest'
import { buildBop } from '../src/data/build-bop'
import { DEFAULT_CONFIG } from '../src/data/config'
import type { BopConfig } from '../src/data/types'
import { compactSources, partRows, setupRows } from '../src/export/parts-list'
import { buildPartsPdf } from '../src/export/pdf'
import { pdfText } from '../src/export/pdf-kit'

const CONFIG: BopConfig = { ...DEFAULT_CONFIG, bonnets: { upper: 'standard', lower: 'largeBoreShear' } }

function pdfFor(ids?: string[]) {
  const ds = buildBop(CONFIG)
  const doc = buildPartsPdf({ ds, rows: partRows(ds, ids), scopeLabel: 'Test scope', snapshot: null, date: '2026-09-24', appUrl: 'https://example.test/u-bop-atlas/' })
  return { doc, text: new TextDecoder('latin1').decode(doc.output('arraybuffer')) }
}

describe('parts-list PDF', () => {
  it('has a summary page, the four sections in order and page numbers', () => {
    const { doc, text } = pdfFor()
    expect(text.startsWith('%PDF-')).toBe(true)
    expect(doc.getNumberOfPages()).toBeGreaterThan(5)
    const order = ['(1  Bill of materials)', '(2  Parts by location)', '(3  Part number notes)', '(4  Sources)'].map((s) => text.indexOf(s))
    expect(order.every((i) => i > 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(text).toContain(`(Page 1 of ${doc.getNumberOfPages()})`)
    expect(text).toContain('/Title (U BOP Atlas parts list)')
  })

  it('prints the catalog part numbers, the evidence and the missing-value text', () => {
    const { text } = pdfFor()
    for (const pn of ['2245074-01-01', '2245074-02-01', '702645-45-81', '2010181-06-01']) expect(text).toContain(`(${pn})`)
    expect(text).toContain('(Manufacturer document, print anomaly)')
    expect(text).toContain('Not available in verified public')
  })

  it('skips the bill of materials when the list covers one assembly', () => {
    const ds = buildBop(CONFIG)
    const ids = ds.components.filter((c) => c.id.startsWith('upper-L/')).map((c) => c.id)
    const { text } = pdfFor(ids)
    expect(text).not.toContain('Bill of materials)')
    expect(text).toContain('(1  Parts by location)')
  })

  it('keeps text inside the Latin-1 range of the standard PDF fonts', () => {
    const q = String.fromCharCode(0x201c)
    const dash = String.fromCharCode(0x2014)
    expect(pdfText(`${q}V${q} shape ${dash} ok`)).toBe('"V" shape - ok')
    expect(pdfText(`pipe ${String.fromCharCode(0x2265)} 5`)).toBe('pipe  5')
  })

  it('shortens sources and lists the setup with catalog pages', () => {
    expect(compactSources([{ sourceId: 'SRC-CAM-CAT-2014', page: 12 }, { sourceId: 'SRC-CAM-CAT-2014', page: 9 }, { sourceId: 'SRC-PAT', locator: 'row 4' }])).toBe('Catalog p.9, p.12; Patterson')
    expect(setupRows(buildBop(CONFIG))).toContainEqual(['Lower cavity, bonnets', 'Large-bore shear bonnets (catalog p.18)'])
  })
})
