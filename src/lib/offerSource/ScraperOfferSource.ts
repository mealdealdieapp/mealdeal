/**
 * ScraperOfferSource
 *
 * Aktive Implementierung von IOfferSource. Wickelt die bestehenden
 * Funktionen aus `src/lib/marktguruScraper.ts` ein, ohne deren Verhalten
 * zu verändern. Der Scraper bleibt bis zur Marktguru-API-Umstellung
 * unsere produktive Datenquelle.
 *
 * Verhalten dokumentiert in IOfferSource.ts.
 */

import {
  hasOffersForPlz as scraperHasOffersForPlz,
  getOfferCountForPlz as scraperGetOfferCountForPlz,
  scrapeOffersForPlz as scraperScrapeOffersForPlz,
} from '../marktguruScraper'
import type { IOfferSource, ScrapeResult } from './IOfferSource'

export class ScraperOfferSource implements IOfferSource {
  readonly name = 'scraper'

  hasOffersForPlz(plz: string): Promise<boolean> {
    return scraperHasOffersForPlz(plz)
  }

  getOfferCountForPlz(plz: string): Promise<number> {
    return scraperGetOfferCountForPlz(plz)
  }

  scrapeOffersForPlz(plz: string, markets: string[]): Promise<ScrapeResult> {
    return scraperScrapeOffersForPlz(plz, markets)
  }
}
