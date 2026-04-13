# MealDeal - Vollständige Bestandsaufnahme

Stand: 2026-03-23

---

## Technischer Stack

### Frontend Libraries

| Paket | Version | Zweck |
|-------|---------|-------|
| react | ^19.2.4 | UI Framework |
| react-dom | ^19.2.4 | DOM Rendering |
| react-router-dom | ^7.13.1 | Routing |
| @tanstack/react-query | ^5.90.21 | Data Fetching & Caching |
| zustand | ^5.0.12 | State Management (minimal) |
| @supabase/supabase-js | ^2.99.1 | Backend Client |
| lucide-react | ^0.577.0 | Icons |

### Dev Dependencies

| Paket | Version |
|-------|---------|
| vite | ^8.0.0 |
| typescript | ~5.9.3 |
| tailwindcss | ^3.4.19 |
| @vitejs/plugin-react | ^6.0.0 |
| eslint | ^9.39.4 |
| autoprefixer | ^10.4.27 |
| postcss | ^8.5.8 |

### Supabase Tabellen

| Tabelle | Zeilen | Spalten (Key) |
|---------|--------|---------------|
| **user_profiles** | 10 | id (FK auth.users), plz, markets[], diets[], preferences[], budget, cal_target, protein_target, carbs_target, fat_target, gender, age, weight, height, activity, goal |
| **recipes** | 58 | id, rid, name, emoji, meal, time_minutes, difficulty, servings, calories, protein, carbs, fat, cost, saved, tag, tag_color, diets[], steps[], is_public, created_by (FK auth.users), image_url |
| **ingredients** | 117 | id, name (unique), emoji, category, unit, calories_per_100, protein_per_100, carbs_per_100, fat_per_100, price, quantity |
| **recipe_ingredients** | 377 | id, recipe_id (FK recipes), ingredient_id (FK ingredients), amount, unit |
| **offers** | 658 | id, product_name, store, plz, plz_prefix, region, original_price, offer_price, discount_percent, category, unit, quantity, valid_from, valid_until, image_url, product_id, fingerprint (unique), emoji |
| **products** | 1.095 | id, name (unique), brand, store, category, emoji, unit, normal_price, lowest_price, highest_price, avg_price, min_price, max_price, times_on_sale, last_seen, uvp, unit_size, current_price, current_market, ean |
| **ingredient_synonyms** | 144 | id, canonical, synonym |
| **custom_recipes** | 2 | id, user_id (FK auth.users), name, emoji, meal, time_minutes, servings, calories, protein, carbs, fat, diff, ings (jsonb), steps[], image_url |
| **shopping_items** | 90 | id, user_id (FK auth.users), name, amount, unit, category, checked, week_start, offer_id (FK offers), offer_store, offer_price, offer_original_price, offer_discount_percent, offer_product_name |
| **weekly_plans** | 5 | id, user_id (FK auth.users), week_start, plan (jsonb) |
| **saved_recipes** | 9 | id, user_id (FK auth.users), recipe_id (FK recipes) |
| **purchase_log** | 8 | id, user_id (FK auth.users), date, items[], not_bought[], item_count, total_saved, offer_count, total_cost |
| **watchlist** | 3 | id, user_id (FK auth.users), name, emoji, target_price |
| **plz_regions** | 128 | plz (PK), region, bundesland |
| **price_history** | 0 | id, product_id (FK products), market, price, original_price, valid_from, valid_until, week_number, source, plz, plz_prefix |
| **recipe_costs** | 0 | id, recipe_id, plz, region, cost, saved, calculated_at |
| **matching_log** | 0 | id, ingredient_name, ingredient_category, matched_offer_name, matched_offer_category, score |
| **scraped_this_week** | 0 | id, store, plz_prefix, scraped_at, valid_until, offers_count |
| **unmatched_images** | 0 | id, file_name (unique), bucket, checked_at |

Alle Tabellen haben RLS aktiviert.

### Edge Functions

| Funktion | Status | Zweck |
|----------|--------|-------|
| **fetch-nutrients** | ACTIVE | Schätzt Nährwerte pro 100g via Claude Haiku API. Nimmt ingredient_id + name, schreibt calories/protein/carbs/fat_per_100 in ingredients-Tabelle. |
| **match-recipe-image** | ACTIVE | Automatisches Matching von hochgeladenen Bildern (recipe-images Bucket) zu Rezepten via Namens-Ähnlichkeit (Jaccard + Substring). Schreibt image_url in recipes. Unmatched → unmatched_images Tabelle. |

---

## Features nach Screen

### Auth & Onboarding

| Status | Feature |
|--------|---------|
| ✅ | Email/Passwort Login & Signup |
| ✅ | Email-Bestätigung mit Resend-Button |
| ✅ | 5-Schritt Onboarding (PLZ → Märkte → Ernährung → Präferenzen → Zusammenfassung) |
| ✅ | PLZ-Validierung (5 Stellen) |
| ✅ | Mindestens 1 Markt + 1 Ernährungsform erforderlich |
| ✅ | 8 Märkte: REWE, ALDI, Netto, Penny, Lidl, Kaufland, Edeka, Norma |
| ✅ | 7 Ernährungsformen: Omnivor, Vegetarisch, Vegan, Halal, Koscher, High-Protein, Low-Carb |
| ✅ | 6 Präferenzen: Bio, Bessere Haltung, Regional, Nachhaltig, Preis-Leistung, Markenprodukte |
| ✅ | Profil wird in user_profiles gespeichert |
| ❌ | Passwort vergessen / Reset |
| ❌ | OAuth (Google, Apple) |
| ❌ | Onboarding für Körperdaten (Alter, Gewicht, Größe, Aktivitätslevel, Ziel) — Felder existieren in DB, aber kein Onboarding-Step dafür |

### Rezepte

| Status | Feature |
|--------|---------|
| ✅ | Rezept-Übersicht mit Kategorien (Frühstück, Mittagessen, Abendessen, Snacks, etc.) |
| ✅ | Virtuelle Kategorien: Schnell (<20min), Budget (<5€), Meal Prep (>4 Portionen) |
| ✅ | Rezept-Suche (Name) |
| ✅ | Rezeptdetail-Modal: Bild, Nährwerte, Zutaten, Zubereitungsschritte |
| ✅ | Portionen-Slider (passt Mengen an) |
| ✅ | Zutat-zu-Angebot-Matching mit Ersparnis-Anzeige |
| ✅ | Rezept speichern (Favoriten) |
| ✅ | "Zur Einkaufsliste hinzufügen" mit Angebots-Matching |
| ✅ | "Zum Wochenplan hinzufügen" mit Tag/Mahlzeit-Auswahl |
| ✅ | Glücksrad / Zufallsrezept (SpinWheel mit Canvas-Animation) |
| ✅ | Diät-Scoring: Rezepte werden nach Ernährungsprofil bewertet |
| ✅ | Angebots-Scoring: Rezepte mit Sparpotenizal werden bevorzugt |
| ✅ | Rezeptbilder aus Supabase Storage |
| ✅ | Custom Recipes (eigene Rezepte) — in DB, in RecipeDetail unterstützt |
| ⚠️ | Bilder: Einige Rezepte haben kein image_url → Fallback auf Emoji, was funktioniert aber nicht ideal aussieht |
| ❌ | Rezept erstellen / bearbeiten UI (custom_recipes Tabelle existiert, aber kein Formular im Frontend) |
| ❌ | Rezepte nach Nährwerten filtern |
| ❌ | Rezept teilen |

### Angebote

| Status | Feature |
|--------|---------|
| ✅ | Angebote nach PLZ-Prefix (3 Stellen) + ausgewählten Märkten gefiltert |
| ✅ | Kategorie-Grid (Ernährungspyramide-Reihenfolge) |
| ✅ | Suche in Angeboten |
| ✅ | Markt-Filter (wenn mehrere Märkte ausgewählt) |
| ✅ | Diät-Filterung: Halal/Koscher/Vegan/Vegetarisch Keywords werden ausgeblendet |
| ✅ | Präferenz-basiertes Sorting (Bio, Regional bevorzugt) |
| ✅ | "Zur Einkaufsliste" direkt aus Angebot |
| ✅ | Watchlist — Produkte beobachten |
| ✅ | Rabatt-Badge pro Angebot |
| ✅ | Food vs. Non-Food Trennung |
| ⚠️ | Angebots-Gültigkeit: Filter nutzt `valid_until >= today`, aber es gibt kein automatisches Cleanup abgelaufener Angebote |
| ❌ | Preishistorie / Preisverlauf-Graph (price_history Tabelle existiert mit 0 Einträgen, products hat Preisfelder, aber kein UI) |
| ❌ | Push-Benachrichtigung bei Watchlist-Match |
| ❌ | Angebots-Bilder (image_url Feld existiert, aber nicht im UI dargestellt) |

### Wochenplan

| Status | Feature |
|--------|---------|
| ✅ | Wochenansicht Mo-So mit 4 Mahlzeiten pro Tag |
| ✅ | Heute-Ansicht (einzelner Tag) |
| ✅ | Rezept zu Slot hinzufügen via RecipePicker |
| ✅ | Rezept aus Slot entfernen |
| ✅ | Mehrere Rezepte pro Mahlzeit-Slot möglich |
| ✅ | Tages-Statistik: Kalorien, Protein, Kohlenhydrate, Fett, Kosten |
| ✅ | Wochen-Statistik: Durchschnitt + Summen |
| ✅ | "Alle Zutaten zur Einkaufsliste" mit Angebots-Matching |
| ✅ | Automatische Plan-Generierung (useGeneratePlan) |
| ✅ | Plan-Generierung berücksichtigt: Diät, Kalorien-Ziel, Abwechslung, Angebote, Budget |
| ✅ | Kalorienziel-Einstellung direkt im Wochenplan |
| ✅ | Heutiger Tag hervorgehoben |
| ✅ | Zutaten-Aggregierung (gleiche Zutaten werden zusammengefasst) |
| ⚠️ | Plan-Generierung: Minimum 3 unique Rezepte pro Mahlzeittyp nötig — bei kleiner Rezeptdatenbank (58 Rezepte) kann das knapp werden |
| ❌ | Drag & Drop zum Umordnen |
| ❌ | Plan kopieren in nächste Woche |
| ❌ | Plan als PDF exportieren |

### Einkaufsliste

| Status | Feature |
|--------|---------|
| ✅ | Items nach Markt gruppiert |
| ✅ | Checkbox zum Abhaken (optimistic update) |
| ✅ | Fortschrittsbalken (checked / total) |
| ✅ | Manuelles Hinzufügen (Name, Menge, Einheit, optional Markt) |
| ✅ | Multi-Select + Löschen |
| ✅ | "Einkauf abschließen" mit Bestätigung |
| ✅ | Purchase Summary Modal (Anzahl Items, Angebote genutzt, Gespart, Ausgegeben) |
| ✅ | purchase_log Eintrag bei Abschluss |
| ✅ | "Nicht gefunden" Tracking (not_bought Array in purchase_log) |
| ✅ | Deduplizierung beim Bulk-Add (identische unchecked Items werden nicht doppelt angelegt) |
| ✅ | Angebots-Daten werden pro Item gespeichert (Store, Preis, Rabatt) |
| ✅ | Einkaufs-Strategie Empfehlung (welche Märkte besuchen) |
| ❌ | Items sortieren / umsortieren |
| ❌ | Kategorisierung der manuell hinzugefügten Items |
| ❌ | Einkaufsliste teilen |

### Profil

| Status | Feature |
|--------|---------|
| ✅ | Profil-Übersicht (PLZ, Märkte, Diäten) |
| ✅ | Statistik-Header (Gespart diese Woche, Gesamt gespart, Einkäufe) |
| ✅ | Einstellungen bearbeiten (PLZ, Märkte, Diäten, Präferenzen) |
| ✅ | Favorisierte Rezepte anzeigen |
| ✅ | Einkaufs-Historie (purchase_log) |
| ✅ | Watchlist verwalten |
| ✅ | Logout |
| ✅ | Eigene Rezepte (custom_recipes) Sektion |
| ⚠️ | Profil hat Felder für Körperdaten (gender, age, weight, height, activity, goal) und Makro-Targets (protein_target, carbs_target, fat_target) — diese existieren in der DB und im Settings-UI, aber es gibt keinen dedizierten Onboarding-Flow dafür |
| ❌ | Account löschen |
| ❌ | Passwort ändern |
| ❌ | Profilbild |
| ❌ | Dark Mode |

---

## Datenfluss

```
User meldet sich an
    ↓
Onboarding: PLZ, Märkte, Diäten, Präferenzen → user_profiles
    ↓
┌───────────────────────────────────────────────────┐
│                  PROFIL-DATEN                     │
│  plz (→ plz_prefix), markets[], diets[],         │
│  preferences[], cal_target                        │
└──────────┬──────────┬──────────┬──────────────────┘
           │          │          │
           ▼          │          ▼
    ┌──────────┐      │   ┌────────────┐
    │ ANGEBOTE │      │   │  REZEPTE   │
    │ useOffers│      │   │ useRecipes │
    └──────┬───┘      │   └──────┬─────┘
           │          │          │
    Filter:│          │   Score: │
    - plz_prefix      │   - dietScore (Diäten)
    - markets[]       │   - offerScore (Angebote)
    - valid_until     │          │
    - diets keyword   │          │
    - preferences     │          │
           │          │          │
           ▼          ▼          ▼
    ┌─────────────────────────────────┐
    │       OFFER MATCHING            │
    │  offerMatching.ts               │
    │  Zutat (Name+Kategorie) →       │
    │  bestes Angebot (Score-basiert)  │
    │  + categoryMapping.ts           │
    │  + ingredient_synonyms          │
    └──────────────┬──────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
   ┌──────────┐     ┌─────────────┐
   │WOCHENPLAN│     │EINKAUFSLISTE│
   │useWeekly │────▶│ useShopping │
   │Plan      │     │             │
   └──────────┘     └──────┬──────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ PURCHASE LOG │
                    │ usePurchase  │
                    │ Log          │
                    └──────────────┘
```

### Lücken im Datenfluss

1. **price_history ist leer** — Die Tabelle existiert mit product_id FK, aber es werden keine Preise historisch gespeichert. Die Infrastruktur (products mit avg/min/max_price, scraped_this_week) deutet auf ein geplantes Scraping-System hin, das noch nicht aktiv ist.

2. **recipe_costs ist leer** — Geplant zur Vorberechnung regionaler Rezeptkosten, aber nicht befüllt.

3. **matching_log ist leer** — Gerade erst erstellt, noch nicht in den Frontend-Code integriert (Logging-Aufrufe fehlen in offerMatching.ts).

4. **Keine automatische Angebots-Pipeline** — Angebote müssen manuell oder via externes Script in die DB geladen werden. scraped_this_week hat 0 Einträge.

5. **products ↔ offers Verbindung** — offers hat ein product_id Feld (FK zu products), aber die App nutzt diese Verknüpfung nicht aktiv.

---

## Bekannte Bugs & Probleme

### Code-Qualität

1. **Tote Dateien:**
   - `src/lib/categoryMatching.ts` — wird nirgends importiert (ersetzt durch categoryMapping.ts + offerMatching.ts)
   - `src/components/layout/Header.tsx` — wird nirgends importiert (ersetzt durch PageHeader.tsx)

2. **Console-Statements in Produktion:**
   - `src/components/recipes/RecipeDetail.tsx:234` — `console.error('Failed to add to plan:', err)`
   - `src/pages/ProfilePage.tsx:325` — `console.error('Upload error:', uploadErr)`

### Daten-Probleme

3. **Angebots-Bilder nicht genutzt** — offers hat image_url und emoji Felder, aber OfferCard zeigt nur das Kategorie-Emoji, nicht das produktspezifische Bild.

4. **Ingredient-Preise nicht genutzt** — ingredients hat `price` und `quantity` Felder, aber die App berechnet Rezeptkosten über `recipes.cost` (statisch), nicht über Zutaten-Einzelpreise.

5. **Edge Function fetch-nutrients: verify_jwt = false** — Jeder kann die Funktion aufrufen und Nährwerte überschreiben. Kein Rate-Limiting.

6. **Edge Function match-recipe-image: verify_jwt = false** — Gleiches Problem.

7. **Onboarding-Märkte hardcoded** — Die Marktliste in OnboardingPage.tsx ist im Code fest eingebaut statt aus einer Konfiguration oder DB zu kommen.

### UX-Probleme

8. **Kein Offline-Support** — Service Worker fehlt. Bei Netzwerkausfall funktioniert nichts.

9. **Kein Loading-Error-Handling auf Page-Ebene** — Wenn Supabase-Queries fehlschlagen, werden leere Listen angezeigt statt Fehlermeldungen.

10. **Kein Pagination** — Alle Rezepte und Angebote werden auf einmal geladen. Bei wachsender Datenmenge wird das zum Problem.

---

## Datei-Inventar

### Pages (6)
- `src/pages/auth/LoginPage.tsx` — Login/Signup
- `src/pages/auth/OnboardingPage.tsx` — 5-Schritt Profil-Setup
- `src/pages/RecipesPage.tsx` — Rezeptübersicht + Suche + Glücksrad
- `src/pages/OffersPage.tsx` — Angebotsübersicht nach Kategorie
- `src/pages/WeeklyPage.tsx` — Wochenplan-Editor
- `src/pages/ShoppingPage.tsx` — Einkaufsliste
- `src/pages/ProfilePage.tsx` — Profil, Einstellungen, Favoriten, Historie

### Hooks (13)
- `useProfile.ts` — Profil laden + Store sync
- `useUpdateProfile.ts` — Profil aktualisieren
- `useRecipes.ts` — Rezepte laden + Diät/Angebot-Scoring
- `useRecipeDetail.ts` — Zutaten + Angebots-Matching pro Rezept
- `useSavedRecipes.ts` — Favoriten toggle
- `useOffers.ts` — Angebote laden + filtern
- `useSynonyms.ts` — Zutat-Synonyme laden
- `useWeeklyPlan.ts` — Wochenplan CRUD + Stats
- `useGeneratePlan.ts` — KI-Plangeneration
- `useShopping.ts` — Einkaufsliste CRUD + Markt-Gruppierung
- `useAddToShopping.ts` — Items zur Einkaufsliste hinzufügen
- `useWatchlist.ts` — Watchlist CRUD
- `useProfileStats.ts` — Kauf-Statistiken
- `usePurchaseLog.ts` — Einkaufs-Historie

### Components (19)
- Layout: `PageLayout`, `PageHeader`, `BottomNav`, `Header` (unused)
- Recipes: `RecipeCard`, `RecipeList`, `RecipeDetail`, `SpinWheel`
- Offers: `OfferCard`, `OfferList`, `OfferCategory`
- Shopping: `ShoppingList`, `ShoppingItem`
- Weekly: `RecipePicker`
- Profile: `ProfileSettings`, `SavedRecipesSection`, `PurchaseHistory`, `StatsHeader`, `WatchlistSection`
- UI: `Portal`, `Skeleton`

### Lib (8)
- `supabase.ts` — Client init
- `queryClient.ts` — TanStack Query config
- `mealConfig.ts` — Mahlzeit-Konfiguration
- `categoryEmojis.ts` — Kategorie → Emoji Mapping
- `categoryMapping.ts` — Zutat- → Angebots-Kategorie Mapping (NEU)
- `categoryMatching.ts` — Alter Kategorie-Check (UNUSED)
- `offerCategoryConfig.ts` — Angebots-Kategorie Reihenfolge
- `offerMatching.ts` — Zutat-zu-Angebot Matching Engine (NEU)
- `weekNumber.ts` — ISO Kalenderwoche

### Store (1)
- `useAppStore.ts` — Session, Profile, ActiveTab

### Types (2)
- `database.types.ts` — Auto-generated Supabase Types
- `app.types.ts` — Custom App Types

---

## Nächste Schritte (priorisiert)

### P0 — Kritisch für Nutzbarkeit

1. **Automatische Angebots-Pipeline aufbauen** — Ohne regelmäßig aktualisierte Angebote ist die Kernfunktion der App (Sparen durch Angebote) nicht nutzbar. scraped_this_week und products-Tabelle deuten auf ein geplantes System hin. Scraping/API für die 8 Märkte implementieren.

2. **matching_log in offerMatching.ts integrieren** — Logging-Aufrufe fehlen noch. Ohne Logs kann die Matching-Qualität nicht gemessen werden.

3. **Tote Dateien aufräumen** — `categoryMatching.ts` und `Header.tsx` löschen.

### P1 — Wichtig für Nutzererfahrung

4. **Error-Handling verbessern** — Bei fehlgeschlagenen Queries Fehlermeldung statt leere Liste anzeigen. Retry-Button anbieten.

5. **Rezept-Erstellungs-UI** — custom_recipes Tabelle existiert bereits, aber kein Formular zum Erstellen eigener Rezepte.

6. **Preishistorie aktivieren** — price_history befüllen wenn Angebote geladen werden. Graph-UI für Preisverlauf pro Produkt.

7. **Angebots-Bilder im UI anzeigen** — offers.image_url ist vorhanden aber wird nicht dargestellt.

8. **Passwort vergessen / Reset** — Standard-Auth-Feature fehlt.

### P2 — Nice to Have

9. **Pagination / Infinite Scroll** — Für Rezepte und Angebote bei wachsender Datenmenge.

10. **Onboarding für Körperdaten** — Felder existieren in DB (gender, age, weight, height, activity, goal). Eigener Onboarding-Step oder Profil-Sektion.

11. **Drag & Drop im Wochenplan** — Rezepte zwischen Slots verschieben.

12. **PWA / Offline-Support** — Service Worker für Offline-Nutzung beim Einkaufen.

13. **Edge Functions absichern** — verify_jwt auf true setzen, Rate-Limiting.

14. **Rezeptkosten dynamisch berechnen** — Statt statisches `recipes.cost` die tatsächlichen Zutat-Preise und aktuelle Angebote nutzen.

15. **Dark Mode** — Aktuell nur Light Mode.
