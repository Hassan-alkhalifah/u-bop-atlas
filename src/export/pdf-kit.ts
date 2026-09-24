// Drawing primitives and styles for the parts-list PDF (jsPDF, millimetres, A4 landscape).
// Colours follow the app's tokens so the document reads as part of the same product.
import type { jsPDF } from 'jspdf'
import type { Confidence } from '../data/types'

export const PAGE = { w: 297, h: 210 }
export const MARGIN = { left: 14, right: 14, top: 22, bottom: 16 }
export const CONTENT_W = PAGE.w - MARGIN.left - MARGIN.right

/** Width and height of the 3D picture frame on the summary page (mm); snapshots are cropped to this shape. */
export const SNAPSHOT_FRAME = { w: 123, h: 74 }

export const COLOR = {
  ink: '#1C2427',
  graphite: '#56626A',
  rule: '#C4CBC3',
  paper: '#E8EBE5',
  paper2: '#F2F4EF',
  stripe: '#F7F8F4',
  teal: '#1E7F86',
  signal: '#E2A900',
  white: '#FFFFFF',
}

export type EvidenceKey = Confidence | 'none'

export const EVIDENCE: Record<EvidenceKey, { color: string; label: string }> = {
  A: { color: '#2F7D5B', label: 'Manufacturer document' },
  B: { color: '#C98F1C', label: 'Manufacturer document, print anomaly' },
  C: { color: '#B4622F', label: 'Third-party data sheet' },
  D: { color: '#56626A', label: 'Inferred, not stated' },
  none: { color: '#9AA0A3', label: 'No part number printed' },
}

export const evidenceKey = (c: Confidence | null): EvidenceKey => c ?? 'none'

const REPLACEMENTS: [RegExp, string][] = [
  [/[\u2018\u2019]/g, "'"],
  [/[\u201C\u201D]/g, '"'],
  [/[\u2013\u2014]/g, '-'],
  [/\u2026/g, '...'],
  [/\u00A0/g, ' '],
]

/** The standard PDF fonts cover Latin-1 only; map typographic marks and drop anything else outside it. */
export function pdfText(s: string): string {
  let out = s
  for (const [rx, to] of REPLACEMENTS) out = out.replace(rx, to)
  return out.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '')
}

export const mmPerPt = 0.3528

export function setFont(doc: jsPDF, size: number, style: 'normal' | 'bold' | 'italic' = 'normal', color = COLOR.ink, font = 'helvetica'): void {
  doc.setFont(font, style)
  doc.setFontSize(size)
  doc.setTextColor(color)
}

/** Small uppercase label above a block. */
export function label(doc: jsPDF, text: string, x: number, y: number): void {
  setFont(doc, 7.2, 'bold', COLOR.graphite)
  doc.text(pdfText(text.toUpperCase()), x, y, { charSpace: 0.35 })
}

/** Evidence badge: a coloured rounded square with the letter, as in the app's evidence mode. */
export function evidenceBadge(doc: jsPDF, key: EvidenceKey, x: number, y: number, size = 3.6): void {
  doc.setFillColor(EVIDENCE[key].color)
  doc.roundedRect(x, y, size, size, 0.7, 0.7, 'F')
  setFont(doc, 6.4, 'bold', COLOR.white)
  doc.text(key === 'none' ? '-' : key, x + size / 2, y + size / 2 + 0.05, { align: 'center', baseline: 'middle' })
}

/** Catalog balloon around an item number: a circle for short numbers, a pill for labels such as 24A or TB12. */
export function balloon(doc: jsPDF, text: string, cx: number, cy: number): void {
  doc.setDrawColor(COLOR.ink)
  doc.setLineWidth(0.22)
  const w = doc.getTextWidth(text)
  if (text.length <= 2) doc.circle(cx, cy, 2.35, 'S')
  else doc.roundedRect(cx - w / 2 - 1.3, cy - 2.2, w + 2.6, 4.4, 2.2, 2.2, 'S')
}

export interface PageFrame {
  title: string
  right: string
  footer: string
}

/** Header on every page after the cover, footer with page numbers on all pages. Drawn once all pages exist. */
export function drawFrames(doc: jsPDF, frame: PageFrame): void {
  const total = doc.getNumberOfPages()
  for (let page = 1; page <= total; page++) {
    doc.setPage(page)
    if (page > 1) {
      setFont(doc, 8, 'bold', COLOR.ink)
      doc.text(pdfText(frame.title), MARGIN.left, 11.5)
      setFont(doc, 7.4, 'normal', COLOR.graphite)
      doc.text(pdfText(frame.right), PAGE.w - MARGIN.right, 11.5, { align: 'right' })
      doc.setDrawColor(COLOR.rule)
      doc.setLineWidth(0.2)
      doc.line(MARGIN.left, 14.5, PAGE.w - MARGIN.right, 14.5)
    }
    doc.setDrawColor(COLOR.rule)
    doc.setLineWidth(0.2)
    doc.line(MARGIN.left, PAGE.h - 10.5, PAGE.w - MARGIN.right, PAGE.h - 10.5)
    setFont(doc, 6.8, 'normal', COLOR.graphite)
    doc.text(pdfText(frame.footer), MARGIN.left, PAGE.h - 6.5)
    setFont(doc, 7.4, 'bold', COLOR.ink)
    doc.text(`Page ${page} of ${total}`, PAGE.w - MARGIN.right, PAGE.h - 6.5, { align: 'right' })
  }
}

export const currentPage = (doc: jsPDF): number => doc.getCurrentPageInfo().pageNumber

/**
 * Section opener: accent bar, number and title, and a one-line explanation. It starts a new page unless
 * `continueAt` is given and at least `needs` millimetres are left below it on the current page.
 */
export function openSection(doc: jsPDF, number: number, title: string, subtitle: string, continueAt?: number, needs = 60): { y: number; page: number } {
  let top = 21
  if (continueAt !== undefined && continueAt + needs < PAGE.h - MARGIN.bottom) top = continueAt
  else doc.addPage()
  doc.setFillColor(COLOR.signal)
  doc.rect(MARGIN.left, top, 1.6, 8.5, 'F')
  setFont(doc, 15, 'bold', COLOR.ink)
  doc.text(pdfText(`${number}  ${title}`), MARGIN.left + 4.5, top + 6.2)
  setFont(doc, 8.4, 'normal', COLOR.graphite)
  doc.text(pdfText(subtitle), MARGIN.left + 4.5, top + 11.6)
  return { y: top + 16, page: currentPage(doc) }
}
