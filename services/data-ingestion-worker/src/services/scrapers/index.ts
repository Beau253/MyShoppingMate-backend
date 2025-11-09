import { scrapeColes } from './coles.scraper';
import { scrapeWoolworths } from './woolworths.scraper';
import { scrapeAldi } from './aldi.scraper';
import { ScraperFunction } from './types';

// A map of target store names to their scraper function.
// The key (e.g., 'coles') should be lowercase to match the job target.
const scraperMap: Record<string, ScraperFunction> = {
  coles: scrapeColes,
  woolworths: scrapeWoolworths,
  aldi: scrapeAldi,
};

export default scraperMap;