import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initMatchingMonitor } from './lib/matchingMonitor'

// Matching Monitor initialisieren (nur im Dev-Modus)
initMatchingMonitor()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
