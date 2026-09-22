import type { Object3D } from 'three'

/** Live scene objects by component id, used to frame the camera on real bounds. */
export const objectRegistry = new Map<string, Object3D>()
