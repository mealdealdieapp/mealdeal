import { useState } from 'react'
import { Plus, X, Camera, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { OptimizedImage } from '../ui/OptimizedImage'
import { RecipeDetail } from '../recipes/RecipeDetail'
import { EmptyState } from './ProfileHelpers'
import { logger } from '../../lib/logger'
import { canUploadRecipe } from '../../lib/rateLimiter'
import type { Recipe } from '../../types/app.types'

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
        status: 'active', source: 'user', quality_score: null,
    time_minutes: r.time_minutes, difficulty: r.diff, image_url: r.image_url,
    servings: r.servings, steps: r.steps, created_at: r.created_at,
    diets: null, cost: null, saved: null, tag: null, tag_color: null,
    is_public: false, created_by: null, rid: null,
  }
}

export function MyRecipesView() {
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
          {myRecipes.map((r) => (
            <div key={r.id} className="bg-white rounded-card p-3 flex items-center gap-3 active:scale-[0.98] transition-transform" style={{ border: '1.5px solid #EBEBEB' }}
              onClick={() => setOpenRecipe(customToRecipe(r))}>
              <OptimizedImage src={r.image_url} alt={r.name} size="thumb" fallback={r.emoji ?? '🍽️'} className="w-12 h-12 shrink-0" style={{ borderRadius: '10px' }} />
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
          ))}
        </div>
      )}

      {showCreate && <CreateRecipeModal onClose={() => setShowCreate(false)} />}
      {openRecipe && <RecipeDetail recipe={openRecipe} onClose={() => setOpenRecipe(null)} />}
    </div>
  )
}

/* ─── Create Recipe Modal ─── */

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
        if (uploadErr) logger.error('Upload error:', uploadErr)
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
