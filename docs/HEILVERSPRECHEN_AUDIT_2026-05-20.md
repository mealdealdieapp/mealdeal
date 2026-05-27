# Heilversprechen-Audit MealDeal

**Datum:** 2026-05-20
**Geprueft von:** Automatisierter Code-Audit (Sprint Woche 1)
**Bezug:** Release-Master-Plan Q2/Q3, Abschnitt 2.9 (HWG / EU-Health-Claims-VO 1924/2006)
**Status:** App-Texte sauber - eine offene DB-Pruefung verbleibt

---

## 1. Ziel

Vor der Beta darf die App keine unzulaessigen gesundheits- oder
krankheitsbezogenen Aussagen ("Heilversprechen") enthalten. Verboten sind
insbesondere Aussagen, die der App eine heilende, lindernde oder
schlankmachende Wirkung zuschreiben.

| Nicht erlaubt | Erlaubt (Geld-/Ziel-Framing) |
|---|---|
| "MealDeal hilft dir abzunehmen" | "Plane Mahlzeiten passend zu deinen Zielen" |
| "Gesund werden mit MealDeal" | "Behalte deinen Kalorienverbrauch im Blick" |
| "Heilt / lindert [Krankheit]" | "Spare bis zu X EUR pro Einkauf" |

---

## 2. Pruefumfang

Durchsucht wurden alle benutzersichtbaren Texte des Live-Web-App-Codes
(`mealdeal-web/src/`, `index.html`, `public/manifest.json`) gegen einen
Begriffskatalog: heil*, lindert, krankheit, abnehm*, schlank, di[ae]t,
fettverbrennung, gesund*, immunsystem, entgift*, detox, stoffwechsel,
anti-aging, "staerkt", wohlbefinden, vital.

---

## 3. Ergebnis

### 3.1 App-Slogans & Meta-Texte - SAUBER

- `index.html`: "MealDeal - Spare beim Kochen mit den besten Supermarkt-Angeboten."
- `manifest.json`: "Finde die besten Supermarkt-Angebote und spare beim Kochen."

Beide Slogans sind rein auf die Geldersparnis bezogen - exakt das
zulaessige Framing. Kein Handlungsbedarf.

### 3.2 UI-Komponenten - SAUBER

Einziger Treffer: Ziel-Auswahl in `CalorieSettings.tsx`
("Abnehmen / Halten / Zunehmen"). Das ist ein vom Nutzer gewaehltes
**persoenliches Ziel**, kein Wirkversprechen der App - zulaessig
(entspricht "passend zu deinen Zielen"). Kein Handlungsbedarf.

### 3.3 Legacy-/Archiv-Daten - GERINGES RISIKO

In Alt-Datenbestaenden (nicht Teil der Live-App) gefunden:

- `MealDeal/app/data/rezepte_basis.json` und `MealDeal/data/recipes/rezepte_basis.json`
  - "Gesunde Buddha Bowl mit Mozzarella"
  - "Gesundes Fischgericht mit Gemuese"

Diese Dateien gehoeren zum alten Native-App-Projekt bzw. zu Seed-Daten und
werden von der Live-Web-App nicht geladen (Rezepte kommen aus Supabase).
Relevant nur, falls die Supabase-`recipes`-Tabelle aus genau diesen Daten
befuellt wurde - siehe Abschnitt 4.

Hinweis: Ein blosses "gesund" ist kein HWG-Heilversprechen (HWG betrifft
Krankheitsbezug), aber eine **unspezifische gesundheitsbezogene Angabe**
nach EU-VO 1924/2006 und damit nur zulaessig in Verbindung mit einer
zugelassenen Detailangabe. Empfehlung: in Rezeptnamen/-beschreibungen
neutral formulieren ("Bunte Buddha Bowl" statt "Gesunde Buddha Bowl").

---

## 4. OFFEN: Datenbank-Inhalte pruefen

Die Rezeptinhalte der Live-App liegen in der Supabase-Tabelle `recipes`
(Felder `name`, `steps`) und konnten per Code-Audit nicht geprueft werden.
**Das ist der wichtigste verbleibende Schritt.**

Folgende Abfrage im Supabase SQL-Editor ausfuehren
(Projekt `wjhesvkapqrsbibqjbtr`):

```sql
SELECT id, name
FROM recipes
WHERE name ~* 'detox|schlank|abnehm|gesund|heil|entgift|immun|stoffwechsel|fettverbrenn|vital|di[aae]t|figur|fit|anti.?aging|wohlbefinden';
```

Treffer im Feld `name` pruefen und ggf. neutral umbenennen. Falls Rezepte
zusaetzlich Freitext-Beschreibungen haben, diese analog pruefen.

---

## 5. Fazit

Die App-eigenen Marketing- und UI-Texte sind frei von Heilversprechen und
folgen dem zulaessigen Geld-/Ziel-Framing. Vor dem Public Launch ist nur
noch die DB-Abfrage aus Abschnitt 4 abzuarbeiten und das Ergebnis dem
Anwalt im Woche-10-Termin vorzulegen.
