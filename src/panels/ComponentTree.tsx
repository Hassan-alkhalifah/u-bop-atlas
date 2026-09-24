import { useMemo, useState } from 'react'
import type { Assembly, ComponentInstance } from '../data/types'
import { componentsInAssembly, dispatch } from '../state/commands'
import { isVisible, useViewer } from '../state/store'
import { Balloon, balloonText, Icon } from './ui'

interface Node {
  assembly: Assembly
  children: Node[]
  components: ComponentInstance[]
}

function buildTree(assemblies: Assembly[], components: ComponentInstance[]): Node | null {
  const nodes = new Map<string, Node>(assemblies.map((a) => [a.id, { assembly: a, children: [], components: [] }]))
  for (const a of assemblies) if (a.parentId) nodes.get(a.parentId)?.children.push(nodes.get(a.id)!)
  for (const c of components) nodes.get(c.assemblyId)?.components.push(c)
  for (const n of nodes.values()) n.components.sort((x, y) => (x.catalogItem ?? 99) - (y.catalogItem ?? 99))
  return nodes.get('bop') ?? null
}

function ComponentRow({ c, depth }: { c: ComponentInstance; depth: number }) {
  const selected = useViewer((s) => s.selectedId === c.id)
  const visible = useViewer((s) => isVisible(s, c.id))
  const hasGeometry = c.geometry.meshes.length > 0
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        className={`tree-row ${visible ? '' : 'is-hidden'}`}
        style={{ ['--depth' as string]: depth }}
        aria-selected={selected}
        onClick={() => {
          dispatch({ type: 'selectComponent', id: c.id })
          if (hasGeometry) dispatch({ type: 'focusCamera', id: c.id })
          // On phones, close the sheet so the part (and its card) is visible.
          if (window.matchMedia('(max-width: 900px)').matches) useViewer.setState({ mobileSheet: 'closed' })
        }}
        onMouseEnter={() => useViewer.setState({ hoveredId: c.id })}
        onMouseLeave={() => useViewer.setState({ hoveredId: null })}
      >
        <Balloon n={balloonText(c)} size="sm" />
        <span className="tree-label">{c.name}</span>
        {!hasGeometry && <span className="muted" style={{ fontSize: 11 }}>no geometry</span>}
      </button>
      {hasGeometry && (
        <button
          type="button"
          className="icon-btn"
          aria-label={visible ? `Hide ${c.name}` : `Show ${c.name}`}
          onClick={() => {
            const s = useViewer.getState()
            if (s.hidden.has(c.id)) {
              const next = new Set(s.hidden)
              next.delete(c.id)
              useViewer.setState({ hidden: next })
            } else dispatch({ type: 'hideComponents', ids: [c.id] })
          }}
        >
          <Icon name={visible ? 'eye' : 'eyeOff'} size={15} />
        </button>
      )}
    </div>
  )
}

function AssemblyNode({ node, depth, defaultOpen }: { node: Node; depth: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const ds = useViewer((s) => s.dataset)
  const count = useMemo(() => componentsInAssembly(ds, node.assembly.id).length, [ds, node.assembly.id])
  const isTopAssembly = depth === 1
  return (
    <div role="group">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button type="button" className="tree-row tree-group" style={{ ['--depth' as string]: depth - 1 }} aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="chevron" size={14} rotate={open ? 90 : 0} />
          <span className="tree-label">{node.assembly.name}</span>
          <span className="muted" style={{ fontSize: 11.5, fontWeight: 450 }}>{count}</span>
        </button>
        {isTopAssembly && (
          <button type="button" className="icon-btn" aria-label={`Isolate ${node.assembly.name}`} title="Isolate" onClick={() => {
            dispatch({ type: 'isolateComponents', ids: componentsInAssembly(ds, node.assembly.id) })
            dispatch({ type: 'focusCamera', id: node.assembly.id })
          }}>
            <Icon name="isolate" size={15} />
          </button>
        )}
      </div>
      {open && (
        <div>
          {node.children.map((ch) => (
            <AssemblyNode key={ch.assembly.id} node={ch} depth={depth + 1} defaultOpen={false} />
          ))}
          {node.components.map((c) => (
            <ComponentRow key={c.id} c={c} depth={depth} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ComponentTree() {
  const ds = useViewer((s) => s.dataset)
  const root = useMemo(() => buildTree(ds.assemblies, ds.components), [ds])
  if (!root) return null
  return (
    <nav aria-label="Component tree" className="scroll" style={{ padding: '6px 0 24px' }}>
      <div style={{ padding: '6px 12px 8px' }}>
        <div className="heading" style={{ fontSize: 15 }}>{root.assembly.name}</div>
        <div className="muted" style={{ fontSize: 12 }}>Numbers are catalog item numbers from the Cameron exploded view SD17500. Labels such as 3A come from the large-bore shear bonnet table (p.18); TB labels from the tandem booster list (p.21).</div>
      </div>
      {root.children.map((n) => (
        <AssemblyNode key={n.assembly.id} node={n} depth={1} defaultOpen={false} />
      ))}
    </nav>
  )
}
