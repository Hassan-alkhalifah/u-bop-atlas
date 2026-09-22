import { locationLabel } from '../data/build-bonnet'
import { NOT_AVAILABLE } from '../data/sources'
import { SYSTEMS } from '../data/systems'
import type { ComponentInstance } from '../data/types'
import { PARAMS } from '../geometry/params'
import { dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { Balloon, ClaimView, ConfidenceBadge, Icon } from './ui'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="fact">
      <h3 className="fact-label" style={{ margin: '0 0 3px', fontWeight: 500 }}>{label}</h3>
      {children}
    </section>
  )
}

function Connections({ c }: { c: ComponentInstance }) {
  const ds = useViewer((s) => s.dataset)
  const links = ds.connections.filter((k) => k.from === c.id || k.to === c.id)
  if (!links.length) return <span className="na">No connections recorded.</span>
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
      {links.map((k) => {
        const other = ds.byId.get(k.from === c.id ? k.to : k.from)!
        return (
          <li key={k.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Balloon n={other.catalogItem} size="sm" />
            <div style={{ minWidth: 0 }}>
              <button type="button" onClick={() => dispatch({ type: 'selectComponent', id: other.id })} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontWeight: 550 }}>
                {other.name}
              </button>
              <div className="muted" style={{ fontSize: 12 }}>
                {k.kind.replace('-', ' ')}. {k.basis.value}
              </div>
              <ConfidenceBadge c={k.basis.confidence} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function GeometryFacts({ c }: { c: ComponentInstance }) {
  const t2 = Object.values(PARAMS).filter((p) => p.tier === 'T2')
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <span className="tier" style={{ color: 'var(--ev-b)' }}>{c.geometry.tier} Educational approximation</span>
      </div>
      <div style={{ fontSize: 13 }}>{c.geometry.tierNote}</div>
      {c.id === 'body' && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5 }}>
          {t2.map((p) => (
            <li key={p.id}>
              {p.label}: {p.value} in (T2)
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DetailPanel() {
  const c = useViewer((s) => (s.selectedId ? s.dataset.byId.get(s.selectedId) : undefined))
  const config = useViewer((s) => s.dataset.config)
  const showingLinks = useViewer((s) => s.showConnectionsFor === c?.id)

  if (!c) {
    return (
      <div className="scroll" style={{ padding: 20 }}>
        <h2 className="heading" style={{ fontSize: 20, margin: '0 0 8px' }}>Select a part</h2>
        <p style={{ margin: '0 0 12px' }}>Click a part in the model or the tree to see its catalog part number, documented function and sources.</p>
        <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
          Every value shows where it comes from. A blank value says "{NOT_AVAILABLE}"; nothing is filled in by estimate.
        </p>
        <h3 className="heading" style={{ fontSize: 15, margin: '18px 0 8px' }}>Evidence levels</h3>
        <div style={{ display: 'grid', gap: 6 }}>
          {(['A', 'B', 'C', 'D'] as const).map((k) => (
            <ConfidenceBadge key={k} c={k} />
          ))}
        </div>
      </div>
    )
  }

  const loc = c.cavity && c.side ? locationLabel(c.cavity, c.side, config.stack) : 'Body and connections'
  const ids = [c.id]
  return (
    <div className="scroll" style={{ padding: '16px 18px 28px' }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
        <Balloon n={c.catalogItem} size="lg" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 className="heading" style={{ fontSize: 21, lineHeight: 1.15, margin: 0 }}>{c.name}</h2>
          <div className="muted" style={{ fontSize: 13, textTransform: 'capitalize' }}>{loc}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {c.systemIds.map((s) => (
              <span key={s} className="chip" style={{ height: 22, cursor: 'default' }}>
                <span className="chip-dot" style={{ background: SYSTEMS[s].color }} />
                {SYSTEMS[s].name}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="Close details" onClick={() => dispatch({ type: 'selectComponent', id: null })}>
          <Icon name="close" />
        </button>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 12px' }}>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'focusCamera', id: c.id })} disabled={!c.geometry.meshes.length}><Icon name="focus" size={15} /> Focus</button>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'isolateComponents', ids })} disabled={!c.geometry.meshes.length}><Icon name="isolate" size={15} /> Isolate</button>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'hideComponents', ids })} disabled={!c.geometry.meshes.length}><Icon name="eyeOff" size={15} /> Hide</button>
        <button type="button" className="btn" aria-pressed={showingLinks} onClick={() => dispatch({ type: 'showConnections', id: showingLinks ? null : c.id })}><Icon name="link" size={15} /> Connections</button>
        {c.cavity && (
          <button type="button" className="btn" onClick={() => dispatch({ type: 'explodeAssembly', assemblyId: c.assemblyId.split('/')[0], amount: 1 })}><Icon name="explode" size={15} /> Explode assembly</button>
        )}
      </div>

      <Fact label="Part number (13-5/8 in 10,000 psi)">
        <ClaimView claim={c.partNumber} mono />
      </Fact>
      <Fact label="Quantity">
        <ClaimView claim={c.quantity} />
      </Fact>
      <Fact label="Documented function">
        {c.functionText.length ? <div style={{ display: 'grid', gap: 10 }}>{c.functionText.map((f, i) => <ClaimView key={i} claim={f} />)}</div> : <ClaimView claim={null} />}
      </Fact>
      <Fact label="Material">
        <ClaimView claim={c.material} />
      </Fact>
      <Fact label="Documented dimensions and values">
        {c.documentedDimensions.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {c.documentedDimensions.map((d) => (
              <div key={d.label}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{d.label}</div>
                <ClaimView claim={d.claim} />
              </div>
            ))}
          </div>
        ) : (
          <ClaimView claim={null} />
        )}
      </Fact>
      <Fact label="Drawing">
        <ClaimView claim={c.drawing} />
      </Fact>
      <Fact label="Recommended spare part">
        <ClaimView claim={c.recommendedSpare ? { value: c.recommendedSpare.value ? 'Yes, marked * on SD17500' : 'Not marked as a recommended spare', sources: c.recommendedSpare.sources, confidence: c.recommendedSpare.confidence } : null} />
      </Fact>
      {c.kits.length > 0 && (
        <Fact label="Included in kit">
          {c.kits.map((k, i) => <ClaimView key={i} claim={k} />)}
        </Fact>
      )}
      <Fact label="3D geometry">
        <GeometryFacts c={c} />
      </Fact>
      {c.notes.length > 0 && (
        <Fact label="Notes">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            {c.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </Fact>
      )}
      <Fact label="Connections">
        <Connections c={c} />
      </Fact>
      <div className="mono muted" style={{ marginTop: 14, fontSize: 11 }}>id: {c.id}</div>
    </div>
  )
}
