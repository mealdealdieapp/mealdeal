# MealDeal

App die Angebote und Rezepte verbindet. Nutzer bekommen Wochenpläne basierend auf ihrem Budget, ihrer PLZ und was aktuell im Angebot ist.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 8 + Tailwind 3
- **State:** TanStack Query (Server State) + Zustand (UI State)
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Routing:** React Router v7
- **Icons:** Lucide React
- **Scraping:** Marktguru API (via Vercel Edge Function Proxy)
- **Hosting:** Vercel
- **Automation:** GitHub Actions (siehe `docs/SETUP_AUTOMATION.md`)

## Entwicklung starten

```bash
npm install
npm run dev
```

Dev-Server läuft auf http://localhost:5173.

## Projektstruktur

```
├── src/                         # React-App-Code
│   ├── components/              # UI-Komponenten
│   ├── pages/                   # Routes
│   ├── hooks/                   # Data-Fetching + Custom Hooks
│   ├── lib/                     # Supabase Client, Scraper, Helpers
│   ├── store/                   # Zustand Stores
│   └── types/                   # TypeScript-Typen
│
├── public/                      # Statische Assets
├── api/                         # Vercel Edge Functions (Marktguru-Proxy)
├── scripts/                     # Automation-Scripts (Node .mjs)
│   ├── weekly-scrape.mjs                # Wöchentliches Angebots-Scraping
│   ├── nightly-health-check.mjs         # Täglicher App-Health-Check
│   ├── weekly-matching-analysis.mjs     # Synonym-Vorschläge
│   ├── weekly-recipe-generator.mjs      # KI-Rezept-Generator
│   ├── cleanup-expired-offers.mjs       # Abgelaufene Angebote löschen
│   ├── generate-recipe-images.mjs       # DALL·E Rezeptbilder
│   ├── setup-automation-tables.sql      # SQL: Tabellen für Automation
│   ├── setup-rls-policies.sql           # SQL: RLS-Policies
│   └── *.sql                             # weitere SQL-Migrationen
│
├── .github/workflows/           # GitHub Actions (scheduled jobs)
├── docs/                        # Dokumentation
│   ├── SETUP_AUTOMATION.md              # Setup-Anleitung GitHub Actions
│   ├── AUTOMATION_PLAN.md               # Masterplan Automatisierung
│   ├── STATUS.md                         # Bestandsaufnahme 
│   └── SECURITY_CHECKLIST.md            # Security-Checkliste
│
├── MealDeal/                    # Business-Docs + Altes Projekt (Expo)
│   ├── Gesellschaftervertrag_UG_*.docx
│   ├── Kalkulation_erweitert.xlsx
│   ├── MEALDEAL_MASTERPLAN.md
│   └── app|backend|supabase/ (alt)
│
├── _archiv/                     # Archiv alter Scripts (vor Cleanup)
│   ├── alte-scraper/            # Python/JS Scraper (ersetzt durch scripts/)
│   └── alte-scripte/            # Alte .bat-Dateien
│
├── CLAUDE.md                    # Projekt-Regeln für Claude
└── .env                         # Lokale Umgebungsvariablen (nicht in Git!)
```

## Wichtige Dokumente

- **`docs/SETUP_AUTOMATION.md`** — Wie du die GitHub-Actions-Automatisierung scharf stellst
- **`docs/AUTOMATION_PLAN.md`** — Masterplan: Alle Phasen der Automatisierung
- **`CLAUDE.md`** — Regeln für Claude beim Coden im Projekt
- **`MealDeal/MEALDEAL_MASTERPLAN.md`** — Business-Masterplan

## Automatisierung (nach Setup)

| Job | Wann | Zweck |
|-----|------|-------|
| Scraping | Sa 23:00 UTC | Neue Angebote pro PLZ-Präfix |
| Health-Check | täglich 03:00 UTC | App-Monitoring + Auto-Fixes |
| Matching | So 05:00 UTC | Synonym-Vorschläge |
| Rezepte | So 06:00 UTC | 5 neue saisonale Rezepte |

Siehe `docs/SETUP_AUTOMATION.md` für Setup.

## Deployment

Automatisch via Vercel bei jedem Push auf `main`.

Live: https://mealdeal-ten.vercel.app
