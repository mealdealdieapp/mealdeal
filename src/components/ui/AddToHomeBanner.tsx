import { useEffect, useState } from 'react'
import { X, Share, Plus, Smartphone } from 'lucide-react'

const DISMISS_KEY = 'a2hs_dismissed_at'
const DISMISS_DAYS = 14  // 2 Wochen lang nicht erneut fragen

type Platform = 'ios' | 'android' | 'other'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'other'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS Safari
  if ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone) return true
  // Modern browsers
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return false
}

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY)
    if (!ts) return false
    const dismissedAt = parseInt(ts, 10)
    if (!Number.isFinite(dismissedAt)) return false
    const ageDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
    return ageDays < DISMISS_DAYS
  } catch {
    return false
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function AddToHomeBanner() {
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<Platform>('other')
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosSheet, setShowIosSheet] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (wasDismissedRecently()) return

    const plat = detectPlatform()
    setPlatform(plat)

    if (plat === 'ios') {
      const t = setTimeout(() => setVisible(true), 6000)
      return () => clearTimeout(t)
    }

    if (plat === 'android') {
      const handler = (e: Event) => {
        e.preventDefault()
        setInstallEvent(e as BeforeInstallPromptEvent)
        setVisible(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
    setVisible(false)
    setShowIosSheet(false)
  }

  const handleAndroidInstall = async () => {
    if (!installEvent) return
    try {
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      if (choice.outcome === 'accepted') {
        setVisible(false)
      } else {
        handleDismiss()
      }
    } catch {
      handleDismiss()
    }
  }

  const handleIosShow = () => setShowIosSheet(true)

  if (!visible) return null

  return (
    <>
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-[440px] bg-white rounded-card shadow-lg" style={{ border: '1.5px solid #EBEBEB' }}>
        <div className="flex items-center gap-3 p-3.5">
          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
            <Smartphone size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-[14px] font-extrabold text-dark leading-tight">
              MealDeal als App nutzen
            </h3>
            <p className="text-[11px] text-muted mt-0.5">
              Schneller offnen, Push-Notifications und Offline-Liste
            </p>
          </div>
          <button onClick={handleDismiss} className="w-7 h-7 flex items-center justify-center text-muted shrink-0 active:bg-gray-100 rounded-full" aria-label="Schliessen">
            <X size={16} />
          </button>
        </div>
        <div className="px-3.5 pb-3.5">
          {platform === 'ios' ? (
            <button
              onClick={handleIosShow}
              className="w-full py-2.5 bg-primary text-white font-bold text-[13px] rounded-btn active:bg-green-800"
            >
              So installierst du
            </button>
          ) : (
            <button
              onClick={handleAndroidInstall}
              className="w-full py-2.5 bg-primary text-white font-bold text-[13px] rounded-btn active:bg-green-800"
            >
              Jetzt installieren
            </button>
          )}
        </div>
      </div>

      {showIosSheet && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={handleDismiss}>
          <div
            className="bg-white rounded-t-[24px] w-full max-w-[480px] p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            style={{ border: '1.5px solid #EBEBEB' }}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="font-display text-[18px] font-extrabold text-dark text-center">
              MealDeal zum Home-Bildschirm
            </h2>
            <p className="text-[12px] text-muted text-center mt-1 mb-5">
              In Safari in drei Schritten
            </p>

            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center font-extrabold text-[12px] shrink-0">1</div>
                <div className="flex-1">
                  <div className="text-[13px] text-dark font-semibold flex items-center gap-1.5 flex-wrap">
                    <span>Tippe auf</span>
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 rounded-[8px]" style={{ border: '1.5px solid #DBEAFE' }}>
                      <Share size={14} className="text-blue-500" />
                    </span>
                    <span>unten in der Leiste</span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">Das Teilen-Symbol</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center font-extrabold text-[12px] shrink-0">2</div>
                <div className="flex-1">
                  <div className="text-[13px] text-dark font-semibold flex items-center gap-1.5 flex-wrap">
                    <span>Waehle</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-[6px] text-[12px]">
                      <Plus size={11} /> Zum Home-Bildschirm
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">Etwas weiter unten im Menue</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center font-extrabold text-[12px] shrink-0">3</div>
                <div className="flex-1">
                  <div className="text-[13px] text-dark font-semibold">
                    Tippe rechts oben auf Hinzufuegen
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">MealDeal landet auf deinem Home-Bildschirm</p>
                </div>
              </li>
            </ol>

            <button
              onClick={handleDismiss}
              className="w-full mt-5 py-3 bg-primary text-white font-bold text-[14px] rounded-btn active:bg-green-800"
            >
              Verstanden
            </button>
            <button
              onClick={handleDismiss}
              className="w-full mt-2 py-2 text-muted text-[12px] font-medium"
            >
              Nicht jetzt
            </button>
          </div>
        </div>
      )}
    </>
  )
}
