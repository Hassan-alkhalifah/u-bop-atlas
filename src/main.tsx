import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { DEFAULT_CONFIG } from './data/config'
import { applySharedView, parseShareParams } from './state/share'
import { useViewer } from './state/store'

// Dev-only handle for debugging and browser tests.
if (import.meta.env.DEV) Object.assign(window, { __viewer: useViewer })

// A share link reopens the exact view it was made from (see state/share.ts).
const shared = parseShareParams(new URLSearchParams(window.location.search), DEFAULT_CONFIG)
if (shared) applySharedView(shared)

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
