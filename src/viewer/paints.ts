export type PaintId = 'grey' | 'red'

/** Paint is illustrative. Rigs paint preventers in many colours; "red" matches the Cameron catalog render (p.6). */
export const PAINTS: Record<PaintId, { label: string; body: string; alt: string }> = {
  grey: { label: 'Neutral grey', body: '#7E878B', alt: '#6E777B' },
  red: { label: 'Catalog render red', body: '#A8231B', alt: '#8F1D17' },
}
