import { useState } from 'react'
import { Check, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useUpdateProfile } from '../../hooks/useUpdateProfile'
import { useConsent, HEALTH_DATA_CONSENT_VERSION } from '../../hooks/useConsent'
import { Portal } from '../ui/Portal'

function NumInput({ value, onChange, label, unit, min, max }: {
  value: number; onChange: (v: number) => void; label: string; unit?: string; min?: number; max?: number
}) {
  const [text, setText] = useState(String(value))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setText(raw)
    const n = Number(raw)
    if (!isNaN(n) && raw !== '') {
      onChange(Math.max(min ?? 0, Math.min(max ?? 99999, n)))
    }
  }

  const handleBlur = () => {
    if (text === '' || isNaN(Number(text))) {
      setText(String(value))
    } else {
      const clamped = Math.max(min ?? 0, Math.min(max ?? 99999, Number(text)))
      onChange(clamped)
      setText(String(clamped))
    }
  }

  return (
    <div>
      {label && <label className="text-[9px] font-bold text-muted block mb-1 uppercase">{label}</label>}
      <div className="relative">
        <input type="text" inputMode="numeric" value={text} onChange={handleChange} onBlur={handleBlur}
          className="w-full text-center text-[14px] font-bold text-dark py-2 bg-background rounded-btn focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ border: '1.5px solid #EBEBEB' }} />
        {unit && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted">{unit}</span>}
      </div>
    </div>
  )
}

function kcalToMacros(kcal: number) {
  return {
    protein: Math.round((kcal * 0.30) / 4),
    carbs: Math.round((kcal * 0.40) / 4),
    fat: Math.round((kcal * 0.30) / 9),
  }
}

function macrosToKcal(protein: number, carbs: number, fat: number) {
  return protein * 4 + carbs * 4 + fat * 9
}

export function CalorieSettings({ calTarget, onClose }: { calTarget: number; onClose: () => void }) {
  const profile = useAppStore((s) => s.profile)
  const updateProfile = useUpdateProfile()
  const healthConsent = useConsent('health_data')
  const [mode, setMode] = useState<'manual' | 'calc'>('manual')
  const [healthAck, setHealthAck] = useState(false)
  const needsHealthConsent = mode === 'calc' && !healthConsent.hasConsent

  const initMacros = profile?.protein_target
    ? { protein: profile.protein_target, carbs: profile.carbs_target ?? 0, fat: profile.fat_target ?? 0 }
    : kcalToMacros(calTarget)

  const [kcal, setKcal] = useState(calTarget)
  const [protein, setProtein] = useState(initMacros.protein)
  const [carbs, setCarbs] = useState(initMacros.carbs)
  const [fat, setFat] = useState(initMacros.fat)
  const [macroLocked, setMacroLocked] = useState(false)

  const [gender, setGender] = useState(profile?.gender ?? 'male')
  const [age, setAge] = useState(profile?.age ?? 30)
  const [weight, setWeight] = useState(profile?.weight ?? 75)
  const [height, setHeight] = useState(profile?.height ?? 175)
  const [activity, setActivity] = useState(profile?.activity ?? 1.375)
  const [goal, setGoal] = useState(profile?.goal ?? 'maintain')

  const calcResult = (() => {
    let bmr = 10 * weight + 6.25 * height - 5 * age
    bmr += gender === 'male' ? 5 : -161
    let tdee = Math.round(bmr * activity)
    if (goal === 'lose') tdee -= 400
    if (goal === 'gain') tdee += 300
    return Math.max(1200, tdee)
  })()

  const handleKcalChange = (v: number) => {
    setKcal(v)
    if (!macroLocked) {
      const m = kcalToMacros(v)
      setProtein(m.protein)
      setCarbs(m.carbs)
      setFat(m.fat)
    }
  }

  const handleMacroChange = (which: 'protein' | 'carbs' | 'fat', v: number) => {
    setMacroLocked(true)
    const p = which === 'protein' ? v : protein
    const c = which === 'carbs' ? v : carbs
    const f = which === 'fat' ? v : fat
    if (which === 'protein') setProtein(v)
    if (which === 'carbs') setCarbs(v)
    if (which === 'fat') setFat(v)
    setKcal(macrosToKcal(p, c, f))
  }

  const resetMacros = () => {
    setMacroLocked(false)
    const m = kcalToMacros(kcal)
    setProtein(m.protein)
    setCarbs(m.carbs)
    setFat(m.fat)
  }

  const totalMacroCal = macrosToKcal(protein, carbs, fat)
  const pPct = totalMacroCal > 0 ? Math.round((protein * 4 / totalMacroCal) * 100) : 0
  const cPct = totalMacroCal > 0 ? Math.round((carbs * 4 / totalMacroCal) * 100) : 0
  const fPct = totalMacroCal > 0 ? Math.round((fat * 9 / totalMacroCal) * 100) : 0

  const handleSave = async () => {
    const cal = mode === 'manual' ? kcal : calcResult
    const m = mode === 'manual' ? { protein, carbs, fat } : kcalToMacros(cal)
    if (mode === 'calc' && !healthConsent.hasConsent) {
      if (!healthAck) return
      try {
        await healthConsent.grant(HEALTH_DATA_CONSENT_VERSION)
      } catch {
        return
      }
    }
    updateProfile.mutate(
      { cal_target: cal, protein_target: m.protein, carbs_target: m.carbs, fat_target: m.fat, gender, age, weight, height, activity, goal },
      { onSuccess: onClose }
    )
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-t-[24px] w-full max-w-[480px] max-h-[85vh] flex flex-col">
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
          <div className="px-4 pb-2">
            <h3 className="font-display text-[18px] font-extrabold text-dark">Kalorienziel</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <div className="flex bg-background rounded-btn p-0.5 mb-4" style={{ border: '1.5px solid #EBEBEB' }}>
              <button onClick={() => setMode('manual')}
                className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-colors ${mode === 'manual' ? 'bg-white text-dark' : 'text-muted'}`}>
                Manuell
              </button>
              <button onClick={() => setMode('calc')}
                className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-colors ${mode === 'calc' ? 'bg-white text-dark' : 'text-muted'}`}>
                Berechnen
              </button>
            </div>

            {mode === 'manual' ? (
              <div className="space-y-4">
                <NumInput label="Kalorien pro Tag" value={kcal} onChange={handleKcalChange} unit="kcal" min={800} max={8000} />
                <div className="pt-3" style={{ borderTop: '1px solid #EBEBEB' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Makroverteilung</span>
                    {macroLocked && (
                      <button onClick={resetMacros} className="text-[10px] font-bold text-primary">Standard (30/40/30)</button>
                    )}
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden mb-3">
                    <div style={{ width: `${pPct}%`, backgroundColor: '#3B82F6' }} />
                    <div style={{ width: `${cPct}%`, backgroundColor: '#F59E0B' }} />
                    <div style={{ width: `${fPct}%`, backgroundColor: '#EF4444' }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                        <span className="text-[9px] font-bold text-muted uppercase">Protein</span>
                        <span className="text-[9px] text-muted ml-auto">{pPct}%</span>
                      </div>
                      <NumInput label="" value={protein} onChange={(v) => handleMacroChange('protein', v)} unit="g" max={500} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                        <span className="text-[9px] font-bold text-muted uppercase">Carbs</span>
                        <span className="text-[9px] text-muted ml-auto">{cPct}%</span>
                      </div>
                      <NumInput label="" value={carbs} onChange={(v) => handleMacroChange('carbs', v)} unit="g" max={800} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                        <span className="text-[9px] font-bold text-muted uppercase">Fett</span>
                        <span className="text-[9px] text-muted ml-auto">{fPct}%</span>
                      </div>
                      <NumInput label="" value={fat} onChange={(v) => handleMacroChange('fat', v)} unit="g" max={400} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted mt-2">= {totalMacroCal} kcal aus Makros</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-2 uppercase tracking-wider">Geschlecht</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ id: 'male', label: 'Mann' }, { id: 'female', label: 'Frau' }].map((g) => (
                      <button key={g.id} onClick={() => setGender(g.id)}
                        className={`py-2.5 rounded-btn text-center text-[12px] font-bold ${gender === g.id ? 'bg-green-50 text-primary' : 'bg-background text-muted'}`}
                        style={{ border: gender === g.id ? '2px solid #028350' : '1.5px solid #EBEBEB' }}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumInput label="Alter" value={age} onChange={setAge} unit="J" min={10} max={99} />
                  <NumInput label="Gewicht" value={weight} onChange={setWeight} unit="kg" min={30} max={250} />
                  <NumInput label="Groesse" value={height} onChange={setHeight} unit="cm" min={100} max={230} />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted block mb-1.5 uppercase">Aktivitaet</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[{ v: 1.2, l: 'Wenig' }, { v: 1.375, l: 'Leicht' }, { v: 1.55, l: 'Moderat' }, { v: 1.725, l: 'Sehr aktiv' }].map((a) => (
                      <button key={a.v} onClick={() => setActivity(a.v)}
                        className={`py-2 rounded-btn text-[11px] font-bold ${activity === a.v ? 'bg-green-50 text-primary' : 'bg-background text-muted'}`}
                        style={{ border: activity === a.v ? '2px solid #028350' : '1.5px solid #EBEBEB' }}>
                        {a.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted block mb-1.5 uppercase">Ziel</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[{ v: 'lose', l: 'Abnehmen' }, { v: 'maintain', l: 'Halten' }, { v: 'gain', l: 'Zunehmen' }].map((g) => (
                      <button key={g.v} onClick={() => setGoal(g.v)}
                        className={`py-2 rounded-btn text-[10px] font-bold ${goal === g.v ? 'bg-green-50 text-primary' : 'bg-background text-muted'}`}
                        style={{ border: goal === g.v ? '2px solid #028350' : '1.5px solid #EBEBEB' }}>
                        {g.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-green-50 rounded-card p-4 text-center" style={{ border: '1.5px solid #FDBA74' }}>
                  <span className="text-[11px] font-bold text-muted block mb-1">Dein Kalorienbedarf</span>
                  <span className="font-display text-[32px] font-extrabold text-primary">{calcResult}</span>
                  <span className="text-[14px] font-bold text-muted ml-1">kcal</span>
                </div>
              </div>
            )}

            {needsHealthConsent && (
              <div className="mt-4 bg-amber-50 rounded-card p-3.5" style={{ border: '1.5px solid #FDE68A' }}>
                <div className="flex items-start gap-2.5 mb-2.5">
                  <Shield size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-display text-[13px] font-extrabold text-dark">Einwilligung Gesundheitsdaten</h4>
                    <p className="text-[11px] text-muted mt-1 leading-relaxed">
                      Fuer die Berechnung brauchen wir besondere personenbezogene Daten (Art. 9 DSGVO).
                      Du kannst die Einwilligung jederzeit in deinem Profil widerrufen.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHealthAck(!healthAck)}
                  className="w-full flex items-start gap-2.5 py-2 text-left"
                >
                  <div
                    className={`w-[20px] h-[20px] rounded-[5px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      healthAck ? 'bg-primary border-primary' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {healthAck && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-[11px] text-dark leading-relaxed">
                    Ich willige ein, dass MealDeal meine Gesundheitsdaten (Gewicht, Groesse,
                    Alter, Aktivitaet, Ziel) zur Berechnung meiner Ernaehrungsempfehlungen
                    verarbeitet. Details: <Link to="/datenschutz" onClick={(e) => e.stopPropagation()} className="text-primary font-semibold underline">Datenschutz</Link>.
                  </span>
                </button>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={updateProfile.isPending || healthConsent.isGranting || (needsHealthConsent && !healthAck)}
              className="w-full mt-4 py-3 bg-primary text-white font-bold text-[14px] rounded-btn active:bg-green-800 disabled:opacity-50"
            >
              {updateProfile.isPending || healthConsent.isGranting ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
