// State and actions for guided lessons and the quiz. Both drive the viewer only through dispatch(), like the
// UI and the assistant. On exit the configuration the user had before is restored.
import { create } from 'zustand'
import type { BopConfig } from '../data/types'
import { dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { lessonById, stepConfig, type Lesson } from './lessons'
import { answerIds, buildRound, isCorrectPick, saveBest, score, type Question, type QuizMode, type QuizResult } from './quiz'

export type LearnView =
  | { kind: 'home' }
  | { kind: 'lesson'; lessonId: string; step: number }
  | { kind: 'quiz'; mode: QuizMode; questions: Question[]; index: number; results: QuizResult[]; phase: 'ask' | 'feedback' | 'done' }

interface LearnState {
  view: LearnView
  savedConfig: BopConfig | null
}

export const useLearn = create<LearnState>(() => ({ view: { kind: 'home' }, savedConfig: null }))

const sameConfig = (a: BopConfig, b: BopConfig) => JSON.stringify(a) === JSON.stringify(b)

function setConfig(config: BopConfig): void {
  if (!sameConfig(useViewer.getState().dataset.config, config)) dispatch({ type: 'setConfig', config })
}

function remember(): void {
  if (!useLearn.getState().savedConfig) useLearn.setState({ savedConfig: useViewer.getState().dataset.config })
}

function restore(): void {
  const saved = useLearn.getState().savedConfig
  stopPicking()
  if (saved) setConfig(saved)
  dispatch({ type: 'resetView' })
  useLearn.setState({ view: { kind: 'home' }, savedConfig: null })
}

// ---------- Lessons ----------

function runStep(lesson: Lesson, index: number): void {
  setConfig(stepConfig(lesson, index))
  dispatch({ type: 'resetView' })
  for (const cmd of lesson.steps[index].setup(useViewer.getState().dataset)) dispatch(cmd)
}

export function startLesson(id: string): void {
  const lesson = lessonById(id)
  if (!lesson) return
  stopPicking()
  remember()
  useLearn.setState({ view: { kind: 'lesson', lessonId: id, step: 0 } })
  runStep(lesson, 0)
}

export function goToStep(index: number): void {
  const view = useLearn.getState().view
  if (view.kind !== 'lesson') return
  const lesson = lessonById(view.lessonId)
  if (!lesson || index < 0 || index >= lesson.steps.length) return
  useLearn.setState({ view: { ...view, step: index } })
  runStep(lesson, index)
}

export function replayStep(): void {
  const view = useLearn.getState().view
  if (view.kind === 'lesson') goToStep(view.step)
}

export const exitLearn = restore

// ---------- Quiz ----------

let unsubscribe: (() => void) | null = null

function stopPicking(): void {
  unsubscribe?.()
  unsubscribe = null
}

/** In "find" mode a tap on the model (any selection) answers the question. */
function startPicking(): void {
  stopPicking()
  unsubscribe = useViewer.subscribe((s, prev) => {
    if (s.selectedId && s.selectedId !== prev.selectedId) answerPick(s.selectedId)
  })
}

function topAssemblyOf(id: string): string | null {
  const c = useViewer.getState().dataset.byId.get(id)
  if (!c?.cavity || !c.side) return null
  return c.assemblyId.startsWith('ram-') ? `ram-${c.cavity}-${c.side}` : `bonnet-${c.cavity}-${c.side}`
}

function prepare(q: Question): void {
  dispatch({ type: 'resetView' })
  if (q.mode === 'find') {
    // Every part spread out so each one can be tapped.
    dispatch({ type: 'setExplode', amount: 1 })
    dispatch({ type: 'focusCamera', id: 'bop' })
    return
  }
  const asm = topAssemblyOf(q.targetId)
  if (asm) dispatch({ type: 'explodeAssembly', assemblyId: asm, amount: 1 })
  dispatch({ type: 'highlight', ids: [q.targetId] })
  dispatch({ type: 'focusCamera', id: q.targetId })
}

export function startQuiz(mode: QuizMode): void {
  remember()
  const questions = buildRound(useViewer.getState().dataset, mode)
  useLearn.setState({ view: { kind: 'quiz', mode, questions, index: 0, results: [], phase: 'ask' } })
  if (mode === 'find') startPicking()
  else stopPicking()
  if (questions[0]) prepare(questions[0])
}

function record(correct: boolean, answer: string): void {
  const view = useLearn.getState().view
  if (view.kind !== 'quiz' || view.phase !== 'ask') return
  const q = view.questions[view.index]
  const ds = useViewer.getState().dataset
  useLearn.setState({ view: { ...view, phase: 'feedback', results: [...view.results, { question: q, correct, answer }] } })
  dispatch({ type: 'highlight', ids: answerIds(ds, q) })
  if (!correct) dispatch({ type: 'focusCamera', id: q.targetId })
}

function answerPick(pickedId: string): void {
  const view = useLearn.getState().view
  if (view.kind !== 'quiz' || view.phase !== 'ask' || view.mode !== 'find') return
  const ds = useViewer.getState().dataset
  const q = view.questions[view.index]
  record(isCorrectPick(ds, q, pickedId), ds.byId.get(pickedId)?.name ?? pickedId)
}

export function answerName(name: string): void {
  const view = useLearn.getState().view
  if (view.kind !== 'quiz' || view.mode !== 'name' || view.phase !== 'ask') return
  const q = view.questions[view.index]
  record(name === q.name, name)
  // Selecting the part shows its name label in the model as part of the feedback.
  dispatch({ type: 'selectComponent', id: q.targetId })
}

export function nextQuestion(): void {
  const view = useLearn.getState().view
  if (view.kind !== 'quiz' || view.phase !== 'feedback') return
  const index = view.index + 1
  if (index >= view.questions.length) {
    saveBest(view.mode, score(view.results))
    useLearn.setState({ view: { ...view, phase: 'done' } })
    dispatch({ type: 'highlight', ids: [] })
    stopPicking()
    return
  }
  useLearn.setState({ view: { ...view, index, phase: 'ask' } })
  prepare(view.questions[index])
}
