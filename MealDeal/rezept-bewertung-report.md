# MealDeal Rezept-Bewertung — Report

**Stand:** 17. April 2026 | **Gesamt:** 197 Rezepte

---

## 1. Zusammenfassung

Die aktuelle Rezeptbibliothek enthält 197 Rezepte. Davon sind die meisten echte, bekannte Gerichte — keine KI-Fantasie-Rezepte. Allerdings gibt es strukturelle Probleme, die wir beheben müssen, bevor wir die Bibliothek als Basis nutzen können.

**Gesamtbewertung: 6/10** — Gute Basis, aber Aufräumarbeit nötig.

---

## 2. Kritische Probleme

### 2.1 — 54 Rezepte OHNE Zutaten (27%)
Diese Rezepte existieren nur als Hülle (Name, Kalorien, Steps) aber haben keine Einträge in `recipe_ingredients`. Ohne Zutaten können sie nicht mit Angeboten gematcht werden und sind für das Offer-Matching nutzlos.

**6 davon sind Duplikate** von Rezepten die bereits MIT Zutaten existieren:
- Avocado-Toast (Duplikat von "Avocado Toast")
- Chili-con-Carne-Portionen (Duplikat von "Chili con Carne")
- Energy-Balls aus Nüssen (Duplikat von "Energy Balls")
- Kürbis-Suppe (Duplikat von "Kürbissuppe")
- Linsen-Suppe (Duplikat von "Linsensuppe")
- Vanille-Panna-Cotta (Duplikat von "Panna Cotta")

**→ Empfehlung:** 6 Duplikate sofort löschen. Die 48 verbleibenden sind echte Gerichte — Zutaten ergänzen oder löschen.

### 2.2 — 99 Rezepte OHNE Kostenangabe (50%)
Die Hälfte der Rezepte hat kein `cost`-Feld. Das ist für eine Spar-App schlecht — Nutzer wollen den Preis sehen.

**→ Empfehlung:** Kosten berechnen lassen aus `recipe_ingredients` × Durchschnittspreis.

### 2.3 — 0 glutenfreie Rezepte
Komplett fehlende Kategorie. Zöliakie betrifft ~1% der Bevölkerung, aber glutenfrei-Essende sind deutlich mehr.

**→ Empfehlung:** Mindestens 15-20 glutenfreie Rezepte ergänzen oder bestehende korrekt taggen (viele sind vermutlich glutenfrei aber nicht getaggt).

---

## 3. Ernährungsabdeckung

| Ernährungsform | Anzahl | Anteil | Bewertung |
|---|---|---|---|
| Vegetarisch | 86 | 44% | ✅ Gut |
| Vegan | 66 | 34% | ✅ Gut |
| Omni (Fleisch) | 52 | 26% | ✅ OK |
| Halal | 42 | 21% | ✅ OK |
| High-Protein | 39 | 20% | ✅ OK |
| Low-Carb | 16 | 8% | ⚠️ Ausbaufähig |
| Glutenfrei | 0 | 0% | ❌ Fehlt komplett |
| Meal-Prep | 8 | 4% | ⚠️ Ausbaufähig |

---

## 4. Mahlzeiten-Verteilung

| Kategorie | Anzahl | Bewertung |
|---|---|---|
| Dinner | 44 | ✅ |
| Lunch | 27 | ✅ |
| Breakfast | 26 | ✅ |
| Snack | 13 | ✅ |
| Dessert | 13 | ✅ |
| Salat | 11 | ✅ |
| Suppe | 10 | ✅ |
| Baking | 9 | ✅ |
| Cocktail | 9 | ⚠️ Fragwürdig |
| Date Night | 9 | ✅ |
| Meal Prep | 8 | ⚠️ Zu wenig |
| Budget | 6 | ⚠️ Zu wenig für Spar-App |
| Quick | 6 | ⚠️ Zu wenig |
| Food Trends | 6 | ✅ |

**Cocktails:** 9 Cocktail-Rezepte (Margarita, Mojito, Negroni, Piña Colada, Hugo Spritz, Erdbeer-Limonade, Mango Lassi, Wassermelonen-Smoothie, Ingwer-Zitronen-Tee). Diese passen nicht zum MealDeal-Konzept (Angebote für Lebensmittel-Einkauf). Cocktails werden kaum mit Supermarkt-Angeboten gematcht.

**→ Empfehlung:** Cocktails behalten aber in "Getränke" umbenennen. Keine neuen hinzufügen. Budget- und Quick-Kategorien ausbauen.

---

## 5. Nährwert-Prüfung

Die meisten Rezepte haben plausible Nährwerte. Nur 2 Auffälligkeiten:

- **Erbsensuppe:** Kalorien angegeben 533, aus Makros berechnet 695 (Differenz +162). → Korrigieren.
- **Negroni:** Kalorien 210, aber Makros ergeben nur 32 kcal. → Alkohol-Kalorien fehlen in Makros (korrekt für Cocktail, Makros können nicht Alkohol abbilden). Kein Problem.
- **Ingwer-Zitronen-Tee:** 40 kcal — realistisch für Tee mit Honig.

**→ Bewertung: 9/10** — Nährwerte sind fast durchgängig plausibel und realistisch.

---

## 6. Rezept-Authentizität

Alle 197 Rezepte sind **echte, bekannte Gerichte**. Keine KI-Fantasie-Rezepte. Beispiele:

**Deutsche Klassiker:** Kartoffelpuffer, Knuspriger Schweinebraten, Schnitzel mit Kartoffelsalat, Maultaschen-Pfanne, Erbsensuppe, Saftiger Hackbraten — ✅ real

**Internationale Klassiker:** Pad Thai, Rotes Thai-Curry, Birria Tacos, Shakshuka, Dal, Bibimbap, Aglio e Olio, Tikka Masala — ✅ real und beliebt

**Frühstück/Snacks:** Açaí Bowl, Baked Oats, Chia-Pudding, Overnight Oats, Energy Balls, Bircher Müsli — ✅ beliebte Trend-Rezepte

**→ Bewertung: 9/10** — Durchweg reale, populäre Rezepte. Keine Ausreißer.

---

## 7. Kosten-Übersicht (für die 98 mit Preis)

- Minimum: 1,50 €
- Maximum: 12,00 €
- Durchschnitt: 3,74 €
- Budget-Rezepte alle ohne Kostenangabe (!)

---

## 8. Empfohlene Aktionen (Priorität)

### Sofort (vor Weekly-Workflow):

1. **6 Duplikate löschen** (Avocado-Toast, Chili-con-Carne-Portionen, Energy-Balls aus Nüssen, Kürbis-Suppe, Linsen-Suppe, Vanille-Panna-Cotta)

2. **48 Rezepte ohne Zutaten:** Zutaten ergänzen für die 48 echten Gerichte — diese sind alle real und gut, ihnen fehlen nur die `recipe_ingredients`-Einträge

3. **Kosten berechnen** für die 99 Rezepte ohne Preis

4. **Diät-Tags korrigieren:** Viele Rezepte sind vermutlich glutenfrei aber nicht so getaggt

### Mittelfristig:

5. **Budget- und Quick-Rezepte ausbauen** (je mindestens 15)
6. **Glutenfreie Rezepte** ergänzen/taggen (Ziel: 20+)
7. **Low-Carb ausbauen** (Ziel: 25+)
8. **Meal-Prep ausbauen** (Ziel: 15+)

---

## 9. Fazit

Die Rezeptbasis ist **solide und authentisch** — das Wichtigste ist erfüllt. Es sind keine schlechten oder unrealistischen Rezepte dabei. Das Hauptproblem ist strukturell: 54 Rezepte ohne Zutaten, 99 ohne Kosten, fehlende Tags. Wenn wir das beheben, haben wir eine starke Basis für das Offer-Matching und den Weekly-Workflow.
