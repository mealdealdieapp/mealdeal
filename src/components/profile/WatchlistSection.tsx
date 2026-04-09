import { Heart, Trash2 } from 'lucide-react'
import { useWatchlist } from '../../hooks/useWatchlist'
import { useOffers } from '../../hooks/useOffers'

export function WatchlistSection() {
  const { data: watchlist, toggle } = useWatchlist()
  const { offers } = useOffers()

  if (!watchlist || watchlist.length === 0) {
    return (
      <EmptyCard icon={<Heart size={20} className="text-gray-300" />} text="Keine Artikel auf der Watchlist" />
    )
  }

  return (
    <div
      className="bg-white rounded-[16px] overflow-hidden divide-y divide-gray-50"
      style={{ border: '1.5px solid #EBEBEB' }}
    >
      {watchlist.map((item) => {
        const matchedOffer = offers.find((o) =>
          o.product_name.toLowerCase().includes(item.name.toLowerCase())
        )
        return (
          <div key={item.id} className="px-4 py-3 flex items-center gap-3">
            <span className="text-[18px]">{item.emoji ?? '🛒'}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-gray-800 block truncate">{item.name}</span>
              {matchedOffer && (
                <span className="text-[11px] text-success font-semibold">
                  Im Angebot bei {matchedOffer.store}: {Number(matchedOffer.offer_price).toFixed(2)} EUR
                </span>
              )}
            </div>
            {matchedOffer && (
              <span className="text-[10px] font-bold text-white bg-success px-2 py-0.5 rounded-full shrink-0">
                Sale
              </span>
            )}
            <button
              onClick={() => toggle.mutate({ name: item.name })}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 active:bg-gray-100 shrink-0"
            >
              <Trash2 size={13} className="text-gray-400" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      className="bg-white rounded-[16px] px-4 py-8 flex flex-col items-center gap-2"
      style={{ border: '1.5px solid #EBEBEB' }}
    >
      {icon}
      <span className="text-[13px] text-gray-400">{text}</span>
    </div>
  )
}
