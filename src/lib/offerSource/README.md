# offerSource - Adapter-Layer fuer Angebotsdaten

Dieser Ordner kapselt, WOHER Angebote kommen. Die App spricht nie direkt
mit dem Scraper oder einer API, sondern immer ueber das Interface
`IOfferSource`.

## Dateien

- `IOfferSource.ts` - Interface + Typen (`ScrapeResult`)
- `ScraperOfferSource.ts` - aktive Implementierung (Marktguru-Scraper)
- `MarktguruOfferSource.ts` - Stub fuer die offizielle Marktguru-API
- `index.ts` - Barrel-Export + `getOfferSource()` Factory

## Nutzung

```ts
import { getOfferSource } from '../lib/offerSource'

const source = getOfferSource()
await source.scrapeOffersForPlz('10115', ['REWE', 'ALDI'])
```

## Quelle umschalten

Per ENV `VITE_OFFER_SOURCE`:

- `scraper` (Default) - bestehender Marktguru-Scraper
- `marktguru` - offizielle API (sobald Alpha-Key vorhanden)

Beim Wechsel auf `marktguru` muss nur die ENV gesetzt werden - kein
App-Code aendert sich.
