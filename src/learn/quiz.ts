// Quiz logic, independent of the UI. Questions use only part names from the dataset; the feedback fact
// for each part is one of its sourced claims.
import type { BopDataset } from '../data/build-bop'
import { sameKindAs } from '../data/search'
import type { Claim, ComponentInstance, Shape } from '../data/types'

export type QuizMode = 'find' | 'name'

export interface Question {
  mode: QuizMode
  /** One instance of the part; any instance of the same part counts as correct in "find". */
  targetId: string
  name: string
  /** Four names, shuffled, for "name" mode. */
  choices: string[]
}

export const ROUND_LENGTH = 10

export type Rng = () => number

function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Largest dimension of a shape, in inches. */
function extent(shape: Shape): number {
  switch (shape.kind) {
    case 'box':
      return Math.max(...shape.size)
    case 'cyl':
      return Math.max(2 * shape.r, shape.len)
    case 'torus':
      return 2 * (shape.major + shape.tube)
    case 'hex':
      return Math.max(shape.across, shape.len)
    case 'lathe': {
      const r = Math.max(...shape.profile.map(([x]) => x))
      const ys = shape.profile.map(([, y]) => y)
      return Math.max(2 * r, Math.max(...ys) - Math.min(...ys))
    }
    case 'plate':
      return shape.outline.type === 'circle' ? 2 * shape.outline.r : Math.max(shape.outline.w, shape.outline.h)
    case 'ramBlock':
      return Math.max(shape.depth, shape.width)
  }
}

/** Big enough to tap on a phone once exploded: not a thin ring and at least a few inches across. */
export function isTappable(c: ComponentInstance): boolean {
  const meshes = c.geometry.meshes
  if (!meshes.length) return false
  const onlyThinRings = meshes.every((m) => m.shape.kind === 'torus' && m.shape.tube < 0.4)
  return !onlyThinRings && Math.max(...meshes.map((m) => extent(m.shape))) >= 3
}

/** Parts with visible geometry, one representative per distinct part, preferring the upper-left location. */
export function questionPool(ds: BopDataset, mode: QuizMode = 'name'): ComponentInstance[] {
  const seen = new Set<string>()
  const pool: ComponentInstance[] = []
  const ordered = [...ds.components].sort((a, b) => rankLocation(a) - rankLocation(b))
  for (const c of ordered) {
    if (!c.geometry.meshes.length || (mode === 'find' && !isTappable(c))) continue
    const key = kindKey(c)
    if (seen.has(key)) continue
    seen.add(key)
    pool.push(c)
  }
  return pool
}

/**
 * Parts that differ only by location (the two hydraulic connections of a cavity, front and back outlets,
 * top and bottom flange studs) count as one kind, so they never appear as competing answers.
 */
function kindKey(c: ComponentInstance): string {
  return c.cavity ? c.name : c.id.split('-')[0]
}

function rankLocation(c: ComponentInstance): number {
  if (!c.cavity || !c.side) return 0
  return ['upper-L', 'upper-R', 'lower-L', 'lower-R'].indexOf(`${c.cavity}-${c.side}`) + 1
}

/** Names shown as wrong answers: prefer parts that share a system with the target, so the choice is not obvious. */
function distractors(pool: ComponentInstance[], target: ComponentInstance, rng: Rng): string[] {
  const others = pool.filter((c) => kindKey(c) !== kindKey(target))
  const related = shuffle(others.filter((c) => c.systemIds.some((s) => target.systemIds.includes(s))), rng)
  const rest = shuffle(others.filter((c) => !related.includes(c)), rng)
  return [...related, ...rest].slice(0, 3).map((c) => c.name)
}

export function buildRound(ds: BopDataset, mode: QuizMode, rng: Rng = Math.random, length = ROUND_LENGTH): Question[] {
  const pool = questionPool(ds, mode)
  const names = mode === 'name' ? questionPool(ds, 'name') : pool
  return shuffle(pool, rng)
    .slice(0, Math.min(length, pool.length))
    .map((target) => ({
      mode,
      targetId: target.id,
      name: target.name,
      choices: mode === 'name' ? shuffle([target.name, ...distractors(names, target, rng)], rng) : [],
    }))
}

/** Every instance of the question's part in the model (for highlighting the answer). */
export function answerIds(ds: BopDataset, q: Question): string[] {
  const target = ds.byId.get(q.targetId)
  return target ? sameKindAs(ds, target).map((c) => c.id) : []
}

export function isCorrectPick(ds: BopDataset, q: Question, pickedId: string): boolean {
  return answerIds(ds, q).includes(pickedId)
}

/** One sourced fact about the part for the feedback line: its documented function, else its part number. */
export function feedbackFact(ds: BopDataset, q: Question): { label: string; claim: Claim<string> } | null {
  const c = ds.byId.get(q.targetId)
  if (!c) return null
  if (c.functionText[0]) return { label: 'Function', claim: c.functionText[0] }
  if (c.partNumber) return { label: 'Part number', claim: c.partNumber }
  return null
}

export interface QuizResult {
  question: Question
  correct: boolean
  /** Name of the part picked (find) or chosen (name). */
  answer: string
}

export function score(results: QuizResult[]): number {
  return results.filter((r) => r.correct).length
}

const BEST_KEY = (mode: QuizMode) => `u-bop-atlas:quiz-best:${mode}`

/** Best score is a per-browser convenience; storage can be unavailable (private mode), so failures are ignored. */
export function readBest(mode: QuizMode): number | null {
  try {
    const v = window.localStorage.getItem(BEST_KEY(mode))
    return v === null ? null : Number(v)
  } catch {
    return null
  }
}

export function saveBest(mode: QuizMode, value: number): void {
  try {
    const prev = readBest(mode)
    if (prev === null || value > prev) window.localStorage.setItem(BEST_KEY(mode), String(value))
  } catch {
    // Storage blocked: the best score is simply not remembered.
  }
}
