import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MealDeal] Fehler gefangen:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <span className="text-[48px] mb-4">😵</span>
          <h2 className="font-display text-[18px] font-extrabold text-dark mb-2">
            Ups, da ist etwas schiefgelaufen
          </h2>
          <p className="text-[13px] text-muted mb-4">
            Bitte lade die Seite neu oder versuche es später.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="px-4 py-2 bg-primary text-white text-[13px] font-bold rounded-card"
          >
            Seite neu laden
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
