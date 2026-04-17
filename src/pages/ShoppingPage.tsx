import { useState, useCallback } from 'react'
import { Plus, Loader2, Check, X, ShoppingBag, CheckCircle2, TrendingDown, XCircle, Trash2, CheckSquare } from 'lucide-react'
import { PageLayout } from '../components/layout/PageLayout'
import { PageHeader } from '../components/layout/PageHeader'
import { useShopping } from '../hooks/useShopping'
import { useAppStore } from '../store/useAppStore'
import type { ShoppingItemWithOffer, MarketGroup } from '../hooks/useShopping'
import { Portal } from '../components/ui/Portal'
import { ErrorState } from '../components/ui/ErrorState'
import { FeedbackPopup } from '../components/feedback/FeedbackPopup'
import { trackPurchase } from '../lib/feedbackState'

const MARKET_COLORS: Record<string, string> = {
  'REWE': '#CC0000', 'ALDI': '#00569D', 'Netto': '#FDC300',
  'Penny': '#CC0000', 'Lidl': '#0050AA', 'Kaufland': '#CC0000',
  'Edeka': '#E2001A', 'Norma': '#003DA5', 'Sonstige': '#888888',
}

export function ShoppingPage() {
  const { items, marketGroups, strategy, checkedCount, totalCount, isLoading, isError, refetch, toggleItem, removeItem, addItem, finishShopping } = useShopping()
  const userMarkets = useAppStore((s) => s.profile)?.markets ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newItemStore, setNewItemStore] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [summary, setSummary] = useState<{ saved: number; cost: number; count: number; notFound: number } | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  // Selection mode
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const handleAdd = () => { const n = newItem.trim(); if (!n) return; addItem.mutate({ name: n, store: newItemStore }); setNewItem(''); setNewItemStore(null); setShowAdd(false) }
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = () => setSelected(new Set(items.map((i) => i.id)))

  const deleteSelected = () => {
    for (const id of selected) {
      removeItem.mutate(id)
    }
    setSelected(new Set())
    setSelectMode(false)
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
  }

  const handleFinish = (onlyChecked: boolean) => {
    setShowConfirm(false)
    finishShopping.mutate(
      { onlyChecked },
      {
        onSuccess: (d) => setSummary({
          saved: d.totalSaved,
          cost: d.totalCost,
          count: d.itemCount,
          notFound: d.notFoundCount,
        }),
      }
    )
  }

  return (
    <PageLayout>
      <PageHeader rightContent={totalCount > 0 ? (
        selectMode ? (
          <button onClick={exitSelectMode} className="text-[12px] font-bold text-primary">Abbrechen</button>
        ) : (
          <span className="text-[11px] font-bold text-muted px-2.5 py-1 rounded-full" style={{ border: '1.5px solid #EBEBEB' }}>{checkedCount} / {totalCount}</span>
        )
      ) : undefined} />

      <div className="px-4 space-y-3 pb-24">
        {/* Gesamt-Übersicht */}
        {totalCount > 0 && !selectMode && (
          <div className="bg-white rounded-card p-3.5" style={{ border: '1.5px solid #EBEBEB' }}>
            {/* Progress */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-muted">{checkedCount} von {totalCount} erledigt</span>
              {strategy && <span className="text-[11px] font-bold text-muted">{strategy.storeCount === 1 ? '1 Markt' : `${strategy.storeCount} Märkte`}</span>}
            </div>
            <div className="w-full h-2 bg-background rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            {/* Stats-Zeile */}
            <div className="flex items-center gap-3">
              {strategy && strategy.savings > 0 && (
                <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1.5 rounded-pill">
                  <TrendingDown size={12} className="text-success" />
                  <span className="text-[11px] font-bold text-success">{strategy.savings.toFixed(2)}€ sparen</span>
                </div>
              )}
              {strategy && (
                <span className="text-[11px] text-muted">{strategy.label}</span>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setSelectMode(true); setSelected(new Set()) }}
                className="flex-1 py-2.5 text-[12px] font-bold text-dark bg-background rounded-btn active:bg-gray-200 flex items-center justify-center gap-1.5">
                <CheckSquare size={13} /> Auswählen
              </button>
              <button onClick={() => setShowConfirm(true)} disabled={checkedCount === 0 || finishShopping.isPending}
                className="flex-1 py-2.5 text-[12px] font-bold text-white bg-primary rounded-btn disabled:opacity-40 flex items-center justify-center gap-1.5 active:bg-green-800">
                {finishShopping.isPending ? <Loader2 size={13} className="animate-spin" /> : <ShoppingBag size={13} />}
                Abschließen
              </button>
            </div>
          </div>
        )}

        {/* Select mode header */}
        {selectMode && (
          <div className="flex items-center justify-between py-1">
            <span className="text-[13px] font-bold text-dark">{selected.size} ausgewählt</span>
            <button onClick={selectAll} className="text-[12px] font-bold text-primary">Alles</button>
          </div>
        )}

        {/* Delete bar in select mode */}
        {selectMode && selected.size > 0 && (
          <button onClick={deleteSelected}
            className="w-full py-2.5 text-[12px] font-bold text-white bg-red-500 rounded-btn flex items-center justify-center gap-1.5 active:bg-red-600">
            <Trash2 size={13} /> {selected.size} Artikel löschen
          </button>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : isError ? (
          <ErrorState message="Einkaufsliste konnte nicht geladen werden." onRetry={() => refetch()} />
        ) : totalCount === 0 ? (
          <div className="py-16 text-center">
            <span className="text-[48px] block mb-3">🛒</span>
            <p className="text-[15px] font-medium text-muted">Einkaufsliste ist leer</p>
            <p className="text-[12px] text-muted/60 mt-1">Tippe + um Artikel hinzuzufügen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {marketGroups.map((g) => (
              <MktGroup key={g.store} group={g}
                selectMode={selectMode}
                selected={selected}
                onToggleSelect={toggleSelect}
                onToggle={(id, c) => toggleItem.mutate({ id, checked: c })}
                onRemove={(id) => removeItem.mutate(id)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {!selectMode && (
        <button onClick={() => setShowAdd(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center z-40 active:bg-green-800 shadow-float">
          <Plus size={24} />
        </button>
      )}

      {/* Add item sheet */}
      {showAdd && (
        <Portal>
          <div className="fixed inset-0 z-50" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            <div className="absolute inset-0 bg-black/30" onClick={() => { setShowAdd(false); setNewItemStore(null) }} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] px-4 pt-2 pb-8 max-w-[480px] mx-auto">
              <div className="flex justify-center pt-2 pb-3"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
              <h3 className="font-display text-[16px] font-extrabold text-dark mb-3">Artikel hinzufügen</h3>
              <div className="flex gap-2">
                <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="z.B. Milch, Brot..."
                  autoFocus className="flex-1 px-4 py-3 bg-background rounded-btn text-[14px] text-dark placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={handleAdd} disabled={!newItem.trim()}
                  className="px-5 py-3 bg-primary text-white font-bold text-[14px] rounded-btn disabled:opacity-40 active:bg-green-800 shrink-0">
                  Fertig
                </button>
              </div>
              {/* Optional market picker */}
              <div className="mt-3">
                <span className="text-[11px] text-muted block mb-1.5">Markt (optional)</span>
                <div className="flex gap-1.5 flex-wrap">
                  {userMarkets.map((m) => (
                    <button key={m} onClick={() => setNewItemStore(newItemStore === m ? null : m)}
                      className={`px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${newItemStore === m ? 'bg-primary text-white' : 'bg-background text-muted'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Confirm finish modal */}
      {showConfirm && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
            <div className="relative bg-white rounded-t-[24px] w-full max-w-[480px] max-h-[80vh] flex flex-col">
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
              <div className="px-4 pb-2">
                <h3 className="font-display text-[18px] font-extrabold text-dark">Einkauf abschließen?</h3>
                <p className="text-[13px] text-muted mt-1">Hast du alle Artikel gefunden?</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-3">
                <div className="space-y-1">
                  {items.map((item) => {
                    const isChecked = item.checked ?? false
                    return (
                      <div key={item.id} className="flex items-center gap-2.5 py-1.5">
                        {isChecked ? (
                          <CheckCircle2 size={16} className="text-success shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-muted/40 shrink-0" />
                        )}
                        <span className={`text-[13px] ${isChecked ? 'text-dark' : 'text-muted'}`}>{item.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="px-4 pb-8 pt-3 space-y-2" style={{ borderTop: '1px solid #EBEBEB' }}>
                <button onClick={() => handleFinish(false)}
                  className="w-full py-3 bg-primary text-white font-bold text-[14px] rounded-btn active:bg-green-800">
                  Ja, alles gefunden
                </button>
                {checkedCount < totalCount && (
                  <button onClick={() => handleFinish(true)}
                    className="w-full py-3 bg-white text-dark font-bold text-[13px] rounded-btn active:bg-background"
                    style={{ border: '1.5px solid #EBEBEB' }}>
                    Nicht alles gefunden ({totalCount - checkedCount} fehlen)
                  </button>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Summary modal */}
      {summary && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white p-6 mx-6 text-center max-w-sm w-full" style={{ borderRadius: '24px', border: '1.5px solid #EBEBEB' }}>
              <span className="text-[48px] block mb-2">🎉</span>
              <h3 className="font-display text-[20px] font-extrabold text-dark">Einkauf gespeichert!</h3>
              <p className="text-[14px] text-muted mt-1">{summary.count} Artikel eingekauft</p>
              {summary.cost > 0 && (
                <div className="mt-4 bg-background rounded-btn p-3">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted">Ausgegeben</span>
                    <span className="font-bold text-dark">{summary.cost.toFixed(2)}€</span>
                  </div>
                  {summary.saved > 0 && (
                    <div className="flex justify-between text-[13px] mt-1.5">
                      <span className="text-muted">Gespart</span>
                      <span className="font-bold text-success">+{summary.saved.toFixed(2)}€</span>
                    </div>
                  )}
                </div>
              )}
              {summary.notFound > 0 && (
                <p className="text-[12px] text-muted mt-3">{summary.notFound} Artikel nicht gefunden</p>
              )}
              <button onClick={() => {
                setSummary(null)
                // Nach Einkauf prüfen ob Feedback fällig ist
                const shouldAsk = trackPurchase()
                if (shouldAsk) setShowFeedback(true)
              }} className="mt-4 w-full py-3 bg-primary text-white font-bold text-[14px] rounded-btn active:bg-green-800">Fertig</button>
            </div>
          </div>
        </Portal>
      )}

      {/* Feedback Popup */}
      {showFeedback && <FeedbackPopup onClose={() => setShowFeedback(false)} />}
    </PageLayout>
  )
}

function MktGroup({ group, selectMode, selected, onToggleSelect, onToggle, onRemove }: {
  group: MarketGroup
  selectMode: boolean
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onToggle: (id: string, c: boolean) => void
  onRemove: (id: string) => void
}) {
  const color = MARKET_COLORS[group.store] ?? '#888888'

  return (
    <div className="bg-white overflow-hidden" style={{ borderRadius: '18px', border: '1.5px solid #EBEBEB' }}>
      <div className="flex items-center gap-0" style={{ borderBottom: '1px solid #EBEBEB' }}>
        <div className="w-[4px] self-stretch rounded-l-[18px]" style={{ backgroundColor: color }} />
        <div className="flex-1 px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-[13px] font-extrabold text-dark">
              {group.store === 'Sonstige' ? '📦 Sonstige' : group.store}
            </span>
            <span className="text-[10px] text-muted">{group.items.length} Artikel</span>
            {group.store === 'Sonstige' && (
              <span className="text-[9px] font-bold text-muted/60 bg-background px-1.5 py-0.5 rounded-pill">Kein Angebot</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {group.offerCount > 0 && (
              <span className="text-[9px] font-bold text-success">{group.offerCount} Angebote</span>
            )}
            {group.totalSavings > 0 && (
              <span className="text-[9px] font-bold text-white bg-success px-1.5 py-0.5 rounded-pill">
                -{group.totalSavings.toFixed(2)}€
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        {group.items.map((item, i) => (
          <ItemRow
            key={item.id}
            item={item}
            selectMode={selectMode}
            isSelected={selected.has(item.id)}
            onToggleSelect={() => onToggleSelect(item.id)}
            onToggle={() => onToggle(item.id, !(item.checked ?? false))}
            onRemove={() => onRemove(item.id)}
            showBorder={i < group.items.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

function ItemRow({ item, selectMode, isSelected, onToggleSelect, onToggle, onRemove, showBorder }: {
  item: ShoppingItemWithOffer
  selectMode: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onToggle: () => void
  onRemove: () => void
  showBorder: boolean
}) {
  const checked = item.checked ?? false
  const offer = item.matchedOffer

  return (
    <div className="px-4 py-3 flex items-center gap-3" style={showBorder ? { borderBottom: '1px solid #F5F5F0' } : undefined}>
      {selectMode ? (
        /* Selection circle */
        <button onClick={onToggleSelect}
          className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
          {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>
      ) : (
        /* Checkbox */
        <button onClick={onToggle}
          className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary' : 'border-gray-300'}`}>
          {checked && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>
      )}

      <div className="flex-1 min-w-0" style={checked && !selectMode ? { opacity: 0.5 } : undefined}>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-[13px] ${checked && !selectMode ? 'font-bold text-muted line-through' : 'font-semibold text-dark'}`}>
            {item.name}
          </span>
          {item.amount != null && item.unit && (
            <span className={`text-[11px] ${checked && !selectMode ? 'text-muted line-through' : 'text-muted'}`}>{Number(item.amount)} {item.unit}</span>
          )}
        </div>
        {offer && !(checked && !selectMode) && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9px] font-bold text-white bg-success px-1.5 py-0.5 rounded-pill">
              {offer.offerPrice.toFixed(2)}€ · -{offer.discountPercent ?? 0}%
            </span>
            {offer.originalPrice != null && (
              <span className="text-[10px] text-muted line-through">{offer.originalPrice.toFixed(2)}€</span>
            )}
          </div>
        )}
      </div>

      {!selectMode && (
        <button onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-full active:bg-background shrink-0">
          <X size={14} className="text-muted/40" />
        </button>
      )}
    </div>
  )
}
