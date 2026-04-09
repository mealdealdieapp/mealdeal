# MealDeal — Masterplan

## 1. Projektvision

MealDeal verbindet echte Supermarkt-Angebote mit Rezepten im DACH-Raum. Der Nutzer entdeckt Rezepte, sieht sofort welche Zutaten im Angebot sind, wo er sie bekommt und spart Zeit, Geld und Stress bei der Wochenplanung.

**Kernversprechen:** „Entdecke Rezepte. Spare beim Einkauf. Plane deine Woche."


---

## 2. App-Struktur und Features

### 2.1 Fünf Hauptseiten

**Seite 1 — Discovery (Rezepte entdecken)**
Rezepte nach Kategorien durchsuchen und entdecken. Jedes Rezept zeigt sofort an, welche Zutaten aktuell im Angebot sind, bei welchem Supermarkt und zu welchem Preis. Kategorien umfassen klassische Einteilungen (Frühstück, Mittagessen, Abendessen, Snacks, Desserts) sowie Trend-Kategorien (TikTok-Hype, Budget unter 5€, Unter 30 Minuten, Meal-Prep). Das Zufallsrad ist ein zentrales Feature: Es vereinfacht die Auswahl bei Unentschlossenheit und dient gleichzeitig als Marketing-Tool (teilbare Ergebnisse, Gamification).

**Seite 2 — Angebote**
Klassische Angebotsübersicht mit langfristigem Ziel, digitale Prospekte anzuzeigen. Produkte sind nach Kategorie, Supermarkt und Preis filterbar. Einzelne Produkte können direkt zur Einkaufsliste hinzugefügt oder in der Watchlist gespeichert werden. Die Watchlist benachrichtigt den Nutzer, wenn ein beobachtetes Produkt wieder im Angebot ist.

**Seite 3 — Wochenplan**
Der Nutzer berechnet seinen Kalorienbedarf und setzt Ziele (Abnehmen, Zunehmen, Halten). In der Free-Version wird der Wochenplan manuell zusammengestellt. In der Premium-Version erstellt eine KI den Plan automatisch, optimiert auf Kalorienziele (mit Toleranz), Wiederverwendung von Zutaten über mehrere Gerichte und Berücksichtigung aktueller Angebote. Der gesamte Wochenplan kann mit einem Klick zur Einkaufsliste hinzugefügt werden.

**Seite 4 — Einkaufsliste**
Automatisch nach Supermärkten sortiert. Enthält Zutaten aus Rezepten und manuell hinzugefügte Produkte. Einzelne Einträge sind abhakbar, bearbeitbar und löschbar. Zeigt pro Zutat den besten verfügbaren Preis und den Supermarkt an.

**Seite 5 — Profil**
Persönliche Einstellungen (aus dem Onboarding): PLZ, Supermarktauswahl, Ernährungsform, Allergien, Vorlieben, Haushaltsgröße. Eigene Rezepte erstellen und verwalten. Watchlist (beobachtete Produkte) und Favoriten (gespeicherte Rezepte). Premium-Verwaltung und Benachrichtigungseinstellungen.

### 2.2 Onboarding

Das Onboarding ist die Grundlage für alle personalisierten Features. Abgefragt werden: PLZ (bestimmt verfügbare Supermärkte und Angebote), bevorzugte Supermärkte (Mehrfachauswahl), Ernährungsform (Omnivor, Vegetarisch, Vegan, Pescetarisch etc.), Allergien und Unverträglichkeiten, Haushaltsgröße (beeinflusst Portionsgrößen) und Budgetrahmen pro Woche (optional).


---

## 3. Datenquellen — Die größte Hürde lösen

### 3.1 Angebotsdaten ohne Marktguru-API

Da Marktguru bisher keine Test-API bereitgestellt hat, brauchen wir einen unabhängigen Weg.

**Empfohlene Strategie: Pepesto API als Hauptquelle**

Pepesto (pepesto.com) bietet eine REST-API für über 25 europäische Supermarktketten, darunter deutsche Ketten. Die API liefert einheitliches JSON-Format, tägliche Katalog-Updates, Live-Preise in Euro inklusive Aktionspreise und Verfügbarkeit. Das eliminiert das gesamte Scraping-Problem und ist rechtlich sauber, da es sich um einen lizenzierten Datendienst handelt.

**Fallback-Strategie: Eigene Datenpipeline**

Falls Pepesto zu teuer wird oder nicht alle Ketten abdeckt, können wir ergänzend eine eigene Pipeline aufbauen. REWE bietet semi-strukturierte Produktdaten über ihre Website, die über Apify-Scraper (apify.com) extrahierbar sind. Für LIDL und ALDI existieren ebenfalls Apify-Scraper. Rechtlich ist dabei zu beachten, dass Web-Scraping öffentlicher Daten in Deutschland grundsätzlich legal ist (BGH-Urteile 2014/2018), allerdings AGBs der jeweiligen Supermärkte beachtet werden müssen. Nur nicht-personenbezogene Daten dürfen verarbeitet werden und eine Reservierung gegen Text-und-Data-Mining gemäß §44b UrhG muss geprüft werden.

**PLZ-basierte Angebots-Zuordnung**

Ein zentraler Punkt: Nicht für jeden Nutzer einzeln Angebote abrufen, sondern PLZ-basiert cachen. Beim ersten Nutzer einer PLZ werden die Angebote einmal abgerufen und für alle Nutzer mit dieser PLZ gespeichert. Nationale Angebote (ALDI, LIDL) gelten überall gleich. Regionale Angebote (REWE, Edeka) variieren je nach Filiale und werden auf PLZ-Ebene gruppiert. Ein wöchentlicher Refresh-Zyklus ist ausreichend, da Prospekte wöchentlich wechseln, idealerweise Samstagabend/Sonntag früh.

### 3.2 Rezeptdaten

**Hauptquelle: Chefkoch.de**

Chefkoch ist mit über 300.000 Rezepten Deutschlands größte Rezeptplattform. Es existiert eine API unter api.chefkoch.de und ein Apify-Scraper. Etwa 80% der Rezepte haben vollständige Nährwertdaten. Die Rezepte sind real, beliebt und DACH-relevant — kein KI-generierter Unsinn.

**Wichtig:** Die Nutzung der Chefkoch-Daten muss rechtlich geprüft werden. Optionen sind eine offizielle Partnerschaft/Lizenz mit Chefkoch, die Verlinkung auf Chefkoch-Rezepte statt eigener Kopien, oder der Aufbau einer eigenen kuratierten Rezeptdatenbank, inspiriert von beliebten Chefkoch-Kategorien.

**Ergänzende Quellen** sind Spoonacular (365.000+ Rezepte, internationale Küche mit Filtermöglichkeiten), Edamam (2 Mio+ Rezepte, starke Nährwertanalyse) und ein Kaggle-Datensatz für deutsche Rezepte als Startbasis.

**Empfehlung für den Start:** Eine eigene kuratierte Datenbank mit 200–500 hochwertigen deutschen Rezepten aufbauen. Quellen sind öffentlich verfügbare Rezepte (Standardgerichte sind nicht urheberrechtlich geschützt, nur die kreative Darstellung), Nährwerte über Edamam/Spoonacular API berechnen und Kategorien manuell zuweisen. Langfristig können Community-Rezepte und Partnerschaften hinzukommen.

### 3.3 Produktdatenbank und UVP-Preise

**OpenFoodFacts** (openfoodfacts.org) ist die weltweit größte offene Lebensmitteldatenbank mit über 4 Mio Produkten. Sie ist 100% Open Data und frei nutzbar, bietet eine öffentliche API und enthält Barcodes, Nährwerte und Produktinfos. Dies löst das Problem der fehlenden UVP-Preise teilweise, da zumindest Produktinformationen verfügbar sind.

**CodeCheck** (codecheck-app.com) hat über 39 Mio Produkte und bietet eine kommerzielle API. Die Abdeckung ist in Deutschland, Österreich und der Schweiz umfangreich.

**Eigene Preisdatenbank aufbauen:** Jedes Mal wenn ein Angebotspreis erfasst wird, speichern wir auch den UVP-Preis (sofern angegeben). Bei Prozent-Angeboten (z.B. „30% Rabatt") berechnen wir den UVP aus dem Angebotspreis. Über Zeit entsteht so eine eigene Preishistorie pro Produkt. Formel: Wenn Angebotspreis = X und Rabatt = Y%, dann UVP = X / (1 - Y/100).

### 3.4 Rezeptbilder

Für den Start empfehlen sich KI-generierte Bilder als pragmatischste Lösung. DALL-E oder Midjourney können konsistente, hochwertige Food-Fotos generieren. Das ist günstiger als Stock-Fotos und liefert einheitlicheren Stil. Es gibt keine Urheberrechtsprobleme, da die Bilder selbst erstellt werden.

Ergänzend können kostenlose Stock-Fotos von Foodiesfeed (CC0, keine Attribution nötig), Unsplash und Pexels (frei für kommerzielle Nutzung) genutzt werden.

**Automatisierung:** Ein Skript generiert beim Anlegen neuer Rezepte automatisch ein Bild über die DALL-E API mit einem konsistenten Prompt-Template für einheitlichen Stil.


---

## 4. Das Matching-Problem lösen

### 4.1 Warum einfaches Text-Matching nicht funktioniert

Beispiel: Das Rezept verlangt „Butter". Einfaches Matching findet „Erdnussbutter", „Buttermilch", „Buttergemüse" — alles falsch. Oder das Rezept verlangt „Hackfleisch", aber das Angebot heißt „Rinderhack" oder „Mischgehacktes".

### 4.2 Lösungsansatz: Mehrstufiges Matching

**Stufe 1 — Zutatennormalisierung:** Jede Rezeptzutat wird auf einen Standardbegriff gemappt. „Hackfleisch gemischt" wird zu Kategorie „Hackfleisch", „Sahne", „Schlagsahne", „Süße Sahne" werden alle zu Kategorie „Sahne". Dafür bauen wir eine Synonym-Datenbank auf.

**Stufe 2 — Produktkategorisierung:** Jedes Angebots-Produkt wird einer Produktkategorie zugeordnet. „Kerrygold Irische Butter 250g" wird zu Kategorie „Butter", „Müller Buttermilch 500ml" wird zu Kategorie „Buttermilch" (nicht Butter!). Hierfür nutzen wir Produktname-Parsing mit Regeln und NLP.

**Stufe 3 — Kategorie-Matching:** Zutatenkategorie wird mit Produktkategorie abgeglichen, nicht mit dem Volltext. „Butter" (Zutat) matched nur mit Produkten der Kategorie „Butter", nicht mit „Buttermilch" oder „Erdnussbutter".

**Stufe 4 — Relevanz-Score:** Jedes Match bekommt einen Konfidenz-Score. Nur Matches über einem Schwellenwert werden dem Nutzer angezeigt. Bei niedrigem Score wird das Produkt als „möglicherweise passend" markiert.

### 4.3 Synonym-Datenbank (Beispiele)

Hackfleisch umfasst: Gehacktes, Mischgehacktes, Rinderhack, Schweinehack, Hackfleisch gemischt, Faschiertes (AT), Gehacktes (CH). Sahne umfasst: Schlagsahne, Süße Sahne, Kochsahne, Rahm (AT/CH), Obers (AT), Crème (CH). Kartoffeln umfassen: Erdäpfel (AT), Speisekartoffeln, Festkochende Kartoffeln, Mehligkochende Kartoffeln.

### 4.4 Technische Umsetzung

Wir verwenden Fuzzy-Matching mit der Levenshtein-Distanz für Tippfehler und Varianten, eine Word-Embedding-basierte Ähnlichkeit für semantisches Matching, eine regelbasierte Ausschluss-Liste (Butter ≠ Buttermilch, Käse ≠ Käsekuchen) und ein manuelles Review-Dashboard für die ersten Wochen, um falsche Matches zu identifizieren und die Regeln zu verbessern.


---

## 5. Tech-Stack

### 5.1 Übersicht

Der Tech-Stack ist so gewählt, dass ich den Großteil der Entwicklung auf deinem Rechner automatisieren kann und du mit minimalem technischen Wissen klarkommst.

**Frontend (Mobile App):** React Native mit Expo. Damit lässt sich eine App für iOS und Android gleichzeitig entwickeln. Expo vereinfacht Build und Deployment massiv. JavaScript/TypeScript ist die Sprache — dafür gibt es die meisten Ressourcen und Hilfe.

**Backend und Datenbank:** Supabase (supabase.com) als Backend-as-a-Service. Es bietet eine PostgreSQL-Datenbank (robust, skalierbar), eine eingebaute Authentifizierung (inkl. DSGVO-konform), eine Auto-generierte REST-API, Echtzeit-Subscriptions und einen kostenlosen Starttarif mit großzügigen Limits. Die Alternative wäre Firebase, allerdings ist Supabase europäischer und DSGVO-freundlicher.

**Daten-Pipeline (Angebote holen und verarbeiten):** Python-Skripte, die wöchentlich laufen. Sie rufen Angebote ab (via Pepesto API oder Scraper), normalisieren die Daten, führen das Matching durch und schreiben die Ergebnisse in Supabase. Diese Skripte können als Cron-Job auf deinem Rechner oder später auf einem Server laufen.

**KI-Features (Premium Wochenplan):** Python mit OpenAI API für die intelligente Wochenplanung. Input sind Kalorienziele, verfügbare Angebote und Rezeptdatenbank. Output ist ein optimierter Wochenplan mit minimaler Zutatenverschwendung.

**Bildgenerierung:** DALL-E API (OpenAI) für konsistente Rezeptbilder.

### 5.2 Architekturdiagramm

```
┌─────────────────────────────────────────────────────┐
│                    NUTZER (App)                      │
│              React Native + Expo                     │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                   SUPABASE                           │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Auth    │  │ Database │  │  Storage (Bilder)  │  │
│  │ (DSGVO) │  │ PostgreSQL│  │                   │  │
│  └─────────┘  └──────────┘  └───────────────────┘  │
└──────────────────────▲──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              DATEN-PIPELINE (Python)                  │
│                                                      │
│  ┌───────────┐  ┌────────────┐  ┌───────────────┐  │
│  │ Angebote  │  │  Matching  │  │  Rezept-DB    │  │
│  │ abrufen   │→ │  Engine    │← │  verwalten    │  │
│  │(Pepesto)  │  │            │  │               │  │
│  └───────────┘  └────────────┘  └───────────────┘  │
│                                                      │
│  ┌───────────┐  ┌────────────┐                      │
│  │ KI-Wochen │  │ Bild-      │                      │
│  │ planer    │  │ generierung│                      │
│  │(OpenAI)   │  │ (DALL-E)   │                      │
│  └───────────┘  └────────────┘                      │
└─────────────────────────────────────────────────────┘
```

### 5.3 Datenbankschema (Kernmodell)

**users:** id, email, plz, ernaehrungsform, allergien[], supermaerkte[], haushalt_groesse, kcal_ziel, premium_status

**recipes:** id, title, beschreibung, kategorie, zubereitungszeit, schwierigkeit, portionen, kcal_pro_portion, protein, kohlenhydrate, fett, bild_url, quelle, ist_trend

**recipe_ingredients:** id, recipe_id, zutat_name, zutat_kategorie, menge, einheit

**products:** id, name, marke, produktkategorie, barcode, uvp_preis, bild_url, openfoodfacts_id

**offers:** id, product_id, supermarkt, preis, rabatt_prozent, gueltig_von, gueltig_bis, plz_gebiet, prospekt_seite

**ingredient_product_matches:** id, zutat_kategorie, produktkategorie, konfidenz_score, manuell_geprueft

**synonyms:** id, standardbegriff, synonym, sprache (de/at/ch)

**weekly_plans:** id, user_id, kalenderwoche, erstellt_am, ist_ki_generiert

**weekly_plan_items:** id, plan_id, wochentag, mahlzeit (frühstück/mittag/abend/snack), recipe_id

**shopping_list:** id, user_id, zutat_name, menge, einheit, supermarkt, preis, angebot_id, abgehakt

**watchlist:** id, user_id, produktkategorie, benachrichtigung_aktiv

**favorites:** id, user_id, recipe_id


---

## 6. Wochenplanung — Feature-Design

### 6.1 Free-Version

Der Nutzer sieht seinen Kalorienbedarf (berechnet aus Alter, Geschlecht, Gewicht, Größe, Aktivitätslevel nach der Mifflin-St-Jeor-Formel). Er kann für jeden Tag manuell Rezepte aus der Discovery-Seite zuweisen. Die App zeigt live an, wie nah er an seinen Kalorienzielen ist (Fortschrittsbalken pro Tag und pro Woche).

### 6.2 Premium-Version (KI-Wochenplan)

Der Nutzer klickt „Wochenplan generieren". Die KI berücksichtigt dabei Kalorienziel pro Tag (mit ±10% Toleranz), Ernährungsform und Allergien, aktuell verfügbare Angebote (Preis-Optimierung), Wiederverwendung von Zutaten (weniger Verschwendung), Abwechslung (nicht 3x das gleiche in einer Woche) und saisonale Verfügbarkeit.

Der Output ist ein kompletter 7-Tage-Plan mit Frühstück, Mittag, Abendessen und optionalen Snacks. Der Nutzer kann einzelne Gerichte austauschen (Swipe-Mechanik) und den Plan dann komplett zur Einkaufsliste hinzufügen.

### 6.3 Technische Umsetzung

Die KI-Planung nutzt die OpenAI API mit strukturiertem Output. Ein Prompt enthält Nutzerprofil, verfügbare Rezepte mit Nährwerten und aktuelle Angebote. Das Ergebnis ist ein JSON-Wochenplan, der validiert wird (Kalorien innerhalb Toleranz?, alle Allergien beachtet?, Zutaten verfügbar?).


---

## 7. Monetarisierung

### 7.1 Einnahmequellen

**Premium-Abonnement (B2C):** Monatlich ca. 3,99€ oder jährlich ca. 29,99€. Features: KI-Wochenplanung, erweiterte Nährwertanalyse, Preishistorie und Preiswarnungen, keine Werbung. Ziel: 5–10% Conversion-Rate.

**Werbung (B2C):** Native Ads auf der Angebots- und Discovery-Seite. Sponsored Rezepte (gekennzeichnet). Banner in der Free-Version. Wichtig: Kein irreführendes Placement, klare Kennzeichnung nach deutschem Wettbewerbsrecht.

**Supermarkt-Partnerschaften (B2B):** Supermärkte zahlen für prominente Platzierung ihrer Angebote. Wir bringen messbare Kaufkraft (Tracking über Einkaufslisten-Nutzung). Datenreports zeigen, welche Angebote in Kombination mit welchen Rezepten funktionieren.

**Datenanalyse (B2B):** Anonymisierte und aggregierte Insights für Supermärkte: welche Angebotskombinationen funktionieren, saisonale Trends in der Rezeptnachfrage, PLZ-basierte Nachfragemuster. Alle Daten DSGVO-konform anonymisiert und aggregiert.

### 7.2 Wichtig bei der Monetarisierung

Werbung muss nach §5a UWG als solche erkennbar sein. Daten dürfen nur anonymisiert und aggregiert weitergegeben werden. Keine Weitergabe personenbezogener Daten ohne explizite Einwilligung.


---

## 8. Rechtliches und DSGVO

### 8.1 DSGVO-Pflichten

**Datenschutzerklärung:** Muss vor der Nutzung einsehbar sein. Enthält welche Daten erhoben werden, zu welchem Zweck, auf welcher Rechtsgrundlage, wie lange gespeichert und welche Rechte der Nutzer hat. Muss in verständlichem Deutsch verfasst sein.

**Einwilligung (Consent):** Explizite Einwilligung für nicht-essentielle Cookies/Tracking, Verarbeitung von Ernährungs- und Gesundheitsdaten (Art. 9 DSGVO — besondere Kategorie!), Push-Benachrichtigungen und Weitergabe an Dritte (Werbe-Partner). Wichtig: Ernährungsdaten (vegan, Allergien etc.) gelten als Gesundheitsdaten und unterliegen besonderem Schutz.

**Rechte der Nutzer:** Auskunftsrecht (Art. 15), Löschungsrecht/Recht auf Vergessenwerden (Art. 17), Datenportabilität (Art. 20) und Widerspruchsrecht (Art. 21).

**Technische Maßnahmen:** Verschlüsselung aller Daten in Transit (TLS) und at Rest. Minimale Datenerhebung (nur was nötig ist). Regelmäßige Backups mit Zugriffsschutz und Auftragsverarbeitungsverträge mit Supabase, OpenAI etc. (Art. 28 DSGVO).

### 8.2 Impressumspflicht

Nach §5 TMG/DDG muss die App ein vollständiges Impressum enthalten: Name, Anschrift, Kontaktdaten, ggf. Handelsregisternummer. Bei einer GbR oder UG reichen die Gesellschafterdaten.

### 8.3 Lebensmittelrecht

Nährwertangaben müssen korrekt sein — bei Nutzung externer Daten (OpenFoodFacts, Spoonacular) Haftungsausschluss einbauen: „Nährwertangaben sind Richtwerte und können abweichen." Keine medizinischen Ernährungsempfehlungen geben — immer auf professionelle Beratung verweisen. Allergiehinweise prominent anzeigen.

### 8.4 Wettbewerbsrecht

Rezepte und Zutatenlisten sind nicht urheberrechtlich geschützt (BGH), aber kreative Texte, Fotos und Anleitungen schon. Eigene Formulierungen verwenden und niemals Texte von Chefkoch o.Ä. kopieren. Angebotspreise müssen korrekt und aktuell sein — veraltete Preise können irreführend sein (§5 UWG).


---

## 9. Automatisierung — Was ich übernehmen kann

### 9.1 Wöchentliche Daten-Pipeline

Ich kann ein vollautomatisches System auf deinem Rechner einrichten. **Jeden Samstagabend** laufen folgende Schritte automatisch ab: Angebote aller konfigurierten Supermärkte abrufen (via Pepesto API), neue Produkte in die Produktdatenbank aufnehmen (UVP-Preise berechnen, wenn nur Prozente gegeben), Matching durchführen (Angebote ↔ Rezeptzutaten), Ergebnisse in Supabase hochladen und einen Report erstellen (wie viele Angebote, wie viele Matches, eventuelle Probleme).

### 9.2 Rezeptdatenbank aufbauen

Ich kann eine initiale Datenbank mit 200–500 deutschen Rezepten erstellen. Die Rezepte werden mit Nährwerten angereichert (über Spoonacular/Edamam API), mit Kategorien und Tags versehen, mit normalisierten Zutaten für das Matching vorbereitet und mit generierten Bildern (DALL-E) ausgestattet.

### 9.3 Was du machen musst

Du musst API-Keys besorgen für Pepesto (Angebotsdaten), OpenAI (KI-Wochenplan und Bildgenerierung) und Supabase (Datenbank). Du musst ein Supabase-Projekt erstellen (kostenlos, ich leite dich an). Du musst einen Apple Developer Account und/oder Google Play Console einrichten für den App-Veröffentlichung. Außerdem musst du rechtliche Dokumente von einem Anwalt prüfen lassen (Datenschutzerklärung, AGB, Impressum) und die Geschäftsform klären (Einzelunternehmer, GbR, UG).


---

## 10. Entwicklungsplan — Phasen

### Phase 1: Fundament (Wochen 1–3)

In Woche 1 stehen Projektsetup und Datenbank auf dem Plan: Supabase-Projekt einrichten, Datenbankschema anlegen, API-Keys beschaffen und Projektstruktur für React Native/Expo anlegen. In Woche 2 geht es an die Rezeptdatenbank: 100 kuratierte deutsche Rezepte mit Nährwerten erstellen, Synonym-Datenbank aufbauen, Kategorisierungssystem implementieren. In Woche 3 folgt die Angebots-Pipeline: Pepesto-API-Anbindung implementieren, PLZ-basiertes Caching entwickeln, Matching-Engine (Stufe 1–3) bauen.

**Meilenstein:** Funktionierende Datenbasis mit Rezepten und aktuellen Angeboten.

### Phase 2: MVP-App (Wochen 4–7)

Woche 4–5 umfasst die Discovery-Seite mit Rezeptübersicht, Kategorien, Suchfunktion und Rezeptdetailseite mit Angebots-Matching. In Woche 6 wird die Angebotsseite gebaut mit Produktübersicht, Filtern und Einkaufslisten-Integration. In Woche 7 folgt die Einkaufsliste mit Supermarkt-Sortierung und Abhaken-Funktion.

**Meilenstein:** Testbare App mit Kernfunktionen.

### Phase 3: Wochenplanung und Profil (Wochen 8–10)

Woche 8 bringt die Profilseite mit Onboarding-Flow, Einstellungen und Favoriten. Woche 9–10 umfassen die Wochenplanung (Free) mit Kalorienberechnung, manuellem Planer und Fortschrittsanzeige.

**Meilenstein:** Vollständige Free-Version der App.

### Phase 4: Premium und Polish (Wochen 11–14)

Woche 11–12 bringen die KI-Wochenplanung (Premium) mit OpenAI-Integration, Plan-Generierung und Validierung. In Woche 13 wird die Monetarisierung aufgesetzt mit dem Premium-Payment-System (RevenueCat), Werbung (AdMob) und Analytics. Woche 14 dient dem Feinschliff und Beta-Testing: Bug-Fixes, Performance-Optimierung, Beta-Testgruppe.

**Meilenstein:** Veröffentlichungsreife App mit Free- und Premium-Version.

### Phase 5: Launch und Wachstum (ab Woche 15)

Jetzt folgen die Veröffentlichung im App Store und Google Play, Marketing (Social Media, TikTok, Instagram), Partnerschaftsgespräche mit Supermärkten, Skalierung der Rezeptdatenbank auf 500+ und Zufallsrad und Gamification-Features.


---

## 11. Kostenübersicht (Startphase)

**Kostenfreie Dienste:** Supabase (Free Tier: 500 MB DB, 1 GB Storage, 50.000 Auth-User), Expo/React Native (Open Source) und OpenFoodFacts API (kostenlos).

**Kostenpflichtige Dienste (geschätzt):** Pepesto API ca. 50–200€/Monat je nach Volumen, OpenAI API ca. 20–50€/Monat (GPT-4 für Wochenplanung, DALL-E für Bilder), Apple Developer Account 99€/Jahr, Google Play Console einmalig 25€ und Domain und Hosting ca. 10€/Monat.

**Geschätzte monatliche Kosten in der Startphase:** 100–300€/Monat.


---

## 12. Risiken und Gegenmaßnahmen

**Pepesto API wird zu teuer oder stellt ein:** Gegenstrategie ist eine eigene Scraping-Pipeline als Backup und direkte Supermarkt-Partnerschaften anstreben.

**Matching-Qualität nicht gut genug:** Gegenstrategie ist ein manuelles Review-Dashboard für die ersten Wochen, Community-Feedback einbauen (Nutzer melden falsche Matches) und kontinuierliche Verbesserung der Synonym-Datenbank.

**Zu wenige Nutzer für B2B-Partnerschaften:** Gegenstrategie ist Fokus auf eine PLZ-Region zum Start (z.B. deine Stadt), dort kritische Masse erreichen und dann expandieren.

**Rechtliche Probleme:** Gegenstrategie ist frühzeitig Anwalt für IT-Recht/Datenschutz konsultieren, DSGVO von Tag 1 ernst nehmen und keine Daten speichern die nicht unbedingt nötig sind.

**Chefkoch/Rezeptquellen sperren Zugang:** Gegenstrategie ist eigene Rezeptdatenbank aufbauen (nicht abhängig von einer Quelle) und Community-Rezepte ermöglichen.


---

## 13. Nächste konkrete Schritte

1. Pepesto API testen — Kostenlose Demo anfragen und prüfen, welche deutschen Supermärkte abgedeckt sind
2. Supabase-Projekt einrichten — Ich leite dich Schritt für Schritt an
3. API-Keys beschaffen — OpenAI und ggf. Spoonacular/Edamam für Nährwerte
4. Erste 50 Rezepte kuratieren — Ich erstelle die Datenstruktur und helfe beim Befüllen
5. Matching-Engine Prototyp — Ich baue einen ersten Prototyp der auf deinem Rechner läuft
6. Rechtsberatung einholen — IT-Anwalt für DSGVO-Check und AGB-Erstellung

---

*Erstellt am 06.04.2026 — MealDeal Masterplan v1.0*
