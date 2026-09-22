import * as THREE from 'three'
import type { MaterialKey } from '../data/types'
import { EVIDENCE_COLORS } from './evidence'
import { PAINTS, type PaintId } from './paints'

export type { PaintId }

interface Finish {
  color: string
  metalness: number
  roughness: number
  clearcoat?: number
}

// Surface finishes are a visual style only. They never encode a documented material.
function finishFor(key: MaterialKey, paint: PaintId): Finish {
  switch (key) {
    case 'structure':
      return { color: PAINTS[paint].body, metalness: 0.2, roughness: 0.48, clearcoat: 0.35 }
    case 'structureAlt':
      return { color: PAINTS[paint].alt, metalness: 0.2, roughness: 0.5, clearcoat: 0.3 }
    case 'moving':
      return { color: '#DADFE2', metalness: 1, roughness: 0.16 }
    case 'softgood':
      return { color: '#1A1D1F', metalness: 0, roughness: 0.78 }
    case 'fastener':
      return { color: '#34393C', metalness: 0.75, roughness: 0.38 }
    case 'fitting':
      return { color: '#C3C8CA', metalness: 0.9, roughness: 0.28 }
    case 'ram':
      return { color: '#A3A9AC', metalness: 0.85, roughness: 0.3 }
  }
}

export const SELECT_COLOR = '#E2A900'
export const HIGHLIGHT_COLOR = '#1E7F86'
export const HOVER_COLOR = '#F2D36B'

export interface MaterialState {
  key: MaterialKey
  paint: PaintId
  selected: boolean
  hovered: boolean
  highlighted: boolean
  xray: boolean
  focusOnly: boolean
  /** Another part is selected: structural shells turn translucent so internal parts stay visible. */
  ghost: boolean
  evidence: keyof typeof EVIDENCE_COLORS | null
  systemTint: string | null
}

const cache = new Map<string, THREE.MeshPhysicalMaterial>()

export function materialFor(st: MaterialState): THREE.MeshPhysicalMaterial {
  const key = JSON.stringify(st)
  let m = cache.get(key)
  if (m) return m
  const f = finishFor(st.key, st.paint)
  const flat = st.evidence !== null || st.systemTint !== null
  m = new THREE.MeshPhysicalMaterial({
    color: st.evidence ? EVIDENCE_COLORS[st.evidence] : (st.systemTint ?? f.color),
    metalness: flat ? 0.1 : f.metalness,
    roughness: flat ? 0.6 : f.roughness,
    clearcoat: flat ? 0 : (f.clearcoat ?? 0),
    clearcoatRoughness: 0.35,
  })
  if (st.selected) {
    m.emissive = new THREE.Color(SELECT_COLOR)
    m.emissiveIntensity = 0.6
  } else if (st.highlighted) {
    m.emissive = new THREE.Color(HIGHLIGHT_COLOR)
    m.emissiveIntensity = 0.5
  } else if (st.hovered) {
    m.emissive = new THREE.Color(HOVER_COLOR)
    m.emissiveIntensity = 0.35
  }
  const emphasised = st.selected || st.highlighted || st.hovered
  const structural = st.key === 'structure' || st.key === 'structureAlt'
  if ((st.xray && !emphasised) || (st.focusOnly && !emphasised)) {
    m.transparent = true
    m.opacity = st.focusOnly ? 0.08 : structural ? 0.1 : 0.35
    m.depthWrite = false
  } else if (st.ghost && structural && !emphasised) {
    m.transparent = true
    m.opacity = 0.22
    m.depthWrite = false
  }
  cache.set(key, m)
  return m
}
