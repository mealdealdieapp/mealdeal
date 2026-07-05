# MealDeal — Projektwissen für Claude (PC-übergreifend)

> **Zweck dieser Datei:** Der Cowork-Chatverlauf und Claudes Gedächtnis werden **lokal pro PC** gespeichert und syncen NICHT zwischen Rechnern. Diese Datei liegt im GitHub-Repo und wandert dadurch auf jeden PC mit. Wenn du auf einem neuen Rechner mit Claude arbeitest, sag einfach: **„Lies docs/PROJEKT_WISSEN_CLAUDE.md"** — dann hat Claude sofort den Kontext.
>
> **Pflege:** Bei größeren Änderungen diese Datei aktualisieren, damit sie nicht veraltet. Stand: 2026-07-05.

---

## Wer ist Jo

Gründer/Initiator von MealDeal. Versteht Produkt und Geschäftslogik sehr gut, hat aber **kaum technische Programmierkenntnisse**. Braucht Schritt-für-Schritt-Anleitungen und will, dass Claude den Großteil der technischen Umsetzung automatisiert auf dem Rechner übernimmt. **Kommunikation auf Deutsch.**

## Die Vision (Nordstern)

MealDeal löst Jos eigenes Problem (Founder-Market-Fit): Er kocht gerne impulsiv, dadurch werden Einkäufe teuer. Der Kern:

> **Mühelos die Woche planen ohne nachzudenken — mit leckeren Gerichten, die das kcal-Ziel treffen, und dabei automatisch sparen.**

Das „ohne nachzudenken / mühelos" ist die eigentliche Magie. Zentraler Loop: App öffnen → fertiger Wochenplan, der (1) schmeckt, (2) Makros/kcal trifft, (3) günstig ist, weil um aktuelle Angebote herum gebaut. Bei jeder Priorisierung fragen: *„Stärkt das den Kern-Loop?"* Auto-Plan-Generierung = Herzstück, Peripherie nachrangig.

## Business-Setup

Rechtsform **UG (haftungsbeschränkt)**. Geschäftsmodell **Freemium + Premium-Abo**, Payment über **Stripe** (geplant). Geo-Strategie: Start nur **Deutschland**, später **AT + CH**. Plattform: erst **Web-App** (Test), danach native Apps. User-Content: eigene Rezepte, später Community-Upload. Marketing: Influencer + Affiliate. Anwaltsbudget knapp → Generator-Lösungen + BAFA-Förderung statt Custom-AGBs. Ein Pflicht-Anwaltstermin (~250–400 €) vor Open Beta.

---

## Wichtig: zwei Ordner, leicht zu verwechseln

1. **`C:\Users\job99\angebotskoch-v2\mealdeal-web\`** ← **DIE ECHTE APP.** React 19 + Vite 8 + TypeScript + Tailwind + Supabase. Gehostet auf Vercel. **Hier läuft alles.**
2. `C:\Users\job99\angebotskoch-v2\MealDeal\` ← älteres React-Native/Expo + Python-Experiment. **Toter Pfad. Nicht verwechseln, nie darauf beziehen.**

## Wichtige URLs & Zugänge

- **Live-App:** https://mealdeal-ten.vercel.app
- **GitHub-Repo:** https://github.com/mealdealdieapp/mealdeal
- **GitHub Actions:** https://github.com/mealdealdieapp/mealdeal/actions
- **Vercel Dashboard:** https://vercel.com/dashboard (Jos Account)
- **Supabase (PRODUKTIV):** Projekt-ID `wjhesvkapqrsbibqjbtr`, Org „AngebotsKoch", eu-central-1, Status ACTIVE_HEALTHY. Dashboard: https://supabase.com/dashboard/project/wjhesvkapqrsbibqjbtr
  - ⚠️ Es gibt ein ZWEITES, **inaktives** Supabase-Projekt „mealdeal" (ID `wnmozcorrizjvrpduzgw`, andere Org) — NICHT die Produktiv-DB. Immer den AngebotsKoch-Account wählen.
- **Monitoring:** Telegram-Bot pusht Workflow-Erfolg/Fehler an Jo (Secrets TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in GitHub).

## Tech-Stack & Regeln (aus CLAUDE.md des Repos)

React 19 + TypeScript, Vite 8, Tailwind CSS **3** (nicht v4), TanStack Query für alle Supabase-Queries, Zustand nur für Auth-Session/Profil/aktiven Tab, Supabase Backend, React Router v7, Lucide Icons.

**Datenregeln:** Niemals Supabase-Daten hardcoden. Immer TypeScript-Types aus `database.types.ts`. Profildaten (PLZ, Märkte, Ernährung) sind Basis für alle Queries. Angebote werden nur nach `user.plz` + `user.markets` gefiltert; `offers.plz_prefix` mit den ersten 2–3 Stellen der User-PLZ matchen. Komponenten max. 150 Zeilen. Kein Inline-CSS, nur Tailwind.

**Design:** Primär #028350 (Grün), Ersparnis #22C55E, Hintergrund #F5F5F0, Karten weiß mit 18px Radius + 1.5px Border #EBEBEB (kein Box-Shadow). Headlines Bricolage Grotesque (800), Body DM Sans.

---

## Aktueller Plan (Single Source of Truth)

**Release-Master-Plan:** `docs/RELEASE_MASTER_PLAN_2026-Q2.md` — 10-Wochen-Timeline bis **Open Beta 27.07.2026**. Das ist die *einzige* Planungsstelle, keine Parallelpläne aufmachen — nur diese anpassen. Ergänzt durch `docs/STRATEGIE_REVIEW_2026-05-21.md`.

Weitere zentrale Docs im Repo: `docs/ARCHITECTURE_100K.md` (Skalierungs-Architektur, „Gehirn"-Ansatz), `docs/PHASE_1_PRODUCT_BRAIN.md`, `docs/PHASE_2_MATCHING_BRAIN.md`, `docs/Bestandsaufnahme_2026-05-29.html`, `docs/STATUSBERICHT_2026-04-21.md`.

## Was live/gebaut ist (Stand Ende Mai 2026)

Die Web-App ist funktional: E-Mail-Registrierung, 9-Schritt-Onboarding (PLZ, Märkte, Diäten, Allergien, Vorrat, Haushalt, Budget, Notifications), Rezepte suchen/filtern, Angebote pro Händler, Wochenplan mit Makro-Tracking, Einkaufsliste mit Ersparnis, Favoriten, Watchlist, Kaufhistorie, DSGVO/Impressum/AGB.

Weiter gebaut: DSGVO-Art.9-Einwilligung für Gesundheitsdaten, Datenexport + Soft-Delete, Push-Notifications (inkl. Watchlist-Treffer), Allergen-Filter end-to-end, Pantry-Filter im Einkaufszettel, Performance-Indexes, Security-Hardening (Supabase Advisor), KI-Wochenplan-Generator (`algo_v1`, wählt NUR aus existierenden Rezepten, erfindet keine) + Tracking-Pipeline (`plan_generations`, `plan_modifications`, `recipe_interactions`) als Datengrundlage für spätere Personalisierung.

**Automation:** ~9+ GitHub Workflows (Weekly-Scrape, On-Demand-Scrape bei Neu-Registrierung, Rezept-Generator, Matching-Analyse, Health-Check, AI-Enrichment, Push-Dispatcher). Alle mit Telegram-Notifs.

**KI-Datenpipeline:** Produkt-„Gehirn" via Gemini-Enrichment (Phase 1) + Matching via Embeddings/pgvector (Phase 2, Pilot erfolgreich).

## Offene Baustellen / To-dos

- **Bulk-Enrichment Phase 1:** ~2704 Offers noch nicht angereichert (6× Workflow-Run mit batch_size=500).
- **Phase 2 Frontend-Integration** vollständig ausrollen (`useMatchedOffers`, Rezept-Detail auf RPC umstellen, Feature-Flag).
- **Externe Inputs, die Jo besorgen muss:** Stripe-Account (→ Premium-Gate baubar), Apple Developer Account (99 USD/Jahr → Apple Sign-In), OpenAI-Key (→ 28 kaputte Rezeptbilder via DALL-E fixen), Anwaltstermin (AGB/Datenschutz-Final-Review), Marktguru-Bildnutzung schriftlich, Supabase Pro-Upgrade (25 USD/Monat → HaveIBeenPwned-Toggle).
- **Post-Beta:** native Apps, AT/CH, UGC, Hard-Delete-Cron, RLS-Performance-Lints.

## Kritische Merkregeln

- **On-Demand-Scrape bei Neu-Registrierung ist Top-Priorität** (kein Nice-to-have): Ohne sofortigen Scrape sieht ein neuer User bis zum nächsten Samstag keine Angebote → tötet die Erstnutzung. Jo hat das mehrfach angemahnt.
- **Marktguru-API-Alpha** war ab ~Mai 2026 erwartet → löst das Scraper-Datenproblem an der Quelle. Nicht mehr in HTML-Parsing investieren.
- **Windows-Mount-Eigenheit:** Große Datei-Writes über Write/Edit können am Ende abgeschnitten werden. Nach nicht-trivialem Write mit `wc -l` + `tail` verifizieren; bei Truncation per Shell-Heredoc schreiben. Repo nutzt CRLF.
- **Git-Lock-Problem:** git-Schreibbefehle (add/commit) aus der Sandbox können `.git/index.lock` hängen lassen (virtiofs „Operation not permitted"). Auflösung: Session/Rechner neu starten. Commits ggf. lokal auf Windows ausführen. ~213 Dateien zeigen CRLF-bedingt als „modified" → beim Commit gezielt nur bearbeitete Dateien nennen.
- **GitHub PAT:** Nach Regenerierung ~5–10 Min Propagation → 401 Bad credentials in dem Fenster ist normal, NICHT sofort neuen Token erstellen.

---

## So arbeitest du auf einem neuen PC weiter

1. **Repo klonen:** `git clone https://github.com/mealdealdieapp/mealdeal` (oder aus OneDrive/vorhandenem Ordner öffnen).
2. In Claude/Cowork den Ordner `mealdeal-web` als Arbeitsordner verbinden.
3. Claude bitten: **„Lies docs/PROJEKT_WISSEN_CLAUDE.md und docs/RELEASE_MASTER_PLAN_2026-Q2.md"** — damit ist der Kontext geladen.
4. Dev-Server: `npm install`, dann `npm run dev`.

Der bisherige Chatverlauf vom alten PC wandert **nicht** mit — nur diese Dateien im Repo. Deshalb: wichtige Erkenntnisse immer hier oder in die Repo-Docs schreiben.
