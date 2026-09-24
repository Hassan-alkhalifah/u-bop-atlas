// Parts-list PDF: a summary page, a bill of materials, the parts grouped by location and sub-assembly,
// part number notes and the sources. Loaded on demand, so jsPDF stays out of the main bundle.
// Every value comes from the export rows, which copy the dataset claims; nothing is added here.
import { jsPDF } from 'jspdf'
import { autoTable, type CellHookData, type RowInput, type UserOptions } from 'jspdf-autotable'
import type { BopDataset } from '../data/build-bop'
import { NOT_AVAILABLE } from '../data/sources'
import { balloon, COLOR, CONTENT_W, drawFrames, EVIDENCE, evidenceBadge, evidenceKey, label, MARGIN, openSection, PAGE, pdfText, setFont, SNAPSHOT_FRAME, type EvidenceKey } from './pdf-kit'
import { bomRows, compactSources, DISCLAIMER, setupRows, sourcesUsed, type BomRow, type PartRow } from './parts-list'

export interface Snapshot {
  dataUrl: string
  width: number
  height: number
}

export interface PdfInput {
  ds: BopDataset
  rows: PartRow[]
  scopeLabel: string
  snapshot: Snapshot | null
  date: string
  appUrl: string
}

interface TocEntry {
  title: string
  page: number
}

type LineRow = { kind: 'part'; row: PartRow | BomRow } | { kind: 'sub' }

const finalY = (doc: jsPDF): number => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

const BASE_TABLE: UserOptions = {
  theme: 'plain',
  margin: { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: MARGIN.right },
  showHead: 'everyPage',
  rowPageBreak: 'avoid',
  styles: { font: 'helvetica', fontSize: 8, textColor: COLOR.ink, cellPadding: { top: 1.7, bottom: 1.7, left: 2, right: 2 }, valign: 'top', lineColor: COLOR.rule, lineWidth: { bottom: 0.12 } },
  headStyles: { fillColor: COLOR.ink, textColor: COLOR.white, fontStyle: 'bold', fontSize: 7.6, lineWidth: 0 },
}

const itemRank = (item: string): number => {
  if (!item) return 100000
  const tb = item.match(/^TB(\d+)$/)
  if (tb) return 10000 + Number(tb[1])
  const n = item.match(/^(\d+)(A?)$/)
  return n ? Number(n[1]) * 10 + (n[2] ? 1 : 0) : 50000
}

const spareText = (spare: string) => (spare.startsWith('Yes') ? 'Spare' : '')
const evidenceLabel = (c: PartRow['confidence']) => EVIDENCE[evidenceKey(c)].label

function locationName(location: string): string {
  return location === 'body' ? 'Body and connections' : `${location.charAt(0).toUpperCase()}${location.slice(1)} bonnet and ram`
}

/** Sub-assembly heading without the location suffix the dataset adds to ram assemblies. */
const subAssembly = (name: string) => name.replace(/, (upper |lower )?(left|right)$/, '')

function groupBy<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const it of items) map.set(key(it), [...(map.get(key(it)) ?? []), it])
  return [...map.entries()]
}

/** Styles and drawings shared by the part tables: balloons, evidence badges, missing values, stripes. */
function partHooks(lines: LineRow[], cols: { item: number; pn: number; evidence: number; spare: number }) {
  // Alternate part rows are tinted; the count restarts under each sub-assembly heading.
  const striped = new Set<number>()
  let n = 0
  lines.forEach((line, i) => {
    if (line.kind === 'sub') n = 0
    else if (n++ % 2 === 1) striped.add(i)
  })
  return {
    didParseCell: (d: CellHookData) => {
      if (d.section !== 'body') return
      const line = lines[d.row.index]
      if (!line || line.kind !== 'part') return
      if (d.column.index === cols.item) d.cell.styles.halign = 'center'
      if (d.column.index === cols.pn && line.row.confidence !== null) {
        d.cell.styles.font = 'courier'
        d.cell.styles.fontStyle = 'bold'
        d.cell.styles.fontSize = 8
      }
      if (d.column.index === cols.evidence) d.cell.styles.cellPadding = { top: 1.7, bottom: 1.7, left: 7, right: 2 }
      if (d.column.index === cols.spare) {
        d.cell.styles.textColor = COLOR.teal
        d.cell.styles.fontStyle = 'bold'
      }
      if (d.cell.text.join(' ') === NOT_AVAILABLE) {
        d.cell.styles.fontStyle = 'italic'
        d.cell.styles.textColor = COLOR.graphite
        d.cell.styles.fontSize = 7.4
      }
      if (striped.has(d.row.index)) d.cell.styles.fillColor = COLOR.stripe
    },
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body') return
      const line = lines[d.row.index]
      if (!line || line.kind !== 'part') return
      const top = d.cell.y + 1.7
      if (d.column.index === cols.item && line.row.item) {
        setFont(d.doc, 8, 'normal')
        balloon(d.doc, line.row.item, d.cell.x + d.cell.width / 2, top + 1.35)
      }
      if (d.column.index === cols.evidence) evidenceBadge(d.doc, evidenceKey(line.row.confidence), d.cell.x + 2, top - 0.3)
    },
  }
}

// ---------- Sections ----------

function billOfMaterials(doc: jsPDF, bom: BomRow[], number: number): TocEntry {
  const at = openSection(doc, number, 'Bill of materials', 'One line per distinct part, in catalog item order. "In model" counts the places the part appears in this model, not physical pieces.')
  const sorted = [...bom].sort((a, b) => itemRank(a.item) - itemRank(b.item) || a.name.localeCompare(b.name))
  autoTable(doc, {
    ...BASE_TABLE,
    startY: at.y,
    head: [['Item', 'Name', 'Part number', 'Part number evidence', 'Catalog quantity', 'In model', 'Spare', 'Source']],
    body: sorted.map((r) => [r.item, pdfText(r.name), pdfText(r.partNumber), evidenceLabel(r.confidence), pdfText(r.quantity), String(r.instances), spareText(r.spare), pdfText(compactSources(r.refs))]),
    columnStyles: { 0: { cellWidth: 13 }, 1: { cellWidth: 68 }, 2: { cellWidth: 38 }, 3: { cellWidth: 44 }, 4: { cellWidth: 44 }, 5: { cellWidth: 16, halign: 'center' }, 6: { cellWidth: 13 }, 7: { cellWidth: 33 } },
    ...partHooks(
      sorted.map((row) => ({ kind: 'part', row })),
      { item: 0, pn: 2, evidence: 3, spare: 6 },
    ),
  })
  return { title: 'Bill of materials', page: at.page }
}

function partsByLocation(doc: jsPDF, rows: PartRow[], number: number): TocEntry {
  const at = openSection(doc, number, 'Parts by location', 'Each bonnet with its ram, grouped by sub-assembly in catalog item order. Circled numbers are the item numbers of exploded view SD17500.')
  const head: RowInput = ['Item', 'Name', 'Part number', 'Part number evidence', 'Catalog quantity', 'Spare', 'Source']
  const columnStyles = { 0: { cellWidth: 13 }, 1: { cellWidth: 72 }, 2: { cellWidth: 38 }, 3: { cellWidth: 44 }, 4: { cellWidth: 48 }, 5: { cellWidth: 14 }, 6: { cellWidth: 40 } }
  let y = at.y
  for (const [location, locRows] of groupBy(rows, (r) => r.location)) {
    // A location starts on a new page when its heading and first rows would not fit.
    if (y > PAGE.h - MARGIN.bottom - 32) {
      doc.addPage()
      y = MARGIN.top
    }
    const lines: LineRow[] = []
    const body: RowInput[] = []
    for (const [asm, asmRows] of groupBy(locRows, (r) => subAssembly(r.assembly))) {
      if (asm !== locationName(location)) {
        lines.push({ kind: 'sub' })
        body.push([{ content: pdfText(asm.toUpperCase()), colSpan: 7, styles: { fontStyle: 'bold', fontSize: 6.9, textColor: COLOR.teal, cellPadding: { top: 3, bottom: 1.2, left: 2, right: 2 }, lineWidth: 0 } }])
      }
      for (const r of asmRows) {
        lines.push({ kind: 'part', row: r })
        body.push([r.item, pdfText(r.name), pdfText(r.partNumber), evidenceLabel(r.confidence), pdfText(r.quantity), spareText(r.spare), pdfText(compactSources(r.refs))])
      }
    }
    const title = `${locationName(location)}   (${locRows.length} ${locRows.length === 1 ? 'part' : 'parts'})`
    autoTable(doc, {
      ...BASE_TABLE,
      startY: y,
      head: [[{ content: pdfText(title), colSpan: 7, styles: { fillColor: COLOR.paper, textColor: COLOR.ink, fontSize: 9.6, cellPadding: { top: 2.4, bottom: 2.2, left: 2.5, right: 2 } } }], head],
      body,
      columnStyles,
      ...partHooks(lines, { item: 0, pn: 2, evidence: 3, spare: 5 }),
    })
    y = finalY(doc) + 7
  }
  return { title: 'Parts by location', page: at.page }
}

function partNumberNotes(doc: jsPDF, bom: BomRow[], number: number): TocEntry | null {
  const noted = bom.filter((r) => r.pnNote).sort((a, b) => itemRank(a.item) - itemRank(b.item))
  if (!noted.length) return null
  const at = openSection(doc, number, 'Part number notes', 'Print anomalies and inferred values. Confirm these part numbers with SLB before use.', finalY(doc) + 12)
  autoTable(doc, {
    ...BASE_TABLE,
    startY: at.y,
    head: [['Item', 'Name', 'Part number', 'Part number evidence', 'Note']],
    body: noted.map((r) => [r.item, pdfText(r.name), pdfText(r.partNumber), evidenceLabel(r.confidence), pdfText(r.pnNote)]),
    columnStyles: { 0: { cellWidth: 13 }, 1: { cellWidth: 62 }, 2: { cellWidth: 38 }, 3: { cellWidth: 48 }, 4: { cellWidth: 108 } },
    ...partHooks(
      noted.map((row) => ({ kind: 'part', row })),
      { item: 0, pn: 2, evidence: 3, spare: -1 },
    ),
  })
  return { title: 'Part number notes', page: at.page }
}

function sourcesSection(doc: jsPDF, rows: PartRow[], input: PdfInput, number: number): TocEntry {
  const at = openSection(doc, number, 'Sources', 'Every value in this document cites one of these documents. Page numbers refer to the Cameron catalog.', finalY(doc) + 12, 80)
  const used = sourcesUsed(rows)
  autoTable(doc, {
    ...BASE_TABLE,
    startY: at.y,
    head: [['Document', 'Publisher', 'How it is used', 'Link']],
    body: used.map((s) => [pdfText(s.title), pdfText(s.publisher), pdfText(s.reliability), pdfText(s.url)]),
    columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' }, 1: { cellWidth: 46 }, 2: { cellWidth: 78 }, 3: { cellWidth: 75, textColor: COLOR.teal, fontSize: 7 } },
    didDrawCell: (d) => {
      if (d.section === 'body' && d.column.index === 3) d.doc.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { url: used[d.row.index].url })
    },
  })
  let y = finalY(doc) + 10
  if (y > PAGE.h - MARGIN.bottom - 34) {
    doc.addPage()
    y = MARGIN.top + 4
  }
  label(doc, 'About this document', MARGIN.left, y)
  const about = [
    DISCLAIMER,
    'The 3D picture on the first page is an educational reconstruction, not Cameron or SLB CAD. Shapes and sizes are approximations; paint and finishes are illustrative.',
    `Created ${input.date} with U BOP Atlas: ${input.appUrl}`,
  ]
  y += 5
  setFont(doc, 8.4, 'normal', COLOR.ink)
  for (const para of about) {
    const lines = doc.splitTextToSize(pdfText(para), CONTENT_W * 0.72) as string[]
    doc.text(lines, MARGIN.left, y)
    y += lines.length * 4 + 2.5
  }
  return { title: 'Sources', page: at.page }
}

// ---------- Summary page ----------

function banner(doc: jsPDF, input: PdfInput): void {
  doc.setFillColor(COLOR.ink)
  doc.rect(0, 0, PAGE.w, 31, 'F')
  doc.setFillColor(COLOR.signal)
  doc.rect(0, 31, PAGE.w, 1.3, 'F')
  setFont(doc, 7.4, 'bold', '#B9C2C0')
  doc.text('U BOP ATLAS   |   PARTS LIST', MARGIN.left, 10.5, { charSpace: 0.4 })
  setFont(doc, 20, 'bold', COLOR.white)
  doc.text(pdfText('Cameron U BOP 13-5/8" 10,000 psi'), MARGIN.left, 22)
  setFont(doc, 8.4, 'normal', '#D5DBD4')
  doc.text(pdfText(`Scope: ${input.scopeLabel}`), PAGE.w - MARGIN.right, 17, { align: 'right', maxWidth: 110 })
  doc.text(`Exported ${input.date}`, PAGE.w - MARGIN.right, 22.5, { align: 'right' })
}

function statBoxes(doc: jsPDF, stats: [string, string][], x: number, y: number, w: number): number {
  const gap = 3
  const bw = (w - gap * (stats.length - 1)) / stats.length
  stats.forEach(([value, text], i) => {
    const bx = x + i * (bw + gap)
    doc.setFillColor(COLOR.paper2)
    doc.setDrawColor(COLOR.rule)
    doc.setLineWidth(0.2)
    doc.roundedRect(bx, y, bw, 19, 1.5, 1.5, 'FD')
    setFont(doc, 15, 'bold', COLOR.ink)
    doc.text(value, bx + 3, y + 8.2)
    setFont(doc, 6.9, 'normal', COLOR.graphite)
    doc.text(doc.splitTextToSize(pdfText(text), bw - 6) as string[], bx + 3, y + 12.6)
  })
  return y + 19
}

/** Stacked bar of part number evidence over the distinct parts, with a legend and counts. */
function evidenceBar(doc: jsPDF, bom: BomRow[], x: number, y: number, w: number): void {
  const keys: EvidenceKey[] = ['A', 'B', 'C', 'D', 'none']
  const counts = keys.map((k) => bom.filter((r) => evidenceKey(r.confidence) === k).length)
  const total = Math.max(1, counts.reduce((a, b) => a + b, 0))
  let bx = x
  keys.forEach((k, i) => {
    if (!counts[i]) return
    const segment = Math.max(1, (counts[i] / total) * w)
    doc.setFillColor(EVIDENCE[k].color)
    doc.rect(bx, y, Math.min(segment, x + w - bx), 5, 'F')
    bx += segment
  })
  keys.forEach((k, i) => {
    const lx = x + (i < 3 ? 0 : w / 2)
    const ly = y + 10 + (i < 3 ? i : i - 3) * 5.2
    evidenceBadge(doc, k, lx, ly - 2.9, 3.4)
    setFont(doc, 7.8, 'normal', COLOR.ink)
    doc.text(EVIDENCE[k].label, lx + 5, ly)
    setFont(doc, 7.8, 'bold', COLOR.ink)
    doc.text(String(counts[i]), lx + w / 2 - 6, ly, { align: 'right' })
  })
}

function snapshotBox(doc: jsPDF, snap: Snapshot | null, x: number, y: number): number {
  const { w, h } = SNAPSHOT_FRAME
  doc.setFillColor('#D5DBD4')
  doc.rect(x, y, w, h, 'F')
  if (snap) {
    // The capture is already cropped to the frame shape; fit it without distortion just in case.
    const scale = Math.min(w / snap.width, h / snap.height)
    const iw = snap.width * scale
    const ih = snap.height * scale
    doc.addImage(snap.dataUrl, 'JPEG', x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)
  } else {
    setFont(doc, 8, 'italic', COLOR.graphite)
    doc.text('No picture of the 3D view was available.', x + w / 2, y + h / 2, { align: 'center' })
  }
  doc.setDrawColor(COLOR.rule)
  doc.setLineWidth(0.25)
  doc.rect(x, y, w, h, 'S')
  setFont(doc, 6.9, 'italic', COLOR.graphite)
  doc.text('The 3D view when this list was exported. Educational reconstruction, not Cameron or SLB CAD.', x, y + h + 3.6)
  return y + h + 3.6
}

const READING_NOTES = [
  'Part numbers are copied from the cited catalog pages. Confirm them with SLB for specific equipment; the catalog itself asks for this.',
  'Catalog quantity is the quantity printed in the source: per single or double BOP, per cavity, or per assembly.',
  'Circled numbers are the item numbers of the Cameron exploded view SD17500. Numbers such as 5A come from the large-bore shear bonnet table (p.18); TB numbers from the tandem booster list (p.21).',
  `A value that is not documented prints as "${NOT_AVAILABLE}" Nothing in this list is estimated.`,
]

function readingGuide(doc: jsPDF): void {
  const colW = (CONTENT_W - 8 - 8) / 2
  setFont(doc, 7.8, 'normal', COLOR.ink)
  const blocks = READING_NOTES.map((n) => doc.splitTextToSize(pdfText(n), colW) as string[])
  const rowH = (a: string[], b: string[] | undefined) => Math.max(a.length, b?.length ?? 0) * 3.4
  const h = 10 + rowH(blocks[0], blocks[1]) + 2.5 + rowH(blocks[2], blocks[3]) + 2
  const y = PAGE.h - MARGIN.bottom - h - 1
  doc.setFillColor(COLOR.paper2)
  doc.setDrawColor(COLOR.rule)
  doc.setLineWidth(0.2)
  doc.roundedRect(MARGIN.left, y, CONTENT_W, h, 1.5, 1.5, 'FD')
  label(doc, 'How to read this list', MARGIN.left + 4, y + 5.5)
  let ty = y + 10.5
  for (let r = 0; r < 2; r++) {
    const [a, b] = [blocks[r * 2], blocks[r * 2 + 1]]
    setFont(doc, 7.8, 'normal', COLOR.ink)
    doc.text(a, MARGIN.left + 4, ty)
    if (b) doc.text(b, MARGIN.left + 4 + colW + 8, ty)
    ty += rowH(a, b) + 2.5
  }
}

function summaryPage(doc: jsPDF, input: PdfInput, bom: BomRow[]): { x: number; y: number; w: number } {
  banner(doc, input)
  const leftX = MARGIN.left
  const leftW = CONTENT_W - SNAPSHOT_FRAME.w - 10
  const rightX = MARGIN.left + leftW + 10

  label(doc, 'Setup', leftX, 41)
  autoTable(doc, {
    theme: 'plain',
    startY: 43,
    margin: { left: leftX },
    tableWidth: leftW,
    body: setupRows(input.ds).map(([k, v]) => [pdfText(k), pdfText(v)]),
    styles: { fontSize: 8.2, textColor: COLOR.ink, cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 2 }, lineColor: COLOR.rule, lineWidth: { bottom: 0.12 } },
    columnStyles: { 0: { cellWidth: 40, textColor: COLOR.graphite }, 1: { cellWidth: leftW - 40, fontStyle: 'bold' } },
  })
  let y = finalY(doc) + 7

  label(doc, 'In this list', leftX, y)
  const withPn = bom.filter((r) => r.confidence !== null).length
  const spares = bom.filter((r) => r.spare.startsWith('Yes')).length
  const stats: [string, string][] = [
    [String(input.rows.length), 'parts listed'],
    [String(bom.length), 'distinct parts'],
    [String(withPn), 'with a printed part number'],
    [String(spares), 'recommended spares'],
  ]
  y = statBoxes(doc, stats, leftX, y + 2.5, leftW)

  label(doc, 'Part number evidence, distinct parts', leftX, y + 7)
  evidenceBar(doc, bom, leftX, y + 9.5, leftW)

  label(doc, 'Current 3D view', rightX, 41)
  const afterShot = snapshotBox(doc, input.snapshot, rightX, 43)
  readingGuide(doc)
  return { x: rightX, y: afterShot + 8, w: SNAPSHOT_FRAME.w }
}

function contents(doc: jsPDF, toc: TocEntry[], at: { x: number; y: number; w: number }): void {
  doc.setPage(1)
  label(doc, 'Contents', at.x, at.y)
  toc.forEach((e, i) => {
    const ty = at.y + 6 + i * 5.4
    const text = pdfText(`${i + 1}   ${e.title}`)
    setFont(doc, 8.6, 'normal', COLOR.ink)
    doc.text(text, at.x, ty)
    doc.setDrawColor(COLOR.rule)
    doc.setLineWidth(0.2)
    doc.setLineDashPattern([0.4, 0.9], 0)
    doc.line(at.x + doc.getTextWidth(text) + 2, ty - 0.6, at.x + at.w - 8, ty - 0.6)
    doc.setLineDashPattern([], 0)
    setFont(doc, 8.6, 'bold', COLOR.ink)
    doc.text(String(e.page), at.x + at.w, ty, { align: 'right' })
    doc.link(at.x, ty - 3.5, at.w, 4.8, { pageNumber: e.page })
  })
}

export function buildPartsPdf(input: PdfInput): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setProperties({ title: 'U BOP Atlas parts list', subject: pdfText(input.scopeLabel), creator: 'U BOP Atlas', keywords: 'Cameron U BOP, parts list' })
  const bom = bomRows(input.rows)
  const tocAt = summaryPage(doc, input, bom)

  const toc: TocEntry[] = []
  // With a single location the bill of materials would repeat the location table line for line.
  const locations = new Set(input.rows.map((r) => r.location)).size
  if (locations > 1) toc.push(billOfMaterials(doc, bom, toc.length + 1))
  toc.push(partsByLocation(doc, input.rows, toc.length + 1))
  const notes = partNumberNotes(doc, bom, toc.length + 1)
  if (notes) toc.push(notes)
  toc.push(sourcesSection(doc, input.rows, input, toc.length + 1))

  contents(doc, toc, tocAt)
  drawFrames(doc, {
    title: 'U BOP Atlas  |  Parts list',
    right: `${input.scopeLabel}  |  ${input.date}`,
    footer: 'Educational reference built from public documents. Confirm part numbers with SLB. Not affiliated with or endorsed by SLB or Cameron.',
  })
  doc.setPage(1)
  return doc
}

export function downloadPartsPdf(input: PdfInput, fileName: string): void {
  buildPartsPdf(input).save(fileName)
}

