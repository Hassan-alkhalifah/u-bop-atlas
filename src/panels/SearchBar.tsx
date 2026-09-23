import { useMemo, useState } from 'react'
import { locationLabel } from '../data/build-bonnet'
import { searchComponents } from '../data/search'
import { dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { Balloon } from './ui'

export function SearchBar() {
  const ds = useViewer((s) => s.dataset)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const hits = useMemo(() => searchComponents(ds, q, 14), [ds, q])

  const choose = (id: string) => {
    dispatch({ type: 'selectComponent', id })
    const c = ds.byId.get(id)
    if (c?.geometry.meshes.length) dispatch({ type: 'focusCamera', id })
    setOpen(false)
    setQ('')
    if (window.matchMedia('(max-width: 900px)').matches) useViewer.setState({ mobileSheet: 'closed' })
  }

  return (
    <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 520 }}>
      <input
        className="field"
        style={{ width: '100%', height: 36 }}
        type="search"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls="search-results"
        aria-label="Search parts by name or part number"
        placeholder="Search parts by name, item or part number"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, hits.length - 1))
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
          else if (e.key === 'Enter' && hits[active]) choose(hits[active].component.id)
          else if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && q.trim() && (
        <div id="search-results" role="listbox" className="search-pop">
          {hits.length === 0 && <div className="muted" style={{ padding: 12 }}>No part matches "{q}". Try a catalog name such as "bonnet seal" or a part number.</div>}
          {hits.map((h, i) => {
            const c = h.component
            return (
              <button key={c.id} type="button" role="option" aria-selected={i === active} className="search-hit" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(c.id)}>
                <Balloon n={c.catalogItem} size="sm" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 550 }}>{c.name}</span>
                  <span className="muted" style={{ fontSize: 12, textTransform: 'capitalize' }}>{c.cavity && c.side ? locationLabel(c.cavity, c.side, ds.config.stack) : 'body'}</span>
                </span>
                <span className="mono muted">{c.partNumber?.value ?? ''}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
