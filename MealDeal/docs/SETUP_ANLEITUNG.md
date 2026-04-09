# MealDeal — Setup-Anleitung

Diese Anleitung führt dich Schritt für Schritt durch die Einrichtung aller benötigten Accounts und Tools. Du brauchst dafür keine Programmierkenntnisse.

---

## Schritt 1: Supabase (Datenbank)

Supabase ist unsere Datenbank und unser Backend. Dort werden alle Rezepte, Angebote, Nutzer und Einkaufslisten gespeichert.

1. Gehe auf **https://supabase.com** und klicke „Start your project"
2. Registriere dich mit deiner E-Mail oder GitHub
3. Klicke „New Project"
4. Wähle folgende Einstellungen:
   - **Name:** `mealdeal`
   - **Database Password:** Wähle ein sicheres Passwort und speichere es!
   - **Region:** `West EU (Ireland)` — am nächsten zum DACH-Raum
   - **Plan:** Free (reicht für den Start)
5. Warte bis das Projekt erstellt ist (ca. 2 Minuten)
6. Gehe zu **Settings → API**
7. Kopiere die folgenden Werte:
   - **Project URL** (sieht aus wie `https://abc123.supabase.co`)
   - **anon public** Key (langer Text, beginnt mit `eyJ...`)
   - **service_role** Key (nur für Backend-Skripte, NICHT öffentlich teilen!)

**Trage die Werte in die Datei `backend/config/.env` ein.**

---

## Schritt 2: Datenbank-Schema anlegen

Nachdem Supabase läuft, müssen wir die Tabellen anlegen.

1. Gehe in deinem Supabase-Projekt auf **SQL Editor**
2. Klicke „New Query"
3. Öffne die Datei `backend/schema/001_initial_schema.sql` auf deinem Computer
4. Kopiere den gesamten Inhalt und füge ihn im SQL Editor ein
5. Klicke „Run" — alle Tabellen werden automatisch erstellt

Danach solltest du unter **Table Editor** folgende Tabellen sehen:
users, recipes, recipe_ingredients, products, offers, synonyms, matching_rules, weekly_plans, weekly_plan_items, shopping_list, watchlist, favorites, plz_cache

---

## Schritt 3: OpenAI API (für KI-Features)

OpenAI wird für die KI-Wochenplanung und Rezeptbild-Generierung gebraucht. Du brauchst diesen Account erst, wenn wir die Premium-Features implementieren, aber du kannst ihn schon jetzt einrichten.

1. Gehe auf **https://platform.openai.com**
2. Erstelle einen Account (oder melde dich an)
3. Gehe zu **API Keys** (oben rechts → Menü)
4. Klicke „Create new secret key"
5. Kopiere den Key (beginnt mit `sk-...`) — er wird nur einmal angezeigt!
6. Lade dein Konto mit mind. 10€ auf (unter **Billing**)

**Trage den Key in die `.env` Datei ein.**

---

## Schritt 4: Pepesto API (Angebotsdaten)

Pepesto liefert uns die aktuellen Supermarkt-Angebote. Dieser Schritt ist optional für den Start — wir haben Beispieldaten zum Testen.

1. Gehe auf **https://www.pepesto.com**
2. Schaue dir die verfügbaren Supermärkte für Deutschland an
3. Kontaktiere Pepesto für einen API-Zugang (über deren Website)
4. Sobald du einen Key hast, trage ihn in die `.env` Datei ein

Falls Pepesto keine passende Lösung ist, können wir alternative Quellen einrichten.

---

## Schritt 5: App auf dem Handy testen

Um die App auf deinem Handy zu testen:

1. Installiere die **Expo Go** App auf deinem Handy
   - [Android (Play Store)](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS (App Store)](https://apps.apple.com/app/expo-go/id982107779)
2. Auf deinem Computer, navigiere zum Ordner `app/`
3. Starte die App mit dem Befehl: `npx expo start`
4. Scanne den QR-Code mit deinem Handy (Expo Go App öffnen → Scan)
5. Die App sollte auf deinem Handy starten!

---

## Schritt 6: App veröffentlichen (später)

Für die Veröffentlichung im App Store / Play Store brauchst du:

**Apple App Store:**
- Apple Developer Account (99€/Jahr) — https://developer.apple.com
- Ein Mac für den Build-Prozess (oder wir nutzen EAS Build von Expo)

**Google Play Store:**
- Google Play Console Account (einmalig 25€) — https://play.google.com/console
- Kann von jedem Betriebssystem aus gemacht werden

Wir kommen darauf zurück, wenn die App bereit für die Veröffentlichung ist.

---

## Checkliste

- [ ] Supabase-Projekt erstellt
- [ ] Supabase URL und Keys in .env eingetragen
- [ ] Datenbank-Schema angelegt (SQL ausgeführt)
- [ ] OpenAI Account erstellt und Key in .env
- [ ] Pepesto API angefragt (optional)
- [ ] Expo Go auf dem Handy installiert
- [ ] App erfolgreich auf dem Handy gestartet

---

*Bei Fragen zu einem der Schritte: Frag mich einfach, ich helfe dir durch!*
