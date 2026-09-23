// Every viewer action is a typed command. The UI, the local assistant and the Claude assistant
// all dispatch the same commands, so the AI can never do something a user cannot.
import { animationById } from '../data/animations'
import { buildBop, type BopDataset } from '../data/build-bop'
import { SYSTEM_IDS } from '../data/systems'
import type { BopConfig, CavityId, SystemId } from '../data/types'
import { startAnimation, stopAnimation } from './animation-player'
import type { PaintId } from '../viewer/paints'
import { initialState, useViewer } from './store'

export type Command =
  | { type: 'selectComponent'; id: string | null }
  | { type: 'isolateComponents'; ids: string[] }
  | { type: 'hideComponents'; ids: string[] }
  | { type: 'unhideComponents'; ids: string[] }
  | { type: 'setPaint'; paint: PaintId }
  | { type: 'setQuality'; quality: 'high' | 'standard' }
  | { type: 'showAll' }
  | { type: 'explodeAssembly'; assemblyId: string; amount: number }
  | { type: 'setExplode'; amount: number }
  | { type: 'focusCamera'; id: string }
  | { type: 'showSystems'; systemIds: SystemId[] }
  | { type: 'showConnections'; id: string | null }
  | { type: 'playAnimation'; id: string }
  | { type: 'stopAnimation' }
  | { type: 'setXray'; on: boolean }
  | { type: 'setProvenanceMode'; on: boolean }
  | { type: 'highlight'; ids: string[] }
  | { type: 'setConfig'; config: BopConfig }
  | { type: 'resetView' }

export interface CommandResult {
  ok: boolean
  message: string
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0))

export function assemblyDescendants(ds: BopDataset, assemblyId: string): Set<string> {
  const ids = new Set([assemblyId])
  let grew = true
  while (grew) {
    grew = false
    for (const a of ds.assemblies) {
      if (a.parentId && ids.has(a.parentId) && !ids.has(a.id)) {
        ids.add(a.id)
        grew = true
      }
    }
  }
  return ids
}

export function componentsInAssembly(ds: BopDataset, assemblyId: string): string[] {
  const ids = assemblyDescendants(ds, assemblyId)
  return ds.components.filter((c) => ids.has(c.assemblyId)).map((c) => c.id)
}

export function connectedIds(ds: BopDataset, id: string): string[] {
  const out = new Set<string>()
  for (const k of ds.connections) {
    if (k.from === id) out.add(k.to)
    if (k.to === id) out.add(k.from)
  }
  return [...out]
}

function knownIds(ds: BopDataset, ids: string[]): { valid: string[]; unknown: string[] } {
  const valid = ids.filter((id) => ds.byId.has(id))
  return { valid, unknown: ids.filter((id) => !ds.byId.has(id)) }
}

function unknownNote(unknown: string[]): string {
  return unknown.length ? ` Unknown ids ignored: ${unknown.join(', ')}.` : ''
}

export function dispatch(cmd: Command): CommandResult {
  const s = useViewer.getState()
  const ds = s.dataset
  const set = useViewer.setState
  switch (cmd.type) {
    case 'selectComponent': {
      if (cmd.id !== null && !ds.byId.has(cmd.id)) return { ok: false, message: `No component with id ${cmd.id}.` }
      set({ selectedId: cmd.id, panelTab: cmd.id ? 'details' : s.panelTab })
      return { ok: true, message: cmd.id ? `Selected ${ds.byId.get(cmd.id)?.name}.` : 'Selection cleared.' }
    }
    case 'isolateComponents': {
      const { valid, unknown } = knownIds(ds, cmd.ids)
      if (!valid.length) return { ok: false, message: `Nothing to isolate.${unknownNote(unknown)}` }
      set({ isolated: new Set(valid), hidden: new Set() })
      return { ok: true, message: `Isolated ${valid.length} component(s).${unknownNote(unknown)}` }
    }
    case 'hideComponents': {
      const { valid, unknown } = knownIds(ds, cmd.ids)
      set({ hidden: new Set([...s.hidden, ...valid]) })
      return { ok: valid.length > 0, message: `Hid ${valid.length} component(s).${unknownNote(unknown)}` }
    }
    case 'unhideComponents': {
      const next = new Set(s.hidden)
      cmd.ids.forEach((id) => next.delete(id))
      set({ hidden: next })
      return { ok: true, message: `Showing ${cmd.ids.length} component(s) again.` }
    }
    case 'setPaint':
      set({ paint: cmd.paint })
      return { ok: true, message: `Paint: ${cmd.paint}.` }
    case 'setQuality':
      set({ quality: cmd.quality })
      return { ok: true, message: `Rendering: ${cmd.quality}.` }
    case 'showAll':
      set({ hidden: new Set(), isolated: null, activeSystems: new Set(), highlighted: new Set(), showConnectionsFor: null })
      return { ok: true, message: 'All components visible.' }
    case 'explodeAssembly': {
      if (cmd.assemblyId === 'bop') return dispatch({ type: 'setExplode', amount: cmd.amount })
      if (!ds.assemblies.some((a) => a.id === cmd.assemblyId)) return { ok: false, message: `No assembly with id ${cmd.assemblyId}.` }
      set({ assemblyExplode: { ...s.assemblyExplode, [cmd.assemblyId]: clamp01(cmd.amount) } })
      return { ok: true, message: `Exploded ${ds.assemblies.find((a) => a.id === cmd.assemblyId)?.name} to ${Math.round(clamp01(cmd.amount) * 100)}%.` }
    }
    case 'setExplode':
      set({ explode: clamp01(cmd.amount), ...(cmd.amount === 0 ? { assemblyExplode: {} } : {}) })
      return { ok: true, message: `Global explode ${Math.round(clamp01(cmd.amount) * 100)}%.` }
    case 'focusCamera': {
      if (!ds.byId.has(cmd.id) && !ds.assemblies.some((a) => a.id === cmd.id)) return { ok: false, message: `Nothing to focus with id ${cmd.id}.` }
      set({ focusRequest: { id: cmd.id, nonce: Date.now() } })
      return { ok: true, message: 'Camera focused.' }
    }
    case 'showSystems': {
      const valid = cmd.systemIds.filter((id) => SYSTEM_IDS.includes(id))
      set({ activeSystems: new Set(valid), isolated: null })
      return { ok: true, message: valid.length ? `Showing systems: ${valid.join(', ')}.` : 'System filter cleared.' }
    }
    case 'showConnections': {
      if (cmd.id !== null && !ds.byId.has(cmd.id)) return { ok: false, message: `No component with id ${cmd.id}.` }
      const neighbours = cmd.id ? connectedIds(ds, cmd.id) : []
      set({ showConnectionsFor: cmd.id, highlighted: new Set(neighbours) })
      return { ok: true, message: cmd.id ? `Showing ${neighbours.length} connected component(s).` : 'Connections hidden.' }
    }
    case 'playAnimation': {
      const anim = animationById(cmd.id)
      if (!anim) return { ok: false, message: `No animation with id ${cmd.id}.` }
      startAnimation(anim)
      return { ok: true, message: `Playing: ${anim.name}.` }
    }
    case 'stopAnimation':
      stopAnimation()
      return { ok: true, message: 'Animation stopped.' }
    case 'setXray':
      set({ xray: cmd.on })
      return { ok: true, message: `X-ray ${cmd.on ? 'on' : 'off'}.` }
    case 'setProvenanceMode':
      set({ provenanceMode: cmd.on })
      return { ok: true, message: `Provenance colours ${cmd.on ? 'on' : 'off'}.` }
    case 'highlight': {
      const { valid } = knownIds(ds, cmd.ids)
      set({ highlighted: new Set(valid) })
      return { ok: true, message: `Highlighted ${valid.length} component(s).` }
    }
    case 'setConfig': {
      stopAnimation()
      const dataset = buildBop(cmd.config)
      set({
        dataset,
        selectedId: s.selectedId && dataset.byId.has(s.selectedId) ? s.selectedId : null,
        hidden: new Set(),
        isolated: null,
        highlighted: new Set(),
        showConnectionsFor: null,
        assemblyExplode: {},
      })
      return { ok: true, message: 'Configuration updated.' }
    }
    case 'resetView': {
      stopAnimation()
      const fresh = initialState(s.dataset.config)
      set({ ...fresh, dataset: s.dataset, panelTab: s.panelTab, paint: s.paint, quality: s.quality, focusRequest: { id: 'bop', nonce: Date.now() } })
      return { ok: true, message: 'View reset.' }
    }
  }
}

export function setKinematic(cavity: CavityId | 'all', channel: 'ram' | 'lock' | 'bonnet' | 'bolts', value: number): void {
  const k = useViewer.getState().kinematics
  const next = { ...k }
  for (const c of cavity === 'all' ? (['upper', 'lower'] as CavityId[]) : [cavity]) next[c] = { ...next[c], [channel]: clamp01(value) }
  useViewer.setState({ kinematics: next })
}
