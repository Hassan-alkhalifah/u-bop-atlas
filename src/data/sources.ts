import type { Claim, Confidence, Source, SourceId, SourceRef } from './types'

export const NOT_AVAILABLE = 'Not available in verified public documentation.'

export const SOURCES: Record<SourceId, Source> = {
  'SRC-CAM-CAT-2014': {
    id: 'SRC-CAM-CAT-2014',
    title: 'Type U & UM BOP replacement parts catalog (62 pp., PDF dated 2014-12-08)',
    publisher: 'Cameron International Corporation',
    kind: 'oem',
    url: 'https://cdn.energydais.com/media/files/company/products/CAMERON_BOP_PARTS.pdf',
    accessed: '2026-09-22',
    reliability:
      'OEM primary source. The catalog states that weights, dimensions and part numbers should be confirmed for specific equipment.',
  },
  'SRC-SLB-DS-2025': {
    id: 'SRC-SLB-DS-2025',
    title: 'Type U data sheet DRL-1005',
    publisher: 'SLB',
    kind: 'oem',
    url: 'https://www.slb.com/-/media/feature/products/data-sheets/type_u_data_sheet.pdf',
    accessed: '2026-09-22',
    reliability: 'OEM primary source, features only. No dimensions or part numbers.',
  },
  'SRC-SLB-WEB': {
    id: 'SRC-SLB-WEB',
    title: 'U Ram-Type BOP product page',
    publisher: 'SLB',
    kind: 'oem',
    url: 'https://www.slb.com/products-and-services/innovating-in-oil-and-gas/well-construction/rigs-and-equipment/pressure-control-equipment/ram-type-bops/u-ram-type-bop',
    accessed: '2026-09-22',
    reliability: 'OEM primary source, marketing level.',
  },
  'SRC-PAT': {
    id: 'SRC-PAT',
    title: 'BOP Information Sheet: Cameron U BOP Double 13-5/8" 10K',
    publisher: 'Patterson Services, Inc. (rental company)',
    kind: 'third_party',
    url: 'https://pattersonservices.com/wp-content/uploads/2020/06/10.-13.625-10K-Double-Cameron-U-BOP.pdf',
    accessed: '2026-09-22',
    reliability: 'Third-party secondary source. Its own disclaimer says dimensions may vary.',
  },
  'SRC-QT': {
    id: 'SRC-QT',
    title: 'BOP Specification & Performance Data Sheet: 13-5/8" 10M Cameron Type U Double (generated 2025-06-19)',
    publisher: 'Quail Tools (rental company)',
    kind: 'third_party',
    url: 'https://www.quailtools.com/assets/images/specsheets/doubles/QT-13.625_10M%20-%20Double_Standard_LB%20Boosters.pdf',
    accessed: '2026-09-22',
    reliability: 'Third-party secondary source for one specific configuration.',
  },
}

export function cat(page: number, quote?: string, locator?: string): SourceRef {
  return { sourceId: 'SRC-CAM-CAT-2014', page, quote, locator }
}

export function claim<T>(value: T, sources: SourceRef[], confidence: Confidence, note?: string): Claim<T> {
  return note === undefined ? { value, sources, confidence } : { value, sources, confidence, note }
}

export function describeRef(ref: SourceRef): string {
  const src = SOURCES[ref.sourceId]
  const page = ref.page !== undefined ? `, p.${ref.page}` : ''
  return `${src.publisher}: ${src.title}${page}`
}
