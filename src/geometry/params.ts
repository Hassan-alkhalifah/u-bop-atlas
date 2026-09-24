// Every dimension the model generator uses, with its provenance tier.
// T2 values come from documents; T3 values are educational approximations sized to fit the T2 envelope.
// To improve accuracy, change a value here, set its tier and sources, and the model regenerates.
import { LB_OPERATING_DATA, OPERATING_DATA } from '../data/catalog'
import type { GeometryParam, SourceRef } from '../data/types'

const PAT: SourceRef = { sourceId: 'SRC-PAT', locator: 'rows 4, 7, 8, 23' }
const CAT8: SourceRef = { sourceId: 'SRC-CAM-CAT-2014', page: 8 }

const T3 = (id: string, label: string, value: number, rationale: string): GeometryParam => ({
  id,
  label,
  value,
  unit: 'in',
  tier: 'T3',
  sources: [],
  rationale,
})

const ratio = (text: string) => Number(text.split(':')[0])

export const PARAMS = {
  boreDiameter: {
    id: 'boreDiameter',
    label: 'Vertical bore diameter',
    value: 13.625,
    unit: 'in',
    tier: 'T2',
    sources: [CAT8, { sourceId: 'SRC-QT', locator: 'Vertical Bore: 13.625 in' }],
    rationale: 'Nominal bore size of the 13-5/8" BOP.',
  },
  overallHeightDouble: {
    id: 'overallHeightDouble',
    label: 'Overall height, double, flanged',
    value: 66.625,
    unit: 'in',
    tier: 'T2',
    sources: [PAT, { sourceId: 'SRC-QT', locator: 'Height: 66.630 in' }],
    rationale: 'Third-party rental data sheet (SRC-QT prints 66.630 in).',
  },
  lengthClosedLocked: {
    id: 'lengthClosedLocked',
    label: 'Overall length, bonnets closed, locking screws locked',
    value: 114.125,
    unit: 'in',
    tier: 'T2',
    sources: [PAT, { sourceId: 'SRC-QT', locator: 'Closed & Locked: 115.66 in' }],
    rationale: 'Third-party rental data sheet; SRC-QT prints 115.66 in.',
  },
  lengthOpenUnlocked: {
    id: 'lengthOpenUnlocked',
    label: 'Overall length, bonnets opened, locking screws unlocked',
    value: 172.75,
    unit: 'in',
    tier: 'T2',
    sources: [PAT, { sourceId: 'SRC-QT', locator: 'Open & Unlocked: 175.54 in' }],
    rationale: 'Third-party rental data sheet; SRC-QT prints 175.54 in.',
  },
  flangeStudDiameter: {
    id: 'flangeStudDiameter',
    label: '13-5/8" 10K flange stud diameter',
    value: 1.875,
    unit: 'in',
    tier: 'T2',
    sources: [{ sourceId: 'SRC-PAT', locator: 'row 23: 1-7/8" x 17-3/4", 20 per flange' }],
    rationale: 'Rig-up hardware from the rental data sheet. Studs are drawn shortened.',
  },
  bodyHalfWidth: T3('bodyHalfWidth', 'Body half-width along bonnet axis', 18, 'No public value; sized so bonnets fit the documented overall length.'),
  bodyDepth: T3('bodyDepth', 'Ram cavity housing depth (front to back)', 24, 'No public value. Arrangement of column and housings follows the 3D view on catalog p.9.'),
  columnRadius: T3('columnRadius', 'Body column outer radius', 13.5, 'No public value.'),
  housingHeight: T3('housingHeight', 'Ram cavity housing height', 20, 'No public value.'),
  bodyBlockHeightDouble: T3('bodyBlockHeightDouble', 'Body block height, double', 50, 'No public value; flanges and necks fill the rest of the documented height.'),
  bodyBlockHeightSingle: T3('bodyBlockHeightSingle', 'Body block height, single', 28, 'No public value; no public overall height for a single was found.'),
  flangeOuterDiameter: T3('flangeOuterDiameter', 'Top/bottom flange outer diameter', 30, 'No public value.'),
  flangeThickness: T3('flangeThickness', 'Top/bottom flange thickness', 4.5, 'No public value.'),
  cavityOffset: T3('cavityOffset', 'Ram cavity centre offset from body centre (double)', 11, 'No public value.'),
  ramDepth: T3('ramDepth', 'Ram block depth along bonnet axis', 10, 'No public value.'),
  ramHeight: T3('ramHeight', 'Ram block height', 7, 'No public value (dimension G is defined on p.8 but its chart is missing).'),
  ramWidth: T3('ramWidth', 'Ram block width', 16, 'No public value.'),
  ramStroke: T3('ramStroke', 'Ram stroke (open to closed)', 8, 'No public value; chosen so an open ram clears the documented bore.'),
  bonnetLength: T3('bonnetLength', 'Bonnet length', 10, 'No public value.'),
  bonnetHeight: T3('bonnetHeight', 'Bonnet height', 19, 'No public value.'),
  bonnetWidth: T3('bonnetWidth', 'Bonnet width', 22, 'No public value.'),
  intFlangeLength: T3('intFlangeLength', 'Intermediate flange length', 3, 'No public value.'),
  opCylinderLength: T3('opCylinderLength', 'Operating cylinder length', 12, 'No public value.'),
  opCylinderRadius: T3('opCylinderRadius', 'Operating cylinder outer radius', 6.5, 'No public value.'),
  pistonThickness: T3('pistonThickness', 'Operating piston head thickness', 3, 'No public value.'),
  rodRadius: T3('rodRadius', 'Connecting rod radius', 2.2, 'No public value.'),
  tailRodRadius: T3('tailRodRadius', 'Tail rod radius', 1.8, 'No public value.'),
  lockHousingLength: T3('lockHousingLength', 'Locking screw housing length', 5, 'No public value.'),
  lockTravel: T3('lockTravel', 'Locking screw travel (locked to unlocked)', 9, 'No public value. The catalog documents 32 turns per end (p.7) but not the thread pitch.'),
  rcCylinderRadius: T3('rcCylinderRadius', 'Ram-change cylinder radius', 1.8, 'No public value.'),
  lbCylinderRadius: T3(
    'lbCylinderRadius',
    'Large-bore shear bonnet operating cylinder outer radius',
    6.5 * Math.sqrt(ratio(LB_OPERATING_DATA.closingRatio) / ratio(OPERATING_DATA.closingRatio)),
    `No public value. Scaled from the standard cylinder by the square root of the documented closing ratios (${LB_OPERATING_DATA.closingRatio} large bore vs ${OPERATING_DATA.closingRatio} standard, catalog p.7), assuming the same connecting rod.`,
  ),
  boosterLength: T3('boosterLength', 'Tandem booster length (head, cylinder and adapter plate)', 16, 'No public value. Sized to hold a piston stroke equal to the operating piston stroke (catalog p.20).'),
} satisfies Record<string, GeometryParam>

export type ParamId = keyof typeof PARAMS

export const P = Object.fromEntries(Object.entries(PARAMS).map(([k, v]) => [k, v.value])) as Record<ParamId, number>

/** Stations along the outward bonnet axis s (inches from the body face), closed and locked. */
export const S = (() => {
  const bonnetEnd = P.bonnetLength
  const intEnd = bonnetEnd + P.intFlangeLength
  const cylEnd = intEnd + P.opCylinderLength
  const housingEnd = cylEnd + P.lockHousingLength
  const halfLengthLocked = P.lengthClosedLocked / 2
  const screwEnd = halfLengthLocked - P.bodyHalfWidth
  const pistonFace = intEnd + 1
  const pistonBack = pistonFace + P.pistonThickness
  const ramFront = -P.bodyHalfWidth
  const ramBack = ramFront + P.ramDepth
  const tailEnd = housingEnd - 2
  return { bonnetEnd, intEnd, cylEnd, housingEnd, screwEnd, pistonFace, pistonBack, ramFront, ramBack, tailEnd }
})()

/**
 * Bonnet travel derived from the T2 open/closed lengths and the T3 locking-screw travel:
 * half open length = body half-width + travel + unlocked screw end.
 */
export const BONNET_TRAVEL = P.lengthOpenUnlocked / 2 - P.bodyHalfWidth - (S.screwEnd + P.lockTravel)

export function cavityCentres(stack: 'double' | 'single'): { upper: number; lower?: number } {
  return stack === 'double' ? { upper: P.cavityOffset, lower: -P.cavityOffset } : { upper: 0 }
}

export function bodyBlockHeight(stack: 'double' | 'single'): number {
  return stack === 'double' ? P.bodyBlockHeightDouble : P.bodyBlockHeightSingle
}

export function overallHeight(stack: 'double' | 'single'): { value: number; tier: 'T2' | 'T3' } {
  return stack === 'double'
    ? { value: P.overallHeightDouble, tier: 'T2' }
    : { value: P.bodyBlockHeightSingle + 2 * (P.flangeThickness + 3), tier: 'T3' }
}
