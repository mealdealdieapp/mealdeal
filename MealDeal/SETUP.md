# MealDeal Setup — Schritt für Schritt

## Was du brauchst

- Python (https://www.python.org/downloads/) — bei Installation **"Add to PATH" ankreuzen!**
- Node.js (https://nodejs.org/) — LTS Version
- Expo Go App auf deinem Handy (App Store / Play Store)

---

## Schritt 1: Schema in Supabase deployen

Das muss einmalig manuell gemacht werden:

1. Öffne https://supabase.com/dashboard
2. Wähle dein Projekt
3. Klicke links auf **SQL Editor**
4. Klicke auf **+ New query**
5. Öffne die Datei `backend/schema/001_initial_schema.sql` mit einem Texteditor
6. Kopiere den gesamten Inhalt und füge ihn im SQL Editor ein
7. Klicke **Run** (grüner Button)
8. Du solltest "Success" sehen — fertig!

---

## Schritt 2: Setup ausführen

Öffne eine Kommandozeile (CMD oder PowerShell) im MealDeal-Ordner:

```
cd C:\Pfad\zu\MealDeal
```

Oder doppelklicke einfach auf `start_setup.bat`.

Das Skript installiert automatisch alle Pakete, lädt Rezepte und Synonyme in Supabase, und scrapt die aktuellen Angebote von Marktguru.

---

## Schritt 3: App starten

```
cd app
npx expo start
```

Scanne den QR-Code mit der Expo Go App auf deinem Handy.

---

## Angebote aktualisieren

Jede Woche neue Angebote holen:

```
python backend/pipeline/offers/marktguru_scraper.py --plz 56281
```

---

## Bei Problemen

- **"Python nicht gefunden"** → Python installieren, PATH-Haken setzen
- **"Module not found"** → `pip install -r requirements.txt`
- **Schema-Fehler** → Nochmal im SQL Editor ausführen
- **API-Key ungültig** → Keys in `backend/config/.env` prüfen
