import { useEffect, useRef, useState } from 'react'
import { buildShareParams, shareUrl } from '../state/share'
import { useViewer } from '../state/store'
import { cameraBridge } from '../viewer/camera-bridge'
import { Icon } from './ui'

/** Link to the current view: setup, selection, explode, visibility, x-ray, paint and camera. */
export function currentShareUrl(): string {
  return shareUrl(buildShareParams(useViewer.getState(), cameraBridge.read?.() ?? null), window.location)
}

function SharePopover({ onClose }: { onClose: () => void }) {
  const [url] = useState(currentShareUrl)
  const [status, setStatus] = useState<'copying' | 'copied' | 'manual'>('copying')
  const ref = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const canShare = typeof navigator.share === 'function'

  useEffect(() => {
    navigator.clipboard
      ?.writeText(url)
      .then(() => setStatus('copied'))
      .catch(() => setStatus('manual'))
    if (!navigator.clipboard) setStatus('manual')
  }, [url])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as Element).closest?.('[data-share-button]')) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [onClose])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
    } catch {
      input.current?.select()
      setStatus('manual')
    }
  }

  return (
    <div ref={ref} className="popover share-pop" role="dialog" aria-label="Share this view">
      <div className="heading" style={{ fontSize: 16, marginBottom: 4 }}>Link to this view</div>
      <p className="muted" style={{ margin: '0 0 8px', fontSize: 12.5 }}>Opens this exact view: setup, selected part, explode, hidden and isolated parts, x-ray and camera angle.</p>
      <div style={{ display: 'flex', gap: 6 }}>
        <input ref={input} className="field mono" readOnly value={url} aria-label="Share link" onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 0 }} />
        <button type="button" className="btn btn-primary" onClick={() => void copy()}>
          {status === 'copied' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="muted" role="status" style={{ fontSize: 12, marginTop: 6 }}>
        {status === 'copied' ? 'Copied to the clipboard.' : status === 'manual' ? 'Select the link and copy it.' : ''}
      </div>
      {canShare && (
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => void navigator.share({ title: 'U BOP Atlas', url }).catch(() => undefined)}>
          <Icon name="send" size={14} /> Share with an app
        </button>
      )}
    </div>
  )
}

export function HeaderActions() {
  const dialog = useViewer((s) => s.dialog)
  const setDialog = (d: 'share' | 'export' | null) => useViewer.setState({ dialog: d })
  return (
    <div className="head-actions">
      <div style={{ position: 'relative' }}>
        <button type="button" className="btn" data-share-button aria-label="Share this view" aria-expanded={dialog === 'share'} onClick={() => setDialog(dialog === 'share' ? null : 'share')}>
          <Icon name="link" size={15} /> <span className="hide-mobile">Share</span>
        </button>
        {dialog === 'share' && <SharePopover onClose={() => setDialog(null)} />}
      </div>
      <button type="button" className="btn" aria-label="Export parts list" onClick={() => setDialog('export')}>
        <Icon name="download" size={15} /> <span className="hide-mobile">Export</span>
      </button>
    </div>
  )
}
