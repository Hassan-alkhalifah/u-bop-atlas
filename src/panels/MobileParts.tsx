import { locationLabel } from '../data/build-bonnet'
import { dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { Balloon, balloonText, Icon } from './ui'

/** Header with a close button for the phone bottom sheets. */
export function SheetHead({ title }: { title: string }) {
  return (
    <div className="sheet-head">
      <span className="heading" style={{ fontSize: 16 }}>{title}</span>
      <button type="button" className="icon-btn" aria-label={`Close ${title}`} onClick={() => useViewer.setState({ mobileSheet: 'closed' })}>
        <Icon name="close" />
      </button>
    </div>
  )
}

/** Phone only: a compact card for the selected part, so the model stays visible. */
export function SelectionCard() {
  const c = useViewer((s) => (s.selectedId ? s.dataset.byId.get(s.selectedId) : undefined))
  const stack = useViewer((s) => s.dataset.config.stack)
  return (
    <div className="selection-card" data-visible={!!c} aria-live="polite">
      {c && (
        <>
          <Balloon n={balloonText(c)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
            <div className="muted" style={{ fontSize: 12, textTransform: 'capitalize' }}>
              {c.cavity && c.side ? locationLabel(c.cavity, c.side, stack) : 'body'}
              {c.partNumber ? <span className="mono" style={{ textTransform: 'none', marginLeft: 6 }}>{c.partNumber.value}</span> : null}
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => useViewer.setState({ mobileSheet: 'panel', panelTab: 'details' })}>
            Details
          </button>
          <button type="button" className="icon-btn" aria-label="Clear selection" onClick={() => dispatch({ type: 'selectComponent', id: null })}>
            <Icon name="close" />
          </button>
        </>
      )}
    </div>
  )
}
