import { useEffect } from 'react'
import { NOT_AVAILABLE } from '../data/sources'
import type { Claim } from '../data/types'
import { answerName, exitLearn, goToStep, nextQuestion, replayStep, startLesson, startQuiz, useLearn, type LearnView } from '../learn/learn-store'
import { LESSONS, lessonById, type Lesson } from '../learn/lessons'
import { feedbackFact, readBest, ROUND_LENGTH, score, type QuizMode } from '../learn/quiz'
import { dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { ConfidenceBadge, Icon, SourceLinks } from './ui'

const QUIZZES: { mode: QuizMode; title: string; text: string }[] = [
  { mode: 'find', title: 'Find the part', text: 'A part is named; tap it in the 3D model. Parts are spread out so each one can be reached.' },
  { mode: 'name', title: 'Name the part', text: 'A part is highlighted in the model; pick its catalog name from four choices.' },
]

function FactLine({ label, claim }: { label: string; claim: Claim<string> | null }) {
  return (
    <div className="learn-fact">
      <div className="fact-label">{label}</div>
      {claim ? (
        <>
          <div>{claim.value}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <ConfidenceBadge c={claim.confidence} />
            <SourceLinks refs={claim.sources} />
          </div>
          {claim.note && <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>{claim.note}</div>}
        </>
      ) : (
        <span className="na">{NOT_AVAILABLE}</span>
      )}
    </div>
  )
}

function Home() {
  return (
    <div className="scroll learn">
      <h2 className="heading" style={{ fontSize: 20, margin: '0 0 4px' }}>Learn</h2>
      <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>
        Lessons move the camera, show the parts and play the animations for you. Every fact in a lesson is the same sourced value as in the Details panel.
      </p>
      <h3 className="learn-h">Lessons</h3>
      <div className="learn-list">
        {LESSONS.map((l) => (
          <button key={l.id} type="button" className="learn-card" onClick={() => startLesson(l.id)}>
            <span className="learn-card-title">{l.title}</span>
            <span className="muted">{l.summary}</span>
            <span className="learn-card-meta">
              <Icon name="book" size={14} /> {l.steps.length} steps
            </span>
          </button>
        ))}
      </div>
      <h3 className="learn-h">Quiz</h3>
      <div className="learn-list">
        {QUIZZES.map((q) => {
          const best = readBest(q.mode)
          return (
            <button key={q.mode} type="button" className="learn-card" onClick={() => startQuiz(q.mode)}>
              <span className="learn-card-title">{q.title}</span>
              <span className="muted">{q.text}</span>
              <span className="learn-card-meta">
                <Icon name="target" size={14} /> {ROUND_LENGTH} questions{best !== null ? ` · best ${best}/${ROUND_LENGTH}` : ''}
              </span>
            </button>
          )
        })}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>The quiz uses the ram and bonnet setup you have chosen, so changing the setup changes the questions.</p>
    </div>
  )
}

function LessonView({ lesson, step }: { lesson: Lesson; step: number }) {
  const ds = useViewer((s) => s.dataset)
  const s = lesson.steps[step]
  const last = step === lesson.steps.length - 1
  return (
    <div className="learn-shell">
      <div className="learn-bar">
        <div style={{ minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 12 }}>Lesson</div>
          <div className="heading" style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.title}</div>
        </div>
        <button type="button" className="btn" onClick={exitLearn}>Exit</button>
      </div>
      <div className="learn-steps" role="tablist" aria-label="Lesson steps">
        {lesson.steps.map((st, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === step} aria-label={`Step ${i + 1}: ${st.title}`} className="learn-dot" data-done={i < step} onClick={() => goToStep(i)} />
        ))}
      </div>
      <div className="scroll learn" aria-live="polite">
        <div className="muted" style={{ fontSize: 12 }}>
          Step {step + 1} of {lesson.steps.length}
        </div>
        <h2 className="heading" style={{ fontSize: 21, margin: '2px 0 8px' }}>{s.title}</h2>
        <p style={{ margin: '0 0 12px' }}>{s.look}</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {s.facts.map((f) => (
            <FactLine key={f.label} label={f.label} claim={f.get(ds)} />
          ))}
        </div>
      </div>
      <div className="learn-nav">
        <button type="button" className="btn" disabled={step === 0} onClick={() => goToStep(step - 1)}>Back</button>
        <button type="button" className="icon-btn" aria-label="Replay this step" title="Replay this step" onClick={replayStep}>
          <Icon name="reset" />
        </button>
        {last ? (
          <button type="button" className="btn btn-primary" onClick={exitLearn}>Finish</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => goToStep(step + 1)}>Next</button>
        )}
      </div>
    </div>
  )
}

function QuizView({ view }: { view: Extract<LearnView, { kind: 'quiz' }> }) {
  const ds = useViewer((s) => s.dataset)
  const title = QUIZZES.find((q) => q.mode === view.mode)!.title
  const q = view.questions[view.index]
  const result = view.phase === 'feedback' ? view.results[view.results.length - 1] : null
  const fact = q ? feedbackFact(ds, q) : null
  const points = score(view.results)

  const bar = (
    <div className="learn-bar">
      <div>
        <div className="muted" style={{ fontSize: 12 }}>Quiz</div>
        <div className="heading" style={{ fontSize: 16 }}>{title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="mono" aria-label="Score">
          {points}/{view.questions.length}
        </span>
        <button type="button" className="btn" onClick={exitLearn}>Exit</button>
      </div>
    </div>
  )

  if (!q) {
    return (
      <div className="learn-shell">
        {bar}
        <div className="scroll learn">There are no parts to ask about in this setup.</div>
      </div>
    )
  }

  if (view.phase === 'done') {
    const missed = view.results.filter((r) => !r.correct)
    const best = readBest(view.mode)
    return (
      <div className="learn-shell">
        {bar}
        <div className="scroll learn">
          <h2 className="heading" style={{ fontSize: 22, margin: '0 0 4px' }}>
            {points} of {view.questions.length} correct
          </h2>
          {best !== null && <p className="muted" style={{ margin: '0 0 12px' }}>Best score on this device: {best}/{view.questions.length}</p>}
          {missed.length > 0 && (
            <>
              <h3 className="learn-h">Parts to review</h3>
              <ul className="learn-missed">
                {missed.map((r) => (
                  <li key={r.question.targetId}>
                    <span style={{ flex: 1 }}>{r.question.name}</span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        dispatch({ type: 'selectComponent', id: r.question.targetId })
                        dispatch({ type: 'focusCamera', id: r.question.targetId })
                        useViewer.setState({ panelTab: 'details' })
                      }}
                    >
                      Show
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="learn-nav">
          <button type="button" className="btn" onClick={exitLearn}>Back to Learn</button>
          <button type="button" className="btn btn-primary" onClick={() => startQuiz(view.mode)}>Play again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="learn-shell">
      {bar}
      <div className="learn-progress" aria-hidden>
        <span style={{ width: `${((view.index + (view.phase === 'feedback' ? 1 : 0)) / view.questions.length) * 100}%` }} />
      </div>
      <div className="scroll learn" aria-live="polite">
        <div className="muted" style={{ fontSize: 12 }}>
          Question {view.index + 1} of {view.questions.length}
        </div>
        {view.mode === 'find' ? (
          <>
            <h2 className="heading" style={{ fontSize: 21, margin: '2px 0 6px' }}>Tap the {q.name}</h2>
            <p className="muted" style={{ margin: '0 0 10px', fontSize: 13 }}>Any matching part counts, in any bonnet. Drag to turn the model and scroll or pinch to zoom.</p>
          </>
        ) : (
          <>
            <h2 className="heading" style={{ fontSize: 21, margin: '2px 0 10px' }}>What is the highlighted part?</h2>
            <div className="choice-list">
              {q.choices.map((c) => {
                const state = result ? (c === q.name ? 'right' : c === result.answer ? 'wrong' : 'idle') : 'idle'
                return (
                  <button key={c} type="button" className="choice" data-state={state} disabled={!!result} onClick={() => answerName(c)}>
                    {state === 'right' && <Icon name="check" size={15} />}
                    {c}
                  </button>
                )
              })}
            </div>
          </>
        )}
        {result && (
          <div className="feedback" data-correct={result.correct}>
            <strong>{result.correct ? 'Correct.' : view.mode === 'find' ? `That is the ${result.answer}.` : 'Not quite.'}</strong>{' '}
            {result.correct ? `This is the ${q.name}.` : `The ${q.name} is highlighted in the model.`}
            {fact && (
              <div style={{ marginTop: 8 }}>
                <FactLine label={fact.label} claim={fact.claim} />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="learn-nav">
        {result ? (
          <button type="button" className="btn btn-primary" onClick={nextQuestion}>
            {view.index + 1 === view.questions.length ? 'See score' : 'Next question'}
          </button>
        ) : (
          <span className="muted" style={{ fontSize: 12.5 }}>{view.mode === 'find' ? 'Waiting for your tap on the model.' : 'Pick one answer.'}</span>
        )}
      </div>
    </div>
  )
}

/** Starts a lesson or quiz requested by the assistant (openLearn command). */
function useLearnRequests() {
  const request = useViewer((s) => s.learnRequest)
  useEffect(() => {
    if (!request) return
    if (request.lessonId) startLesson(request.lessonId)
    else if (request.quiz) startQuiz(request.quiz)
  }, [request])
}

export function LearnPanel() {
  useLearnRequests()
  const view = useLearn((s) => s.view)
  if (view.kind === 'lesson') {
    const lesson = lessonById(view.lessonId)
    return lesson ? <LessonView lesson={lesson} step={view.step} /> : <Home />
  }
  if (view.kind === 'quiz') return <QuizView view={view} />
  return <Home />
}
