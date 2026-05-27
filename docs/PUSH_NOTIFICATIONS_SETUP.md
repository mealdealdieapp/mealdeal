# Push-Notifications — Setup-Anleitung

Stand: 28.05.2026 · Erstellt im Cowork-Sprint nach DSGVO-Readiness

Alles ist im Code drin und deployed. Damit die Pushes wirklich rausgehen, brauchst du noch ein paar Konfigurations-Schritte. Aufwand insgesamt: 15–20 Minuten.

---

## 1. VAPID-Keys generieren

VAPID = ein kryptographisches Schluessel-Paar, mit dem MealDeal sich beim Push-Service (Google, Mozilla, Apple) als Absender ausweist. Ohne Keys keine Pushes.

Im Terminal:

```
cd C:\Users\job99\angebotskoch-v2\mealdeal-web
npm install
npx web-push generate-vapid-keys
```

Output sieht aus wie:

```
=======================================
Public Key:
BLah...123-langer-string-mit-Bindestrichen

Private Key:
abc...kuerzerer-string-irgendwas
=======================================
```

**Wichtig:** Diese beiden Strings sind die einzigen, die du brauchst. Privat-Key NIE in ein File schreiben das gepusht wird.

---

## 2. Secrets in GitHub setzen

GitHub Repo → **Settings → Secrets and variables → Actions** → "New repository secret"

Drei Secrets anlegen:

| Name | Wert |
|---|---|
| `VAPID_PUBLIC_KEY` | Public Key aus Schritt 1 |
| `VAPID_PRIVATE_KEY` | Private Key aus Schritt 1 |
| `VAPID_SUBJECT` | `mailto:mealdeal.app@gmail.com` |

Pruef nochmal, ob du auch hast (falls nicht):

- `SUPABASE_URL` (https://wjhesvkapqrsbibqjbtr.supabase.co)
- `SUPABASE_SERVICE_ROLE_KEY` (im Supabase Dashboard → Settings → API → "service_role" Key)

---

## 3. ENV in Vercel setzen

Vercel Dashboard → MealDeal-Projekt → **Settings → Environment Variables** → "Add"

Ein einziges Env:

| Key | Value | Environment |
|---|---|---|
| `VITE_VAPID_PUBLIC_KEY` | Public Key aus Schritt 1 | Production + Preview |

**Wichtig:** Nur den Public Key. Der Private Key gehoert NIE ins Frontend.

Nach dem Setzen einen Re-Deploy triggern (Deployments-Tab → "Redeploy") oder einen leeren Commit pushen.

---

## 4. Test: manueller Workflow-Run

GitHub Actions → **"Push-Dispatcher"** → "Run workflow"

- trigger: `weekly_plan_reminder`
- dry_run: `true`

Wenn der Run gruen ist und im Log "X User mit Payload" steht, ist die Backend-Seite live.

Dann auf der Live-Seite:

1. Profil → Push-Section → **"Benachrichtigungen aktivieren"**
2. Browser fragt Permission → "Erlauben"
3. Im Supabase Studio kurz pruefen: `SELECT * FROM push_subscriptions;` sollte einen Row zeigen
4. Nochmal den Workflow starten, diesmal `dry_run: false` — du solltest eine Notification bekommen

---

## 5. Was passiert automatisch

| Cron | Trigger | Zielgruppe |
|---|---|---|
| Sonntag 17:00 UTC | weekly_plan_reminder | Alle User mit `weekly_plan_reminder=true` |
| Taeglich 17:00 UTC | offer_ending_soon | User mit `offer_ending_soon=true` + Offer endet morgen |

Marketing wird **nie automatisch** gesendet. Nur via manuellem Run mit ausgefuelltem Titel/Body.

`new_offers_in_plz` ist als Trigger angelegt, aber noch nicht an den Scrape-Workflow gekoppelt. Wenn das relevant wird: ein `repository_dispatch` aus weekly-scrape.yml ans push-dispatcher.yml senden.

---

## 6. iOS-Hinweis fuer Beta-Tester

iOS Safari unterstuetzt Push nur dann, wenn die Seite **als PWA installiert** ist (Share → "Zum Home-Bildschirm hinzufuegen"). Im Beta-Onboarding sollte das einmal kurz erwaehnt werden, sonst wundern sich iPhone-User.

Die App zeigt automatisch eine Hinweis-Box ("Dieser Browser unterstuetzt keine Push-Benachrichtigungen") wenn der Browser nicht passt.

---

## 7. Rechtliches (kurz)

- Funktions-Push (Wochenplan, Angebot endet, neue PLZ-Angebote): Browser-Permission reicht.
- Marketing-Push: separates Opt-in nach Paragraf 7 UWG → wird in `push_preferences.marketing = true` UND `consent_log` mit `consent_type='marketing_push'` dokumentiert.
- Push-Endpoint-URLs sind technische Daten und werden mit niemandem ausser dem Push-Service (Google/Mozilla/Apple) geteilt.

Das ist alles in der Datenschutzerklaerung erwaehnt, falls Frage kommt.

---

## 8. Bekannte Limitierungen Beta

- **Telegram-Notify bei Fehler** ist optional - wenn `TELEGRAM_BOT_TOKEN` oder `TELEGRAM_CHAT_ID` nicht gesetzt sind, faellt der Step still durch.
- **`offer_ending_soon` Logik** ist im ersten Wurf generisch (alle User mit aktiver Praeferenz). Sobald wir die RPC `offers_ending_for_users` bauen (gibt Offer-Name + Store pro User zurueck), wird der Text personalisiert.
- **Dedup ueber `tag`**: Wenn du den Sonntag-Cron 2x schickst (Sommer/Winter), zeigt der Browser nur die letzte Notification — kein Spam.
