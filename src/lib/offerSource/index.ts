/**
 * offerSource - Barrel-Export + Factory
 *
 * Zentrale Aufloesung der Angebotsquelle. Der Rest der App importiert NUR
 * von hier (`import { getOfferSource } from '../lib/offerSource'`), niemals
 * direkt von den konkreten Klassen. So bleibt der Wechsel Scraper -> API
 * eine Ein-Zeilen-Aenderung (ENV) ohne Anfassen des App-Codes.
 *
 * ENV `VITE_OFFER_SOURCE`:
 *   - 'scraper'   (Default) -> ScraperOfferSource (Marktguru-Scraper)
 *   - 'marktguru'           -> MarktguruOfferSource (offizielle API, Stub)
 */

import type { IOfferSource } from './IOfferSource'
import { ScraperOfferSource } from './ScraperOfferSource'
import { MarktguruOfferSource } from './MarktguruOfferSource'
import { logger } from '../logger'

export type { IOfferSource, ScrapeResult } from './IOfferSource'
export { ScraperOfferSource } from './ScraperOfferSource'
export { MarktguruOfferSource } from './MarktguruOfferSource'

let cached: IOfferSource | null = null

/**
 * Liefert die aktive Angebotsquelle (Singleton pro Session).
 * Die konkrete Implementierung wird einmalig anhand der ENV bestimmt.
 */
export function getOfferSource(): IOfferSource {
  if (cached) return cached

  const configured = String(
    import.meta.env.VITE_OFFER_SOURCE ?? 'scraper',
  ).toLowerCase()

  cached =
    configured === 'marktguru'
      ? new MarktguruOfferSource()
      : new ScraperOfferSource()

  logger.log('[offerSource] aktive Quelle:', cached.name)
  return cached
}

/** Nur fuer Tests: Cache leeren, damit die ENV neu ausgewertet wird. */
export function resetOfferSourceCache(): void {
  cached = null
}
