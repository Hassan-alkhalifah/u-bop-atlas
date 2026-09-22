import { lazy, Suspense } from 'react'
import { AssistantPanel } from './panels/AssistantPanel'
import { ComponentTree } from './panels/ComponentTree'
import { ConfigPanel } from './panels/ConfigPanel'
import { ControlDock, EvidenceBar } from './panels/ControlDock'
import { DetailPanel } from './panels/DetailPanel'
import { SearchBar } from './panels/SearchBar'
import { useViewer, type PanelTab } from './state/store'

const Scene = lazy(() => import('./viewer/Scene').then((m) => ({ default: m.Scene })))

function SideTabs() {
  const tab = useViewer((s) => s.panelTab)
  const set = (t: PanelTab) => useViewer.setState({ panelTab: t })
  return (
    <>
      <div className="tabs" role="tablist">
        {(['details', 'assistant'] as const).map((t) => (
          <button key={t} type="button" role="tab" className="tab" aria-selected={tab === t} onClick={() => set(t)}>
            {t === 'details' ? 'Details' : 'Assistant'}
          </button>
        ))}
      </div>
      <div style={{ display: tab === 'details' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }} role="tabpanel">
        <DetailPanel />
      </div>
      <div style={{ display: tab === 'assistant' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }} role="tabpanel">
        <AssistantPanel />
      </div>
    </>
  )
}

function MobileNav() {
  const sheet = useViewer((s) => s.mobileSheet)
  const tab = useViewer((s) => s.panelTab)
  const open = (next: 'tree' | 'details' | 'assistant') => {
    if (next === 'tree') useViewer.setState({ mobileSheet: sheet === 'tree' ? 'closed' : 'tree' })
    else {
      const same = sheet === 'panel' && tab === next
      useViewer.setState({ mobileSheet: same ? 'closed' : 'panel', panelTab: next })
    }
  }
  return (
    <nav className="mobile-nav" aria-label="Panels">
      <button type="button" aria-pressed={sheet === 'tree'} onClick={() => open('tree')}>Parts</button>
      <button type="button" aria-pressed={sheet === 'panel' && tab === 'details'} onClick={() => open('details')}>Details</button>
      <button type="button" aria-pressed={sheet === 'panel' && tab === 'assistant'} onClick={() => open('assistant')}>Assistant</button>
    </nav>
  )
}

export function App() {
  const sheet = useViewer((s) => s.mobileSheet)
  return (
    <div className="app" data-sheet={sheet}>
      <header className="app-head">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flex: 'none' }}>
          <h1 className="heading" style={{ fontSize: 19, margin: 0 }}>U BOP Atlas</h1>
          <span className="muted hide-mobile" style={{ fontSize: 12.5 }}>Cameron U ram-type BOP, 13-5/8 in, 10,000 psi</span>
        </div>
        <SearchBar />
      </header>
      <aside className="app-tree" aria-label="Parts">
        <ConfigPanel />
        <ComponentTree />
      </aside>
      <main className="app-view">
        <Suspense fallback={<div style={{ padding: 20 }} className="muted">Loading the 3D model...</div>}>
          <Scene />
        </Suspense>
        <EvidenceBar />
        <ControlDock />
      </main>
      <aside className="app-side" aria-label="Details and assistant">
        <SideTabs />
      </aside>
      <MobileNav />
    </div>
  )
}
