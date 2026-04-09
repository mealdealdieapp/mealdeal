import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Daten konnten nicht geladen werden.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-red-500" />
      </div>
      <p className="text-[15px] font-semibold text-dark mb-1">Fehler beim Laden</p>
      <p className="text-[13px] text-muted mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[14px] font-bold rounded-btn active:bg-green-800"
        >
          <RefreshCw size={16} />
          Erneut versuchen
        </button>
      )}
    </div>
  )
}
