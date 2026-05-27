import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Lokal gehostete Schriftarten (DSGVO-konform, ohne Google Fonts CDN).
// Bricolage Grotesque (Headlines): Gewichte 400-800
import '@fontsource/bricolage-grotesque/400.css'
import '@fontsource/bricolage-grotesque/500.css'
import '@fontsource/bricolage-grotesque/600.css'
import '@fontsource/bricolage-grotesque/700.css'
import '@fontsource/bricolage-grotesque/800.css'
// DM Sans (Body): Gewichte 400-700
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'

import './index.css'
import App from './App'
import { initMatchingMonitor } from './lib/matchingMonitor'
import { initSentry } from './lib/sentry'

// Fehlerueberwachung initialisieren (nur im Production-Build aktiv)
initSentry()

// Matching Monitor initialisieren (nur im Dev-Modus)
initMatchingMonitor()

// Service Worker registrieren (Caching + Push). Nur in Production, damit
// Vite-HMR im Dev-Modus nicht stoert.
if (
  import.meta.env.PROD &&
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service Worker registration failed:', err)
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
