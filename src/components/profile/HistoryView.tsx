import { useState, useMemo } from 'react'
import { Receipt, ChevronDown, ChevronUp, TrendingDown, ShoppingCart, XCircle } from 'lucide-react'
import { usePurchaseLog } from '../../hooks/usePurchaseLog'
import { EmptyState, formatDate } from './ProfileHelpers'

export function HistoryView() {
  const { data: logs } = usePurchaseLog()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Gesamtstatistik berechnen
  const totals = useMemo(() => {
    if (!logs || logs.length === 0) return null
    const totalCost = logs.reduce((s, l) => s + Number(l.total_cost ?? 0), 0)
    const totalSaved = logs.reduce((s, l) => s + Number(l.total_saved ?? 0), 0)
    const totalItems = logs.reduce((s, l) => s + (l.item_count ?? 0), 0)
    const avgPerTrip = logs.length > 0 ? totalCost / logs.length : 0
    return { totalCost, totalSaved, totalItems, avgPerTrip, count: logs.length }
  }, [logs])

  // Gruppierung nach Monat
  const grouped = useMemo(() => {
    if (!logs || logs.length === 0) return []
    const map = new Map<string, typeof logs>()
    for (const log of logs) {
      const d = new Date(log.date + 'T00:00:00')
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(log)
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const d = new Date(items[0].date + 'T00:00:00')
      return {
        key,
        label: d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
        items,
        totalCost: items.reduce((s, l) => s + Number(l.total_cost ?? 0), 0),
        totalSaved: items.reduce((s, l) => s + Number(l.total_saved ?? 0), 0),
      }
    })
  }, [logs])

  if (!logs || logs.length === 0) {
    return <EmptyState text="Noch keine Einkäufe" sub="Schließe einen Einkauf ab" />
  }

  return (
    <div className="space-y-4">
      {/* Gesamtstatistik */}
      {totals && (
        <div className="bg-white rounded-card p-4" style={{ border: '1.5px solid #EBEBEB' }}>
          <h3 className="text-[11px] font-bold text-muted uppercase mb-3">Übersicht</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background rounded-[12px] p-3">
              <span className="text-[10px] text-muted block">Gesamt ausgegeben</span>
              <span className="font-display text-[18px] font-extrabold text-dark">{totals.totalCost.toFixed(2)}€</span>
            </div>
            <div className="bg-green-50 rounded-[12px] p-3">
              <span className="text-[10px] text-success block">Gesamt gespart</span>
              <span className="font-display text-[18px] font-extrabold text-success">{totals.totalSaved.toFixed(2)}€</span>
            </div>
            <div className="bg-background rounded-[12px] p-3">
              <span className="text-[10px] text-muted block">Einkäufe</span>
              <span className="font-display text-[16px] font-extrabold text-dark">{totals.count}</span>
            </div>
            <div className="bg-background rounded-[12px] p-3">
              <span className="text-[10px] text-muted block">Ø pro Einkauf</span>
              <span className="font-display text-[16px] font-extrabold text-dark">{totals.avgPerTrip.toFixed(2)}€</span>
            </div>
          </div>
        </div>
      )}

      {/* Einkäufe gruppiert nach Monat */}
      {grouped.map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-dark">{group.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted">{group.totalCost.toFixed(2)}€</span>
              {group.totalSaved > 0 && (
                <span className="text-[10px] font-bold text-success">-{group.totalSaved.toFixed(2)}€</span>
              )}
            </div>
          </div>

          {group.items.map((log) => {
            const saved = Number(log.total_saved ?? 0)
            const cost = Number(log.total_cost ?? 0)
            const isExpanded = expandedId === log.id
            const items = log.items ?? []
            const notBought = log.not_bought ?? []

            return (
              <div key={log.id} className="bg-white rounded-card overflow-hidden" style={{ border: '1.5px solid #EBEBEB' }}>
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full px-3.5 py-3 flex items-center gap-3 text-left active:bg-background/50"
                >
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
                  <div className="text-right shrink-0 mr-1">
                    {cost > 0 && <span className="text-[12px] text-dark block font-semibold">{cost.toFixed(2)}€</span>}
                    {saved > 0 && <span className="text-[10px] font-bold text-success block">-{saved.toFixed(2)}€</span>}
                  </div>
                  {(items.length > 0 || notBought.length > 0) && (
                    isExpanded
                      ? <ChevronUp size={14} className="text-muted/40 shrink-0" />
                      : <ChevronDown size={14} className="text-muted/40 shrink-0" />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (items.length > 0 || notBought.length > 0) && (
                  <div className="px-3.5 pb-3 pt-1" style={{ borderTop: '1px solid #F5F5F0' }}>
                    {items.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <ShoppingCart size={11} className="text-success" />
                          <span className="text-[9px] font-bold text-success uppercase">Gekauft ({items.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {items.map((item, i) => (
                            <span key={i} className="text-[10px] text-dark bg-green-50 px-2 py-0.5 rounded-pill">{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {notBought.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <XCircle size={11} className="text-muted/60" />
                          <span className="text-[9px] font-bold text-muted uppercase">Nicht gefunden ({notBought.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {notBought.map((item, i) => (
                            <span key={i} className="text-[10px] text-muted bg-background px-2 py-0.5 rounded-pill">{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
