import { SELECTABLE_PIPE_SIZES } from '../data/catalog'
import type { BopConfig, CavityId, RamKind } from '../data/types'
import { dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { PAINTS, type PaintId } from '../viewer/paints'

const encode = (k: RamKind) => (k.type === 'pipe' ? `pipe:${k.pipeSize}` : k.type)
const decode = (v: string): RamKind => (v.startsWith('pipe:') ? { type: 'pipe', pipeSize: v.slice(5) } : v === 'blind' ? { type: 'blind' } : { type: 'sbr' })

function RamSelect({ cavity, config }: { cavity: CavityId; config: BopConfig }) {
  const id = `ram-${cavity}`
  return (
    <label htmlFor={id} style={{ display: 'grid', gap: 3, fontSize: 12 }}>
      <span className="muted">{config.stack === 'double' ? `${cavity === 'upper' ? 'Upper' : 'Lower'} rams` : 'Rams'}</span>
      <select
        id={id}
        className="field"
        value={encode(config.rams[cavity])}
        onChange={(e) => dispatch({ type: 'setConfig', config: { ...config, rams: { ...config.rams, [cavity]: decode(e.target.value) } } })}
      >
        <optgroup label="Pipe rams (catalog p.43)">
          {SELECTABLE_PIPE_SIZES.map((s) => (
            <option key={s} value={`pipe:${s}`}>
              Pipe ram, {s} in pipe
            </option>
          ))}
        </optgroup>
        <option value="blind">Blind ram (p.43)</option>
        <option value="sbr">Shearing blind ram (p.48)</option>
      </select>
    </label>
  )
}

function DisplayOptions() {
  const paint = useViewer((s) => s.paint)
  const quality = useViewer((s) => s.quality)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <label htmlFor="paint" style={{ display: 'grid', gap: 3, fontSize: 12 }}>
        <span className="muted">Paint (illustrative)</span>
        <select id="paint" className="field" value={paint} onChange={(e) => useViewer.setState({ paint: e.target.value as PaintId })}>
          {(Object.keys(PAINTS) as PaintId[]).map((p) => (
            <option key={p} value={p}>{PAINTS[p].label}</option>
          ))}
        </select>
      </label>
      <label htmlFor="quality" style={{ display: 'grid', gap: 3, fontSize: 12 }}>
        <span className="muted">Rendering</span>
        <select id="quality" className="field" value={quality} onChange={(e) => useViewer.setState({ quality: e.target.value as 'high' | 'standard' })}>
          <option value="high">High quality</option>
          <option value="standard">Standard (faster)</option>
        </select>
      </label>
    </div>
  )
}

export function ConfigPanel() {
  const config = useViewer((s) => s.dataset.config)
  return (
    <div style={{ padding: 12, borderBottom: '1px solid var(--rule)', display: 'grid', gap: 8 }}>
      <div role="radiogroup" aria-label="Stack" style={{ display: 'flex', gap: 6 }}>
        {(['double', 'single'] as const).map((s) => (
          <button key={s} type="button" className="btn" style={{ flex: 1 }} aria-pressed={config.stack === s} onClick={() => dispatch({ type: 'setConfig', config: { ...config, stack: s } })}>
            {s === 'double' ? 'Double BOP' : 'Single BOP'}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        <RamSelect cavity="upper" config={config} />
        {config.stack === 'double' && <RamSelect cavity="lower" config={config} />}
      </div>
      <DisplayOptions />
    </div>
  )
}
