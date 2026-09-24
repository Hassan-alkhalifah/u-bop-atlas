import type { ReactNode } from 'react'
import { NOT_AVAILABLE, SOURCES } from '../data/sources'
import type { Claim, Confidence, SourceRef } from '../data/types'

/** Balloon text for a part: its SD17500 item number, or a label such as "3A" (p.18) or "TB3" (p.21). */
export function balloonText(c: { catalogItem?: number; itemLabel?: string }): string | number | undefined {
  return c.itemLabel ?? c.catalogItem
}

export function Balloon({ n, size }: { n?: number | string; size?: 'sm' | 'lg' }) {
  const wide = n !== undefined && String(n).length > 2
  const cls = `balloon ${size ? `balloon-${size}` : ''} ${n === undefined ? 'balloon-empty' : ''} ${wide ? 'balloon-wide' : ''}`
  return (
    <span className={cls} aria-label={n === undefined ? 'No catalog item number' : `Catalog item ${n}`}>
      {n ?? ''}
    </span>
  )
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  A: 'Manufacturer document',
  B: 'Manufacturer document, print anomaly',
  C: 'Third-party data sheet',
  D: 'Inferred, not stated',
}

export function ConfidenceBadge({ c }: { c: Confidence }) {
  return (
    <span className={`tier conf-${c}`} title={CONFIDENCE_LABEL[c]}>
      {c} <span style={{ fontWeight: 450 }}>{CONFIDENCE_LABEL[c]}</span>
    </span>
  )
}

const SHORT: Record<SourceRef['sourceId'], string> = {
  'SRC-CAM-CAT-2014': 'Cameron catalog',
  'SRC-SLB-DS-2025': 'SLB data sheet',
  'SRC-SLB-WEB': 'SLB product page',
  'SRC-PAT': 'Patterson sheet',
  'SRC-QT': 'Quail Tools sheet',
}

export function SourceLinks({ refs }: { refs: SourceRef[] }) {
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px 10px' }}>
      {refs.map((r, i) => {
        const src = SOURCES[r.sourceId]
        const page = r.page !== undefined ? ` p.${r.page}` : ''
        const title = [src.title, r.locator, r.quote ? `"${r.quote}"` : ''].filter(Boolean).join(' | ')
        return (
          <a key={i} className="src" href={src.url + (r.page !== undefined && src.url.endsWith('.pdf') ? `#page=${r.page}` : '')} target="_blank" rel="noreferrer" title={title}>
            {SHORT[r.sourceId]}
            {page}
          </a>
        )
      })}
    </span>
  )
}

export function ClaimView({ claim, mono, render }: { claim: Claim<string> | null | undefined; mono?: boolean; render?: (v: string) => ReactNode }) {
  if (!claim) return <span className="na">{NOT_AVAILABLE}</span>
  return (
    <div>
      <div className={mono ? 'mono' : undefined} style={{ fontWeight: mono ? 500 : undefined }}>
        {render ? render(claim.value) : claim.value}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <ConfidenceBadge c={claim.confidence} />
        <SourceLinks refs={claim.sources} />
      </div>
      {claim.conflicts?.map((cf, i) => (
        <div key={i} style={{ marginTop: 6, fontSize: 12.5, color: 'var(--warn)' }}>
          Conflicting value: {cf.value} <SourceLinks refs={cf.sources} />
        </div>
      ))}
      {claim.note && <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{claim.note}</div>}
    </div>
  )
}

type IconName = 'eye' | 'eyeOff' | 'focus' | 'chevron' | 'play' | 'stop' | 'reset' | 'send' | 'isolate' | 'link' | 'explode' | 'close' | 'download' | 'print' | 'book' | 'check' | 'target'

const PATHS: Record<IconName, ReactNode> = {
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6" /></>,
  focus: <><circle cx="12" cy="12" r="3" /><path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  play: <path d="M7 4l13 8-13 8V4Z" />,
  stop: <rect x="6" y="6" width="12" height="12" />,
  reset: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /></>,
  send: <path d="M3 11l18-8-8 18-2-8-8-2Z" />,
  isolate: <><rect x="8" y="8" width="8" height="8" /><path d="M3 3h4M3 3v4M21 3h-4M21 3v4M3 21h4M3 21v-4M21 21h-4M21 21v-4" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  explode: <><path d="M12 2v6M12 16v6M2 12h6M16 12h6" /><rect x="9" y="9" width="6" height="6" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  download: <><path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M4 19h16" /></>,
  print: <><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="1" /><path d="M7 14h10v7H7z" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
}

export function Icon({ name, size = 16, rotate }: { name: IconName; size?: number; rotate?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={rotate ? { transform: `rotate(${rotate}deg)`, transition: 'transform 120ms' } : undefined}>
      {PATHS[name]}
    </svg>
  )
}
