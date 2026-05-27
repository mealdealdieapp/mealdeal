# MealDeal — Release-Master-Plan Q2/Q3 2026

Stand: 20.05.2026 · Erstellt im Cowork-Chat mit Jo · Konsolidiert alle offenen Themen bis zum Public Launch

---

## TL;DR

Du brauchst noch **10 Wochen** vom Heute-Stand bis zur Open Beta. Davon sind 6 Wochen Feature-Bau, 2 Wochen Compliance-Sprint, 2 Wochen Closed Beta + Polish. Dieser Plan ist die einzige Stelle, an der wir das ab jetzt durchziehen — nichts mehr neu ansprechen, nur abarbeiten.

> **Wichtig:** Dieser Plan ist Umsetzungs-Anleitung, keine Rechtsberatung. Für den finalen Datenschutz-/AGB-Text **eine Anwaltsstunde** (250-400 €) einplanen — siehe Abschnitt 2.7. Das ist die einzige nicht verhandelbare Ausgabe.

---

## Inhalt

1. [Tech-Features (was noch fehlt)](#1-tech-features)
2. [Recht & Compliance (Pflicht-Minimum)](#2-recht--compliance)
3. [Sicherheit & Qualität vor Launch](#3-sicherheit--qualität)
4. [Wie deutsche Apps das wirklich machen](#4-benchmark-deutsche-apps)
5. [10-Wochen-Zeitplan](#5-10-wochen-zeitplan)
6. [Anhang: Vorlagen, Tools, Generatoren](#6-anhang)

---

## 1. Tech-Features

### 1.1 Phase 1 abschließen — Bulk-Enrichment

**Was:** 2704 von 2714 Offers sind noch nicht AI-enriched (nur 10 = 0,4 %). Ohne das bleibt Matching im Mini-Pool stecken.

**Wie:**
- GitHub-Workflow `ai-enrichment.yml` 6× hintereinander mit `batch_size=500` triggern
- Cron-Job einrichten, der alle 6 Stunden 500 Offers enriched, bis Pool leer ist
- Monitoring: Telegram-Nachricht bei jedem 500er-Batch mit Ist-Stand (z. B. "2204 enriched / 2714 total")

**Aufwand:** 1 Tag Setup + 3-4 Tage Laufzeit (Gemini Free-Tier-Limit 1500/Tag).

**Kosten:** 0 € (Gemini Free-Tier).

---

### 1.2 Marktguru-Adapter-Layer

**Was:** Interface `IOfferSource`, damit später Scraper ↔ API ausgetauscht werden kann ohne Refactor.

**Wie:**
- Neue Datei `src/lib/offerSource/IOfferSource.ts` mit Interface `{ searchOffers, getOffer, listOffersByPLZ }`
- Bestehender Scraper-Code wird zu `ScraperOfferSource implements IOfferSource`
- Sobald Marktguru-Key da: `MarktguruOfferSource implements IOfferSource`
- Feature-Flag in Supabase `app_config`: `offer_source: 'scraper' | 'marktguru'` → Code wählt zur Laufzeit

**Aufwand:** 1 Tag.

---

### 1.3 Phase 2 Frontend-Integration

**Was:** Matching-Backend läuft, aber Rezept-Detail-Seite zeigt noch keine gematchten Angebote.

**Wie:**
- Hook `src/hooks/useMatchedOffers.ts` schreiben, ruft Supabase-RPC `find_offers_for_ingredient` auf
- Rezept-Detail-Seite: pro Zutat unter dem Namen ein kleines Chip `🏷 2,49 € bei Aldi`
- Feature-Flag `feature_matched_offers` für sanften Rollout
- Fallback wenn kein Match: aktuelles Verhalten (nichts anzeigen)

**Aufwand:** 2 Tage.

---

### 1.4 Markt-Layout-Sortierung der Einkaufsliste

**Was:** Liste sortiert sich nach typischem Lauf-Weg im Markt, nicht alphabetisch.

**Wie:**
- Neue Tabelle `market_layouts (market, section_order int[])` — manuell mit 7 Ketten füllen (Aldi, Rewe, Edeka, Lidl, Kaufland, Penny, Netto)
- Sektion = `ingredients.category` (existiert schon)
- Beim Rendern: `shopping_items` joinen mit `ingredients.category`, sortieren nach `section_order[user.primary_market]`
- UI: Dropdown "Einkauf bei: [Aldi ▾]" oben in der Einkaufsliste

**Aufwand:** 1 Tag.

---

### 1.5 Push-Benachrichtigungen

**Was:** Web Push für 4 Trigger:

| Trigger | Wann | Beispiel-Text |
|---|---|---|
| Angebot endet morgen | Cron, täglich 18:00 | "Heute letzter Tag: Tomaten bei Rewe -30 %" |
| Wochenplan-Reminder | Sonntag 18:00 | "Plane deine nächste Woche in 2 Minuten 👨‍🍳" |
| Neue Angebote in PLZ | nach jedem Scrape | "12 neue Angebote in 80331 verfügbar" |
| Marketing | manuell | "Premium-Aktion: 50 % auf 3 Monate" |

**Wie:**
- Service Worker `public/sw.js` mit Push-Listener
- VAPID-Keys generieren (1 Befehl: `npx web-push generate-vapid-keys`), in Vercel-Env speichern
- Supabase-Tabelle `push_subscriptions (user_id, endpoint, p256dh, auth, granted_at)`
- Permission-Flow: **erst nach erstem fertigen Wochenplan fragen**, nicht beim Onboarding (3-4× höhere Annahme-Quote)
- Backend-Cron: GitHub Action `push-dispatcher.yml`, alle 30 min, prüft Trigger-Conditions pro User
- Trennung **Funktions-Push** vs. **Marketing-Push** in Settings (rechtlich Pflicht, siehe 2.5)

**Caveat:** iOS Safari nur als installierte PWA. Beim ersten Besuch User-Tipp "Zum Home-Bildschirm hinzufügen für Benachrichtigungen" mit kurzer Animation.

**Aufwand:** 4-5 Tage.

---

### 1.6 Barcode-Scanner

**Was:** Im Laden Produkt scannen → drei Use-Cases (Plan-Check, Alternative, Add-to-Plan).

**Wie:**
- Browser-API `BarcodeDetector` (Chrome/Edge stabil, Safari ab iOS 17)
- Fallback: ZXing-Library (`@zxing/browser`, ~150 KB)
- Datenquelle: **Open Food Facts** (kostenlos, ~3 Mio Produkte) via `https://world.openfoodfacts.org/api/v2/product/{ean}.json`
- Mapping EAN → Produkt-Name + Marke + Kategorie → Match gegen `ingredients` via Embeddings (Phase-2-Logik wiederverwenden)
- UI: Button "Scannen" in Einkaufsliste + Rezept-Detail → Kamera-View → Result-Card mit den 3 Aktionen
- Caching: gescannte EANs in Supabase-Tabelle `scanned_products` speichern → bei zweitem Scan kein OFF-Request

**Aufwand:** 4-5 Tage.

---

### 1.7 Family Sharing (Premium-Feature)

**Was:** Mehrere Personen teilen einen Haushalt (Wochenplan, Einkaufsliste, Vorrat).

**Wie:**
- Neue Tabellen `households (id, owner_id, name, created_at)` + `household_members (household_id, user_id, role: 'owner'|'member', joined_at)`
- Migration: `user_id`-Spalten in `weekly_plans`, `shopping_items`, `saved_recipes` durch `household_id` ergänzen (kein Drop, parallel laufen lassen)
- RLS-Policies neu: User darf lesen/schreiben, wenn er Mitglied des Haushalts ist
- Einladung: Magic-Link "https://mealdeal.app/join/{token}", Token in Tabelle `household_invites`
- Real-time: Supabase Realtime auf `shopping_items` → Partner sieht abgehakte Items live
- Konflikt-Handling: Last-write-wins reicht für MVP, später CRDT bei Bedarf
- Permissions v1: alle Member dürfen alles. Premium-Differenzierung später.

**Aufwand:** 8-10 Tage (großes Feature, deshalb am Ende).

---

## 2. Recht & Compliance

> **Reality-Check:** Das ist KEIN über-vorsichtiger Anwalts-Wunschzettel. Das ist das **Pflicht-Minimum**, das in Deutschland bei Health-/Ernährungs-Apps real durchgesetzt wird. Ab Punkt 2.7 ehrlich gegenüber dem, was kleinere Apps wirklich tun.

### 2.1 Impressum (§5 TMG)

**Pflicht ab Tag 1.**

**Wie:** Statische Seite `/impressum`, im Footer verlinkt. Inhalt für UG:

```
Angaben gemäß § 5 TMG:

MealDeal UG (haftungsbeschränkt)
[Straße + Hausnummer]
[PLZ + Ort]

Vertreten durch: Jo [Nachname]
Handelsregister: HRB [Nummer]
Registergericht: Amtsgericht [Ort]
Umsatzsteuer-ID: DE[Nummer]

Kontakt:
E-Mail: kontakt@mealdeal.app
Telefon: [optional, aber empfohlen]

Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:
Jo [Nachname], [Adresse wie oben]
```

**Aufwand:** 1 Stunde. Generator: e-recht24.de/impressum-generator.

---

### 2.2 Datenschutzerklärung (DSGVO Art. 13/14)

**Pflicht ab Tag 1.**

**Wie:** Statische Seite `/datenschutz`. Muss konkret enthalten:

- Verantwortlicher (= MealDeal UG)
- Zwecke der Verarbeitung pro Datentyp (PLZ → Angebote filtern, Gesundheitsdaten → Kalorienempfehlung, etc.)
- Rechtsgrundlagen (Art. 6 Abs. 1 lit. b für Vertrag, lit. a für Einwilligung bei Gesundheitsdaten)
- Empfänger / Auftragsverarbeiter: **konkret aufzählen** — Supabase (Server-Standort prüfen!), Vercel (USA), Stripe, OpenAI (USA), Anthropic (USA), Marktguru, Open Food Facts
- Drittlandtransfer: für US-Dienste Standardvertragsklauseln (SCC) erwähnen
- Speicherdauer: Account-Daten bis Löschung, Logs 90 Tage, Backups 30 Tage
- Betroffenenrechte: Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Datenportabilität, Beschwerde bei Aufsichtsbehörde
- Cookies / Local Storage: was wird gespeichert, wozu, wie lange
- Kontakt für Datenschutzanfragen: `datenschutz@mealdeal.app`

**Aufwand:** 4-6 Stunden mit Generator + Anpassung.

**Generatoren:**
- e-recht24.de/datenschutz-generator (kostenlos, gut)
- datenschutz-generator.de (auch gut, gibt's auch in Premium für ~20 €/Jahr)

**Anschließend:** **1 Anwaltsstunde** zum Drüberschauen. Das ist die wichtigste Investition.

---

### 2.3 Auftragsverarbeitungsverträge (AVV)

**Pflicht.** Mit jedem Tool, das User-Daten verarbeitet.

**Wie:** In den jeweiligen Dashboards akzeptieren / herunterladen, in Ordner `legal/AVV/` archivieren:

| Anbieter | Wo zu finden |
|---|---|
| Supabase | Dashboard → Settings → Legal → Data Processing Agreement |
| Vercel | Dashboard → Settings → Legal → DPA |
| Stripe | Dashboard → Settings → Legal documents |
| OpenAI | Bei API-Account in Compliance-Dashboard |
| Anthropic | Bei API-Account in Trust Center |
| Sentry/Posthog (falls genutzt) | Per Mail anfragen |

**Aufwand:** 2 Stunden.

---

### 2.4 Gesundheitsdaten — explizite Einwilligung (Art. 9 DSGVO)

**Das wird oft übersehen, ist aber der größte Risiko-Punkt.**

Gewicht, Größe, Alter, Aktivitätslevel, Ziel, kcal-Bedarf → **besondere Kategorien personenbezogener Daten**. Braucht **explizite, separate, dokumentierte** Einwilligung. Nicht eine pauschale "Ich akzeptiere AGB"-Checkbox.

**Wie:**
- Im Onboarding-Schritt "Persönliche Daten" (Gewicht etc.) **zusätzliche Checkbox** unter dem Formular:
  > ☐ Ich willige ein, dass MealDeal meine Gesundheitsdaten (Gewicht, Größe, Alter, Aktivität, Ziel) zur Berechnung meiner Ernährungsempfehlungen verarbeitet. Diese Einwilligung kann ich jederzeit in den Einstellungen widerrufen.
- Einwilligung in Datenbank dokumentieren: Tabelle `consent_log (user_id, type, granted_at, revoked_at, ip_hash, version)`
- Widerruf möglich in Profil-Einstellungen → setzt `revoked_at`, Daten werden gelöscht oder anonymisiert

**Aufwand:** 0,5 Tage.

---

### 2.5 Push-Notifications: Funktion vs. Marketing trennen (§7 UWG)

**Pflicht.** Marketing-Pushes brauchen **separate** Einwilligung, sonst Abmahnrisiko.

**Wie:** In Settings zwei Toggles:

```
🔔 Benachrichtigungen
   ☑ Wochenplan-Erinnerungen
   ☑ Angebots-Erinnerungen (deine Lieblings-Zutaten)
   ☐ Marketing & Produktneuigkeiten
```

In der Push-Dispatcher-Logik: jeder Push prüft Toggle vor Versand. Marketing-Toggle default = **aus**.

**Aufwand:** halber Tag (kombiniert mit 1.5).

---

### 2.6 DSGVO-Rechte umsetzen

**Pflicht.** Konkret heißt das:

| Recht | Umsetzung |
|---|---|
| Auskunft (Art. 15) | Button "Meine Daten herunterladen" in Profil → JSON-Export aller User-Daten + Logs |
| Berichtigung (Art. 16) | Schon erfüllt (User kann Profil ändern) |
| Löschung (Art. 17) | Button "Konto endgültig löschen" → 30 Tage Soft-Delete + Cron-Job hartes Delete |
| Einschränkung (Art. 18) | Auf Anfrage per Mail manuell — reicht für MVP |
| Datenportabilität (Art. 20) | Gleicher Export wie Auskunft, im strukturierten Format JSON |
| Widerspruch (Art. 21) | Per Mail an `datenschutz@mealdeal.app` — reicht für MVP |

**Wie konkret bauen:**
- Supabase Edge Function `export-user-data` → JSON mit allen Daten aus allen Tabellen wo `user_id` matched
- Supabase Edge Function `delete-user-account` → setzt `users.deleted_at = now()`, Cron räumt nach 30 Tagen
- E-Mail-Bestätigung bei Löschung mit "Letzte Chance Reaktivieren"-Link

**Aufwand:** 2 Tage.

---

### 2.7 AGB & Widerrufsrecht (sobald Premium aktiv)

**Pflicht bei B2C-Verträgen.**

**Inhalt:**
- Vertragspartner (UG)
- Leistungsbeschreibung (Freemium-Free vs. Premium-Funktionen)
- Preise inkl. MwSt., Laufzeit, Kündigung
- **Widerrufsrecht** 14 Tage bei digitalen Inhalten — Kunde kann es per Klick aufheben (z. B. "Ich möchte sofortigen Zugang und verzichte auf Widerrufsrecht")
- Haftung, Gewährleistung, Schlussbestimmungen, Gerichtsstand

**Wie:**
- Generator: e-recht24.de/agb-generator (kostenpflichtige Variante ca. 200 € einmalig) ODER
- Vorlage aus Stripe (haben ein Sample-AGB für Subscription-Businesses) ODER
- **Anwaltsstunde** parallel zur Datenschutz-Prüfung — der Anwalt schaut beides in einem Termin durch

**Aufwand:** halber Tag Generator + 1h Anwalt.

---

### 2.8 Cookie/Tracking-Consent (TTDSG / TDDDG)

**Nur Pflicht wenn nicht-essentielle Cookies / Tracking gesetzt werden.**

**Aktuell:** Wenn MealDeal **nur** Supabase Auth (functional) nutzt und KEIN Analytics-Tool (Google Analytics, Meta Pixel, Mixpanel etc.) → **kein Banner nötig**, nur Hinweis in der Datenschutzerklärung.

**Sobald** du Analytics hinzufügst (z. B. PostHog, Plausible, Vercel Analytics):
- **Plausible** ist cookie-frei und braucht KEINEN Consent-Banner (das ist genau ihr USP) — meine Empfehlung
- Vercel Analytics ist ebenfalls cookie-frei — auch ok
- PostHog mit Cookies → Banner nötig
- Google Analytics → Banner Pflicht, dazu noch SCC-Doku — vermeiden für MVP

**Wenn Banner nötig:** `cookiebot.com` oder `usercentrics.com` ab ~10 €/Monat. Oder selbst bauen mit Open-Source `klaro!` (kostenlos).

**Aufwand:** 0 Tage falls Plausible/Vercel Analytics, sonst halber Tag.

---

### 2.9 Heilversprechen vermeiden (HWG / MPG)

**Pflicht-Mindset.**

**Was du NIE sagen darfst:**
- "MealDeal hilft dir abzunehmen"
- "Gesund werden mit MealDeal"
- "Heilt / lindert / verbessert [Krankheit]"

**Was du sagen DARFST:**
- "Plane Mahlzeiten passend zu deinen Zielen"
- "Behalte deinen Kalorienverbrauch im Blick"
- "Spare bis zu X € pro Einkauf"

**Anwendung:** Vor Public Launch eine Stunde durch alle Marketing-Texte (Landingpage, App Store Listing falls native, App-Texte) gehen und gegen diese Liste prüfen.

**Aufwand:** 2 Stunden.

---

### 2.10 Hosting & Drittlandtransfer

**Pflicht-Doku.**

Was zu klären ist:
- **Supabase**: Region auf `eu-central-1` (Frankfurt) gesetzt? Im Dashboard → Settings → General prüfen. Falls nicht: **wechseln**, sonst US-Transfer auch für die Hauptdatenbank.
- **Vercel**: Edge runs überall — Functions auf Region `fra1` (Frankfurt) pinnen via `vercel.json`
- **OpenAI/Anthropic**: USA, Standardvertragsklauseln (SCC) sind in den jeweiligen AVVs enthalten → in Datenschutzerklärung erwähnen

**Aufwand:** 1 Stunde Check + ggf. Migration Supabase-Region (halber Tag).

---

## 3. Sicherheit & Qualität

### 3.1 RLS Policies vollständig

**Status:** Vermutlich teilweise da (sonst hätte die App schon längst Datenleaks). Vor Launch komplett auditieren.

**Wie:**
- Liste aller Tabellen → für jede prüfen: hat RLS-Policy? Schließt sie Cross-User-Reads aus?
- Test-Script: mit User-A-Token versuchen User-B-Daten zu lesen → muss 403 sein
- Subagent / pgTAP für automatisierte Tests

**Aufwand:** 1-2 Tage.

---

### 3.2 API Keys & Secrets

**Check:**
- Kein `process.env.OPENAI_API_KEY` o.ä. im Frontend-Code (Vite inlined ALLES was mit `VITE_` beginnt)
- Service Role Key NUR in Edge Functions / GitHub Actions, NIE im Browser
- Anon Key ist ok im Frontend, der ist genau dafür da
- `.env.example` aktualisieren, `.env` in `.gitignore` checken

**Aufwand:** 2 Stunden Audit.

---

### 3.3 Rate Limiting

**Wo:**
- Auth-Endpoints (Supabase macht das schon ein bisschen)
- Edge Functions (Export, AI-Calls) → Rate Limit pro User über Supabase-Tabelle `rate_limits` oder Upstash Redis
- Public RPCs (z. B. Rezept-Suche) → unkritisch

**Aufwand:** 1 Tag.

---

### 3.4 Backups & Monitoring

**Check:**
- Supabase Point-in-Time-Recovery aktiv (Pro Plan, kostet ~25 $/Monat)
- Sentry oder PostHog für Error-Tracking — Free Tier reicht für MVP
- Uptime-Check (UptimeRobot, kostenlos) auf `mealdeal.app` und Edge Functions
- Telegram-Alert wenn Down

**Aufwand:** halber Tag.

---

### 3.5 Performance vor Launch

**Lighthouse-Score** auf Production durchrechnen, Ziel:
- Performance > 85
- Accessibility > 90
- Best Practices > 90
- SEO > 90

Typische MealDeal-Probleme zu erwarten:
- Rezeptbilder zu groß → Vercel Image Optimization aktivieren oder Bilder über Supabase Storage Transformations
- Tailwind-Bundle zu groß → PurgeCSS / `content`-Config prüfen
- React-Query-Cache zu aggressiv → `staleTime` und `gcTime` tunen

**Aufwand:** 1-2 Tage.

---

## 4. Benchmark: Deutsche Apps

> Hier deine Beobachtung, dass andere Apps "nicht so extrem abfragen" — sortiert nach was sie *wirklich* tun.

### 4.1 Yazio (Ernährungs-App, München, > 50 Mio Downloads weltweit)

**Was sie tun:**
- Vollständige Datenschutzerklärung, separate Einwilligung für Gesundheitsdaten (Art. 9)
- Account-Löschung direkt in der App
- Datenexport per Mail-Anfrage
- Marketing-Push als Opt-in
- Hatten **bereits Beschwerden** bei Datenschutzbehörden → seitdem extrem sauber

**Lehrer:** Yazio ist das Vorbild für MealDeal. Wenn du auf deren Niveau bist, bist du safe.

### 4.2 KptnCook (Rezept-App, Berlin)

**Was sie tun:**
- Datenschutzerklärung vorhanden, eher knapp gehalten
- Keine Gesundheitsdaten → keine Art-9-Problematik
- Cookie-Banner via Usercentrics
- Account-Löschung in App vorhanden, aber versteckt

**Lehrer:** Wenn du KEINE Gesundheitsdaten erfassen würdest, wärst du auf KptnCook-Niveau. Tust du aber → musst du höher.

### 4.3 Lidl Plus (Händler-App)

**Was sie tun:**
- Riesiger Privacy-Bereich, aber UX sehr "Cookie-Wall-mäßig"
- Tracking-Consent kombiniert mit Login-Wall — rechtlich umstritten, aber tolerierten
- Marketing-Push default an, separates Opt-out

**Lehrer:** Große Player können sich aggressivere UX leisten. Du als Startup nicht — Verbraucherschutzzentralen mahnen Startups nicht, weil sie sie nicht sehen. Sobald du sichtbar wirst (Presse, App Store Top-Charts), wirst du gemessen wie ein Großer.

### 4.4 Too Good To Go (Food-Waste-App, Dänisch aber DE-Markt riesig)

**Was sie tun:**
- Standort-Daten Opt-in mit klarer Begründung
- Cookie-Banner, AGB, Datenschutz sauber
- Account-Löschung in App
- Marketing-Push separat opt-in

**Lehrer:** Aufgebaut wie ein Großer von Tag 1, weil sie wussten dass sie schnell wachsen. Empfehlenswert als UX-Vorbild für Onboarding-Consent.

### 4.5 Kleine deutsche Food-Apps (anonym)

**Was du sehen wirst:**
- Datenschutzerklärung kopiert von e-recht24, oft outdated
- Keine Account-Löschung in App, nur "Mail an support@..."
- Cookie-Banner fehlt, obwohl Google Analytics läuft
- Marketing-Push ohne separate Einwilligung

**Realität:** Das *funktioniert* meist, bis es nicht mehr funktioniert. Risiken:
- **Wettbewerber-Abmahnung**: in DE leider lukratives Geschäft. Kosten 500-2000 €.
- **Verbraucherzentrale**: schreiben dich an, fordern Unterlassung. Erstmal ohne Strafe, aber Pflicht zur Änderung in Frist.
- **DSGVO-Bußgeld**: erst ab Skalierung relevant, theoretisch aber bis 4 % Jahresumsatz.

**Ehrliche Einschätzung:** Mit **1000-5000 aktiven Usern** unter dem Radar. Ab **10.000+** und mit Stripe-Subscription läufst du eindeutig auf Sicht — dann muss alles sitzen.

### 4.6 Pragmatische Linie für MealDeal

Du brauchst Yazio-Standard, **weil**:
1. Du erfasst Gesundheitsdaten (Art. 9) → striktere Pflicht
2. Du hast Stripe-Subscription → AGB-Pflicht
3. Du hast Premium-Marketing → §7-UWG-Risiko
4. Du planst Skalierung DE→AT→CH → von Anfang an EU-weit denken

Aber du brauchst NICHT:
- Eigenen Datenschutzbeauftragten (DSB) — erst ab 20+ Mitarbeitern oder umfangreicher Profilbildung
- ISO 27001 — Premium nice-to-have, irrelevant für MVP
- TÜV-Zertifizierung — komplett irrelevant

---

## 5. 10-Wochen-Zeitplan

> Start: KW 21 / 2026 (Montag 18.05.) — Open Beta Launch: KW 30 / 2026 (Montag 27.07.)

| Woche | Datum | Fokus | Konkrete Deliverables |
|---|---|---|---|
| **1** | 18.05.–24.05. | Phase 1 Bulk + Adapter | 2714 Offers AI-enriched; `IOfferSource`-Interface live |
| **2** | 25.05.–31.05. | Phase 2 Frontend + Markt-Layout | `useMatchedOffers` Hook; Einkaufsliste sortiert nach Markt |
| **3** | 01.06.–07.06. | Push-Backend | Service Worker, VAPID, Subscription-Flow, Dispatcher-Cron |
| **4** | 08.06.–14.06. | Push-Trigger + Quittungs-Scanner | 4 Trigger live; Receipt-Scan mit Gemini Vision |
| **5** | 15.06.–21.06. | Barcode-Scanner (Teil 1) | EAN-Scanning, OFF-Anbindung, Result-UI |
| **6** | 22.06.–28.06. | Barcode-Scanner (Teil 2) + Family-Sharing-Schema | 3 Use-Cases live; DB-Schema-Migration |
| **7** | 29.06.–05.07. | Family-Sharing Frontend + RLS | Einladungs-Flow, Realtime-Sync, RLS-Audit |
| **8** | 06.07.–12.07. | **Compliance-Sprint** | Alle Punkte aus Abschnitt 2 — siehe unten |
| **9** | 13.07.–19.07. | **Closed Beta** (15-20 Bekannte) | Bug-Fixes, Feedback-Loop, Polish |
| **10** | 20.07.–26.07. | Polish + Anwaltstermin + Soft Launch | Anwaltsstunde, finale Texte, Open Beta live |

### Detail Woche 8 — Compliance-Sprint

| Tag | Aufgabe |
|---|---|
| Mo | Impressum + Datenschutzerklärung generieren (e-recht24) |
| Di | AVVs sammeln + ablegen; Supabase-Region prüfen |
| Mi | Gesundheitsdaten-Einwilligung im Onboarding + `consent_log`-Tabelle |
| Do | Account-Löschung + Datenexport (Edge Functions) |
| Fr | AGB-Generator; Marketing-Push-Toggle; Heilversprechen-Audit der Texte |

### Detail Woche 9 — Closed Beta

- Tag 1: 15-20 Leute aus Umfeld per WhatsApp einladen mit Kurz-Text (Vorlage siehe Anhang 6.2)
- Täglich: Bug-Reports sammeln in GitHub Projects-Board "Beta-Bugs"
- Mittwoch: Mini-Umfrage per Tally.so verschicken: "Was hat dich am meisten überrascht? Was hat genervt?"
- Freitag: Priorisierung was vor Open Beta noch fixen, was später

### Detail Woche 10 — Final Polish

- Mo: Anwaltstermin (Vorbereitung: Datenschutz, AGB, Impressum, Onboarding-Screenshots)
- Di–Do: Anwalts-Feedback einarbeiten + Closed-Beta-Critical-Bugs fixen
- Fr: Soft Launch — Landingpage öffentlich, Reddit r/de + r/Frugal_DE posten, Telegram-Kanal eröffnen

---

## 6. Anhang

### 6.1 Tools & Generatoren

| Zweck | Tool | Kosten |
|---|---|---|
| Impressum-Generator | e-recht24.de | kostenlos |
| Datenschutz-Generator | datenschutz-generator.de | 0 € / 20 €/Jahr Premium |
| AGB-Generator | e-recht24.de Premium | ~200 € einmalig |
| Analytics ohne Cookies | Plausible oder Vercel Analytics | 9-19 €/Monat |
| Error-Tracking | Sentry oder PostHog | Free Tier |
| Uptime-Check | UptimeRobot | kostenlos |
| Feedback-Umfragen | Tally.so | kostenlos |
| Anwaltssuche | anwalt.de Filter "IT-Recht + Datenschutz" | 250-400 €/h |
| VAPID-Keys | `npx web-push generate-vapid-keys` | kostenlos |

### 6.2 Vorlage Closed-Beta-Einladung (WhatsApp)

```
Hey [Name]!

Ich teste gerade meine App MealDeal in einer privaten Beta-Phase und 
würde mich freuen, wenn du dabei wärst. Es geht um eine Mischung aus 
Rezept-Planung und Supermarkt-Angeboten — du gibst PLZ und Lieblings-
Märkte ein, und MealDeal schlägt dir Rezepte vor, deren Zutaten gerade 
im Angebot sind.

Was du wissen solltest:
- Beta = noch Bugs möglich, wäre cool wenn du mir die meldest
- Deine Daten werden verarbeitet, Details: mealdeal.app/datenschutz
- Account kannst du jederzeit löschen in den Einstellungen
- Bei Fragen einfach hier melden

Link: mealdeal.app
Beta-Code: BETA2026

Danke dir! 🍳
```

### 6.3 Memory-Hooks für nächste Sessions

- Master-Plan-Doc: `mealdeal-web/docs/RELEASE_MASTER_PLAN_2026-Q2.md`
- Aktueller Sprint: siehe Tabelle Abschnitt 5
- Pending Anwaltstermin: Woche 10 (KW 30/2026)
- Closed-Beta-Kohorte: Woche 9 (KW 29/2026)

### 6.4 Was dieser Plan NICHT enthält (bewusst ausgeklammert)

- Native iOS/Android Apps (kommt nach Web-Open-Beta)
- AT/CH-Expansion (separate Rechts-Prüfung)
- Influencer/UGC-Programm (separate Strategie)
- App Store Optimization (erst bei nativ-App)
- Steuerliche Konstruktion UG (mit Steuerberater)
- DSB-Bestellung (erst bei > 20 Mitarbeitern)

---

**Wenn du diesem Plan folgst, bist du am 27.07.2026 launch-ready.**

Wenn etwas davon unklar oder unrealistisch ist — Jo, ansprechen, dann passen wir gezielt an. Aber im Großen und Ganzen ist das die Linie.
