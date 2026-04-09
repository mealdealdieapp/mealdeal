import { Receipt } from 'lucide-react'
import { usePurchaseLog } from '../../hooks/usePurchaseLog'

export function PurchaseHistory() {
  const { data: logs } = usePurchaseLog()

  if (!logs || logs.length === 0) {
    return (
      <div
        className="bg-white rounded-[16px] px-4 py-8 flex flex-col items-center gap-2"
        style={{ border: '1.5px solid #EBEBEB' }}
      >
        <Receipt size={20} className="text-gray-300" />
        <span className="text-[13px] text-gray-400">Noch keine Einkäufe</span>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-[16px] overflow-hidden divide-y divide-gray-50"
      style={{ border: '1.5px solid #EBEBEB' }}
    >
      {logs.map((log) => (
        <div key={log.id} className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[13px] text-gray-800 block">{log.date}</span>
            <span className="text-[11px] text-gray-400">
              {log.item_count ?? 0} Artikel
              {log.offer_count ? ` · ${log.offer_count} Angebote` : ''}
            </span>
          </div>
          {log.total_saved != null && Number(log.total_saved) > 0 && (
            <span className="text-[12px] font-bold text-success">
              -{Number(log.total_saved).toFixed(2)} EUR
            </span>
          )}
          {log.total_cost != null && Number(log.total_cost) > 0 && (
            <span className="text-[12px] text-gray-400">
              {Number(log.total_cost).toFixed(2)} EUR
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
