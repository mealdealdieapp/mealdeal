/**
 * Feature-Flags - simple ENV-basierte Schalter fuer sanften Rollout.
 *
 * Jeder Flag liest eine ENV `VITE_FEATURE_<NAME>`. Default: aus (false).
 * Aktivieren in .env bzw. Vercel-Projekt-Settings, z.B.:
 *   VITE_FEATURE_MATCHED_OFFERS=true
 *
 * Bewusst minimal gehalten - kein Remote-Config-Service. Sobald ein
 * echter A/B-Test noetig wird, kann hier eine DB-/Remote-Quelle ergaenzt
 * werden, ohne die Aufrufstellen zu aendern.
 */

export type FeatureFlag = 'matched_offers'

const ENV_PREFIX = 'VITE_FEATURE_'

/** True, wenn der Flag per ENV auf 'true' oder '1' gesetzt ist. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const key = ENV_PREFIX + flag.toUpperCase()
  const raw = (import.meta.env as Record<string, string | undefined>)[key]
  return raw === 'true' || raw === '1'
}
