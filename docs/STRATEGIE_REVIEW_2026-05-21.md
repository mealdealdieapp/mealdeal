# MealDeal — Strategisches Review

**Datum:** 2026-05-21
**Erstellt:** Cowork-Session mit Jo
**Zweck:** Einmal sauber draufschauen, bevor weitergebaut wird — Ist-Zustand,
strukturelle Probleme, Luecken zum 100.000-Nutzer-Ziel, Aufraeum-Bedarf,
rechtliche Punkte und eine neu priorisierte Roadmap.
**Grundlage:** Drei parallele Tiefen-Analysen der Codebasis (Feature-Audit,
Code-Gesundheit, Matching/Datenschicht) plus rechtliche Einordnung.

---

## Kernbotschaft

Die App ist **weiter, als man denkt** — fast alle Kern-Features existieren und
funktionieren im Grundsatz. Das eigentliche Problem ist nicht "es fehlt viel",
sondern **drei strukturelle Baustellen**, die den 100.000-Nutzer-Launch
verhindern:

1. **Es gibt drei konkurrierende Matching-Systeme**, die unterschiedliche
   Ergebnisse liefern. Das Herzstueck der App ist uneinheitlich.
2. **Angebote werden im Browser jedes Nutzers gescraped** — das funktioniert bei
   50 Nutzern, bei 100.000 fuehrt es zu Sperren durch Marktguru und langsamer App.
3. **Das Geschaeftsmodell existiert im Code nicht** — kein Premium, kein Stripe,
   keine Paywall. Das Freemium-Modell ist bisher nur ein Plan.

Dazu kommt: **278 MB Altlasten** im Repo, **keine Tests**, **kein
Fehler-Monitoring**, und eine **veraltete Typ-Datei**, die Typsicherheit nur
vortaeuscht.

Die gute Nachricht: Nichts davon ist ein Neuanfang. Es ist Konsolidierung —
Doppeltes zusammenfuehren, server-seitig statt browser-seitig, und das
Geschaeftsmodell nachruesten.

**Empfehlung:** Bevor weitere Features (Push, Barcode, Family-Sharing) gebaut
werden, sollten die drei Baustellen geschlossen werden. Sonst baut jedes neue
Feature auf wackeligem Fundament.

---

## Teil A — Werkzeuge, die uns sofort schneller machen

Du hast gefragt, ob es schnelle Hebel fuers Arbeiten gibt. Ja, drei konkrete:

**1. Supabase-Connector anbinden (groesster Hebel).**
Aktuell bin ich gegenueber deiner Live-Datenbank "blind". Ich musste mehrfach
raten, weil ich die echte Datenbank nicht sehen kann: Wie viele
Angebote/Rezepte sind wirklich drin? Welche Tabellen existieren? Die Typ-Datei
im Code ist veraltet. Mit dem Supabase-Connector koennte ich die DB direkt
abfragen, Migrationen ausfuehren, die Typ-Datei aktuell halten und Daten
verifizieren — statt SQL-Dateien zu schreiben, die du manuell einspielst. Das
spart bei fast jeder Aufgabe Zeit. (Vorschlag erscheint oben im Chat.)

**2. Sentry-Connector fuer Fehler-Monitoring.**
Die App hat aktuell kein Fehler-Monitoring. Bei 100.000 Nutzern heisst das:
Wenn etwas kaputtgeht, erfaehrst du es nur, wenn jemand sich beschwert. Sentry
meldet Abstuerze automatisch. Der Connector erlaubt mir, Fehler direkt
einzusehen und zu beheben.

**3. Parallele Analyse-Agenten — schon genutzt.**
Dieses Review ist mit drei parallel arbeitenden Sub-Agenten entstanden, die
gleichzeitig verschiedene Teile der Codebasis durchleuchtet haben. Das nutze ich
ab jetzt fuer grosse Aufgaben standardmaessig.

Eine vierte Sache, kein Werkzeug, aber wichtig: In dieser Umgebung gibt es ein
wiederkehrendes Problem, dass grosse Datei-Speicherungen am Ende abgeschnitten
werden. Ich habe einen verlaesslichen Workaround (Schreiben ueber die Shell plus
Pruefung danach) und wende ihn konsequent an.

---

## Teil B — Was schon funktioniert (Ist-Zustand)

Damit klar ist, worauf wir aufbauen — diese Features sind vorhanden und im
Grundsatz funktionsfaehig:

- **Angebote** nach PLZ + Maerkten gefiltert, mit Kategorien, Diaet-Filter,
  Top-Deals, Suche
- **Rezepte-Browsing** mit Mahlzeit-Gruppen, Filtern, "Ueberrasch mich"-Rad
- **Rezept-Detail** mit Portionsrechner, Naehrwerten, Angebots-Anzeige pro Zutat
- **Einkaufsliste** — stark: nach Markt gruppiert, in Lauf-Reihenfolge sortiert,
  Markt-Strategie-Empfehlung, Abschluss mit Verlauf
- **Wochenplan** inkl. Generierungs-Algorithmus (kalorienbasiert, mit
  2000-kcal-Standardwert)
- **Eigene Rezepte erstellen** mit Foto-Upload
- **Watchlist** (Grundfunktion)
- **Onboarding** (5 Schritte: PLZ, Maerkte, Diaeten, Praeferenzen)
- **Auth** komplett: E-Mail, Google-Login, Passwort-Reset, Datenexport

Das ist eine solide Basis. Es geht im Folgenden nicht um Wegwerfen, sondern um
Festigen.

---

## Teil C — Die drei strukturellen Grossbaustellen

### C1 — Drei Matching-Systeme statt einem

Das Verbinden von Angeboten und Rezepten ist euer Kern-Feature. Aktuell gibt es
dafuer **drei verschiedene Systeme** im Code:

1. **Browser-Matching** (`offerMatching.ts`, ~980 Zeilen handgepflegte Regeln) —
   laeuft beim Nutzer im Browser, wird auf der Rezeptseite genutzt.
2. **Scraper-Matching** (`scraperMatching.ts`) — laeuft beim Scrapen, fuellt die
   Tabelle `offer_ingredient_matches`, wird in der Angebote-Liste genutzt.
3. **KI-/Embedding-Matching** ("Product-Brain") — komplett gebaut, laeuft nachts,
   fuellt die Tabelle `product_ingredient_matches` — **wird aber von der App nie
   gelesen.** Totes Kapital.

**Das Problem:** Dieselbe Zutat bekommt je nach System ein anderes Ergebnis. Ein
Nutzer sieht in der Angebotsliste andere passende Rezepte als auf der
Rezeptseite. Das ist nicht wartbar und nicht vertrauenswuerdig — und genau das
Feature, das perfekt sein muss.

**Empfehlung:** Auf **ein** System festlegen. Das KI-/Embedding-System ist
technisch das beste (es lernt, statt 450 Zeilen Stichwoerter von Hand zu pflegen
— was uebrigens gegen eure eigene Regel "niemals Daten hardcoden" verstoesst). Es
muss nur noch mit der App verdrahtet werden. Die beiden anderen dann abschalten.

### C2 — Scraping im Browser skaliert nicht

Aktuell ruft **jeder Nutzer-Browser selbst** die Marktguru-Daten ab. Bei wenigen
Nutzern geht das. Bei 100.000:

- Marktguru sieht tausende Abrufe und sperrt vermutlich die IP / drosselt.
- Die Begrenzung ("nur alle 6 Stunden scrapen") liegt im Browser-Speicher —
  jeder neue Browser umgeht sie.
- Zusaetzlich laedt die App **bis zu 5000 Angebote** in den Browser und filtert
  alles dort. Auf schwaecheren Handys ruckelt das.

**Empfehlung:** Datenabruf gehoert auf **einen zentralen Server-Job** (existiert
als GitHub-Workflow bereits — `weekly-scrape.yml`). Die Nutzer-App ruft dann nur
noch fertige Daten ab. Das passt auch perfekt zu deinem Ziel "alle Angebote der
kommenden Woche zum Sonntag" — ein Sonntags-Cronjob, eine Datenquelle, alle
Nutzer bekommen dasselbe.

### C3 — Das Geschaeftsmodell fehlt im Code

Im Businessplan steht Freemium + Premium + Stripe. Im Code: **nichts davon.**
Keine Paywall, kein Stripe, kein Premium-Check. Die Wochenplan-Generierung —
laut Plan ein Premium-Feature — ist fuer jeden frei.

**Empfehlung:** Das Premium-Geruest (Stripe-Anbindung, Premium-Status am Profil,
Paywall vor den Premium-Features) ist eine eigene, klar abgegrenzte Aufgabe. Sie
muss vor dem Launch stehen, sonst verschenkst du ab Tag 1 Umsatz — und
Nachruesten bei 100.000 Nutzern ist heikler als sauberes Einbauen vorher.

---

## Teil D — Feature-Luecken zum 100.000-Nutzer-Ziel

Gemessen an deiner Kern-Feature-Liste:

| Feature | Stand | Luecke |
|---|---|---|
| Aktuelle Angebote (woechentlich, Sonntag) | Teilweise | Laeuft im Browser statt als Server-Job; kein fester Sonntags-Rhythmus |
| Rezepte + Vielfalt | Solide Basis | 211 Rezepte in der DB (verifiziert 2026-05-21) — fuer den Start ausreichend, siehe Nachtrag |
| Produktbilder lecker und passend | Teilweise | ~28 kaputte Bilder; keine echte Bildoptimierung (grosse Downloads) |
| Mengen und Preise korrekt | Teilweise | Keine Einheiten-Umrechnung — "1 kg Angebot" fuer "200 g Bedarf" verfaelscht Ersparnis |
| Wochenplan-Generierung (Premium) | Funktioniert | Kein Premium-Gating; Kalorien-Feinkorrektur ist ein leerer Platzhalter |
| Einkaufszettel-Optimierung | Gut | Optimiert nicht echt ueber Maerkte (kein Preisvergleich pro Artikel) |
| Geteilter Einkaufszettel mit Partnern | Fehlt komplett | Kompletter Neubau (DB, Rechte, UI) |
| Eigene Rezepterstellung | Funktioniert | Kein Bearbeiten; eigene Rezepte ohne Diaet-Feld; nicht im Wochenplan |
| Watchlist | Halbfertig | "Preisalarm" wird versprochen, aber es gibt keine Benachrichtigung |
| Push-Benachrichtigungen | Fehlt komplett | Kein Service Worker, keine Web-Push-Anbindung |
| Matching (Grundlage von allem) | Uneinheitlich | Siehe C1 — drei Systeme |

Kurz: Das meiste ist da, aber **selten "fertig fuer 100.000"**. Die groessten
echten Luecken sind geteilter Einkaufszettel und Push — beides Neubau.

---

## Teil E — Aufraeumen: Altlasten und toter Code

Bevor neu gebaut wird, sollte aufgeraeumt werden — das macht alles Weitere
schneller und sicherer:

**Grosse Altlasten (sofort entfernbar):**
- `_archiv/` — **278 MB**, davon 275 MB alte Prospekt-PDFs (eine REWE-PDF allein
  104 MB). Liegt komplett im Repo und in der Git-Historie.
- `MealDeal/` — das **alte React-Native-Projekt** (Vorgaenger der Web-App), 91
  Dateien. Enthaelt veraltete Kopien von Logik-Dateien, die still
  auseinanderdriften, sowie Geschaeftsdokumente (Gesellschaftervertrag,
  Kalkulation) — die gehoeren gesichert, aber nicht ins Code-Repo.

Beides per `git rm` raus → das Repo schrumpft von ~280 MB auf ~6 MB
Arbeitsdateien.

**Toter Code (ungenutzt, kann weg):**
- `OfferCategory.tsx`, `ShoppingList.tsx` — nirgends eingebunden
- `useOfferRecipes.ts` (alte Matching-Version 1) — wird in der laufenden App nie
  erreicht
- Doppelt gepflegte Scraper-Dateien (`src/lib/` vs `scripts/`) — bereits
  auseinandergelaufen, sollten eine Quelle werden
- `useMarketLayout.ts` (heute von mir angelegt) ist aktuell ungenutzt — die
  Markt-Sortierung laeuft direkt in `useShopping.ts`. Entweder als
  DB-Override-Mechanismus einbinden oder entfernen.

---

## Teil F — Tech-Stack und Qualitaet fuer 100.000 Nutzer

Der Stack selbst (React 19, Vite, Supabase, Vercel) ist fuer 100.000 Nutzer
**grundsaetzlich tragfaehig** — kein Technologiewechsel noetig. Aber vier
Qualitaets-Luecken sind echtes Risiko:

- **Keine Tests.** Null automatische Tests im gesamten Projekt. Bei einer
  ~980-Zeilen-Matching-Logik ist jeder Umbau ein Blindflug. Mindestens die
  Matching- und Mengen-Funktionen brauchen Tests, bevor sie umgebaut werden.
- **Kein Fehler-Monitoring.** Siehe Teil A (Sentry).
- **Veraltete Typ-Datei** (`database.types.ts`). Sie beschreibt die Datenbank
  falsch; mehrere Stellen umgehen das mit Tricks (`as any`). Damit ist die
  Typsicherheit, die TypeScript geben soll, an genau den kritischen Stellen
  ausgehebelt. Muss aus der echten DB neu erzeugt werden (geht mit dem
  Supabase-Connector automatisch).
- **Performance:** Code-Splitting und Bild-Optimierung fehlen — beeinflusst
  Ladezeit, gerade auf Handys.

Keine dieser Sachen ist dramatisch — aber alle vier sollten vor dem Skalieren
erledigt sein.

---

## Teil G — Rechtliche Punkte: VOR dem Weiterbauen klaeren

Du wolltest die rechtlichen Punkte vorab. Wichtig: Ich bin kein Anwalt — das
hier ist eine Risiko-Landkarte, kein Rechtsrat. Ein Anwaltstermin steht in
Woche 10; **mindestens Punkt 1 sollte deutlich frueher geklaert werden**, weil
er das ganze Produkt betrifft.

**1. Marktguru-Daten — das groesste rechtliche Risiko.**
Die App ruft aktuell die inoffizielle Marktguru-Schnittstelle ab und nutzt deren
Angebotsdaten kommerziell. Fremde Datenbanken kommerziell zu verwerten kann
Datenbankrechte und Nutzungsbedingungen verletzen (Abmahnrisiko). Die
**offizielle API mit Vertrag** wuerde das sauber loesen. Solange dieser Vertrag
nicht steht, baut das ganze Produkt auf unsicherem Grund. → Mit deinem
Marktguru-Kontakt klaeren, schriftlich.

**2. Supermarkt-Namen und Logos.** Namen wie "REWE" zur Kennzeichnung eines
Angebots zu nennen ist meist zulaessig (nominative Nennung). Logos einzubinden
ist heikler — sparsam und ohne Verwechslungsgefahr.

**3. Preis-Haftung.** Die App zeigt Preise, die falsch oder veraltet sein
koennen. Es braucht einen klaren Hinweis "Alle Angaben ohne Gewaehr, Preise
koennen in der Filiale abweichen" — sonst drohen Haftung und Wettbewerbsrecht.

**4. Datenschutz (DSGVO).** Die Datenschutzerklaerung muss u.a. abdecken:
Supabase als Auftragsverarbeiter (AV-Vertrag), Vercel-Hosting (US-Bezug), die
KI-Anreicherung ueber Google/OpenAI (US-Datenuebermittlung), Google-Login.
**Besonders sensibel:** Gewicht, Aktivitaet und Kalorienbedarf fuer den
Wochenplan sind gesundheitsnahe Daten — die brauchen erhoehte Sorgfalt und eine
ausdrueckliche Einwilligung.

**5. Konto-Loeschung.** Aktuell loescht die "Konto loeschen"-Funktion nur
Datenbank-Zeilen, **nicht den eigentlichen Login-Account**. Das ist eine
DSGVO-Luecke (Recht auf Loeschung) und sollte vor Launch geschlossen werden.

**6. Premium / Stripe — Verbraucherrecht.** Sobald es zahlpflichtige Abos gibt:
Widerrufsrecht fuer digitale Abos, gesetzlich vorgeschriebener
"Kuendigungs-Button", korrekt beschrifteter Bestell-Button ("zahlungspflichtig
bestellen"), klare Preisangabe.

**7. AGB und Impressum.** Impressum existiert — fuer eine UG auf Vollstaendigkeit
pruefen (Handelsregister, Geschaeftsfuehrer). AGB werden spaetestens fuers
Premium-Abo gebraucht.

**8. Barrierefreiheit (BFSG).** Seit 28.06.2025 gilt das
Barrierefreiheitsstaerkungsgesetz fuer viele digitale Verbraucher-Dienste. Es
gibt eine Ausnahme fuer Kleinstunternehmen — ob sie greift, sollte der Anwalt
klaeren. Unabhaengig davon: barrierearm zu bauen ist ohnehin gut.

**9. Nutzer-Inhalte (eigene/geteilte Rezepte).** Sobald Nutzer Inhalte erstellen
und teilen: Melde-/Loesch-Mechanismus, AGB-Klausel zur Nutzungslizenz,
Moderation.

**10. Cookie-/Push-Einwilligung.** Fuer nicht-essenzielle Cookies/Tracking ein
Consent-Banner; fuer Push eine dokumentierte Einwilligung.

**11. Gesundheits-Aussagen.** Bereits separat geprueft (Heilversprechen-Audit,
2026-05-20: App-Texte sauber, eine DB-Pruefung offen). Beim Wochenplan
zusaetzlich klarstellen, dass es keine medizinische/Ernaehrungsberatung ist.

---

## Teil H — Neu priorisierte Roadmap

Vorschlag, in dieser Reihenfolge — Fundament zuerst, dann Features:

**Phase 0 — Klaeren und Aufraeumen (jetzt, ~1 Woche)**
- Marktguru-Lizenz/API schriftlich klaeren (rechtliche Grundlage)
- Supabase- und Sentry-Connector anbinden
- `_archiv/` und `MealDeal/` aus dem Repo entfernen
- `database.types.ts` aus der echten DB neu erzeugen
- Git-Lock-Problem aufloesen, Sprint-Woche-1-Code committen

**Phase 1 — Fundament festigen (~2-3 Wochen)**
- Auf EIN Matching-System konsolidieren (server-seitig, KI-/Embedding-basiert)
- Scraping auf zentralen Server-Job umstellen (Sonntags-Rhythmus)
- App laedt keine 5000 Angebote mehr in den Browser
- Tests fuer Matching + Mengen-Logik
- Einheiten-Umrechnung beim Matching (korrekte Ersparnis-Betraege)

**Phase 2 — Geschaeftsmodell (~1-2 Wochen)**
- Stripe-Anbindung, Premium-Status, Paywall vor Premium-Features
- Konto-Loeschung DSGVO-konform vervollstaendigen

**Phase 3 — Fehlende Kern-Features (~3-4 Wochen)**
- Push-Benachrichtigungen (Fundament fuer echte Preisalarme)
- Watchlist mit echtem Alarm fertigstellen
- Geteilter Einkaufszettel
- Mehr Rezepte + bessere Bild-Qualitaet

**Phase 4 — Launch-Vorbereitung**
- Rechtliche Texte final (mit Anwalt)
- Closed Beta → Open Beta

Das verschiebt den Fokus gegenueber dem bisherigen Masterplan: **erst Fundament
und Geschaeftsmodell, dann die Zusatz-Features** (Barcode-Scanner,
Family-Sharing koennen spaeter). Der Grund: Push, Barcode und Sharing auf drei
uneinheitliche Matching-Systeme und Browser-Scraping zu setzen, wuerde die
Probleme nur vergroessern.

---

## Naechster Schritt

Mein Vorschlag: Wir starten mit **Phase 0**. Das meiste davon kann ich autonom
(Aufraeumen, Typ-Datei), bei der Marktguru-Klaerung und den
Connector-Anbindungen brauche ich dich. Sag mir, ob die Priorisierung fuer dich
passt oder wo du sie anders setzen wuerdest.

---

## Nachtrag — Verifizierte Ist-Zahlen (2026-05-21)

Nach Anbindung des Supabase-Connectors konnten die Schaetzungen oben durch echte
Zahlen aus der Produktiv-Datenbank (`AngebotsKoch`, `wjhesvkapqrsbibqjbtr`)
ersetzt werden:

| Bereich | Verifizierte Zahl |
|---|---|
| Rezepte (oeffentlich) | 211 |
| Rezept-Zutaten-Verknuepfungen | 1.107 |
| Zutaten (ingredients) | 178 — alle Verknuepfungen aufloesbar, keine Datenluecke |
| Angebote gesamt | 9.043 |
| Angebote aktuell gueltig | 2.233 |
| Produkte (KI-angereichert) | 1.079 |
| Alte Produkt-Tabelle (products_legacy_unused) | 3.365 — toter Ballast, kann weg |
| offer_ingredient_matches | 2.810 (deckt 148 von 178 Zutaten ab) |
| product_ingredient_matches | 782 |
| Registrierte Nutzer | 9 (Vor-Launch) |
| Eigene Nutzer-Rezepte | 0 |

**Wichtigste Korrektur zu Teil D:** Die App hat **211 Rezepte**, nicht ~28 wie in
einer alten Notiz vermutet. Die Rezept-Vielfalt ist fuer den Start solide — das
war kein echtes Launch-Risiko. Mehr Vielfalt schadet nie, ist aber nicht
dringend.

**Bestaetigt:**
- Die RPC `match_offers_for_recipe` existiert wirklich — die heutige
  Phase-1.3-Arbeit (`useMatchedOffers`) steht auf festem Grund.
- Die Datenintegritaet stimmt: alle Rezept-Zutaten verweisen auf existierende
  Zutaten.
- Beide Matching-Tabellen sind befuellt — das KI-Matching (Pipeline C) hat
  bereits 782 Eintraege, wird aber weiterhin vom Frontend nicht gelesen
  (Befund C1 bleibt gueltig).

**Kleinere neue Befunde:**
- Von 178 Zutaten haben 30 keinen einzigen Angebots-Treffer in
  `offer_ingredient_matches` — diese Zutaten finden in Rezepten nie ein Angebot.
- `products_legacy_unused` (3.365 Zeilen) ist eine alte, tote Tabelle und gehoert
  auf die Aufraeum-Liste (Teil E).

Anmerkung am Rande: Die Zeilen-Statistik der Datenbank war teils veraltet (zeigte
`ingredients` und `plz_regions` faelschlich mit 0 Zeilen). Erst eine echte
Zaehlung brachte die korrekten Werte — Nachpruefen lohnt sich.
