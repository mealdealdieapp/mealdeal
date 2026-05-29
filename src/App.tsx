import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { supabase } from './lib/supabase'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { useAppStore } from './store/useAppStore'
import { useProfile } from './hooks/useProfile'
import { BottomNav } from './components/layout/BottomNav'
import { FeedbackButton } from './components/ui/FeedbackButton'
import { LoginPage } from './pages/auth/LoginPage'
import { OnboardingPage } from './pages/auth/OnboardingPage'
import { RecipesPage } from './pages/RecipesPage'
import { OffersPage } from './pages/OffersPage'
import { WeeklyPage } from './pages/WeeklyPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { ProfilePage } from './pages/ProfilePage'
import { DatenschutzPage } from './pages/DatenschutzPage'
import { ImpressumPage } from './pages/ImpressumPage'
import { AGBPage } from './pages/AGBPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { Loader2, ShoppingBag, UtensilsCrossed, ListChecks } from 'lucide-react'

function AppRoutes() {
  const session = useAppStore((s) => s.session)
  const { data: profile, isLoading } = useProfile()
  const navigate = useNavigate()
  const prevSession = useRef(session)

  // Hook muss immer aufgerufen werden (Rules of Hooks) — disabled wenn kein Profil
  const offersReady = useOffersReady(
    profile?.plz ?? '',
    profile?.markets ?? [],
    !!session && !isLoading && !!profile?.plz && !!profile?.markets?.length
  )

  // After login (session goes from null → set), redirect to /recipes
  useEffect(() => {
    if (!prevSession.current && session) {
      navigate('/recipes', { replace: true })
    }
    prevSession.current = session
  }, [session, navigate])

  if (!session) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/datenschutz" element={<DatenschutzPage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/agb" element={<AGBPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  if (isLoading) return <SplashScreen />

  if (!profile?.plz || !profile?.markets?.length) {
    return (
      <Routes>
        <Route path="/datenschutz" element={<DatenschutzPage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/agb" element={<AGBPage />} />
        <Route path="*" element={<OnboardingPage />} />
      </Routes>
    )
  }

  // Angebote noch nicht da → Ladescreen zeigen
  if (offersReady === false) {
    return <OffersLoadingScreen plz={profile.plz} />
  }

  return (
    <>
      <Routes>
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/weekly" element={<WeeklyPage />} />
        <Route path="/shopping" element={<ShoppingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/datenschutz" element={<DatenschutzPage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/agb" element={<AGBPage />} />
        <Route path="/" element={<Navigate to="/recipes" replace />} />
        <Route path="*" element={<Navigate to="/recipes" replace />} />
      </Routes>
      <BottomNav />
      <FeedbackButton />
      <AddToHomeBanner />
    </>
  )
}

function useOffersReady(plz: string, markets: string[], enabled: boolean): boolean | null {
  const plzPrefix = plz ? plz.substring(0, 3) : ''
  const today = new Date().toISOString().split('T')[0]

  const { data, isLoading } = useQuery({
    queryKey: ['offers-check', plzPrefix, markets],
    queryFn: async () => {
      const { count } = await supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('plz_prefix', plzPrefix)
        .in('store', markets)
        .gte('valid_until', today)
        .limit(1)
      return (count ?? 0) > 0
    },
    enabled,
    refetchInterval: (query) => {
      // Wenn noch keine Angebote da, alle 5 Sekunden prüfen
      return query.state.data === true ? false : 5000
    },
    staleTime: 0,
  })

  if (!enabled || isLoading) return null
  return data ?? false
}

function OffersLoadingScreen({ plz }: { plz: string }) {
  const [progress, setProgress] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 85))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((d) => d.length >= 3 ? '' : d + '.')
    }, 500)
    return () => clearInterval(timer)
  }, [])

  const features = [
    { icon: ShoppingBag, title: 'Angebote laden', desc: `Aktuelle Deals für PLZ ${plz}`, done: progress > 20 },
    { icon: UtensilsCrossed, title: 'Rezepte abgleichen', desc: 'Passende Rezepte zu den Angeboten', done: progress > 50 },
    { icon: ListChecks, title: 'Alles vorbereiten', desc: 'Dein persönlicher Einkaufsassistent', done: progress > 75 },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <img src="/logo-icon.png" alt="MealDeal" className="w-20 h-20 mx-auto mb-4" />
        <h1 className="font-display text-[26px] font-extrabold tracking-tight mb-1">
          <span className="text-dark">Meal</span><span className="text-primary">Deal</span>
        </h1>
        <p className="text-[14px] text-muted mb-8">
          Angebote werden geladen{dots}
        </p>

        {/* Progress */}
        <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-8" style={{ border: '1px solid #EBEBEB' }}>
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Feature Steps */}
        <div className="space-y-3 text-left">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-card p-3.5 flex items-center gap-3.5 transition-all duration-500"
              style={{
                border: '1.5px solid #EBEBEB',
                opacity: f.done ? 1 : 0.4,
                transform: f.done ? 'translateY(0)' : 'translateY(4px)',
              }}
            >
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                <f.icon size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <span className="font-display text-[14px] font-extrabold text-dark block">{f.title}</span>
                <span className="text-[12px] text-muted">{f.desc}</span>
              </div>
              {f.done && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-muted">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-[12px]">Das dauert nur einen Moment</span>
        </div>
      </div>
    </div>
  )
}

function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-5">
      <img src="/logo-icon.png" alt="MealDeal" className="w-20 h-20 animate-logo-bounce" />
      <h1 className="font-display text-[26px] font-extrabold tracking-tight">
        <span className="text-dark">Meal</span><span className="text-primary">Deal</span>
      </h1>
      <div className="w-32 h-[3px] rounded-full overflow-hidden bg-primary/15 mt-2">
        <div className="h-full w-1/2 rounded-full bg-primary animate-loading-bar" />
      </div>
    </div>
  )
}

export default function App() {
  const setSession = useAppStore((s) => s.setSession)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // Bei Logout oder User-Wechsel: Cache leeren damit keine Daten vom vorherigen User angezeigt werden
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession])

  if (!ready) return <SplashScreen />

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
