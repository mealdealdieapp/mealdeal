import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { OFFER_CATEGORY_ORDER } from '../lib/offerCategoryConfig'
import { isNonFoodOffer } from '../lib/offerMatching'
import type { Offer } from '../types/app.types'

// Kategorien die als Non-Food gelten und nicht in der Angebote-Liste angezeigt werden
const NON_FOOD_CATEGORIES = new Set([
  'Drogerie', 'Haushalt', 'Tierbedarf', 'Technik', 'Spielzeug',
  'Garten', 'Kleidung', 'Büro', 'Auto',
])

export interface CategoryGroup {
  category: string
  offers: Offer[]
  bestDiscount: number
}

// Keywords to exclude for diet-based filtering (lowercase)
const PORK_KEYWORDS = ['schwein', 'speck', 'schinken', 'bratwurst', 'leberkäse', 'mettwurst', 'salami']
const ALCOHOL_KEYWORDS = ['bier', 'wein', 'sekt', 'schnaps', 'likör', 'vodka', 'whisky', 'rum', 'gin', 'alkohol', 'prosecco']
const MEAT_KEYWORDS = ['fleisch', 'wurst', 'schinken', 'hack', 'hähnchen', 'huhn', 'hühnchen', 'rind', 'schwein', 'pute', 'lamm', 'ente', 'gans', 'steak', 'braten', 'gulasch', 'schnitzel', 'frikadelle', 'salami', 'mettwurst', 'bratwurst', 'leberkäse', 'speck']
const FISH_KEYWORDS = ['fisch', 'lachs', 'thunfisch', 'forelle', 'garnele', 'shrimp', 'hering', 'makrele', 'kabeljau', 'pangasius', 'krabben']
const ANIMAL_KEYWORDS = [...MEAT_KEYWORDS, ...FISH_KEYWORDS, 'käse', 'milch', 'butter', 'sahne', 'joghurt', 'quark', 'ei', 'eier', 'honig', 'gelatine']

// Word-boundary matching to avoid false positives like "Reis" matching "ei"
function nameContainsAny(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase()
  return keywords.some((kw) => {
    const re = new RegExp(`(^|[\\s\\-\\/,.()])${kw}(en|er|es|e|s|n)?([\\s\\-\\/,.()]|$)`, 'i')
    return re.test(lower)
  })
}

export interface OfferFlagFilters {
  onlyBio?: boolean
  onlyRealDeals?: boolean
  onlyRegional?: boolean
}

export function useOffers(storeFilter?: string | null, flags?: OfferFlagFilters) {
  const profile = useAppStore((s) => s.profile)
  const plz = profile?.plz ?? null
  const markets = profile?.markets ?? []
  const userDiets = profile?.diets ?? []

  const plzPrefix = plz?.substring(0, 3) ?? null

  const query = useQuery({
    queryKey: ['offers', plz, markets],
    queryFn: async () => {
      if (!plzPrefix || markets.length === 0) return []

      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('plz_prefix', plzPrefix)
        .in('store', markets)
        .gte('valid_until', today)
        .order('discount_percent', { ascending: false })
        .limit(5000)

      if (error) throw error
      return data ?? []
    },
    enabled: !!plzPrefix && markets.length > 0,
  })

  // Apply diet-based filtering client-side
  const dietFiltered = useMemo(() => {
    if (!query.data) return []

    // Schritt 1: Non-Food komplett raus (Kleidung, Werkzeug, Kochtöpfe etc.)
    // Nutzt 2 Signale: Kategorie UND Produktname-Keywords
    let result = query.data.filter((o) => {
      if (o.category && NON_FOOD_CATEGORIES.has(o.category)) return false
      if (isNonFoodOffer(o.product_name)) return false
      return true
    })

    for (const diet of userDiets) {
      if (diet === 'halal') {
        result = result.filter((o) =>
          !nameContainsAny(o.product_name, PORK_KEYWORDS) &&
          !nameContainsAny(o.product_name, ALCOHOL_KEYWORDS)
        )
      }
      if (diet === 'koscher') {
        result = result.filter((o) =>
          !nameContainsAny(o.product_name, PORK_KEYWORDS)
        )
      }
      if (diet === 'vegan') {
        result = result.filter((o) =>
          !nameContainsAny(o.product_name, ANIMAL_KEYWORDS)
        )
      }
      if (diet === 'vegetarisch') {
        result = result.filter((o) =>
          !nameContainsAny(o.product_name, MEAT_KEYWORDS) &&
          !nameContainsAny(o.product_name, FISH_KEYWORDS)
        )
      }
    }

    return result
  }, [query.data, userDiets])

  const userPreferences = profile?.preferences ?? []

  // Sort offers by user preferences (matching offers first within each category)
  const prefSorted = useMemo(() => {
    if (userPreferences.length === 0) return dietFiltered

    const PREF_KEYWORDS: Record<string, string[]> = {
      'bio': ['bio', 'bio-', 'öko', 'demeter', 'bioland', 'naturland'],
      'bessere-haltung': ['haltung', 'freiland', 'weidehaltung', 'tierwohl'],
      'regional': ['regional', 'heimisch', 'aus der region', 'deutsch'],
      'nachhaltig': ['msc', 'asc', 'fairtrade', 'fair trade', 'nachhaltig', 'rainforest'],
    }

    function prefScore(name: string): number {
      const lower = name.toLowerCase()
      let score = 0
      for (const pref of userPreferences) {
        const keywords = PREF_KEYWORDS[pref]
        if (keywords && keywords.some((kw) => lower.includes(kw))) {
          score += 10
        }
      }
      return score
    }

    return [...dietFiltered].sort((a, b) => prefScore(b.product_name) - prefScore(a.product_name))
  }, [dietFiltered, userPreferences])

  const filtered = useMemo(() => {
    let list = prefSorted
    if (storeFilter) list = list.filter((o) => o.store === storeFilter)
    if (flags?.onlyBio) list = list.filter((o) => o.is_bio === true)
    if (flags?.onlyRealDeals) list = list.filter((o) => o.is_real_deal === true)
    if (flags?.onlyRegional) list = list.filter((o) => o.is_regional === true)
    return list
  }, [prefSorted, storeFilter, flags?.onlyBio, flags?.onlyRealDeals, flags?.onlyRegional])

  const categories = useMemo(() => {
    const map = new Map<string, Offer[]>()
    for (const offer of filtered) {
      const cat = offer.category ?? 'Sonstiges'
      const list = map.get(cat) ?? []
      list.push(offer)
      map.set(cat, list)
    }

    const groups: CategoryGroup[] = []
    for (const [category, offers] of map) {
      const bestDiscount = Math.max(
        ...offers.map((o) => o.discount_percent ?? 0)
      )
      groups.push({ category, offers, bestDiscount })
    }

    // Sort by Ernährungspyramide order
    groups.sort((a, b) => {
      const idxA = OFFER_CATEGORY_ORDER.indexOf(a.category)
      const idxB = OFFER_CATEGORY_ORDER.indexOf(b.category)
      const posA = idxA >= 0 ? idxA : 999
      const posB = idxB >= 0 ? idxB : 999
      return posA - posB
    })
    return groups
  }, [filtered])

  return {
    ...query,
    offers: filtered,
    categories,
  }
}
