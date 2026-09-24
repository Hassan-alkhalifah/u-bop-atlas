export type SourceId =
  | 'SRC-CAM-CAT-2014'
  | 'SRC-SLB-DS-2025'
  | 'SRC-SLB-WEB'
  | 'SRC-PAT'
  | 'SRC-QT'

/** A = OEM document read directly; B = OEM with print anomaly/ambiguity; C = third-party only; D = derived/inferred. */
export type Confidence = 'A' | 'B' | 'C' | 'D'

/** T1 verified manufacturer geometry; T2 reconstructed from documentation; T3 educational approximation. */
export type Tier = 'T1' | 'T2' | 'T3'

export interface SourceRef {
  sourceId: SourceId
  page?: number
  locator?: string
  quote?: string
}

export interface Claim<T> {
  value: T
  sources: SourceRef[]
  confidence: Confidence
  note?: string
  conflicts?: { value: T; sources: SourceRef[] }[]
}

export interface Source {
  id: SourceId
  title: string
  publisher: string
  kind: 'oem' | 'third_party'
  url: string
  accessed: string
  reliability: string
}

export type SystemId = 'structure' | 'rams' | 'hydraulics' | 'seals' | 'locking' | 'fasteners'

export interface SystemDef {
  id: SystemId
  name: string
  color: string
  description: Claim<string> | null
}

export type Side = 'L' | 'R'
export type CavityId = 'upper' | 'lower'

/** How a mesh moves with the kinematic state of its cavity. */
export type Kinematic = 'fixed' | 'bonnet' | 'ram' | 'lock' | 'bolt'

export type Outline =
  | { type: 'roundRect'; w: number; h: number; r: number }
  | { type: 'octagon'; w: number; h: number; chamfer: number }
  | { type: 'circle'; r: number }

export type Shape =
  | { kind: 'box'; size: [number, number, number] }
  | { kind: 'cyl'; r: number; len: number; rInner?: number; sides?: number }
  | { kind: 'torus'; major: number; tube: number; scaleY?: number; arc?: number }
  | { kind: 'hex'; across: number; len: number }
  /** Turned part: profile points [radius, height] revolved about the part axis. */
  | { kind: 'lathe'; profile: [number, number][]; segments?: number }
  /** Flat part: outline in the plane normal to the axis, extruded by thickness, with through-holes and bevelled edges. */
  | { kind: 'plate'; outline: Outline; thickness: number; holes?: { x: number; y: number; r: number }[]; bevel?: number }
  /** vee > 0: convex "V" front (apex toward the bore); vee < 0: matching concave notch (ISR, p.52). */
  | { kind: 'ramBlock'; depth: number; height: number; width: number; cutoutR: number; chamfer: number; vee?: number }

/** One renderable mesh. Coordinates: world inches, Y up, X along the bonnet axis. */
export interface MeshSpec {
  shape: Shape
  position: [number, number, number]
  /** 'x' = shape axis aligned with world X (bonnet axis); 'y' vertical; 'z' front-back. */
  axis: 'x' | 'y' | 'z'
  material: MaterialKey
  /** Rotate 180 degrees about Y (used so left-hand rams face the bore). */
  flip?: boolean
  /** Explicit Euler rotation; overrides the axis mapping. */
  rotation?: [number, number, number]
}

/** Visual categories only. Colours never encode a material, because materials are undocumented. */
export type MaterialKey = 'structure' | 'structureAlt' | 'moving' | 'softgood' | 'fastener' | 'fitting' | 'ram'

export interface ComponentInstance {
  id: string
  name: string
  catalogItem?: number
  /** Balloon text when it is not an SD17500 item number, e.g. "3A" (p.18) or "TB3" (tandem booster, p.21). */
  itemLabel?: string
  aliases: string[]
  assemblyId: string
  systemIds: SystemId[]
  cavity?: CavityId
  side?: Side
  partNumber: Claim<string> | null
  quantity: Claim<string> | null
  functionText: Claim<string>[]
  material: Claim<string> | null
  documentedDimensions: { label: string; claim: Claim<string> }[]
  drawing: Claim<string> | null
  recommendedSpare: Claim<boolean> | null
  kits: Claim<string>[]
  notes: string[]
  geometry: {
    tier: Tier
    tierNote: string
    meshes: MeshSpec[]
    kinematic: Kinematic
    /** Unit direction * magnitude (inches) applied at explode factor 1. */
    explode: [number, number, number]
    spin?: boolean
  }
}

export interface Assembly {
  id: string
  name: string
  parentId: string | null
  aliases: string[]
}

export type ConnectionKind = 'mechanical' | 'hydraulic' | 'seal-interface' | 'fastened' | 'sliding' | 'contained'

export interface Connection {
  id: string
  from: string
  to: string
  kind: ConnectionKind
  basis: Claim<string>
}

export interface GeometryParam {
  id: string
  label: string
  value: number
  unit: 'in'
  tier: Tier
  sources: SourceRef[]
  rationale: string
}

export interface AnimationStep {
  cavity: CavityId | 'all'
  channel: 'ram' | 'lock' | 'bonnet' | 'bolts'
  to: number
  duration: number
}

export interface AnimationDef {
  id: string
  name: string
  description: string
  basis: Claim<string>
  steps: AnimationStep[]
  highlight?: number[]
}

/** vbr and flexpacker ids come from VBR_ROWS / FLEXPACKER_NR_ROWS in catalog.ts. */
export type RamKind =
  | { type: 'pipe'; pipeSize: string }
  | { type: 'blind' }
  | { type: 'sbr' }
  | { type: 'isr' }
  | { type: 'vbr'; id: string }
  | { type: 'flexpacker'; id: string }

/** Bonnet options per cavity: standard (p.12), large-bore shear bonnet (p.18), tandem booster (p.21). */
export type BonnetType = 'standard' | 'largeBoreShear' | 'tandemBooster'

export interface BopConfig {
  stack: 'double' | 'single'
  rams: Record<CavityId, RamKind>
  bonnets: Record<CavityId, BonnetType>
}
