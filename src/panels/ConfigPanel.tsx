import { BONNET_TYPE_LABEL } from '../data/build-bonnet'
import { RAM_PAGE } from '../data/build-ram'
import { FLEXPACKER_NR_ROWS, SELECTABLE_PIPE_SIZES, VBR_ROWS } from '../data/catalog'
import { decodeBonnetType, decodeRamKind, encodeBonnetType, encodeRamKind } from '../data/config-codec'
import type { BonnetType, BopConfig, CavityId } from '../data/types'
import { dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { PAINTS, type PaintId } from '../viewer/paints'

const BONNET_PAGE: Record<BonnetType, number> = { standard: 12, largeBoreShear: 18, tandemBooster: 21 }
const BONNET_TYPES = Object.keys(BONNET_TYPE_LABEL) as BonnetType[]

function CavitySetup({ cavity, config }: { cavity: CavityId; config: BopConfig }) {
  const ramId = `ram-${cavity}`
  const bonnetId = `bonnet-${cavity}`
  const title = config.stack === 'double' ? `${cavity === 'upper' ? 'Upper' : 'Lower'} cavity` : 'Ram cavity'
  const kind = config.rams[cavity]
  const bonnet = config.bonnets[cavity]
  const set = (next: Partial<Pick<BopConfig, 'rams' | 'bonnets'>>) => dispatch({ type: 'setConfig', config: { ...config, ...next } })
  return (
    <fieldset className="cavity-setup">
      <legend className="muted">{title}</legend>
      <label htmlFor={ramId} className="field-label">
        <span className="muted">Rams</span>
        <select
          id={ramId}
          className="field"
          value={encodeRamKind(kind)}
          onChange={(e) => {
            const next = decodeRamKind(e.target.value)
            if (next) set({ rams: { ...config.rams, [cavity]: next } })
          }}
        >
          <optgroup label="Pipe rams (catalog p.43)">
            {SELECTABLE_PIPE_SIZES.map((s) => (
              <option key={s} value={encodeRamKind({ type: 'pipe', pipeSize: s })}>Pipe ram, {s} in pipe</option>
            ))}
          </optgroup>
          <optgroup label="Variable bore rams (p.54)">
            {VBR_ROWS.map((r) => (
              <option key={r.id} value={encodeRamKind({ type: 'vbr', id: r.id })}>
                {r.highTemp ? 'VBR-II extended range high temp' : 'VBR-II'}, {r.range}
              </option>
            ))}
          </optgroup>
          <optgroup label="FLEXPACKER-NR (p.55)">
            {FLEXPACKER_NR_ROWS.map((r) => (
              <option key={r.id} value={encodeRamKind({ type: 'flexpacker', id: r.id })}>FLEXPACKER-NR, {r.range}</option>
            ))}
          </optgroup>
          <optgroup label="Blind and shear rams">
            <option value="blind">Blind ram (p.43)</option>
            <option value="sbr">Shearing blind ram, SBR (p.48)</option>
            <option value="isr">Interlocking shear ram, ISR (p.52)</option>
          </optgroup>
        </select>
      </label>
      <label htmlFor={bonnetId} className="field-label">
        <span className="muted">Bonnets</span>
        <select
          id={bonnetId}
          className="field"
          value={encodeBonnetType(bonnet)}
          onChange={(e) => {
            const next = decodeBonnetType(e.target.value)
            if (next) set({ bonnets: { ...config.bonnets, [cavity]: next } })
          }}
        >
          {BONNET_TYPES.map((t) => (
            <option key={t} value={encodeBonnetType(t)}>{BONNET_TYPE_LABEL[t]} (p.{BONNET_PAGE[t]})</option>
          ))}
        </select>
      </label>
      <p className="muted setup-note">Part numbers: catalog p.{RAM_PAGE[kind.type]} (rams), p.{BONNET_PAGE[bonnet]} (bonnets).</p>
    </fieldset>
  )
}

function DisplayOptions() {
  const paint = useViewer((s) => s.paint)
  const quality = useViewer((s) => s.quality)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <label htmlFor="paint" className="field-label">
        <span className="muted">Paint (illustrative)</span>
        <select id="paint" className="field" value={paint} onChange={(e) => dispatch({ type: 'setPaint', paint: e.target.value as PaintId })}>
          {(Object.keys(PAINTS) as PaintId[]).map((p) => (
            <option key={p} value={p}>{PAINTS[p].label}</option>
          ))}
        </select>
      </label>
      <label htmlFor="quality" className="field-label">
        <span className="muted">Rendering</span>
        <select id="quality" className="field" value={quality} onChange={(e) => dispatch({ type: 'setQuality', quality: e.target.value as 'high' | 'standard' })}>
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
      <CavitySetup cavity="upper" config={config} />
      {config.stack === 'double' && <CavitySetup cavity="lower" config={config} />}
      <DisplayOptions />
    </div>
  )
}
