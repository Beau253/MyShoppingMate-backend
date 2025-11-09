import scraperMap from './scrapers';
import { WoolworthsFilter } from './scrapers/types';

export const scraperService = {
  /**
   * Dispatches a scraping job to the appropriate store-specific scraper.
   * @param target The name of the store to scrape (e.g., 'coles', 'woolworths').
   * @param query The search query for the product.
   * @param filters Optional filters, currently used only by the Woolworths scraper.
   * @returns A promise that resolves to an array of scraped products.
   */
  scrape: (target: string, query: string, filters?: WoolworthsFilter[]) => {
    const scraper = scraperMap[target.toLowerCase()];

    if (scraper) {
      console.log(`[ScraperService] Dispatching job to scraper for target: "${target}"`);
      return scraper(query, filters);
    } else {
      console.warn(`[ScraperService] No scraper found for target: "${target}"`);
      return Promise.resolve([]);
    }
  }
};