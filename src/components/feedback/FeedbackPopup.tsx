import { useState, useEffect } from 'react'
import { X, Star, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { Portal } from '../ui/Portal'
import { getState, saveState } from '../../lib/feedbackState'

export function FeedbackPopup({ onClose }: { onClose: () => void }) {
  const session = useAppStore(s => s.session)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [category, setCategory] = useState<string | null>(null)

  const categories = [
    { label: 'Angebote', emoji: '🏷️' },
    { label: 'Rezepte', emoji: '🍳' },
    { label: 'Wochenplan', emoji: '📅' },
    { label: 'Einkaufsliste', emoji: '🛒' },
    { label: 'Sonstiges', emoji: '💬' },
  ]

  const handleSubmit = async () => {
    if (rating === 0) return
    setSending(true)

    // Tabelle 'feedback' existiert in Supabase, ist aber nicht in
    // database.types.ts eingetragen → any-cast bewusst.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('feedback' as any) as any).insert({
      user_id: session?.user?.id,
      message: [
        `Bewertung: ${rating}/5`,
        category ? `Bereich: ${category}` : '',
        message.trim() ? `Kommentar: ${message.trim()}` : '',
      ].filter(Boolean).join('\n'),
      app_version: '1.0.0',
    })

    if (!error) {
      const state = getState()
      state.purchasesSinceLastFeedback = 0
      state.totalFeedbackGiven++
      state.lastFeedbackAt = new Date().toISOString()
      saveState(state)
      setSent(true)
    }
    setSending(false)
  }

  // Auto-Close nach Erfolg
  useEffect(() => {
    if (sent) {
      const timer = setTimeout(onClose, 2000)
      return () => clearTimeout(timer)
    }
  }, [sent, onClose])

  if (sent) {
    return (
      <Portal>
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-24" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          <div className="relative bg-white mx-4 p-5 w-full max-w-sm text-center animate-in slide-in-from-bottom" style={{ borderRadius: '24px', border: '1.5px solid #EBEBEB' }}>
            <span className="text-[40px] block mb-2">🙏</span>
            <h3 className="font-display text-[16px] font-extrabold text-dark">Danke für dein Feedback!</h3>
            <p className="text-[12px] text-muted mt-1">Das hilft uns, MealDeal besser zu machen.</p>
          </div>
        </div>
      </Portal>
    )
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center pb-6" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative bg-white mx-4 p-5 w-full max-w-sm" style={{ borderRadius: '24px', border: '1.5px solid #EBEBEB' }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-background">
            <X size={14} className="text-muted" />
          </button>

          <h3 className="font-display text-[16px] font-extrabold text-dark mb-1">Wie gefällt dir MealDeal?</h3>
          <p className="text-[12px] text-muted mb-4">Dein Feedback hilft uns, die App zu verbessern.</p>

          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform active:scale-90"
              >
                <Star
                  size={28}
                  className={`transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Kategorie-Auswahl */}
          {rating > 0 && (
            <>
              <p className="text-[11px] text-muted mb-2">Was möchtest du bewerten?</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {categories.map(cat => (
                  <button
                    key={cat.label}
                    onClick={() => setCategory(category === cat.label ? null : cat.label)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-pill flex items-center gap-1 transition-colors ${
                      category === cat.label
                        ? 'bg-primary text-white font-bold'
                        : 'bg-background text-dark'
                    }`}
                    style={category !== cat.label ? { border: '1px solid #EBEBEB' } : {}}
                  >
                    <span>{cat.emoji}</span> {cat.label}
                  </button>
                ))}
              </div>

              {/* Freitext */}
              <textarea
                placeholder="Was können wir verbessern? (optional)"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2.5 bg-background rounded-btn text-[13px] text-dark placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                style={{ border: '1.5px solid #EBEBEB' }}
              />

              <button
                onClick={handleSubmit}
                disabled={sending || rating === 0}
                className="w-full mt-3 py-2.5 bg-primary text-white font-bold text-[13px] rounded-btn flex items-center justify-center gap-2 active:bg-green-800 disabled:opacity-50"
              >
                <Send size={14} />
                {sending ? 'Wird gesendet...' : 'Feedback senden'}
              </button>
            </>
          )}

          <button onClick={onClose} className="w-full mt-2 text-center text-[12px] text-muted py-1">
            Später
          </button>
        </div>
      </div>
    </Portal>
  )
}
