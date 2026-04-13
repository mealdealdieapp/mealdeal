# MealDeal Automation Setup

Schritt-für-Schritt: Wie du die Automatisierung scharf stellst. Dauert ca. 10 Minuten.

## Was du einmalig machen musst

### 1. Supabase: Tabellen anlegen (2 Min)

1. Gehe zu [app.supabase.com](https://app.supabase.com) → dein Projekt
2. Links im Menü: **SQL Editor**
3. Klick **"+ New query"**
4. Öffne die Datei `scripts/setup-automation-tables.sql` in deinem Projekt
5. Kopiere den **gesamten** Inhalt rein
6. Klick **"Run"** unten rechts
7. Es sollte stehen "Success. No rows returned." — fertig!

Was das macht: Legt 4 neue Tabellen an (`scraped_this_week`, `health_checks`, `matching_reports`, `pending_recipes`).

---

### 2. Code auf GitHub pushen (2 Min)

Im Terminal (oder über deinen Git-Client):

```bash
git add .
git commit -m "feat: automation scripts, github actions, cleanup"
git push
```

Falls noch kein GitHub-Repo existiert, kurz auf github.com neues Repo erstellen und pushen.

---

### 3. GitHub Secrets setzen (3 Min)

1. Gehe zu `github.com/<dein-user>/<dein-repo>`
2. Oben: **Settings** → links: **Secrets and variables** → **Actions**
3. Klick **"New repository secret"** und lege diese **3 Secrets** an:

| Name | Wert |
|------|------|
| `SUPABASE_URL` | `https://wjhesvkapqrsbibqjbtr.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Dein Service Role Key aus Supabase (Settings → API → `service_role secret`) |
| `MARKTGURU_API_KEY` | `8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE=` (ist der aktuelle in `api/marktguru/[...path].ts`) |

Optional (für KI-Rezepte und DALL·E Bilder):
| `OPENAI_API_KEY` | Dein OpenAI Key (sk-...) |

---

### 4. Ersten Job manuell testen (2 Min)

1. Gehe zu `github.com/<dein-user>/<dein-repo>/actions`
2. Klick links: **"Nächtlicher Health-Check"**
3. Klick **"Run workflow"** → **"Run workflow"** (grüner Button)
4. Nach 1-2 Min sollte ein grüner Haken ✅ kommen
5. Klick den Run an → "Run Health Check" → siehst du die Ausgabe

Wenn grün: Alles läuft. Die anderen Jobs laufen automatisch nach Plan.

---

## Zeitplan

| Job | Wann | Was |
|-----|------|-----|
| Health-Check | täglich 3:00 UTC (4/5 Uhr MEZ) | App-Checks, löscht abgelaufene Angebote |
| Matching-Analyse | Sonntag 5:00 UTC | Neue Synonym-Vorschläge |
| Rezept-Generator | Sonntag 6:00 UTC | 5 neue saisonale Rezepte |
| Scraping | Samstag 23:00 UTC → Sonntag Nacht | Neue Angebote für neue Woche |

---

## Was du im Urlaub siehst

Du bekommst **E-Mail-Benachrichtigungen von GitHub**, wenn ein Job fehlschlägt (Einstellung: github.com → Settings → Notifications → "Actions"). Die grüne Häkchen-Mails kannst du stummschalten.

Logs + Output jedes Runs findest du unter `github.com/<repo>/actions`.

---

## Troubleshooting

**"Module not found: @supabase/supabase-js"** → `npm install` einmal ausführen, dann `package-lock.json` committen.

**"Row violates row-level security"** → Du hast noch den Anon Key eingetragen statt Service Key. Service Key umschalten.

**Job läuft nicht zum Zeitplan** → GitHub Actions haben manchmal 5-15 Min Verzögerung. Normal.

**Scraping liefert 0 Angebote** → Teste den Marktguru-Key: Workflow manuell mit "Run workflow" starten und Logs prüfen.
