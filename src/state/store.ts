import { create } from 'zustand'
import { buildBop, type BopDataset } from '../data/build-bop'
import { DEFAULT_CONFIG } from '../data/config'
import type { BopConfig, CavityId, SystemId } from '../data/types'
import type { PaintId } from '../viewer/paints'

export interface CavityState {
  ram: number
  lock: number
  bonnet: number
  bolts: number
}

export type PanelTab = 'details' | 'assistant'

export interface ViewerState {
  dataset: BopDataset
  selectedId: string | null
  hoveredId: string | null
  hidden: ReadonlySet<string>
  isolated: ReadonlySet<string> | null
  highlighted: ReadonlySet<string>
  activeSystems: ReadonlySet<SystemId>
  explode: number
  assemblyExplode: Readonly<Record<string, number>>
  xray: boolean
  provenanceMode: boolean
  showConnectionsFor: string | null
  kinematics: Readonly<Record<CavityId, CavityState>>
  playingAnimation: string | null
  focusRequest: { id: string; nonce: number } | null
  panelTab: PanelTab
  mobileSheet: 'closed' | 'tree' | 'panel'
  paint: PaintId
  /** 'high' adds ambient occlusion and multisampling; phones default to 'standard'. */
  quality: 'high' | 'standard'
}

function defaultQuality(): 'high' | 'standard' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'high'
  return window.matchMedia('(max-width: 900px), (pointer: coarse)').matches ? 'standard' : 'high'
}

const CLOSED_LOCKED: CavityState = { ram: 1, lock: 1, bonnet: 0, bolts: 0 }

export function initialState(config: BopConfig = DEFAULT_CONFIG): ViewerState {
  return {
    dataset: buildBop(config),
    selectedId: null,
    hoveredId: null,
    hidden: new Set(),
    isolated: null,
    highlighted: new Set(),
    activeSystems: new Set(),
    explode: 0,
    assemblyExplode: {},
    xray: false,
    provenanceMode: false,
    showConnectionsFor: null,
    kinematics: { upper: { ...CLOSED_LOCKED }, lower: { ...CLOSED_LOCKED } },
    playingAnimation: null,
    focusRequest: null,
    panelTab: 'details',
    mobileSheet: 'closed',
    paint: 'grey',
    quality: defaultQuality(),
  }
}

export const useViewer = create<ViewerState>(() => initialState())

/** Visible = not hidden, inside the isolation set (if any), and in an active system (if any are active). */
export function isVisible(s: ViewerState, id: string): boolean {
  if (s.hidden.has(id)) return false
  if (s.isolated && !s.isolated.has(id)) return false
  if (s.activeSystems.size > 0) {
    const c = s.dataset.byId.get(id)
    if (!c || !c.systemIds.some((sys) => s.activeSystems.has(sys))) return false
  }
  return true
}
