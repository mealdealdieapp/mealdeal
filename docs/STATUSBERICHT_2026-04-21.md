# MealDeal — Statusbericht & Strategie

Stand: 21.04.2026 · Erstellt im Cowork-Chat mit Jo · Basis: Live-Codebase `mealdeal-web`

---

## TL;DR

MealDeal ist viel weiter als du denkst. Du hast bereits ein **teil-autonomes Multi-Agent-System** gebaut — es heißt bei dir nur "GitHub Workflows + Scripts", aber funktional ist genau das da: mehrere spezialisierte Jobs, die selbstständig laufen, sich gegenseitig füttern, Fehler erkennen und dich nur per Telegram stören, wenn sie dich wirklich brauchen.

Was fehlt, ist nicht "die Agenten" — sondern ein **Meta-Agent**, der die bestehenden Workflows beobachtet, bewertet und selbst nachschraubt. Und ein paar User-facing Dinge in der App selbst.

---

## Was wirklich existiert (Realität 21.04.2026)

### 1. Die Web-App (React + Vite, nicht React Native)

Stack: React 19, Vite 8, TypeScript 5.9, Tailwind, Zustand, React Query, Supabase, React Router. Gehostet vermutlich auf Vercel. PWA-fähig.

User-Flows, die **live funktionieren**:

- Registrierung per E-Mail + Rate-Limit
- Onboarding: PLZ + Wunsch-Märkte + Diät-Präferenzen
- Rezepte durchsuchen, filtern (Zeit, Schwierigkeit, Kosten), Detailansicht
- Angebote nach Händler + Kategorie, pro Angebot passende Rezepte
- Wochenplan mit 4 Mahlzeiten × 7 Tage, Makro-Tracking (kcal, Protein, Carbs, Fett)
- Einkaufsliste nach Händler gruppiert, Häkchen + Ersparnis
- Favoriten, Watchlist, Kaufhistorie, Profilstatistiken
- Passwort-Reset, Feedback-Popup, DSGVO/Impressum

Was in der App **fehlt oder nur halb da ist**:

- Kein Admin-Panel — Rezept-Review (pending → approved) läuft direkt über Supabase-UI
- Keine Rezept-Bewertungen / Kommentare
- Kein Teilen (Social, Gifting)
- Keine Allergen-Filter
- Kein Barcode-Scan
- Kein Budget/Monatsübersicht
- Keine Mehrsprachigkeit, kein Dark Mode
- AI-Meal-Plan-Hook (`useGeneratePlan`) existiert, UI dafür unklar

### 2. Die Automation-Schicht (GitHub Actions + Supabase Triggers)

Du hast **9 Workflows**, die bereits laufen:

| Workflow | Trigger | Zweck | Status |
|---|---|---|---|
| `weekly-scrape.yml` | Sa 23:00 UTC + manuell | Marktguru-Scrape für alle registrierten PLZ-Präfixe | ✅ Live |
| `on-demand-scrape.yml` | Supabase-Webhook bei neuer User-Registrierung + manuell | Sofort-Scrape, damit Neu-User direkt Angebote sehen | ✅ Live, inkl. Postgres-Trigger |
| `weekly-recipe-generator.yml` | So 02:00 UTC | Matching-Check + ggf. Claude generiert neue Rezepte (status=pending) | ✅ Live |
| `weekly-matching-analysis.yml` | So 05:00 UTC | Findet unmatched Angebote, schlägt neue Synonyme vor | ✅ Live |
| `nightly-health-check.yml` | täglich 03:00 UTC | 8 Checks + Auto-Fix für abgelaufene Angebote | ✅ Live |
| `generate-recipe-images.yml` | manuell | DALL-E Bildgenerierung (broken-only / all / ids) | ✅ Live |
| `db-migrate.yml` | manuell | SQL aus `scripts/` auf Supabase ausführen | ✅ Live |
| `test-telegram.yml` | manuell | Benachrichtigungs-Smoke-Test | ✅ Live |
| `set-github-pat.yml` | manuell | GitHub-PAT in Supabase `app_config` setzen | ✅ Live |

**Jede** kritische Aktion pusht bei Erfolg oder Fehler eine Telegram-Nachricht an dich — du wirst also nicht überrascht.

### 3. Was die Scripts wirklich können (kurz)

**weekly-scrape.mjs** — Marktguru API v1, Industries 1009 & 1023. Filtert Non-Food über 130+ Keywords, dedupliziert per `canonical_key` (Marke, Menge, Stopwords raus), erkennt echte Deals vs. Fake-Deals über 6-Wochen-Median aus `price_history`. Exponential Backoff bei 429/5xx. Upsert per Fingerprint in `offers`, Logging in `scrape_runs`.

**weekly-recipe-generator.mjs** — Claude Sonnet 4 als LLM. Wenn <5 Rezepte ≥60% Zutaten-Match haben, lässt er Claude 3–5 neue Rezepte generieren. Achtet auf Saisonalität (Monat → Zutatenliste) und Diät-Diversität (vegan/veggie/omni/halal/high-protein). Rezepte landen als `status='pending'` — du bestätigst in Supabase.

**nightly-health-check.mjs** — 8 Checks: DB-Verbindung, Tabellen existieren, abgelaufene Angebote (Auto-Delete), Rezepte ohne Bild, User ohne PLZ, Angebote-Dichte pro Präfix, verwaiste `recipe_ingredients`, Query-Performance >2s. Schreibt Report in `health_checks`.

**weekly-matching-analysis.mjs** — Findet Angebote, die zu keinem Rezept gemappt sind, und schlägt Synonyme vor (z.B. "Rinderfilet" → Synonym für "Rind"). Nur Vorschläge bei ≥3-fachem Vorkommen. Report in `matching_reports`.

**generate-recipe-images.mjs** — DALL-E 3. Erkennt "kaputte" Bilder (null, Unsplash, ext:-Prefix, tote Buckets), baut einen sehr detaillierten DE-Prompt mit Zutaten + Steps, lädt in Supabase Storage `recipe-images`. ~€0,04 pro Bild, 1,5s Cooldown, 5s-Abbruch-Countdown bei >5 Bildern.

**scraperHelpers.mjs / scraperMatching.mjs** — Das Gehirn: 120+ Markenerkennung, Bio/Regional-Detektion, Unterkategorien (Fleisch → Rind/Schwein/Geflügel), Token-Fuzzy-Match mit Blacklist (z.B. "brühe" dämpft Match).

### 4. Datenbank (Supabase)

Aus `STATUS.md` (2026-03-23): 19 Tabellen, alle mit RLS. Zahlen damals:
recipes 58 · ingredients 117 · recipe_ingredients 377 · offers 658 · products 1.095 · ingredient_synonyms 144 · plz_regions 128 · user_profiles 10 · saved_recipes 9 · shopping_items 90 · weekly_plans 5 · purchase_log 8 · watchlist 3.

Leere Tabellen damals (können heute gefüllt sein): `price_history`, `recipe_costs`, `matching_log`, `scraped_this_week`, `unmatched_images`.

Edge Functions:
- `fetch-nutrients` (Claude Haiku schätzt Nährwerte für neue Rezepte)
- `match-recipe-image` (Bild → passendes Rezept)

---

## Dein Multi-Agenten-Wunsch vs. Realität

Du willst laut Memory: "Agenten für verschiedene Bereiche … die untereinander arbeiten und sich gegenseitig ergänzen, damit das System sich dauerhaft selbst verbessert — ohne dass du es triggern musst".

Check gegen die Realität:

| Wunsch-Agent | Existiert das schon? | Form |
|---|---|---|
| **Scraper-Agent** | ✅ Ja | `weekly-scrape.mjs` + `on-demand-scrape.yml` |
| **Daten-Gärtner / Health-Agent** | ✅ Ja | `nightly-health-check.mjs` mit Auto-Fix |
| **Matching-Agent** | ✅ Ja | `weekly-matching-analysis.mjs` schlägt Synonyme vor |
| **Rezept-Creator-Agent** | ✅ Ja (halb-autonom) | `weekly-recipe-generator.mjs` + Claude, du musst approven |
| **Bilder-Agent** | ✅ Ja (manuell getriggert) | `generate-recipe-images.mjs` + DALL-E |
| **Benachrichtigungs-Agent** | ✅ Ja | Telegram-Bot in allen Workflows |
| **Customer-Support-Agent** | ❌ Nein | — |
| **Marketing-Agent** | ❌ Nein | — |
| **Analytics/BI-Agent** | ❌ Nein | `purchase_log` + `scrape_runs` sind da, niemand liest sie |
| **Meta-/Orchestrator-Agent** | ❌ Nein | DAS ist die eigentliche Lücke |

Deine bestehenden Agenten sind **nicht vernetzt**. Jeder läuft nach Cron-Plan, nobody talks to each other. Ein Meta-Agent, der z.B. sagt: "Health-Check hat viele User ohne PLZ gefunden → Onboarding-Agent nachfassen", gibt es nicht. Der wäre der nächste logische Schritt.

---

## Wo du wirklich nachbauen solltest (priorisiert)

Das deckt sich zu 80% mit deinem eigenen `AUTOMATION_PLAN.md`. Mein Pragmatismus-Filter:

### Priorität 1 — in den nächsten 2 Wochen

1. **Admin/Approval-UI in der App** (statt Supabase-Dashboard)
   Kleine Seite unter `/admin`, nur für deine UID sichtbar, zeigt `pending_recipes` mit Approve/Reject-Button. Heute musst du in Supabase klicken — das frustet und führt dazu, dass Rezepte wochenlang unpublished bleiben.

2. **Matching-Feedback-Loop schließen**
   Das Matching-Script findet Synonym-Vorschläge, schreibt sie in `matching_reports`. Niemand liest die. → Entweder automatisch in `ingredient_synonyms` schreiben (mit Confidence-Score) oder im Admin-UI zum 1-Klick-Übernehmen.

3. **Image-Auto-Run**
   `generate-recipe-images.yml` läuft heute nur manuell. → Cron z.B. Sonntag 06:00 UTC nach Matching-Analyse, `--broken-only`, Limit 10 Bilder/Run. Kosten gedeckelt, trotzdem automatisch.

### Priorität 2 — Monat Mai

4. **Meta-/Observer-Agent**
   Ein neuer GitHub-Workflow `weekly-observer.yml` (z.B. Mo 08:00 UTC), der liest:
   - `scrape_runs` (wie viele Angebote?)
   - `matching_reports` (Match-Rate?)
   - `health_checks` (wie viele Warnings?)
   - `pending_recipes` (wie viele offen?)
   
   und generiert einen **wöchentlichen Executive-Summary per Telegram + E-Mail**, mit Ampel-Farben und konkreten Empfehlungen ("Match-Rate von 72% auf 68% gesunken — 3 neue Synonyme vorgeschlagen, 1-Klick übernehmen").

5. **Allergen-Filter im Onboarding**
   Datenmodell existiert (diets), aber Allergene fehlen. Wichtig für Vertrauen, billiger Win.

6. **User-Feedback-Pipeline**
   `FeedbackPopup` sammelt Feedback, aber wohin geht es? Wenn es in Supabase landet → Weekly-Digest in Telegram. Wenn nicht → verbinden.

### Priorität 3 — Sommer 2026

7. **Marketing-Agent (teilautonom)**
   Workflow, der einmal pro Woche aus den Top-Rezepten + Top-Deals automatisch einen Instagram/Threads-Post-Draft generiert (Claude), als Bild rendert (DALL-E), in einen Content-Kalender legt und dich fragt "publish?".

8. **Customer-Support-Agent**
   Wenn User Feedback-Popup oder E-Mail schreibt → Claude kategorisiert (Bug / Feature-Wunsch / Verwirrung), Auto-Antwort-Draft, du bestätigst.

9. **Analytics-Dashboard**
   Eine einzige `/stats` Seite (Admin-only) mit Kernmetriken: DAU, Rezepte/Woche, Match-Rate-Trend, gespeicherte Rezepte, Conversion Onboarding → aktiv. Zieht aus vorhandenen Tabellen, kein neues Tracking nötig.

### Priorität 4 — wenn's ernst wird

10. **Mobile-App** (React Native, Expo) — die `MealDeal`-Experimente im anderen Ordner könnten Basis sein, aber nur wenn Web-Version 500+ aktive User hat.
11. **Mehr Händler** (Lidl-API, Aldi-App, Kaufland) — jeder zusätzliche Scraper kostet Pflegeaufwand.
12. **Barcode-Scan** — nur wenn User es explizit fordern.

---

## Der eine Satz, den du dir merken solltest

> Du hast keinen Agenten-Mangel, du hast einen **Orchestrator-Mangel**. Die Einzelteile sind alle da und laufen gut. Was fehlt, ist der eine Workflow, der wöchentlich die anderen liest, bewertet und dir eine konkrete Handlungs-Liste schickt.

Das ist nicht mehr als 200 Zeilen Code. Das könnten wir als Nächstes bauen, wenn du willst.

---

## Aufräum-Empfehlungen (klein, aber wert)

- Die beiden parallelen Ordner `MealDeal` (React Native-Experiment) und `mealdeal-web` (echte App) verwirren. Entweder Archiv-Ordner oder Umbenennung `mealdeal-mobile-dead` o.ä.
- Das alte `STATUS_UND_STRATEGIE_2026-04-21.md` im `MealDeal`-Ordner ist **falsch** (basiert auf dem RN-Experiment) → löschen, dieses hier ist die korrekte Version.
- Dein eigener `AUTOMATION_PLAN.md` (395 Zeilen) und dieser Bericht decken sich zu ~80%. Kein Grund beide zu pflegen — ich schlage vor, `AUTOMATION_PLAN.md` als Langzeit-Vision zu behalten und diesen hier als Quartals-Statusbericht zu verstehen.
