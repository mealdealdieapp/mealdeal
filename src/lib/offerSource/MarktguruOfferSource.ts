/**
 * MarktguruOfferSource
 *
 * Stub-Implementierung für die offizielle Marktguru-API. Wird aktiv, sobald
 * der Alpha-Zugang von Maximilian K. (Marktguru) verfügbar ist und der
 * API-Key in der ENV `VITE_MARKTGURU_API_KEY` (Frontend) bzw. den
 * Edge-Function-Secrets (Backend) hinterlegt ist.
 *
 * Hinweis: Die produktive Implementierung sollte den Marktguru-Call in eine
 * Vercel-Edge-Function oder Supabase-Edge-Function verlagern, damit der Key
 * nicht im Browser landet. Diese Klasse hier ist der CLIENT-seitige Wrapper,
 * der dann den eigenen Backend-Endpoint aufruft.
 *
 * TODO (Sprint nach API-Erhalt):
 *  - Endpoints definieren (search, product, offers-by-plz)
 *  - Mapping Marktguru-Response → unsere `offers`-Tabelle (GS1-Kategorien!)
 *  - Idempotenz absichern (upsert auf canonical_key)
 *  - Pre-Matching analog zu ScraperOfferSource übernehmen
 */

import type { IOfferSource, ScrapeResult } from './IOfferSource'

const NOT_IMPLEMENTED: ScrapeResult = {
  count: 0,
  error: 'MarktguruOfferSource: API-Anbindung steht noch aus (kein Key)',
}

export class MarktguruOfferSource implements IOfferSource {
  readonly name = 'marktguru-api'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async hasOffersForPlz(_plz: string): Promise<boolean> {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getOfferCountForPlz(_plz: string): Promise<number> {
    return 0
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async scrapeOffersForPlz(_plz: string, _markets: string[]): Promise<ScrapeResult> {
    return NOT_IMPLEMENTED
  }
}
