import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { useViewer } from './state/store'

// Dev-only handle for debugging and browser tests.
if (import.meta.env.DEV) Object.assign(window, { __viewer: useViewer })

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
