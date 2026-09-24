import { CameraControls, Html, Line } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { overallHeight } from '../geometry/params'
import { componentsInAssembly, dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { ComponentModel } from './ComponentModel'
import { objectRegistry } from './object-registry'
import { Stage } from './Stage'
import { cameraBridge } from './camera-bridge'
import { componentCenter, floorDrop } from './kinematics'

function FocusController() {
  const controls = useRef<CameraControls>(null)
  const focus = useViewer((s) => s.focusRequest)
  const cameraRequest = useViewer((s) => s.cameraRequest)
  const posed = useRef(false)
  useEffect(() => {
    const c = controls.current
    if (!c) return
    cameraBridge.read = () => {
      const p = c.getPosition(new THREE.Vector3())
      const t = c.getTarget(new THREE.Vector3())
      return { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z] }
    }
    return () => {
      cameraBridge.read = null
    }
  }, [])
  useEffect(() => {
    const c = controls.current
    if (!c || !cameraRequest) return
    const { position: p, target: t } = cameraRequest.pose
    // The first pose (from a share link) is applied instantly; later ones animate.
    void c.setLookAt(p[0], p[1], p[2], t[0], t[1], t[2], posed.current)
    posed.current = true
  }, [cameraRequest])
  useEffect(() => {
    const c = controls.current
    if (!c || !focus) return
    const s = useViewer.getState()
    const ids = s.dataset.byId.has(focus.id) ? [focus.id] : componentsInAssembly(s.dataset, focus.id === 'bop' ? 'bop' : focus.id)
    const box = new THREE.Box3()
    for (const id of ids) {
      const obj = objectRegistry.get(id)
      if (obj) box.expandByObject(obj)
    }
    if (box.isEmpty()) return
    // fitToSphere keeps the current viewing angle (fitToBox would snap to a box face).
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    sphere.radius = Math.max(sphere.radius * 1.05, 22)
    if (focus.id === 'bop') void c.rotateTo(Math.PI / 5, Math.PI / 2.6, true)
    void c.fitToSphere(sphere, true)
  }, [focus])
  return <CameraControls ref={controls} makeDefault minDistance={10} maxDistance={900} dollySpeed={0.6} />
}

function ConnectionLines() {
  const sourceId = useViewer((s) => s.showConnectionsFor)
  return sourceId ? <ConnectionLinesActive sourceId={sourceId} /> : null
}

// Subscribes to the whole store only while connections are shown (positions follow animations).
function ConnectionLinesActive({ sourceId }: { sourceId: string }) {
  const state = useViewer()
  const lines = useMemo(() => {
    const ds = state.dataset
    const src = ds.byId.get(sourceId)
    if (!src) return []
    const a = componentCenter(src, state)
    return ds.connections
      .filter((k) => k.from === sourceId || k.to === sourceId)
      .map((k) => {
        const other = ds.byId.get(k.from === sourceId ? k.to : k.from)
        return other ? { id: k.id, pts: [a, componentCenter(other, state)] as [number, number, number][], dashed: k.basis.confidence === 'D' } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [sourceId, state])
  return (
    <>
      {lines.map((l) => (
        <Line key={l.id} points={l.pts} color="#1E7F86" lineWidth={1.6} dashed={l.dashed} dashSize={1.2} gapSize={0.8} depthTest={false} renderOrder={10} />
      ))}
    </>
  )
}

function SelectionLabel() {
  const selectedId = useViewer((s) => s.selectedId)
  // <Html> needs the canvas attached to the page. A part selected before the scene mounts (share link)
  // would otherwise create the label too early and never show it, so wait one frame.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return ready && selectedId ? <SelectionLabelActive selectedId={selectedId} /> : null
}

function SelectionLabelActive({ selectedId }: { selectedId: string }) {
  const state = useViewer()
  const c = state.dataset.byId.get(selectedId)
  if (!c || !c.geometry.meshes.length) return null
  const [x, y, z] = componentCenter(c, state)
  return (
    <Html position={[x, y, z]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="callout">
        {(c.itemLabel ?? c.catalogItem) !== undefined && <span className={`balloon balloon-sm ${(c.itemLabel ?? '').length > 2 ? 'balloon-wide' : ''}`}>{c.itemLabel ?? c.catalogItem}</span>}
        <span>{c.name}</span>
      </div>
    </Html>
  )
}

function Model() {
  const components = useViewer((s) => s.dataset.components)
  return (
    <>
      {components.map((c) => (
        <ComponentModel key={c.id} component={c} />
      ))}
    </>
  )
}

export function Scene() {
  const stack = useViewer((s) => s.dataset.config.stack)
  const drop = useViewer((s) => (s.dataset.config.stack === 'double' ? floorDrop(s) : 0))
  const floorY = -overallHeight(stack).value / 2 - 0.5 - drop
  const prevStack = useRef(stack)
  useEffect(() => {
    const changed = prevStack.current !== stack
    prevStack.current = stack
    // A share link with a camera pose or a focused part keeps that view instead of the default overview.
    const s = useViewer.getState()
    if (!changed && (s.cameraRequest || s.focusRequest)) return
    const t = setTimeout(() => dispatch({ type: 'focusCamera', id: 'bop' }), 60)
    return () => clearTimeout(t)
  }, [stack])
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [150, 70, 190], fov: 32, near: 1, far: 5000 }}
      onPointerMissed={(e) => {
        if (e.type === 'click') dispatch({ type: 'selectComponent', id: null })
      }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      aria-label="3D model of the BOP. Drag to rotate, scroll to zoom, right-drag to pan."
    >
      <Stage floorY={floorY} />
      <Model />
      <ConnectionLines />
      <SelectionLabel />
      <FocusController />
    </Canvas>
  )
}
