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
  imageUrl: string;
  size: string;
  store: 'Woolworths' | 'Coles'; // Example stores
}
/**
 * Scrapes Woolworths using a headless browser to mimic user behavior.
 */
async function scrapeWoolworthsAPI(query: string, page: number = 1): Promise<Product[]> {
  let browser: Browser | null = null;
  console.log(`[ScraperService] Launching headless browser for query: "${query}"`);

  try {
    // Launch Puppeteer. The '--no-sandbox' flag is crucial for running in Docker.
    browser = await puppeteer.launch({
      headless: true,
      protocolTimeout: 90000, // Increase internal timeout to 90 seconds
      dumpio: false, // Disable dumpio for cleaner logs now that it's working
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      
    });

    const browserPage = await browser.newPage();
    await browserPage.setUserAgent(USER_AGENT);
    // Set a realistic viewport to mimic a real user.
    await browserPage.setViewport({ width: 1920, height: 1080 });

    // Set up a promise to resolve with the product data when the API call is intercepted.
    const productsPromise = new Promise<Product[]>((resolve, reject) => {
      browserPage.on('response', async (response) => {
        if (response.url() === API_URL && response.request().method() === 'POST') {
          console.log(`[ScraperService] Intercepted API response from: ${response.url()}`);
          try {
            const data = await response.json();
            const products = data.Products || [];

            // Map the API response to our unified Product interface.
            const mappedProducts: Product[] = products.map((product: any) => ({
              gtin: product.Barcode || 'N/A',
              name: product.DisplayName,
              brand: product.Brand || 'N/A',
              imageUrl: product.LargeImageFile,
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

    // Construct the URL and navigate to the page. This action triggers the website's
    // JavaScript to make the background API call we are intercepting.
    const url = `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(query)}&pageNumber=${page}`;
    console.log(`[ScraperService] Navigating to: ${url}`);
    // We only need to trigger the navigation. The 'response' listener will handle the rest.
    await browserPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('[ScraperService] Page navigation complete. Waiting for product API response...');

    // Wait for the network interception to complete or timeout.
    const products = await Promise.race([
      productsPromise,
      new Promise<Product[]>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout waiting for API response.')), 30000)
      ),
    ]);

    console.log(`[ScraperService] Scraped ${products.length} products.`);
    return products;

  } catch (error) {
    const err = error as Error;
    if (err.name === 'TimeoutError' || err.message.includes('Timeout waiting for API response')) {
      console.error(`[ScraperService] Timeout occurred: ${err.message}`);
    } else {
      console.error(`[ScraperService] An error occurred during headless browser scraping: ${err.message}`);
    }
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