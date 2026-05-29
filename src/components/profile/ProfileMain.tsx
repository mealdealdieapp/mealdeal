import { useState } from 'react'
import { LogOut, Shield, FileText, Download, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProfileStats } from '../../hooks/useProfileStats'
import { useAppStore } from '../../store/useAppStore'
import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import { StatCard, MenuItem } from './ProfileHelpers'

type View = 'main' | 'settings' | 'favorites' | 'watchlist' | 'history' | 'myrecipes'

interface ProfileMainProps {
  setView: (view: View) => void
}

export function ProfileMain({ setView }: ProfileMainProps) {
  const profile = useAppStore((s) => s.profile)
  const session = useAppStore((s) => s.session)
  const setProfile = useAppStore((s) => s.setProfile)
  const { data: stats } = useProfileStats()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const navigate = useNavigate()

  const handleExport = async () => {
    if (!session?.user?.id) return
    setExporting(true)
    try {
      const [profileRes, recipesRes, plansRes, itemsRes, logsRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('saved_recipes').select('*, recipes(*)').eq('user_id', session.user.id),
        supabase.from('weekly_plans').select('*').eq('user_id', session.user.id),
        supabase.from('shopping_items').select('*').eq('user_id', session.user.id),
        supabase.from('purchase_log').select('*').eq('user_id', session.user.id),
      ])
      const exportData = {
        exportDate: new Date().toISOString(),
        profile: profileRes.data,
        savedRecipes: recipesRes.data,
        weeklyPlans: plansRes.data,
        shoppingItems: itemsRes.data,
        purchaseLog: logsRes.data,
      }
      const json = JSON.stringify(exportData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mealdeal-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      logger.error('Export error:', e)
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!session?.user?.id) return
    setDeleting(true)
    const uid = session.user.id
    try {
      await Promise.allSettled([
        supabase.from('shopping_items').delete().eq('user_id', uid),
        supabase.from('weekly_plans').delete().eq('user_id', uid),
        supabase.from('saved_recipes').delete().eq('user_id', uid),
        supabase.from('purchase_log').delete().eq('user_id', uid),
        supabase.from('watchlist').delete().eq('user_id', uid),
        (supabase.from as never as (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<unknown> } })('feedback').delete().eq('user_id', uid),
        supabase.from('custom_recipes').delete().eq('user_id', uid),
        supabase.from('user_profiles').delete().eq('id', uid),
      ])
      setProfile(null)
      await supabase.auth.signOut()
    } catch (e) {
      logger.error('Account-Löschung Fehler:', e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <span className="text-[28px]">👤</span>
        </div>
        <h2 className="font-display text-[18px] font-extrabold text-dark">
          {profile?.plz ? `PLZ ${profile.plz}` : 'Mein Profil'}
        </h2>
        {profile?.markets && profile.markets.length > 0 && (
          <p className="text-[12px] text-muted mt-0.5">{profile.markets.join(' · ')}</p>
        )}
        {profile?.diets && profile.diets.length > 0 && (
          <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
            {profile.diets.map((d) => (
              <span key={d} className="text-[10px] font-bold text-primary bg-green-50 px-2 py-0.5 rounded-pill">{d}</span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard emoji="💰" value={`${(stats?.totalSaved ?? 0).toFixed(0)}€`} label="Gespart" bg="bg-green-50" color="text-success" />
        <StatCard emoji="🛒" value={`${stats?.purchaseCount ?? 0}`} label="Einkäufe" bg="bg-blue-50" color="text-blue-500" />
        <StatCard emoji="📅" value={`${(stats?.weekSaved ?? 0).toFixed(0)}€`} label="Diese Woche" bg="bg-green-50" color="text-primary" />
      </div>

      {/* Menu items */}
      <div className="space-y-2">
        <MenuItem emoji="❤️" label="Favoriten" sub="Gespeicherte Rezepte" onClick={() => setView('favorites')} />
        <MenuItem emoji="📝" label="Meine Rezepte" sub="Eigene Rezepte erstellen" onClick={() => setView('myrecipes')} />
        <MenuItem emoji="👁️" label="Watchlist" sub="Preisalarme" onClick={() => setView('watchlist')} />
        <MenuItem emoji="🧾" label="Kaufverlauf" sub="Vergangene Einkäufe" onClick={() => setView('history')} />
        <MenuItem emoji="⚙️" label="Einstellungen" sub="PLZ, Märkte, Ernährung" onClick={() => setView('settings')} />
      </div>

      <div className="flex gap-2 mt-2">
        <button onClick={() => navigate('/datenschutz')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-muted bg-white rounded-card text-[11px] font-medium active:bg-background"
          style={{ border: '1.5px solid #EBEBEB' }}>
          <Shield size={12} /> Datenschutz
        </button>
        <button onClick={() => navigate('/agb')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-muted bg-white rounded-card text-[11px] font-medium active:bg-background"
          style={{ border: '1.5px solid #EBEBEB' }}>
          <FileText size={12} /> AGB
        </button>
        <button onClick={() => navigate('/impressum')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-muted bg-white rounded-card text-[11px] font-medium active:bg-background"
          style={{ border: '1.5px solid #EBEBEB' }}>
          <FileText size={12} /> Impressum
        </button>
      </div>

      <button onClick={() => supabase.auth.signOut()}
        className="w-full mt-2 flex items-center justify-center gap-2 py-3 text-red-500 bg-white rounded-card font-bold text-[13px] active:bg-red-50"
        style={{ border: '1.5px solid #EBEBEB' }}>
        <LogOut size={15} /> Abmelden
      </button>

      <button onClick={handleExport} disabled={exporting}
        className="w-full mt-2 flex items-center justify-center gap-2 py-3 text-primary bg-white rounded-[14px] font-bold text-[13px] active:bg-green-50 disabled:opacity-50"
        style={{ border: '1.5px solid #EBEBEB' }}>
        <Download size={15} /> {exporting ? 'Wird exportiert...' : 'Meine Daten exportieren'}
      </button>

      <button onClick={() => setShowDeleteConfirm(true)}
        className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 text-[11px] text-muted font-medium active:text-red-500">
        <Trash2 size={12} /> Konto und alle Daten löschen
      </button>

      {showDeleteConfirm && (
        <div className="mt-2 bg-red-50 rounded-card p-4" style={{ border: '1.5px solid #FCA5A5' }}>
          <p className="text-[13px] text-red-800 font-bold mb-1">Konto wirklich löschen?</p>
          <p className="text-[12px] text-red-700 mb-3">Alle deine Daten werden unwiderruflich gelöscht: Profil, Wochenpläne, Einkaufslisten, gespeicherte Rezepte und Kaufverlauf.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 bg-white text-[13px] text-dark font-bold rounded-btn" style={{ border: '1.5px solid #EBEBEB' }}>
              Abbrechen
            </button>
            <button onClick={handleDeleteAccount} disabled={deleting}
              className="flex-1 py-2.5 bg-red-500 text-white text-[13px] font-bold rounded-btn disabled:opacity-50">
              {deleting ? 'Wird gelöscht...' : 'Endgültig löschen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
