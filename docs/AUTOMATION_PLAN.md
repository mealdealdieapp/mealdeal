# MealDeal — Automatisierungs-Masterplan

> Langfristiger Plan für autonomes Arbeiten, Monitoring, Content und Wachstum.
> Erstellt: April 2026 | Für Jo als MealDeal-Gründer

---

## Philosophie

Claude arbeitet für dich, du musst nur noch entscheiden. Alles Routinierte läuft automatisch. Du wirst nur benachrichtigt wenn:
- Etwas kaputt ist
- Eine Entscheidung ansteht
- Wöchentlicher Report fertig ist

Alles andere passiert im Hintergrund — nachts, wenn keiner da ist.

---

## Phase 0: VOR dem Urlaub (heute Abend)

Diese Punkte sind wichtig damit alles während deiner Abwesenheit funktioniert:

1. **Git Push** aller aktuellen Änderungen
2. **OpenAI API Key** in Supabase Secrets hinterlegen (nicht lokal)
3. **Google OAuth** fertig einrichten (Links hast du schon)
4. **Vercel Deployment** verknüpfen wenn noch nicht geschehen
5. **Telefonnummer/Email** für kritische Alerts hinterlegen

---

## Phase 1: Intelligentes Scraping-System

**Regel: Pro PLZ-Präfix (3 Stellen) nur 1x pro Woche scrapen.**

### Was gebaut wird

- **Wöchentlicher Scheduler** läuft jeden Montag 2 Uhr nachts
- Holt alle aktiven `user_profiles.plz` aus Supabase
- Extrahiert die eindeutigen PLZ-Präfixe (erste 3 Stellen)
- Scraped NUR diese Präfixe (keine doppelten, keine ungenutzten)
- Trackt in `scraped_this_week` Tabelle welche Präfixe bereits erledigt sind
- Sonntag 23 Uhr: Tabelle leeren für neue Woche

### Beispiel-Ablauf

```
Montag 02:00: 342 User registriert → 47 eindeutige PLZ-Präfixe
→ Scraped 47 Präfixe (vorher: 342 → massiv weniger Last)
→ Dauer: ~2h bei 1.5s Rate-Limit
→ Mittwoch: Neuer User mit neuer PLZ → wird automatisch ergänzt
→ Sonntag 23:00: Tabelle Reset
```

### Monitoring

Täglich 22 Uhr: Kurzer Check ob Scraper letzte Woche erfolgreich lief. Falls nicht → Alert an dich.

### Status

Basis existiert bereits (`scraped_this_week` Tabelle), muss nur noch aktiviert und gescheduled werden.

---

## Phase 2: Nächtlicher Tester-Agent

**Der Health-Check-Agent läuft jede Nacht um 3 Uhr — wenn keiner die App nutzt.**

### Was er prüft

**API Health:**
- Supabase erreichbar?
- Auth-Flow funktioniert? (Test-Login mit Test-Account)
- Können neue User sich registrieren?
- RLS-Policies greifen richtig?

**Daten-Integrität:**
- Gibt es kaputte Rezeptbilder? → Liste an Claude für DALL-E Run
- Abgelaufene Angebote in DB? → Automatisch löschen
- Unmatched Offers Count? → Trend beobachten

**Feature-Tests:**
- Rezept-Suche liefert Ergebnisse?
- Matching findet Angebote für Test-Rezepte?
- Wochenplan lässt sich speichern?
- Einkaufsliste funktioniert?
- Profil-Updates werden gespeichert?

**Performance:**
- Ladezeit der Hauptseite < 3s?
- Supabase-Query-Zeiten im grünen Bereich?
- Bundle-Size nicht explodiert?

### Was er tut wenn was kaputt ist

**Kritisch** (App down, Auth broken, DB-Fehler):
→ Sofort Push-Nachricht/Email an dich, auch nachts

**Mittelschwer** (Feature funktioniert nicht richtig):
→ Versucht automatisch zu fixen wenn Code-Änderung offensichtlich
→ Morgens 8 Uhr Report: "Habe X automatisch gefixt, Y erfordert deine Entscheidung"

**Klein** (Kaputte Bilder, verwaiste Daten):
→ Automatisch aufgeräumt, nur Log

### Auto-Fix-Möglichkeiten

Der Agent kann selbstständig:
- Abgelaufene Angebote löschen
- Kaputte Bildlinks durch Fallback ersetzen
- Mit DALL-E neue Rezeptbilder generieren (wenn Budget OK)
- TypeScript-Fehler fixen wenn offensichtlich
- Dead Code entfernen
- Dependencies aktualisieren (nur Minor/Patch)

Er fragt NICHT selbst bei:
- Breaking Changes
- Design-Entscheidungen
- Neuen Features
- Sicherheits-relevanten Änderungen

### Status

Muss komplett neu gebaut werden. Aufwand: ~2-3 Tage. Wert: massiv — du schläfst, App wird besser.

---

## Phase 3: Matching-Engine — Kontinuierliche Verbesserung

**Jede Nacht lernt das Matching dazu.**

### Daten-Feedback-Loop

**Was wird getrackt:**
- Welche Angebote werden User angezeigt aber NICHT gekauft? → Matching war nicht gut genug
- Welche Zutaten werden oft NICHT gefunden? → Neues Synonym nötig
- Welche Rezepte werden gespeichert aber Angebote ignoriert? → Score-Problem

### Wöchentlicher Analyse-Job

Jeden Sonntag 4 Uhr:
1. Analysiere alle `purchase_log` Einträge der Woche
2. Finde Patterns: "In 68% der Fälle wurde Angebot X ignoriert für Rezept Y"
3. Schlage Synonym-Erweiterungen vor
4. Zeige mir Montag morgen Report: "7 Synonym-Vorschläge, akzeptieren?"

### Auto-Learning

Wenn ein neues Synonym 10+ mal manuell bestätigt wird → automatisch zur DB hinzufügen.

---

## Phase 4: Rezept-Pipeline

**Das Rezept-Inventar wächst automatisch.**

### Auto-Rezept-Generator

Wöchentlich neue Rezepte generieren basierend auf:
- Saison (Spargel im April, Kürbis im Oktober)
- Aktuell häufigen Angeboten (viele Hähnchenangebote → mehr Hähnchen-Rezepte)
- User-Wünschen aus Feedback
- Trends von anderen Food-Plattformen

Jede Woche 5-10 neue Rezepte → nach einem Jahr 200-500 zusätzliche Rezepte ohne dein Zutun.

### Rezeptbild-Pipeline

- Neue Rezepte bekommen automatisch DALL-E Bild
- Alte kaputte Bilder werden ersetzt (läuft schon, muss nur gescheduled werden)
- Budget-Limit: max 5€/Monat für neue Bilder (sonst Alert)

### Qualitäts-Check

Neue Rezepte landen in `pending_recipes` Tabelle. Du reviewst am Handy per Swipe: Daumen hoch → live, Daumen runter → löschen.

---

## Phase 5: Claude IN MealDeal (KI-Features für User)

**Das macht deine App zum Alleinstellungsmerkmal.**

### Feature 1: Ingredient Scanner

User macht Foto vom Kühlschrank → Claude erkennt Zutaten → schlägt 5 Rezepte vor die zu aktuellen Angeboten passen.

Kosten pro Analyse: ~0.02€. Bei 1000 Scans/Monat = 20€.

### Feature 2: Chat mit deinem Kühlschrank

Text-Input: "Ich habe 20€, 3 Personen, etwas das schnell geht"
→ Claude checkt User-Profil (Ernährung, Allergien) + aktuelle Angebote + Zeit-Präferenz
→ Generiert perfekten Wochenplan

### Feature 3: Auto-Meal-Planner

1x pro Woche generiert Claude für jeden User einen personalisierten Wochenplan basierend auf:
- Profil (Diät, Ziel, Budget)
- Aktuellen Angeboten in der User-PLZ
- Was sie letzte Woche gekauft haben (nicht zu repetitiv)

Push-Nachricht Sonntag Abend: "Dein Wochenplan ist fertig, 42€ gespart!"

### Feature 4: Rezept-Variationen

User klickt auf Rezept → "Vegetarisch?" "Ohne Gluten?" "Schneller?" → Claude variiert live.

### Status

Komplett neues Feature-Set. Backend-Integration nötig. Aufwand: 1-2 Wochen Entwicklung. Das ist DEIN Moat gegenüber Konkurrenz.

---

## Phase 6: Content & Marketing-Automatisierung

**MealDeal wird durch Content gefunden.**

### Wöchentliche Content-Maschine

Jeden Montag 6 Uhr:
1. Claude analysiert welche Rezepte/Themen diese Woche angesagt sind
2. Generiert:
   - 7 Instagram-Posts (Bild + Caption)
   - 3 TikTok-Scripts (15s)
   - 1 Blog-Artikel (1500 Wörter, SEO-optimiert)
   - 1 Newsletter-Entwurf
3. Landet in deinem Content-Pool → du schaust Montag Mittag drüber → ein-Klick-Publish

### SEO-Automatisierung

- Jede Rezeptseite bekommt automatisch SEO-Meta-Tags
- Strukturierte Daten (Schema.org) für Google Recipe Cards
- Sitemap wird automatisch aktualisiert
- Interne Verlinkung zwischen Rezepten

### App Store Optimization

Monatlich: Claude prüft welche Suchbegriffe trenden und aktualisiert App Store Description.

### Status

Content-Generator kann schnell gebaut werden. Social-Media-Posting braucht Connectoren (Instagram API, TikTok API).

---

## Phase 7: Analytics & Business Intelligence

**Du siehst auf einen Blick wie's läuft.**

### Daily Dashboard (Web + Mobile)

Täglich automatisch generiert:
- Neue Registrierungen
- Aktive User
- Top 10 Rezepte
- Gesparter Betrag aller User kombiniert
- Fehler-Rate
- Revenue (wenn Monetarisierung läuft)

### Wöchentlicher Report (Email)

Montag 9 Uhr: Eine Seite PDF mit:
- Wichtigste Zahlen der Woche
- Was war neu
- Wo gibt's Probleme
- Empfohlene nächste Schritte

### Trend-Detection

Claude erkennt automatisch:
- "Rezept X ist diese Woche 300% öfter gespeichert worden"
- "In PLZ 80* haben plötzlich viele User aufgehört die App zu öffnen"
- "Neues Feature Y wird kaum genutzt"

### Status

Daten sind schon in Supabase, müssen nur ausgewertet und visualisiert werden.

---

## Phase 8: Team & Operations (später, wenn du wächst)

**Wenn du erste Leute einstellst oder mit Freelancern arbeitest.**

### Onboarding-Bot

Neuer Entwickler bekommt:
- Automatisch Zugang zu Repos
- Walkthrough durch Codebase (von Claude erklärt)
- Erste "Good First Issues"
- Pair-Programming mit Claude die ersten Tage

### Code-Review-Agent

Jeden Pull Request prüft Claude automatisch:
- Passt zum Coding-Style?
- Breaking Changes?
- Sicherheitsprobleme?
- Performance-Regressions?
- Tests vorhanden?

### Operations-Handbuch

Lebendes Dokument, das sich selbst aktualisiert wenn:
- Neue Deployment-Schritte dazu kommen
- Neue Scripts geschrieben werden
- Recovery-Prozeduren getestet werden

---

## Priorisierung — Was zuerst

### SOFORT (diese Woche, während Urlaub möglich)

1. **Scraping-Scheduler** mit PLZ-Präfix-Logik — einmal Montag nachts
2. **Wöchentlicher Matching-Report** — Sonntag Nacht
3. **Nächtlicher Health-Check (Basis)** — API-Pings, DB-Checks
4. **Tägliche Zusammenfassung** an dich per Email oder Chat

### NÄCHSTE 2 WOCHEN

5. **Nächtlicher Tester-Agent (erweitert)** — mit Feature-Tests
6. **Auto-Fix für kleine Issues** — kaputte Bilder, abgelaufene Angebote
7. **Content-Generator (Basis)** — Wochenplan für Social Media

### NÄCHSTER MONAT

8. **Claude-API in MealDeal** — Ingredient Scanner oder Chat-Feature
9. **Auto-Rezept-Pipeline** — wöchentlich neue Rezepte
10. **Analytics Dashboard**

### QUARTAL 2

11. **Marketing-Pipeline vollautomatisch** (Social Posting)
12. **Auto-Meal-Planner** für jeden User
13. **SEO-Optimierung** komplett

### QUARTAL 3+

14. **Team-Features** falls du einstellst
15. **Advanced BI** mit ML-Predictions

---

## Was ich sofort starten kann (heute/morgen)

Während du im Urlaub bist, kann ich (mit deiner Freigabe) folgendes bauen:

**Ohne dass du was tun musst:**
- Scraping-Scheduler fertigbauen und testen
- Nächtlichen Health-Check-Agent schreiben
- Content-Generator programmieren
- Matching-Verbesserungs-Logik
- Code-Cleanup und Refactorings

**Wofür ich dich kurz brauche (über Chat vom Handy):**
- Entscheidungen bei Design-Fragen ("So oder so?")
- Freigabe für größere Änderungen
- Review von generiertem Content bevor er raus geht

**Was du machen musst:**
- Git Push (kann man aber vom Handy über GitHub App)
- OpenAI Key und andere Secrets setzen (einmalig)
- Final Deployment-Genehmigungen

---

## Kommunikation im Urlaub

Ich schlage vor:
- **Morgens 9 Uhr**: Kurzer Status-Report von mir ("Heute Nacht wurde X gemacht, Y ist fertig, Z braucht deine Entscheidung")
- **Bei Bedarf**: Du chatst mich an wenn du was willst
- **Abends 20 Uhr**: Tages-Zusammenfassung
- **Nur bei Notfall**: Push-Alert außerhalb dieser Zeiten

---

## Erfolgs-Metriken

Nach 3 Monaten Auto-Setup solltest du sehen:

- Scraping läuft ohne Eingriff
- Mindestens 80% der Bugs werden nachts automatisch gefunden
- 50% der kleinen Issues werden automatisch gefixt
- Wöchentlich 5-10 neue Rezepte ohne deine Arbeit
- Content für Social Media läuft automatisch
- Du verbringst max 1h/Tag mit operativen Dingen, Rest für Strategie

---

## Nächster Schritt

Wenn du den Plan OK findest, entscheide welchen Teil wir ZUERST aufsetzen. Mein Vorschlag: **Phase 1 (Scraping) + Phase 2 (Tester-Agent Basis)** — das ist die Grundlage für alles andere und kann diese Woche laufen.

Sag einfach: "Let's go Phase 1 und 2" und ich lege los.
