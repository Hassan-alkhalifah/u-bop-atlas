// Excel export. Loaded on demand (dynamic import) so the spreadsheet writer stays out of the main bundle.
import writeXlsxFile, { type Row, type SheetData } from 'write-excel-file/browser'
import { bomRows, configSummary, DISCLAIMER, sourcesUsed, type PartRow } from './parts-list'
import type { BopDataset } from '../data/build-bop'

const HEADER = { fontWeight: 'bold' as const, backgroundColor: '#E8EBE5', wrap: true }

function table<T>(columns: { title: string; width: number; value: (row: T) => string | number }[], rows: T[]) {
  const data: SheetData = [columns.map((c) => ({ ...HEADER, value: c.title })), ...rows.map((r): Row => columns.map((c) => ({ value: c.value(r), wrap: true, alignVertical: 'top' as const })))]
  return { data, columns: columns.map((c) => ({ width: c.width })), stickyRowsCount: 1 }
}

export function partsWorkbook(ds: BopDataset, rows: PartRow[], scopeLabel: string) {
  const byLocation = table<PartRow>(
    [
      { title: 'Location', width: 12, value: (r) => r.location },
      { title: 'Assembly', width: 30, value: (r) => r.assembly },
      { title: 'Item', width: 6, value: (r) => r.item },
      { title: 'Name', width: 36, value: (r) => r.name },
      { title: 'Part number', width: 22, value: (r) => r.partNumber },
      { title: 'Part number evidence', width: 24, value: (r) => r.evidence },
      { title: 'Catalog quantity', width: 26, value: (r) => r.quantity },
      { title: 'Recommended spare', width: 14, value: (r) => r.spare },
      { title: 'Kits', width: 40, value: (r) => r.kits },
      { title: 'Sources', width: 26, value: (r) => r.sources },
      { title: 'Notes', width: 60, value: (r) => r.notes },
      { title: 'Model id', width: 18, value: (r) => r.id },
    ],
    rows,
  )
  const bom = table(
    [
      { title: 'Item', width: 6, value: (r) => r.item },
      { title: 'Name', width: 36, value: (r) => r.name },
      { title: 'Part number', width: 22, value: (r) => r.partNumber },
      { title: 'Part number evidence', width: 24, value: (r) => r.evidence },
      { title: 'Catalog quantity', width: 26, value: (r) => r.quantity },
      { title: 'Places in this model', width: 10, value: (r) => r.instances },
      { title: 'Recommended spare', width: 14, value: (r) => r.spare },
      { title: 'Kits', width: 40, value: (r) => r.kits },
      { title: 'Sources', width: 26, value: (r) => r.sources },
    ],
    bomRows(rows),
  )
  const sources = table(
    [
      { title: 'Source id', width: 18, value: (r) => r.id },
      { title: 'Publisher', width: 34, value: (r) => r.publisher },
      { title: 'Title', width: 60, value: (r) => r.title },
      { title: 'Reliability', width: 60, value: (r) => r.reliability },
      { title: 'URL', width: 60, value: (r) => r.url },
    ],
    sourcesUsed(rows),
  )
  const about: SheetData = [
    [{ value: 'U BOP Atlas parts list', fontWeight: 'bold', fontSize: 14 }],
    [configSummary(ds)],
    [`Scope: ${scopeLabel}. ${rows.length} rows.`],
    [`Exported: ${new Date().toISOString().slice(0, 10)}`],
    [''],
    [{ value: DISCLAIMER, wrap: true }],
    [{ value: '"Catalog quantity" is the quantity printed in the source (per single or double BOP, per cavity or per assembly). "Places in this model" counts model instances, not physical pieces.', wrap: true }],
  ]
  return writeXlsxFile([
    { ...byLocation, sheet: 'Parts by location' },
    { ...bom, sheet: 'Bill of materials' },
    { ...sources, sheet: 'Sources' },
    { data: about, sheet: 'About', columns: [{ width: 110 }] },
  ])
}

export async function downloadPartsWorkbook(ds: BopDataset, rows: PartRow[], scopeLabel: string, fileName: string): Promise<void> {
  await partsWorkbook(ds, rows, scopeLabel).toFile(fileName)
}
