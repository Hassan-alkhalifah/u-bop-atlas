import { useEffect, useRef, useState } from 'react'
import { NOT_AVAILABLE } from '../data/sources'
import { partRows, scopeIds, selectedTopAssembly, type ExportScope } from '../export/parts-list'
import { SNAPSHOT_FRAME } from '../export/pdf-kit'
import { useViewer } from '../state/store'
import { Icon } from './ui'

/** Longest side of the snapshot put into the PDF, in pixels: sharp in print, small enough to keep the file light. */
const SNAPSHOT_MAX_PX = 1600

/**
 * Picture of the current 3D view for the PDF, centre-cropped to the frame shape on the summary page
 * (a little tighter than the full view, so the model fills the frame). Null when no canvas is available.
 */
function captureSnapshot(): { dataUrl: string; width: number; height: number } | null {
  const canvas = document.querySelector<HTMLCanvasElement>('.app-view canvas')
  if (!canvas || !canvas.width || !canvas.height) return null
  const aspect = SNAPSHOT_FRAME.w / SNAPSHOT_FRAME.h
  let cw = canvas.width * 0.92
  let ch = cw / aspect
  if (ch > canvas.height * 0.92) {
    ch = canvas.height * 0.92
    cw = ch * aspect
  }
  const scale = Math.min(1, SNAPSHOT_MAX_PX / cw)
  const out = document.createElement('canvas')
  out.width = Math.round(cw * scale)
  out.height = Math.round(ch * scale)
  const ctx = out.getContext('2d')
  if (!ctx) return null
  try {
    ctx.drawImage(canvas, (canvas.width - cw) / 2, (canvas.height - ch) / 2, cw, ch, 0, 0, out.width, out.height)
    return { dataUrl: out.toDataURL('image/jpeg', 0.88), width: out.width, height: out.height }
  } catch (e: unknown) {
    // The PDF still works without the picture; its summary page says so.
    console.error('[export] could not capture the 3D view', e)
    return null
  }
}

const today = () => new Date().toISOString().slice(0, 10)
const close = () => useViewer.setState({ dialog: null })
const appUrl = () => `${window.location.origin}${window.location.pathname}`

type Busy = 'pdf' | 'excel' | null

/** Mounted only while the dialog is open, so it can follow the whole viewer state without cost when closed. */
function ExportBody() {
  const state = useViewer()
  const assembly = selectedTopAssembly(state)
  const [scope, setScope] = useState<ExportScope>(() => (assembly ? 'assembly' : 'all'))
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<string | null>(null)

  const options: { id: ExportScope; label: string }[] = [
    { id: 'all', label: 'Whole BOP' },
    { id: 'assembly', label: assembly ? `Assembly of the selected part: ${assembly.name}` : 'Assembly of the selected part (select a part first)' },
    { id: 'visible', label: 'Parts visible now (after hide, isolate and system filters)' },
    { id: 'spares', label: 'Recommended spare parts (marked * on SD17500)' },
  ]
  const counts = Object.fromEntries(options.map((o) => [o.id, scopeIds(state, o.id).length])) as Record<ExportScope, number>
  const label = options.find((o) => o.id === scope)!.label
  const rows = () => partRows(state.dataset, scopeIds(state, scope))

  const run = async (kind: Exclude<Busy, null>, work: () => Promise<void>) => {
    setBusy(kind)
    setError(null)
    try {
      await work()
    } catch (e: unknown) {
      console.error(`[export] ${kind} export failed`, e)
      setError(`The ${kind === 'pdf' ? 'PDF' : 'Excel'} file could not be created. Try again, or try the other format.`)
    } finally {
      setBusy(null)
    }
  }

  const downloadPdf = () =>
    run('pdf', async () => {
      // Taken before the module loads, while the view is exactly as the user sees it.
      const snapshot = captureSnapshot()
      const { downloadPartsPdf } = await import('../export/pdf')
      downloadPartsPdf({ ds: state.dataset, rows: rows(), scopeLabel: label, snapshot, date: today(), appUrl: appUrl() }, `u-bop-atlas-parts-${today()}.pdf`)
    })

  const downloadExcel = () =>
    run('excel', async () => {
      const { downloadPartsWorkbook } = await import('../export/xlsx')
      await downloadPartsWorkbook(state.dataset, rows(), label, `u-bop-atlas-parts-${today()}.xlsx`)
    })

  return (
    <>
      <div className="modal-head">
        <h2 id="export-title" className="heading" style={{ fontSize: 19, margin: 0 }}>Export parts list</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      <p className="muted" style={{ margin: '0 0 10px', fontSize: 13 }}>
        Every row carries its part number, the evidence level and the source page. Values that are not documented print as "{NOT_AVAILABLE}"
      </p>
      <fieldset className="scope-list">
        <legend className="muted">What to include</legend>
        {options.map((o) => (
          <label key={o.id} className="scope-option" data-disabled={counts[o.id] === 0}>
            <input type="radio" name="export-scope" value={o.id} checked={scope === o.id} disabled={counts[o.id] === 0} onChange={() => setScope(o.id)} />
            <span style={{ flex: 1 }}>{o.label}</span>
            <span className="muted mono">{counts[o.id]}</span>
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" style={{ color: 'var(--warn)', margin: '8px 0 0' }}>{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-primary" disabled={busy !== null || counts[scope] === 0} onClick={() => void downloadPdf()}>
          <Icon name="download" size={15} /> {busy === 'pdf' ? 'Preparing PDF...' : 'Download PDF'}
        </button>
        <button type="button" className="btn" disabled={busy !== null || counts[scope] === 0} onClick={() => void downloadExcel()}>
          <Icon name="download" size={15} /> {busy === 'excel' ? 'Preparing...' : 'Download Excel (.xlsx)'}
        </button>
      </div>
      <p className="muted" style={{ margin: '10px 0 0', fontSize: 12 }}>
        The PDF opens with a summary page and a picture of the current 3D view, then the bill of materials, the parts grouped by location, part number notes and the sources. The Excel file holds the same data in four sheets.
      </p>
    </>
  )
}

export function ExportDialog() {
  const open = useViewer((s) => s.dialog === 'export')
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="modal" aria-labelledby="export-title" onClose={close}>
      {open && <ExportBody />}
    </dialog>
  )
}
