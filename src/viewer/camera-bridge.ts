// Lets UI code (share links) read the camera without importing three.js into the main bundle.
// The 3D scene, which is loaded lazily, fills in `read` when its camera controls mount.

export interface CameraPose {
  position: [number, number, number]
  target: [number, number, number]
}

export const cameraBridge: { read: (() => CameraPose | null) | null } = { read: null }
