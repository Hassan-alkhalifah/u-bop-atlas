import type { ThreeEvent } from '@react-three/fiber'
import { memo, useCallback, useEffect } from 'react'
import type { Object3D } from 'three'
import { SYSTEMS } from '../data/systems'
import type { ComponentInstance } from '../data/types'
import { dispatch } from '../state/commands'
import { isVisible, useViewer } from '../state/store'
import { geometryFor, rotationFor } from './geometry-cache'
import { componentOffset, lockSpin } from './kinematics'
import { evidenceKey } from './evidence'
import { materialFor } from './materials'
import { objectRegistry } from './object-registry'

const DRAG_TOLERANCE_PX = 5

interface Props {
  component: ComponentInstance
}

function ComponentModelInner({ component: c }: Props) {
  const visible = useViewer((s) => isVisible(s, c.id))
  const offset = useViewer((s) => componentOffset(c, s).join(','))
  const spin = useViewer((s) => lockSpin(c, s))
  const selected = useViewer((s) => s.selectedId === c.id)
  const hovered = useViewer((s) => s.hoveredId === c.id)
  const highlighted = useViewer((s) => s.highlighted.has(c.id))
  const xray = useViewer((s) => s.xray)
  const paint = useViewer((s) => s.paint)
  const ghost = useViewer((s) => s.selectedId !== null && s.selectedId !== c.id)
  const focusOnly = useViewer((s) => s.showConnectionsFor !== null || s.highlighted.size > 0)
  const evidence = useViewer((s) => (s.provenanceMode ? evidenceKey(c) : null))
  const systemTint = useViewer((s) => {
    if (s.activeSystems.size !== 1) return null
    const [only] = [...s.activeSystems]
    return c.systemIds.includes(only) ? SYSTEMS[only].color : null
  })

  const register = useCallback((obj: Object3D | null) => {
    if (obj) objectRegistry.set(c.id, obj)
    else objectRegistry.delete(c.id)
  }, [c.id])

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (e.delta > DRAG_TOLERANCE_PX) return
      e.stopPropagation()
      dispatch({ type: 'selectComponent', id: c.id })
    },
    [c.id],
  )
  const onOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    useViewer.setState({ hoveredId: c.id })
    document.body.style.cursor = 'pointer'
  }, [c.id])
  const onOut = useCallback(() => {
    if (useViewer.getState().hoveredId === c.id) useViewer.setState({ hoveredId: null })
    document.body.style.cursor = ''
  }, [c.id])

  // A hidden or unmounted part never receives pointerout, so release the hover state here.
  useEffect(() => {
    if (visible) return
    if (useViewer.getState().hoveredId === c.id) {
      useViewer.setState({ hoveredId: null })
      document.body.style.cursor = ''
    }
  }, [visible, c.id])
  useEffect(() => () => {
    if (useViewer.getState().hoveredId === c.id) document.body.style.cursor = ''
  }, [c.id])

  if (!visible || c.geometry.meshes.length === 0) return null
  const [ox, oy, oz] = offset.split(',').map(Number)
  const axisY = c.geometry.meshes[0].position[1]
  const isSelfHighlighted = highlighted
  const mat = (key: (typeof c.geometry.meshes)[number]['material']) =>
    materialFor({ key, paint, selected, hovered, highlighted: isSelfHighlighted, xray, focusOnly: focusOnly && !isSelfHighlighted && !selected, ghost, evidence, systemTint })

  const meshes = c.geometry.meshes.map((spec, i) => (
    <mesh
      key={i}
      geometry={geometryFor(spec.shape)}
      material={mat(spec.material)}
      position={[spec.position[0], spec.position[1] - (c.geometry.spin ? axisY : 0), spec.position[2]]}
      rotation={spec.rotation ?? rotationFor(spec)}
      castShadow
      receiveShadow
    />
  ))

  return (
    <group ref={register} position={[ox, oy, oz]} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut} name={c.id}>
      {c.geometry.spin ? (
        <group position={[0, axisY, 0]} rotation={[spin, 0, 0]}>
          {meshes}
        </group>
      ) : (
        meshes
      )}
    </group>
  )
}

export const ComponentModel = memo(ComponentModelInner)
