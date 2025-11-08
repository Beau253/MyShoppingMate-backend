// Use puppeteer-extra and the stealth plugin to avoid bot detection.
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
puppeteer.use(StealthPlugin());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SEARCH_API_URL = 'https://www.woolworths.com.au/apis/ui/Search/products';

// A unified data model for a product, regardless of the source.
interface Product {
  gtin: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  size: string;
  store: 'Woolworths' | 'Coles';
}

// Interface for the filter structure the API expects.
export interface WoolworthsFilter {
  Key: string;
  Items: { Term: string }[];
}

/**
 * Scrapes Woolworths using a headless browser to mimic user behavior.
 */
async function scrapeWoolworthsAPI(query: string, filters: WoolworthsFilter[] = [], page: number = 1): Promise<Product[]> {
  let browser: Browser | null = null;
  console.log(`[ScraperService] Launching browser for query: "${query}" with ${filters.length} filters.`);

  try {
    browser = await puppeteer.launch({
      headless: true,
      dumpio: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const browserPage = await browser.newPage();
    await browserPage.setUserAgent(USER_AGENT);
    await browserPage.setViewport({ width: 1920, height: 1080 });

    // Navigate to the homepage to establish a valid session with cookies.
    console.log('[ScraperService] Navigating to homepage to establish session...');
    await browserPage.goto('https://www.woolworths.com.au', { waitUntil: 'domcontentloaded' });

    // Now, execute a fetch request from within the browser context with our custom payload.
    console.log('[ScraperService] Executing filtered search via fetch...');
    const products = await browserPage.evaluate(
      async (apiUrl, searchTerm, filterList, pageNum) => {
        // Using .then() chains instead of async/await to avoid transpilation issues inside evaluate().
        return fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            SearchTerm: searchTerm,
            PageNumber: pageNum,
            PageSize: 36,
            SortType: 'TraderRelevance',
            Filters: filterList,
          }),
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          const outerProducts = data.Products || [];
          const allInnerProducts: any[] = [];
          outerProducts.forEach((group: any) => {
            if (group && group.Products) {
              allInnerProducts.push(...group.Products);
            }
          });
          
          // Map the rich data to our unified interface
          return allInnerProducts.map((product: any) => ({
            gtin: product.Barcode || 'N/A',
            name: product.DisplayName,
            brand: product.Brand || 'N/A',
            price: product.Price,
            imageUrl: product.MediumImageFile,
            size: product.PackageSize,
            store: 'Woolworths' as const,
          }));
        });
      },
      SEARCH_API_URL,
      query,
      filters,
      page
    );

    console.log(`[ScraperService] Scraped ${products.length} products.`);
    return products;

  } catch (error) {
    const err = error as Error;
    console.error(`[ScraperService] An error occurred: ${err.message}`);
    return [];
  } finally {
    if (browser) {
      console.log('[ScraperService] Closing browser.');
      await browser.close();
    }
  }
}

export const scraperService = {
  // Update the main scrape function to accept filters
  scrape: (target: string, query: string, filters?: WoolworthsFilter[]) => {
    switch (target.toLowerCase()) {
      case 'woolworths':
        return scrapeWoolworthsAPI(query, filters);
      default:
        console.warn(`[ScraperService] No scraper found for target: ${target}`);
        return Promise.resolve([]);
    }
  }
};