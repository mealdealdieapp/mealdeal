import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
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
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'

function AppRoutes() {
  const session = useAppStore((s) => s.session)
  const { data: profile, isLoading } = useProfile()
  const navigate = useNavigate()
  const prevSession = useRef(session)

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
        <Route path="*" element={<OnboardingPage />} />
      </Routes>
    )
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
        <Route path="/" element={<Navigate to="/recipes" replace />} />
        <Route path="*" element={<Navigate to="/recipes" replace />} />
      </Routes>
      <BottomNav />
      <FeedbackButton />
    </>
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
