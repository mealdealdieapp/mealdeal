/**
 * Feedback-Zustand (Kauf-Tracking für "Wollen wir dein Feedback?"-Prompt).
 *
 * Ausgelagert aus FeedbackPopup.tsx, damit das Component-File nur noch Components
 * exportiert (Vite Fast-Refresh-Kompatibilität).
 */

const FEEDBACK_INTERVAL = 3 // Nach jedem 3. Kauf fragen
const FEEDBACK_STORAGE_KEY = 'mealdeal_feedback_state'

export interface FeedbackState {
  purchasesSinceLastFeedback: number
  totalFeedbackGiven: number
  lastFeedbackAt: string | null
}

export function getState(): FeedbackState {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { purchasesSinceLastFeedback: 0, totalFeedbackGiven: 0, lastFeedbackAt: null }
}

export function saveState(state: FeedbackState) {
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(state))
}

// Aufruf nach jedem "Einkauf abgeschlossen" um den Zähler zu erhöhen
export function trackPurchase(): boolean {
  const state = getState()
  state.purchasesSinceLastFeedback++
  saveState(state)

  // Dynamisches Interval: Anfangs öfter (3), später seltener (5, dann 10)
  const interval = state.totalFeedbackGiven < 3
    ? FEEDBACK_INTERVAL
    : state.totalFeedbackGiven < 10
    ? 5
    : 10

  return state.purchasesSinceLastFeedback >= interval
}
