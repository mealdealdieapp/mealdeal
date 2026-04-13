import { useState, useMemo, useCallback, useEffect } from 'react'
import { OptimizedImage } from '../components/ui/OptimizedImage'
import { PageLayout } from '../components/layout/PageLayout'
import { PageHeader } from '../components/layout/PageHeader'
import { OfferList } from '../components/offers/OfferList'
import { OfferRecipesSheet } from '../components/offers/OfferRecipesSheet'
import { GridSkeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { useOffers } from '../hooks/useOffers'
import { useOfferRecipeCounts } from '../hooks/useOfferRecipes'
import { useAddToShopping } from '../hooks/useAddToShopping'
import { useWatchlist } from '../hooks/useWatchlist'
import { useAppStore } from '../store/useAppStore'
import { OFFER_CATEGORY_CONFIG } from '../lib/offerCategoryConfig'
import { Search, ArrowLeft, CheckCircle2, RefreshCw, Flame } from 'lucide-react'
import { getWeekNumber } from '../lib/weekNumber'
import { scrapeOffersForPlz } from '../lib/marktguruScraper'
import { logger } from '../lib/logger'
import { queryClient } from '../lib/queryClient'
import type { Offer } from '../types/app.types'
import type { CategoryGroup } from '../hooks/useOffers'

export function OffersPage() {
  const profile = useAppStore((s) => s.profile)
  const markets = profile?.markets ?? []

  const [storeFilter, setStoreFilter] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(false)
  const [recipeSheet, setRecipeSheet] = useState<Offer | null>(null)

  const { offers, categories, isLoading, isError, refetch } = useOffers(storeFilter)
  const [scraping, setScraping] = useState(false)
  const [autoScrapeDone, setAutoScrapeDone] = useState(false)
  const { addOne: addToShopping } = useAddToShopping()

  // Auto-Scrape: Wenn keine Angebote vorhanden sind (neue PLZ), automatisch scrapen
  useEffect(() => {
    if (isLoading || isError || autoScrapeDone || scraping) return
    if (!profile?.plz || !markets.length) return
    if (offers.length > 0) return

    // Keine Angebote gefunden → automatisch scrapen
    logger.log('Keine Angebote für PLZ', profile.plz, '– starte Auto-Scrape')
    setScraping(true)
    setAutoScrapeDone(true)

    scrapeOffersForPlz(profile.plz, markets)
      .then((result) => {
        logger.log(`Auto-Scrape: ${result.count} Angebote geladen`)
        queryClient.invalidateQueries({ queryKey: ['offers'] })
        refetch()
      })
      .catch((err) => {
        logger.warn('Auto-Scrape fehlgeschlagen:', err)
      })
      .finally(() => {
        setScraping(false)
      })
  }, [isLoading, isError, offers.length, profile?.plz, markets, autoScrapeDone, scraping, refetch])

  const handleRefreshOffers = async () => {
    if (!profile?.plz || !markets.length || scraping) return
    setScraping(true)
    try {
      const result = await scrapeOffersForPlz(profile.plz, markets)
      logger.log(`${result.count} Angebote aktualisiert`)
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      refetch()
    } catch (err) {
      logger.warn('Refresh fehlgeschlagen:', err)
    } finally {
      setScraping(false)
    }
  }
  const { toggle: toggleWatchlist, isWatched } = useWatchlist()

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === 'offers') {
        setSelectedCategory(null)
        setSearch('')
      }
    }
    window.addEventListener('tab-reset', handler)
    return () => window.removeEventListener('tab-reset', handler)
  }, [])

  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return offers.filter((o) => o.product_name.toLowerCase().includes(q))
  }, [offers, search])

  const categoryOffers = useMemo(() => {
    if (!selectedCategory) return null
    return categories.find((c) => c.category === selectedCategory)?.offers ?? []
  }, [categories, selectedCategory])

  // Only compute recipe counts when viewing a list (category or search), not on overview
  const visibleOfferNames = useMemo(() => {
    const list = searchResults ?? categoryOffers
    if (!list) return []
    return list.map(o => o.product_name)
  }, [searchResults, categoryOffers])
  const recipeCounts = useOfferRecipeCounts(visibleOfferNames)

  const handleAddToShopping = useCallback((offer: Offer) => {
    addToShopping.mutate(
      {
        name: offer.product_name,
        category: offer.category,
        offerId: offer.id,
        offerStore: offer.store,
        offerPrice: Number(offer.offer_price),
        offerOriginalPrice: offer.original_price != null ? Number(offer.original_price) : null,
        offerDiscountPercent: offer.discount_percent,
        offerProductName: offer.product_name,
      },
      { onSuccess: () => { setToast(true); setTimeout(() => setToast(false), 1500) } }
    )
  }, [addToShopping])

  const handleToggleWatchlist = useCallback((offer: Offer) => {
    toggleWatchlist.mutate({ name: offer.product_name, emoji: offer.emoji ?? undefined })
  }, [toggleWatchlist])

  const handleBack = () => { if (search) setSearch(''); else setSelectedCategory(null) }
  const showingList = selectedCategory || search.trim()

  // Top-Deals: Die 5 Angebote mit dem höchsten Rabatt
  const topDeals = useMemo(() => {
    return [...offers]
      .filter(o => o.discount_percent != null && o.discount_percent >= 25 && o.image_url)
      .sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0))
      .slice(0, 8)
  }, [offers])

  // Split categories into food and other
  const foodCategories = categories.filter((c) => {
    const cfg = OFFER_CATEGORY_CONFIG[c.category]
    return !cfg || cfg.section === 'food'
  })
  const otherCategories = categories.filter((c) => {
    const cfg = OFFER_CATEGORY_CONFIG[c.category]
    return cfg?.section === 'other'
  })

  return (
    <PageLayout>
      <PageHeader rightContent={
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshOffers}
            disabled={scraping}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
              scraping ? 'bg-primary/10 text-primary/60' : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            <RefreshCw size={12} className={scraping ? 'animate-spin' : ''} />
            {scraping ? 'Lädt...' : 'Aktualisieren'}
          </button>
          <span className="text-[11px] font-bold text-muted px-2.5 py-1 rounded-full" style={{ border: '1.5px solid #EBEBEB' }}>KW {getWeekNumber()}</span>
        </div>
      } />

      <div className="px-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/50" />
          <input
            type="text"
            placeholder="Angebote durchsuchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-btn text-[13px] text-dark placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ border: '1.5px solid #EBEBEB' }}
          />
        </div>

        {markets.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
            <button
              onClick={() => setStoreFilter(null)}
              className={`shrink-0 px-3.5 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                !storeFilter ? 'bg-primary text-white' : 'bg-white text-muted'
              }`}
              style={storeFilter ? { border: '1.5px solid #EBEBEB' } : undefined}
            >
              Alle
            </button>
            {markets.map((market) => (
              <button
                key={market}
                onClick={() => setStoreFilter(storeFilter === market ? null : market)}
                className={`shrink-0 px-3.5 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                  storeFilter === market ? 'bg-primary text-white' : 'bg-white text-muted'
                }`}
                style={storeFilter !== market ? { border: '1.5px solid #EBEBEB' } : undefined}
              >
                {market}
              </button>
            ))}
          </div>
        )}

        {isLoading || (scraping && offers.length === 0) ? (
          <div>
            <GridSkeleton />
            {scraping && (
              <p className="text-center text-muted text-[13px] mt-4 animate-pulse">
                Angebote werden für deine Region geladen...
              </p>
            )}
          </div>
        ) : isError ? (
          <ErrorState message="Angebote konnten nicht geladen werden." onRetry={() => refetch()} />
        ) : showingList ? (
          <>
            <button onClick={handleBack} className="flex items-center gap-1.5 text-[13px] text-muted font-medium">
              <ArrowLeft size={15} />
              {selectedCategory ?? 'Suchergebnisse'}
            </button>
            <OfferList
              offers={searchResults ?? categoryOffers ?? []}
              onAddToShopping={handleAddToShopping}
              onToggleWatchlist={handleToggleWatchlist}
              isWatched={isWatched}
              recipeCounts={recipeCounts}
              onShowRecipes={setRecipeSheet}
            />
          </>
        ) : categories.length === 0 ? (
          <p className="text-center text-muted py-16 text-[14px]">Keine Angebote gefunden</p>
        ) : (
          <div className="pb-4">
            {/* Top-Deals Carousel */}
            {topDeals.length >= 3 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Flame size={14} className="text-orange-500" />
                  <span className="font-display text-[14px] font-extrabold text-dark">Top-Deals diese Woche</span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
                  {topDeals.map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => {
                        const cat = categories.find(c => c.offers.some(o => o.id === deal.id))
                        if (cat) setSelectedCategory(cat.category)
                      }}
                      className="shrink-0 w-[130px] bg-white rounded-card overflow-hidden active:scale-[0.97] transition-transform text-left"
                      style={{ border: '1.5px solid #EBEBEB' }}
                    >
                      {deal.image_url && (
                        <div className="w-full h-[80px] bg-background relative">
                          <OptimizedImage src={deal.image_url} alt={deal.product_name} size="thumb" fallback={deal.emoji ?? '🛒'} className="w-full h-full object-contain p-2" />
                          {deal.discount_percent && (
                            <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-pill">
                              -{deal.discount_percent}%
                            </span>
                          )}
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-[10px] font-bold text-dark leading-tight line-clamp-2">{deal.product_name}</p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-[12px] font-extrabold text-primary">{Number(deal.offer_price).toFixed(2)}€</span>
                          {deal.original_price && (
                            <span className="text-[9px] text-muted line-through">{Number(deal.original_price).toFixed(2)}€</span>
                          )}
                        </div>
                        <span className="text-[9px] text-muted">{deal.store}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Food categories - 2er Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {foodCategories.map((group) => (
                <CategoryCard key={group.category} group={group} onClick={() => setSelectedCategory(group.category)} />
              ))}
            </div>

            {/* Divider */}
            {otherCategories.length > 0 && (
              <div className="flex items-center gap-3 py-3 mt-3">
                <div className="flex-1 h-px bg-[#EBEBEB]" />
                <span className="text-[11px] font-bold text-muted">Weitere Kategorien</span>
                <div className="flex-1 h-px bg-[#EBEBEB]" />
              </div>
            )}

            {/* Non-food categories - 2er Grid, muted */}
            {otherCategories.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5" style={{ opacity: 0.75 }}>
                {otherCategories.map((group) => (
                  <CategoryCard key={group.category} group={group} onClick={() => setSelectedCategory(group.category)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-dark text-white text-[13px] px-4 py-2.5 rounded-pill flex items-center gap-2 shadow-lg z-50">
          <CheckCircle2 size={16} className="text-success" />
          Zur Einkaufsliste
        </div>
      )}

      {/* Recipe sheet for selected offer */}
      {recipeSheet && (
        <OfferRecipesSheet
          offerName={recipeSheet.product_name}
          offerCategory={recipeSheet.category}
          onClose={() => setRecipeSheet(null)}
        />
      )}
    </PageLayout>
  )
}

function CategoryCard({ group, onClick }: { group: CategoryGroup; onClick: () => void }) {
  const cfg = OFFER_CATEGORY_CONFIG[group.category]
  const label = cfg?.label ?? group.category
  const image = cfg?.image ?? ''
  const fallbackColor = cfg?.fallbackColor ?? '#525252'
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <button
      onClick={onClick}
      className="w-full h-[130px] relative overflow-hidden active:scale-[0.97] transition-transform"
      style={{ borderRadius: '16px', backgroundColor: fallbackColor }}
    >
      {image && !imgFailed && (
        <img
          src={image}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Rabatt Badge oben rechts */}
      {group.bestDiscount > 0 && (
        <span className="absolute top-2.5 right-2.5 text-[10px] font-bold text-white bg-success px-2 py-0.5 rounded-pill">
          -{group.bestDiscount}%
        </span>
      )}

      {/* Text unten links */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="font-display font-extrabold text-white text-[15px] leading-tight">
          {label}
        </h3>
        <span className="text-[12px] text-white/80 mt-0.5 block">
          {group.offers.length} Angebot{group.offers.length !== 1 ? 'e' : ''}
        </span>
      </div>
    </button>
  )
}
