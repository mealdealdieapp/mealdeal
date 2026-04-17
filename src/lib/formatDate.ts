/**
 * Formatiert ein ISO-Date (YYYY-MM-DD) auf Deutsch (z.B. "14. Apr. 2026").
 * Vorher in src/components/profile/ProfileHelpers.tsx — ausgelagert damit
 * ProfileHelpers nur Components exportiert (Fast-Refresh).
 */
export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}
