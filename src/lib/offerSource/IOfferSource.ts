/**
 * IOfferSource — Adapter-Interface für Angebotsdaten
 *
 * Ziel: Die App spricht NIEMALS direkt mit einer konkreten Datenquelle
 * (Marktguru-Scraper, Marktguru-API, andere). Stattdessen geht alles über
 * dieses Interface. Wenn der Marktguru-API-Key kommt, tauschen wir nur die
 * Implementierung aus — der Rest der App merkt davon nichts.
 *
 * Erste Implementierung: ScraperOfferSource (wickelt den existierenden
 *   Marktguru-Scraper).
 * Geplant: MarktguruOfferSource (offizielle API, sobald Alpha-Zugang da ist).
 *
 * Auflösung der konkreten Implementierung erfolgt zur Laufzeit über
 * `getOfferSource()` in ./index.ts anhand der ENV `VITE_OFFER_SOURCE`.
 */

export interface ScrapeResult {
  /** Anzahl der für die PLZ aktuell verfügbaren Angebote nach dem Scrape */
  count: number
  /** Fehlertext, wenn der Scrape fehlgeschlagen ist */
  error?: string
}

export interface IOfferSource {
  /** Name der Implementierung, nur für Logging/Monitoring */
  readonly name: string

  /**
   * Prüft, ob für die gegebene PLZ aktuell genügend gültige Angebote
   * vorhanden sind, sodass kein Re-Scrape nötig ist.
   */
  hasOffersForPlz(plz: string): Promise<boolean>

  /** Anzahl gültiger Angebote für die PLZ (heute oder später ablaufend) */
  getOfferCountForPlz(plz: string): Promise<number>

  /**
   * Holt Angebote für die PLZ und die ausgewählten Märkte und schreibt sie
   * in die `offers`-Tabelle. Implementierungen sollen idempotent sein:
   * mehrfaches Aufrufen darf keine Duplikate erzeugen.
   *
   * Wichtig: Implementierungen müssen ihr eigenes Rate-Limiting durchsetzen
   * (siehe ScraperOfferSource für das Referenz-Verhalten).
   */
  scrapeOffersForPlz(plz: string, markets: string[]): Promise<ScrapeResult>
}
