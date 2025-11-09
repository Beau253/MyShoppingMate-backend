// Use puppeteer-extra and the stealth plugin to avoid bot detection.
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page, HTTPResponse } from 'puppeteer';
import * as fs from 'fs/promises';
import { Product, ScraperFunction } from './types';

puppeteer.use(StealthPlugin());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const COLES_SEARCH_API_URL = 'https://www.coles.com.au/api/bff/products/search';
const COLES_IMAGE_BASE_URL = 'https://productimages.coles.com.au/productimages';

/**
 * Scrapes Coles products using a headless browser to handle the Imperva WAF.
 * It navigates to the search page and intercepts the JSON response from the BFF API.
 */
export const scrapeColes: ScraperFunction = async (query: string): Promise<Product[]> => {
  let browser: Browser | null = null;
  const allProducts: Product[] = [];
  console.log(`[ColesScraper] Launching browser for query: "${query}"`);

  try {
    browser = await puppeteer.launch({
      headless: process.env.NODE_ENV === 'production',
      dumpio: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote'
      ],
    });
    console.log('[ColesScraper] Browser launched successfully.');

    const page = await browser.newPage();
    console.log('[ColesScraper] New page created.');
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1920, height: 1080 });
    console.log('[ColesScraper] User agent and viewport set.');

    try {
      console.log('[ColesScraper] Navigating to Coles homepage to handle cookie consent...');
      await page.goto('https://www.coles.com.au', { waitUntil: 'domcontentloaded', timeout: 30000 });
      const acceptButtonSelector = 'button#onetrust-accept-btn-handler';
      await page.waitForSelector(acceptButtonSelector, { timeout: 10000 });
      await page.click(acceptButtonSelector);
      console.log('[ColesScraper] Cookie consent accepted.');
      await new Promise(res => setTimeout(res, 2000));
    } catch (e) {
      console.log('[ColesScraper] Cookie consent banner not found or already handled.');
    }

    let hasMorePages = true;
    let pageNumber = 1;

    const noResultsSelector = '[data-testid="search-no-results"]';
    const wafSelector = 'iframe[src*="distil_r_captcha.html"]';

    while (hasMorePages) {
      console.log(`[ColesScraper] Navigating to search page ${pageNumber} for query: "${query}"`);
      const searchUrl = `https://www.coles.com.au/search/products?q=${encodeURIComponent(query)}&page=${pageNumber}`;

      const responsePromise = new Promise<any>((resolve, reject) => { //NOSONAR
        const requestHandler = async (response: HTTPResponse) => {
          if (response.url().startsWith(COLES_SEARCH_API_URL) && response.request().method() === 'GET') {
            page.off('response', requestHandler);
            console.log(`[ColesScraper] Intercepted Coles API response.`);
            if (response.ok()) {
              resolve(await response.json());
            } else {
              reject(new Error(`Coles API responded with status ${response.status()}`));
            }
          }
        };
        page.on('response', requestHandler);
      });

      const noResultsPromise = page.waitForSelector(noResultsSelector, { timeout: 30000 })
        .then(() => ({ noResults: true }));

      const wafPromise = page.waitForSelector(wafSelector, { timeout: 30000 })
        .then(() => ({ isBlocked: true }));

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const raceResult = await Promise.race([responsePromise, noResultsPromise, wafPromise]);

      if (raceResult.isBlocked) {
        throw new Error('Scraper was blocked by WAF. Aborting operation.');
      }

      if (raceResult.noResults) {
        console.log('[ColesScraper] No more products found. Ending pagination.');
        hasMorePages = false;
        continue;
      }
      
      const data = raceResult;
      const results = data.results || [];

      if (results.length === 0 || results.length < 48) {
        hasMorePages = false;
      }

      const mappedProducts: Product[] = results
        .filter((p: any) => p && p._type === 'PRODUCT')
        .map((product: any) => ({
            gtin: String(product.id || 'N/A'),
            name: product.name || 'N/A',
            brand: product.brand || 'N/A',
            price: product.pricing?.now || 0,
            imageUrl: (product.imageUris && product.imageUris.length > 0)
              ? `${COLES_IMAGE_BASE_URL}${product.imageUris[0].uri}`
              : '',
            size: product.size || 'N/A',
            store: 'Coles' as const,
            categories: [],
        }));

      allProducts.push(...mappedProducts);
      pageNumber++;
    }

    console.log(`[ColesScraper] Scraping complete. Total products: ${allProducts.length}.`);
    return allProducts;

  } catch (error) {
    const err = error as Error;
    console.error(`[ColesScraper] An error occurred: ${err.message}`);
    if (browser) {
        try {
            const pages = await browser.pages();
            const page = pages.length > 0 ? pages[0] : null;
            if (page) {
                await page.screenshot({ path: 'coles_error_screenshot.png', fullPage: true });
                console.log('[ColesScraper] Error screenshot saved to coles_error_screenshot.png');
                const htmlContent = await page.content();
                await fs.writeFile('coles_error_page.html', htmlContent);
                console.log('[ColesScraper] Error page HTML saved to coles_error_page.html');
            }
        } catch (screenshotError) {
            console.error(`[ColesScraper] Failed to take screenshot: ${(screenshotError as Error).message}`);
        }
    }
    return allProducts;
  } finally {
    if (browser) {
      console.log('[ColesScraper] Closing browser.');
      await browser.close();
    }
  }
}