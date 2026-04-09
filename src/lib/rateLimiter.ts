/**
 * Client-side Rate Limiter
 * Schützt vor exzessiven API-Aufrufen und hohen Supabase-Rechnungen
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const limits = new Map<string, RateLimitEntry>()

/**
 * Prüft ob eine Aktion erlaubt ist (Token-Bucket-artig)
 * @param key - Eindeutiger Schlüssel für die Aktion
 * @param maxCalls - Maximale Aufrufe im Zeitfenster
 * @param windowMs - Zeitfenster in Millisekunden
 * @returns true wenn erlaubt, false wenn Rate-Limit erreicht
 */
export function checkRateLimit(key: string, maxCalls: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = limits.get(key)

  if (!entry || now >= entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count < maxCalls) {
    entry.count++
    return true
  }

  return false
}

/**
 * Gibt die verbleibende Wartezeit zurück (0 = sofort erlaubt)
 */
export function getRateLimitWait(key: string): number {
  const entry = limits.get(key)
  if (!entry) return 0
  const remaining = entry.resetAt - Date.now()
  return remaining > 0 ? remaining : 0
}

// ===== Vordefinierte Limits =====

/** Feedback: Max 3 pro 10 Minuten */
export function canSendFeedback(): boolean {
  return checkRateLimit('feedback', 3, 10 * 60 * 1000)
}

/** Login-Versuche: Max 5 pro 5 Minuten */
export function canAttemptLogin(): boolean {
  return checkRateLimit('auth_login', 5, 5 * 60 * 1000)
}

/** Signup: Max 3 pro 10 Minuten */
export function canAttemptSignup(): boolean {
  return checkRateLimit('auth_signup', 3, 10 * 60 * 1000)
}

/** Password Reset: Max 3 pro 15 Minuten */
export function canResetPassword(): boolean {
  return checkRateLimit('auth_reset', 3, 15 * 60 * 1000)
}

/** Profil-Updates: Max 10 pro Minute */
export function canUpdateProfile(): boolean {
  return checkRateLimit('profile_update', 10, 60 * 1000)
}

/** Shopping-Mutationen: Max 30 pro Minute */
export function canMutateShopping(): boolean {
  return checkRateLimit('shopping_mutation', 30, 60 * 1000)
}

/** Scrape: Max 2 pro Stunde (zusätzlich zum localStorage-Cooldown) */
export function canScrape(): boolean {
  return checkRateLimit('scrape', 2, 60 * 60 * 1000)
}

/** Custom Recipe Upload: Max 5 pro 10 Minuten */
export function canUploadRecipe(): boolean {
  return checkRateLimit('recipe_upload', 5, 10 * 60 * 1000)
}
