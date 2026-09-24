import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { configSummary, DISCLAIMER, partRows, scopeIds, selectedTopAssembly, type ExportScope, type PartRow } from '../export/parts-list'
import { NOT_AVAILABLE } from '../data/sources'
import { useViewer } from '../state/store'
import { Icon } from './ui'

export interface PrintJob {
  summary: string
  scopeLabel: string
  rows: PartRow[]
  snapshot: string | null
  date: string
}

/** The sheet the print stylesheet shows; set just before window.print(). */
export const usePrintJob = create<{ job: PrintJob | null }>(() => ({ job: null }))

function snapshot(): string | null {
  const canvas = document.querySelector<HTMLCanvasElement>('.app-view canvas')
  try {
    return canvas ? canvas.toDataURL('image/jpeg', 0.9) : null
  } catch {
    return null
  }
}

const today = () => new Date().toISOString().slice(0, 10)
const close = () => useViewer.setState({ dialog: null })

/** Mounted only while the dialog is open, so it can follow the whole viewer state without cost when closed. */
function ExportBody() {
  const state = useViewer()
  const assembly = selectedTopAssembly(state)
  const [scope, setScope] = useState<ExportScope>(() => (assembly ? 'assembly' : 'all'))
  const [busy, setBusy] = useState(false)
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

  const downloadExcel = async () => {
    setBusy(true)
    setError(null)
    try {
      const { downloadPartsWorkbook } = await import('../export/xlsx')
      await downloadPartsWorkbook(state.dataset, rows(), label, `u-bop-atlas-parts-${today()}.xlsx`)
    } catch (e: unknown) {
      console.error('[export] Excel export failed', e)
      setError('The Excel file could not be created. Try again, or use Print.')
    } finally {
      setBusy(false)
    }
  }

  const print = () => {
    usePrintJob.setState({ job: { summary: configSummary(state.dataset), scopeLabel: label, rows: rows(), snapshot: snapshot(), date: today() } })
    close()
    // Two frames: the dialog closes and the sheet renders before the print dialog captures the page.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
  }

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
        <button type="button" className="btn btn-primary" disabled={busy || counts[scope] === 0} onClick={() => void downloadExcel()}>
          <Icon name="download" size={15} /> {busy ? 'Preparing...' : 'Download Excel (.xlsx)'}
        </button>
        <button type="button" className="btn" disabled={counts[scope] === 0} onClick={print}>
          <Icon name="print" size={15} /> Print or save as PDF
        </button>
      </div>
      <p className="muted" style={{ margin: '10px 0 0', fontSize: 12 }}>
        The Excel file has four sheets: parts by location, bill of materials, sources and an about page. The printed sheet includes a picture of the current 3D view; choose "Save as PDF" in the print dialog for a PDF file.
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

export function PrintSheet() {
  const job = usePrintJob((s) => s.job)
  useEffect(() => {
    const clear = () => usePrintJob.setState({ job: null })
    window.addEventListener('afterprint', clear)
    return () => window.removeEventListener('afterprint', clear)
  }, [])
  if (!job) return null
  return (
    <div className="print-sheet">
      <header className="print-head">
        <div>
          <h1 className="heading" style={{ margin: 0, fontSize: 22 }}>U BOP Atlas parts list</h1>
          <div>{job.summary}</div>
          <div className="muted">
            Scope: {job.scopeLabel}. {job.rows.length} rows. Printed {job.date}.
          </div>
        </div>
        {job.snapshot && <img src={job.snapshot} alt="Current 3D view" className="print-shot" />}
      </header>
      <table className="print-table">
        <thead>
          <tr>
            <th>Location</th>
            <th>Item</th>
            <th>Name</th>
            <th>Part number</th>
            <th>Evidence</th>
            <th>Catalog quantity</th>
            <th>Spare</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {job.rows.map((r) => (
            <tr key={r.id}>
              <td>{r.location}</td>
              <td>{r.item}</td>
              <td>{r.name}</td>
              <td className="mono">{r.partNumber}</td>
              <td>{r.evidence}</td>
              <td>{r.quantity}</td>
              <td>{r.spare}</td>
              <td>{r.sources}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer className="print-foot">The 3D model is an educational reconstruction, not Cameron or SLB CAD. {DISCLAIMER}</footer>
    </div>
  )
}
