import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Check, Store, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { queryClient } from '../../lib/queryClient'
import { scrapeOffersForPlz, hasOffersForPlz } from '../../lib/marktguruScraper'

const TOTAL_STEPS = 5

const MARKETS = [
  { id: 'REWE', color: '#CC0000' },
  { id: 'ALDI', color: '#00569D' },
  { id: 'Netto', color: '#FDC300' },
  { id: 'Penny', color: '#CC0000' },
  { id: 'Lidl', color: '#0050AA' },
  { id: 'Kaufland', color: '#CC0000' },
  { id: 'Edeka', color: '#E2001A' },
  { id: 'Norma', color: '#003DA5' },
]

const DIETS = [
  { id: 'omni', emoji: '🥩', label: 'Omnivor', desc: 'Ich esse alles' },
  { id: 'vegetarisch', emoji: '🥗', label: 'Vegetarisch', desc: 'Kein Fleisch und Fisch' },
  { id: 'vegan', emoji: '🌱', label: 'Vegan', desc: 'Keine tierischen Produkte' },
  { id: 'halal', emoji: '🌙', label: 'Halal', desc: 'Nach islamischen Speisegesetzen' },
  { id: 'koscher', emoji: '✡️', label: 'Koscher', desc: 'Nach jüdischen Speisegesetzen' },
  { id: 'high-protein', emoji: '💪', label: 'High-Protein', desc: 'Proteinreich für Sport & Fitness' },
  { id: 'low-carb', emoji: '🥦', label: 'Low-Carb', desc: 'Wenig Kohlenhydrate' },
]

const PREFERENCES = [
  { id: 'bio', emoji: '🌿', label: 'Bio', desc: 'Biologisch angebaut' },
  { id: 'bessere-haltung', emoji: '🐄', label: 'Bessere Haltung', desc: 'Mindestens Stufe 3' },
  { id: 'regional', emoji: '🇩🇪', label: 'Regional', desc: 'Aus der Region' },
  { id: 'nachhaltig', emoji: '🌊', label: 'Nachhaltig', desc: 'MSC/ASC zertifiziert' },
  { id: 'preis-leistung', emoji: '💰', label: 'Preis-Leistung', desc: 'Günstig und gut' },
  { id: 'markenprodukte', emoji: '🏷️', label: 'Markenprodukte', desc: 'Ich kaufe lieber Marken' },
]

export function OnboardingPage() {
  const session = useAppStore((s) => s.session)
  const navigate = useNavigate()
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [step, setStep] = useState(1)
  const [dir, setDir] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [plz, setPlz] = useState('')
  const plzRef = useRef<HTMLInputElement>(null)
  const [markets, setMarkets] = useState<string[]>([])
  const [diets, setDiets] = useState<string[]>([])
  const [preferences, setPreferences] = useState<string[]>([])

  useEffect(() => {
    if (showOnboarding && step === 1) plzRef.current?.focus()
  }, [step, showOnboarding])

  const canNext = (): boolean => {
    switch (step) {
      case 1: return plz.length === 5
      case 2: return markets.length > 0
      case 3: return diets.length > 0
      case 4: return true
      case 5: return true
      default: return false
    }
  }

  const goNext = () => { if (canNext() && step < TOTAL_STEPS) { setDir(1); setStep(step + 1) } }
  const goBack = () => { if (step > 1) { setDir(-1); setStep(step - 1) } }

  const setProfile = useAppStore((s) => s.setProfile)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  const handleSave = async () => {
    if (!session?.user?.id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: saveError } = await supabase.from('user_profiles').upsert({
        id: session.user.id,
        plz,
        markets,
        diets,
        preferences,
      }).select().single()
      if (saveError) throw saveError
      if (data) {
        setProfile(data)

        // Angebote für PLZ laden - nur wenn nötig
        console.log('[MealDeal] Prüfe Angebote für PLZ...')
        hasOffersForPlz(plz)
          .then((hasOffers) => {
            if (hasOffers) {
              console.log('[MealDeal] Genug Angebote vorhanden, kein Scrape nötig')
              // Scrape nicht nötig
              queryClient.invalidateQueries({ queryKey: ['offers'] })
              return
            }
            console.log('[MealDeal] Starte Scrape für PLZ...')
            return scrapeOffersForPlz(plz, markets)
              .then((result) => {
                console.log(`[MealDeal] ${result.count} Angebote geladen`)
                queryClient.invalidateQueries({ queryKey: ['offers'] })
              })
          })
          .catch((err) => console.warn('[MealDeal] Angebote laden fehlgeschlagen:', err))

        setActiveTab('recipes')
        queryClient.invalidateQueries({ queryKey: ['profile'] })
        navigate('/recipes', { replace: true })
      }
    } catch (e) {
      setError('Profil konnte nicht gespeichert werden. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  const toggleMarket = (m: string) => setMarkets((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m])
  const toggleDiet = (d: string) => setDiets((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  const togglePref = (p: string) => setPreferences((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])

  const progress = (step / TOTAL_STEPS) * 100

  if (!showOnboarding) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 flex flex-col items-center gap-3">
            <img src="/logo-icon.png" alt="MealDeal" className="w-16 h-16" />
            <h1 className="font-display text-[26px] font-extrabold tracking-tight">
              <span className="text-dark">Meal</span>
              <span className="text-primary">Deal</span>
            </h1>
          </div>

          <div className="bg-white rounded-card p-4" style={{ border: '1.5px solid #EBEBEB' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={20} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-display text-[16px] font-extrabold text-dark">Beta-Test</h2>
                <p className="text-[13px] text-muted mt-1 leading-relaxed">
                  Diese App befindet sich im Beta-Test. Funktionen können sich ändern und es können Fehler auftreten.
                </p>
              </div>
            </div>

            <button
              onClick={() => setPrivacyAccepted(!privacyAccepted)}
              className="w-full flex items-start gap-3 py-3 px-1 text-left"
            >
              <div
                className={`w-[22px] h-[22px] rounded-[6px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  privacyAccepted ? 'bg-primary border-primary' : 'border-gray-300'
                }`}
              >
                {privacyAccepted && <Check size={13} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-[13px] text-dark leading-relaxed">
                Ich habe die{' '}
                <Link
                  to="/datenschutz"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary font-semibold underline"
                >
                  Datenschutzerklärung
                </Link>{' '}
                gelesen und stimme der Verarbeitung meiner Daten zu.
              </span>
            </button>
          </div>

          <button
            onClick={() => setShowOnboarding(true)}
            disabled={!privacyAccepted}
            className="w-full mt-4 py-3.5 bg-primary text-white font-bold text-[15px] rounded-btn active:bg-green-800 disabled:opacity-30 transition-opacity"
          >
            Los geht's
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-5 pb-2 flex items-center justify-between">
        {step > 1 ? (
          <button onClick={goBack} className="flex items-center gap-1 text-[13px] text-muted font-medium">
            <ArrowLeft size={16} /> Zurück
          </button>
        ) : <div />}
        <span className="text-[11px] font-bold text-muted">Schritt {step} von {TOTAL_STEPS}</span>
      </div>

      {/* Progress bar */}
      <div className="mx-4 h-1.5 rounded-full overflow-hidden" style={{ border: '1px solid #EBEBEB' }}>
        <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 pb-32 overflow-y-auto mt-4">
        <div
          key={step}
          style={{ animation: `slideIn${dir > 0 ? 'Right' : 'Left'} 0.3s ease-out` }}
        >
          {step === 1 && <StepPLZ plz={plz} setPlz={setPlz} inputRef={plzRef} />}
          {step === 2 && <StepMarkets markets={markets} toggle={toggleMarket} />}
          {step === 3 && <StepDiet diets={diets} toggle={toggleDiet} />}
          {step === 4 && <StepPreferences preferences={preferences} toggle={togglePref} />}
          {step === 5 && <StepDone plz={plz} markets={markets} diets={diets} />}
        </div>
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent max-w-[480px] mx-auto">
        {error && <p className="text-red-500 text-[13px] text-center mb-2">{error}</p>}
        {step < TOTAL_STEPS ? (
          <button
            onClick={goNext}
            disabled={!canNext()}
            className="w-full py-3.5 bg-primary text-white font-bold text-[15px] rounded-btn active:bg-green-800 disabled:opacity-30 transition-opacity"
          >
            Weiter
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3.5 bg-primary text-white font-bold text-[15px] rounded-btn active:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Wird gespeichert...' : 'Angebote entdecken'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Step Components ─── */

function StepHeadline({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-[22px] font-extrabold text-dark leading-tight">{title}</h2>
      <p className="text-[14px] text-muted mt-1.5">{sub}</p>
    </div>
  )
}

function StepPLZ({ plz, setPlz, inputRef }: { plz: string; setPlz: (v: string) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <>
      <StepHeadline title="Wo kaufst du ein?" sub="Wir zeigen dir nur Angebote aus deiner Umgebung" />
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        placeholder="z.B. 56112"
        value={plz}
        onChange={(e) => setPlz(e.target.value.replace(/\D/g, '').slice(0, 5))}
        maxLength={5}
        className="w-full text-center text-[28px] font-display font-extrabold text-dark py-4 bg-white rounded-card tracking-[8px] placeholder:tracking-[4px] placeholder:text-muted/30 placeholder:text-[20px] placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
        style={{ border: '1.5px solid #EBEBEB' }}
      />
      {plz.length > 0 && plz.length < 5 && (
        <p className="text-center text-[12px] text-muted mt-3">Noch {5 - plz.length} Ziffer{5 - plz.length !== 1 ? 'n' : ''}</p>
      )}
    </>
  )
}

function StepMarkets({ markets, toggle }: { markets: string[]; toggle: (m: string) => void }) {
  return (
    <>
      <StepHeadline title="Wo kaufst du am liebsten ein?" sub="Wähle alle Märkte die du regelmäßig besuchst" />
      <div className="grid grid-cols-2 gap-2.5">
        {MARKETS.map((m) => {
          const selected = markets.includes(m.id)
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className={`relative rounded-card text-left transition-all active:scale-[0.97] overflow-hidden ${selected ? '' : 'bg-white'}`}
              style={{
                border: selected ? `2px solid ${m.color}` : '1.5px solid #EBEBEB',
                backgroundColor: selected ? `${m.color}08` : undefined,
              }}
            >
              <div className="flex items-center gap-3 p-3.5">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: selected ? `${m.color}18` : '#F5F5F0' }}
                >
                  <Store size={18} style={{ color: m.color }} strokeWidth={2} />
                </div>
                <span className="font-display text-[14px] font-extrabold text-dark">{m.id}</span>
              </div>
              {selected && (
                <div
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: m.color }}
                >
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
      {markets.length === 0 && (
        <p className="text-center text-[12px] text-muted mt-3">Mindestens einen Markt auswählen</p>
      )}
    </>
  )
}

function StepDiet({ diets, toggle }: { diets: string[]; toggle: (d: string) => void }) {
  return (
    <>
      <StepHeadline title="Wie ernährst du dich?" sub="Deine Rezepte und Angebote werden darauf abgestimmt" />
      <div className="space-y-2.5">
        {DIETS.map((d) => {
          const selected = diets.includes(d.id)
          return (
            <button
              key={d.id}
              onClick={() => toggle(d.id)}
              className={`w-full p-3.5 rounded-card text-left flex items-center gap-3.5 transition-all active:scale-[0.98] ${selected ? 'bg-green-50' : 'bg-white'}`}
              style={{ border: selected ? '2px solid #028350' : '1.5px solid #EBEBEB' }}
            >
              <span className="text-[26px] leading-none w-9 text-center shrink-0">{d.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="font-display text-[14px] font-extrabold text-dark block">{d.label}</span>
                <span className="text-[12px] text-muted">{d.desc}</span>
              </div>
              {selected && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

function StepPreferences({ preferences, toggle }: { preferences: string[]; toggle: (p: string) => void }) {
  return (
    <>
      <StepHeadline title="Was ist dir wichtig?" sub="So finden wir die besten Angebote für dich" />
      <div className="space-y-2.5">
        {PREFERENCES.map((p) => {
          const selected = preferences.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`w-full p-3.5 rounded-card text-left flex items-center gap-3.5 transition-all active:scale-[0.98] ${selected ? 'bg-green-50' : 'bg-white'}`}
              style={{ border: selected ? '2px solid #028350' : '1.5px solid #EBEBEB' }}
            >
              <span className="text-[26px] leading-none w-9 text-center shrink-0">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="font-display text-[14px] font-extrabold text-dark block">{p.label}</span>
                <span className="text-[12px] text-muted">{p.desc}</span>
              </div>
              {selected && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-center text-[12px] text-muted mt-3">Optional - du kannst diesen Schritt auch überspringen</p>
    </>
  )
}

function StepDone({ plz, markets, diets }: {
  plz: string; markets: string[]; diets: string[]
}) {
  const dietLabels = diets.map((d) => DIETS.find((x) => x.id === d)).filter(Boolean)
  return (
    <div className="text-center">
      <div className="mb-8 mt-4 flex flex-col items-center gap-3">
        <img src="/logo-icon.png" alt="MealDeal" className="w-16 h-16" />
        <h1 className="font-display text-[26px] font-extrabold tracking-tight">
          <span className="text-dark">Meal</span><span className="text-primary">Deal</span>
        </h1>
      </div>

      <h2 className="font-display text-[24px] font-extrabold text-dark">Alles bereit!</h2>
      <p className="text-[14px] text-muted mt-1.5 mb-6">Dein persönlicher Einkaufsassistent ist bereit</p>

      <div className="space-y-2.5 text-left">
        <SummaryRow label="Postleitzahl" value={plz} />
        <SummaryRow label="Märkte" value={markets.join(', ')} />
        {dietLabels.length > 0 && (
          <SummaryRow label="Ernährung" value={dietLabels.map((d) => `${d!.emoji} ${d!.label}`).join(', ')} />
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-btn px-4 py-3" style={{ border: '1.5px solid #EBEBEB' }}>
      <span className="text-[11px] text-muted block">{label}</span>
      <span className="text-[14px] font-bold text-dark block truncate">{value}</span>
    </div>
  )
}
