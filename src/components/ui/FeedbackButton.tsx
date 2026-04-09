import { useState } from 'react'
import { MessageCircleQuestion, X, Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { Portal } from './Portal'
import { canSendFeedback } from '../../lib/rateLimiter'

const APP_VERSION = '1.0.0'

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const session = useAppStore((s) => s.session)

  const [rateLimited, setRateLimited] = useState(false)

  const handleSend = async () => {
    if (!message.trim() || !session?.user?.id) return
    if (!canSendFeedback()) {
      setRateLimited(true)
      setTimeout(() => setRateLimited(false), 3000)
      return
    }
    setSending(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)('feedback').insert({
      user_id: session.user.id,
      message: message.trim(),
      app_version: APP_VERSION,
    })

    setSending(false)
    setSent(true)
    setTimeout(() => {
      setOpen(false)
      setSent(false)
      setMessage('')
    }, 1500)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 w-11 h-11 bg-white rounded-full flex items-center justify-center z-40 active:scale-95 transition-transform"
        style={{ border: '1.5px solid #EBEBEB', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        <MessageCircleQuestion size={18} className="text-primary" />
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            <div className="absolute inset-0 bg-black/30" onClick={() => { setOpen(false); setSent(false) }} />
            <div className="relative bg-white rounded-t-[24px] w-full max-w-[480px] mx-auto px-4 pt-2 pb-8">
              <div className="flex justify-center pt-2 pb-3"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>

              {sent ? (
                <div className="py-8 text-center">
                  <CheckCircle2 size={40} className="text-success mx-auto mb-3" />
                  <p className="font-display text-[16px] font-extrabold text-dark">Danke!</p>
                  <p className="text-[13px] text-muted mt-1">Dein Feedback hilft uns sehr.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-[16px] font-extrabold text-dark">Feedback geben</h3>
                    <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-background">
                      <X size={14} className="text-muted" />
                    </button>
                  </div>
                  <p className="text-[13px] text-muted mb-3">Was gefällt dir? Was stört dich? Was fehlt?</p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Dein Feedback..."
                    rows={4}
                    autoFocus
                    className="w-full px-3.5 py-3 bg-background rounded-btn text-[14px] text-dark placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    style={{ border: '1.5px solid #EBEBEB' }}
                  />
                  {rateLimited && (
                    <p className="text-red-500 text-[12px] mt-2">Bitte warte kurz bevor du erneut sendest.</p>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                    className="w-full mt-3 py-3 bg-primary text-white font-bold text-[14px] rounded-btn flex items-center justify-center gap-2 active:bg-green-800 disabled:opacity-40"
                  >
                    {sending ? 'Wird gesendet...' : <><Send size={15} /> Absenden</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
