import { useState, useEffect } from 'react'
import { Save, Loader2, Shield, Download, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useUpdateProfile } from '../../hooks/useUpdateProfile'
import { useConsent } from '../../hooks/useConsent'
import { useAccountActions } from '../../hooks/useAccountActions'

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
  const healthConsent = useConsent('health_data')
  const account = useAccountActions()
  const [revokeConfirm, setRevokeConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const handleRevokeHealth = async () => {
    if (!revokeConfirm) {
      setRevokeConfirm(true)
      return
    }
    try {
      await healthConsent.revoke()
      updateProfile.mutate({
        gender: null,
        age: null,
        weight: null,
        height: null,
        activity: null,
        goal: null,
        cal_target: null,
        protein_target: null,
        carbs_target: null,
        fat_target: null,
      })
    } finally {
      setRevokeConfirm(false)
    }
  }

  const handleExport = async () => {
    try {
      await account.exportData()
      setActionMsg('Datenexport heruntergeladen.')
      setTimeout(() => setActionMsg(null), 3000)
    } catch (err) {
      setActionMsg((err as Error)?.message ?? 'Export fehlgeschlagen')
      setTimeout(() => setActionMsg(null), 4000)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    try {
      await account.requestDeletion()
    } catch (err) {
      setActionMsg((err as Error)?.message ?? 'Loeschen fehlgeschlagen')
      setDeleteConfirm(false)
    }
  }

  const [plz, setPlz] = useState(profile?.plz ?? '')
  const [markets, setMarkets] = useState<string[]>(profile?.markets ?? [])
  const [diets, setDiets] = useState<string[]>(profile?.diets ?? [])
  const [preferences, setPreferences] = useState<string[]>(profile?.preferences ?? [])
  const [saved, setSaved] = useState(false)

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
      <Section title="Meine Maerkte">
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <button key={m} onClick={() => toggleMarket(m)}
              className={`px-3.5 py-1.5 rounded-pill text-[12px] font-bold transition-colors ${markets.includes(m) ? 'bg-primary text-white' : 'bg-background text-muted'}`}>
              {m}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Ernaehrung">
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <button key={d.value} onClick={() => toggleDiet(d.value)}
              className={`px-3.5 py-1.5 rounded-pill text-[12px] font-bold transition-colors ${diets.includes(d.value) ? 'bg-primary text-white' : 'bg-background text-muted'}`}>
              {d.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Praeferenzen">
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

      <div className="bg-white rounded-card p-4" style={{ border: '1.5px solid #EBEBEB' }}>
        <div className="flex items-start gap-2.5 mb-2">
          <Shield size={16} className="text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-bold text-dark">Gesundheitsdaten (Art. 9 DSGVO)</h3>
            <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
              {healthConsent.isLoading
                ? 'Status wird geladen...'
                : healthConsent.hasConsent
                  ? `Aktive Einwilligung seit ${healthConsent.grantedAt ? new Date(healthConsent.grantedAt).toLocaleDateString('de-DE') : ''}. Du kannst sie jederzeit widerrufen - dabei werden deine Gewichts-, Groessen- und Aktivitaetsdaten geloescht.`
                  : 'Keine aktive Einwilligung. Sobald du im Wochenplan deinen Kalorienbedarf berechnen laesst, fragen wir dich danach.'}
            </p>
          </div>
        </div>
        {healthConsent.hasConsent && (
          <button
            onClick={handleRevokeHealth}
            disabled={healthConsent.isRevoking || updateProfile.isPending}
            className="w-full mt-2 py-2 bg-background text-[12px] font-bold text-red-600 rounded-btn active:bg-red-50 disabled:opacity-50"
            style={{ border: '1.5px solid #FECACA' }}
          >
            {healthConsent.isRevoking
              ? 'Widerruf laeuft...'
              : revokeConfirm
                ? 'Wirklich widerrufen? Daten werden geloescht'
                : 'Einwilligung widerrufen'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-card p-4 space-y-2" style={{ border: '1.5px solid #EBEBEB' }}>
        <h3 className="text-[12px] font-bold text-muted mb-1">Meine Daten</h3>
        <button
          onClick={handleExport}
          disabled={account.isExporting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-background text-[12px] font-bold text-dark rounded-btn active:bg-gray-100 disabled:opacity-50"
          style={{ border: '1.5px solid #EBEBEB' }}
        >
          {account.isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {account.isExporting ? 'Wird vorbereitet...' : 'Meine Daten herunterladen'}
        </button>
        <p className="text-[10px] text-muted leading-relaxed">
          Lade alle ueber dich gespeicherten Daten als JSON-Datei herunter (Art. 15 + 20 DSGVO).
        </p>

        <button
          onClick={handleDelete}
          disabled={account.isDeleting}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-[12px] font-bold text-red-600 rounded-btn active:bg-red-100 disabled:opacity-50"
          style={{ border: '1.5px solid #FECACA' }}
        >
          {account.isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {account.isDeleting
            ? 'Wird angefragt...'
            : deleteConfirm
              ? 'Wirklich endgueltig loeschen? Letzte Chance'
              : 'Account loeschen'}
        </button>
        <p className="text-[10px] text-muted leading-relaxed">
          Dein Account wird sofort deaktiviert und alle Daten innerhalb von 30 Tagen unwiderruflich entfernt (Art. 17 DSGVO).
        </p>
        {actionMsg && <p className="text-[11px] text-center mt-1.5 text-muted">{actionMsg}</p>}
      </div>
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
