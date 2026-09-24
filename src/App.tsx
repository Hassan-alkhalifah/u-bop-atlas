import { lazy, Suspense } from 'react'
import { AssistantPanel } from './panels/AssistantPanel'
import { ComponentTree } from './panels/ComponentTree'
import { ConfigPanel } from './panels/ConfigPanel'
import { ControlDock, EvidenceBar } from './panels/ControlDock'
import { DetailPanel } from './panels/DetailPanel'
import { ExportDialog } from './panels/ExportDialog'
import { HeaderActions } from './panels/HeaderActions'
import { LearnPanel } from './panels/LearnPanel'
import { SelectionCard, SheetHead } from './panels/MobileParts'
import { SearchBar } from './panels/SearchBar'
import { Icon } from './panels/ui'
import { useViewer, type PanelTab } from './state/store'

const Scene = lazy(() => import('./viewer/Scene').then((m) => ({ default: m.Scene })))

const TAB_LABEL: Record<PanelTab, string> = { details: 'Details', assistant: 'Assistant', learn: 'Learn' }

function SideTabs() {
  const tab = useViewer((s) => s.panelTab)
  const set = (t: PanelTab) => useViewer.setState({ panelTab: t })
  const panel = (t: PanelTab) => ({ display: tab === t ? 'flex' : 'none', flexDirection: 'column' as const, flex: 1, minHeight: 0 })
  return (
    <>
      <SheetHead title={TAB_LABEL[tab]} />
      <div className="tabs" role="tablist">
        {(['details', 'assistant', 'learn'] as const).map((t) => (
          <button key={t} type="button" role="tab" id={`tab-${t}`} aria-controls={`panel-${t}`} className="tab" aria-selected={tab === t} onClick={() => set(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      <div style={panel('details')} role="tabpanel" id="panel-details" aria-labelledby="tab-details">
        <DetailPanel />
      </div>
      <div style={panel('assistant')} role="tabpanel" id="panel-assistant" aria-labelledby="tab-assistant">
        <AssistantPanel />
      </div>
      <div style={panel('learn')} role="tabpanel" id="panel-learn" aria-labelledby="tab-learn">
        <LearnPanel />
      </div>
    </>
  )
}

function MobileNav() {
  const sheet = useViewer((s) => s.mobileSheet)
  const tab = useViewer((s) => s.panelTab)
  const open = (next: 'tree' | PanelTab) => {
    if (next === 'tree') useViewer.setState({ mobileSheet: sheet === 'tree' ? 'closed' : 'tree' })
    else {
      const same = sheet === 'panel' && tab === next
      useViewer.setState({ mobileSheet: same ? 'closed' : 'panel', panelTab: next })
    }
  }
  return (
    <nav className="mobile-nav" aria-label="Panels">
      <button type="button" aria-pressed={sheet === 'tree'} onClick={() => open('tree')}><Icon name="isolate" size={18} />Parts</button>
      <button type="button" aria-pressed={sheet === 'panel' && tab === 'details'} onClick={() => open('details')}><Icon name="focus" size={18} />Details</button>
      <button type="button" aria-pressed={sheet === 'panel' && tab === 'assistant'} onClick={() => open('assistant')}><Icon name="send" size={18} />Assistant</button>
      <button type="button" aria-pressed={sheet === 'panel' && tab === 'learn'} onClick={() => open('learn')}><Icon name="book" size={18} />Learn</button>
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
        <HeaderActions />
      </header>
      <aside className="app-tree" aria-label="Parts">
        <SheetHead title="Parts and setup" />
        <ConfigPanel />
        <ComponentTree />
      </aside>
      <main className="app-view">
        <Suspense fallback={<div style={{ padding: 20 }} className="muted">Loading the 3D model...</div>}>
          <Scene />
        </Suspense>
        <EvidenceBar />
        <SelectionCard />
        <ControlDock />
      </main>
      <aside className="app-side" aria-label="Details and assistant">
        <SideTabs />
      </aside>
      <MobileNav />
      <ExportDialog />
    </div>
  )
}


