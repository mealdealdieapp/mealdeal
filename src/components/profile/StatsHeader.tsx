import { TrendingDown, ShoppingBag, Wallet } from 'lucide-react'
import type { ProfileStats } from '../../hooks/useProfileStats'

interface StatsHeaderProps {
  stats: ProfileStats | undefined
}

export function StatsHeader({ stats }: StatsHeaderProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard icon={<TrendingDown size={16} className="text-success" />} label="Diese Woche" value={`${(stats?.weekSaved ?? 0).toFixed(2)}`} unit="EUR" bg="bg-green-50" />
      <StatCard icon={<Wallet size={16} className="text-primary" />} label="Gesamt" value={`${(stats?.totalSaved ?? 0).toFixed(2)}`} unit="EUR" bg="bg-green-50" />
      <StatCard icon={<ShoppingBag size={16} className="text-blue-500" />} label="Einkäufe" value={`${stats?.purchaseCount ?? 0}`} bg="bg-blue-50" />
    </div>
  )
}

function StatCard({ icon, label, value, unit, bg }: { icon: React.ReactNode; label: string; value: string; unit?: string; bg: string }) {
  return (
    <div className={`${bg} rounded-[14px] p-3 flex flex-col gap-1.5`}>
      {icon}
      <div>
        <span className="font-display text-[16px] font-extrabold text-dark">{value}</span>
        {unit && <span className="text-[10px] text-muted ml-0.5">{unit}</span>}
      </div>
      <div className="text-[9px] font-medium text-muted">{label}</div>
    </div>
  )
}
