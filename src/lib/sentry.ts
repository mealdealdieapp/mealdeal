/**
 * Sentry-Fehlerueberwachung.
 *
 * Initialisiert das Sentry-SDK - aber nur im Production-Build. Im Dev-Modus
 * bleibt es aus, damit lokale Fehler kein Rauschen erzeugen.
 *
 * Die DSN ist kein Geheimnis: sie landet planmaessig im Browser-Bundle und
 * erlaubt ausschliesslich das Senden von Events (kein Lesezugriff). Sie kann
 * per ENV `VITE_SENTRY_DSN` ueberschrieben werden; ohne ENV greift der
 * eingebaute Default.
 */

import * as Sentry from '@sentry/react'

const DEFAULT_DSN =
  'https://39a1dc74f7a352b989d3a798f85bc605@o4511424634224640.ingest.de.sentry.io/4511424972259408'

const SENTRY_DSN: string = import.meta.env.VITE_SENTRY_DSN || DEFAULT_DSN

/** Initialisiert Sentry. Nur im Production-Build aktiv. */
export function initSentry(): void {
  if (!import.meta.env.PROD) return
  if (!SENTRY_DSN) return

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Konservatives Performance-Sampling: 10 % der Transaktionen.
    tracesSampleRate: 0.1,
    // Keine personenbezogenen Daten automatisch mitsenden (DSGVO).
    sendDefaultPii: false,
  })
}

/** Meldet einen gefangenen Fehler an Sentry (no-op, wenn nicht initialisiert). */
export function reportError(error: unknown): void {
  Sentry.captureException(error)
}
