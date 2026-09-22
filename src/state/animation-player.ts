import type { AnimationDef, CavityId } from '../data/types'
import { useViewer } from './store'

let frame: number | null = null

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

export function stopAnimation(): void {
  if (frame !== null) cancelAnimationFrame(frame)
  frame = null
  useViewer.setState({ playingAnimation: null, highlighted: new Set() })
}

function highlightIds(anim: AnimationDef): Set<string> {
  if (!anim.highlight) return new Set()
  const ds = useViewer.getState().dataset
  return new Set(
    ds.components
      .filter((c) => c.cavity === 'upper' && c.catalogItem !== undefined && anim.highlight!.includes(c.catalogItem))
      .filter((c) => c.catalogItem !== 4 || c.id.endsWith('/ram-body'))
      .map((c) => c.id),
  )
}

export function startAnimation(anim: AnimationDef): void {
  stopAnimation()
  useViewer.setState({ playingAnimation: anim.id, highlighted: highlightIds(anim) })
  const speed = reducedMotion() ? 20 : 1
  let stepIdx = 0
  let stepStart = performance.now()
  let from: Record<CavityId, number> = startValues(anim, 0)

  const tick = (now: number) => {
    const step = anim.steps[stepIdx]
    if (!step) {
      frame = null
      useViewer.setState({ playingAnimation: null })
      return
    }
    const t = Math.min(1, ((now - stepStart) / 1000 / step.duration) * speed)
    const k = { ...useViewer.getState().kinematics }
    for (const cav of cavitiesOf(step.cavity)) {
      k[cav] = { ...k[cav], [step.channel]: from[cav] + (step.to - from[cav]) * ease(t) }
    }
    useViewer.setState({ kinematics: k })
    if (t >= 1) {
      stepIdx += 1
      stepStart = now
      from = startValues(anim, stepIdx)
    }
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

function cavitiesOf(c: CavityId | 'all'): CavityId[] {
  return c === 'all' ? ['upper', 'lower'] : [c]
}

function startValues(anim: AnimationDef, idx: number): Record<CavityId, number> {
  const step = anim.steps[idx]
  const k = useViewer.getState().kinematics
  if (!step) return { upper: 0, lower: 0 }
  return { upper: k.upper[step.channel], lower: k.lower[step.channel] }
}
