import { useState } from 'react'
import { LogOut, Settings, Receipt, Trash2, ChevronRight, ArrowLeft, Plus, X, Camera, Shield, FileText, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { PageHeader } from '../components/layout/PageHeader'
import { ProfileSettings } from '../components/profile/ProfileSettings'
import { useProfileStats } from '../hooks/useProfileStats'
import { useWatchlist } from '../hooks/useWatchlist'
import { useOffers } from '../hooks/useOffers'
import { usePurchaseLog } from '../hooks/usePurchaseLog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { OptimizedImage } from '../components/ui/OptimizedImage'
import { RecipeDetail } from '../components/recipes/RecipeDetail'
import { RecipeCard } from '../components/recipes/RecipeCard'
import { useSavedRecipes } from '../hooks/useSavedRecipes'
import type { Recipe } from '../types/app.types'
import type { ScoredRecipe } from '../hooks/useRecipes'
import { canUploadRecipe } from '../lib/rateLimiter'

type View = 'main' | 'settings' | 'favorites' | 'watchlist' | 'history' | 'myrecipes'

export function ProfilePage() {
  const profile = useAppStore((s) => s.profile)
  const session = useAppStore((s) => s.session)
  const setProfile = useAppStore((s) => s.setProfile)
  const { data: stats } = useProfileStats()
  const [view, setView] = useState<View>('main')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const navigate = useNavigate()

  const viewTitles: Record<View, string> = {
    main: 'Profil', settings: 'Einstellungen', favorites: 'Favoriten',
    watchlist: 'Watchlist', history: 'Kaufverlauf', myrecipes: 'Meine Rezepte',
  }

  return (
    <PageLayout>
      <PageHeader rightContent={view === 'main' ? (
        <button onClick={() => setView('settings')}
          className="w-8 h-8 flex items-center justify-center rounded-full" style={{ border: '1.5px solid #EBEBEB' }}>
          <Settings size={15} className="text-muted" />
        </button>
      ) : undefined} />

      <div className="px-4 pb-24">
        {view !== 'main' && (
          <button onClick={() => setView('main')} className="flex items-center gap-1.5 text-[13px] text-muted font-medium mb-3">
            <ArrowLeft size={15} /> {viewTitles[view]}
          </button>
        )}

        {view === 'main' && (
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

            <button
              onClick={async () => {
                if (!session?.user?.id) return
                setExporting(true)
                try {
                  // Fetch all user data
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

                  // Create and download JSON file
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
                  console.error('Export error:', e)
                } finally {
                  setExporting(false)
                }
              }}
              disabled={exporting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 text-primary bg-white rounded-[14px] font-bold text-[13px] active:bg-green-50 disabled:opacity-50"
              style={{ border: '1.5px solid #EBEBEB' }}>
              <Download size={15} /> {exporting ? 'Wird exportiert...' : 'Meine Daten exportieren'}
            </button>

            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 text-[11px] text-muted font-medium active:text-red-500"
            >
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
                  <button
                    onClick={async () => {
                      if (!session?.user?.id) return
                      setDeleting(true)
                      const uid = session.user.id
                      try {
                        // Lösche alle Nutzerdaten aus allen Tabellen
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
                        console.error('Account-Löschung Fehler:', e)
                      } finally {
                        setDeleting(false)
                      }
                    }}
                    disabled={deleting}
                    className="flex-1 py-2.5 bg-red-500 text-white text-[13px] font-bold rounded-btn disabled:opacity-50"
                  >
                    {deleting ? 'Wird gelöscht...' : 'Endgültig löschen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'settings' && <ProfileSettings />}
        {view === 'favorites' && <FavoritesPage />}
        {view === 'myrecipes' && <MyRecipesPage />}
        {view === 'watchlist' && <WatchlistPage />}
        {view === 'history' && <HistoryPage />}
      </div>
    </PageLayout>
  )
}

/* ─── Shared Components ─── */

function StatCard({ emoji, value, label, bg, color }: { emoji: string; value: string; label: string; bg: string; color: string }) {
  return (
    <div className={`${bg} rounded-card p-3 text-center`}>
      <span className="text-[18px] block mb-1">{emoji}</span>
      <span className={`font-display text-[18px] font-extrabold ${color}`}>{value}</span>
      <span className="text-[9px] text-muted block mt-0.5">{label}</span>
    </div>
  )
}

function MenuItem({ emoji, label, sub, onClick }: { emoji: string; label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-card px-4 py-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ border: '1.5px solid #EBEBEB' }}>
      <span className="text-[20px] shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[14px] font-semibold text-dark block">{label}</span>
        <span className="text-[11px] text-muted">{sub}</span>
      </div>
      <ChevronRight size={16} className="text-muted/40 shrink-0" />
    </button>
  )
}

/* ─── Favorites Preview (horizontal scroll on main page) ─── */


/* ─── Full Favorites Page ─── */

function FavoritesPage() {
  const session = useAppStore((s) => s.session)
  const { toggle: toggleSave, isSaved } = useSavedRecipes()
  const [openRecipe, setOpenRecipe] = useState<ScoredRecipe | null>(null)

  const { data: saved } = useQuery({
    queryKey: ['savedRecipesDetail', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('*, recipes(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!session?.user?.id,
  })

  if (!saved || saved.length === 0) {
    return <EmptyState text="Noch keine Favoriten" sub="Tippe ❤️ bei einem Rezept" />
  }

  // Map to ScoredRecipe for RecipeCard compatibility
  const recipes: ScoredRecipe[] = saved
    .map((sr) => {
      const r = sr.recipes as Recipe | null
      if (!r) return null
      return { ...r, score: 0, dietScore: 0, offerScore: 0, perfectMatch: false } as ScoredRecipe
    })
    .filter((r): r is ScoredRecipe => r !== null)

  return (
    <>
      <div className="space-y-2">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onOpen={setOpenRecipe}
            onToggleSave={(id) => toggleSave.mutate(id)}
            isSaved={isSaved(recipe.id)}
          />
        ))}
      </div>
      {openRecipe && <RecipeDetail recipe={openRecipe} onClose={() => setOpenRecipe(null)} />}
    </>
  )
}

/* ─── My Recipes Page ─── */

const MEAL_OPTIONS = [
  { v: 'breakfast', l: 'Frühstück' }, { v: 'lunch', l: 'Mittagessen' },
  { v: 'dinner', l: 'Abendessen' }, { v: 'snack', l: 'Snack' },
]
const DIFF_OPTIONS = ['Einfach', 'Mittel', 'Schwer']
const EMOJI_OPTIONS = ['🍳', '🥗', '🍝', '🍲', '🥩', '🍕', '🌮', '🍜', '🥘', '🍰', '🥐', '🥨']

function customToRecipe(r: { id: string; name: string; emoji: string | null; meal: string | null; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; time_minutes: number | null; diff: string | null; image_url: string | null; servings: number | null; steps: string[] | null; created_at: string | null }): Recipe {
  return {
    id: r.id, name: r.name, emoji: r.emoji, meal: r.meal,
    calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat,
    time_minutes: r.time_minutes, difficulty: r.diff, image_url: r.image_url,
    servings: r.servings, steps: r.steps, created_at: r.created_at,
    diets: null, cost: null, saved: null, tag: null, tag_color: null,
    is_public: false, created_by: null, rid: null,
  }
}

function MyRecipesPage() {
  const session = useAppStore((s) => s.session)
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null)

  const { data: myRecipes } = useQuery({
    queryKey: ['customRecipes', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const { data, error } = await supabase
        .from('custom_recipes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!session?.user?.id,
  })

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_recipes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customRecipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })

  return (
    <div className="space-y-3">
      <button onClick={() => setShowCreate(true)}
        className="w-full py-2.5 bg-primary text-white font-bold text-[12px] rounded-btn flex items-center justify-center gap-2 active:bg-green-800">
        <Plus size={14} /> Neues Rezept erstellen
      </button>

      {(!myRecipes || myRecipes.length === 0) ? (
        <EmptyState text="Noch keine eigenen Rezepte" sub="Erstelle dein erstes Rezept" />
      ) : (
        <div className="space-y-2">
          {myRecipes.map((r) => {
            return (
              <div key={r.id} className="bg-white rounded-card p-3 flex items-center gap-3 active:scale-[0.98] transition-transform" style={{ border: '1.5px solid #EBEBEB' }}
                onClick={() => setOpenRecipe(customToRecipe(r))}>
                <OptimizedImage
                  src={r.image_url}
                  alt={r.name}
                  size="thumb"
                  fallback={r.emoji ?? '🍽️'}
                  className="w-12 h-12 shrink-0"
                  style={{ borderRadius: '10px' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-dark block truncate">{r.name}</span>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                    {r.calories && <span>{r.calories} kcal</span>}
                    {r.time_minutes && <span>· {r.time_minutes} Min</span>}
                    {r.diff && <span>· {r.diff}</span>}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteRecipe.mutate(r.id) }}
                  className="w-7 h-7 flex items-center justify-center rounded-full active:bg-background shrink-0">
                  <Trash2 size={13} className="text-muted/40" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <CreateRecipeModal onClose={() => setShowCreate(false)} />}
      {openRecipe && <RecipeDetail recipe={openRecipe} onClose={() => setOpenRecipe(null)} />}
    </div>
  )
}

interface Ingredient { name: string; amount: string; unit: string }

function CreateRecipeModal({ onClose }: { onClose: () => void }) {
  const session = useAppStore((s) => s.session)
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍳')
  const [meal, setMeal] = useState('dinner')
  const [time, setTime] = useState(30)
  const [servings, setServings] = useState(2)
  const [diff, setDiff] = useState('Einfach')
  const [calories, setCalories] = useState(0)
  const [protein, setProtein] = useState(0)
  const [carbs, setCarbs] = useState(0)
  const [fat, setFat] = useState(0)
  const [ings, setIngs] = useState<Ingredient[]>([{ name: '', amount: '', unit: '' }])
  const [steps, setSteps] = useState<string[]>([''])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!session?.user?.id || !name.trim()) return
    if (!canUploadRecipe()) {
      setSaveError('Zu viele Rezepte in kurzer Zeit. Bitte warte kurz.')
      return
    }
    setSaving(true)
    setSaveError(null)

    try {
      let imageUrl: string | null = null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop() ?? 'jpg'
        const fileName = `custom/${session.user.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('recipe-images')
          .upload(fileName, imageFile, { cacheControl: '3600', upsert: false })
        if (uploadErr) console.error('Upload error:', uploadErr)
        else imageUrl = fileName
      }

      const ingsJson = ings
        .filter((i) => i.name.trim())
        .map((i) => ({ n: i.name.trim(), m: i.amount, e: i.unit, k: '' }))

      const { error } = await supabase.from('custom_recipes').insert({
        user_id: session.user.id,
        name: name.trim(),
        emoji,
        meal,
        time_minutes: time || null,
        servings: servings || null,
        diff,
        calories: calories || null,
        protein: protein || null,
        carbs: carbs || null,
        fat: fat || null,
        ings: ingsJson,
        steps: steps.filter((s) => s.trim()),
        image_url: imageUrl,
      })

      if (error) {
        setSaveError(error.message)
      } else {
        queryClient.invalidateQueries({ queryKey: ['customRecipes'] })
        queryClient.invalidateQueries({ queryKey: ['recipes'] })
        onClose()
      }
    } catch (err) {
      setSaveError(String(err))
    }
    setSaving(false)
  }

  const addStep = () => setSteps([...steps, ''])
  const updateStep = (i: number, v: string) => { const s = [...steps]; s[i] = v; setSteps(s) }
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i))
  const addIng = () => setIngs([...ings, { name: '', amount: '', unit: '' }])
  const updateIng = (i: number, field: keyof Ingredient, v: string) => {
    const copy = [...ings]; copy[i] = { ...copy[i], [field]: v }; setIngs(copy)
  }
  const removeIng = (i: number) => setIngs(ings.filter((_, idx) => idx !== i))

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex flex-col overflow-hidden max-w-[480px] mx-auto w-full bg-background rounded-t-[24px] mt-[3vh]" style={{ height: 'calc(100vh - 3vh)' }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0" style={{ borderBottom: '1px solid #EBEBEB' }}>
          <h2 className="font-display text-[17px] font-extrabold text-dark">Neues Rezept</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white" style={{ border: '1.5px solid #EBEBEB' }}>
            <X size={16} className="text-dark" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-4 space-y-4">
          {/* Photo */}
          <div>
            <label className="text-[9px] font-bold text-muted block mb-1.5 uppercase">Foto</label>
            {imagePreview ? (
              <div className="relative w-full h-[160px] rounded-card overflow-hidden" style={{ border: '1.5px solid #EBEBEB' }}>
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                <button onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
                  <X size={14} className="text-dark" />
                </button>
              </div>
            ) : (
              <label className="w-full h-[100px] bg-white rounded-card flex flex-col items-center justify-center gap-1.5 cursor-pointer active:bg-background" style={{ border: '2px dashed #EBEBEB' }}>
                <Camera size={20} className="text-muted" />
                <span className="text-[11px] text-muted font-medium">Foto hinzufügen</span>
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </label>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="text-[9px] font-bold text-muted block mb-1 uppercase">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Pasta Carbonara"
              className="w-full px-3 py-2.5 bg-white rounded-btn text-[14px] text-dark font-semibold placeholder-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ border: '1.5px solid #EBEBEB' }} />
          </div>

          {/* Emoji */}
          <div>
            <label className="text-[9px] font-bold text-muted block mb-1 uppercase">Emoji</label>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`shrink-0 w-9 h-9 rounded-[8px] text-[18px] flex items-center justify-center ${emoji === e ? 'bg-green-50 ring-2 ring-primary' : 'bg-white'}`}
                  style={emoji !== e ? { border: '1.5px solid #EBEBEB' } : undefined}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Meal type */}
          <div>
            <label className="text-[9px] font-bold text-muted block mb-1.5 uppercase">Mahlzeit</label>
            <div className="flex gap-1.5 flex-wrap">
              {MEAL_OPTIONS.map((m) => (
                <button key={m.v} onClick={() => setMeal(m.v)}
                  className={`px-3 py-1.5 rounded-pill text-[11px] font-bold ${meal === m.v ? 'bg-primary text-white' : 'bg-white text-muted'}`}
                  style={meal !== m.v ? { border: '1.5px solid #EBEBEB' } : undefined}>
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          {/* Time + Servings + Difficulty */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-bold text-muted block mb-1 uppercase">Zeit</label>
              <input type="number" value={time || ''} onChange={(e) => setTime(Number(e.target.value))} placeholder="30"
                className="w-full text-center text-[13px] font-bold text-dark py-2 bg-white rounded-btn focus:outline-none" style={{ border: '1.5px solid #EBEBEB' }} />
              <span className="text-[8px] text-muted text-center block mt-0.5">Min</span>
            </div>
            <div>
              <label className="text-[9px] font-bold text-muted block mb-1 uppercase">Portionen</label>
              <input type="number" value={servings || ''} onChange={(e) => setServings(Number(e.target.value))} placeholder="2"
                className="w-full text-center text-[13px] font-bold text-dark py-2 bg-white rounded-btn focus:outline-none" style={{ border: '1.5px solid #EBEBEB' }} />
            </div>
            <div>
              <label className="text-[9px] font-bold text-muted block mb-1 uppercase">Schwierigkeit</label>
              <select value={diff} onChange={(e) => setDiff(e.target.value)}
                className="w-full text-center text-[12px] font-bold text-dark py-2.5 bg-white rounded-btn focus:outline-none appearance-none" style={{ border: '1.5px solid #EBEBEB' }}>
                {DIFF_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <label className="text-[9px] font-bold text-muted block mb-1.5 uppercase">Zutaten</label>
            <div className="space-y-2">
              {ings.map((ing, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input type="text" value={ing.name} onChange={(e) => updateIng(i, 'name', e.target.value)} placeholder="Zutat"
                    className="flex-1 px-2.5 py-2 bg-white rounded-btn text-[12px] text-dark placeholder-muted/40 focus:outline-none" style={{ border: '1.5px solid #EBEBEB' }} />
                  <input type="text" value={ing.amount} onChange={(e) => updateIng(i, 'amount', e.target.value)} placeholder="200"
                    className="w-14 px-2 py-2 bg-white rounded-btn text-[12px] text-dark text-center placeholder-muted/40 focus:outline-none" style={{ border: '1.5px solid #EBEBEB' }} />
                  <input type="text" value={ing.unit} onChange={(e) => updateIng(i, 'unit', e.target.value)} placeholder="g"
                    className="w-10 px-1.5 py-2 bg-white rounded-btn text-[12px] text-dark text-center placeholder-muted/40 focus:outline-none" style={{ border: '1.5px solid #EBEBEB' }} />
                  {ings.length > 1 && (
                    <button onClick={() => removeIng(i)} className="w-6 h-6 flex items-center justify-center rounded-full active:bg-background shrink-0">
                      <X size={12} className="text-muted/40" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addIng} className="text-[11px] font-bold text-primary flex items-center gap-1">
                <Plus size={12} /> Zutat hinzufügen
              </button>
            </div>
          </div>

          {/* Nutrition */}
          <div>
            <label className="text-[9px] font-bold text-muted block mb-1.5 uppercase">Nährwerte pro Portion</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: 'Kcal', v: calories, s: setCalories, u: '' },
                { l: 'Protein', v: protein, s: setProtein, u: 'g' },
                { l: 'Carbs', v: carbs, s: setCarbs, u: 'g' },
                { l: 'Fett', v: fat, s: setFat, u: 'g' },
              ].map((n) => (
                <div key={n.l}>
                  <input type="number" value={n.v || ''} onChange={(e) => n.s(Number(e.target.value))} placeholder="0"
                    className="w-full text-center text-[13px] font-bold text-dark py-2 bg-white rounded-btn focus:outline-none" style={{ border: '1.5px solid #EBEBEB' }} />
                  <span className="text-[8px] text-muted text-center block mt-0.5">{n.l}{n.u && ` (${n.u})`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <label className="text-[9px] font-bold text-muted block mb-1.5 uppercase">Zubereitung</label>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="w-5 h-5 rounded-full bg-green-50 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-2">{i + 1}</span>
                  <textarea value={step} onChange={(e) => updateStep(i, e.target.value)} placeholder={`Schritt ${i + 1}...`} rows={2}
                    className="flex-1 px-3 py-2 bg-white rounded-btn text-[12px] text-dark placeholder-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    style={{ border: '1.5px solid #EBEBEB' }} />
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="w-6 h-6 flex items-center justify-center rounded-full active:bg-background shrink-0 mt-2">
                      <X size={12} className="text-muted/40" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addStep} className="text-[11px] font-bold text-primary flex items-center gap-1">
                <Plus size={12} /> Schritt hinzufügen
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 px-4 py-3 bg-white" style={{ borderTop: '1.5px solid #EBEBEB', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {saveError && <p className="text-[11px] text-red-500 mb-2">{saveError}</p>}
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className="w-full py-3.5 bg-primary text-white font-bold text-[15px] rounded-btn active:bg-green-800 disabled:opacity-40">
            {saving ? 'Speichern...' : 'Rezept speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Full Watchlist Page with Tabs ─── */

function WatchlistPage() {
  const { data: watchlist, toggle } = useWatchlist()
  const { offers } = useOffers()
  const [tab, setTab] = useState<'deals' | 'manage'>('deals')

  if (!watchlist || watchlist.length === 0) {
    return <EmptyState text="Watchlist ist leer" sub="Beobachte Produkte für Preisalarme" />
  }

  const withOffer = watchlist.map((item) => ({
    ...item,
    matchedOffer: offers.find((o) => o.product_name.toLowerCase().includes(item.name.toLowerCase())) ?? null,
  }))
  const onSale = withOffer.filter((i) => i.matchedOffer)

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex bg-background rounded-btn p-0.5" style={{ border: '1.5px solid #EBEBEB' }}>
        <button onClick={() => setTab('deals')}
          className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-colors ${tab === 'deals' ? 'bg-white text-dark' : 'text-muted'}`}>
          Im Angebot {onSale.length > 0 && <span className="text-success ml-1">({onSale.length})</span>}
        </button>
        <button onClick={() => setTab('manage')}
          className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-colors ${tab === 'manage' ? 'bg-white text-dark' : 'text-muted'}`}>
          Verwalten ({watchlist.length})
        </button>
      </div>

      {tab === 'deals' ? (
        onSale.length === 0 ? (
          <div className="bg-white rounded-card px-4 py-8 text-center" style={{ border: '1.5px solid #EBEBEB' }}>
            <span className="text-[32px] block mb-2">😴</span>
            <span className="text-[13px] text-muted block">Aktuell keine Angebote</span>
            <span className="text-[10px] text-muted/60 block mt-0.5">Wir benachrichtigen dich wenn sich etwas ändert</span>
          </div>
        ) : (
          <div className="space-y-2">
            {onSale.map((item) => (
              <div key={item.id} className="bg-white rounded-card p-3.5 flex items-center gap-3" style={{ border: '1.5px solid #BBF7D0' }}>
                <span className="text-[22px] shrink-0">{item.emoji ?? '🛒'}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-dark block truncate">{item.name}</span>
                  <span className="text-[12px] text-success font-bold">
                    {item.matchedOffer!.store}: {Number(item.matchedOffer!.offer_price).toFixed(2)}€
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {item.matchedOffer!.original_price != null && (
                      <span className="text-[10px] text-muted line-through">{Number(item.matchedOffer!.original_price).toFixed(2)}€</span>
                    )}
                    {item.matchedOffer!.discount_percent != null && (
                      <span className="text-[9px] font-bold text-white bg-success px-1.5 py-0.5 rounded-pill">-{item.matchedOffer!.discount_percent}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {withOffer.map((item) => (
            <div key={item.id} className="bg-white rounded-card px-3.5 py-3 flex items-center gap-3" style={{ border: '1.5px solid #EBEBEB' }}>
              <span className="text-[20px] shrink-0">{item.emoji ?? '🛒'}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-dark block truncate">{item.name}</span>
                {item.matchedOffer ? (
                  <span className="text-[10px] text-success font-bold">Im Angebot</span>
                ) : (
                  <span className="text-[10px] text-muted">Wird beobachtet</span>
                )}
              </div>
              {item.matchedOffer && (
                <div className="w-2 h-2 rounded-full bg-success shrink-0" />
              )}
              <button onClick={() => toggle.mutate({ name: item.name })}
                className="w-7 h-7 flex items-center justify-center rounded-full active:bg-background shrink-0">
                <Trash2 size={13} className="text-muted/40" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Full History Page ─── */

function HistoryPage() {
  const { data: logs } = usePurchaseLog()

  if (!logs || logs.length === 0) {
    return <EmptyState text="Noch keine Einkäufe" sub="Schließe einen Einkauf ab" />
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const saved = Number(log.total_saved ?? 0)
        const cost = Number(log.total_cost ?? 0)
        return (
          <div key={log.id} className="bg-white rounded-card px-3.5 py-3 flex items-center gap-3" style={{ border: '1.5px solid #EBEBEB' }}>
            <div className="w-9 h-9 rounded-[10px] bg-background flex items-center justify-center shrink-0">
              <Receipt size={16} className="text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-dark block">{formatDate(log.date)}</span>
              <span className="text-[10px] text-muted">
                {log.item_count ?? 0} Artikel
                {log.offer_count ? ` · ${log.offer_count} Angebote` : ''}
              </span>
            </div>
            <div className="text-right shrink-0">
              {cost > 0 && <span className="text-[12px] text-dark block font-semibold">{cost.toFixed(2)}€</span>}
              {saved > 0 && <span className="text-[10px] font-bold text-success block">-{saved.toFixed(2)}€</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="bg-white rounded-card px-4 py-10 text-center" style={{ border: '1.5px solid #EBEBEB' }}>
      <span className="text-[13px] text-muted block">{text}</span>
      <span className="text-[10px] text-muted/60 block mt-0.5">{sub}</span>
    </div>
  )
}
