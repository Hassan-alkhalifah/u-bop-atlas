import { useState } from 'react'
import { ANIMATIONS } from '../data/animations'
import { SYSTEMS, SYSTEM_IDS } from '../data/systems'
import { dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { EVIDENCE_COLORS } from '../viewer/evidence'
import { Icon, SourceLinks } from './ui'

export function ControlDock() {
  const explode = useViewer((s) => s.explode)
  const xray = useViewer((s) => s.xray)
  const evidence = useViewer((s) => s.provenanceMode)
  const systems = useViewer((s) => s.activeSystems)
  const playing = useViewer((s) => s.playingAnimation)
  const [anim, setAnim] = useState(ANIMATIONS[0].id)

  const toggleSystem = (id: (typeof SYSTEM_IDS)[number]) => {
    const next = new Set(systems)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    dispatch({ type: 'showSystems', systemIds: [...next] })
  }

  return (
    <div className="dock" role="toolbar" aria-label="View controls">
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 550 }}>
        Explode
        <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => dispatch({ type: 'setExplode', amount: Number(e.target.value) })} style={{ width: 110 }} aria-label="Explode amount" />
      </label>
      <div className="dock-sep" />
      <button type="button" className="btn" aria-pressed={xray} onClick={() => dispatch({ type: 'setXray', on: !xray })}>X-ray</button>
      <button type="button" className="btn" aria-pressed={evidence} onClick={() => dispatch({ type: 'setProvenanceMode', on: !evidence })} title="Colour parts by how well their part number is documented">
        Evidence
      </button>
      <div className="dock-sep" />
      <div style={{ display: 'flex', gap: 5 }} aria-label="Systems">
        {SYSTEM_IDS.map((id) => (
          <button key={id} type="button" className="chip" aria-pressed={systems.has(id)} onClick={() => toggleSystem(id)}>
            <span className="chip-dot" style={{ background: SYSTEMS[id].color }} />
            {SYSTEMS[id].name}
          </button>
        ))}
      </div>
      <div className="dock-sep" />
      <select className="field" value={anim} onChange={(e) => setAnim(e.target.value)} aria-label="Animation">
        {ANIMATIONS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {playing ? (
        <button type="button" className="btn" onClick={() => dispatch({ type: 'stopAnimation' })}><Icon name="stop" size={14} /> Stop</button>
      ) : (
        <button type="button" className="btn" onClick={() => dispatch({ type: 'playAnimation', id: anim })}><Icon name="play" size={14} /> Play</button>
      )}
      <button type="button" className="icon-btn" aria-label="Reset view" title="Reset view" onClick={() => dispatch({ type: 'resetView' })}>
        <Icon name="reset" />
      </button>
    </div>
  )
}

export function EvidenceBar() {
  const evidence = useViewer((s) => s.provenanceMode)
  const playing = useViewer((s) => s.playingAnimation)
  const anim = ANIMATIONS.find((a) => a.id === playing)
  return (
    <div className="evidence-bar" role="note">
      <strong>Educational reconstruction, not Cameron or SLB CAD.</strong> Shapes and sizes are approximations arranged after the catalog drawings; part data cites its source. Paint and surface finishes are illustrative, not material data. Not affiliated with or endorsed by SLB or Cameron.
      {evidence && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
          {([['A', 'OEM part number'], ['B', 'OEM, print anomaly'], ['C', 'Third-party only'], ['none', 'No part number']] as const).map(([k, label]) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span className="chip-dot" style={{ background: EVIDENCE_COLORS[k] }} />
              {label}
            </span>
          ))}
        </div>
      )}
      {anim && (
        <div style={{ marginTop: 6 }}>
          <strong>Playing:</strong> {anim.name}. {anim.basis.value} <SourceLinks refs={anim.basis.sources} />
        </div>
      )}
    </div>
  )
}
