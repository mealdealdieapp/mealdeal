/**
 * NotificationSettings - Push-Berechtigung + 4 Toggle-Switches
 *
 * Reihenfolge nach §7 UWG: Funktionelle Push-Trigger sind in einem Block,
 * Marketing-Push ist VISUELL und INHALTLICH abgegrenzt - separate Einwilligung.
 *
 * Permission-Flow:
 *   1. Nicht subscribed: grosser Button "Benachrichtigungen aktivieren"
 *      -> fragt Browser-Permission + persistiert Subscription
 *   2. Subscribed: Toggle-Switches sichtbar, Status-Hinweis oben
 *   3. Browser-Permission denied: roter Hinweis + Link zur Browser-Hilfe
 *   4. Nicht unterstuetzt (z.B. iOS Safari ohne PWA): Hinweis-Box
 */

import { useState } from 'react'
import { Bell, BellOff, Megaphone, Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { usePushSubscription, usePushPreferences } from '../../hooks/usePushSubscription'
import { useConsent, MARKETING_PUSH_CONSENT_VERSION } from '../../hooks/useConsent'

export function NotificationSettings() {
  const push = usePushSubscription()
  const { prefs, update, isUpdating } = usePushPreferences()
  const marketingConsent = useConsent('marketing_push')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const handleEnable = async () => {
    setStatusMsg(null)
    try {
      await push.subscribe()
      setStatusMsg('Benachrichtigungen aktiviert')
      setTimeout(() => setStatusMsg(null), 2500)
    } catch (err) {
      setStatusMsg((err as Error)?.message ?? 'Konnte nicht aktivieren')
      setTimeout(() => setStatusMsg(null), 4000)
    }
  }

  const handleDisable = async () => {
    try {
      await push.unsubscribe()
      // Beim Disable widerrufen wir aus Vorsicht auch Marketing-Consent.
      if (marketingConsent.hasConsent) {
        await marketingConsent.revoke()
      }
      setStatusMsg('Benachrichtigungen deaktiviert')
      setTimeout(() => setStatusMsg(null), 2500)
    } catch (err) {
      setStatusMsg((err as Error)?.message ?? 'Konnte nicht deaktivieren')
    }
  }

  const handleMarketingToggle = async (next: boolean) => {
    if (next) {
      try {
        if (!marketingConsent.hasConsent) {
          await marketingConsent.grant(MARKETING_PUSH_CONSENT_VERSION)
        }
        await update({ marketing: true })
      } catch (err) {
        setStatusMsg((err as Error)?.message ?? 'Fehler beim Aktivieren')
      }
    } else {
      try {
        await update({ marketing: false })
        if (marketingConsent.hasConsent) {
          await marketingConsent.revoke()
        }
      } catch (err) {
        setStatusMsg((err as Error)?.message ?? 'Fehler beim Deaktivieren')
      }
    }
  }

  if (!push.supported) {
    return (
      <div className="bg-white rounded-card p-4" style={{ border: '1.5px solid #EBEBEB' }}>
        <div className="flex items-start gap-2.5">
          <BellOff size={16} className="text-muted mt-0.5 shrink-0" />
          <div>
            <h3 className="text-[13px] font-bold text-dark">Benachrichtigungen</h3>
            <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
              Dieser Browser unterstuetzt keine Push-Benachrichtigungen.
              Auf iPhone: oeffne MealDeal vom Home-Bildschirm, um Push zu aktivieren.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-card p-4 space-y-3" style={{ border: '1.5px solid #EBEBEB' }}>
      <div className="flex items-start gap-2.5">
        <Bell size={16} className="text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-bold text-dark">Benachrichtigungen</h3>
          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
            {push.isSubscribed
              ? 'Du bekommst Push-Benachrichtigungen auf diesem Geraet.'
              : 'Aktiviere Push-Benachrichtigungen, um Erinnerungen und Angebots-Hinweise zu erhalten.'}
          </p>
        </div>
      </div>

      {push.permission === 'denied' && (
        <div className="bg-red-50 rounded-btn px-3 py-2 text-[11px] text-red-700 flex items-start gap-2" style={{ border: '1.5px solid #FECACA' }}>
          <XCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            Benachrichtigungen sind im Browser blockiert. Aktiviere sie in den Browser-Einstellungen,
            damit du Push empfangen kannst.
          </span>
        </div>
      )}

      {!push.isSubscribed ? (
        <button
          onClick={handleEnable}
          disabled={push.isSubscribing || push.permission === 'denied'}
          className="w-full py-2.5 bg-primary text-white font-bold text-[13px] rounded-btn flex items-center justify-center gap-2 disabled:opacity-50 active:bg-green-800"
        >
          {push.isSubscribing ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
          {push.isSubscribing ? 'Aktiviere...' : 'Benachrichtigungen aktivieren'}
        </button>
      ) : (
        <>
          <div className="space-y-1">
            <Toggle
              label="Wochenplan-Erinnerung"
              description="Sonntag-Abend: Plane deine naechste Woche"
              checked={prefs.weekly_plan_reminder}
              onChange={(v) => update({ weekly_plan_reminder: v })}
              disabled={isUpdating}
            />
            <Toggle
              label="Angebot endet bald"
              description="Wenn ein Angebot in deinem Plan morgen ablaeuft"
              checked={prefs.offer_ending_soon}
              onChange={(v) => update({ offer_ending_soon: v })}
              disabled={isUpdating}
            />
            <Toggle
              label="Neue Angebote in deiner PLZ"
              description="Wenn neue Deals fuer deine Maerkte verfuegbar sind"
              checked={prefs.new_offers_in_plz}
              onChange={(v) => update({ new_offers_in_plz: v })}
              disabled={isUpdating}
            />
            <Toggle
              label="Watchlist-Treffer"
              description="Wenn ein Produkt von deiner Watchlist im Angebot ist"
              checked={prefs.watchlist_price_drop}
              onChange={(v) => update({ watchlist_price_drop: v })}
              disabled={isUpdating}
            />
          </div>

          {/* Marketing ist visuell getrennt - separater Einwilligungs-Block */}
          <div className="pt-3 mt-1" style={{ borderTop: '1px dashed #EBEBEB' }}>
            <div className="flex items-start gap-2 mb-2">
              <Megaphone size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-[12px] font-bold text-dark">Marketing &amp; Produktneuigkeiten</h4>
                <p className="text-[10px] text-muted leading-relaxed">
                  Separate Einwilligung nach Paragraf 7 UWG. Du kannst jederzeit widerrufen.
                </p>
              </div>
            </div>
            <Toggle
              label="Marketing-Push"
              description="Aktionen, neue Features, Premium-Angebote"
              checked={prefs.marketing}
              onChange={handleMarketingToggle}
              disabled={isUpdating || marketingConsent.isGranting || marketingConsent.isRevoking}
            />
          </div>

          <button
            onClick={handleDisable}
            disabled={push.isUnsubscribing}
            className="w-full py-2 bg-background text-[11px] font-bold text-red-600 rounded-btn flex items-center justify-center gap-1.5 disabled:opacity-50 active:bg-red-50"
            style={{ border: '1.5px solid #FECACA' }}
          >
            {push.isUnsubscribing ? <Loader2 size={12} className="animate-spin" /> : <BellOff size={12} />}
            Benachrichtigungen deaktivieren
          </button>
        </>
      )}

      {statusMsg && (
        <p className="text-[11px] text-center text-muted flex items-center justify-center gap-1">
          <CheckCircle2 size={12} className="text-success" />
          {statusMsg}
        </p>
      )}

      <p className="text-[10px] text-muted flex items-start gap-1.5 leading-relaxed">
        <Shield size={10} className="mt-0.5 shrink-0" />
        Wir nutzen keine Push-Daten fuer Werbung von Dritten und teilen die Endpoint-URL mit niemandem.
      </p>
    </div>
  )
}

function Toggle({
  label, description, checked, onChange, disabled,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="w-full flex items-center justify-between gap-3 py-2 text-left disabled:opacity-50"
    >
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-medium text-dark block">{label}</span>
        {description && <span className="text-[10px] text-muted block leading-tight">{description}</span>}
      </div>
      <span
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}
