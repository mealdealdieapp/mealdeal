import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useWatchlist } from '../../hooks/useWatchlist'
import { useOffers } from '../../hooks/useOffers'
import { EmptyState } from './ProfileHelpers'

export function WatchlistView() {
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
