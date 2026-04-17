import { ChevronRight } from 'lucide-react'

export function StatCard({ emoji, value, label, bg, color }: { emoji: string; value: string; label: string; bg: string; color: string }) {
  return (
    <div className={`${bg} rounded-card p-3 text-center`}>
      <span className="text-[18px] block mb-1">{emoji}</span>
      <span className={`font-display text-[18px] font-extrabold ${color}`}>{value}</span>
      <span className="text-[9px] text-muted block mt-0.5">{label}</span>
    </div>
  )
}

export function MenuItem({ emoji, label, sub, onClick }: { emoji: string; label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-card px-4 py-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ border: '1.5px solid #EBEBEB' }}>
      <span className="text-[20px] shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[14px] font-semibold text-dark block">{label}</span>
        <span className="text-[11px] text-muted">{sub}</span>
      </div>
      <ChevronRight size={16} className="text-muted/40 shrink-0" />
    </button>
  )
}

export function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="bg-white rounded-card px-4 py-10 text-center" style={{ border: '1.5px solid #EBEBEB' }}>
      <span className="text-[13px] text-muted block">{text}</span>
      <span className="text-[10px] text-muted/60 block mt-0.5">{sub}</span>
    </div>
  )
}

