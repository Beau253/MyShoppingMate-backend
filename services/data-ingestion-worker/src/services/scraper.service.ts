// Use puppeteer-extra and the stealth plugin to avoid bot detection.
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
puppeteer.use(StealthPlugin());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SEARCH_API_URL = 'https://www.woolworths.com.au/apis/ui/Search/products';
const DETAIL_API_URL_BASE = 'https://www.woolworths.com.au/apis/ui/products/';

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

// A temporary interface for the summary data from the search API
interface ProductSummary {
  Stockcode: number;
  DisplayName: string;
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
      dumpio: false, // Set to false for cleaner production logs
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

    // --- STEP 1: Get the summary list of products ---
    console.log('[ScraperService] Step 1: Fetching product summary list...');
    const productSummariesPromise = new Promise<ProductSummary[]>((resolve, reject) => {
      browserPage.once('response', async (response) => { // Use 'once' to only catch the first search response
        if (response.url() === SEARCH_API_URL && response.request().method() === 'POST') {
          console.log(`[ScraperService] Intercepted SUMMARY API response from: ${response.url()}`);
          try {
            const data = await response.json();
            // The actual products are often nested. We check for 'Products' and then the inner 'Products' array.
            const products = data.Products?.[0]?.Products || data.Products || [];
            
            const summaries: ProductSummary[] = products.map((p: any) => ({
              Stockcode: p.Stockcode,
              DisplayName: p.DisplayName,
            }));
            
            resolve(summaries);
          } catch (e) {
            reject(new Error('Failed to parse summary API response.'));
          }
        }
      });
    });

    const searchUrl = `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(query)}&pageNumber=${page}`;
    console.log(`[ScraperService] Navigating to: ${searchUrl}`);
    await browserPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for the summary interception to complete.
    const summaries = await Promise.race([
      productSummariesPromise,
      new Promise<ProductSummary[]>((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for SUMMARY API response.')), 30000)),
    ]);
    
    if (summaries.length === 0) {
        console.log('[ScraperService] No products found in the summary list. Exiting.');
        return [];
    }

    console.log(`[ScraperService] Step 1 Complete: Found ${summaries.length} products to enrich.`);
    
    // --- STEP 2: Enrich each product with details from the detail API ---
    console.log('[ScraperService] Step 2: Fetching detailed information for each product...');
    
    // We use page.evaluate to run `fetch` inside the browser. This reuses the browser's cookies,
    // headers, and IP address, making the requests much more likely to succeed.
    const enrichedProducts = await browserPage.evaluate(
      async (summaries, detailApiBaseUrl) => {
        const fetchProductDetails = async (summary: ProductSummary) => {
          try {
            const response = await fetch(`${detailApiBaseUrl}${summary.Stockcode}`);
            if (!response.ok) return null;
            const detailData = (await response.json())[0]; // The detail API returns an array with one item
            
            // Map the RICH data to our final Product interface
            return {
              gtin: detailData.Barcode || 'N/A',
              name: detailData.DisplayName,
              brand: detailData.Brand || 'N/A',
              price: detailData.Price,
              imageUrl: detailData.MediumImageFile, // Using Medium for a good balance of quality/size
              size: detailData.PackageSize,
              store: 'Woolworths',
            };
          } catch (e) {
            console.error(`Failed to fetch details for Stockcode ${summary.Stockcode}`);
            return null;
          }
        };

        // Run all detail fetches in parallel for maximum speed
        const detailPromises = summaries.map(fetchProductDetails);
        const results = await Promise.all(detailPromises);
        return results.filter(p => p !== null); // Filter out any failed requests
      },
      summaries,
      DETAIL_API_URL_BASE
    );

    console.log(`[ScraperService] Step 2 Complete: Scraped ${enrichedProducts.length} products.`);
    return enrichedProducts as Product[];

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