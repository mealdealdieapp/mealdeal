import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Mail, KeyRound, X } from 'lucide-react'
import { Portal } from '../../components/ui/Portal'
import { canAttemptLogin, canAttemptSignup, canResetPassword } from '../../lib/rateLimiter'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [signupDone, setSignupDone] = useState(false)
  const [resending, setResending] = useState(false)

  // Reset password modal
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (mode === 'login') {
      if (!canAttemptLogin()) {
        setError('Zu viele Versuche. Bitte warte ein paar Minuten.')
        setLoading(false)
        return
      }
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) setError(authError.message)
    } else {
      if (password.length < 8) {
        setError('Passwort muss mindestens 8 Zeichen lang sein.')
        setLoading(false)
        return
      }
      if (!canAttemptSignup()) {
        setError('Zu viele Versuche. Bitte warte ein paar Minuten.')
        setLoading(false)
        return
      }
      const { error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) setError(authError.message)
      else setSignupDone(true)
    }
    setLoading(false)
  }

  const handleResend = async () => {
    setResending(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
  }

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) return
    if (!canResetPassword()) {
      setResetError('Zu viele Versuche. Bitte warte ein paar Minuten.')
      return
    }
    setResetLoading(true)
    setResetError(null)

    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${appUrl}/reset-password`,
    })

    if (error) {
      setResetError(error.message)
    } else {
      setResetSent(true)
    }
    setResetLoading(false)
  }

  const openResetModal = () => {
    setResetEmail(email) // Pre-fill with login email
    setResetError(null)
    setResetSent(false)
    setShowReset(true)
  }

  const closeResetModal = () => {
    setShowReset(false)
    setResetSent(false)
    setResetError(null)
  }

  if (signupDone) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-primary" />
          </div>
          <h2 className="font-display text-[22px] font-extrabold text-dark">E-Mail bestätigen</h2>
          <p className="text-[14px] text-muted mt-2">
            Wir haben eine Bestätigungs-E-Mail an <span className="font-bold text-dark">{email}</span> gesendet.
          </p>
          <p className="text-[13px] text-muted mt-1">Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.</p>
          <button onClick={handleResend} disabled={resending}
            className="mt-6 w-full py-3 bg-white text-primary font-bold text-[14px] rounded-btn active:bg-background disabled:opacity-50"
            style={{ border: '1.5px solid #EBEBEB' }}>
            {resending ? 'Wird gesendet...' : 'E-Mail erneut senden'}
          </button>
          <button onClick={() => { setSignupDone(false); setMode('login') }}
            className="mt-3 w-full text-center text-[13px] text-muted">
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10 flex flex-col items-center gap-3">
          <img src="/logo-icon.png" alt="MealDeal" className="w-20 h-20" />
          <h1 className="font-display text-[32px] font-extrabold tracking-tight">
            <span className="text-dark">Meal</span>
            <span className="text-primary">Deal</span>
          </h1>
          <p className="text-muted mt-2 text-[14px]">Spare beim Kochen mit den besten Deals</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full px-4 py-3.5 bg-white rounded-btn text-[14px] text-dark placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <div>
            <input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3.5 bg-white rounded-btn text-[14px] text-dark placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {mode === 'signup' && password.length > 0 && password.length < 8 && (
              <p className="text-[12px] text-muted mt-1">Mindestens 8 Zeichen</p>
            )}
          </div>
          {error && <p className="text-red-500 text-[13px]">{error}</p>}
          <button type="submit" disabled={loading || (mode === 'signup' && password.length < 8)}
            className="w-full py-3.5 bg-primary text-white font-bold text-[15px] rounded-btn active:bg-green-800 disabled:opacity-50">
            {loading ? '...' : mode === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>
        {mode === 'login' && (
          <button onClick={openResetModal}
            className="w-full text-center text-[13px] text-primary font-medium mt-3">
            Passwort vergessen?
          </button>
        )}
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
          className="w-full text-center text-[13px] text-muted mt-3">
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
        </button>
      </div>

      {/* Password reset modal */}
      {showReset && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            <div className="absolute inset-0 bg-black/40" onClick={closeResetModal} />
            <div className="relative bg-white w-full max-w-sm p-5" style={{ borderRadius: '24px', border: '1.5px solid #EBEBEB' }}>

              {resetSent ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail size={24} className="text-primary" />
                  </div>
                  <h3 className="font-display text-[18px] font-extrabold text-dark">Schau in deine E-Mails</h3>
                  <p className="text-[13px] text-muted mt-2 leading-relaxed">
                    Wir haben einen Link zum Zurücksetzen an <span className="font-bold text-dark">{resetEmail}</span> gesendet.
                  </p>
                  <p className="text-[12px] text-muted mt-1">Der Link ist 1 Stunde gültig.</p>
                  <button onClick={closeResetModal}
                    className="mt-5 w-full py-3 bg-primary text-white font-bold text-[14px] rounded-btn active:bg-green-800">
                    Verstanden
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center">
                        <KeyRound size={18} className="text-primary" />
                      </div>
                      <h3 className="font-display text-[16px] font-extrabold text-dark">Passwort zurücksetzen</h3>
                    </div>
                    <button onClick={closeResetModal} className="w-7 h-7 flex items-center justify-center rounded-full bg-background">
                      <X size={14} className="text-muted" />
                    </button>
                  </div>
                  <p className="text-[13px] text-muted mb-3">
                    Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.
                  </p>
                  <input
                    type="email"
                    placeholder="E-Mail-Adresse"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-3 bg-background rounded-btn text-[14px] text-dark placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ border: '1.5px solid #EBEBEB' }}
                    onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                  />
                  {resetError && <p className="text-red-500 text-[12px] mt-2">{resetError}</p>}
                  <button
                    onClick={handleResetPassword}
                    disabled={!resetEmail.trim() || resetLoading}
                    className="w-full mt-3 py-3 bg-primary text-white font-bold text-[14px] rounded-btn active:bg-green-800 disabled:opacity-40"
                  >
                    {resetLoading ? 'Wird gesendet...' : 'Link senden'}
                  </button>
                </>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
