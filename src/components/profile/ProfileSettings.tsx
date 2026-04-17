import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useUpdateProfile } from '../../hooks/useUpdateProfile'

const MARKETS = ['REWE', 'ALDI', 'Netto', 'Penny', 'Lidl', 'Kaufland', 'Edeka', 'Norma']
const DIETS = [
  { value: 'omni', label: 'Omnivor' },
  { value: 'vegetarisch', label: 'Vegetarisch' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'koscher', label: 'Koscher' },
  { value: 'high-protein', label: 'High Protein' },
  { value: 'low-carb', label: 'Low Carb' },
]
const PREFS = [
  { value: 'bio', label: 'Bio' },
  { value: 'bessere-haltung', label: 'Bessere Haltung' },
  { value: 'regional', label: 'Regional' },
  { value: 'nachhaltig', label: 'Nachhaltig' },
  { value: 'preis-leistung', label: 'Preis-Leistung' },
  { value: 'markenprodukte', label: 'Markenprodukte' },
]

export function ProfileSettings() {
  const profile = useAppStore((s) => s.profile)
  const updateProfile = useUpdateProfile()

  const [plz, setPlz] = useState(profile?.plz ?? '')
  const [markets, setMarkets] = useState<string[]>(profile?.markets ?? [])
  const [diets, setDiets] = useState<string[]>(profile?.diets ?? [])
  const [preferences, setPreferences] = useState<string[]>(profile?.preferences ?? [])
  const [saved, setSaved] = useState(false)

  // Wenn Profil asynchron nachlädt, lokale Form-State synchronisieren.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (profile) {
      setPlz(profile.plz ?? '')
      setMarkets(profile.markets ?? [])
      setDiets(profile.diets ?? [])
      setPreferences(profile.preferences ?? [])
    }
  }, [profile])
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleMarket = (m: string) => setMarkets((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m])
  const toggleDiet = (d: string) => setDiets((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  const togglePref = (p: string) => setPreferences((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])

  const hasChanges = plz !== (profile?.plz ?? '') ||
    JSON.stringify([...markets].sort()) !== JSON.stringify([...(profile?.markets ?? [])].sort()) ||
    JSON.stringify([...diets].sort()) !== JSON.stringify([...(profile?.diets ?? [])].sort()) ||
    JSON.stringify([...preferences].sort()) !== JSON.stringify([...(profile?.preferences ?? [])].sort())

  const handleSave = () => {
    updateProfile.mutate({ plz, markets, diets, preferences }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000) },
    })
  }

  return (
    <div className="space-y-3">
      <Section title="Postleitzahl">
        <input type="text" value={plz} onChange={(e) => setPlz(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="z.B. 56112" maxLength={5}
          className="w-full px-3.5 py-2.5 bg-background rounded-btn text-[14px] text-dark focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </Section>
      <Section title="Meine Märkte">
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <button key={m} onClick={() => toggleMarket(m)}
              className={`px-3.5 py-1.5 rounded-pill text-[12px] font-bold transition-colors ${markets.includes(m) ? 'bg-primary text-white' : 'bg-background text-muted'}`}>
              {m}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Ernährung">
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <button key={d.value} onClick={() => toggleDiet(d.value)}
              className={`px-3.5 py-1.5 rounded-pill text-[12px] font-bold transition-colors ${diets.includes(d.value) ? 'bg-primary text-white' : 'bg-background text-muted'}`}>
              {d.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Präferenzen">
        <div className="flex flex-wrap gap-2">
          {PREFS.map((p) => (
            <button key={p.value} onClick={() => togglePref(p.value)}
              className={`px-3.5 py-1.5 rounded-pill text-[12px] font-bold transition-colors ${preferences.includes(p.value) ? 'bg-primary text-white' : 'bg-background text-muted'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </Section>
      {hasChanges && (
        <button onClick={handleSave} disabled={updateProfile.isPending || plz.length < 5 || markets.length === 0}
          className="w-full py-3 bg-primary text-white font-bold text-[14px] rounded-btn flex items-center justify-center gap-2 disabled:opacity-40 active:bg-green-800">
          {updateProfile.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Speichern
        </button>
      )}
      {saved && <p className="text-center text-[13px] text-success font-bold">Gespeichert!</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-card p-4" style={{ border: '1.5px solid #EBEBEB' }}>
      <h3 className="text-[12px] font-bold text-muted mb-2.5">{title}</h3>
      {children}
    </div>
  )
}
