import type { useWeeklyPlan } from '../../hooks/useWeeklyPlan'
import type { DayKey } from '../../hooks/useWeeklyPlan'
import { DAY_LABELS } from './DayCard'

type DayStats = { cal: number; recipeCount: number; protein: number; carbs: number; fat: number }

export function TodayAnalysis({ stats, calTarget, day }: { stats: DayStats; calTarget: number; day: DayKey }) {
  const pct = calTarget > 0 ? Math.min(100, (stats.cal / calTarget) * 100) : 0
  return (
    <div className="bg-white rounded-card p-4" style={{ border: '1.5px solid #EBEBEB' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-muted">Heute · {DAY_LABELS[day]}</span>
        <span className="text-[11px] text-muted">{stats.recipeCount} Gerichte</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#F5F5F0" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke={stats.cal > calTarget ? '#ef4444' : '#028350'} strokeWidth="3"
              strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[16px] font-extrabold text-dark">{stats.cal}</span>
            <span className="text-[8px] text-muted">/ {calTarget}</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2">
          <MacroBar label="Protein" value={stats.protein} unit="g" color="#3B82F6" />
          <MacroBar label="Carbs" value={stats.carbs} unit="g" color="#F59E0B" />
          <MacroBar label="Fett" value={stats.fat} unit="g" color="#EF4444" />
        </div>
      </div>
    </div>
  )
}

export function WeekAnalysis({ weekStats, calTarget }: { weekStats: ReturnType<typeof useWeeklyPlan>['weekStats']; calTarget: number }) {
  const avgPct = calTarget > 0 ? Math.min(100, (weekStats.avgDailyCal / calTarget) * 100) : 0
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white rounded-card p-3.5" style={{ border: '1.5px solid #EBEBEB' }}>
          <div className="text-[10px] font-medium text-muted mb-1.5">Ø Kcal / Tag</div>
          <div className="flex items-end gap-1.5">
            <span className="font-display text-[22px] font-extrabold text-dark">{weekStats.avgDailyCal}</span>
            <span className="text-[11px] text-muted mb-1">/ {calTarget}</span>
          </div>
          <div className="w-full h-1.5 bg-background rounded-full mt-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${avgPct}%`, backgroundColor: weekStats.avgDailyCal > calTarget ? '#ef4444' : '#028350' }} />
          </div>
        </div>
        <div className="bg-green-50 rounded-card p-3.5" style={{ border: '1.5px solid #BBF7D0' }}>
          <div className="text-[10px] font-medium text-green-600 mb-1.5">Gespart</div>
          <span className="font-display text-[22px] font-extrabold text-success">{weekStats.totalSaved.toFixed(2)}</span>
          <span className="text-[11px] text-muted ml-1">€</span>
        </div>
      </div>
      <div className="bg-white rounded-card p-3.5 flex justify-between" style={{ border: '1.5px solid #EBEBEB' }}>
        <MacroStat label="Ø Protein" value={weekStats.avgDailyProtein} unit="g" color="#3B82F6" />
        <MacroStat label="Ø Carbs" value={weekStats.avgDailyCarbs} unit="g" color="#F59E0B" />
        <MacroStat label="Ø Fett" value={weekStats.avgDailyFat} unit="g" color="#EF4444" />
        <MacroStat label="Gerichte" value={weekStats.filledSlots} unit="" color="#8B5CF6" />
      </div>
    </div>
  )
}

function MacroBar({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="text-center">
      <span className="font-display text-[15px] font-extrabold" style={{ color }}>{Math.round(value)}</span>
      <span className="text-[9px] text-muted">{unit}</span>
      <div className="text-[9px] text-muted mt-0.5">{label}</div>
    </div>
  )
}

function MacroStat({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="text-center">
      <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: color }} />
      <span className="font-display text-[14px] font-extrabold text-dark">{Math.round(value)}</span>
      <span className="text-[9px] text-muted">{unit}</span>
      <div className="text-[9px] text-muted mt-0.5">{label}</div>
    </div>
  )
}
