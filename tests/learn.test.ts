import { beforeEach, describe, expect, it } from 'vitest'
import { runLocalAssistant } from '../src/assistant/local-engine'
import { buildBop } from '../src/data/build-bop'
import { DEFAULT_CONFIG } from '../src/data/config'
import { SOURCES } from '../src/data/sources'
import type { BopConfig } from '../src/data/types'
import { answerName, exitLearn, goToStep, nextQuestion, startLesson, startQuiz, useLearn } from '../src/learn/learn-store'
import { LESSONS, stepConfig } from '../src/learn/lessons'
import { buildRound, isCorrectPick, isTappable, questionPool } from '../src/learn/quiz'
import { dispatch } from '../src/state/commands'
import { initialState, useViewer } from '../src/state/store'

// Animations run on requestAnimationFrame, which Node does not have; the frames are not needed here.
globalThis.requestAnimationFrame ??= () => 0
globalThis.cancelAnimationFrame ??= () => undefined

/** Deterministic random numbers for repeatable rounds. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const reset = (config: BopConfig = DEFAULT_CONFIG) => {
  useViewer.setState(initialState(config))
  useLearn.setState({ view: { kind: 'home' }, savedConfig: null })
}

describe('lessons', () => {
  for (const lesson of LESSONS) {
    it(`"${lesson.title}": every fact is a sourced claim and every step command works`, () => {
      lesson.steps.forEach((step, i) => {
        const ds = buildBop(stepConfig(lesson, i))
        for (const fact of step.facts) {
          const claim = fact.get(ds)
          expect(claim, `${lesson.id} step ${i + 1}: ${fact.label}`).not.toBeNull()
          expect(claim!.sources.length).toBeGreaterThan(0)
          for (const s of claim!.sources) expect(SOURCES[s.sourceId]).toBeDefined()
        }
        reset(stepConfig(lesson, i))
        for (const cmd of step.setup(useViewer.getState().dataset)) {
          const result = dispatch(cmd)
          expect(result.ok, `${lesson.id} step ${i + 1}: ${cmd.type} ${result.message}`).toBe(true)
        }
      })
    })
  }

  it('keeps numbers and units out of the step text (values belong in sourced facts)', () => {
    for (const lesson of LESSONS) for (const step of lesson.steps) expect(step.look, step.title).not.toMatch(/\d/)
  })

  it('runs steps and restores the setup the user had on exit', () => {
    const mine: BopConfig = { ...DEFAULT_CONFIG, stack: 'single' }
    reset(mine)
    useViewer.setState({ panelTab: 'learn' })
    startLesson('sealing')
    expect(useViewer.getState().dataset.config.stack).toBe('double')
    goToStep(4)
    expect(useViewer.getState().dataset.config.rams.upper.type).toBe('vbr')
    expect(useViewer.getState().selectedId).toBe('upper-L/ram-packer')
    expect(useViewer.getState().panelTab).toBe('learn')
    exitLearn()
    expect(useViewer.getState().dataset.config).toEqual(mine)
    expect(useLearn.getState().view).toEqual({ kind: 'home' })
  })
})

describe('quiz', () => {
  const ds = buildBop(DEFAULT_CONFIG)

  it('asks ten different parts, with four distinct choices including the answer', () => {
    const round = buildRound(ds, 'name', seeded(7))
    expect(round).toHaveLength(10)
    expect(new Set(round.map((q) => q.name)).size).toBe(10)
    for (const q of round) {
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices).size).toBe(4)
      expect(q.choices).toContain(q.name)
    }
  })

  it('only asks to find parts big enough to tap, and accepts any instance of the part', () => {
    expect(questionPool(ds, 'find').every(isTappable)).toBe(true)
    expect(questionPool(ds, 'find').length).toBeLessThan(questionPool(ds, 'name').length)
    const q = buildRound(ds, 'find', seeded(3)).find((x) => x.targetId === 'upper-L/i05') ?? { mode: 'find' as const, targetId: 'upper-L/i05', name: 'Piston, Operating', choices: [] }
    expect(isCorrectPick(ds, q, 'lower-R/i05')).toBe(true)
    expect(isCorrectPick(ds, q, 'lower-R/i06')).toBe(false)
  })

  it('scores a full "name" round', () => {
    reset()
    startQuiz('name')
    let view = useLearn.getState().view
    if (view.kind !== 'quiz') throw new Error('quiz did not start')
    view.questions.forEach((q, i) => {
      answerName(i % 2 === 0 ? q.name : q.choices.find((c) => c !== q.name)!)
      nextQuestion()
    })
    view = useLearn.getState().view
    expect(view.kind === 'quiz' && view.phase).toBe('done')
    expect(view.kind === 'quiz' && view.results.filter((r) => r.correct).length).toBe(5)
  })

  it('answers "find" questions from a tap on the model', () => {
    reset()
    startQuiz('find')
    const view = useLearn.getState().view
    if (view.kind !== 'quiz') throw new Error('quiz did not start')
    expect(useViewer.getState().explode).toBe(1)
    dispatch({ type: 'selectComponent', id: view.questions[0].targetId })
    const after = useLearn.getState().view
    expect(after.kind === 'quiz' && after.phase).toBe('feedback')
    expect(after.kind === 'quiz' && after.results[0].correct).toBe(true)
    exitLearn()
  })
})

describe('assistant opens learn, share and export', () => {
  beforeEach(() => reset())
  const ds = buildBop(DEFAULT_CONFIG)
  it('maps requests to commands', () => {
    expect(runLocalAssistant(ds, 'quiz me').commands).toEqual([{ type: 'openLearn', quiz: 'find' }])
    expect(runLocalAssistant(ds, 'name the part quiz').commands).toEqual([{ type: 'openLearn', quiz: 'name' }])
    expect(runLocalAssistant(ds, 'start the tour').commands).toEqual([{ type: 'openLearn', lessonId: 'tour' }])
    expect(runLocalAssistant(ds, 'lesson on shearing').commands).toEqual([{ type: 'openLearn', lessonId: 'shearing' }])
    expect(runLocalAssistant(ds, 'share this view').commands).toEqual([{ type: 'openDialog', dialog: 'share' }])
    expect(runLocalAssistant(ds, 'export the parts list').commands).toEqual([{ type: 'openDialog', dialog: 'export' }])
  })
  it('does not steal part questions', () => {
    expect(runLocalAssistant(ds, 'show the bonnet seal').commands.some((c) => c.type === 'openLearn')).toBe(false)
    expect(runLocalAssistant(ds, 'what is the material of the connecting rod seal').commands.some((c) => c.type === 'openLearn')).toBe(false)
  })
})
