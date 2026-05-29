/**
 * push-dispatcher
 *
 * Wird vom Workflow `.github/workflows/push-dispatcher.yml` aufgerufen.
 * Sendet Web-Push-Notifications fuer 4 Trigger-Typen:
 *
 *   - weekly_plan_reminder  (Sonntag 18:00 lokal -> wir runden auf UTC-cron)
 *   - offer_ending_soon     (taeglich 18:00 lokal, fuer Angebote die morgen enden)
 *   - new_offers_in_plz     (nach jedem Scrape via repository_dispatch -> Inputs)
 *   - marketing             (manuell via workflow_dispatch)
 *
 * Steuerung pro Aufruf via ENV (siehe yml):
 *   TRIGGER  = weekly_plan_reminder|offer_ending_soon|new_offers_in_plz|marketing
 *   DRY_RUN  = "true" zum Testen (kein echter Versand)
 *   MARKETING_TITLE / MARKETING_BODY / MARKETING_URL (nur fuer marketing)
 *
 * Notwendige Secrets:
 *   SUPABASE_URL                - Supabase-Project-URL
 *   SUPABASE_SERVICE_KEY   - Service-Role-Key (umgeht RLS!)
 *   VAPID_PUBLIC_KEY            - oeffentlicher VAPID-Schluessel
 *   VAPID_PRIVATE_KEY           - privater VAPID-Schluessel
 *   VAPID_SUBJECT               - z.B. "mailto:mealdeal.app@gmail.com"
 */

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:mealdeal.app@gmail.com'

const TRIGGER = process.env.TRIGGER
const DRY_RUN = process.env.DRY_RUN === 'true'

function assertEnv(name, value) {
  if (!value) {
    console.error(`Missing required env: ${name}`)
    process.exit(1)
  }
}

assertEnv('SUPABASE_URL', SUPABASE_URL)
assertEnv('SUPABASE_SERVICE_KEY', SUPABASE_SERVICE_KEY)
assertEnv('VAPID_PUBLIC_KEY', VAPID_PUBLIC_KEY)
assertEnv('VAPID_PRIVATE_KEY', VAPID_PRIVATE_KEY)
assertEnv('TRIGGER', TRIGGER)

const VALID_TRIGGERS = ['weekly_plan_reminder', 'offer_ending_soon', 'new_offers_in_plz', 'watchlist_price_drop', 'marketing']
if (!VALID_TRIGGERS.includes(TRIGGER)) {
  console.error(`Invalid TRIGGER "${TRIGGER}". Expected one of: ${VALID_TRIGGERS.join(', ')}`)
  process.exit(1)
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

/**
 * Baut die Push-Payloads pro User-ID fuer den jeweiligen Trigger.
 * Liefert ein Map<userId, { title, body, url, tag }>.
 *
 * Heuristik (alles best-effort, kein DB-Schaden bei Sonderfaellen):
 *
 *   weekly_plan_reminder: alle User mit Praeferenz an
 *   offer_ending_soon   : User, deren Wochenplan ein Offer enthaelt, das morgen endet
 *   new_offers_in_plz   : User, deren PLZ heute neue Offers bekam (>0)
 *   marketing           : alle User mit Praeferenz an
 */
async function buildPayloadsByUser(trigger) {
  const out = new Map()

  // Alle Users mit aktiver Subscription + passender Preference laden.
  const prefColumn = trigger // gleicher Name wie Spalte
  const { data: prefs, error: prefErr } = await supabase
    .from('push_preferences')
    .select(`user_id, ${prefColumn}`)
    .eq(prefColumn, true)
  if (prefErr) throw prefErr
  if (!prefs || prefs.length === 0) {
    console.log(`Keine Users mit Praeferenz ${prefColumn}=true`)
    return out
  }
  const userIds = prefs.map((r) => r.user_id)

  if (trigger === 'weekly_plan_reminder') {
    for (const uid of userIds) {
      out.set(uid, {
        title: 'Plane deine naechste Woche',
        body: 'Sonntag-Abend ist Plan-Zeit. Was kommt diese Woche auf den Tisch?',
        url: '/weekly',
        tag: 'weekly_plan_reminder',
      })
    }
    return out
  }

  if (trigger === 'marketing') {
    const title = process.env.MARKETING_TITLE || 'MealDeal Update'
    const body = process.env.MARKETING_BODY || 'Schau rein, was es Neues gibt.'
    const url = process.env.MARKETING_URL || '/'
    // Marketing: zusaetzlich Consent-Log-Check (Pflicht!)
    const { data: consents, error: cErr } = await supabase
      .from('consent_log')
      .select('user_id')
      .eq('consent_type', 'marketing_push')
      .is('revoked_at', null)
    if (cErr) throw cErr
    const allowed = new Set((consents ?? []).map((c) => c.user_id))
    for (const uid of userIds) {
      if (allowed.has(uid)) {
        out.set(uid, { title, body, url, tag: 'marketing' })
      }
    }
    return out
  }

  if (trigger === 'offer_ending_soon') {
    // Wir nehmen alle Offers, die morgen ablaufen, und matchen sie gegen
    // shopping_items, die dieselbe Offer-ID referenzieren (offer_id). Pro
    // User die erste Treffer-Notiz.
    const { data: rows, error: oErr } = await supabase.rpc('offers_ending_for_users')
    if (oErr) {
      // Fallback: kein RPC vorhanden -> sende generischen Hinweis an alle.
      console.warn('RPC offers_ending_for_users fehlt, sende generisch:', oErr.message)
      for (const uid of userIds) {
        out.set(uid, {
          title: 'Angebote enden morgen',
          body: 'Check deine Liste - einige Deals laufen heute aus.',
          url: '/shopping',
          tag: 'offer_ending_soon',
        })
      }
      return out
    }
    for (const r of rows ?? []) {
      if (!userIds.includes(r.user_id)) continue
      out.set(r.user_id, {
        title: 'Angebot endet morgen',
        body: `${r.product_name} bei ${r.store} - heute letzter Tag`,
        url: '/shopping',
        tag: 'offer_ending_soon',
      })
    }
    return out
  }

  if (trigger === 'new_offers_in_plz') {
    // Nimmt alle User der jeweiligen PLZ-Praefixe und schickt einen kurzen
    // Hinweis, dass neue Deals da sind.
    for (const uid of userIds) {
      out.set(uid, {
        title: 'Neue Angebote fuer dich',
        body: 'Es gibt neue Deals in deinen Maerkten.',
        url: '/offers',
        tag: 'new_offers_in_plz',
      })
    }
    return out
  }

  if (trigger === 'watchlist_price_drop') {
    // Pro User max. 1 frischer Watchlist-Treffer aus den letzten 36h.
    // Logik liegt in der DB-Funktion watchlist_price_matches().
    const { data: matches, error: wErr } = await supabase.rpc('watchlist_price_matches')
    if (wErr) {
      console.warn('RPC watchlist_price_matches fehlt oder fehlgeschlagen:', wErr.message)
      return out
    }
    for (const m of matches ?? []) {
      if (!userIds.includes(m.user_id)) continue
      const priceFmt = Number(m.offer_price).toFixed(2).replace('.', ',')
      out.set(m.user_id, {
        title: `${m.watchlist_name} ist im Angebot`,
        body: `${m.product_name} bei ${m.store} fuer ${priceFmt} EUR`,
        url: '/offers',
        tag: 'watchlist_price_drop',
      })
    }
    return out
  }

  return out
}

async function sendOne(sub, payload) {
  const body = JSON.stringify(payload)
  try {
    const result = await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      body,
    )
    return { status: 'sent', http_status: result.statusCode ?? 201, error: null }
  } catch (err) {
    const code = err.statusCode ?? 0
    // 404/410: Subscription ist tot, soll geloescht werden
    if (code === 404 || code === 410) {
      return { status: 'gone', http_status: code, error: err.body || err.message }
    }
    return { status: 'failed', http_status: code, error: err.body || err.message }
  }
}

async function logResult(userId, subId, trigger, payload, result) {
  await supabase.from('push_log').insert({
    user_id: userId,
    subscription_id: subId,
    trigger_type: trigger,
    payload_title: payload.title,
    payload_body: payload.body,
    payload_url: payload.url,
    status: result.status,
    http_status: result.http_status,
    error_message: result.error,
  })
}

async function main() {
  console.log(`Push-Dispatcher TRIGGER=${TRIGGER} DRY_RUN=${DRY_RUN}`)

  const payloads = await buildPayloadsByUser(TRIGGER)
  console.log(`${payloads.size} User mit Payload`)
  if (payloads.size === 0) return

  const { data: subs, error: sErr } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', [...payloads.keys()])
  if (sErr) throw sErr

  console.log(`${subs?.length ?? 0} Subscriptions gefunden`)
  let sent = 0
  let failed = 0
  let gone = 0

  for (const sub of subs ?? []) {
    const payload = payloads.get(sub.user_id)
    if (!payload) continue

    if (DRY_RUN) {
      console.log(`[DRY] user=${sub.user_id} title="${payload.title}"`)
      continue
    }

    const result = await sendOne(sub, payload)
    await logResult(sub.user_id, sub.id, TRIGGER, payload, result)

    if (result.status === 'sent') sent++
    else if (result.status === 'gone') {
      gone++
      // Tote Subscription aufraeumen
      await supabase.from('push_subscriptions').delete().eq('id', sub.id)
    } else {
      failed++
    }
  }

  console.log(`Done. sent=${sent} gone=${gone} failed=${failed}`)
}

main().catch((err) => {
  console.error('Dispatcher crashed:', err)
  process.exit(1)
})
