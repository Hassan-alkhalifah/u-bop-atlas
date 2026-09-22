import { ContactShadows, Environment, Grid, Lightformer } from '@react-three/drei'
import { EffectComposer, FXAA, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { UnsignedByteType } from 'three'
import { useViewer } from '../state/store'

/**
 * Studio lighting built from procedural light formers, so no HDR file is downloaded.
 * Reflections on machined parts and paint come from this environment.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={0.9}>
      <color attach="background" args={['#39403f']} />
      <Lightformer form="rect" intensity={3.2} position={[0, 60, 0]} rotation-x={Math.PI / 2} scale={[120, 60, 1]} />
      <Lightformer form="rect" intensity={2.2} position={[-90, 20, 40]} rotation-y={Math.PI / 2.4} scale={[60, 24, 1]} />
      <Lightformer form="rect" intensity={1.6} position={[90, 10, -40]} rotation-y={-Math.PI / 2.4} scale={[60, 18, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#dfe8f0" position={[0, 12, 110]} scale={[140, 10, 1]} />
      <Lightformer form="ring" intensity={1.4} position={[40, 40, 80]} scale={20} />
    </Environment>
  )
}

export function Stage({ floorY }: { floorY: number }) {
  const quality = useViewer((s) => s.quality)
  const high = quality === 'high'
  return (
    <>
      <color attach="background" args={['#D3D9D2']} />
      <StudioEnvironment />
      <hemisphereLight args={['#F4F6F2', '#7C857F', 0.35]} />
      <directionalLight
        position={[110, 190, 150]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[high ? 4096 : 2048, high ? 4096 : 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-camera-near={10}
        shadow-camera-far={600}
      />
      <directionalLight position={[-160, 60, -120]} intensity={0.45} />
      <ContactShadows position={[0, floorY + 0.05, 0]} scale={320} resolution={high ? 1024 : 512} blur={2.6} opacity={0.55} far={90} frames={Infinity} />
      <Grid position={[0, floorY, 0]} args={[600, 600]} cellSize={6} cellThickness={0.5} sectionSize={36} sectionThickness={1} cellColor="#B9C1BA" sectionColor="#A2ACA4" fadeDistance={520} infiniteGrid />
      {high && (
        // 8-bit buffers without MSAA: half-float + multisampled targets rendered blank on ANGLE/D3D11.
        <EffectComposer multisampling={0} frameBufferType={UnsignedByteType}>
          <N8AO aoRadius={7} distanceFalloff={1.2} intensity={2.4} quality="medium" color="#1c2427" />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <FXAA />
        </EffectComposer>
      )}
    </>
  )
}
