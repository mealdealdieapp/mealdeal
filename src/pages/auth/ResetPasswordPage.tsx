import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { KeyRound, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [noSession, setNoSession] = useState(false)

  // Supabase automatically picks up the token from the URL hash
  // and establishes a session via onAuthStateChange (SIGNED_IN or PASSWORD_RECOVERY)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })

    // Also check if there's already a session (user clicked link while app was open)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      } else {
        // Give Supabase a moment to process the URL token
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) setSessionReady(true)
            else setNoSession(true)
          })
        }, 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleUpdate = async () => {
    setError(null)

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/recipes', { replace: true }), 2000)
    }
    setLoading(false)
  }

  // No valid session / expired link
  if (noSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="font-display text-[22px] font-extrabold text-dark">Link ungültig</h2>
          <p className="text-[14px] text-muted mt-2">
            Dieser Link ist abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen Link an.
          </p>
          <button onClick={() => navigate('/', { replace: true })}
            className="mt-6 w-full py-3 bg-primary text-white font-bold text-[14px] rounded-btn active:bg-green-800">
            Zur Anmeldung
          </button>
        </div>
      </div>
    )
  }

  // Success
  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-success" />
          </div>
          <h2 className="font-display text-[22px] font-extrabold text-dark">Passwort geändert</h2>
          <p className="text-[14px] text-muted mt-2">
            Dein Passwort wurde erfolgreich geändert. Du wirst weitergeleitet...
          </p>
        </div>
      </div>
    )
  }

  // Waiting for session
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <KeyRound size={28} className="text-primary" />
          </div>
          <p className="text-[14px] text-muted">Link wird überprüft...</p>
        </div>
      </div>
    )
  }

  // Reset form
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
            <KeyRound size={28} className="text-primary" />
          </div>
          <h1 className="font-display text-[22px] font-extrabold text-dark">Neues Passwort</h1>
          <p className="text-[14px] text-muted">Gib dein neues Passwort ein.</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Neues Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full px-4 py-3.5 pr-12 bg-white rounded-btn text-[14px] text-dark placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/50"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Passwort bestätigen"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-3.5 bg-white rounded-btn text-[14px] text-dark placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
          />

          {password.length > 0 && password.length < 8 && (
            <p className="text-[12px] text-muted">Mindestens 8 Zeichen</p>
          )}

          {confirm.length > 0 && password !== confirm && (
            <p className="text-[12px] text-red-500">Passwörter stimmen nicht überein</p>
          )}

          {error && <p className="text-red-500 text-[13px]">{error}</p>}

          <button
            onClick={handleUpdate}
            disabled={loading || password.length < 8 || password !== confirm}
            className="w-full py-3.5 bg-primary text-white font-bold text-[15px] rounded-btn active:bg-green-800 disabled:opacity-40"
          >
            {loading ? 'Wird gespeichert...' : 'Passwort ändern'}
          </button>
        </div>
      </div>
    </div>
  )
}
