// Use puppeteer-extra and the stealth plugin to avoid bot detection.
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser } from 'puppeteer';
puppeteer.use(StealthPlugin());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const API_URL = 'https://www.woolworths.com.au/apis/ui/Search/products';

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

/**
 * Scrapes Woolworths using a headless browser to mimic user behavior.
 */
async function scrapeWoolworthsAPI(query: string, page: number = 1): Promise<Product[]> {
  let browser: Browser | null = null;
  console.log(`[ScraperService] Launching headless browser for query: "${query}"`);

  try {
    browser = await puppeteer.launch({
      headless: true,
      dumpio: false, // Clean logs for production
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

    // Set up a promise to resolve with the product data when the API call is intercepted.
    const productsPromise = new Promise<Product[]>((resolve, reject) => {
      browserPage.on('response', async (response) => {
        if (response.url() === API_URL && response.request().method() === 'POST') {
          console.log(`[ScraperService] Intercepted API response from: ${response.url()}`);
          try {
            const data = await response.json();

            // --- THIS IS THE CORRECTED PARSING LOGIC ---
            // The API returns a nested structure: { Products: [ { Products: [ ...actual products... ] } ] }
            const outerProducts = data.Products || [];
            const allInnerProducts: any[] = [];
            
            // Iterate through the outer array to collect all the inner product arrays.
            outerProducts.forEach((group: any) => {
              if (group && group.Products) {
                allInnerProducts.push(...group.Products);
              }
            });

            if (allInnerProducts.length === 0) {
              console.log("[ScraperService] The API response structure might have changed. No inner 'Products' array found.");
              resolve([]); // Resolve with empty array if no products found
              return;
            }

            // Map the rich data from the inner product objects to our unified interface.
            const mappedProducts: Product[] = allInnerProducts.map((product: any) => ({
              gtin: product.Barcode || 'N/A',
              name: product.DisplayName,
              brand: product.Brand || 'N/A',
              price: product.Price,
              imageUrl: product.MediumImageFile, // Get the medium image URL
              size: product.PackageSize,
              store: 'Woolworths',
            }));

            resolve(mappedProducts);
          } catch (e) {
            const err = e as Error;
            console.error(`[ScraperService] Error parsing JSON from API response: ${err.message}`);
            reject(new Error('Failed to parse API response.'));
          }
        }
      });
    });

    const url = `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(query)}&pageNumber=${page}`;
    console.log(`[ScraperService] Navigating to: ${url}`);
    
    // Trigger the navigation and wait for the interception promise to resolve.
    await browserPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('[ScraperService] Page navigation complete. Waiting for product API response...');

    const products = await Promise.race([
      productsPromise,
      new Promise<Product[]>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout waiting for API response.')), 30000)
      ),
    ]);

    console.log(`[ScraperService] Scraped ${products.length} products with full details.`);
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
  scrape: (target: string, query: string) => {
    switch (target.toLowerCase()) {
      case 'woolworths':
        return scrapeWoolworthsAPI(query);
      default:
        console.warn(`[ScraperService] No scraper found for target: ${target}`);
        return Promise.resolve([]);
    }
  }
};