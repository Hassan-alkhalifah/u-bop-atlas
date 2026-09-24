// Share links: the current view encoded in the URL query, and restored on load.
// Everything read from a link is untrusted: codes are checked against the catalog, ids against the dataset
// (by dispatch), numbers are clamped and list sizes capped.
import { decodeBonnetType, decodeRamKind, encodeBonnetType, encodeRamKind } from '../data/config-codec'
import { SYSTEM_IDS } from '../data/systems'
import type { BopConfig, CavityId, SystemId } from '../data/types'
import type { CameraPose } from '../viewer/camera-bridge'
import { PAINTS, type PaintId } from '../viewer/paints'
import { dispatch, type Command } from './commands'
import type { ViewerState } from './store'

const MAX_IDS = 400
const ID_PATTERN = /^[A-Za-z0-9\-/]{1,64}$/
const CAVITIES: CavityId[] = ['upper', 'lower']

const round = (n: number, digits = 1) => Number(n.toFixed(digits))
const list = (ids: Iterable<string>) => [...ids].join(',')

export function buildShareParams(s: ViewerState, camera: CameraPose | null): URLSearchParams {
  const c = s.dataset.config
  const p = new URLSearchParams()
  p.set('stack', c.stack)
  for (const cav of CAVITIES) {
    p.set(cav, encodeRamKind(c.rams[cav]))
    p.set(`${cav}Bonnet`, encodeBonnetType(c.bonnets[cav]))
  }
  if (s.selectedId) p.set('part', s.selectedId)
  if (s.explode > 0) p.set('explode', String(round(s.explode, 2)))
  const asm = Object.entries(s.assemblyExplode).filter(([, v]) => v > 0)
  if (asm.length) p.set('asm', asm.map(([id, v]) => `${id}:${round(v, 2)}`).join(','))
  if (s.xray) p.set('xray', '1')
  if (s.provenanceMode) p.set('evidence', '1')
  if (s.paint !== 'grey') p.set('paint', s.paint)
  if (s.activeSystems.size) p.set('systems', list(s.activeSystems))
  if (s.isolated) p.set('isolate', list(s.isolated))
  if (s.hidden.size) p.set('hide', list(s.hidden))
  if (camera) p.set('cam', [...camera.position, ...camera.target].map((n) => round(n)).join(','))
  return p
}

export interface SharedView {
  config: BopConfig
  commands: Command[]
}

function ids(value: string | null): string[] {
  if (!value) return []
  return value.split(',').filter((id) => ID_PATTERN.test(id)).slice(0, MAX_IDS)
}

function unit(value: string | null): number | null {
  if (value === null) return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null
}

function camera(value: string | null): CameraPose | null {
  if (!value) return null
  const n = value.split(',').map(Number)
  if (n.length !== 6 || n.some((x) => !Number.isFinite(x) || Math.abs(x) > 4000)) return null
  return { position: [n[0], n[1], n[2]], target: [n[3], n[4], n[5]] }
}

function config(p: URLSearchParams, base: BopConfig): BopConfig {
  const stack = p.get('stack') === 'single' ? 'single' : p.get('stack') === 'double' ? 'double' : base.stack
  const rams = { ...base.rams }
  const bonnets = { ...base.bonnets }
  for (const cav of CAVITIES) {
    const ram = decodeRamKind(p.get(cav) ?? '')
    if (ram) rams[cav] = ram
    const bonnet = decodeBonnetType(p.get(`${cav}Bonnet`) ?? '')
    if (bonnet) bonnets[cav] = bonnet
  }
  return { stack, rams, bonnets }
}

const KNOWN_KEYS = ['stack', 'upper', 'lower', 'upperBonnet', 'lowerBonnet', 'part', 'explode', 'asm', 'xray', 'evidence', 'paint', 'systems', 'isolate', 'hide', 'cam']

/** Parses a share link. Returns null when the query holds none of our keys (a plain visit). */
export function parseShareParams(p: URLSearchParams, base: BopConfig): SharedView | null {
  if (!KNOWN_KEYS.some((k) => p.has(k))) return null
  const commands: Command[] = []
  const explode = unit(p.get('explode'))
  if (explode !== null) commands.push({ type: 'setExplode', amount: explode })
  for (const entry of (p.get('asm') ?? '').split(',').slice(0, 40)) {
    const [id, v] = entry.split(':')
    const amount = unit(v ?? null)
    if (id && ID_PATTERN.test(id) && amount !== null) commands.push({ type: 'explodeAssembly', assemblyId: id, amount })
  }
  if (p.get('xray') === '1') commands.push({ type: 'setXray', on: true })
  if (p.get('evidence') === '1') commands.push({ type: 'setProvenanceMode', on: true })
  const paint = p.get('paint')
  // Own keys only: `in` would also accept inherited names such as "constructor".
  if (paint && Object.hasOwn(PAINTS, paint)) commands.push({ type: 'setPaint', paint: paint as PaintId })
  const systems = (p.get('systems') ?? '').split(',').filter((x): x is SystemId => (SYSTEM_IDS as string[]).includes(x))
  if (systems.length) commands.push({ type: 'showSystems', systemIds: systems })
  const isolate = ids(p.get('isolate'))
  if (isolate.length) commands.push({ type: 'isolateComponents', ids: isolate })
  const hide = ids(p.get('hide'))
  if (hide.length) commands.push({ type: 'hideComponents', ids: hide })
  const part = ids(p.get('part'))[0]
  if (part) commands.push({ type: 'selectComponent', id: part })
  const cam = camera(p.get('cam'))
  if (cam) commands.push({ type: 'setCamera', pose: cam })
  else if (part) commands.push({ type: 'focusCamera', id: part })
  return { config: config(p, base), commands }
}

/** Applies a parsed link; commands with unknown ids are rejected by dispatch and skipped. */
export function applySharedView(view: SharedView): void {
  dispatch({ type: 'setConfig', config: view.config })
  for (const cmd of view.commands) dispatch(cmd)
}

export function shareUrl(params: URLSearchParams, location: Pick<Location, 'origin' | 'pathname'>): string {
  return `${location.origin}${location.pathname}?${params.toString()}`
}
